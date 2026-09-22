import crypto from 'crypto';

/**
 * Генерация короткой ссылки для файла.
 * Формат: 8 символов, URL-safe (a-z, A-Z, 0-9, -, _)
 */
export function generateShortLink(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Генерация уникального имени файла для хранения.
 * Формат: {timestamp}_{random}_{originalName}
 */
export function generateStorageFilename(originalName) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  
  return `${timestamp}_${random}_${safeName}`;
}
