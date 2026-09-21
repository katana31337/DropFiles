import pool from '../config/database.js';

/**
 * FileRepository — слой работы с БД для файлов.
 * Отвечает ТОЛЬКО за SQL запросы, без бизнес-логики.
 */
export class FileRepository {
  /**
   * Найти файл по короткой ссылке
   */
  async findByShortLink(shortLink) {
    const result = await pool.query(
      `SELECT id, session_id, original_name, storage_path, file_size, mime_type,
              short_link, password_hash, max_downloads, download_count,
              expires_at, status, created_at
       FROM files WHERE short_link = $1`,
      [shortLink]
    );
    return result.rows[0] || null;
  }

  /**
   * Найти файл по ID
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM files WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Создать файл
   */
  async create(fileData) {
    const result = await pool.query(
      `INSERT INTO files (
        session_id, original_name, storage_path, file_size, mime_type,
        short_link, password_hash, max_downloads, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, short_link, original_name, file_size, expires_at, max_downloads, download_count, status`,
      [
        fileData.sessionId,
        fileData.originalName,
        fileData.storagePath,
        fileData.fileSize,
        fileData.mimeType,
        fileData.shortLink,
        fileData.passwordHash || null,
        fileData.maxDownloads,
        fileData.expiresAt,
      ]
    );
    return result.rows[0];
  }

  /**
   * Увеличить счётчик скачиваний
   */
  async incrementDownloadCount(id) {
    await pool.query(
      'UPDATE files SET download_count = download_count + 1 WHERE id = $1',
      [id]
    );
  }

  /**
   * Удалить файл
   */
  async delete(id) {
    await pool.query('DELETE FROM files WHERE id = $1', [id]);
  }

  /**
   * Найти файлы сессии
   */
  async findBySessionId(sessionId) {
    const result = await pool.query(
      `SELECT id, original_name, file_size, mime_type, short_link,
              max_downloads, download_count, expires_at, status, created_at,
              CASE WHEN password_hash IS NOT NULL THEN true ELSE false END as has_password
       FROM files 
       WHERE session_id = $1
       ORDER BY created_at DESC`,
      [sessionId]
    );
    return result.rows;
  }

  /**
   * Найти файл с блокировкой строки (для атомарных операций)
   */
  async findByShortLinkForUpdate(shortLink, client) {
    const result = await client.query(
      `SELECT id, original_name, storage_path, file_size, mime_type,
              password_hash, max_downloads, download_count, expires_at, status
       FROM files WHERE short_link = $1
       FOR UPDATE`,
      [shortLink]
    );
    return result.rows[0] || null;
  }

  /**
   * Найти истёкшие файлы
   */
  async findExpired() {
    const result = await pool.query(
      `SELECT id, storage_path FROM files 
       WHERE expires_at < NOW() 
       OR (max_downloads IS NOT NULL AND download_count >= max_downloads)`
    );
    return result.rows;
  }

  /**
   * Проверить уникальность короткой ссылки
   */
  async isShortLinkUnique(shortLink, client) {
    const queryClient = client || pool;
    const result = await queryClient.query(
      'SELECT id FROM files WHERE short_link = $1',
      [shortLink]
    );
    return result.rows.length === 0;
  }

  /**
   * Получить все файлы (для админки)
   */
  async findAll(limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT f.id, f.original_name, f.file_size, f.mime_type, f.short_link,
              f.max_downloads, f.download_count, f.expires_at, f.status, f.created_at,
              CASE WHEN f.password_hash IS NOT NULL THEN true ELSE false END as has_password
       FROM files f
       ORDER BY f.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  /**
   * Подсчитать общее количество файлов
   */
  async count() {
    const result = await pool.query('SELECT COUNT(*) FROM files');
    return parseInt(result.rows[0].count);
  }

  /**
   * Подсчитать активные файлы
   */
  async countActive() {
    const result = await pool.query(
      `SELECT COUNT(*) FROM files WHERE expires_at > NOW() AND status = 'active'`
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Получить суммарный размер файлов
   */
  async getTotalSize() {
    const result = await pool.query(
      `SELECT COALESCE(SUM(file_size), 0) as total FROM files`
    );
    return parseInt(result.rows[0].total);
  }

  /**
   * Получить суммарное количество скачиваний
   */
  async getTotalDownloads() {
    const result = await pool.query(
      `SELECT COALESCE(SUM(download_count), 0) as total FROM files`
    );
    return parseInt(result.rows[0].total);
  }
}

// Singleton
export const fileRepository = new FileRepository();
