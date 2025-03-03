const { Paragraph, TextRun, HeadingLevel, TableOfContents } = require('docx');

class TocGenerator {
  constructor(options = {}) {
    this.options = {
      title: options.title || '目录',
      maxLevel: options.maxLevel || 3,
      ...options
    };
  }

  /**
   * 生成目录对象
   * @param {object} styles 样式配置
   * @returns {Array} 目录段落数组
   */
  generate(styles) {
    const paragraphs = [];

    // 添加目录标题
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: this.options.title,
            size: 32,
            bold: true
          })
        ],
        spacing: { after: 300, before: 300 }
      })
    );

    // 添加目录
    paragraphs.push(
      new TableOfContents("目录", {
        hyperlink: true,
        headingStyleRange: `1-${this.options.maxLevel}`,
        stylesWithLevels: [
          { name: "Heading1", level: 1 },
          { name: "Heading2", level: 2 },
          { name: "Heading3", level: 3 }
        ]
      })
    );

    // 添加分隔段落
    paragraphs.push(
      new Paragraph({
        children: [],
        spacing: { after: 800 }
      })
    );

    return paragraphs;
  }

  /**
   * 计算标题级别
   * @param {Array} tokens 解析后的tokens
   * @returns {Array} 标题信息数组
   */
  getHeadings(tokens) {
    const headings = [];
    let currentLevel = 0;

    tokens.forEach((token, index) => {
      if (token.type === 'heading_open') {
        const level = parseInt(token.tag.slice(1));
        if (level <= this.options.maxLevel) {
          const contentToken = tokens[index + 1];
          if (contentToken && contentToken.type === 'inline') {
            headings.push({
              text: contentToken.content,
              level: level
            });
          }
        }
      }
    });

    return headings;
  }
}

module.exports = TocGenerator;
