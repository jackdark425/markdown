import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';
import type { Token } from 'markdown-it';
import { DocxGeneratorOptions } from '../types';

export class DocxGenerator {
  private document: Document;
  private options: DocxGeneratorOptions;
  private children: (Paragraph | Table)[] = [];

  constructor(options: DocxGeneratorOptions = {}) {
    this.options = options;
    this.document = new Document({
      sections: [{
        properties: {},
        children: this.children
      }]
    });
  }

  /**
   * 获取标题级别
   * @param level 标题级别 1-6
   */
  private getHeadingLevel(level: number): HeadingLevel {
    switch (level) {
      case 1: return HeadingLevel.HEADING_1;
      case 2: return HeadingLevel.HEADING_2;
      case 3: return HeadingLevel.HEADING_3;
      case 4: return HeadingLevel.HEADING_4;
      case 5: return HeadingLevel.HEADING_5;
      case 6: return HeadingLevel.HEADING_6;
      default: return HeadingLevel.HEADING_1;
    }
  }

  /**
   * 添加标题
   * @param text 标题文本
   * @param level 标题级别 1-6
   */
  addHeading(text: string, level: number) {
    const heading = new Paragraph({
      children: [
        new TextRun({
          text,
          size: 28 + (6 - level) * 2 // 根据级别调整大小
        })
      ],
      heading: this.getHeadingLevel(level),
      spacing: {
        before: 240,
        after: 120
      }
    });
    this.children.push(heading);
  }

  /**
   * 添加段落
   * @param text 段落文本
   */
  addParagraph(text: string) {
    const paragraph = new Paragraph({
      children: [
        new TextRun({
          text,
          size: 24
        })
      ],
      spacing: {
        before: 120,
        after: 120
      }
    });
    this.children.push(paragraph);
  }

  /**
   * 添加代码块
   * @param code 代码内容
   * @param language 编程语言
   */
  addCodeBlock(code: string, language: string) {
    const paragraph = new Paragraph({
      children: [
        new TextRun({
          text: code,
          font: 'Courier New',
          size: 20
        })
      ],
      spacing: {
        before: 120,
        after: 120
      }
    });
    this.children.push(paragraph);
  }

  /**
   * 添加列表
   * @param items 列表项
   * @param ordered 是否有序列表
   */
  addList(items: string[], ordered: boolean = false) {
    const paragraphs = items.map((item, index) => {
      return new Paragraph({
        children: [
          new TextRun({
            text: `${ordered ? `${index + 1}.` : '•'} ${item}`,
            size: 24
          })
        ],
        indent: {
          left: 720
        },
        spacing: {
          before: 60,
          after: 60
        }
      });
    });

    this.children.push(...paragraphs);
  }

  /**
   * 添加表格
   * @param data 表格数据
   */
  addTable(data: string[][]) {
    if (!data.length) return;

    const rows = data.map(rowData => {
      return new TableRow({
        children: rowData.map(cellData => {
          return new TableCell({
            children: [new Paragraph({
              children: [
                new TextRun({
                  text: cellData,
                  size: 24
                })
              ]
            })]
          });
        })
      });
    });

    const table = new Table({
      rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      }
    });

    this.children.push(table);
  }

  /**
   * 处理 Markdown tokens
   * @param tokens Markdown tokens
   */
  processTokens(tokens: Token[]) {
    console.log("处理 Markdown tokens，数量:", tokens.length);
    
    let currentListItems: string[] = [];
    let isOrderedList = false;
    let tableData: string[][] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      console.log(`处理 token[${i}]: ${token.type}`);

      switch (token.type) {
        case 'heading_open':
          const level = parseInt(token.tag.slice(1));
          const headingContent = tokens[i + 1].content;
          console.log(`添加标题: ${headingContent} (级别 ${level})`);
          this.addHeading(headingContent, level);
          i += 2; // 跳过 heading_content 和 heading_close
          break;

        case 'paragraph_open':
          const content = tokens[i + 1].content;
          if (content) {
            console.log(`添加段落: ${content.substring(0, 30)}...`);
            this.addParagraph(content);
          }
          i += 2; // 跳过 paragraph_content 和 paragraph_close
          break;

        case 'bullet_list_open':
        case 'ordered_list_open':
          isOrderedList = token.type === 'ordered_list_open';
          currentListItems = [];
          break;

        case 'list_item_open':
          if (tokens[i + 2] && tokens[i + 2].content) {
            const itemContent = tokens[i + 2].content;
            console.log(`添加列表项: ${itemContent}`);
            currentListItems.push(itemContent);
          }
          break;

        case 'bullet_list_close':
        case 'ordered_list_close':
          if (currentListItems.length > 0) {
            console.log(`完成列表，项目数: ${currentListItems.length}`);
            this.addList(currentListItems, isOrderedList);
            currentListItems = [];
          }
          break;

        case 'fence':
          console.log(`添加代码块: ${token.info || '无语言'}`);
          this.addCodeBlock(token.content, token.info || '');
          break;

        case 'table_open':
          tableData = [];
          break;

        case 'tr_open':
          const row: string[] = [];
          let j = i + 1;
          while (j < tokens.length && tokens[j].type !== 'tr_close') {
            if ((tokens[j].type === 'td_open' || tokens[j].type === 'th_open') && tokens[j + 1].type === 'inline') {
              row.push(tokens[j + 1].content);
              j += 2;
            } else {
              j++;
            }
          }
          tableData.push(row);
          i = j;
          break;

        case 'table_close':
          if (tableData.length > 0) {
            console.log(`添加表格，行数: ${tableData.length}`);
            this.addTable(tableData);
            tableData = [];
          }
          break;
      }
    }
    
    console.log("Markdown 处理完成，文档元素数:", this.children.length);
  }

  /**
   * 将文档转换为 ArrayBuffer
   */
  async generate(): Promise<ArrayBuffer> {
    console.log("生成 DOCX 文档，元素数:", this.children.length);
    
    // 确保文档至少有一个段落
    if (this.children.length === 0) {
      this.addParagraph("文档内容为空");
    }
    
    // 重新创建文档以确保更新
    this.document = new Document({
      sections: [{
        properties: {},
        children: this.children
      }]
    });
    
    return await Packer.toBuffer(this.document);
  }
}
