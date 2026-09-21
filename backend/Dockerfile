FROM node:20-alpine

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Создаём директорию для данных
RUN mkdir -p datastore

# Открываем порт
EXPOSE 3001

# Запускаем сервер
CMD ["node", "src/index.js"]
