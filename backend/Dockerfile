FROM node:20-alpine

WORKDIR /app

# Копируем package.json
COPY package*.json ./

# Устанавливаем только production зависимости
RUN npm install --omit=dev

# Копируем исходный код
COPY . .

# Создаём директорию для данных
RUN mkdir -p datastore

# Открываем порт
EXPOSE 3001

# Запускаем сервер
CMD ["node", "src/index.js"]
