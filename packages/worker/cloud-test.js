const test = async () => {
  const response = await fetch('https://markdown-to-docx.jackdong8588.workers.dev/convert', {
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
      filename: 'cloud-test-doc.docx'
    })
  });

  const result = await response.json();
  console.log('云端转换结果：', result);
  
  // 下载文件
  console.log('下载链接：', `https://markdown-to-docx.jackdong8588.workers.dev${result.url}`);
  
  // 如果在浏览器环境中，可以直接下载
  // window.location.href = `https://markdown-to-docx.jackdong8588.workers.dev${result.url}`;
};

test().catch(console.error);
