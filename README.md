# FileDrop — Анонимный обмен файлами

Сервис для анонимного скачивания файлов с короткими ссылками, паролем и ограничением по времени/скачиваниям.

## 🏗️ Архитектура

```
Frontend (React + Vite + Tailwind)  →  Backend (Node.js + Express)  →  PostgreSQL
                                           ↓
                                     /datastore (файлы)
```

### Выбранные решения:
- **Бэкенд:** Node.js + Express
- **Сессии:** Cookie + UUID (rolling 7 дней)
- **Хранилище:** Локальное `/datastore` (расширяемо до S3)
- **Очистка:** Cron каждые 15 минут
- **БД:** PostgreSQL

## 📁 Структура

```
├── frontend/          → React приложение (этот проект)
│   ├── src/
│   │   ├── pages/     → UploadPage, DownloadPage, HistoryPage, ArchitecturePage
│   │   ├── store/     → Zustand store
│   │   └── types/     → TypeScript типы
│   └── dist/          → Собранный фронтенд
│
├── backend/           → Express сервер
│   ├── src/
│   │   ├── index.js           → Точка входа
│   │   ├── config/database.js → PostgreSQL pool
│   │   ├── middleware/session.js → Cookie+UUID сессии
│   │   ├── routes/files.js    → API файлов
│   │   ├── routes/sessions.js → API сессий
│   │   ├── services/
│   │   │   ├── storage/       → LocalStorage, S3Storage (future)
│   │   │   └── CleanupService.js → Cron очистка
│   │   └── utils/             → shortLink, hash
│   └── datastore/     → Загруженные файлы
│
└── README.md
```

## 🧪 Тестирование

```bash
# Frontend тесты
npm run test:front

# Backend тесты
npm run test:back

# Все тесты сразу
npm run test:all
```

Подробнее в [TESTING.md](./TESTING.md)

## 🚀 Запуск

### 1. База данных

```bash
# Установите PostgreSQL и создайте БД
createdb filedrop
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Настройте .env (параметры PostgreSQL)
npm run dev
```

Сервер запустится на `http://localhost:3001`

### 3. Frontend

```bash
npm install
npm run dev
```

Фронтенд на `http://localhost:5173`

## 🔌 API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/files/upload` | Загрузить файл |
| GET | `/api/files/:link/info` | Инфо о файле |
| POST | `/api/files/:link/verify-password` | Проверить пароль |
| GET | `/api/files/:link/download` | Скачать |
| GET | `/api/files/history` | История сессии |
| DELETE | `/api/files/:id` | Удалить файл |
| GET | `/api/sessions/me` | Текущая сессия |
| DELETE | `/api/sessions/me` | Удалить сессию |

## ⚙️ Параметры загрузки

- **Срок хранения:** 1, 3, 5, 7, 20, 30 дней
- **Лимит скачиваний:** 1, 2, 5, 7, ∞
- **Пароль:** опционально
- **Макс. размер:** 100 MB (настраивается)

## 🔐 Безопасность

- Сессии: httpOnly cookie (недоступны из JavaScript)
- Пароли: bcrypt (10 раундов)
- Короткие ссылки: 8 символов, криптографически случайные
- Имена файлов в хранилище: случайные

## 📋 Roadmap

- [x] Подключить фронтенд к реальному API
- [x] Передача текста (следующий модуль)
- [x] Админ-панель с динамическими настройками
- [x] Рефакторинг по SOLID
- [x] Система тестирования
- [ ] QR-коды для ссылок
- [ ] Уведомления о скачивании
- [ ] Docker контейнеризация
- [ ] S3 реализация

## 💻 Полезные команды

```bash
# Разработка
npm run dev              # Запустить frontend в dev mode
cd backend && npm run dev  # Запустить backend в dev mode

# Сборка
npm run build            # Собрать frontend для продакшена

# Тестирование
npm run test:front       # Frontend тесты
npm run test:back        # Backend тесты
npm run test:all         # Все тесты
npm run test:watch       # Frontend тесты в watch mode

# Проверка типов
npm run typecheck        # Проверить TypeScript типы
```
