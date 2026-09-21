# Руководство по установке FileDrop

## Быстрая установка

```bash
chmod +x install.sh
sudo ./install.sh
```

Скрипт автоматически:
1. Проверит наличие Docker и Docker Compose
2. Спросит тип SSL сертификата
3. Сгенерирует безопасные пароли
4. Создаст структуру директорий
5. Сгенерирует конфигурацию
6. Запустит контейнеры

## Что делает скрипт

### 1. Проверка окружения
- Проверяет наличие Docker
- Проверяет наличие Docker Compose
- Проверяет права root

### 2. Настройка SSL

#### Self-signed сертификат
Для локальной сети или тестирования:
- Генерирует самоподписанный сертификат
- Домен по умолчанию: `fileshare.local`
- Срок действия: 365 дней

**Важно:** После установки добавьте запись в `/etc/hosts`:
```
<IP-сервера> fileshare.local
```

#### Let's Encrypt
Для публичного доступа:
- Получает бесплатный сертификат от Let's Encrypt
- Требует реальный домен с DNS записью
- Автоматическое обновление сертификата

### 3. Настройка PostgreSQL
- Генерирует случайный пароль (24 символа)
- Создаёт базу данных `filedrop`
- Пользователь `filedrop`

### 4. Настройка админки
- Генерирует секретный URL (например: `/admin-a1b2c3d4e5f6`)
- Генерирует JWT секрет для токенов

### 5. Создание структуры директорий

```
/datastore/
├── uploads/          # Загруженные файлы
├── temp/             # Временные файлы при загрузке
└── postgres/         # Данные PostgreSQL

/opt/dropfiles/
└── cert/             # SSL сертификаты
```

**Важно:** 
- Файлы пользователей хранятся в `/datastore` на хосте, а не в Docker volume
- SSL сертификаты хранятся в `/opt/dropfiles/cert` отдельно от пользовательских данных

### 6. Генерация конфигурации

Создаются файлы:
- `.env` — переменные окружения
- `docker-compose.yml` — конфигурация контейнеров
- `nginx-self-signed.conf` или `nginx-letsencrypt.conf` — конфигурация nginx

### 7. Сборка и запуск
- Собирает Docker образы (frontend компилируется внутри контейнера через multi-stage build)
- Запускает Docker контейнеры
- Получает Let's Encrypt сертификат (если выбран)

### 8. Multi-stage Build для Frontend

Frontend использует multi-stage build для оптимизации:

**Этап 1: Сборка (node:20-alpine)**
- Устанавливает все зависимости (включая dev)
- Компилирует TypeScript в JavaScript
- Создаёт production build

**Этап 2: Production (nginx:alpine)**
- Копирует только собранные файлы из этапа 1
- Не содержит Node.js, npm, исходный код, тесты
- Размер образа: ~25MB вместо ~500MB

**Преимущества:**
- ✅ Не нужен Node.js на хосте
- ✅ Полная изоляция окружения
- ✅ Гарантированно одинаковые версии
- ✅ Меньше финальный образ
- ✅ "Build once, run anywhere"

## После установки

### Доступ к сервису

```bash
# Основной URL
https://your-domain.com

# Админ-панель (секретный URL из INSTALL_INFO.txt)
https://your-domain.com/admin-xxxxx
```

### Полезные команды

```bash
# Статус контейнеров
docker-compose ps

# Просмотр логов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f nginx
docker-compose logs -f postgres

# Перезапуск всех сервисов
docker-compose restart

# Перезапуск конкретного сервиса
docker-compose restart backend

# Остановка всех сервисов
docker-compose down

# Остановка с удалением данных (ОПАСНО!)
docker-compose down -v
sudo rm -rf /datastore/*
```

### Управление файлами

Все файлы хранятся в `/datastore`:

```bash
# Посмотреть размер хранилища
du -sh /datastore/uploads

# Посмотреть список файлов
ls -lh /datastore/uploads

# Очистить временные файлы
sudo rm -rf /datastore/temp/*
```

### Управление сертификатами

SSL сертификаты хранятся в `/opt/dropfiles/cert`:

```bash
# Посмотреть сертификаты
ls -lh /opt/dropfiles/cert

# Обновить self-signed сертификат (через год)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/dropfiles/cert/yourdomain.key \
  -out /opt/dropfiles/cert/yourdomain.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain"

# Перезапустить nginx после обновления
docker-compose restart nginx
```

### Резервное копирование

#### Полная резервная копия

```bash
# Создать архив (включая сертификаты)
sudo tar -czf filedrop-backup-$(date +%Y%m%d).tar.gz /datastore /opt/dropfiles

# Восстановить
sudo tar -xzf filedrop-backup-YYYYMMDD.tar.gz -C /
```

#### Только база данных

