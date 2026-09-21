import { Router } from 'express';
import { getAppConfig } from '../config/settings.js';
import { snippetService } from '../services/SnippetService.js';
import { requireSession } from '../middleware/session.js';

export const snippetsRouter = Router();

/**
 * POST /api/snippets
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

    // Валидация retentionDays
    if (!appConfig.files.retentionDays.includes(parseInt(retentionDays))) {
      return res.status(400).json({ error: 'Invalid retention days' });
    }

    const maxV = maxViews === '*' ? null : parseInt(maxViews);
    if (maxV !== null && !appConfig.files.maxDownloadsOptions.includes(maxV)) {
      return res.status(400).json({ error: 'Invalid max views' });
    }

    // Используем сервис
    const result = await snippetService.create(content, {
      title,
      language,
      retentionDays,
      maxViews,
      password,
    }, req.session.id);

    res.json({
      id: result.id,
      shortLink: result.short_link,
      title: result.title,
      language: result.language,
      viewUrl: `/text/${result.short_link}`,
      expiresAt: result.expires_at,
      maxViews: result.max_views,
      hasPassword: !!password,
    });
  } catch (error) {
    console.error('Create snippet error:', error);
    res.status(500).json({ error: 'Failed to create snippet' });
  }
});

/**
 * GET /api/snippets/:shortLink
 */
snippetsRouter.get('/:shortLink', async (req, res) => {
  try {
    const snippet = await snippetService.getSnippet(req.params.shortLink);
    res.json(snippet);
  } catch (error) {
    if (error.message === 'Snippet not found') {
      return res.status(404).json({ error: 'Snippet not found' });
    }
    if (error.message === 'Snippet expired') {
      return res.status(410).json({ error: 'Snippet expired' });
    }
    if (error.message === 'View limit reached') {
      return res.status(410).json({ error: 'View limit reached' });
    }
    console.error('Get snippet error:', error);
    res.status(500).json({ error: 'Failed to get snippet' });
  }
});

/**
 * POST /api/snippets/:shortLink/verify-password
 */
snippetsRouter.post('/:shortLink/verify-password', async (req, res) => {
  try {
    const isValid = await snippetService.verifyPassword(req.params.shortLink, req.body.password);
    res.json({ valid: isValid });
  } catch (error) {
    if (error.message === 'Snippet not found') {
      return res.status(404).json({ error: 'Snippet not found' });
    }
    console.error('Password verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * POST /api/snippets/:shortLink/view
 */
snippetsRouter.post('/:shortLink/view', async (req, res) => {
  try {
    await snippetService.incrementView(req.params.shortLink);
    res.json({ success: true });
  } catch (error) {
    console.error('View count error:', error);
    res.status(500).json({ error: 'Failed to update view count' });
  }
});

/**
 * GET /api/snippets/history
 */
snippetsRouter.get('/history', requireSession, async (req, res) => {
  try {
    const snippets = await snippetService.getSessionHistory(req.session.id);
    res.json({ snippets });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});
