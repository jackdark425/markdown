const axios = require('axios');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const CacheManager = require('./cacheManager');

class ImageProcessor {
  constructor(options = {}) {
    this.options = {
      maxWidth: options.maxWidth || 1500,
      quality: options.quality || 80,
      tempDir: options.tempDir || path.join(process.cwd(), 'temp'),
      cache: options.cache !== false,
      ...options
    };

    this.cacheManager = new CacheManager({
      cacheDir: path.join(this.options.tempDir, 'cache'),
      maxAge: options.cacheMaxAge || 7 * 24 * 60 * 60 * 1000, // 默认7天
      maxSize: options.cacheMaxSize || 500 * 1024 * 1024 // 默认500MB
    });
  }

  /**
   * 初始化处理器
   */
  async init() {
    // 确保临时目录存在
    await this.ensureTempDir();
    // 初始化缓存管理器
    await this.cacheManager.init();
  }

  /**
   * 从缓存获取或处理图片
   * @param {string} source 图片源
   * @param {Buffer} data 图片数据
   * @returns {Promise<{buffer: Buffer, metadata: Object}>} 处理后的图片数据
   */
  async getOrProcessImage(source, data) {
    const cacheKey = this.cacheManager.generateKey(source);
    
    // 尝试从缓存获取
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      console.log('Using cached image for:', source);
      const metadata = await sharp(cachedData).metadata();
      return { buffer: cachedData, metadata };
    }

    // 处理图片
    const processed = await this.processBuffer(data);
    
    // 保存到缓存
    await this.cacheManager.set(cacheKey, processed.buffer, {
      width: processed.metadata.width,
      height: processed.metadata.height,
      format: processed.metadata.format
    });

    return processed;
  }

  /**
   * 确保临时目录存在
   */
  async ensureTempDir() {
    try {
      await fs.access(this.options.tempDir);
    } catch {
      await fs.mkdir(this.options.tempDir, { recursive: true });
    }
  }

  /**
   * 处理URL图片
   * @param {string} url 图片URL
   * @returns {Promise<{buffer: Buffer, metadata: Object}>} 处理后的图片数据和元信息
   */
  /**
   * 下载图片，带重试机制
   * @param {string} url 图片URL
   * @param {number} retries 重试次数
   * @returns {Promise<Buffer>} 图片数据
   */
  async downloadImage(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          maxRedirects: 5
        });
        
        if (response.status === 200) {
          return response.data;
        }
      } catch (error) {
        console.warn(`Attempt ${i + 1} failed:`, error.message);
        if (i === retries - 1) {
          throw new Error(`Failed to download image after ${retries} attempts: ${error.message}`);
        }
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  /**
   * 处理URL图片
   * @param {string} url 图片URL
   * @returns {Promise<{buffer: Buffer, metadata: Object}>} 处理后的图片数据和元信息
   */
  async processUrlImage(url) {
    try {
      const imageData = await this.downloadImage(url);
      return this.getOrProcessImage(url, imageData);
    } catch (error) {
      throw new Error(`Failed to process URL image: ${error.message}`);
    }
  }

  /**
   * 处理Base64图片
   * @param {string} base64Data Base64编码的图片数据
   * @returns {Promise<{buffer: Buffer, metadata: Object}>} 处理后的图片数据和元信息
   */
  async processBase64Image(base64Data) {
    try {
      // 修复可能的 base64 字符串格式问题
      const normalizedData = base64Data.replace(/\s/g, '');
      const matches = normalizedData.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      
      if (!matches) {
        throw new Error('Invalid Base64 image format');
      }

      const imageData = matches[2];
      const buffer = Buffer.from(imageData, 'base64');
      
      return this.getOrProcessImage(normalizedData, buffer);
    } catch (error) {
      throw new Error(`Failed to process Base64 image: ${error.message}`);
    }
  }

  /**
   * 处理本地图片
   * @param {string} filePath 图片文件路径
   * @returns {Promise<{buffer: Buffer, metadata: Object}>} 处理后的图片数据和元信息
   */
  async processLocalImage(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      return this.getOrProcessImage(filePath, buffer);
    } catch (error) {
      throw new Error(`Failed to read local image: ${error.message}`);
    }
  }

  /**
   * 处理图片Buffer
   * @param {Buffer} buffer 图片buffer
   * @returns {Promise<{buffer: Buffer, metadata: Object}>} 处理后的图片数据和元信息
   */
  async processBuffer(buffer) {
    try {
      let image = sharp(buffer);
      const metadata = await image.metadata();

      // 调整图片大小（如果需要）
      if (metadata.width > this.options.maxWidth) {
        image = image.resize(this.options.maxWidth, null, {
          withoutEnlargement: true,
          fit: 'inside'
        });
      }

      // 根据原始格式优化图片
      switch (metadata.format) {
        case 'jpeg':
        case 'jpg':
          image = image.jpeg({ quality: this.options.quality });
          break;
        case 'png':
          image = image.png({ quality: this.options.quality });
          break;
        case 'webp':
          image = image.webp({ quality: this.options.quality });
          break;
        default:
          // 默认转换为JPEG
          image = image.jpeg({ quality: this.options.quality });
      }

      const processedBuffer = await image.toBuffer();
      const processedMetadata = await sharp(processedBuffer).metadata();

      return {
        buffer: processedBuffer,
        metadata: processedMetadata
      };
    } catch (error) {
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * 保存处理后的图片到临时文件
   * @param {Buffer} buffer 图片buffer
   * @param {string} extension 文件扩展名
   * @returns {Promise<string>} 临时文件路径
   */
  async saveTempImage(buffer, extension) {
    await this.ensureTempDir();
    const tempFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}${extension}`;
    const tempFilePath = path.join(this.options.tempDir, tempFilename);
    
    await fs.writeFile(tempFilePath, buffer);
    return tempFilePath;
  }

  /**
   * 清理临时文件
   * @param {string} filePath 文件路径
   */
  async cleanup(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to cleanup temp file: ${error.message}`);
    }
  }
}

module.exports = ImageProcessor;
