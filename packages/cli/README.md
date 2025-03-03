# Markdown to DOCX Converter

一个功能完整的Markdown转Word文档转换工具。

## 功能特性

- 支持完整的Markdown语法
  - 标题（1-6级）
  - 列表（有序和无序，支持嵌套）
  - 表格（支持表头样式）
  - 代码块（带语言标记和语法高亮）
  - 引用块
  - 水平分隔线
  - 任务列表（支持嵌套）
  - 图片（支持本地、网络和Base64图片）
  
- 支持丰富的文本格式
  - 粗体
  - 斜体
  - 删除线
  - 行内代码
  - 链接（带下划线样式）
  
- 自定义样式支持
  - 可自定义字体
  - 可自定义字号
  - 可自定义颜色
  - 支持自定义主题

- 文档增强功能
  - 自动生成目录（可配置目录深度）
  - 图片自适应大小和优化
  - 图片说明文本
  - 页码支持
  - 文档元数据（标题、作者等）

## 安装

```bash
npm install -g md2docx
```

## 使用方法

### 基本使用

```bash
md2docx input.md
```

这将生成一个与输入文件同名的 .docx 文件。

### 指定输出文件

```bash
md2docx input.md -o output.docx
```

### 使用自定义样式

```bash
md2docx input.md -s style.json
```

### 添加页眉页脚

```bash
md2docx input.md --header "页眉文本" --footer "页脚文本"
```

### 添加目录

```bash
# 生成默认目录（包含3级标题）
md2docx input.md --toc

# 指定目录标题和层级
md2docx input.md --toc --toc-title "内容目录" --toc-level 4
```

### 图片处理

```bash
# 支持本地图片路径
md2docx document.md --style custom-style.json

# 指定图片优化选项（在样式文件中）
{
  "images": {
    "maxWidth": 800,    // 图片最大宽度
    "quality": 85,      // JPEG压缩质量
    "optimize": true    // 是否优化图片
  }
}
```

### 添加水印

```bash
md2docx input.md --watermark "机密文件" --watermark-color "CCCCCC" --watermark-opacity "0.3"
```

### 文档属性设置

在样式配置文件中设置文档属性：
```json
{
  "document": {
    "title": "文档标题",
    "author": "作者名称",
    "subject": "文档主题",
    "keywords": "关键词1,关键词2"
  }
}
```

### 自定义页面布局

```bash
# 设置页面大小和方向
md2docx input.md --page-size A4 --orientation landscape

# 自定义页边距（单位：英寸）
md2docx input.md --margin-top 1.5 --margin-right 1.0 --margin-bottom 1.5 --margin-left 1.0
```

### 预览和批量转换

```bash
# 在转换前预览文档
md2docx input.md --preview

# 批量转换多个文件
md2docx file1.md file2.md file3.md

# 使用通配符批量转换并预览
md2docx docs/*.md --preview

# 转换时应用相同的样式和配置
md2docx *.md --header "批量转换" --watermark "机密文件" --page-size A4
```

### 其他功能
- 在转换前生成 HTML 预览并在浏览器中打开
- 同时转换多个 Markdown 文件
- 显示详细的转换进度和耗时信息
- 支持自定义页面布局和样式

## 样式配置

可以通过JSON文件自定义样式，示例如下：

```json
{
  "default": {
    "font": "微软雅黑",
    "size": 24,
    "color": "333333"
  },
  "toc": {
    "title": "目录",
    "maxLevel": 3,
    "font": "宋体",
    "size": 24,
    "color": "000000",
    "indent": {
      "level1": 0,
      "level2": 360,
      "level3": 720
    }
  },
  "imageCaption": {
    "font": "宋体",
    "size": 21,
    "color": "666666",
    "italic": true
  },
  "heading1": {
    "font": "微软雅黑",
    "size": 36,
    "color": "000066"
  },
  "header": {
    "font": "宋体",
    "size": 20,
    "color": "666666",
    "text": "页眉文本"
  },
  "footer": {
    "font": "宋体",
    "size": 20,
    "color": "666666",
    "text": "页脚文本"
  },
  "watermark": {
    "text": "机密文件",
    "font": "黑体",
    "size": 40,
    "color": "DDDDDD",
    "opacity": 0.2
  },
  "page": {
    "margin": {
      "top": 1440,
      "right": 1440,
      "bottom": 1440,
      "left": 1440
    },
    "size": {
      "width": 11906,
      "height": 16838
    },
    "orientation": "portrait"
  }
}
```

## 开发

### 构建

```bash
npm install
npm run build
```

### 测试

```bash
npm test
```

## 许可证

MIT
