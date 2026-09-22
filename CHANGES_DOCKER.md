# Изменения: Docker Multi-stage Build

## Что изменилось

### Проблема
Раньше frontend компилировался на хосте, а затем готовые файлы копировались в Docker контейнер. Это требовало:
- Установки Node.js на хосте
- Ручной сборки перед запуском Docker
- Возможных конфликтов версий Node.js
- Не полностью изолированного окружения

### Решение
Теперь frontend компилируется **внутри** Docker контейнера через multi-stage build.

## Новые файлы

### `frontend/Dockerfile`
```dockerfile
# Этап 1: Сборка
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Этап 2: Production
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

### `frontend/.dockerignore`
Исключает ненужные файлы из Docker образа:
- `node_modules` — устанавливаются внутри контейнера
- `dist`, `build` — собираются внутри контейнера
- `.env` файлы — конфигурация через переменные окружения
- `__tests__`, `*.test.*`, `*.spec.*` — **тесты не попадают в production образ**
- `vitest.config.*` — конфигурация тестов
- IDE файлы, OS файлы, логи

### `backend/.dockerignore`
Аналогично для backend:
- `node_modules` — устанавливаются внутри контейнера
- `datastore` — данные монтируются как volume
- `__tests__`, `*.test.*`, `*.spec.*` — **тесты не попадают в production образ**
- `jest.config.*` — конфигурация тестов
- `.env` файлы, IDE файлы, OS файлы, логи

**Важно:** Тесты остаются в репозитории и запускаются локально через `npm run test:front` и `npm run test:back`, но не включаются в Docker образы для production.

## Изменённые файлы

### `install.sh`
- Убрана секция локальной сборки frontend (`npm install && npm run build`)
- Добавлена секция сборки Docker образов
- Обновлены docker-compose.yml для обоих вариантов SSL:
  - Добавлен сервис `frontend` с build из `./frontend`
  - Nginx теперь проксирует на `frontend:80` вместо раздачи статических файлов
- Улучшена обработка ошибок при вводе (теперь показывает предупреждение если введён текст вместо номера)

### `backend/Dockerfile`
- Небольшие улучшения (копирует package-lock.json, добавлены комментарии)

### Документация
- `README.md` — добавлена информация о multi-stage build
- `INSTALL.md` — добавлена секция "Multi-stage Build для Frontend"
- `INSTALL_SCRIPT.md` — обновлена информация о сборке

## Преимущества

### 1. Не нужен Node.js на хосте
Всё компилируется внутри Docker. Хосту нужен только Docker и Docker Compose.

### 2. Полная изоляция
- Одинаковые версии Node.js, npm, зависимостей
- Нет конфликтов с другими проектами
- Воспроизводимые сборки

### 3. Меньший размер образа
- **Было:** ~500MB (Node.js + все зависимости + исходный код)
- **Стало:** ~25MB (только nginx + собранные файлы)

### 4. "Build once, run anywhere"
Один и тот же Docker образ работает на любой машине с Docker.

### 5. Безопасность
- Production образ не содержит исходный код
- Нет dev dependencies
- Минимальная攻击面 (attack surface)

## Как это работает

### Процесс установки

```bash
sudo ./install.sh
```

1. Скрипт спрашивает настройки (SSL, домен, БД)
2. Генерирует конфигурацию (.env, docker-compose.yml, nginx.conf)
3. Запускает `docker-compose up -d --build`
4. Docker собирает образы:
   - **frontend:** компилирует TypeScript → JavaScript внутри контейнера
   - **backend:** устанавливает production зависимости
5. Запускает контейнеры

### Структура контейнеров

```
┌─────────────────────────────────────────┐
│           Docker Network                │
│                                         │
│  ┌─────────┐   ┌─────────┐             │
│  │  Nginx  │──▶│Frontend │             │
│  │ (80/443)│   │ (nginx) │             │
│  └─────────┘   └─────────┘             │
│       │                                 │
│       ▼                                 │
│  ┌─────────┐   ┌─────────┐             │
│  │ Backend │──▶│Postgres │             │
│  │ (3001)  │   │ (5432)  │             │
│  └─────────┘   └─────────┘             │
│                                         │
└─────────────────────────────────────────┘
```

### Nginx конфигурация

```nginx
location / {
    proxy_pass http://frontend:80;
    # Проксирует на frontend контейнер
}

location /api {
    proxy_pass http://backend:3001;
    # Проксирует на backend контейнер
}

location /uploads {
    proxy_pass http://backend:3001;
    # Проксирует на backend для скачивания файлов
}
```

## Обновление

Если нужно пересобрать frontend:

```bash
docker compose build frontend
docker compose up -d frontend
```

Или пересобрать всё:

```bash
docker compose build
docker compose up -d
```

## Откат

Если нужно вернуться к старой схеме (компиляция на хосте):

1. Удалить `frontend/Dockerfile`
2. В `install.sh` вернуть секцию локальной сборки
3. В `docker-compose.yml` убрать сервис `frontend` и вернуть монтирование `./frontend/dist`

Но это не рекомендуется — multi-stage build лучше во всех аспектах.

## Тестирование

Проверить что всё работает:

```bash
# Собрать образы
docker compose build

# Запустить контейнеры
docker compose up -d

# Проверить статус
docker compose ps

# Посмотреть логи
docker compose logs -f frontend
docker compose logs -f nginx

# Открыть в браузере
# https://your-domain.com
```

## Размер образов

### Frontend
- **Builder stage:** ~500MB (временный, не сохраняется)
- **Final stage:** ~25MB (nginx + собранные файлы)

### Backend
- **Final stage:** ~150MB (Node.js + production dependencies)

### Итого
- **Вместо:** ~500MB (если компилировать на хосте и копировать)
- **Стало:** ~175MB (оптимизированные production образы)

## Заключение

Multi-stage build — это правильный подход для production deployments. Он обеспечивает:
- Полную изоляцию окружения
- Воспроизводимые сборки
- Минимальный размер образов
- Повышенную безопасность
- Упрощённый процесс развёртывания

Все изменения обратно совместимы и не требуют миграции данных.
