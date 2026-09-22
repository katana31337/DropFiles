import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { StorageInterface } from './StorageInterface.js';

/**
 * Локальное файловое хранилище.
 * 
 * Структура:
 *   /datastore/
 *     /2024/
 *       /01/
 *         /15/
 *           abc123def456_filename.ext
 * 
 * Файлы организуются по дате загрузки для удобства очистки.
 */
export class LocalStorage extends StorageInterface {
  constructor(basePath) {
    super();
    this.basePath = basePath || process.env.DATASTORE_PATH || './datastore';
    this._ensureBaseDir();
  }

  async _ensureBaseDir() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create datastore directory:', error);
    }
  }

  _generatePath(filename) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const dir = path.join(this.basePath, String(year), month, day);
    const fullPath = path.join(dir, filename);
    
    return { dir, fullPath, relativePath: path.relative(this.basePath, fullPath) };
  }

  async save(buffer, filename, mimeType) {
    const { dir, fullPath, relativePath } = this._generatePath(filename);
    
    // Создаём директорию если не существует
    await fs.mkdir(dir, { recursive: true });
    
    // Записываем файл
    await fs.writeFile(fullPath, buffer);
    
    // Сохраняем метаданные рядом (для быстрого доступа без БД)
    const metaPath = fullPath + '.meta.json';
    await fs.writeFile(metaPath, JSON.stringify({
      mimeType,
      size: buffer.length,
      createdAt: new Date().toISOString(),
    }));
    
    return relativePath;
  }

  async get(storagePath) {
    const fullPath = path.join(this.basePath, storagePath);
    return await fs.readFile(fullPath);
  }

  async getStream(storagePath) {
    const fullPath = path.join(this.basePath, storagePath);
    return createReadStream(fullPath);
  }

  async remove(storagePath) {
    const fullPath = path.join(this.basePath, storagePath);
    const metaPath = fullPath + '.meta.json';
    
    try {
      await fs.unlink(fullPath);
      // Удаляем метаданные если есть
      try { await fs.unlink(metaPath); } catch {}
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  }

  async exists(storagePath) {
    const fullPath = path.join(this.basePath, storagePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(storagePath, expiresIn) {
    // Для локального хранилища возвращаем прямой путь
    // В продакшене файл раздаётся через nginx или express.static
    return `/uploads/${storagePath}`;
  }

  /**
   * Получить размер хранилища (для мониторинга)
   */
  async getStats() {
    let totalSize = 0;
    let fileCount = 0;

    async function walk(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (!entry.name.endsWith('.meta.json')) {
          const stat = await fs.stat(fullPath);
          totalSize += stat.size;
          fileCount++;
        }
      }
    }

    try {
      await walk(this.basePath);
    } catch {}

    return { totalSize, fileCount };
  }
}
