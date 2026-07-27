import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// ============================================================
// Type definitions
// ============================================================

interface Env {
  IMAGES: ImagesBinding;
  R2_BUCKET: R2Bucket;
  PUBLIC_BASE_URL: string;
  MCP_SERVER: DurableObjectNamespace;
}

interface ConvertOptions {
  quality?: number;
  width?: number;
  height?: number;
}

interface ConvertResult {
  success: boolean;
  originalSize: number;
  convertedSize: number;
  savedPercent: number;
  format: string;
  width: number;
  height: number;
  url: string;
  key: string;
  error?: string;
}

// ============================================================
// Image conversion core logic
// ============================================================

const SUPPORTED_INPUT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

/**
 * Convert an image stream to WebP and store in R2.
 * Returns metadata about the conversion.
 */
async function convertImageToWebP(
  env: Env,
  imageStream: ReadableStream,
  options: ConvertOptions,
  sourceName: string,
  requestUrl?: string
): Promise<ConvertResult> {
  // Tee the stream so we can get info without consuming the conversion stream
  const [infoStream, convertStream] = imageStream.tee();

  // Get original image info (format, dimensions) - free call
  const info = await env.IMAGES.info(infoStream);
  const originalFormat = info.format;
  // ImageInfoResponse is a union; only raster formats have width/height
  const width = "width" in info ? info.width : 0;
  const height = "height" in info ? info.height : 0;
  const originalSize = "fileSize" in info ? info.fileSize : 0;

  // Build the transformation pipeline
  let pipeline = env.IMAGES.input(convertStream);

  const transformOpts: Record<string, unknown> = {};
  if (options.width) transformOpts.width = options.width;
  if (options.height) transformOpts.height = options.height;
  if (Object.keys(transformOpts).length > 0) {
    pipeline = pipeline.transform(transformOpts);
  }

  const quality = options.quality ?? 80;
  const response = (
    await pipeline.output({ format: "image/webp", quality })
  ).response();

  // Read the converted image bytes
  const convertedBuffer = await response.arrayBuffer();
  const convertedBytes = new Uint8Array(convertedBuffer);

  // Generate a unique key for R2
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const safeName = sourceName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "_");
  const r2Key = `webp/${safeName}_${timestamp}_${randomSuffix}.webp`;

  // Store in R2
  await env.R2_BUCKET.put(r2Key, convertedBytes, {
    httpMetadata: {
      contentType: "image/webp",
    },
    customMetadata: {
      originalFormat,
      originalWidth: String(width),
      originalHeight: String(height),
      quality: String(quality),
      convertedAt: new Date().toISOString(),
    },
  });

  const convertedSize = convertedBytes.length;
  const savedBytes = originalSize - convertedSize;
  const savedPercent =
    originalSize > 0 ? parseFloat(((savedBytes / originalSize) * 100).toFixed(2)) : 0;

  // Use request URL to construct the base URL
  const baseUrl = requestUrl
    ? new URL(requestUrl).origin
    : env.PUBLIC_BASE_URL && !env.PUBLIC_BASE_URL.includes("<your-subdomain>")
      ? env.PUBLIC_BASE_URL
      : "https://webp-converter-service.jonathanleelx.workers.dev";
  const publicUrl = `${baseUrl}/image/${r2Key}`;

  return {
    success: true,
    originalSize,
    convertedSize,
    savedPercent,
    format: originalFormat,
    width,
    height,
    url: publicUrl,
    key: r2Key,
  };
}

// ============================================================
// HTTP request handlers
// ============================================================

