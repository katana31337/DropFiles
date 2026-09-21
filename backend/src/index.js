import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { initDatabase } from './config/database.js';
import { sessionMiddleware } from './middleware/session.js';
import { filesRouter } from './routes/files.js';
import { sessionsRouter } from './routes/sessions.js';
import { startCleanupJob } from './services/CleanupService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Session middleware — создаёт/обновляет сессию для каждого запроса
app.use(sessionMiddleware);

// Routes
app.use('/api/files', filesRouter);
app.use('/api/sessions', sessionsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    session: req.session?.id,
    timestamp: new Date().toISOString(),
  });
});

// Serve uploaded files (в продакшене — через nginx)
app.use('/uploads', express.static(join(__dirname, '..', 'datastore')));

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start
async function start() {
  try {
    // Инициализация БД
    await initDatabase();
    console.log('✓ Database initialized');

    // Запуск cron очистки
    startCleanupJob();
    console.log('✓ Cleanup job scheduled');

    // Запуск сервера
    app.listen(PORT, () => {
      console.log(`✓ FileDrop server running on http://localhost:${PORT}`);
      console.log(`  Datastore: ./datastore`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
