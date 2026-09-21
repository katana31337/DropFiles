import { Router } from 'express';
import pool from '../config/database.js';
import { getAppConfig } from '../config/settings.js';
import { generateShortLink } from '../utils/shortLink.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';
import { requireSession } from '../middleware/session.js';

export const snippetsRouter = Router();

/**
 * POST /api/snippets
 * Создать текстовый сниппет
 */
snippetsRouter.post('/', requireSession, async (req, res) => {
  try {
    const { content, title, language, password, maxViews, retentionDays } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (content.length > 100000) {
      return res.status(400).json({ error: 'Content too long (max 100KB)' });
    }

    // Получаем настройки из БД
    const appConfig = await getAppConfig();

    // Валидация параметров
    const days = parseInt(retentionDays) || 7;
    if (!appConfig.files.retentionDays.includes(days)) {
      return res.status(400).json({ error: 'Invalid retention days' });
    }

    const maxV = maxViews === 'unlimited' ? null : parseInt(maxViews);
    if (maxV !== null && !appConfig.files.maxDownloadsOptions.includes(maxV)) {
      return res.status(400).json({ error: 'Invalid max views' });
    }

    // Генерируем уникальную короткую ссылку
    let shortLink;
    let isUnique = false;
    let retries = 0;
    while (!isUnique && retries < 5) {
      shortLink = generateShortLink();
      const existing = await pool.query(
        'SELECT id FROM text_snippets WHERE short_link = $1',
        [shortLink]
      );
      isUnique = existing.rows.length === 0;
      retries++;
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate unique link' });
    }

    // Хэшируем пароль если есть
    const passwordHash = password ? await hashPassword(password) : null;

    // Вычисляем срок хранения
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Сохраняем в БД
    const result = await pool.query(
      `INSERT INTO text_snippets (
        session_id, short_link, content, title, language, 
        password_hash, max_views, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, short_link, title, language, expires_at, max_views, view_count`,
      [
        req.session.id,
        shortLink,
        content,
        title || null,
        language || null,
        passwordHash,
        maxV,
        expiresAt,
      ]
    );

    const snippet = result.rows[0];

    res.json({
      id: snippet.id,
      shortLink: snippet.short_link,
      title: snippet.title,
      language: snippet.language,
      viewUrl: `/text/${snippet.short_link}`,
      expiresAt: snippet.expires_at,
      maxViews: snippet.max_views,
      hasPassword: !!password,
    });
  } catch (error) {
    console.error('Create snippet error:', error);
    res.status(500).json({ error: 'Failed to create snippet' });
  }
});

/**
 * GET /api/snippets/:shortLink
 * Получить сниппет
 */
snippetsRouter.get('/:shortLink', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, content, title, language, password_hash, 
              max_views, view_count, expires_at, status
       FROM text_snippets WHERE short_link = $1`,
      [req.params.shortLink]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    const snippet = result.rows[0];

    // Проверка срока
    if (new Date(snippet.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Snippet expired' });
    }

    // Проверка лимита просмотров
    if (snippet.max_views !== null && snippet.view_count >= snippet.max_views) {
      return res.status(410).json({ error: 'View limit reached' });
    }

    res.json({
      content: snippet.content,
      title: snippet.title,
      language: snippet.language,
      hasPassword: !!snippet.password_hash,
      maxViews: snippet.max_views,
      viewCount: snippet.view_count,
      expiresAt: snippet.expires_at,
    });
  } catch (error) {
    console.error('Get snippet error:', error);
    res.status(500).json({ error: 'Failed to get snippet' });
  }
});

/**
 * POST /api/snippets/:shortLink/verify-password
 * Проверить пароль для сниппета
 */
snippetsRouter.post('/:shortLink/verify-password', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT password_hash FROM text_snippets WHERE short_link = $1',
      [req.params.shortLink]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    const snippet = result.rows[0];

    if (!snippet.password_hash) {
      return res.json({ valid: true });
    }

    const isValid = await verifyPassword(req.body.password, snippet.password_hash);
    res.json({ valid: isValid });
  } catch (error) {
    console.error('Password verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * POST /api/snippets/:shortLink/view
 * Увеличить счётчик просмотров
 */
snippetsRouter.post('/:shortLink/view', async (req, res) => {
  try {
    await pool.query(
      'UPDATE text_snippets SET view_count = view_count + 1 WHERE short_link = $1',
      [req.params.shortLink]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('View count error:', error);
    res.status(500).json({ error: 'Failed to update view count' });
  }
});

/**
 * GET /api/snippets/history
 * Получить историю сниппетов текущей сессии
 */
snippetsRouter.get('/history', requireSession, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, short_link, title, language, max_views, view_count, 
              expires_at, status, created_at,
              CASE WHEN password_hash IS NOT NULL THEN true ELSE false END as has_password
       FROM text_snippets 
       WHERE session_id = $1
       ORDER BY created_at DESC`,
      [req.session.id]
    );

    const snippets = result.rows.map(snippet => {
      const isExpired = new Date(snippet.expires_at) < new Date();
      const maxReached = snippet.max_views !== null && snippet.view_count >= snippet.max_views;

      return {
        id: snippet.id,
        shortLink: snippet.short_link,
        title: snippet.title,
        language: snippet.language,
        maxViews: snippet.max_views,
        viewCount: snippet.view_count,
        expiresAt: snippet.expires_at,
        status: isExpired ? 'expired' : maxReached ? 'max_views_reached' : snippet.status,
        hasPassword: snippet.has_password,
        createdAt: snippet.created_at,
      };
    });

    res.json({ snippets });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});
