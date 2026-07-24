# MCP 服务器配置指南

## 什么是 MCP？

MCP（Model Context Protocol）是一个协议，允许AI模型调用外部工具和服务。通过MCP，AI模型可以调用图片转换功能。

## 配置步骤

### 1. 启动 MCP 服务器

首先，启动 WebP Converter 的 MCP 服务器：

```bash
cd webp-converter
pnpm run mcp-server
```

服务器将在标准输入/输出上运行，等待 MCP 请求。

### 2. 配置 MCP 客户端

#### Cursor 配置

编辑 `~/.cursor/mcp.json` 或相应的配置文件：

```json
{
  "mcpServers": {
    "webp-converter": {
      "command": "node",
      "args": [
        "/absolute/path/to/webp-converter/lib/mcp-server.js"
      ]
    }
  }
}
```

#### VS Code 配置

如果使用支持 MCP 的 VS Code 扩展，在 `.vscode/settings.json` 中添加：

```json
{
  "mcp.servers": {
    "webp-converter": {
      "command": "node",
      "args": [
        "/absolute/path/to/webp-converter/lib/mcp-server.js"
      ]
    }
  }
}
```

### 3. 验证配置

启动 MCP 客户端后，应该能够看到 `webp-converter` 服务器提供的两个工具：

1. `convert_directory_to_webp` - 批量转换目录中的所有图片
2. `convert_single_image_to_webp` - 转换单个图片文件

## 使用示例

### 在 Cursor 中使用

1. 打开 Cursor
2. 确保 MCP 服务器已配置
3. 在聊天中请求图片转换，例如：
   - "帮我把 ./images 目录下的图片转换为 webp 格式"
   - "把这张图片转换为 webp：./photo.jpg"

### 在代码中使用

```javascript
const MCPServer = require('./lib/mcp-server');

const server = new MCPServer();

// 处理 MCP 请求
const response = await server.handleRequest({
  method: 'tools/call',
  params: {
    name: 'convert_single_image_to_webp',
    arguments: {
      filePath: './image.jpg',
      quality: 85
    }
  }
});

console.log(response);
```

## 故障排除

### 服务器无法启动

1. 确保已安装所有依赖：`pnpm install`
2. 检查 Node.js 版本：`node --version`（需要 >= 14.0.0）
3. 检查文件路径是否正确

### 工具无法调用

1. 确保 MCP 服务器正在运行
2. 检查客户端配置是否正确
3. 查看服务器日志输出

### 转换失败

1. 确保输入文件存在且格式支持（jpg, jpeg, png）
2. 检查输出目录是否有写入权限
3. 查看错误信息