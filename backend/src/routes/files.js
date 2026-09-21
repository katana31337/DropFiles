import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config/app.js';
import { getAppConfig } from '../config/settings.js';
import { fileService } from '../services/FileService.js';
import { requireSession } from '../middleware/session.js';
import { validateFile } from '../middleware/validateFile.js';
import { rateLimit } from '../middleware/rateLimit.js';

export const filesRouter = Router();

// Multer с diskStorage
const tempDir = path.join(config.storage.datastorePath, 'temp');
fs.mkdir(tempDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    cb(null, `${uniqueSuffix}_${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024,
    files: 1,
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => `upload:${req.session?.id || req.ip}`,
});

/**
 * POST /api/files/upload
 */
filesRouter.post(
  '/upload',
  requireSession,
  uploadLimiter,
  upload.single('file'),
  validateFile,
  async (req, res) => {
    let tempFilePath = null;

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      tempFilePath = req.file.path;
      const { retentionDays, maxDownloads, password } = req.body;

      // Получаем настройки из БД
      const appConfig = await getAppConfig();

      // Валидация retentionDays
      if (!appConfig.files.retentionDays.includes(parseInt(retentionDays))) {
        return res.status(400).json({ error: 'Invalid retention days' });
      }

      const maxDl = maxDownloads === 'unlimited' ? null : parseInt(maxDownloads);
      if (maxDl !== null && !appConfig.files.maxDownloadsOptions.includes(maxDl)) {
        return res.status(400).json({ error: 'Invalid max downloads' });
      }

      // Читаем файл из temp
      const fileBuffer = await fs.readFile(tempFilePath);
      const file = {
        buffer: fileBuffer,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      };

      // Используем сервис
      const result = await fileService.upload(file, {
        retentionDays,
        maxDownloads,
        password,
      }, req.session.id);

      // Удаляем temp файл
      await fs.unlink(tempFilePath).catch(() => {});
      tempFilePath = null;

      res.json({
        id: result.id,
        shortLink: result.short_link,
        name: result.original_name,
        size: result.file_size,
        downloadUrl: `/download/${result.short_link}`,
        expiresAt: result.expires_at,
        maxDownloads: result.max_downloads,
        hasPassword: !!password,
      });
    } catch (error) {
      if (tempFilePath) {
        await fs.unlink(tempFilePath).catch(() => {});
      }
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

/**
 * GET /api/files/:shortLink/info
 */
filesRouter.get('/:shortLink/info', async (req, res) => {
  try {
    const info = await fileService.getFileInfo(req.params.shortLink);
    res.json(info);
  } catch (error) {
    if (error.message === 'File not found') {
      return res.status(404).json({ error: 'File not found' });
    }
    console.error('File info error:', error);
    res.status(500).json({ error: 'Failed to get file info' });
  }
});

/**
 * POST /api/files/:shortLink/verify-password
 */
filesRouter.post('/:shortLink/verify-password', async (req, res) => {
  try {
    const isValid = await fileService.verifyPassword(req.params.shortLink, req.body.password);
    res.json({ valid: isValid });
  } catch (error) {
    if (error.message === 'File not found') {
      return res.status(404).json({ error: 'File not found' });
    }
    console.error('Password verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * GET /api/files/:shortLink/download
 */
filesRouter.get('/:shortLink/download', async (req, res) => {
  try {
    const { file, stream } = await fileService.download(req.params.shortLink);

    if (stream) {
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
      res.setHeader('Content-Length', file.file_size);
      stream.pipe(res);
    } else {
      const buffer = await getStorage().get(file.storage_path);
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
      res.send(buffer);
    }
  } catch (error) {
    if (error.message === 'File not found') {
      return res.status(404).json({ error: 'File not found' });
    }
    if (error.message === 'File expired') {
      return res.status(410).json({ error: 'File expired' });
    }
    if (error.message === 'Download limit reached') {
      return res.status(410).json({ error: 'Download limit reached' });
    }
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

/**
 * GET /api/files/history
 */
filesRouter.get('/history', requireSession, async (req, res) => {
  try {
    const files = await fileService.getSessionHistory(req.session.id);
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
  try {
    await fileService.delete(req.params.id, req.session.id);
    res.json({ success: true });
  } catch (error) {
    if (error.message === 'File not found or access denied') {
      return res.status(404).json({ error: error.message });
    }
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});
