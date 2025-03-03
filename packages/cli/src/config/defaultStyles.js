module.exports = {
  default: {
    font: '宋体',
    size: 24, // 12pt
    color: '000000'
  },
  header: {
    font: '宋体',
    size: 20, // 10pt
    color: '666666',
    text: ''  // 页眉文本，可通过自定义样式配置
  },
  footer: {
    font: '宋体',
    size: 20, // 10pt
    color: '666666',
    text: ''  // 页脚文本，可通过自定义样式配置
  },
  strikethrough: {
    font: '宋体',
    size: 24, // 12pt
    color: '666666'
  },
  taskList: {
    font: '宋体',
    size: 24, // 12pt
    color: '000000',
    checked: {
      color: '008000'  // 已完成任务使用绿色
    },
    unchecked: {
      color: 'FF0000'  // 未完成任务使用红色
    }
  },
  heading1: {
    font: '黑体',
    size: 36, // 18pt
    color: '000000'
  },
  heading2: {
    font: '黑体',
    size: 32, // 16pt
    color: '000000'
  },
  heading3: {
    font: '黑体',
    size: 28, // 14pt
    color: '000000'
  },
  heading4: {
    font: '黑体',
    size: 24, // 12pt
    color: '000000'
  },
  heading5: {
    font: '黑体',
    size: 24, // 12pt
    color: '000000'
  },
  heading6: {
    font: '黑体',
    size: 24, // 12pt
    color: '000000'
  },
  table: {
    font: '宋体',
    size: 21, // 10.5pt
    color: '000000'
  },
  code: {
    font: 'Sarasa Mono SC',  // 更纱黑体
    size: 21, // 10.5pt
    color: '000000'
  },
  list: {
    font: '宋体',
    size: 24, // 12pt
    color: '000000'
  },
  quote: {
    font: '宋体',
    size: 24, // 12pt
    color: '666666',
    italic: true
  },
  imageCaption: {
    font: '宋体',
    size: 21, // 10.5pt
    color: '666666',
    italic: true
  },
  watermark: {
    text: '',  // 水印文本
    font: '黑体',
    size: 40, // 20pt
    color: 'DDDDDD',  // 浅灰色
    opacity: 0.2
  },
  document: {
    title: '',  // 文档标题
    author: '',  // 文档作者
    subject: '', // 文档主题
    keywords: '' // 文档关键词
  },
  toc: {
    title: '目录', // 目录标题
    maxLevel: 3,  // 最大标题级别
    font: '宋体',
    size: 24, // 12pt
    color: '000000',
    indent: {
      level1: 0,    // 一级标题缩进
      level2: 360,  // 二级标题缩进
      level3: 720   // 三级标题缩进
    }
  },
  page: {
    margin: {
      top: 1440,    // 1 inch = 1440 twips
      right: 1440,
      bottom: 1440,
      left: 1440
    },
    size: {
      width: 12240,  // 8.5 inches = 12240 twips
      height: 15840  // 11 inches = 15840 twips
    },
    orientation: 'portrait'  // portrait 或 landscape
  }
};
