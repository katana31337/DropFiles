#!/bin/bash

# FileDrop Installation Script
# Интерактивная установка с сохранением в /opt/dropfiles/

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для вывода
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# Приветствие
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║              FileDrop Installation Wizard                 ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Проверка Docker
if ! command -v docker &> /dev/null; then
    error "Docker не установлен. Установите Docker и попробуйте снова."
fi

if ! docker compose version &> /dev/null; then
    error "Docker Compose не установлен. Установите Docker Compose v2 (плагин для Docker) и попробуйте снова."
fi

success "Docker и Docker Compose найдены"

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    warning "Скрипт запущен без прав root. Некоторые операции могут потребовать sudo."
fi

echo ""
info "Начинаем настройку FileDrop..."
echo ""

# ============================================
# 1. Создание структуры директорий
# ============================================
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Шаг 1: Создание структуры директорий${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

BASE_PATH="/opt/dropfiles"
CERT_PATH="$BASE_PATH/cert"
CONFIG_PATH="$BASE_PATH/config"
DATA_PATH="$BASE_PATH/data"

# Создаём базовые директории
info "Создание структуры в $BASE_PATH..."
sudo mkdir -p "$CERT_PATH"
sudo mkdir -p "$CONFIG_PATH"
sudo mkdir -p "$DATA_PATH/uploads"
sudo mkdir -p "$DATA_PATH/temp"
sudo mkdir -p "$DATA_PATH/postgres"

success "Структура создана"
echo ""
echo "  $BASE_PATH/"
echo "  ├── backend/           # Исходный код backend"
echo "  ├── frontend/          # Исходный код frontend"
echo "  ├── cert/              # SSL сертификаты"
echo "  ├── config/            # Конфигурация"
echo "  └── data/              # Данные"
echo "      ├── uploads/       # Загруженные файлы"
echo "      ├── temp/          # Временные файлы"
echo "      └── postgres/      # PostgreSQL"
echo ""

# Копируем исходный код проекта
info "Копирование исходного кода в $BASE_PATH..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Копируем backend
sudo cp -r "$SCRIPT_DIR/backend" "$BASE_PATH/backend"

# Копируем frontend (исходники в корне + Dockerfile из frontend/)
sudo mkdir -p "$BASE_PATH/frontend"
sudo cp -r "$SCRIPT_DIR/src" "$BASE_PATH/frontend/"
sudo cp "$SCRIPT_DIR/package.json" "$BASE_PATH/frontend/"
sudo cp "$SCRIPT_DIR/package-lock.json" "$BASE_PATH/frontend/" 2>/dev/null || true
sudo cp "$SCRIPT_DIR/index.html" "$BASE_PATH/frontend/"
sudo cp "$SCRIPT_DIR/vite.config.js" "$BASE_PATH/frontend/"
sudo cp "$SCRIPT_DIR/tsconfig.json" "$BASE_PATH/frontend/"
sudo cp "$SCRIPT_DIR/.dockerignore" "$BASE_PATH/frontend/"
sudo cp "$SCRIPT_DIR/frontend/Dockerfile" "$BASE_PATH/frontend/"
sudo cp "$SCRIPT_DIR/frontend/nginx.conf" "$BASE_PATH/frontend/"

success "Исходный код скопирован"
echo ""

# ============================================
# 2. Выбор типа сертификата
# ============================================
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Шаг 2: SSL/TLS Сертификат${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Выберите тип SSL сертификата:"
echo ""
echo "  1) Self-signed (для локальной сети / fileshare.local)"
echo "  2) Let's Encrypt (для публичного домена)"
echo ""

while true; do
    read -p "Ваш выбор [1/2]: " cert_choice
    
    case $cert_choice in
        1)
            CERT_TYPE="self-signed"
            echo ""
            read -p "Введите домен [fileshare.local]: " DOMAIN
            DOMAIN=${DOMAIN:-fileshare.local}
            break
            ;;
        2)
            CERT_TYPE="letsencrypt"
            echo ""
            read -p "Введите ваш домен (например, filedrop.example.com): " DOMAIN
            if [ -z "$DOMAIN" ]; then
                error "Домен обязателен для Let's Encrypt"
            fi
            read -p "Введите email для Let's Encrypt: " EMAIL
            if [ -z "$EMAIL" ]; then
                error "Email обязателен для Let's Encrypt"
            fi
            break
            ;;
        *)
            warning "Пожалуйста, введите номер пункта (1 или 2), а не текст"
            echo ""
            ;;
    esac
done

success "Тип сертификата: $CERT_TYPE"
success "Домен: $DOMAIN"

# ============================================
# 3. Настройка PostgreSQL
# ============================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Шаг 3: База данных PostgreSQL${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

