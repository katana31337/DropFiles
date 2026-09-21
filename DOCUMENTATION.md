# FileDrop — Полная документация

## 🎯 Что реализовано

### 1. Анонимный обмен файлами
- Загрузка файлов до 100MB (настраивается)
- Короткие ссылки (8 символов)
- Срок хранения: 1, 3, 5, 7, 20, 30 дней
- Лимит скачиваний: 1, 2, 5, 7, ∞
- Защита паролем
- Drag & drop загрузка с прогресс-баром
- История загрузок (привязана к сессии)

### 2. Передача текста (сниппеты)
- Создание текстовых сниппетов до 100KB
- Подсветка языка (javascript, python, и т.д.)
- Лимит просмотров: 1, 2, 5, 7, ∞
- Срок хранения: 1, 3, 5, 7, 20, 30 дней
- Защита паролем
- Копирование в один клик

### 3. Админ-панель
- **Секретный URL** — настраивается в `.env`
- **Первичная установка** — создание логина/пароля при первом входе
- **JWT авторизация** — токен на 24 часа
- **Статистика** — сессии, файлы, размер, скачивания
- **Управление настройками** — изменение лимитов на лету
- **Управление файлами** — список и удаление

### 4. Сессии и анонимность
- Cookie + UUID (httpOnly)
- Rolling expiration (7 дней, обновляется при каждом визите)
- Каскадное удаление истории при истечении сессии
- Файлы имеют свой срок хранения (не зависит от сессии)

### 5. Безопасность
- Транзакции PostgreSQL (нет orphan файлов)
- Валидация MIME типов и расширений
- Rate limiting (5 загрузок/мин, 60 API запросов/мин)
- bcrypt хэширование паролей (10 раундов)
- Multer diskStorage (файлы на диске, не в RAM)
- Реальный прогресс загрузки (XMLHttpRequest)

### 6. Автоматическая очистка
- Cron задача каждые 15 минут
- Удаление истёкших файлов
- Удаление истёкших сессий
- Очистка temp файлов

### 7. Docker контейнеризация
- `docker-compose.yml` с PostgreSQL и Backend
- Volumes для данных и хранилища
- Health checks для БД
- Auto-restart

## 📁 Структура проекта

```
filedrop/
├── backend/                    # Express сервер
│   ├── src/
│   │   ├── index.js           # Точка входа
│   │   ├── config/
│   │   │   ├── database.js    # PostgreSQL pool + миграции
│   │   │   ├── app.js         # Статический конфиг (инфраструктура)
│   │   │   └── settings.js    # Динамические настройки из БД
│   │   ├── middleware/
│   │   │   ├── session.js     # Cookie+UUID сессии
│   │   │   ├── adminAuth.js   # JWT проверка для админки
│   │   │   ├── validateFile.js # Валидация файлов
│   │   │   └── rateLimit.js   # Rate limiting
│   │   ├── routes/
│   │   │   ├── files.js       # API файлов
│   │   │   ├── snippets.js    # API текстовых сниппетов
│   │   │   ├── sessions.js    # API сессий
│   │   │   ├── admin.js       # Установка/вход админа
│   │   │   └── adminPanel.js  # Защищённые роуты админки
│   │   ├── services/
│   │   │   ├── storage/
│   │   │   │   ├── StorageInterface.js
│   │   │   │   ├── LocalStorage.js  # Локальное хранилище
│   │   │   │   └── S3Storage.js     # Заглушка для S3
│   │   │   └── CleanupService.js    # Cron очистка
│   │   └── utils/
│   │       ├── shortLink.js   # Генерация коротких ссылок
│   │       └── hash.js        # bcrypt хэширование
│   ├── datastore/             # Загруженные файлы
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                   # React приложение (этот проект)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── UploadPage.tsx       # Загрузка файлов
│   │   │   ├── DownloadPage.tsx     # Скачивание файлов
│   │   │   ├── SnippetPage.tsx      # Создание сниппетов
│   │   │   ├── ViewSnippetPage.tsx  # Просмотр сниппетов
│   │   │   ├── HistoryPage.tsx      # История загрузок
│   │   │   └── admin/
│   │   │       ├── AdminSetupPage.tsx    # Установка админа
│   │   │       ├── AdminLoginPage.tsx    # Вход админа
│   │   │       └── AdminDashboard.tsx    # Панель управления
│   │   ├── api/
│   │   │   └── client.ts        # API клиент с прогрессом
│   │   ├── store/
│   │   │   └── appStore.ts      # Zustand store
│   │   └── App.tsx              # Роутинг
│   ├── .env                     # VITE_ADMIN_SECRET_PATH
│   └── package.json
│
├── docker-compose.yml           # Docker оркестрация
├── CODE_REVIEW.md               # Ревью кода
├── ADMIN.md                     # Документация админки
└── README.md
```

