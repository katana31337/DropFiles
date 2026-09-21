import { Router } from 'express';
import multer from 'multer';
import pool from '../config/database.js';
import { config } from '../config/app.js';
import { getStorage } from '../services/storage/index.js';
import { generateShortLink, generateStorageFilename } from '../utils/shortLink.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';
import { requireSession } from '../middleware/session.js';
import { validateFile } from '../middleware/validateFile.js';
import { rateLimit } from '../middleware/rateLimit.js';

export const filesRouter = Router();

// Multer — используем disk storage для больших файлов (не забиваем RAM)
const upload = multer({
  storage: multer.memoryStorage(), // TODO: заменить на diskStorage для файлов > 10MB
  limits: {
    fileSize: config.files.maxFileSizeMB * 1024 * 1024,
    files: 1,
  },
});

// Rate limiting для загрузки
const uploadLimiter = rateLimit({
  windowMs: config.rateLimit.uploadWindowMs,
  max: config.rateLimit.uploadMaxRequests,
  keyGenerator: (req) => `upload:${req.session?.id || req.ip}`,
});

/**
 * POST /api/files/upload
 * Загрузка файла с транзакцией (откат при ошибке)
 */
filesRouter.post(
  '/upload',
  requireSession,
  uploadLimiter,
  upload.single('file'),
  validateFile,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { retentionDays, maxDownloads, password } = req.body;

      // Валидация параметров
      if (!config.files.retentionDays.includes(parseInt(retentionDays))) {
        return res.status(400).json({ error: 'Invalid retention days' });
      }

      const maxDl = maxDownloads === 'unlimited' ? null : parseInt(maxDownloads);
      if (maxDl !== null && !config.files.maxDownloadsOptions.includes(maxDl)) {
        return res.status(400).json({ error: 'Invalid max downloads' });
      }

      // === НАЧИНАЕМ ТРАНЗАКЦИЮ ===
      await client.query('BEGIN');

      // Генерируем уникальную короткую ссылку
      const shortLink = await generateUniqueShortLink(client);

      // Сохраняем файл в хранилище
      const storage = getStorage();
      const storageFilename = generateStorageFilename(req.file.originalname);
      const storagePath = await storage.save(
        req.file.buffer,
        storageFilename,
        req.file.mimetype
      );

      try {
        // Хэшируем пароль если есть
        const passwordHash = password ? await hashPassword(password) : null;

        // Вычисляем срок хранения
        const days = parseInt(retentionDays);
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        // Сохраняем метаданные в БД
        const result = await client.query(
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

        // === КОММИТИМ ТРАНЗАКЦИЮ ===
        await client.query('COMMIT');

        const file = result.rows[0];

        res.json({
          id: file.id,
          shortLink: file.short_link,
          name: file.original_name,
          size: file.file_size,
          downloadUrl: `/download/${file.short_link}`,
          expiresAt: file.expires_at,
          maxDownloads: file.max_downloads,
          hasPassword: !!password,
        });
      } catch (dbError) {
        // Если БД упала — удаляем уже сохранённый файл
        await storage.remove(storagePath).catch(() => {});
        throw dbError;
      }
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    } finally {
      client.release();
    }
  }
);

/**
 * Генерация уникальной короткой ссылки (с retry)
 */
async function generateUniqueShortLink(client, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const shortLink = generateShortLink();
    const existing = await client.query(
      'SELECT id FROM files WHERE short_link = $1',
      [shortLink]
    );
    if (existing.rows.length === 0) {
      return shortLink;
    }
  }
  throw new Error('Failed to generate unique short link after retries');
}

/**
 * GET /api/files/:shortLink/info
 */
filesRouter.get('/:shortLink/info', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, original_name, file_size, mime_type, short_link, 
              password_hash, max_downloads, download_count, 
              expires_at, status, created_at
       FROM files WHERE short_link = $1`,
      [req.params.shortLink]
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
 */
filesRouter.post('/:shortLink/verify-password', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT password_hash FROM files WHERE short_link = $1',
      [req.params.shortLink]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    if (!file.password_hash) {
      return res.json({ valid: true });
    }

    const isValid = await verifyPassword(req.body.password, file.password_hash);
    res.json({ valid: isValid });
  } catch (error) {
    console.error('Password verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * GET /api/files/:shortLink/download
 */
filesRouter.get('/:shortLink/download', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT id, original_name, storage_path, file_size, mime_type,
              password_hash, max_downloads, download_count, expires_at, status
       FROM files WHERE short_link = $1
       FOR UPDATE`, // Блокируем строку для атомарного обновления счётчика
      [req.params.shortLink]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    if (new Date(file.expires_at) < new Date()) {
      return res.status(410).json({ error: 'File expired' });
    }

    if (file.max_downloads !== null && file.download_count >= file.max_downloads) {
      return res.status(410).json({ error: 'Download limit reached' });
    }

    // Атомарное увеличение счётчика
    await client.query(
      'UPDATE files SET download_count = download_count + 1 WHERE id = $1',
      [file.id]
    );

    await client.query('COMMIT');

    // Отдаём файл
    const storage = getStorage();
    
    if (storage.getStream) {
      const stream = await storage.getStream(file.storage_path);
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
      res.setHeader('Content-Length', file.file_size);
      stream.pipe(res);
    } else {
      const buffer = await storage.get(file.storage_path);
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
      res.send(buffer);
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/files/history
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
 */
filesRouter.delete('/:id', requireSession, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'SELECT storage_path FROM files WHERE id = $1 AND session_id = $2 FOR UPDATE',
      [req.params.id, req.session.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'File not found or access denied' });
    }

    const file = result.rows[0];

    // Удаляем из хранилища
    const storage = getStorage();
    await storage.remove(file.storage_path);

    // Удаляем из БД
    await client.query('DELETE FROM files WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  } finally {
    client.release();
  }
});
