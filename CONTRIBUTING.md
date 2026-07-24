# 贡献指南

感谢您对 WebP Converter 项目的关注！我们欢迎各种形式的贡献。

## 如何贡献

### 报告问题

如果您发现了bug或有功能建议，请在 [GitHub Issues](https://github.com/JonathanLee-LX/webp-converter/issues) 中创建一个新的issue。

### 提交代码

1. Fork 本仓库
2. 创建您的特性分支: `git checkout -b feature/amazing-feature`
3. 提交您的更改: `git commit -m 'Add some amazing feature'`
4. 推送到分支: `git push origin feature/amazing-feature`
5. 创建一个 Pull Request

### 开发环境设置

```bash
# 克隆您的fork
git clone https://github.com/your-username/webp-converter.git
cd webp-converter

# 安装依赖
npm install

# 运行测试
npm test

# 代码检查
npm run lint
```

### 代码规范

- 使用 ESLint 和 Prettier 进行代码格式化
- 提交前请运行 `npm run lint:fix` 和 `npm run format`
- 所有新功能都需要包含测试
- 保持测试覆盖率在50%以上

### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范:

- `feat:` 新功能
- `fix:` 修复bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 重构代码
- `test:` 测试相关
- `chore:` 构建/工具链更新

示例:
```
feat: 添加批量转换功能
fix: 修复质量参数验证问题
docs: 更新README使用说明
```

## 功能请求

如果您有新的功能建议，请在Issues中创建一个带有 `enhancement` 标签的issue，并详细描述:

1. 功能的使用场景
2. 预期的行为
3. 可能的实现方案

## 问题反馈

如有任何问题，请通过以下方式联系:

- GitHub Issues: [https://github.com/JonathanLee-LX/webp-converter/issues](https://github.com/JonathanLee-LX/webp-converter/issues)

感谢您的贡献！