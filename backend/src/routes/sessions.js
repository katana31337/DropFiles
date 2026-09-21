import { Router } from 'express';
import pool from '../config/database.js';

export const sessionsRouter = Router();

/**
 * GET /api/sessions/me
 * Информация о текущей сессии
 */
sessionsRouter.get('/me', (req, res) => {
  if (!req.session) {
    return res.status(401).json({ error: 'No active session' });
  }

  res.json({
    id: req.session.id,
    expiresAt: req.session.expiresAt,
    expiresIn: Math.max(0, req.session.expiresAt - Date.now()),
  });
});

/**
 * DELETE /api/sessions/me
 * Удалить текущую сессию (и всю историю)
 */
sessionsRouter.delete('/me', async (req, res) => {
  try {
    if (!req.session) {
      return res.status(401).json({ error: 'No active session' });
    }

    // Каскадное удаление файлов из истории (ON DELETE CASCADE)
    await pool.query('DELETE FROM sessions WHERE id = $1', [req.session.id]);

    // Удаляем cookie
    res.clearCookie('filedrop_session', { path: '/' });

    res.json({ success: true });
  } catch (error) {
    console.error('Session delete error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});
