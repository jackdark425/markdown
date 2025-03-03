const test = async () => {
  const response = await fetch('http://localhost:8787/convert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      markdown: `# 测试文档

## 这是一个二级标题

这是一段普通文本。

### 列表示例
- 项目1
- 项目2
- 项目3

### 代码示例
\`\`\`javascript
console.log("Hello World!");
\`\`\`

### 表格示例
| 表头1 | 表头2 |
|-------|-------|
| 内容1 | 内容2 |
| 内容3 | 内容4 |
`,
      filename: 'test-doc.docx'
    })
  });

  const result = await response.json();
  console.log('转换结果：', result);
  
  // 如果在浏览器环境中，可以直接下载
  // window.location.href = `http://localhost:8787${result.url}`;
};

test().catch(console.error);