read -p "Введите имя базы данных [filedrop]: " DB_NAME
DB_NAME=${DB_NAME:-filedrop}

read -p "Введите имя пользователя PostgreSQL [filedrop]: " DB_USER
DB_USER=${DB_USER:-filedrop}

echo ""
info "Генерация безопасного пароля для PostgreSQL..."
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-24)
success "Пароль сгенерирован: ${DB_PASSWORD:0:4}****"

# ============================================
# 4. Настройка админки
# ============================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Шаг 4: Админ-панель${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

info "Генерация секретного URL для админки..."
ADMIN_SECRET=$(openssl rand -hex 16)
ADMIN_PATH="/admin-${ADMIN_SECRET}"
success "Секретный URL: $ADMIN_PATH"

info "Генерация JWT секрета..."
JWT_SECRET=$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-48)
success "JWT секрет сгенерирован"

# ============================================
# 5. Генерация сертификатов (если self-signed)
# ============================================
if [ "$CERT_TYPE" = "self-signed" ]; then
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Шаг 5: Генерация self-signed сертификата${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Проверяем наличие существующего сертификата
    if [ -f "$CERT_PATH/$DOMAIN.crt" ] && [ -f "$CERT_PATH/$DOMAIN.key" ]; then
        success "Сертификат уже существует: $CERT_PATH/$DOMAIN.crt"
        info "Пропускаем генерацию, используем существующий сертификат"
    else
        info "Генерация self-signed сертификата для $DOMAIN..."
        
        sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$CERT_PATH/$DOMAIN.key" \
            -out "$CERT_PATH/$DOMAIN.crt" \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN" \
            -addext "subjectAltName=DNS:$DOMAIN,DNS:www.$DOMAIN" 2>/dev/null
        
        success "Сертификат создан в $CERT_PATH"
    fi
    
    warning "Важно: Добавьте $DOMAIN в /etc/hosts или настройте DNS"
fi

# ============================================
# 6. Генерация .env файла
# ============================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Шаг 6: Генерация конфигурации${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

if [ -f "$CONFIG_PATH/.env" ]; then
    warning "Файл .env уже существует в $CONFIG_PATH"
    read -p "Перезаписать его? [y/N]: " overwrite_env
    if [[ ! $overwrite_env =~ ^[Yy]$ ]]; then
        info "Используем существующий .env"
        SKIP_ENV=true
    fi
fi

if [ "$SKIP_ENV" != "true" ]; then
    info "Создание .env файла в $CONFIG_PATH..."

    cat > "$CONFIG_PATH/.env" << EOF
# FileDrop Configuration
# Generated by install.sh on $(date)

# Domain
DOMAIN=$DOMAIN
CERT_TYPE=$CERT_TYPE

# PostgreSQL
POSTGRES_DB=$DB_NAME
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD

# Admin
ADMIN_SECRET_PATH=$ADMIN_PATH
JWT_SECRET=$JWT_SECRET

# Let's Encrypt (если используется)
EMAIL=$EMAIL

# Paths
CERT_PATH=$CERT_PATH
DATA_PATH=$DATA_PATH
CONFIG_PATH=$CONFIG_PATH
EOF

    success ".env файл создан"
fi

# ============================================
# 7. Генерация docker-compose.yml
# ============================================
if [ -f "$CONFIG_PATH/docker-compose.yml" ]; then
    warning "Файл docker-compose.yml уже существует в $CONFIG_PATH"
    read -p "Перезаписать его? [y/N]: " overwrite_compose
    if [[ ! $overwrite_compose =~ ^[Yy]$ ]]; then
        info "Используем существующий docker-compose.yml"
        SKIP_COMPOSE=true
    fi
fi

if [ "$SKIP_COMPOSE" != "true" ]; then
    info "Генерация docker-compose.yml..."
fi

if [ "$SKIP_COMPOSE" != "true" ]; then
if [ "$CERT_TYPE" = "self-signed" ]; then
    cat > "$CONFIG_PATH/docker-compose.yml" << EOF
services:
  postgres:
    image: postgres:15-alpine
    container_name: filedrop-postgres
    environment:
      POSTGRES_DB: \${POSTGRES_DB}
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - \${DATA_PATH}/postgres:/var/lib/postgresql/data
    networks:
      - filedrop-network
    restart: unless-stopped

  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
    container_name: filedrop-backend
    environment:
      - PORT=3001
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=\${POSTGRES_DB}
      - DB_USER=\${POSTGRES_USER}
      - DB_PASSWORD=\${POSTGRES_PASSWORD}
      - STORAGE_TYPE=local
      - DATASTORE_PATH=/app/datastore
      - ADMIN_SECRET_PATH=\${ADMIN_SECRET_PATH}
      - JWT_SECRET=\${JWT_SECRET}
    volumes:
      - \${DATA_PATH}/uploads:/app/datastore
      - \${DATA_PATH}/temp:/app/datastore/temp
    depends_on:
      - postgres
    networks:
      - filedrop-network
    restart: unless-stopped

  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    container_name: filedrop-frontend
    networks:
      - filedrop-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: filedrop-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - \${CONFIG_PATH}/nginx-self-signed.conf:/etc/nginx/nginx.conf:ro
      - \${CERT_PATH}:/etc/nginx/certs:ro
    depends_on:
      - backend
      - frontend
    networks:
      - filedrop-network
    restart: unless-stopped

networks:
  filedrop-network:
    driver: bridge
EOF
else
    cat > "$CONFIG_PATH/docker-compose.yml" << EOF
services:
  postgres:
    image: postgres:15-alpine
    container_name: filedrop-postgres
    environment:
      POSTGRES_DB: \${POSTGRES_DB}
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - \${DATA_PATH}/postgres:/var/lib/postgresql/data
    networks:
      - filedrop-network
    restart: unless-stopped

  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
    container_name: filedrop-backend
    environment:
      - PORT=3001
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=\${POSTGRES_DB}
      - DB_USER=\${POSTGRES_USER}
      - DB_PASSWORD=\${POSTGRES_PASSWORD}
      - STORAGE_TYPE=local
      - DATASTORE_PATH=/app/datastore
      - ADMIN_SECRET_PATH=\${ADMIN_SECRET_PATH}
      - JWT_SECRET=\${JWT_SECRET}
    volumes:
      - \${DATA_PATH}/uploads:/app/datastore
      - \${DATA_PATH}/temp:/app/datastore/temp
    depends_on:
      - postgres
    networks:
      - filedrop-network
    restart: unless-stopped

  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    container_name: filedrop-frontend
    networks:
      - filedrop-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: filedrop-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - \${CONFIG_PATH}/nginx-letsencrypt.conf:/etc/nginx/nginx.conf:ro
      - \${CERT_PATH}:/etc/letsencrypt:ro
    depends_on:
      - backend
      - frontend
    networks:
      - filedrop-network
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    container_name: filedrop-certbot
    volumes:
      - \${CERT_PATH}:/etc/letsencrypt
      - \${DATA_PATH}/certbot-www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait \$\${!}; done;'"
    networks:
      - filedrop-network
    restart: unless-stopped

networks:
  filedrop-network:
    driver: bridge
EOF
fi
fi

if [ "$SKIP_COMPOSE" != "true" ]; then
    success "docker-compose.yml создан"
fi

# ============================================
# 8. Генерация nginx конфигурации
# ============================================
NGINX_CONF_NAME=""
if [ "$CERT_TYPE" = "self-signed" ]; then
    NGINX_CONF_NAME="nginx-self-signed.conf"
else
    NGINX_CONF_NAME="nginx-letsencrypt.conf"
fi

if [ -f "$CONFIG_PATH/$NGINX_CONF_NAME" ]; then
    warning "Файл $NGINX_CONF_NAME уже существует"
    read -p "Перезаписать его? [y/N]: " overwrite_nginx
    if [[ ! $overwrite_nginx =~ ^[Yy]$ ]]; then
        info "Используем существующий $NGINX_CONF_NAME"
        SKIP_NGINX=true
    fi
fi

if [ "$SKIP_NGINX" != "true" ]; then
    info "Создание nginx конфигурации..."
fi

if [ "$SKIP_NGINX" != "true" ]; then
if [ "$CERT_TYPE" = "self-signed" ]; then
    cat > "$CONFIG_PATH/$NGINX_CONF_NAME" << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    upstream backend {
        server backend:3001;
    }
    
    upstream frontend {
        server frontend:80;
    }
    
    server {
        listen 80;
        server_name $DOMAIN;
        return 301 https://\$server_name\$request_uri;
    }
    
    server {
        listen 443 ssl;
        server_name $DOMAIN;
        
        ssl_certificate /etc/nginx/certs/$DOMAIN.crt;
        ssl_certificate_key /etc/nginx/certs/$DOMAIN.key;
        
        # SSL optimization
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        
        client_max_body_size 100M;
        
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }
        
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }
        
        location /uploads {
            proxy_pass http://backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
    }
}
EOF
else
    cat > "$CONFIG_PATH/$NGINX_CONF_NAME" << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    upstream backend {
        server backend:3001;
    }
    
    upstream frontend {
        server frontend:80;
    }
    
    server {
        listen 80;
        server_name $DOMAIN;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://\$server_name\$request_uri;
        }
    }
    
    server {
        listen 443 ssl;
        server_name $DOMAIN;
        
        ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        
        client_max_body_size 100M;
        
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }
        
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }
        
        location /uploads {
            proxy_pass http://backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
    }
}
EOF
fi
fi

