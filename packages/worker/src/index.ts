import { MarkdownParser } from './converter/markdown';
import { DocxGenerator } from './converter/docx';
import { StorageManager } from './storage/r2';
import { ConvertRequest, ConvertResponse } from './types';

export interface Env {
  STORAGE: R2Bucket;
  DOWNLOAD_LINK_EXPIRY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // 处理文档下载请求
    if (request.method === 'GET' && url.pathname.startsWith('/download/')) {
      return handleDownload(request, env);
    }

    // 处理文档转换请求
    if (request.method === 'POST' && url.pathname === '/convert') {
      return handleConvert(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },

  // 定期清理过期文件
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const storage = new StorageManager({
      bucket: env.STORAGE,
      expirySeconds: parseInt(env.DOWNLOAD_LINK_EXPIRY || '3600')
    });

    await storage.cleanupExpiredFiles();
  }
};

/**
 * 处理文档下载请求
 */
async function handleDownload(request: Request, env: Env): Promise<Response> {
  const fileName = request.url.split('/download/')[1];
  if (!fileName) {
    return new Response('File Not Found', { status: 404 });
  }

  console.log(`处理下载请求: ${fileName}`);

  const storage = new StorageManager({
    bucket: env.STORAGE,
    expirySeconds: parseInt(env.DOWNLOAD_LINK_EXPIRY || '3600')
  });

  const file = await storage.getFile(fileName);
  if (!file) {
    console.log(`文件未找到: ${fileName}`);
    return new Response('File Not Found', { status: 404 });
  }

  console.log(`文件已找到，准备下载: ${fileName}`);
  const headers = new Headers();
  file.writeHttpMetadata(headers);
  headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  headers.set('Content-Disposition', `attachment; filename="${fileName}"`);

  return new Response(file.body, { headers });
}

/**
 * 处理文档转换请求
 */
async function handleConvert(request: Request, env: Env): Promise<Response> {
  try {
    console.log("收到转换请求");
    
    // 验证请求
    if (!request.body) {
      return new Response('Request body is required', { status: 400 });
    }

    const data = await request.json<ConvertRequest>();
    if (!data.markdown) {
      return new Response('Markdown content is required', { status: 400 });
    }

    console.log(`Markdown 内容长度: ${data.markdown.length} 字符`);

    // 初始化组件
    const parser = new MarkdownParser();
    const generator = new DocxGenerator();
    const storage = new StorageManager({
      bucket: env.STORAGE,
      expirySeconds: parseInt(env.DOWNLOAD_LINK_EXPIRY || '3600')
    });

    // 转换流程
    console.log("开始解析 Markdown");
    const { tokens } = parser.parse(data.markdown);
    console.log(`解析完成，生成了 ${tokens.length} 个 tokens`);
    
    console.log("开始处理 tokens 生成 DOCX 内容");
    generator.processTokens(tokens);
    
    console.log("生成 DOCX 文件");
    const docxBuffer = await generator.generate();
    console.log(`DOCX 文件大小: ${docxBuffer.byteLength} 字节`);

    // 保存文件
    console.log("上传文件到 R2 存储");
    const result = await storage.uploadFile(
      docxBuffer,
      data.filename || 'document.docx'
    );
    console.log(`文件已上传: ${result.filename}`);

    // 返回结果
    const response: ConvertResponse = {
      url: result.url,
      filename: result.filename,
      expiresAt: result.expiresAt
    };

    console.log(`转换完成，返回下载链接: ${result.url}`);
    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('转换错误:', error);
    return new Response(`Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}
