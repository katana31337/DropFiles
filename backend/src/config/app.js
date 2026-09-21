/**
 * Статическая конфигурация приложения.
 * Только инфраструктурные настройки (порт, БД, хранилище).
 * Бизнес-настройки (лимиты, сроки) хранятся в PostgreSQL и читаются через settings.js
 */

export const config = {
  // Сервер
  server: {
    port: parseInt(process.env.PORT || '3001'),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  // Хранилище
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    datastorePath: process.env.DATASTORE_PATH || './datastore',
  },

  // Сессии (только имя cookie)
  session: {
    cookieName: 'filedrop_session',
  },

  // Безопасность файлов
  files: {
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
  },
};
