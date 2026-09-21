import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import { getAppConfig, updateSettings, invalidateCache } from '../config/settings.js';
import pool from '../config/database.js';

export const adminPanelRouter = Router();

// Все роуты требуют авторизацию админа
adminPanelRouter.use(requireAdmin);

/**
 * GET /api/admin/panel/settings
 * Получить текущие настройки
 */
adminPanelRouter.get('/settings', async (req, res) => {
  try {
    const config = await getAppConfig();
    res.json(config);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

/**
 * PUT /api/admin/panel/settings
 * Обновить настройки
 */
adminPanelRouter.put('/settings', async (req, res) => {
  try {
    const updates = req.body;

    // Валидация ключей
    const allowedKeys = [
      'max_file_size_mb',
      'retention_options',
      'max_downloads_options',
      'session_duration_days',
      'upload_rate_limit',
      'api_rate_limit',
      'notification_email',
      'notification_webhook',
    ];

    for (const key of Object.keys(updates)) {
      if (!allowedKeys.includes(key)) {
        return res.status(400).json({ error: `Unknown setting: ${key}` });
      }
    }

    await updateSettings(updates);
    const newConfig = await getAppConfig();
    res.json(newConfig);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * GET /api/admin/panel/stats
 * Статистика системы
 */
adminPanelRouter.get('/stats', async (req, res) => {
  try {
    const stats = {};

    // Активные сессии
    const sessions = await pool.query(
      `SELECT COUNT(*) FROM sessions WHERE expires_at > NOW()`
    );
    stats.activeSessions = parseInt(sessions.rows[0].count);

    // Всего файлов
    const files = await pool.query(
      `SELECT COUNT(*) FROM files`
    );
    stats.totalFiles = parseInt(files.rows[0].count);

    // Активные файлы
    const activeFiles = await pool.query(
      `SELECT COUNT(*) FROM files WHERE expires_at > NOW() AND status = 'active'`
    );
    stats.activeFiles = parseInt(activeFiles.rows[0].count);

    // Общий размер файлов
    const size = await pool.query(
      `SELECT COALESCE(SUM(file_size), 0) as total FROM files`
    );
    stats.totalSizeBytes = parseInt(size.rows[0].total);

    // Всего скачиваний
    const downloads = await pool.query(
      `SELECT COALESCE(SUM(download_count), 0) as total FROM files`
    );
    stats.totalDownloads = parseInt(downloads.rows[0].total);

    // Текстовые сниппеты
    const snippets = await pool.query(
      `SELECT COUNT(*) FROM text_snippets`
    );
    stats.totalSnippets = parseInt(snippets.rows[0].count);

    // Последние загрузки
    const recentFiles = await pool.query(
      `SELECT original_name, file_size, created_at, download_count 
       FROM files ORDER BY created_at DESC LIMIT 10`
    );
    stats.recentFiles = recentFiles.rows;

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/admin/panel/files
 * Список всех файлов
 */
adminPanelRouter.get('/files', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT f.id, f.original_name, f.file_size, f.mime_type, f.short_link,
              f.max_downloads, f.download_count, f.expires_at, f.status, f.created_at,
              f.has_password, s.token as session_token
       FROM files f
       LEFT JOIN sessions s ON f.session_id = s.id
       ORDER BY f.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query(`SELECT COUNT(*) FROM files`);

    res.json({
      files: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (error) {
    console.error('Files list error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

/**
 * DELETE /api/admin/panel/files/:id
 * Удалить файл (админ может удалить любой)
 */
adminPanelRouter.delete('/files/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT storage_path FROM files WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Удаляем из БД (физический файл будет удалён при следующей очистке)
    await pool.query(`DELETE FROM files WHERE id = $1`, [req.params.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

/**
 * POST /api/admin/panel/invalidate-cache
 * Инвалидировать кэш настроек
 */
adminPanelRouter.post('/invalidate-cache', (req, res) => {
  invalidateCache();
  res.json({ success: true });
});

/**
 * GET /api/admin/panel/me
 * Информация о текущем админе
 */
adminPanelRouter.get('/me', (req, res) => {
  res.json({
    id: req.admin.id,
    username: req.admin.username,
  });
});
