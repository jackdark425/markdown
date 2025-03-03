# Markdown to DOCX Worker

一个基于 Cloudflare Worker 的 Markdown 到 DOCX 的转换服务。

## 功能特点

- 支持基础 Markdown 语法
- 生成标准 DOCX 文档
- 自动文件清理
- 支持文档样式自定义

## API 使用

### 转换文档

```http
POST /convert
Content-Type: application/json

{
  "markdown": "# Hello World\n\nThis is a test document.",
  "filename": "test-doc.docx"
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

### 下载文档

```http
GET /download/{filename}
```

## 开发设置

1. 安装依赖：

```bash
npm install
```

2. 配置环境：

创建 .dev.vars 文件：

```env
DOWNLOAD_LINK_EXPIRY=3600
```

3. 创建 R2 存储桶：

```bash
wrangler r2 bucket create docx-storage
```

4. 开发模式：

```bash
npm run dev
```

5. 部署：

```bash
npm run deploy
```

## 配置选项

### wrangler.toml

```toml
name = "markdown-to-docx"
main = "src/index.ts"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "docx-storage"

[vars]
DOWNLOAD_LINK_EXPIRY = "3600"
```

## 许可证

ISC
