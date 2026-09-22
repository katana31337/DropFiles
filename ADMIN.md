# Админ-панель FileDrop

## Установка администратора

### 1. Настройте секретный URL

В `backend/.env`:
```env
ADMIN_SECRET_PATH=/my-secret-admin-xyz789
JWT_SECRET=change-this-to-a-random-secret-string-at-least-32-chars
```

В `.env` (фронтенд):
```env
VITE_ADMIN_SECRET_PATH=/my-secret-admin-xyz789
```

**Важно:** Придумайте уникальный секретный путь! Это "пароль" для доступа к странице админки.

### 2. Первый запуск

1. Запустите сервер: `npm run dev` (или `docker compose up`)
2. Перейдите по секретному URL: `http://localhost:5173/my-secret-admin-xyz789/setup`
3. Создайте логин и пароль (минимум 8 символов)
4. После создания вы будете перенаправлены на страницу входа

### 3. Вход в админку

После установки переходите по тому же секретному URL:
`http://localhost:5173/my-secret-admin-xyz789/login`

Введите логин и пароль → попадёте в дашборд.

## Функции админки

### Статистика
- Активные сессии
- Всего файлов / активных файлов
- Общий размер хранилища
- Количество скачиваний
- Текстовые сниппеты

### Настройки (изменяются на лету, без перезапуска)
- **Max File Size** — максимальный размер файла (MB)
- **Session Duration** — срок жизни сессии (дни)
- **Upload Rate Limit** — лимит загрузок в минуту
- **API Rate Limit** — лимит API запросов в минуту

### Управление файлами
- Список всех файлов
- Удаление любого файла
- Пагинация

## API админки

### Публичные (без авторизации)
```
POST /api/admin/setup      — создание админа (только если не создан)
POST /api/admin/login      — вход, возвращает JWT токен
GET  /api/admin/status     — проверка статуса установки
```

### Защищённые (требуют JWT токен)
```
GET  /api/admin/panel/settings    — получить настройки
PUT  /api/admin/panel/settings    — обновить настройки
GET  /api/admin/panel/stats       — статистика
GET  /api/admin/panel/files       — список файлов
DELETE /api/admin/panel/files/:id — удалить файл
POST /api/admin/panel/invalidate-cache — сбросить кэш настроек
GET  /api/admin/panel/me          — информация о текущем админе
```

### Использование токена
```javascript
const token = localStorage.getItem('admin_token');

fetch('/api/admin/panel/settings', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Безопасность

- JWT токен хранится в localStorage (на клиенте)
- Токен действителен 24 часа
- Секретный URL известен только админу
- Пароли хэшируются bcrypt (10 раундов)
- Все настройки валидируются на сервере

## Сброс админа

Если нужно пересоздать админа:

```sql
-- Подключитесь к PostgreSQL
DELETE FROM admin_users;
UPDATE settings SET value = 'false' WHERE key = 'is_setup_complete';
```

После этого снова перейдите по секретному URL для создания нового админа.
