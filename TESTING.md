# Тестирование FileDrop

## Структура тестов

```
├── backend/
│   └── __tests__/
│       ├── utils/
│       │   ├── settings.test.js      # Валидация настроек
│       │   ├── hash.test.js          # Хэширование паролей
│       │   └── shortLink.test.js     # Генерация ссылок
│       └── services/
│           ├── FileService.test.js   # Сервис файлов
│           └── SnippetService.test.js # Сервис сниппетов
│
└── src/
    ├── test/
    │   └── setup.ts                  # Настройка Vitest
    └── utils/
        └── format.test.ts            # Утилиты форматирования
```

## Запуск тестов

### Быстрый старт

```bash
# Frontend тесты
npm run test:front

# Backend тесты
npm run test:back

# Все тесты сразу
npm run test:all
```

### Подробные команды

#### Frontend тесты (Vitest)

```bash
# Запустить все тесты
npm run test:front

# Watch mode
npm run test:watch

# С покрытием
npm run test:coverage
```

#### Backend тесты (Jest)

```bash
# Запустить все тесты
npm run test:back

# Watch mode (из корня проекта)
cd backend && npm run test:watch

# С покрытием (из корня проекта)
cd backend && npm run test:coverage
```

## Покрытие тестами

### Backend

#### Утилиты (utils)
- ✅ `validateRetentionDays()` — 13 тестов
  - Валидные форматы
  - Невалидные форматы
  - Граничные значения
  - Обработка ошибок

- ✅ `validateMaxDownloadsOptions()` — 12 тестов
  - Формат с числами
  - Формат с unlimited
  - Валидация диапазонов
  - Обработка ошибок

- ✅ `hashPassword()` / `verifyPassword()` — 12 тестов
  - Хэширование паролей
  - Проверка паролей
  - Специальные символы
  - Unicode
  - Case sensitivity

- ✅ `generateShortLink()` — 7 тестов
  - Длина ссылки
  - URL-safe символы
  - Уникальность

- ✅ `generateStorageFilename()` — 10 тестов
  - Формат имени
  - Санитизация
  - Уникальность

#### Сервисы (services)
- ✅ `FileService` — 12 тестов
  - Upload (с паролем, без пароля, ошибки)
  - GetFileInfo (активный, истёкший, лимит)
  - VerifyPassword
  - GenerateUniqueShortLink

- ✅ `SnippetService` — 11 тестов
  - Create (с паролем, unlimited, лимит)
  - GetSnippet (активный, истёкший, лимит)
  - VerifyPassword
  - IncrementView
  - GetSessionHistory

### Frontend

#### Утилиты (utils)
- ✅ `format.ts` — 18 тестов
  - `formatFileSize()` — форматирование размеров
  - `formatDate()` — форматирование дат
  - `formatExpiry()` — форматирование сроков
  - `retentionLabel()` — локализация сроков
  - `downloadLabel()` — локализация лимитов
  - `isExpired()` — проверка истечения

## Статистика

- **Backend:** ~65 тестов
- **Frontend:** ~18 тестов
- **Всего:** ~83 теста

## Мокирование

### Backend
- Репозитории мокаются через `jest.unstable_mockModule()`
- Хранилище мокается через `jest.unstable_mockModule()`
- Утилиты мокаются через `jest.unstable_mockModule()`

### Frontend
- Используется `jsdom` для DOM окружения
- `@testing-library/jest-dom` для расширенных matcher'ов

## Добавление новых тестов

### Backend

1. Создайте файл `__tests__/[category]/[name].test.js`
2. Импортируйте тестируемый модуль
3. Используйте `jest.unstable_mockModule()` для моков
4. Пишите тесты с `describe` и `it`

### Frontend

1. Создайте файл `[name].test.ts` рядом с модулем
2. Импортируйте из `vitest`
3. Пишите тесты с `describe` и `it`

## CI/CD

Добавьте в GitHub Actions:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run test
      - run: cd backend && npm install && npm test
```
