import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Мокаем зависимости
jest.unstable_mockModule('../repositories/SnippetRepository.js', () => ({
  snippetRepository: {
    create: jest.fn(),
    findByShortLink: jest.fn(),
    incrementViewCount: jest.fn(),
    findBySessionId: jest.fn(),
    isShortLinkUnique: jest.fn(),
  },
}));

jest.unstable_mockModule('../utils/shortLink.js', () => ({
  generateShortLink: jest.fn(() => 'snip1234'),
}));

jest.unstable_mockModule('../utils/hash.js', () => ({
  hashPassword: jest.fn((pwd) => Promise.resolve(`hashed_${pwd}`)),
  verifyPassword: jest.fn((pwd, hash) => Promise.resolve(hash === `hashed_${pwd}`)),
}));

const { snippetRepository } = await import('../repositories/SnippetRepository.js');
const { generateShortLink } = await import('../utils/shortLink.js');
const { hashPassword } = await import('../utils/hash.js');
const { SnippetService } = await import('../services/SnippetService.js');

describe('SnippetService', () => {
  let snippetService;

  beforeEach(() => {
    jest.clearAllMocks();
    snippetService = new SnippetService();
  });

  describe('create', () => {
    it('should create snippet successfully', async () => {
      const content = 'console.log("hello");';
      const options = {
        title: 'Test Snippet',
        language: 'javascript',
        retentionDays: '7',
        maxViews: 'unlimited',
      };

      snippetRepository.isShortLinkUnique.mockResolvedValue(true);
      snippetRepository.create.mockResolvedValue({
        id: 'snippet-1',
        short_link: 'snip1234',
        title: 'Test Snippet',
        language: 'javascript',
        expires_at: new Date(),
      });

      const result = await snippetService.create(content, options, 'session-1');

      expect(snippetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          content: 'console.log("hello");',
          title: 'Test Snippet',
          language: 'javascript',
          shortLink: 'snip1234',
        })
      );
      expect(result.short_link).toBe('snip1234');
    });

    it('should hash password when provided', async () => {
      const content = 'secret code';
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

    it('should set maxViews to null for unlimited', async () => {
      const content = 'test';
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

    it('should set maxViews to number when specified', async () => {
      const content = 'test';
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

  describe('getSnippet', () => {
    it('should return snippet data', async () => {
      const mockSnippet = {
        content: 'console.log("test");',
        title: 'Test',
        language: 'javascript',
        password_hash: null,
        max_views: null,
        view_count: 10,
        expires_at: new Date(Date.now() + 86400000),
      };

      snippetRepository.findByShortLink.mockResolvedValue(mockSnippet);

      const result = await snippetService.getSnippet('snip1234');

      expect(result.content).toBe('console.log("test");');
      expect(result.title).toBe('Test');
      expect(result.hasPassword).toBe(false);
      expect(result.viewCount).toBe(10);
    });

    it('should throw error if snippet not found', async () => {
      snippetRepository.findByShortLink.mockResolvedValue(null);

      await expect(snippetService.getSnippet('nonexistent')).rejects.toThrow('Snippet not found');
    });

    it('should throw error if snippet expired', async () => {
      const mockSnippet = {
        content: 'test',
        title: 'Test',
        language: null,
        password_hash: null,
        max_views: null,
        view_count: 0,
        expires_at: new Date(Date.now() - 86400000), // вчера
      };

      snippetRepository.findByShortLink.mockResolvedValue(mockSnippet);

      await expect(snippetService.getSnippet('snip1234')).rejects.toThrow('Snippet expired');
    });

    it('should throw error if view limit reached', async () => {
      const mockSnippet = {
        content: 'test',
        title: 'Test',
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

  describe('verifyPassword', () => {
    it('should return true for snippet without password', async () => {
      snippetRepository.findByShortLink.mockResolvedValue({
        password_hash: null,
      });

      const result = await snippetService.verifyPassword('snip1234', 'anypassword');
      expect(result).toBe(true);
    });

    it('should verify correct password', async () => {
      snippetRepository.findByShortLink.mockResolvedValue({
        password_hash: 'hashed_secret123',
      });

      const result = await snippetService.verifyPassword('snip1234', 'secret123');
      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      snippetRepository.findByShortLink.mockResolvedValue({
        password_hash: 'hashed_secret123',
      });

      const result = await snippetService.verifyPassword('snip1234', 'wrongpassword');
      expect(result).toBe(false);
    });
  });

  describe('incrementView', () => {
    it('should increment view count', async () => {
      await snippetService.incrementView('snip1234');

      expect(snippetRepository.incrementViewCount).toHaveBeenCalledWith('snip1234');
    });
  });

  describe('getSessionHistory', () => {
    it('should return formatted history', async () => {
      const mockSnippets = [
        {
          id: '1',
          short_link: 'snip1',
          title: 'Snippet 1',
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
          title: 'Snippet 2',
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

    it('should mark expired snippets', async () => {
      const mockSnippets = [
        {
          id: '1',
          short_link: 'snip1',
          title: 'Expired',
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