if [ "$SKIP_NGINX" != "true" ]; then
    success "Nginx конфигурация создана"
fi

# ============================================
# 9. Сборка Docker образов
# ============================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Шаг 7: Сборка Docker образов${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

info "Сборка Docker образов (frontend компилируется внутри контейнера)..."
echo ""

# ============================================
# 10. Запуск Docker
# ============================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Шаг 8: Запуск Docker контейнеров${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

read -p "Запустить Docker контейнеры сейчас? [Y/n]: " start_docker
start_docker=${start_docker:-Y}

if [[ $start_docker =~ ^[Yy]$ ]]; then
    info "Запуск Docker контейнеров..."
    cd "$CONFIG_PATH"
    docker compose up -d --build
    success "Контейнеры запущены"
fi

# ============================================
# Получение Let's Encrypt сертификата
# ============================================
if [ "$CERT_TYPE" = "letsencrypt" ]; then
    echo ""
    
    # Проверяем наличие существующего сертификата
    if [ -f "$CERT_PATH/live/$DOMAIN/fullchain.pem" ] && [ -f "$CERT_PATH/live/$DOMAIN/privkey.pem" ]; then
        success "Let's Encrypt сертификат уже существует: $CERT_PATH/live/$DOMAIN/"
        info "Пропускаем получение, используем существующий сертификат"
    else
        info "Получение Let's Encrypt сертификата..."
        cd "$CONFIG_PATH"
        docker compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot \
            --email $EMAIL --agree-tos --no-eff-email -d $DOMAIN
        
        success "Сертификат получен"
    fi
    
    info "Перезапуск nginx..."
    cd "$CONFIG_PATH"
    docker compose restart nginx
