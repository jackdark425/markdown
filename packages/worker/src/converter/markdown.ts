import MarkdownIt from 'markdown-it';
import { MarkdownParserOptions } from '../types';

export class MarkdownParser {
  private md: MarkdownIt;

  constructor(options: MarkdownParserOptions = {}) {
    this.md = new MarkdownIt({
      html: false,       // 禁用 HTML 标签
      linkify: true,     // 自动转换 URL 为链接
      typographer: true, // 启用一些语言中性的替换和引号美化
      breaks: true,      // 转换换行符为 <br>
      ...options
    });
  }

  /**
   * 解析 Markdown 内容
   * @param content Markdown 文本内容
   * @returns 解析后的 tokens
   */
  parse(content: string) {
    console.log("开始解析 Markdown 内容");
    
    // 确保内容不为空
    if (!content || content.trim() === '') {
      console.log("Markdown 内容为空，使用默认内容");
      content = '# 空文档\n\n这是一个空的文档。';
    }
    
    // 解析 markdown 为 tokens
    const tokens = this.md.parse(content, {});
    console.log(`解析完成，生成了 ${tokens.length} 个 tokens`);
    
    // 打印前几个 token 用于调试
    if (tokens.length > 0) {
      console.log("前 5 个 tokens 示例:");
      for (let i = 0; i < Math.min(5, tokens.length); i++) {
        console.log(`- Token ${i}: ${tokens[i].type} ${tokens[i].tag || ''}`);
      }
    }
    
    return {
      tokens,
      // 移除图片处理，只返回解析后的 tokens
    };
  }

  /**
   * 将 Markdown 渲染为 HTML
   * @param content Markdown 文本内容
   * @returns HTML 字符串
   */
  render(content: string): string {
    return this.md.render(content);
  }
}
