const fs = require('fs').promises;
const path = require('path');
const ImageProcessor = require('../src/utils/imageProcessor');
const CacheManager = require('../src/utils/cacheManager');
const DocxGenerator = require('../src/utils/docxGenerator');

// 设置测试环境
process.env.NODE_ENV = 'test';

describe('Image Processing and Caching', () => {
  const testDir = path.join(__dirname, 'test-temp');
  const cacheDir = path.join(testDir, 'cache');
  let imageProcessor;
  let cacheManager;

  beforeAll(async () => {
    // 确保测试目录存在
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(cacheDir, { recursive: true });

    // 初始化处理器和缓存
    imageProcessor = new ImageProcessor({
      tempDir: testDir,
      cacheMaxAge: 3600000, // 1小时
      cacheMaxSize: 10 * 1024 * 1024 // 10MB
    });
    await imageProcessor.init();

    cacheManager = new CacheManager({
      cacheDir: cacheDir
    });
    await cacheManager.init();
  });

  afterAll(async () => {
    // 清理测试目录
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('Should cache processed images', async () => {
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    
    // 第一次处理
    const result1 = await imageProcessor.processBase64Image(testImage);
    expect(result1.buffer).toBeTruthy();
    
    // 验证缓存文件创建
    const cacheKey = cacheManager.generateKey(testImage);
    const cacheExists = await fs.access(path.join(cacheDir, cacheKey))
      .then(() => true)
      .catch(() => false);
    expect(cacheExists).toBe(true);

    // 第二次处理应该使用缓存
    const result2 = await imageProcessor.processBase64Image(testImage);
    expect(result2.buffer).toBeTruthy();
    expect(result2.buffer.equals(result1.buffer)).toBe(true);
  }, 10000);

  test('Should handle parallel image processing', async () => {
    const generator = new DocxGenerator({
      images: {
        tempDir: testDir
      }
    });
    await generator.init();

    const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    
    const images = Array(5).fill().map((_, i) => ({
      src: base64Image,
      alt: `Test Image ${i}`,
      title: `Image ${i}`
    }));

    images.forEach(image => generator.addImageToQueue(image));
    await generator.processImageQueue();

    const children = generator.children;
    expect(children.length).toBeGreaterThan(0);
  }, 15000);

  test('Should enforce cache size limits', async () => {
    const sizeLimitCache = new CacheManager({
      cacheDir: path.join(testDir, 'size-test-cache'),
      maxSize: 1024 // 1KB
    });
    await sizeLimitCache.init();

    const largeData = Buffer.alloc(2048); // 2KB
    await sizeLimitCache.set('test1', largeData);
    
    const stats = sizeLimitCache.getStats();
    expect(stats.totalSize).toBeLessThanOrEqual(sizeLimitCache.options.maxSize);
  });

  test('Should handle image processing errors gracefully', async () => {
    console.log('Starting error handling test...');
    const generator = new DocxGenerator({
      images: {
        tempDir: testDir
      }
    });
    await generator.init();

    // 添加一个无效的图片数据
    const invalidImage = {
      src: 'invalid-image-data',
      alt: 'Invalid Image',
      title: 'Should Handle Error'
    };
    generator.addImageToQueue(invalidImage);
    await generator.processImageQueue();

    // 验证输出结构
    console.log('Document structure:');
    console.log('Number of children:', generator.children.length);
    
    // 深入检查文档结构
    const errorParagraphs = generator.children.filter(child => {
      if (!child || !child.children || !Array.isArray(child.children)) return false;
      return child.children.some(run => {
        if (!run || !run.options) return false;
        return (
          run.options.text === `[Failed to load image: Invalid Image]` &&
          run.options.color === 'FF0000' &&
          run.options.bold === true
        );
      });
    });

    expect(errorParagraphs.length).toBe(1);
    expect(errorParagraphs[0].children.length).toBe(1);
    expect(errorParagraphs[0].children[0].options).toMatchObject({
      text: '[Failed to load image: Invalid Image]',
      color: 'FF0000',
      bold: true
    });
  }, 10000);
});
