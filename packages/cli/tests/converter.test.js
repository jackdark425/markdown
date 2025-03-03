const fs = require('fs').promises;
const path = require('path');
const { convertMarkdownToDocx } = require('../src/index');

describe('Markdown to DOCX Converter Tests', () => {
  const testInputPath = path.join(__dirname, '..', 'example', 'test.md');
  const testOutputPath = path.join(__dirname, '..', 'example', 'test-default.docx');
  const formatTestInputPath = path.join(__dirname, 'format-test.md');
  const formatTestOutputPath = path.join(__dirname, 'format-test.docx');

  beforeAll(async () => {
    // 创建一个用于格式测试的Markdown文件
    const formatTestContent = `~~删除线测试~~

- [ ] 未完成任务
- [x] 已完成任务`;
    await fs.writeFile(formatTestInputPath, formatTestContent);
  });

  afterAll(async () => {
    // 清理测试文件
    try {
      await fs.unlink(formatTestInputPath);
      await fs.unlink(formatTestOutputPath);
      await fs.unlink(testOutputPath);
    } catch (error) {
      console.warn('清理测试文件失败:', error.message);
    }
  });

  test('should handle strikethrough and task lists correctly', async () => {
    process.env.NODE_ENV = 'test';
    
    // 执行转换
    await convertMarkdownToDocx(formatTestInputPath, formatTestOutputPath);

    // 验证输出文件是否生成
    const exists = await fs.access(formatTestOutputPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  }, 30000); // 增加超时时间到30秒

  test('should convert markdown to docx successfully', async () => {
    process.env.NODE_ENV = 'test';
    
    // 执行转换
    await convertMarkdownToDocx(testInputPath, testOutputPath);

    // 验证输出文件是否生成
    const exists = await fs.access(testOutputPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  }, 30000); // 增加超时时间到30秒

  test('should handle file not found error', async () => {
    process.env.NODE_ENV = 'test';
    
    // 尝试转换一个不存在的文件
    await expect(
      convertMarkdownToDocx('non-existent.md', 'output.docx')
    ).rejects.toThrow(/转换失败/);
  });
});
