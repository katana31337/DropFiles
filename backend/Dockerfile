# Backend Dockerfile

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Create datastore directory
RUN mkdir -p /app/datastore

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "src/index.js"]
