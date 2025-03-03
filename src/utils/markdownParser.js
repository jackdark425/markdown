const MarkdownIt = require('markdown-it');
const taskLists = require('markdown-it-task-lists');

class MarkdownParser {
  constructor() {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      strikethrough: true  // 启用删除线支持
    }).use(taskLists, { enabled: true }); // 启用任务列表支持

    // 存储图片引用
    this.images = new Map();
  }

  /**
   * 解析所有图片引用
   * @param {string} content Markdown内容
   * @returns {Array} 图片引用数组
   */
  parseImages(content) {
    const images = [];
    const tokens = this.md.parse(content, {});
    
    tokens.forEach(token => {
      // 查找图片标记
      if (token.type === 'inline') {
        const imageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
        let match;
        while ((match = imageRegex.exec(token.content)) !== null) {
          const [_, alt, src, title = ''] = match;
          images.push({
            src,
            alt,
            title,
            isUrl: src.startsWith('http://') || src.startsWith('https://'),
            isBase64: src.startsWith('data:image/')
          });
        }
      }
    });

    return images;
  }

  /**
   * 解析Markdown文本为tokens
   * @param {string} content Markdown内容
   * @returns {Object} 解析后的tokens和图片引用
   */
  parse(content) {
    const tokens = this.md.parse(content, {});
    const images = this.parseImages(content);
    
    // 移除包含图片的段落标记，因为图片会单独处理
    const filteredTokens = tokens.filter(token => {
      if (token.type === 'inline') {
        return !token.content.includes('![');
      }
      return true;
    });
    
    return { tokens: filteredTokens, images };
  }

  /**
   * 获取Token的具体内容
   * @param {Object} token Markdown token
   * @returns {string} token的文本内容
   */
  getTokenContent(token) {
    if (token.content) {
      return token.content;
    }
    return '';
  }

  /**
   * 判断是否是特定类型的token
   * @param {Object} token Markdown token
   * @param {string} type token类型
   * @returns {boolean} 是否匹配
   */
  isTokenType(token, type) {
    return token.type === type;
  }
}

module.exports = MarkdownParser;
