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
├── postgres/         # Данные PostgreSQL
└── certs/            # SSL сертификаты
```

### 6. Генерация конфигурации
- `.env` — переменные окружения
- `docker-compose.yml` — конфигурация контейнеров
- `nginx-*.conf` — конфигурация nginx

### 7. Сборка и запуск
- Устанавливает npm зависимости
- Собирает frontend
- Запускает Docker контейнеры
- Получает Let's Encrypt сертификат (если выбран)

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
   Certificates: /datastore/certs
```

## Требования

- Docker
- Docker Compose
- Root права (sudo)
- 1 GB RAM минимум
- 10 GB свободного места

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
# Ubuntu/Debian
sudo apt-get install docker-compose-plugin

# Или отдельно
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

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