function jsonError(message: string, status: number): Response {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * Handle direct image file upload via multipart/form-data
 * POST /convert?quality=80&width=800
 */
async function handleFileUpload(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const quality = url.searchParams.has("quality")
    ? parseInt(url.searchParams.get("quality")!)
    : undefined;
  const width = url.searchParams.has("width")
    ? parseInt(url.searchParams.get("width")!)
    : undefined;
  const height = url.searchParams.has("height")
    ? parseInt(url.searchParams.get("height")!)
    : undefined;

  const formData = await request.formData();
  const entry = formData.get("image");

  if (!entry || typeof entry === "string") {
    return jsonError("Missing 'image' field in form data", 400);
  }

  // entry is a Blob/File in Workers runtime
  const file = entry as unknown as { size: number; type: string; name: string; stream(): ReadableStream };

  if (file.size > 20 * 1024 * 1024) {
    return jsonError("Image exceeds 20MB limit", 413);
  }

  const contentType = file.type;
  if (!SUPPORTED_INPUT_TYPES.has(contentType)) {
    return jsonError(`Unsupported image type: ${contentType}. Supported: JPEG, PNG, WebP, AVIF, GIF`, 415);
  }

  const stream = file.stream();
  const result = await convertImageToWebP(
    env,
    stream,
    { quality, width, height },
    file.name,
    request.url
  );

  return Response.json(result);
}

/**
 * Handle URL-based image conversion
 * POST /convert/url  body: { "url": "...", "quality": 80, "width": 800 }
 */
async function handleUrlConvert(request: Request, env: Env): Promise<Response> {
  const body = await request.json<{
    url: string;
    quality?: number;
    width?: number;
    height?: number;
  }>();

  if (!body.url) {
    return jsonError("Missing 'url' in request body", 400);
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(body.url);
  } catch {
    return jsonError("Invalid URL", 400);
  }

  // Fetch the remote image
  const imageResponse = await fetch(imageUrl.toString(), {
    cf: { cacheTtl: 3600 },
  });

  if (!imageResponse.ok) {
    return jsonError(`Failed to fetch image: ${imageResponse.status}`, 502);
  }

  const contentType = imageResponse.headers.get("content-type") || "";
  if (!SUPPORTED_INPUT_TYPES.has(contentType.split(";")[0].trim())) {
    return jsonError(`Unsupported image type: ${contentType}`, 415);
  }

  const contentLength = imageResponse.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 20 * 1024 * 1024) {
    return jsonError("Remote image exceeds 20MB limit", 413);
  }

  const stream = imageResponse.body!;
  const fileName = imageUrl.pathname.split("/").pop() || "remote-image";
  const result = await convertImageToWebP(
    env,
    stream,
    { quality: body.quality, width: body.width, height: body.height },
    fileName,
    request.url
  );

  return Response.json(result);
}

/**
 * Serve a stored WebP image from R2
 * GET /image/:key
 */