```bash
# Создать дамп
docker-compose exec postgres pg_dump -U filedrop filedrop > backup.sql

# Восстановить
docker-compose exec -T postgres psql -U filedrop filedrop < backup.sql
```

#### Только файлы

```bash
# Создать архив файлов
sudo tar -czf files-backup-$(date +%Y%m%d).tar.gz /datastore/uploads

# Восстановить
sudo tar -xzf files-backup-YYYYMMDD.tar.gz -C /
```

## Обновление

### Обновление кода

```bash
# Остановить сервисы
docker-compose down

# Обновить код
git pull

# Пересобрать и запустить
docker-compose up -d --build
```

### Обновление PostgreSQL

```bash
# Создать дамп базы
docker-compose exec postgres pg_dump -U filedrop filedrop > backup.sql

# Обновить образ
docker-compose pull postgres

# Запустить с новым образом
docker-compose up -d postgres

# Проверить работу
docker-compose logs postgres
```

## Решение проблем

### Контейнер не запускается

```bash
# Проверить логи
docker-compose logs <service-name>

# Перезапустить контейнер
docker-compose restart <service-name>

# Пересобрать контейнер
docker-compose up -d --build <service-name>
```

### Ошибка подключения к БД

```bash
# Проверить статус PostgreSQL
docker-compose ps postgres

# Проверить логи PostgreSQL
docker-compose logs postgres

# Перезапустить PostgreSQL
docker-compose restart postgres
```

### Ошибка 502 Bad Gateway

```bash
# Проверить статус backend
docker-compose ps backend

# Проверить логи backend
docker-compose logs backend

# Перезапустить backend
docker-compose restart backend
```

### SSL сертификат не работает

#### Self-signed
1. Убедитесь что добавили запись в `/etc/hosts`
2. Примите самоподписанный сертификат в браузере
3. Перезапустите nginx: `docker-compose restart nginx`

#### Let's Encrypt
```bash
# Проверить статус certbot
docker-compose logs certbot

# Вручную получить сертификат
docker-compose run --rm certbot certonly --webroot \
  --webroot-path /var/www/certbot \
  --email your@email.com \
  --agree-tos \
  -d your-domain.com

# Перезапустить nginx
docker-compose restart nginx
```

### Нет места на диске

```bash
# Проверить использование диска
df -h

# Очистить временные файлы
sudo rm -rf /datastore/temp/*

# Очистить Docker
docker system prune -a

# Перемести хранилище на другой диск
# 1. Остановить сервисы
docker-compose down

# 2. Перемести данные
sudo mv /datastore /new-disk/filedrop

# 3. Создать symlink
sudo ln -s /new-disk/filedrop /datastore

# 4. Запустить сервисы
docker-compose up -d
```

## Безопасность

### Смена паролей

#### PostgreSQL

```bash
# Войти в контейнер
docker-compose exec postgres psql -U filedrop

# Сменить пароль
ALTER USER filedrop WITH PASSWORD 'new-password';

# Обновить .env
nano .env
# Изменить POSTGRES_PASSWORD

# Перезапустить backend
docker-compose restart backend
```

### Смена секретного URL админки

```bash
# Сгенерировать новый URL
openssl rand -hex 16

# Обновить .env
nano .env
# Изменить ADMIN_SECRET_PATH

# Перезапустить backend
docker-compose restart backend
```

### Firewall

```bash
# Открыть порты (Ubuntu/Debian)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Или (CentOS/RHEL)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Мониторинг

### Проверка здоровья

```bash
# Health check endpoint
curl https://your-domain.com/api/health

# Должно вернуть:
# {"status":"ok","timestamp":"..."}
```

### Просмотр статистики

```bash
# Статистика Docker
docker stats

# Использование ресурсов
docker-compose exec backend node -e "console.log(process.memoryUsage())"
```

### Логи

```bash
# Все логи в реальном времени
docker-compose logs -f

# Только ошибки
docker-compose logs | grep -i error

# Логи за последний час
docker-compose logs --since=1h
```

## Производительность

### Оптимизация PostgreSQL

```bash
# Войти в контейнер
docker-compose exec postgres psql -U filedrop

# Проверить размер таблиц
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(table_name::text)) as size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(table_name::text) DESC;

# Очистить мертвые кортежи
VACUUM ANALYZE;
```

### Оптимизация nginx

Отредактируйте `nginx.conf`:

```nginx
# Увеличить буферы
client_body_buffer_size 10M;
client_max_body_size 100M;

# Включить gzip
gzip on;
gzip_types text/plain application/json application/javascript text/css;
```

## Поддержка

### Полезные ссылки

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

### Получение помощи

1. Проверьте логи: `docker-compose logs`
2. Проверьте статус: `docker-compose ps`
3. Проверьте ресурсы: `docker stats`
4. Проверьте диск: `df -h`

## Лицензия

MIT
