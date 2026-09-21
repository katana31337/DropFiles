# FileDrop Backend

Серверная часть сервиса анонимного обмена файлами.

## Технологии

- **Node.js + Express** — HTTP сервер и API
- **PostgreSQL** — база данных (сессии, файлы, настройки)
- **Multer** — загрузка файлов
- **bcryptjs** — хэширование паролей
- **node-cron** — автоматическая очистка
- **Локальное хранилище** — файлы в `/datastore` (расширяемо до S3)

## Установка

```bash
cd backend
npm install
cp .env.example .env
# Отредактируйте .env (настройки PostgreSQL)
```

## База данных

Создайте базу данных PostgreSQL:

```sql
CREATE DATABASE filedrop;
```

Таблицы создаются автоматически при первом запуске.

## Запуск

```bash
# Разработка (с автоперезагрузкой)
npm run dev

# Продакшен
npm start
```

## API Endpoints

### Файлы

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/files/upload` | Загрузить файл (multipart/form-data) |
| GET | `/api/files/:shortLink/info` | Информация о файле |
| POST | `/api/files/:shortLink/verify-password` | Проверить пароль |
| GET | `/api/files/:shortLink/download` | Скачать файл |
| GET | `/api/files/history` | История файлов сессии |
| DELETE | `/api/files/:id` | Удалить файл |

### Сессии

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/sessions/me` | Информация о сессии |
| DELETE | `/api/sessions/me` | Удалить сессию |

### Прочее

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/health` | Проверка работоспособности |

## Параметры загрузки (POST /api/files/upload)

```
file: multipart file
retentionDays: 1 | 3 | 5 | 7 | 20 | 30
maxDownloads: 1 | 2 | 5 | 7 | "unlimited"
password: string (опционально)
```

## Структура хранилища

```
datastore/
  2024/
    01/
      15/
        1705312800000_a1b2c3d4_filename.ext
        1705312800000_a1b2c3d4_filename.ext.meta.json
```

## Расширение до S3

1. Установите: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
2. Реализуйте методы в `src/services/storage/S3Storage.js`
3. Установите `STORAGE_TYPE=s3` в `.env`

## Автоматическая очистка

Cron задача запускается каждые 15 минут и удаляет:
- Файлы с истёкшим сроком хранения
- Файлы с исчерпанным лимитом скачиваний
- Истёкшие сессии (и их историю)

## Безопасность

- Сессии через httpOnly cookie (недоступны из JS)
- Пароли хэшируются bcrypt (10 раундов)
- Короткие ссылки — 8 символов, URL-safe
- Имена файлов в хранилище — случайные
