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

## 🚀 Установка

### Автоматическая установка (рекомендуется)

```bash
# Запустить скрипт установки
chmod +x install.sh
sudo ./install.sh
```

Скрипт:
- Спросит тип сертификата (self-signed или Let's Encrypt)
- Спросит домен
- Сгенерирует безопасные пароли
- Создаст `/datastore` для файлов
- Сгенерирует `docker-compose.yml` и `nginx.conf`
- Соберёт и запустит все контейнеры

После установки вы получите:
- URL сервиса (https://your-domain.com)
- Секретный URL админки
- Данные для подключения к БД
- Файл `INSTALL_INFO.txt` с полной информацией

### Ручная установка (для разработки)

```bash
# 1. PostgreSQL
createdb filedrop

# 2. Backend
cd backend
npm install
cp .env.example .env
# Настройте .env (параметры PostgreSQL, ADMIN_SECRET_PATH, JWT_SECRET)
npm run dev

# 3. Frontend
npm install
npm run dev
```

Откройте:
- Frontend: http://localhost:5173
- Admin setup: http://localhost:5173/my-secret-admin-xyz789/setup

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

- **Срок хранения:** 1, 3, 5, 7, 20, 30 дней (настраивается через админку)
- **Лимит скачиваний:** 1, 2, 5, 7, * (где * = без ограничений, настраивается через админку)
- **Пароль:** опционально
- **Макс. размер:** 100 MB (настраивается через админку)

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
# Установка
chmod +x install.sh      # Сделать скрипт исполняемым
sudo ./install.sh        # Запустить установку

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

# Docker
docker-compose ps        # Статус контейнеров
docker-compose logs -f   # Логи в реальном времени
docker-compose restart   # Перезапуск всех сервисов
docker-compose down      # Остановка всех сервисов
```

📖 Подробная документация по установке: [INSTALL.md](./INSTALL.md)
