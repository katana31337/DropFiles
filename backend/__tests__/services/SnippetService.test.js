import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Мокаем зависимости
jest.unstable_mockModule('../../src/repositories/SnippetRepository.js', () => ({
  snippetRepository: {
    create: jest.fn(),
    findByShortLink: jest.fn(),
    incrementViewCount: jest.fn(),
    findBySessionId: jest.fn(),
    isShortLinkUnique: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/utils/shortLink.js', () => ({
  generateShortLink: jest.fn(() => 'snip1234'),
}));

jest.unstable_mockModule('../../src/utils/hash.js', () => ({
  hashPassword: jest.fn((pwd) => Promise.resolve(`hashed_${pwd}`)),
  verifyPassword: jest.fn((pwd, hash) => Promise.resolve(hash === `hashed_${pwd}`)),
}));

const { snippetRepository } = await import('../../src/repositories/SnippetRepository.js');
const { generateShortLink } = await import('../../src/utils/shortLink.js');
const { hashPassword } = await import('../../src/utils/hash.js');
const { SnippetService } = await import('../../src/services/SnippetService.js');

describe('SnippetService - сервис работы со сниппетами', () => {
  let snippetService;

  beforeEach(() => {
    jest.clearAllMocks();
    snippetService = new SnippetService();
  });

  describe('create - создание сниппета', () => {
    it('должен успешно создавать сниппет', async () => {
      const content = 'console.log("привет");';
      const options = {
        title: 'Тестовый сниппет',
        language: 'javascript',
        retentionDays: '7',
        maxViews: 'unlimited',
      };

      snippetRepository.isShortLinkUnique.mockResolvedValue(true);
      snippetRepository.create.mockResolvedValue({
        id: 'snippet-1',
        short_link: 'snip1234',
        title: 'Тестовый сниппет',
        language: 'javascript',
        expires_at: new Date(),
      });

      const result = await snippetService.create(content, options, 'session-1');

      expect(snippetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          content: 'console.log("привет");',
          title: 'Тестовый сниппет',
          language: 'javascript',
          shortLink: 'snip1234',
        })
      );
      expect(result.short_link).toBe('snip1234');
    });

    it('должен хэшировать пароль если он предоставлен', async () => {
      const content = 'секретный код';
      const options = {
        retentionDays: '7',
        maxViews: 'unlimited',
        password: 'secret123',
      };

      snippetRepository.isShortLinkUnique.mockResolvedValue(true);
      snippetRepository.create.mockResolvedValue({ id: '1' });

      await snippetService.create(content, options, 'session-1');

      expect(hashPassword).toHaveBeenCalledWith('secret123');
      expect(snippetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: 'hashed_secret123',
        })
      );
    });

    it('должен устанавливать maxViews в null для unlimited', async () => {
      const content = 'тест';
      const options = {
        retentionDays: '7',
        maxViews: 'unlimited',
      };

      snippetRepository.isShortLinkUnique.mockResolvedValue(true);
      snippetRepository.create.mockResolvedValue({ id: '1' });

      await snippetService.create(content, options, 'session-1');

      expect(snippetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          maxViews: null,
        })
      );
    });

    it('должен устанавливать maxViews в число когда указано', async () => {
      const content = 'тест';
      const options = {
        retentionDays: '7',
        maxViews: '5',
      };

      snippetRepository.isShortLinkUnique.mockResolvedValue(true);
      snippetRepository.create.mockResolvedValue({ id: '1' });

      await snippetService.create(content, options, 'session-1');

      expect(snippetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          maxViews: 5,
        })
      );
    });
  });

  describe('getSnippet - получение сниппета', () => {
    it('должен возвращать данные сниппета', async () => {
      const mockSnippet = {
        content: 'console.log("тест");',
        title: 'Тест',
        language: 'javascript',
        password_hash: null,
        max_views: null,
        view_count: 10,
        expires_at: new Date(Date.now() + 86400000),
      };

      snippetRepository.findByShortLink.mockResolvedValue(mockSnippet);

      const result = await snippetService.getSnippet('snip1234');

      expect(result.content).toBe('console.log("тест");');
      expect(result.title).toBe('Тест');
      expect(result.hasPassword).toBe(false);
      expect(result.viewCount).toBe(10);
    });

    it('должен выбрасывать ошибку если сниппет не найден', async () => {
      snippetRepository.findByShortLink.mockResolvedValue(null);

      await expect(snippetService.getSnippet('nonexistent')).rejects.toThrow('Snippet not found');
    });

    it('должен выбрасывать ошибку если срок действия сниппета истёк', async () => {
      const mockSnippet = {
        content: 'тест',
        title: 'Тест',
        language: null,
        password_hash: null,
        max_views: null,
        view_count: 0,
        expires_at: new Date(Date.now() - 86400000), // вчера
      };

      snippetRepository.findByShortLink.mockResolvedValue(mockSnippet);

      await expect(snippetService.getSnippet('snip1234')).rejects.toThrow('Snippet expired');
    });

    it('должен выбрасывать ошибку если достигнут лимит просмотров', async () => {
      const mockSnippet = {
        content: 'тест',
        title: 'Тест',
        language: null,
        password_hash: null,
        max_views: 5,
        view_count: 5,
        expires_at: new Date(Date.now() + 86400000),
      };

      snippetRepository.findByShortLink.mockResolvedValue(mockSnippet);

      await expect(snippetService.getSnippet('snip1234')).rejects.toThrow('View limit reached');
    });
  });

  describe('verifyPassword - проверка пароля', () => {
    it('должен возвращать true для сниппета без пароля', async () => {
      snippetRepository.findByShortLink.mockResolvedValue({
        password_hash: null,
      });

      const result = await snippetService.verifyPassword('snip1234', 'anypassword');
      expect(result).toBe(true);
    });

    it('должен проверять корректный пароль', async () => {
      snippetRepository.findByShortLink.mockResolvedValue({
        password_hash: 'hashed_secret123',
      });

      const result = await snippetService.verifyPassword('snip1234', 'secret123');
      expect(result).toBe(true);
    });

    it('должен отклонять некорректный пароль', async () => {
      snippetRepository.findByShortLink.mockResolvedValue({
        password_hash: 'hashed_secret123',
      });

      const result = await snippetService.verifyPassword('snip1234', 'wrongpassword');
      expect(result).toBe(false);
    });
  });

  describe('incrementView - увеличение счётчика просмотров', () => {
    it('должен увеличивать счётчик просмотров', async () => {
      await snippetService.incrementView('snip1234');

      expect(snippetRepository.incrementViewCount).toHaveBeenCalledWith('snip1234');
    });
  });

  describe('getSessionHistory - получение истории сессии', () => {
    it('должен возвращать отформатированную историю', async () => {
      const mockSnippets = [
        {
          id: '1',
          short_link: 'snip1',
          title: 'Сниппет 1',
          language: 'javascript',
          max_views: null,
          view_count: 5,
          expires_at: new Date(Date.now() + 86400000),
          status: 'active',
          has_password: false,
          created_at: new Date(),
        },
        {
          id: '2',
          short_link: 'snip2',
          title: 'Сниппет 2',
          language: 'python',
          max_views: 10,
          view_count: 10,
          expires_at: new Date(Date.now() + 86400000),
          status: 'active',
          has_password: true,
          created_at: new Date(),
        },
      ];

      snippetRepository.findBySessionId.mockResolvedValue(mockSnippets);

      const history = await snippetService.getSessionHistory('session-1');

      expect(history).toHaveLength(2);
      expect(history[0].shortLink).toBe('snip1');
      expect(history[0].status).toBe('active');
      expect(history[1].status).toBe('max_views_reached');
      expect(history[1].hasPassword).toBe(true);
    });

    it('должен помечать истёкшие сниппеты', async () => {
      const mockSnippets = [
        {
          id: '1',
          short_link: 'snip1',
          title: 'Истёкший',
          language: null,
          max_views: null,
          view_count: 0,
          expires_at: new Date(Date.now() - 86400000),
          status: 'active',
          has_password: false,
          created_at: new Date(),
        },
      ];

      snippetRepository.findBySessionId.mockResolvedValue(mockSnippets);

      const history = await snippetService.getSessionHistory('session-1');
      expect(history[0].status).toBe('expired');
    });
  });
});
