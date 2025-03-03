import { StorageOptions } from '../types';
import { nanoid } from 'nanoid';

export class StorageManager {
  private bucket: R2Bucket;
  private expirySeconds: number;

  constructor(options: StorageOptions) {
    this.bucket = options.bucket;
    this.expirySeconds = options.expirySeconds;
  }

  /**
   * 生成唯一的文件名
   * @param originalName 原始文件名
   * @returns 
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const uniqueId = nanoid(8);
    const ext = '.docx';
    return `${timestamp}-${uniqueId}${ext}`;
  }

  /**
   * 上传文件到 R2 存储
   * @param content 文件内容
   * @param originalName 原始文件名
   */
  async uploadFile(content: ArrayBuffer, originalName: string) {
    const fileName = this.generateFileName(originalName);
    
    await this.bucket.put(fileName, content, {
      httpMetadata: {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        cacheControl: `public, max-age=${this.expirySeconds}`
      }
    });

    const expiresAt = new Date(Date.now() + this.expirySeconds * 1000);

    return {
      url: `/download/${fileName}`, // 相对路径，实际使用时会被 Worker 处理
      filename: fileName,
      expiresAt: expiresAt.toISOString()
    };
  }

  /**
   * 获取文件
   * @param fileName 文件名
   */
  async getFile(fileName: string) {
    const object = await this.bucket.get(fileName);
    
    if (!object) {
      return null;
    }

    return object;
  }

  /**
   * 检查文件是否存在
   * @param fileName 文件名
   */
  async exists(fileName: string): Promise<boolean> {
    const object = await this.bucket.head(fileName);
    return object !== null;
  }

  /**
   * 删除文件
   * @param fileName 文件名
   */
  async deleteFile(fileName: string) {
    await this.bucket.delete(fileName);
  }

  /**
   * 清理过期文件
   */
  async cleanupExpiredFiles() {
    const objects = await this.bucket.list();
    const now = Date.now();

    for (const object of objects.objects) {
      const uploadTime = new Date(object.uploaded).getTime();
      if (now - uploadTime > this.expirySeconds * 1000) {
        await this.deleteFile(object.key);
      }
    }
  }
}
