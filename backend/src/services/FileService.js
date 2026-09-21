import pool from '../config/database.js';
import { fileRepository } from '../repositories/FileRepository.js';
import { getStorage } from './storage/index.js';
import { generateShortLink, generateStorageFilename } from '../utils/shortLink.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';

/**
 * FileService — бизнес-логика для работы с файлами.
 * Не знает про HTTP, только про доменную логику.
 */
export class FileService {
  constructor() {
    this.repository = fileRepository;
    this.storage = getStorage();
  }

  /**
   * Загрузить файл
   */
  async upload(file, options, sessionId) {
    const { retentionDays, maxDownloads, password } = options;

    // Вычисляем срок хранения
    const days = parseInt(retentionDays);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Генерируем уникальную короткую ссылку
    const shortLink = await this.generateUniqueShortLink();

    // Сохраняем файл в хранилище
    const storageFilename = generateStorageFilename(file.originalname);
    const storagePath = await this.storage.save(
      file.buffer,
      storageFilename,
      file.mimetype
    );

    try {
      // Хэшируем пароль если есть
      const passwordHash = password ? await hashPassword(password) : null;

      // Сохраняем метаданные в БД
      const fileRecord = await this.repository.create({
        sessionId,
        originalName: file.originalname,
        storagePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        shortLink,
        passwordHash,
        maxDownloads: maxDownloads === 'unlimited' ? null : parseInt(maxDownloads),
        expiresAt,
      });

      return fileRecord;
    } catch (error) {
      // Если БД упала — удаляем файл из хранилища
      await this.storage.remove(storagePath).catch(() => {});
      throw error;
    }
  }

  /**
   * Получить информацию о файле
   */
  async getFileInfo(shortLink) {
    const file = await this.repository.findByShortLink(shortLink);
    if (!file) {
      throw new Error('File not found');
    }

    const isExpired = new Date(file.expires_at) < new Date();
    const maxReached = file.max_downloads !== null && file.download_count >= file.max_downloads;

    return {
      name: file.original_name,
      size: file.file_size,
      mimeType: file.mime_type,
      hasPassword: !!file.password_hash,
      maxDownloads: file.max_downloads,
      downloadCount: file.download_count,
      expiresAt: file.expires_at,
      status: isExpired ? 'expired' : maxReached ? 'max_downloads_reached' : file.status,
      createdAt: file.created_at,
    };
  }

  /**
   * Проверить пароль
   */
  async verifyPassword(shortLink, password) {
    const file = await this.repository.findByShortLink(shortLink);
    if (!file) {
      throw new Error('File not found');
    }

    if (!file.password_hash) {
      return true;
    }

    return await verifyPassword(password, file.password_hash);
  }

  /**
   * Скачать файл
   */
  async download(shortLink) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const file = await this.repository.findByShortLinkForUpdate(shortLink, client);
      if (!file) {
        throw new Error('File not found');
      }

      if (new Date(file.expires_at) < new Date()) {
        throw new Error('File expired');
      }

      if (file.max_downloads !== null && file.download_count >= file.max_downloads) {
        throw new Error('Download limit reached');
      }

      // Увеличиваем счётчик
      await this.repository.incrementDownloadCount(file.id);

      await client.query('COMMIT');

      // Получаем поток из хранилища
      const stream = this.storage.getStream
        ? await this.storage.getStream(file.storage_path)
        : null;

      return {
        file,
        stream,
      };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Получить историю файлов сессии
   */
  async getSessionHistory(sessionId) {
    const files = await this.repository.findBySessionId(sessionId);

    return files.map(file => {
      const isExpired = new Date(file.expires_at) < new Date();
      const maxReached = file.max_downloads !== null && file.download_count >= file.max_downloads;

      return {
        id: file.id,
        name: file.original_name,
        size: file.file_size,
        mimeType: file.mime_type,
        shortLink: file.short_link,
        maxDownloads: file.max_downloads,
        downloadCount: file.download_count,
        expiresAt: file.expires_at,
        status: isExpired ? 'expired' : maxReached ? 'max_downloads_reached' : file.status,
        hasPassword: file.has_password,
        createdAt: file.created_at,
      };
    });
  }

  /**
   * Удалить файл
   */
  async delete(fileId, sessionId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        'SELECT storage_path FROM files WHERE id = $1 AND session_id = $2 FOR UPDATE',
        [fileId, sessionId]
      );

      if (result.rows.length === 0) {
        throw new Error('File not found or access denied');
      }

      const file = result.rows[0];

      // Удаляем из хранилища
      await this.storage.remove(file.storage_path);

      // Удаляем из БД
      await this.repository.delete(fileId);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Генерация уникальной короткой ссылки
   */
  async generateUniqueShortLink(maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
      const shortLink = generateShortLink();
      const isUnique = await this.repository.isShortLinkUnique(shortLink);
      if (isUnique) {
        return shortLink;
      }
    }
    throw new Error('Failed to generate unique short link after retries');
  }

  /**
   * Очистка истёкших файлов
   */
  async cleanupExpired() {
    const expiredFiles = await this.repository.findExpired();
    let removedCount = 0;

    for (const file of expiredFiles) {
      try {
        await this.storage.remove(file.storage_path);
        await this.repository.delete(file.id);
        removedCount++;
      } catch (error) {
        console.error(`Failed to remove file ${file.id}:`, error);
      }
    }

    return removedCount;
  }
}

export const fileService = new FileService();
