import { Router } from 'express';
import { getAppConfig, updateSettings, invalidateCache } from '../config/settings.js';

export const settingsRouter = Router();

/**
 * GET /api/settings
 * Получить все настройки (для админки)
 */
settingsRouter.get('/', async (req, res) => {
  try {
    const config = await getAppConfig();
    res.json(config);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

/**
 * PUT /api/settings
 * Обновить настройки (для админки)
 * 
 * Body: {
 *   max_file_size_mb: 100,
 *   retention_options: '1,3,5,7,20,30',
 *   max_downloads_options: '1,2,5,7,unlimited',
 *   session_duration_days: 7,
 *   upload_rate_limit: 5,
 *   api_rate_limit: 60
 * }
 */
settingsRouter.put('/', async (req, res) => {
  try {
    const updates = req.body;

    // Валидация
    const allowedKeys = [
      'max_file_size_mb',
      'retention_options',
      'max_downloads_options',
      'session_duration_days',
      'upload_rate_limit',
      'api_rate_limit',
    ];

    for (const key of Object.keys(updates)) {
      if (!allowedKeys.includes(key)) {
        return res.status(400).json({ error: `Unknown setting: ${key}` });
      }
    }

    // Валидация значений
    if (updates.max_file_size_mb) {
      const size = parseInt(updates.max_file_size_mb);
      if (isNaN(size) || size < 1 || size > 10000) {
        return res.status(400).json({ error: 'Invalid max_file_size_mb (1-10000)' });
      }
    }

    if (updates.session_duration_days) {
      const days = parseInt(updates.session_duration_days);
      if (isNaN(days) || days < 1 || days > 365) {
        return res.status(400).json({ error: 'Invalid session_duration_days (1-365)' });
      }
    }

    if (updates.retention_options) {
      const options = updates.retention_options.split(',').map(s => parseInt(s.trim()));
      if (options.some(isNaN) || options.some(n => n < 1 || n > 365)) {
        return res.status(400).json({ error: 'Invalid retention_options' });
      }
    }

    if (updates.max_downloads_options) {
      const options = updates.max_downloads_options.split(',').map(s => s.trim());
      const valid = options.every(s => s === 'unlimited' || (!isNaN(parseInt(s)) && parseInt(s) > 0));
      if (!valid) {
        return res.status(400).json({ error: 'Invalid max_downloads_options' });
      }
    }

    // Обновляем настройки
    await updateSettings(updates);

    // Возвращаем обновлённые настройки
    const newConfig = await getAppConfig();
    res.json(newConfig);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * POST /api/settings/invalidate-cache
 * Инвалидировать кэш настроек (для отладки)
 */
settingsRouter.post('/invalidate-cache', (req, res) => {
  invalidateCache();
  res.json({ success: true, message: 'Cache invalidated' });
});
