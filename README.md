# WebP Converter MCP Server

[![Test](https://github.com/JonathanLee-LX/webp-converter/actions/workflows/test.yml/badge.svg)](https://github.com/JonathanLee-LX/webp-converter/actions/workflows/test.yml)
[![Publish to npm](https://github.com/JonathanLee-LX/webp-converter/actions/workflows/publish.yml/badge.svg)](https://github.com/JonathanLee-LX/webp-converter/actions/workflows/publish.yml)
[![npm version](https://img.shields.io/npm/v/@jonathanleelx/webp-converter.svg)](https://www.npmjs.com/package/@jonathanleelx/webp-converter)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

这是一个支持MCP（Model Context Protocol）协议的WebP图片转换工具，可以将大模型通过MCP协议调用图片转换功能。

## 功能特性

- 支持批量转换目录中的所有图片（jpg、jpeg、png → webp）
- 支持单个图片文件转换
- 支持自定义质量参数（1-100）
- 并行处理，提高转换效率
- 通过MCP协议供大模型调用

## 安装

### 从npm安装

```bash
npm install -g @jonathanleelx/webp-converter
```

### 从源码安装

```bash
# 克隆项目
git clone https://github.com/JonathanLee-LX/webp-converter.git
cd webp-converter

# 安装依赖
npm install
```

## 使用方法

### 1. 命令行使用

```bash
# 转换当前目录下的所有图片
./bin/converter convert

# 转换指定目录下的所有图片
./bin/converter convert /path/to/images

# 转换指定目录下的所有图片，设置质量为90
./bin/converter convert /path/to/images -q 90

# 转换指定目录下的所有图片，输出到指定目录
./bin/converter convert /path/to/images -o /path/to/output

# 转换单个图片文件
./bin/converter convert --file /path/to/image.jpg

# 转换单个图片文件，设置质量为95
./bin/converter convert --file /path/to/image.jpg -q 95

# 显示帮助信息
./bin/converter --help

# 显示版本信息
./bin/converter --version

# 显示转换器信息
./bin/converter info
```

### 2. MCP服务器使用

#### 启动MCP服务器

```bash
pnpm run mcp-server
```

#### 配置MCP客户端

在Cursor或其他支持MCP的客户端中，将以下配置添加到MCP设置中：

**对于Cursor：** 编辑 `~/.cursor/mcp.json` 或相应的配置文件：

```json
{
  "mcpServers": {
    "webp-converter": {
      "command": "node",
      "args": [
        "/path/to/webp-converter/lib/mcp-server.js"
      ]
    }
  }
}
```

**注意：** 请将路径替换为实际的项目路径。

## MCP工具说明

### 1. convert_directory_to_webp

批量转换目录中的所有图片为WebP格式。

**参数：**

- `directory` (必需): 要转换的图片目录路径
- `quality` (可选): WebP图片质量，1-100，默认80

**示例：**

```json
{
  "directory": "/path/to/images",
  "quality": 85
}
```

### 2. convert_single_image_to_webp

转换单个图片文件为WebP格式。

**参数：**

- `filePath` (必需): 要转换的图片文件路径
- `quality` (可选): WebP图片质量，1-100，默认80
- `outputPath` (可选): 输出文件路径，默认替换原文件扩展名为.webp

**示例：**

```json
{
  "filePath": "/path/to/image.jpg",
  "quality": 90,
  "outputPath": "/path/to/output.webp"
}
```

## 开发指南

### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监视模式运行测试
npm run test:watch
```

### 代码检查

```bash
# 检查代码规范
npm run lint

# 自动修复代码规范问题
npm run lint:fix

# 格式化代码
npm run format
```

### GitHub Actions

本项目使用GitHub Actions进行自动化：

- **测试工作流** (`test.yml`): 在推送和PR时自动运行测试
- **发布工作流** (`publish.yml`): 当创建GitHub Release时自动发布到npm

#### 发布新版本

1. 更新 `package.json` 中的版本号
2. 创建Git tag: `git tag v1.0.0`
3. 推送tag: `git push origin v1.0.0`
4. 在GitHub上创建Release，选择对应的tag
5. 发布工作流将自动运行并发布到npm

#### 配置npm token

在GitHub仓库的Settings -> Secrets and variables -> Actions中添加 `NPM_TOKEN`。

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/JonathanLee-LX/webp-converter.git
cd webp-converter

# 安装依赖
npm install

# 运行测试
npm test

# 运行示例
node examples/basic-usage.js
```

## 使用示例

### 编程接口使用

```javascript
const WebPConverter = require('@jonathanleelx/webp-converter');

async function convertImages() {
  const converter = new WebPConverter({ quality: 85 });
  
  // 转换单个图片
  const result = await converter.convertSingleImage('./photo.jpg');
  console.log('转换结果:', result);
  
  // 批量转换目录
  const results = await converter.convertDirectory('./images');
  console.log('批量转换完成:', results.length, '个文件');
}

convertImages().catch(console.error);
```

### 更多示例

查看 `examples/` 目录获取更多使用示例。

## 依赖要求

- Node.js >= 14.0.0
- npm 或 pnpm（推荐）

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

## 许可证

ISC