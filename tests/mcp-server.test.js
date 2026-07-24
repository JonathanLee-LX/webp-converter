const MCPServer = require('../lib/mcp-server');

describe('MCPServer', () => {
  let server;

  beforeEach(() => {
    server = new MCPServer();
  });

  test('should create server with tools', () => {
    expect(server.tools).toBeDefined();
    expect(server.tools.length).toBe(2);
  });

  test('should have convert_directory_to_webp tool', () => {
    const tool = server.tools.find(t => t.name === 'convert_directory_to_webp');
    expect(tool).toBeDefined();
    expect(tool.description).toContain('批量转换');
  });

  test('should have convert_single_image_to_webp tool', () => {
    const tool = server.tools.find(t => t.name === 'convert_single_image_to_webp');
    expect(tool).toBeDefined();
    expect(tool.description).toContain('单个');
  });

  test('should handle initialize request', async () => {
    const response = await server.handleRequest({
      method: 'initialize',
      params: {}
    });

    expect(response.protocolVersion).toBe('2024-11-05');
    expect(response.serverInfo.name).toBe('webp-converter');
    expect(response.serverInfo.version).toBe('1.0.0');
  });

  test('should handle tools/list request', async () => {
    const response = await server.handleRequest({
      method: 'tools/list',
      params: {}
    });

    expect(response.tools).toBeDefined();
    expect(response.tools.length).toBe(2);
  });

  test('should handle unknown method', async () => {
    await expect(
      server.handleRequest({
        method: 'unknown/method',
        params: {}
      })
    ).rejects.toThrow('Unknown method: unknown/method');
  });

  test('should handle unknown tool', async () => {
    const response = await server.handleRequest({
      method: 'tools/call',
      params: {
        name: 'unknown_tool',
        arguments: {}
      }
    });

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('Unknown tool');
  });
});