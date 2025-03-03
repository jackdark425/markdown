const { 
  Document, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  BorderStyle, 
  AlignmentType, 
  WidthType, 
  VerticalAlign,
  ShadingType,
  Header,
  Footer,
  SectionType,
  ImageRun,
  TextWrappingType,
  TextWrappingSide,
  PageOrientation
} = require('docx');
const ImageProcessor = require('./imageProcessor');
const TocGenerator = require('./tocGenerator');
const path = require('path');
const defaultStyles = require('../config/defaultStyles');

function log(message) {
  if (process.env.NODE_ENV !== 'test') {
    console.log(message);
  }
}

function logError(message) {
  if (process.env.NODE_ENV === 'test') {
    console.error(message);
  }
}

class DocxGenerator {
  constructor(customStyles = {}) {
    this.styles = { ...defaultStyles, ...customStyles };
    this.children = [];
    this.document = null;
    this.imageProcessor = new ImageProcessor({
      maxWidth: customStyles.images?.maxWidth || 800,
      quality: customStyles.images?.quality || 85,
      tempDir: path.join(process.cwd(), 'temp'),
      cacheMaxAge: customStyles.images?.cacheMaxAge || 7 * 24 * 60 * 60 * 1000,
      cacheMaxSize: customStyles.images?.cacheMaxSize || 500 * 1024 * 1024
    });
    this.tocGenerator = new TocGenerator({
      title: this.styles.toc?.title || '目录',
      maxLevel: this.styles.toc?.maxLevel || 3
    });
    this.imageQueue = [];
    this.initialized = false;
  }

  async init() {
    if (!this.initialized) {
      await this.imageProcessor.init();
      this.initialized = true;
    }
  }

  addImageToQueue(imageInfo) {
    this.imageQueue.push(imageInfo);
  }

  async processImageQueue() {
    if (!this.imageQueue.length) return;

    log(`Processing ${this.imageQueue.length} images...`);
    const results = await Promise.allSettled(
      this.imageQueue.map(async (image) => {
        try {
          await this.addImage(image.src, image.alt, image.title);
        } catch (error) {
          logError(`Failed to process image: ${image.src}`);
          logError(error.stack || error.message);

          // 创建错误消息 TextRun
          const errorRun = new TextRun({
            text: `[Failed to load image: ${image.alt || image.src}]`,
            color: 'FF0000',
            bold: true,
            size: 24
          });

          // 创建包含错误消息的段落
          const paragraph = new Paragraph({
            children: [errorRun],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 }
          });

          // 添加错误消息段落到文档
          this.children.push(paragraph);
        }
      })
    );

