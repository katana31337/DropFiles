import { snippetRepository } from '../repositories/SnippetRepository.js';
import { generateShortLink } from '../utils/shortLink.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';

/**
 * SnippetService — бизнес-логика для текстовых сниппетов.
 */
export class SnippetService {
  constructor() {
    this.repository = snippetRepository;
  }

  /**
   * Создать сниппет
   */
  async create(content, options, sessionId) {
    const { title, language, retentionDays, maxViews, password } = options;

    // Вычисляем срок хранения
    const days = parseInt(retentionDays);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Генерируем уникальную короткую ссылку
    const shortLink = await this.generateUniqueShortLink();

    // Хэшируем пароль если есть
    const passwordHash = password ? await hashPassword(password) : null;

    // Сохраняем в БД
    const snippet = await this.repository.create({
      sessionId,
      shortLink,
      content,
      title,
      language,
      passwordHash,
      maxViews: maxViews === '*' ? null : parseInt(maxViews),
      expiresAt,
    });

    return snippet;
  }

  /**
   * Получить сниппет
   */
  async getSnippet(shortLink) {
    const snippet = await this.repository.findByShortLink(shortLink);
    if (!snippet) {
      throw new Error('Snippet not found');
    }

    if (new Date(snippet.expires_at) < new Date()) {
      throw new Error('Snippet expired');
    }

    if (snippet.max_views !== null && snippet.view_count >= snippet.max_views) {
      throw new Error('View limit reached');
    }

    return {
      content: snippet.content,
      title: snippet.title,
      language: snippet.language,
      hasPassword: !!snippet.password_hash,
      maxViews: snippet.max_views,
      viewCount: snippet.view_count,
      expiresAt: snippet.expires_at,
    };
  }

  /**
   * Проверить пароль
   */
  async verifyPassword(shortLink, password) {
    const snippet = await this.repository.findByShortLink(shortLink);
    if (!snippet) {
      throw new Error('Snippet not found');
    }

    if (!snippet.password_hash) {
      return true;
    }

    return await verifyPassword(password, snippet.password_hash);
  }

  /**
   * Увеличить счётчик просмотров
   */
  async incrementView(shortLink) {
    await this.repository.incrementViewCount(shortLink);
  }

  /**
   * Получить историю сниппетов сессии
   */
  async getSessionHistory(sessionId) {
    const snippets = await this.repository.findBySessionId(sessionId);

    return snippets.map(snippet => {
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
  }

  /**
   * Генерация уникальной короткой ссылки
   */
  async generateUniqueShortLink(maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
      const shortLink = generateShortLink();
      const isUnique = await this.repository.isShortLinkUnique(shortLink);
      if (isUnique) {
        return shortLink;
      }
    }
    throw new Error('Failed to generate unique short link after retries');
  }
}

export const snippetService = new SnippetService();
