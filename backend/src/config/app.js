/**
 * Централизованная конфигурация приложения.
 * Все "магические числа" и настройки собраны здесь.
 */

export const config = {
  // Файлы
  files: {
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '100'),
    allowedMimeTypes: [
      // Изображения
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Документы
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript',
      'application/json', 'application/xml',
      // Архивы
      'application/zip', 'application/x-rar-compressed', 'application/gzip',
      'application/x-7z-compressed', 'application/x-tar',
      // Аудио/Видео
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'video/mp4', 'video/webm', 'video/ogg',
      // Прочее
      'application/octet-stream', // разрешаем бинарные файлы
    ],
    // Запрещённые расширения (даже если MIME проходит)
    blockedExtensions: ['.exe', '.bat', '.cmd', '.scr', '.msi', '.dll', '.com'],
    retentionDays: [1, 3, 5, 7, 20, 30],
    maxDownloadsOptions: [1, 2, 5, 7, null], // null = unlimited
  },

  // Сессии
  session: {
    durationDays: parseInt(process.env.SESSION_DURATION_DAYS || '7'),
    cookieName: 'filedrop_session',
  },

  // Хранилище
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    datastorePath: process.env.DATASTORE_PATH || './datastore',
  },

  // Сервер
  server: {
    port: parseInt(process.env.PORT || '3001'),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  // Rate limiting
  rateLimit: {
    uploadWindowMs: 60 * 1000, // 1 минута
    uploadMaxRequests: 5,      // 5 загрузок в минуту
    apiWindowMs: 60 * 1000,
    apiMaxRequests: 60,        // 60 запросов в минуту
  },

  // Cron
  cleanup: {
    intervalMinutes: 15,
  },
};
