import { config } from '../config/app.js';
import path from 'path';

/**
 * Middleware для валидации загружаемых файлов.
 * 
 * Проверяет:
 * 1. Размер файла
 * 2. MIME тип
 * 3. Расширение файла
 */
export function validateFile(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const file = req.file;

  // Проверка размера
  const maxSize = config.files.maxFileSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    return res.status(413).json({ 
      error: `File too large. Maximum size: ${config.files.maxFileSizeMB} MB` 
    });
  }

  // Проверка MIME типа
  if (!config.files.allowedMimeTypes.includes(file.mimetype)) {
    return res.status(415).json({ 
      error: `File type not allowed: ${file.mimetype}` 
    });
  }

  // Проверка расширения
  const ext = path.extname(file.originalname).toLowerCase();
  if (config.files.blockedExtensions.includes(ext)) {
    return res.status(415).json({ 
      error: `File extension not allowed: ${ext}` 
    });
  }

  next();
}
