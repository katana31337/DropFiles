# Code Review: FileDrop

## ✅ Реализованные улучшения

### 1. Транзакции PostgreSQL
**Проблема:** Если запись в БД упадёт после сохранения файла, получим "orphan" файлы в `/datastore`.

**Решение:** Все операции с файлами обёрнуты в транзакции с `BEGIN/COMMIT/ROLLBACK`. При ошибке файл удаляется из хранилища.

```javascript
await client.query('BEGIN');
// ... операции ...
await client.query('COMMIT');
// или при ошибке:
await client.query('ROLLBACK');
```

### 2. Валидация файлов
**Проблема:** Можно загрузить `.exe` замаскированный под `.jpg`.

**Решение:** Middleware `validateFile.js` проверяет:
- Размер файла (из конфига)
- MIME тип (белый список)
- Расширение (чёрный список опасных)

### 3. Rate Limiting
**Проблема:** Можно спамить загрузками и исчерпать ресурсы сервера.

**Решение:** In-memory rate limiter:
- 5 загрузок в минуту на сессию
- 60 API запросов в минуту на IP
- Заголовки `X-RateLimit-*` для клиентов

### 4. Централизованная конфигурация
**Проблема:** Магические числа (100 MB, 7 дней) разбросаны по коду.

**Решение:** `config/app.js` собирает все настройки в одном месте.

### 5. Прогресс-бар загрузки
**Проблема:** Пользователь не видит прогресс загрузки больших файлов.

**Решение:** Анимированный прогресс-бар на кнопке загрузки (пока симуляция, нужен XMLHttpRequest с `onprogress`).

### 6. Атомарное обновление счётчика
**Проблема:** При одновременных скачиваниях счётчик может обновляться некорректно.

**Решение:** `SELECT ... FOR UPDATE` блокирует строку до конца транзакции.

---

## 🔴 Критичные проблемы (нужно решить)

### 1. Multer хранит файлы в RAM
**Проблема:** При загрузке 100MB файла сервер съедает 100MB RAM. При 10 параллельных загрузках — 1GB.

**Решение:** Заменить на `diskStorage`:
```javascript
const upload = multer({
  storage: multer.diskStorage({
    destination: './datastore/temp',
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}_${file.originalname}`);
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 }
});
```

Потом перемещать файл в нужную папку через `fs.rename()`.

### 2. Нет реального прогресса загрузки
**Проблема:** Сейчас прогресс-бар — это симуляция.

**Решение:** Использовать `XMLHttpRequest` вместо `fetch`:
```javascript
const xhr = new XMLHttpRequest();
xhr.upload.onprogress = (e) => {
  const percent = (e.loaded / e.total) * 100;
  setUploadProgress(percent);
};
xhr.open('POST', '/api/files/upload');
xhr.send(formData);
```

### 3. Cron дублируется при нескольких инстансах
**Проблема:** Если запустить 2 копии сервера, cron будет работать дважды.

**Решение:** Использовать PostgreSQL advisory lock:
```javascript
const { rows } = await client.query(
  'SELECT pg_try_advisory_lock(12345) as acquired'
);
if (rows[0].acquired) {
  // Запускаем cron
}
```

Или вынести cron в отдельный процесс/сервис.

---

## 🟡 Важные улучшения

### 4. Нет кэширования настроек
**Проблема:** Каждый запрос читает настройки из БД.

**Решение:** Кэшировать в памяти с TTL:
```javascript
let settingsCache = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 минута

async function getSettings() {
  if (Date.now() - cacheTime < CACHE_TTL && settingsCache) {
    return settingsCache;
  }
  const result = await pool.query('SELECT key, value FROM settings');
  settingsCache = result.rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
  cacheTime = Date.now();
  return settingsCache;
}
```

### 5. Нет логирования
**Проблема:** `console.log` — это не логирование для продакшена.

**Решение:** Использовать `winston` или `pino`:
```javascript
import pino from 'pino';
const logger = pino({ level: 'info' });

logger.info({ sessionId: req.session.id }, 'File uploaded');
logger.error({ error: err.message }, 'Upload failed');
```

### 6. Нет обработки ошибок на фронтенде
**Проблема:** Если API вернёт ошибку, пользователь увидит только "Upload failed".

**Решение:** Показывать конкретные сообщения:
```typescript
const response = await fetch('/api/files/upload', { ... });
if (response.status === 413) {
  setError('Файл слишком большой');
} else if (response.status === 415) {
  setError('Тип файла не поддерживается');
} else if (response.status === 429) {
  setError('Слишком много загрузок. Подождите минуту');
}
```

### 7. Нет валидации на клиенте
**Проблема:** Пользователь может выбрать недопустимые параметры.

**Решение:** Валидировать перед отправкой:
```typescript
if (!config.files.retentionDays.includes(retentionDays)) {
  setError('Недопустимый срок хранения');
  return;
}
```

---

## 🟢 Улучшения для продакшена

### 8. HTTPS обязательно
**Проблема:** Cookie передаются в открытом виде.

**Решение:** Настроить HTTPS в nginx:
```nginx
server {
  listen 443 ssl;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  location /api/ {
    proxy_pass http://localhost:3001;
  }
}
```

### 9. Database connection pooling
**Проблема:** Сейчас pool на 20 соединений, но нет мониторинга.

**Решение:** Добавить метрики:
```javascript
pool.on('connect', () => {
  metrics.increment('db.connections.active');
});
pool.on('remove', () => {
  metrics.decrement('db.connections.active');
});
```

### 10. Graceful shutdown
**Проблема:** При остановке сервера активные загрузки обрываются.

**Решение:** Обрабатывать SIGTERM:
```javascript
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    await pool.end();
    process.exit(0);
  });
});
```

### 11. Health check для БД
**Проблема:** Если PostgreSQL упал, сервер продолжает принимать запросы.

**Решение:** Проверять БД в health endpoint:
```javascript
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});
```

### 12. Docker контейнеризация
**Решение:** Создать `docker-compose.yml` (использовать `docker compose` для запуска):
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DB_HOST=postgres
    depends_on:
      - postgres
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: filedrop
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## 📊 Метрики и мониторинг

Добавить Prometheus метрики:
- Количество загрузок/скачиваний
- Размер загруженных файлов
- Время ответа API
- Количество активных сессий
- Размер хранилища

---

## 🎯 Приоритеты

**P0 (критично):**
1. Multer diskStorage (RAM проблема)
2. Реальный прогресс загрузки
3. HTTPS

**P1 (важно):**
4. Логирование
5. Обработка ошибок на фронтенде
6. Кэширование настроек

**P2 (желательно):**
7. Docker
8. Метрики
9. Graceful shutdown

**P3 (опционально):**
10. Rate limiting на Redis
11. CDN для файлов
12. S3 реализация
