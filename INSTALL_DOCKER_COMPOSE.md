# Установка Docker Compose v2

## Проблема

У тебя установлена старая версия `docker-compose` (v1), которая написана на Python и несовместима с Python 3.12+.

Нужна новая версия `docker compose` (v2), которая является плагином для Docker и написана на Go.

## Решение

### Вариант 1: Через пакетный менеджер (рекомендуется)

```bash
# Обновить список пакетов
sudo apt-get update

# Удалить старую версию
sudo apt-get remove docker-compose

# Установить плагин Docker Compose v2
sudo apt-get install docker-compose-plugin

# Проверить установку
docker compose version
```

### Вариант 2: Ручная установка

Если пакетный менеджер не помогает:

```bash
# Создать директорию для плагинов
mkdir -p ~/.docker/cli-plugins

# Скачать последнюю версию
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
    -o ~/.docker/cli-plugins/docker-compose

# Сделать исполняемым
chmod +x ~/.docker/cli-plugins/docker-compose

# Проверить установку
docker compose version
```

### Вариант 3: Системная установка

```bash
# Скачать в системную директорию
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose

# Сделать исполняемым
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Проверить установку
docker compose version
```

## Проверка

После установки проверь:

```bash
# Должно показать версию (например, v2.24.5)
docker compose version

# НЕ должно работать (старая версия)
docker-compose version
```

## Использование

Теперь используй `docker compose` (без дефиса) вместо `docker-compose`:

```bash
# Правильно (v2)
docker compose up -d
docker compose ps
docker compose logs -f

# Неправильно (v1, устарел)
docker-compose up -d
```

## Запуск установки FileDrop

После установки Docker Compose v2:

```bash
sudo ./install.sh
```

Скрипт теперь использует `docker compose` и должен работать корректно.

## Если всё ещё не работает

1. Перезагрузи терминал или выполни:
   ```bash
   source ~/.bashrc
   ```

2. Проверь что Docker запущен:
   ```bash
   sudo systemctl status docker
   ```

3. Если Docker не запущен:
   ```bash
   sudo systemctl start docker
   ```

4. Попробуй запустить install.sh снова:
   ```bash
   sudo ./install.sh
   ```

## Дополнительная информация

- [Docker Compose v2 documentation](https://docs.docker.com/compose/)
- [Migration from v1 to v2](https://docs.docker.com/compose/migrate/)