fi

# ============================================
# Финальное сообщение
# ============================================
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║                  Installation Complete!                   ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📍 URL:${NC}"
echo -e "   https://$DOMAIN"
echo ""
echo -e "${BLUE}🔐 Admin Panel:${NC}"
echo -e "   https://$DOMAIN$ADMIN_PATH"
echo ""
echo -e "${BLUE}🗄️  Database:${NC}"
echo -e "   Host: localhost:5432"
echo -e "   Database: $DB_NAME"
echo -e "   User: $DB_USER"
echo -e "   Password: $DB_PASSWORD"
echo ""
echo -e "${BLUE}📁 Storage:${NC}"
echo -e "   Backend: $BASE_PATH/backend"
echo -e "   Frontend: $BASE_PATH/frontend"
echo -e "   Config: $CONFIG_PATH"
echo -e "   Files: $DATA_PATH/uploads"
echo -e "   Temp: $DATA_PATH/temp"
echo -e "   PostgreSQL: $DATA_PATH/postgres"
echo -e "   Certificates: $CERT_PATH"
echo ""
echo -e "${BLUE}📋 Useful Commands:${NC}"
echo -e "   cd $CONFIG_PATH && docker compose ps          # Статус контейнеров"
echo -e "   cd $CONFIG_PATH && docker compose logs -f     # Логи"
echo -e "   cd $CONFIG_PATH && docker compose restart     # Перезапуск"
echo -e "   cd $CONFIG_PATH && docker compose down        # Остановка"
echo ""
if [ "$CERT_TYPE" = "self-signed" ]; then
    echo -e "${YELLOW}⚠️  Важно:${NC}"
    echo -e "   1. Добавьте в /etc/hosts:"
    echo -e "      <your-server-ip> $DOMAIN"
    echo -e "   2. Браузер будет предупреждать о self-signed сертификате"
    echo -e "   3. Это нормально для локальной сети"
    echo ""
fi
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Сохраните эту информацию в безопасном месте!${NC}"
echo ""

# Сохранение информации в файл
cat > "$CONFIG_PATH/INSTALL_INFO.txt" << EOF
FileDrop Installation Info
==========================
Generated: $(date)

URL: https://$DOMAIN
Admin Panel: https://$DOMAIN$ADMIN_PATH

Database:
  Host: localhost:5432
  Database: $DB_NAME
  User: $DB_USER
  Password: $DB_PASSWORD

Storage:
  Backend: $BASE_PATH/backend
  Frontend: $BASE_PATH/frontend
  Config: $CONFIG_PATH
  Files: $DATA_PATH/uploads
  Temp: $DATA_PATH/temp
  PostgreSQL: $DATA_PATH/postgres
  Certificates: $CERT_PATH

Certificate Type: $CERT_TYPE
Domain: $DOMAIN

Admin Credentials:
  (Setup on first visit to admin panel)
EOF

success "Информация сохранена в $CONFIG_PATH/INSTALL_INFO.txt"
echo ""
