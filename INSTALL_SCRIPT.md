# FileDrop Installation Script

Интерактивный скрипт для автоматической установки FileDrop.

## Использование

```bash
chmod +x install.sh
sudo ./install.sh
```

## Что делает скрипт

### 1. Проверка окружения
- Проверяет наличие Docker и Docker Compose
- Проверяет права root

### 2. Настройка SSL
Выберите один из вариантов:
- **Self-signed** — для локальной сети (fileshare.local)
- **Let's Encrypt** — для публичного домена

### 3. Настройка PostgreSQL
- Спрашивает имя базы данных (по умолчанию: filedrop)
- Спрашивает имя пользователя (по умолчанию: filedrop)
- Генерирует безопасный пароль автоматически

### 4. Настройка админки
- Генерирует секретный URL для админки
- Генерирует JWT секрет

### 5. Создание структуры
```
/datastore/
├── uploads/          # Загруженные файлы
├── temp/             # Временные файлы
└── postgres/         # Данные PostgreSQL

/opt/dropfiles/
└── cert/             # SSL сертификаты
```

**Примечание:** В настройках лимита скачиваний используется `*` для обозначения "без ограничений" (например: `1,5,10,*`).

### 6. Генерация конфигурации
- `.env` — переменные окружения
- `docker-compose.yml` — конфигурация контейнеров
- `nginx-*.conf` — конфигурация nginx

### 7. Сборка и запуск
- Собирает Docker образы (frontend компилируется внутри контейнера через multi-stage build)
- Запускает Docker контейнеры
- Получает Let's Encrypt сертификат (если выбран)

**Multi-stage Build:**
- Этап 1: `node:20-alpine` — устанавливает зависимости и компилирует frontend
- Этап 2: `nginx:alpine` — копирует только собранные файлы (~25MB вместо ~500MB)
- Тесты исключены из Docker образов через `.dockerignore`
- Преимущества: не нужен Node.js на хосте, полная изоляция, меньший образ

## Параметры

Скрипт задаст следующие вопросы:

1. **Тип SSL сертификата**
   - 1) Self-signed (для локальной сети)
   - 2) Let's Encrypt (для публичного домена)

2. **Домен**
   - Для self-signed: fileshare.local (по умолчанию)
   - Для Let's Encrypt: ваш реальный домен

3. **Email** (только для Let's Encrypt)
   - Email для получения уведомлений от Let's Encrypt

4. **Имя базы данных**
   - По умолчанию: filedrop

5. **Имя пользователя PostgreSQL**
   - По умолчанию: filedrop

6. **Запустить контейнеры?**
   - Y/n (по умолчанию: Y)

## После установки

Скрипт создаст файл `INSTALL_INFO.txt` с полной информацией:
- URL сервиса
- Секретный URL админки
- Данные для подключения к БД
- Пути к хранилищу

## Пример вывода

```
╔═══════════════════════════════════════════════════════════╗
║              FileDrop Installation Wizard                 ║
╚═══════════════════════════════════════════════════════════╝

✓ Docker и Docker Compose найдены

═══════════════════════════════════════════════════════════
  Шаг 1: SSL/TLS Сертификат
═══════════════════════════════════════════════════════════

Выберите тип SSL сертификата:

  1) Self-signed (для локальной сети / fileshare.local)
  2) Let's Encrypt (для публичного домена)

Ваш выбор [1/2]: 1
Введите домен [fileshare.local]: fileshare.local
✓ Тип сертификата: self-signed
✓ Домен: fileshare.local

...

╔═══════════════════════════════════════════════════════════╗
║                  Installation Complete!                   ║
╚═══════════════════════════════════════════════════════════╝

📍 URL:
   https://fileshare.local

🔐 Admin Panel:
   https://fileshare.local/admin-a1b2c3d4e5f6g7h8

🗄️  Database:
   Host: localhost:5432
   Database: filedrop
   User: filedrop
   Password: generated-password-here

📁 Storage:
   Files: /datastore/uploads
   Temp: /datastore/temp
   PostgreSQL: /datastore/postgres
   Certificates: /opt/dropfiles/cert
```

## Требования

- Docker
- Docker Compose
- Root права (sudo)
- 1 GB RAM минимум
- 10 GB свободного места

## Повторная установка

Скрипт поддерживает повторный запуск с проверкой существующих файлов:

### Что проверяется:

1. **SSL сертификаты** (`/opt/dropfiles/cert/`)
   - Если сертификат уже существует → пропускает генерацию
   - Выводит: "✓ Сертификат уже существует: /opt/dropfiles/cert/..."

2. **docker-compose.yml**
   - Если файл существует → спрашивает: "Перезаписать его? [y/N]"
   - По умолчанию использует существующий

3. **nginx конфигурация**
   - Если файл существует → спрашивает: "Перезаписать его? [y/N]"
   - По умолчанию использует существующий

4. **.env файл**
   - Если файл существует → спрашивает: "Перезаписать его? [y/N]"
   - По умолчанию использует существующий

5. **Frontend build** (`frontend/dist/`)
   - Если сборка существует → спрашивает: "Пересобрать? [y/N]"
   - По умолчанию использует существующий build

### Пример повторного запуска:

```bash
# Первый запуск - полная установка
sudo ./install.sh

# Второй запуск - обновление
sudo ./install.sh
# Скрипт найдёт существующие файлы и спросит что делать
```

### Полный сброс:

Если нужно переустановить всё с нуля:

```bash
# Остановить контейнеры
docker compose down

# Удалить данные
sudo rm -rf /datastore/*
sudo rm -rf /opt/dropfiles/*

# Удалить конфигурацию
rm -f .env docker-compose.yml nginx-*.conf
rm -rf frontend/dist

# Запустить установку заново
sudo ./install.sh
```

## Решение проблем

### Ошибка: Docker не установлен

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# CentOS/RHEL
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Ошибка: Docker Compose не установлен

```bash
# Ubuntu/Debian - установить плагин Docker Compose v2
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Проверить установку
docker compose version

# Если не работает, установить вручную
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
```

**Важно:** Используется `docker compose` (v2, плагин), а не `docker-compose` (v1, устарел).

### Ошибка: Permission denied

```bash
chmod +x install.sh
sudo ./install.sh
```

### Ошибка: Порт 80 или 443 занят

```bash
# Проверить что занимает порт
sudo lsof -i :80
sudo lsof -i :443

# Остановить сервис
sudo systemctl stop nginx
# или
sudo systemctl stop apache2
```

## Ручная установка

Если скрипт не работает, следуйте инструкции в [INSTALL.md](./INSTALL.md)

## Поддержка

- Документация: [INSTALL.md](./INSTALL.md)
-Issues: создайте issue в репозитории
