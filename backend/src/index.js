import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { initDatabase } from './config/database.js';
import { config } from './config/app.js';
import { getAppConfig } from './config/settings.js';
import { sessionMiddleware } from './middleware/session.js';
import { rateLimit } from './middleware/rateLimit.js';
import { filesRouter } from './routes/files.js';
import { sessionsRouter } from './routes/sessions.js';
import { settingsRouter } from './routes/settings.js';
import { startCleanupJob } from './services/CleanupService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(cors({
  origin: config.server.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Trust proxy (для корректного определения IP за nginx)
app.set('trust proxy', 1);

// Global rate limiting (статический лимит, динамический будет в middleware)
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 100, // Дефолт, реальный лимит из БД применяется в settingsRouter
}));

// Session middleware
app.use(sessionMiddleware);

// Routes
app.use('/api/files', filesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/settings', settingsRouter);

// Health check (без rate limiting)
app.get('/api/health', async (req, res) => {
  try {
    const appConfig = await getAppConfig();
    
    res.json({
      status: 'ok',
      session: req.session?.id,
      timestamp: new Date().toISOString(),
      config: {
        maxFileSizeMB: appConfig.files.maxFileSizeMB,
        sessionDurationDays: appConfig.session.durationDays,
        storageType: config.storage.type,
        retentionDays: appConfig.files.retentionDays,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: 'Database connection failed',
    });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(join(__dirname, '..', config.storage.datastorePath)));

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ 
      error: `File too large. Maximum: ${config.files.maxFileSizeMB} MB` 
    });
  }

  res.status(500).json({ error: 'Internal server error' });
});

// Start
async function start() {
  try {
    await initDatabase();
    console.log('✓ Database initialized');

    // Загружаем настройки из БД
    const appConfig = await getAppConfig();
    console.log('✓ Settings loaded from database');

    startCleanupJob();
    console.log('✓ Cleanup job scheduled');

    app.listen(config.server.port, () => {
      console.log(`✓ FileDrop server running on http://localhost:${config.server.port}`);
      console.log(`  Storage: ${config.storage.type} → ${config.storage.datastorePath}`);
      console.log(`  Max file size: ${appConfig.files.maxFileSizeMB} MB`);
      console.log(`  Session duration: ${appConfig.session.durationDays} days`);
      console.log(`  Retention options: ${appConfig.files.retentionDays.join(', ')} days`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
