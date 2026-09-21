# Этап 1: Сборка frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Собираем production build
RUN npm run build

# Этап 2: Production образ с nginx
FROM nginx:alpine

# Копируем собранные файлы из builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем nginx конфигурацию (будет создана install.sh)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]