    this.imageQueue = [];

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    log(`Image processing complete: ${succeeded} succeeded, ${failed} failed`);
  }

  addParagraph(text) {
    const isQuoteBlock = text.startsWith('> ');
    const cleanText = isQuoteBlock ? text.replace(/^> /, '') : text;
    const style = this.styles.default;
    const runs = this.parseInlineStyles(cleanText, {
      ...style,
      color: isQuoteBlock ? '666666' : style.color,
      italic: isQuoteBlock
    });
    
    const paragraph = new Paragraph({
      children: runs,
      indent: isQuoteBlock ? { left: 720 } : undefined,
      spacing: {
        after: 200,
        before: isQuoteBlock ? 200 : 0
      }
    });

    this.children.push(paragraph);
    return paragraph;
  }

  addHeading(text, level) {
    const headingLevel = Math.min(Math.max(level, 1), 6);
    const style = this.styles[`heading${headingLevel}`];
    const runs = this.parseInlineStyles(text, style);
    
    const paragraph = new Paragraph({
      children: runs,
      heading: HeadingLevel[`HEADING_${headingLevel}`],
      spacing: {
        after: 200
      }
    });

    this.children.push(paragraph);
    return paragraph;
  }

  addList(items, ordered = false, level = 0) {
    items.forEach((item, index) => {
      const marker = ordered ? `${index + 1}. ` : '• ';
      const runs = [
        new TextRun({ text: marker }),
        ...this.parseInlineStyles(item)
      ];
      
      this.children.push(
        new Paragraph({
          children: runs,
          indent: { left: 720 + (level * 360) },
          spacing: { before: 100, after: 100 }
        })
      );
    });
  }

  addCodeBlock(code, language = '') {
    const style = this.styles.code;
    const lines = code.split('\n');
    
    // 创建代码块容器
    const paragraph = new Paragraph({
      children: [
        new TextRun({
          text: lines.join('\n'),
          font: style.font,
          size: style.size,
          color: style.color
        })
      ],
      spacing: { before: 200, after: 200 },
      shading: {
        type: ShadingType.SOLID,
        color: 'F5F5F5'
      },
      border: {
        left: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' }
      },
      indent: { left: 360 }
    });
    
    this.children.push(paragraph);
    return paragraph;
  }

  parseInlineStyles(text, baseStyle = this.styles.default) {
    const runs = [];
    let currentText = '';
    let isBold = false;
    let isItalic = false;
    let isCode = false;

    const addRun = () => {
      if (currentText) {
        runs.push(new TextRun({
          text: currentText,
          bold: isBold,
          italic: isItalic,
          font: isCode ? this.styles.code.font : baseStyle.font,
          size: isCode ? this.styles.code.size : baseStyle.size,
          color: isCode ? this.styles.code.color : baseStyle.color
        }));
        currentText = '';
      }
    };

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '`') {
        addRun();
        isCode = !isCode;
      } else if ((text[i] === '*' || text[i] === '_') && i + 1 < text.length && text[i + 1] === text[i]) {
        addRun();
        isBold = !isBold;
        i++;
      } else if (text[i] === '*' || text[i] === '_') {
        addRun();
        isItalic = !isItalic;
      } else {
        currentText += text[i];
      }
    }

    addRun();
    return runs;
  }

  addTable(data) {
    if (!data || data.length === 0) return;

    const rows = data.map((row, rowIndex) => {
      return new TableRow({
        children: row.map(cell => {
          const style = rowIndex === 0 ? { ...this.styles.table, bold: true } : this.styles.table;
          const runs = this.parseInlineStyles(cell, style);
          
          return new TableCell({
            children: [
              new Paragraph({
                children: runs,
                alignment: AlignmentType.CENTER
              })
            ],
            verticalAlign: VerticalAlign.CENTER,
            width: {
              size: Math.floor(100 / row.length),
              type: WidthType.PERCENTAGE
            }
          });
        })
      });
    });

    const table = new Table({
      rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 }
      },
      margins: {
        top: 100,
        bottom: 100,
        left: 100,
        right: 100
      }
    });

    this.children.push(table);
    return table;
  }

  async addImage(src, alt = '', title = '') {
    try {
      let imageData;
      
      if (src.startsWith('http://') || src.startsWith('https://')) {
        imageData = await this.imageProcessor.processUrlImage(src);
      } else if (src.startsWith('data:image/')) {
        imageData = await this.imageProcessor.processBase64Image(src);
      } else {
        imageData = await this.imageProcessor.processLocalImage(src);
      }

      const tempPath = await this.imageProcessor.saveTempImage(
        imageData.buffer,
        `.${imageData.metadata.format}`
      );

      const maxWidth = 600;
      const { width, height } = imageData.metadata;
      let displayWidth = width;
      let displayHeight = height;

      if (width > maxWidth) {
        const ratio = maxWidth / width;
        displayWidth = maxWidth;
        displayHeight = Math.round(height * ratio);
      }

      const paragraph = new Paragraph({
        children: [
          new ImageRun({
            data: imageData.buffer,
            transformation: {
              width: displayWidth,
              height: displayHeight
            },
            floating: {
              horizontalPosition: {
                relative: TextWrappingSide.CENTER,
                align: AlignmentType.CENTER
              },
              verticalPosition: {
                relative: TextWrappingSide.LINE,
                align: AlignmentType.CENTER
              },
              wrap: {
                type: TextWrappingType.SQUARE,
                side: TextWrappingSide.BOTH
              }
            }
          })
        ],
        spacing: { before: 200, after: 200 },
        alignment: AlignmentType.CENTER
      });

      this.children.push(paragraph);

      if (title) {
        this.children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                ...this.styles.imageCaption
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
          })
        );
      }

      await this.imageProcessor.cleanup(tempPath);
    } catch (error) {
      throw error;
    }
  }

  getDocument() {
    return new Document({
      creator: this.styles.document?.author || "MarkdownToDocx",
      description: "Created by MarkdownToDocx converter",
      title: this.styles.document?.title || "Converted Document",
      sections: [{
        properties: {
          page: {
            size: {
              width: 12240,
              height: 15840
            },
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: this.children
      }]
    });
  }

  addTableOfContents() {
    const tocParagraphs = this.tocGenerator.generate(this.styles);
    this.children.push(...tocParagraphs);
  }
}

module.exports = DocxGenerator;
