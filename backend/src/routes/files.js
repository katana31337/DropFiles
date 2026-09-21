import { Router } from 'express';
import multer from 'multer';
import pool from '../config/database.js';
import { getStorage } from '../services/storage/index.js';
import { generateShortLink, generateStorageFilename } from '../utils/shortLink.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';
import { requireSession } from '../middleware/session.js';

export const filesRouter = Router();

// Multer для обработки загрузки (в память, потом передаём в хранилище)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB (берётся из settings в БД)
  },
});

/**
 * POST /api/files/upload
 * Загрузка файла
 */
filesRouter.post('/upload', requireSession, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { retentionDays, maxDownloads, password } = req.body;

    // Валидация
    const validRetention = [1, 3, 5, 7, 20, 30];
    const validDownloads = [1, 2, 5, 7, null]; // null = unlimited

    if (!validRetention.includes(parseInt(retentionDays))) {
      return res.status(400).json({ error: 'Invalid retention days' });
    }

    const maxDl = maxDownloads === 'unlimited' ? null : parseInt(maxDownloads);
    if (maxDl !== null && !validDownloads.includes(maxDl)) {
      return res.status(400).json({ error: 'Invalid max downloads' });
    }

    // Генерируем короткую ссылку (проверяем уникальность)
    let shortLink;
    let isUnique = false;
    while (!isUnique) {
      shortLink = generateShortLink();
      const existing = await pool.query(
        'SELECT id FROM files WHERE short_link = $1',
        [shortLink]
      );
      isUnique = existing.rows.length === 0;
    }

    // Сохраняем файл в хранилище
    const storage = getStorage();
    const storageFilename = generateStorageFilename(req.file.originalname);
    const storagePath = await storage.save(
      req.file.buffer,
      storageFilename,
      req.file.mimetype
    );

    // Хэшируем пароль если есть
    const passwordHash = password ? await hashPassword(password) : null;

    // Вычисляем срок хранения
    const days = parseInt(retentionDays);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Сохраняем метаданные в БД
    const result = await pool.query(
      `INSERT INTO files (
        session_id, original_name, storage_path, file_size, mime_type,
        short_link, password_hash, max_downloads, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, short_link, original_name, file_size, expires_at, max_downloads, download_count, status`,
      [
        req.session.id,
        req.file.originalname,
        storagePath,
        req.file.size,
        req.file.mimetype,
        shortLink,
        passwordHash,
        maxDl,
        expiresAt,
      ]
    );

    const file = result.rows[0];

    res.json({
      id: file.id,
      shortLink: file.short_link,
      name: file.original_name,
      size: file.size,
      downloadUrl: `/download/${file.short_link}`,
      expiresAt: file.expires_at,
      maxDownloads: file.max_downloads,
      hasPassword: !!password,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

/**
 * GET /api/files/:shortLink/info
 * Получить информацию о файле (без скачивания)
 */
filesRouter.get('/:shortLink/info', async (req, res) => {
  try {
    const { shortLink } = req.params;

    const result = await pool.query(
      `SELECT id, original_name, file_size, mime_type, short_link, 
              password_hash, max_downloads, download_count, 
              expires_at, status, created_at
       FROM files WHERE short_link = $1`,
      [shortLink]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];
    const isExpired = new Date(file.expires_at) < new Date();
    const maxReached = file.max_downloads !== null && file.download_count >= file.max_downloads;

    res.json({
      name: file.original_name,
      size: file.file_size,
      mimeType: file.mime_type,
      hasPassword: !!file.password_hash,
      maxDownloads: file.max_downloads,
      downloadCount: file.download_count,
      expiresAt: file.expires_at,
      status: isExpired ? 'expired' : maxReached ? 'max_downloads_reached' : file.status,
      createdAt: file.created_at,
    });
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({ error: 'Failed to get file info' });
  }
});

/**
 * POST /api/files/:shortLink/verify-password
 * Проверка пароля для файла
 */
filesRouter.post('/:shortLink/verify-password', async (req, res) => {
  try {
    const { shortLink } = req.params;
    const { password } = req.body;

    const result = await pool.query(
      'SELECT password_hash FROM files WHERE short_link = $1',
      [shortLink]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    if (!file.password_hash) {
      return res.json({ valid: true }); // Файл без пароля
    }

    const isValid = await verifyPassword(password, file.password_hash);
    res.json({ valid: isValid });
  } catch (error) {
    console.error('Password verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * GET /api/files/:shortLink/download
 * Скачивание файла
 */
filesRouter.get('/:shortLink/download', async (req, res) => {
  try {
    const { shortLink } = req.params;

    const result = await pool.query(
      `SELECT id, original_name, storage_path, file_size, mime_type,
              password_hash, max_downloads, download_count, expires_at, status
       FROM files WHERE short_link = $1`,
      [shortLink]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    // Проверка срока
    if (new Date(file.expires_at) < new Date()) {
      return res.status(410).json({ error: 'File expired' });
    }

    // Проверка лимита скачиваний
    if (file.max_downloads !== null && file.download_count >= file.max_downloads) {
      return res.status(410).json({ error: 'Download limit reached' });
    }

    // Увеличиваем счётчик скачиваний
    await pool.query(
      'UPDATE files SET download_count = download_count + 1 WHERE id = $1',
      [file.id]
    );

    // Отдаём файл
    const storage = getStorage();
    
    // Если есть метод getStream — используем его (эффективнее для больших файлов)
    if (storage.getStream) {
      const stream = await storage.getStream(file.storage_path);
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
      stream.pipe(res);
    } else {
      const buffer = await storage.get(file.storage_path);
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
      res.send(buffer);
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

/**
 * GET /api/files/history
 * Получить историю файлов текущей сессии
 */
filesRouter.get('/history', requireSession, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, original_name, file_size, mime_type, short_link,
              max_downloads, download_count, expires_at, status, created_at,
              CASE WHEN password_hash IS NOT NULL THEN true ELSE false END as has_password
       FROM files 
       WHERE session_id = $1
       ORDER BY created_at DESC`,
      [req.session.id]
    );

    const files = result.rows.map(file => {
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

    res.json({ files });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

/**
 * DELETE /api/files/:id
 * Удалить файл (только владелец)
 */
filesRouter.delete('/:id', requireSession, async (req, res) => {
  try {
    const { id } = req.params;

    // Проверяем что файл принадлежит текущей сессии
    const result = await pool.query(
      'SELECT storage_path FROM files WHERE id = $1 AND session_id = $2',
      [id, req.session.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }

    const file = result.rows[0];

    // Удаляем из хранилища
    const storage = getStorage();
    await storage.remove(file.storage_path);

    // Удаляем из БД
    await pool.query('DELETE FROM files WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});
