const fs = require('fs').promises;
const { Packer } = require('docx');
const cliProgress = require('cli-progress');
const MarkdownParser = require('./utils/markdownParser');
const DocxGenerator = require('./utils/docxGenerator');

/**
 * 日志辅助函数
 * @param {string} message 日志消息
 */
function log(message) {
  if (process.env.NODE_ENV !== 'test') {
    console.log(message);
  }
}

/**
 * 错误日志辅助函数
 * @param {Error} error 错误对象
 */
function logError(error) {
  console.error(`Error details: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
}

// 创建进度条
const progressBar = new cliProgress.SingleBar({
  format: '{bar} {percentage}% | {value}/{total} tokens | {step}',
  barCompleteChar: '',
  barIncompleteChar: '',
  hideCursor: true
});

/**
 * 处理Markdown tokens并转换为DOCX格式
 * @param {Array} tokens Markdown tokens
 * @param {DocxGenerator} generator DOCX生成器实例
 */
function processTokens(tokens, generator) {
  let currentListItems = [];
  let isOrderedList = false;
  let tableData = [];
  let listLevel = 0;

  // 初始化进度条
  progressBar.start(tokens.length, 0, { step: 'Processing tokens' });
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    progressBar.update(i + 1, { step: `Processing ${token.type}` });

    switch (token.type) {
      case 'heading_open':
        const level = parseInt(token.tag.slice(1));
        const headingContent = tokens[i + 1].content;
        generator.addHeading(headingContent, level);
        i += 1; // 跳过heading_content和heading_close
        break;

      case 'paragraph_open':
        const content = tokens[i + 1].content;
        if (content) {
          generator.addParagraph(content);
        }
        i += 1; // 跳过paragraph_content和paragraph_close
        break;

      case 'bullet_list_open':
      case 'ordered_list_open':
        listLevel++;
        if (currentListItems.length === 0) {
          isOrderedList = token.type === 'ordered_list_open';
        }
        break;

      case 'list_item_open':
        const itemContentToken = tokens[i + 2]; // list_item -> paragraph -> content
        if (itemContentToken && itemContentToken.content) {
          // 检查是否是任务列表项
          const taskListMatch = itemContentToken.content.match(/^\[([ x])\]\s*(.*)$/i);
          if (taskListMatch) {
            const isChecked = taskListMatch[1].toLowerCase() === 'x';
            const text = taskListMatch[2];
            generator.addTaskListItem(text, isChecked, listLevel - 1);
            i += 2;
          } else {
            currentListItems.push({
              text: itemContentToken.content,
              level: listLevel - 1
            });
          }
        }
        break;

      case 'bullet_list_close':
      case 'ordered_list_close':
        listLevel--;
        if (listLevel === 0 && currentListItems.length > 0) {
          let currentLevel = 0;
          let currentLevelItems = currentListItems.filter(item => item.level === currentLevel);
          
          while (currentLevelItems.length > 0) {
            generator.addList(
              currentLevelItems.map(item => item.text),
              isOrderedList,
              currentLevel
            );
            
            currentLevel++;
            currentLevelItems = currentListItems.filter(item => item.level === currentLevel);
          }
          
          currentListItems = [];
        }
        break;

      case 'fence': // 代码块
        generator.addCodeBlock(token.content, token.info || '');
        break;

      case 'table_open':
        tableData = [];
        break;

      case 'tr_open':
        const row = [];
        let j = i + 1;
        while (tokens[j].type !== 'tr_close') {
          if ((tokens[j].type === 'td_open' || tokens[j].type === 'th_open') && tokens[j + 1].type === 'inline') {
            const cellContent = tokens[j + 1].content;
            row.push(cellContent);
            j += 2; // 跳过content和close标记
          }
          j++;
        }
        tableData.push(row);
        i = j; // 更新主循环索引到当前行的末尾
        break;

      case 'table_close':
        if (tableData.length > 0) {
          generator.addTable(tableData);
          tableData = [];
        }
        break;
    }
  }

  progressBar.stop();
}

/**
 * 将Markdown文件转换为DOCX文档
 * @param {string} inputPath 输入的Markdown文件路径
 * @param {string} outputPath 输出的DOCX文件路径
 * @param {object} customStyles 自定义样式配置
 */
async function convertMarkdownToDocx(inputPath, outputPath, customStyles = {}) {
  try {
    const startTime = Date.now();
    
    // 读取Markdown文件
    log('\nStarting conversion...');
    log('Reading markdown file:', inputPath);
    const markdownContent = await fs.readFile(inputPath, 'utf-8');

    // 解析Markdown
    log('Parsing markdown content...');
    const parser = new MarkdownParser();
    const { tokens, images } = parser.parse(markdownContent);

    // 生成DOCX
    log('Generating DOCX document...');
    const generator = new DocxGenerator(customStyles);
    
    // 初始化生成器
    await generator.init();

    // 如果启用了目录，先生成目录
    if (customStyles.toc?.enabled) {
      log('Generating table of contents...');
      generator.addTableOfContents();
    }

    // 处理所有图片
    if (images.length > 0) {
      log(`Processing ${images.length} images...`);
      images.forEach(image => generator.addImageToQueue(image));
      await generator.processImageQueue();
    }

    // 处理文档内容
    processTokens(tokens, generator);

    // 生成并保存文档
    log('Saving document to:', outputPath);
    log('Generating final document...');
    const doc = generator.getDocument();
    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(outputPath, buffer);

    // 显示完成信息和耗时
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    log(`\nConversion completed in ${duration} seconds`);

  } catch (error) {
    logError(error);
    throw new Error(`转换失败: ${error.message}`);
  }
}

module.exports = {
  convertMarkdownToDocx
};