## 🚀 Быстрый старт

### Локальная разработка

```bash
# 1. PostgreSQL
createdb filedrop

# 2. Backend
cd backend
npm install
cp .env.example .env
# Отредактируйте .env (настройки PostgreSQL, ADMIN_SECRET_PATH, JWT_SECRET)
npm run dev

# 3. Frontend
cd ..
npm install
# Отредактируйте .env (VITE_ADMIN_SECRET_PATH)
npm run dev
```

Откройте:
- Frontend: http://localhost:5173
- Admin setup: http://localhost:5173/my-secret-admin-xyz789/setup

### Docker

```bash
# Запустить всё
docker-compose up -d

# Логи
docker-compose logs -f backend

# Остановить
docker-compose down
```

## 🔧 Конфигурация

### Backend (.env)

```env
# Сервер
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=filedrop
DB_USER=postgres
DB_PASSWORD=postgres

# Хранилище
STORAGE_TYPE=local
DATASTORE_PATH=./datastore

# Админка
ADMIN_SECRET_PATH=/my-secret-admin-xyz789
JWT_SECRET=change-this-to-a-random-secret-string-at-least-32-chars
```

### Frontend (.env)

```env
VITE_ADMIN_SECRET_PATH=/my-secret-admin-xyz789
```

**Важно:** Секретный путь должен совпадать в обоих `.env` файлах!

## 📊 API Endpoints

### Публичные

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/files/upload` | Загрузить файл |
| GET | `/api/files/:link/info` | Инфо о файле |
| POST | `/api/files/:link/verify-password` | Проверить пароль |
| GET | `/api/files/:link/download` | Скачать файл |
| GET | `/api/files/history` | История файлов |
| DELETE | `/api/files/:id` | Удалить файл |
| POST | `/api/snippets` | Создать сниппет |
| GET | `/api/snippets/:link` | Получить сниппет |
| POST | `/api/snippets/:link/verify-password` | Проверить пароль |
| POST | `/api/snippets/:link/view` | Увеличить счётчик |
| GET | `/api/snippets/history` | История сниппетов |
| GET | `/api/sessions/me` | Текущая сессия |
| DELETE | `/api/sessions/me` | Удалить сессию |

### Админка (публичные)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/admin/setup` | Создание админа |
| POST | `/api/admin/login` | Вход, возвращает JWT |
| GET | `/api/admin/status` | Статус установки |

### Админка (защищённые)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/admin/panel/settings` | Получить настройки |
| PUT | `/api/admin/panel/settings` | Обновить настройки |
| GET | `/api/admin/panel/stats` | Статистика |
| GET | `/api/admin/panel/files` | Список файлов |
| DELETE | `/api/admin/panel/files/:id` | Удалить файл |
| POST | `/api/admin/panel/invalidate-cache` | Сброс кэша |
| GET | `/api/admin/panel/me` | Инфо об админе |

## 🗄️ База данных

### Таблицы

```sql
-- Сессии (анонимные пользователи)
sessions (id, token, created_at, last_activity, expires_at)

-- Файлы
files (id, session_id, original_name, storage_path, file_size, 
       mime_type, short_link, password_hash, max_downloads, 
       download_count, created_at, expires_at, status)

-- Текстовые сниппеты
text_snippets (id, session_id, short_link, content, title, language,
               password_hash, max_views, view_count, created_at, 
               expires_at, status)

-- Администраторы
admin_users (id, username, password_hash, created_at, last_login)

-- Настройки
settings (key, value, updated_at)
```

### Настройки по умолчанию

```
max_file_size_mb = 100
session_duration_days = 7
retention_options = '1,3,5,7,20,30'
max_downloads_options = '1,2,5,7,unlimited'
upload_rate_limit = 5
api_rate_limit = 60
is_setup_complete = false
```

## 🔐 Безопасность

- **Сессии:** httpOnly cookie, недоступны из JavaScript
- **Пароли:** bcrypt (10 раундов)
- **JWT:** 24 часа, хранится в localStorage
- **Файлы:** валидация MIME и расширений
- **Rate limiting:** защита от спама
- **Транзакции:** целостность данных
- **Секретный URL:** дополнительный слой защиты админки

## 📈 Масштабирование

### S3 хранилище
1. Установить: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
2. Реализовать методы в `S3Storage.js`
3. Установить `STORAGE_TYPE=s3` в `.env`

### Rate limiting на Redis
Заменить in-memory rate limiter на Redis-based решение для распределённых систем.

### CDN для файлов
Настроить nginx или Cloudflare для раздачи файлов из `/datastore`.

## 📝 Лицензия

MIT
