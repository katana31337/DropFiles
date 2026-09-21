import { Router } from 'express';
import { getAppConfig } from '../config/settings.js';

/**
 * Публичные настройки — доступны без авторизации.
 * Используются фронтендом для отображения опций в UI.
 */
export const publicSettingsRouter = Router();

/**
 * GET /api/settings/public
 * Получить публичные настройки (опции для UI)
 */
publicSettingsRouter.get('/public', async (req, res) => {
  try {
    const config = await getAppConfig();
    
    res.json({
      retentionDays: config.files.retentionDays,
      maxDownloadsOptions: config.files.maxDownloadsOptions.map(opt => 
        opt === null ? '*' : opt
      ),
      maxFileSizeMB: config.files.maxFileSizeMB,
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});
