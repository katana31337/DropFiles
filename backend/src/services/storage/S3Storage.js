import { StorageInterface } from './StorageInterface.js';

/**
 * S3-совместимое хранилище (заглушка для будущего расширения).
 * 
 * Поддерживает: AWS S3, MinIO, Wasabi, DigitalOcean Spaces, etc.
 * 
 * Для активации:
 * 1. Установить: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 * 2. Установить STORAGE_TYPE=s3 в .env
 * 3. Настроить S3_* переменные окружения
 */
export class S3Storage extends StorageInterface {
  constructor(config) {
    super();
    this.bucket = config.bucket || process.env.S3_BUCKET;
    this.region = config.region || process.env.S3_REGION || 'us-east-1';
    this.endpoint = config.endpoint || process.env.S3_ENDPOINT;
    this.accessKeyId = config.accessKeyId || process.env.S3_ACCESS_KEY;
    this.secretAccessKey = config.secretAccessKey || process.env.S3_SECRET_KEY;
    
    // TODO: Инициализация S3 Client
    // this.client = new S3Client({ ... });
    
    console.warn('S3Storage: Not yet implemented. Using as placeholder.');
  }

  async save(buffer, filename, mimeType) {
    // TODO: Реализация через S3Client.putObject
    throw new Error('S3Storage.save() not implemented yet');
  }

  async get(storagePath) {
    // TODO: Реализация через S3Client.getObject
    throw new Error('S3Storage.get() not implemented yet');
  }

  async remove(storagePath) {
    // TODO: Реализация через S3Client.deleteObject
    throw new Error('S3Storage.remove() not implemented yet');
  }

  async exists(storagePath) {
    // TODO: Реализация через S3Client.headObject
    throw new Error('S3Storage.exists() not implemented yet');
  }

  async getSignedUrl(storagePath, expiresIn = 3600) {
    // TODO: Реализация через getSignedUrl из @aws-sdk/s3-request-presigner
    throw new Error('S3Storage.getSignedUrl() not implemented yet');
  }
}
