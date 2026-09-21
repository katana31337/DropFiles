#!/bin/bash

# FileDrop Installation Script
# Интерактивная установка с генерацией конфигурации

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

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    error "Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
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
# 1. Выбор типа сертификата
# ============================================
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Шаг 1: SSL/TLS Сертификат${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Выберите тип SSL сертификата:"
echo ""
echo "  1) Self-signed (для локальной сети / fileshare.local)"
echo "  2) Let's Encrypt (для публичного домена)"
echo ""

read -p "Ваш выбор [1/2]: " cert_choice

case $cert_choice in
    1)
        CERT_TYPE="self-signed"
        echo ""
        read -p "Введите домен [fileshare.local]: " DOMAIN
        DOMAIN=${DOMAIN:-fileshare.local}
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
        ;;
    *)
        error "Неверный выбор"
        ;;
esac

success "Тип сертификата: $CERT_TYPE"
success "Домен: $DOMAIN"

# ============================================
# 2. Настройка PostgreSQL
# ============================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Шаг 2: База данных PostgreSQL${NC}"
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
# 3. Настройка админки
# ============================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Шаг 3: Админ-панель${NC}"
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
# 4. Создание директорий
# ============================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Шаг 4: Создание директорий${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

DATASTORE_PATH="/datastore"

if [ ! -d "$DATASTORE_PATH" ]; then
    info "Создание директории $DATASTORE_PATH..."
    sudo mkdir -p "$DATASTORE_PATH"
    sudo chmod 755 "$DATASTORE_PATH"
    success "Директория создана"
else
    success "Директория $DATASTORE_PATH уже существует"
fi

# Создание поддиректорий
sudo mkdir -p "$DATASTORE_PATH/uploads"
sudo mkdir -p "$DATASTORE_PATH/temp"
sudo mkdir -p "$DATASTORE_PATH/postgres"
sudo mkdir -p "$DATASTORE_PATH/certs"

success "Поддиректории созданы"

# ============================================
# 5. Генерация сертификатов (если self-signed)
# ============================================
if [ "$CERT_TYPE" = "self-signed" ]; then
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Шаг 5: Генерация self-signed сертификата${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    info "Генерация self-signed сертификата для $DOMAIN..."
    
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$DATASTORE_PATH/certs/$DOMAIN.key" \
        -out "$DATASTORE_PATH/certs/$DOMAIN.crt" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN" \
        -addext "subjectAltName=DNS:$DOMAIN,DNS:www.$DOMAIN" 2>/dev/null
    
    success "Сертификат создан"
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

info "Создание .env файла..."

cat > .env << EOF
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

# Storage
DATASTORE_PATH=$DATASTORE_PATH
EOF

success ".env файл создан"

# ============================================
# 7. Генерация docker-compose.yml
# ============================================
info "Генерация docker-compose.yml..."

if [ "$CERT_TYPE" = "self-signed" ]; then
    cat > docker-compose.yml << EOF
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: filedrop-postgres
    environment:
      POSTGRES_DB: \${POSTGRES_DB}
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - \${DATASTORE_PATH}/postgres:/var/lib/postgresql/data
    networks:
      - filedrop-network
    restart: unless-stopped

  backend:
    build: ./backend
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
      - \${DATASTORE_PATH}/uploads:/app/datastore
      - \${DATASTORE_PATH}/temp:/app/datastore/temp
    depends_on:
      - postgres
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
      - ./nginx-self-signed.conf:/etc/nginx/nginx.conf:ro
      - \${DATASTORE_PATH}/certs:/etc/nginx/certs:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
    depends_on:
      - backend
    networks:
      - filedrop-network
    restart: unless-stopped

networks:
  filedrop-network:
    driver: bridge
EOF
else
    cat > docker-compose.yml << EOF
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: filedrop-postgres
    environment:
      POSTGRES_DB: \${POSTGRES_DB}
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - \${DATASTORE_PATH}/postgres:/var/lib/postgresql/data
    networks:
      - filedrop-network
    restart: unless-stopped

  backend:
    build: ./backend
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
      - \${DATASTORE_PATH}/uploads:/app/datastore
      - \${DATASTORE_PATH}/temp:/app/datastore/temp
    depends_on:
      - postgres
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
      - ./nginx-letsencrypt.conf:/etc/nginx/nginx.conf:ro
      - \${DATASTORE_PATH}/certs:/etc/letsencrypt:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
    depends_on:
      - backend
    networks:
      - filedrop-network
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    container_name: filedrop-certbot
    volumes:
      - \${DATASTORE_PATH}/certs:/etc/letsencrypt
      - \${DATASTORE_PATH}/certbot-www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait \$\${!}; done;'"
    networks:
      - filedrop-network
    restart: unless-stopped

networks:
  filedrop-network:
    driver: bridge
EOF
fi

success "docker-compose.yml создан"

# ============================================
# 8. Генерация nginx конфигурации
# ============================================
info "Создание nginx конфигурации..."

if [ "$CERT_TYPE" = "self-signed" ]; then
    cat > nginx-self-signed.conf << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    upstream backend {
        server backend:3001;
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
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        
        client_max_body_size 100M;
        
        location / {
            root /usr/share/nginx/html;
            try_files \$uri \$uri/ /index.html;
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
    cat > nginx-letsencrypt.conf << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    upstream backend {
        server backend:3001;
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
            root /usr/share/nginx/html;
            try_files \$uri \$uri/ /index.html;
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

success "Nginx конфигурация создана"

# ============================================
# 9. Сборка frontend
# ============================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Шаг 7: Сборка frontend${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

info "Сборка frontend..."
npm install
npm run build
success "Frontend собран"

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
    docker-compose up -d --build
    success "Контейнеры запущены"
fi

# ============================================
# Получение Let's Encrypt сертификата
# ============================================
if [ "$CERT_TYPE" = "letsencrypt" ]; then
    echo ""
    info "Получение Let's Encrypt сертификата..."
    docker-compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot \
        --email $EMAIL --agree-tos --no-eff-email -d $DOMAIN
    
    info "Перезапуск nginx..."
    docker-compose restart nginx
    success "Сертификат получен"
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
echo -e "   Files: $DATASTORE_PATH/uploads"
echo -e "   Temp: $DATASTORE_PATH/temp"
echo -e "   PostgreSQL: $DATASTORE_PATH/postgres"
echo -e "   Certificates: $DATASTORE_PATH/certs"
echo ""
echo -e "${BLUE}📋 Useful Commands:${NC}"
echo -e "   docker-compose ps          # Статус контейнеров"
echo -e "   docker-compose logs -f     # Логи"
echo -e "   docker-compose restart     # Перезапуск"
echo -e "   docker-compose down        # Остановка"
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
cat > INSTALL_INFO.txt << EOF
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
  Files: $DATASTORE_PATH/uploads
  Temp: $DATASTORE_PATH/temp
  PostgreSQL: $DATASTORE_PATH/postgres
  Certificates: $DATASTORE_PATH/certs

Certificate Type: $CERT_TYPE
Domain: $DOMAIN

Admin Credentials:
  (Setup on first visit to admin panel)
EOF

success "Информация сохранена в INSTALL_INFO.txt"
echo ""