async function handleServeImage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const key = url.pathname.replace("/image/", "");

  if (!key) {
    return jsonError("Missing image key", 400);
  }

  const object = await env.R2_BUCKET.get(key, { range: request.headers });
  if (object === null) {
    return jsonError("Image not found", 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("content-type", "image/webp");

  if (object.range) {
    // R2Range is a union type: { offset, length } or { suffix }
    const r = object.range as { offset?: number; length?: number; suffix?: number; size?: number };
    if ("offset" in r && r.offset != null) {
      const start = r.offset;
      const end = r.length != null ? start + r.length - 1 : undefined;
      const total = object.size;
      headers.set("content-range", `bytes ${start}-${end ?? total - 1}/${total}`);
      return new Response(object.body, { status: 206, headers });
    }
    // suffix range - just return full body
    return new Response(object.body, { status: 200, headers });
  }

  return new Response(object.body, { headers });
}

/**
 * Health check endpoint
 * GET /health
 */
function handleHealth(): Response {
  return Response.json({
    status: "ok",
    service: "webp-converter",
    time: new Date().toISOString(),
  });
}

// ============================================================
// MCP Server (Streamable HTTP transport via McpAgent)
// ============================================================

export class WebPConverterMCP extends McpAgent {
  server = new McpServer({
    name: "webp-converter",
    version: "1.1.1",
  });

  async init() {
    // Tool: convert_image_by_url
    // Converts a remote image to WebP and returns the download URL.
    this.server.tool(
      "convert_image_by_url",
      "Convert a remote image (by URL) to WebP format. Returns the converted image URL and optimization stats.",
      {
        url: z.string().url().describe("URL of the image to convert"),
        quality: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("WebP quality (1-100), default 80"),
        width: z.number().optional().describe("Target width in pixels"),
        height: z.number().optional().describe("Target height in pixels"),
      },
      async ({ url, quality, width, height }) => {
        const env = this.env as Env;

        try {
          const imageResponse = await fetch(url, { cf: { cacheTtl: 3600 } });
          if (!imageResponse.ok) {
            return {
              content: [{ type: "text", text: `Error: Failed to fetch image (HTTP ${imageResponse.status})` }],
              isError: true,
            };
          }

          const fileName = url.split("/").pop() || "remote-image";
          const result = await convertImageToWebP(
            env,
            imageResponse.body!,
            { quality, width, height },
            fileName,
            env.PUBLIC_BASE_URL ? `${env.PUBLIC_BASE_URL}/mcp` : undefined
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    url: result.url,
                    originalSize: result.originalSize,
                    convertedSize: result.convertedSize,
                    savedPercent: result.savedPercent,
                    format: result.format,
                    dimensions: `${result.width}x${result.height}`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
          };
        }
      }
    );

    // Tool: convert_image_by_base64
    // Converts a base64-encoded image to WebP.
    this.server.tool(
      "convert_image_by_base64",
      "Convert a base64-encoded image to WebP format. Returns the converted image URL and optimization stats.",
      {
        image: z.string().describe("Base64-encoded image data (without data URI prefix)"),
        filename: z.string().describe("Original filename, e.g. photo.jpg"),
        quality: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("WebP quality (1-100), default 80"),
        width: z.number().optional().describe("Target width in pixels"),
        height: z.number().optional().describe("Target height in pixels"),
      },
      async ({ image, filename, quality, width, height }) => {
        const env = this.env as Env;

        try {
          // Decode base64 to bytes
          const binaryString = atob(image);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(bytes);
              controller.close();
            },
          });

          const result = await convertImageToWebP(
            env,
            stream,
            { quality, width, height },
            filename,
            env.PUBLIC_BASE_URL ? `${env.PUBLIC_BASE_URL}/mcp` : undefined
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    url: result.url,
                    originalSize: result.originalSize,
                    convertedSize: result.convertedSize,
                    savedPercent: result.savedPercent,
                    format: result.format,
                    dimensions: `${result.width}x${result.height}`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
          };
        }
      }
    );
  }
}

// ============================================================
// Main Worker entry point
// ============================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "Content-Type, Authorization",
          "access-control-max-age": "86400",
        },
      });
    }

    // Route: MCP server (Streamable HTTP transport)
    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      const mcpHandler = WebPConverterMCP.serve("/mcp", {
        binding: "MCP_SERVER",
      });
      return mcpHandler.fetch(request, env, ctx);
    }

    // Route: Health check
    if (url.pathname === "/health" && method === "GET") {
      return handleHealth();
    }

    // Route: File upload conversion
    if (url.pathname === "/convert" && method === "POST") {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("multipart/form-data")) {
        return handleFileUpload(request, env);
      }
      return jsonError("Expected multipart/form-data. Use /convert/url for URL-based conversion.", 415);
    }

    // Route: URL-based conversion
    if (url.pathname === "/convert/url" && method === "POST") {
      return handleUrlConvert(request, env);
    }

    // Route: Serve stored image from R2
    if (url.pathname.startsWith("/image/") && method === "GET") {
      return handleServeImage(request, env);
    }

    // Route: API docs (root)
    if (url.pathname === "/" && method === "GET") {
      return Response.json({
        service: "webp-converter",
        version: "1.1.1",
        endpoints: {
          "POST /convert": "Upload an image file (multipart/form-data) and convert to WebP",
          "POST /convert/url": "Convert a remote image by URL to WebP",
          "GET /image/:key": "Retrieve a converted WebP image from R2",
          "GET /health": "Health check",
          "POST /mcp": "MCP server endpoint (Streamable HTTP transport)",
        },
        mcp: {
          transport: "streamable-http",
          url: `${env.PUBLIC_BASE_URL}/mcp`,
          tools: ["convert_image_by_url", "convert_image_by_base64"],
        },
      });
    }

    return jsonError("Not found", 404);
  },
} satisfies ExportedHandler<Env>;
