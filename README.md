# Markdown to DOCX 转换工具

一个将 Markdown 文件转换为 DOCX 格式的工具，支持本地 CLI 和 Cloudflare Workers API 两种使用方式。

## 项目结构

项目采用 monorepo 结构：

- `packages/cli` - 本地命令行工具，支持完整功能（包括图片处理）
- `packages/worker` - Cloudflare Workers API，提供轻量级 Web 服务

## 功能特点

### CLI 版本

- 支持完整 Markdown 语法
- 支持图片处理和嵌入
- 支持自定义样式
- 支持目录生成
- 支持批量转换

### Worker 版本

- 基于 Cloudflare Workers 和 R2 存储
- 提供 RESTful API
- 支持基础 Markdown 语法（标题、段落、列表、代码块、表格等）
- 自动文件清理（默认 1 小时后）

## 安装和使用

### CLI 版本

1. 安装依赖：

```bash
cd packages/cli
npm install
```

2. 使用示例：

```bash
node src/index.js input.md output.docx
```

### Worker 版本

#### 本地开发

1. 安装依赖：

```bash
cd packages/worker
npm install
```

2. 本地运行：

```bash
npm run dev
```

3. 测试 API：

```bash
node test.js
```

#### 部署到 Cloudflare

1. 登录 Cloudflare：

```bash
wrangler login
```

2. 创建 R2 存储桶：

```bash
wrangler r2 bucket create docx-storage
```

3. 部署：

```bash
npm run deploy
```

## API 使用

### 转换 Markdown 到 DOCX

```http
POST /convert
Content-Type: application/json

{
  "markdown": "# 标题\n\n这是正文内容。",
  "filename": "document.docx"
}
```

响应：

```json
{
  "url": "/download/1234567890-abcdef.docx",
  "filename": "1234567890-abcdef.docx",
  "expiresAt": "2024-03-03T12:00:00Z"
}
```

### 下载生成的文档

```http
GET /download/{filename}
```

## 注意事项

- Worker 版本不支持图片处理
- 文档在 R2 存储桶中的保留时间为 1 小时
- 确保 `.dev.vars` 和其他敏感文件不被提交到版本控制系统

## 许可证

ISC
