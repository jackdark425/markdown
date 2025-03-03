const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class CacheManager {
  constructor(options = {}) {
    this.options = {
      cacheDir: options.cacheDir || path.join(process.cwd(), '.cache'),
      maxAge: options.maxAge || 24 * 60 * 60 * 1000, // 默认缓存24小时
      maxSize: options.maxSize || 100 * 1024 * 1024, // 默认最大缓存100MB
      ...options
    };
    this.cacheMap = new Map();
  }

  /**
   * 初始化缓存目录
   */
  async init() {
    try {
      await fs.access(this.options.cacheDir);
    } catch {
      await fs.mkdir(this.options.cacheDir, { recursive: true });
    }
    
    // 加载现有缓存信息
    await this.loadCacheIndex();
    
    // 清理过期缓存
    await this.cleanup();
  }

  /**
   * 加载缓存索引
   */
  async loadCacheIndex() {
    try {
      const indexPath = path.join(this.options.cacheDir, 'index.json');
      const data = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(data);
      
      // 转换为Map对象
      this.cacheMap = new Map(Object.entries(index));
    } catch {
      this.cacheMap = new Map();
    }
  }

  /**
   * 保存缓存索引
   */
  async saveCacheIndex() {
    const indexPath = path.join(this.options.cacheDir, 'index.json');
    const index = Object.fromEntries(this.cacheMap);
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * 生成缓存键
   * @param {string} data 需要缓存的数据
   * @returns {string} 缓存键
   */
  generateKey(data) {
    const hash = crypto.createHash('md5');
    hash.update(typeof data === 'string' ? data : JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * 获取缓存
   * @param {string} key 缓存键
   * @returns {Promise<Buffer|null>} 缓存数据
   */
  async get(key) {
    const cacheInfo = this.cacheMap.get(key);
    if (!cacheInfo) return null;

    // 检查是否过期
    if (Date.now() - cacheInfo.timestamp > this.options.maxAge) {
      await this.remove(key);
      return null;
    }

    try {
      const filePath = path.join(this.options.cacheDir, key);
      const data = await fs.readFile(filePath);
      return data;
    } catch {
      await this.remove(key);
      return null;
    }
  }

  /**
   * 设置缓存
   * @param {string} key 缓存键
   * @param {Buffer} data 缓存数据
   * @param {Object} metadata 元数据
   */
  async set(key, data, metadata = {}) {
    try {
      const filePath = path.join(this.options.cacheDir, key);
      await fs.writeFile(filePath, data);
      
      this.cacheMap.set(key, {
        timestamp: Date.now(),
        size: data.length,
        metadata
      });

      await this.saveCacheIndex();
      await this.enforceMaxSize();
    } catch (error) {
      console.warn('Failed to set cache:', error);
    }
  }

  /**
   * 删除缓存
   * @param {string} key 缓存键
   */
  async remove(key) {
    try {
      const filePath = path.join(this.options.cacheDir, key);
      await fs.unlink(filePath);
      this.cacheMap.delete(key);
      await this.saveCacheIndex();
    } catch (error) {
      console.warn('Failed to remove cache:', error);
    }
  }

  /**
   * 清理过期缓存
   */
  async cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, info] of this.cacheMap) {
      if (now - info.timestamp > this.options.maxAge) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.remove(key);
    }
  }

  /**
   * 强制执行最大缓存大小限制
   */
  async enforceMaxSize() {
    let totalSize = 0;
    const cacheItems = [];

    // 计算总大小并创建排序列表
    for (const [key, info] of this.cacheMap) {
      totalSize += info.size;
      cacheItems.push({ key, ...info });
    }

    // 如果超过最大大小，删除最旧的缓存
    if (totalSize > this.options.maxSize) {
      // 按时间戳排序
      cacheItems.sort((a, b) => a.timestamp - b.timestamp);

      while (totalSize > this.options.maxSize && cacheItems.length > 0) {
        const item = cacheItems.shift();
        totalSize -= item.size;
        await this.remove(item.key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    let totalSize = 0;
    let itemCount = 0;

    for (const [_, info] of this.cacheMap) {
      totalSize += info.size;
      itemCount++;
    }

    return {
      totalSize,
      itemCount,
      maxSize: this.options.maxSize,
      maxAge: this.options.maxAge,
      cacheDir: this.options.cacheDir
    };
  }
}

module.exports = CacheManager;
