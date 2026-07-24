const WebPConverter = require('./index');

class MCPServer {
  constructor() {
    this.converter = new WebPConverter();
    this.tools = [
      {
        name: 'convert_directory_to_webp',
        description: '批量转换目录中的所有图片为WebP格式',
        inputSchema: {
          type: 'object',
          properties: {
            directory: {
              type: 'string',
              description: '要转换的图片目录路径'
            },
            quality: {
              type: 'number',
              description: 'WebP图片质量，1-100',
              default: 80
            }
          },
          required: ['directory']
        }
      },
      {
        name: 'convert_single_image_to_webp',
        description: '转换单个图片文件为WebP格式',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: '要转换的图片文件路径'
            },
            quality: {
              type: 'number',
              description: 'WebP图片质量，1-100',
              default: 80
            },
            outputPath: {
              type: 'string',
              description: '输出文件路径，默认替换原文件扩展名为.webp'
            }
          },
          required: ['filePath']
        }
      }
    ];
  }

  async handleRequest(request) {
    const { method, params } = request;

    switch (method) {
      case 'initialize':
        return this.handleInitialize(params);
      case 'tools/list':
        return this.handleToolsList();
      case 'tools/call':
        return this.handleToolsCall(params);
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  async handleInitialize(params) {
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: 'webp-converter',
        version: '1.0.0'
      }
    };
  }

  async handleToolsList() {
    return {
      tools: this.tools
    };
  }

  async handleToolsCall(params) {
    const { name, arguments: args } = params;

    try {
      let result;
      
      switch (name) {
        case 'convert_directory_to_webp':
          this.converter.quality = args.quality || 80;
          result = await this.converter.convertDirectory(args.directory);
          break;
          
        case 'convert_single_image_to_webp':
          this.converter.quality = args.quality || 80;
          result = await this.converter.convertSingleImage(args.filePath, args.outputPath);
          break;
          
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
}

async function main() {
  const server = new MCPServer();
  
  process.stdin.setEncoding('utf8');
  
  let buffer = '';
  
  process.stdin.on('data', async (chunk) => {
    buffer += chunk;
    
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const request = JSON.parse(line);
          const response = await server.handleRequest(request);
          
          const message = {
            jsonrpc: '2.0',
            id: request.id,
            result: response
          };
          
          process.stdout.write(JSON.stringify(message) + '\n');
        } catch (error) {
          const errorMessage = {
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32603,
              message: error.message
            }
          };
          
          process.stdout.write(JSON.stringify(errorMessage) + '\n');
        }
      }
    }
  });
  
  process.stderr.write('WebP Converter MCP Server started\n');
}

if (require.main === module) {
  main();
}

module.exports = MCPServer;