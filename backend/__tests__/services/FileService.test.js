import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Мокаем зависимости
jest.unstable_mockModule('../../src/repositories/FileRepository.js', () => ({
  fileRepository: {
    create: jest.fn(),
    findByShortLink: jest.fn(),
    findByShortLinkForUpdate: jest.fn(),
    incrementDownloadCount: jest.fn(),
    delete: jest.fn(),
    findBySessionId: jest.fn(),
    isShortLinkUnique: jest.fn(),
    findExpired: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/services/storage/index.js', () => ({
  getStorage: () => ({
    save: jest.fn(),
    get: jest.fn(),
    getStream: jest.fn(),
    remove: jest.fn(),
  }),
}));

jest.unstable_mockModule('../../src/utils/shortLink.js', () => ({
  generateShortLink: jest.fn(() => 'test1234'),
  generateStorageFilename: jest.fn((name) => `1234567890_abc_${name}`),
}));

jest.unstable_mockModule('../../src/utils/hash.js', () => ({
  hashPassword: jest.fn((pwd) => Promise.resolve(`hashed_${pwd}`)),
  verifyPassword: jest.fn((pwd, hash) => Promise.resolve(hash === `hashed_${pwd}`)),
}));

jest.unstable_mockModule('pg', () => ({
  default: {
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn(),
    })),
  },
}));

const { fileRepository } = await import('../../src/repositories/FileRepository.js');
const { getStorage } = await import('../../src/services/storage/index.js');
const { generateShortLink } = await import('../../src/utils/shortLink.js');
const { hashPassword } = await import('../../src/utils/hash.js');
const { FileService } = await import('../../src/services/FileService.js');

describe('FileService - сервис работы с файлами', () => {
  let fileService;
  let mockStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = getStorage();
    fileService = new FileService();
  });

  describe('upload - загрузка файла', () => {
    it('должен успешно загружать файл', async () => {
      const file = {
        buffer: Buffer.from('test content'),
        originalname: 'test.txt',
        size: 12,
        mimetype: 'text/plain',
      };

      const options = {
        retentionDays: '7',
        maxDownloads: 'unlimited',
      };

      fileRepository.isShortLinkUnique.mockResolvedValue(true);
      mockStorage.save.mockResolvedValue('2024/01/15/test.txt');
      fileRepository.create.mockResolvedValue({
        id: 'file-1',
        short_link: 'test1234',
        original_name: 'test.txt',
        file_size: 12,
        expires_at: new Date(),
      });

      const result = await fileService.upload(file, options, 'session-1');

      expect(mockStorage.save).toHaveBeenCalled();
      expect(fileRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          originalName: 'test.txt',
          shortLink: 'test1234',
        })
      );
      expect(result.short_link).toBe('test1234');
    });

    it('должен хэшировать пароль если он предоставлен', async () => {
      const file = {
        buffer: Buffer.from('test'),
        originalname: 'test.txt',
        size: 4,
        mimetype: 'text/plain',
      };

      const options = {
        retentionDays: '7',
        maxDownloads: 'unlimited',
        password: 'secret123',
      };

      fileRepository.isShortLinkUnique.mockResolvedValue(true);
      mockStorage.save.mockResolvedValue('path/to/file');
      fileRepository.create.mockResolvedValue({ id: '1' });

      await fileService.upload(file, options, 'session-1');

      expect(hashPassword).toHaveBeenCalledWith('secret123');
      expect(fileRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: 'hashed_secret123',
        })
      );
    });

    it('должен удалять файл из хранилища если сохранение в БД не удалось', async () => {
      const file = {
        buffer: Buffer.from('test'),
        originalname: 'test.txt',
        size: 4,
        mimetype: 'text/plain',
      };

      fileRepository.isShortLinkUnique.mockResolvedValue(true);
      mockStorage.save.mockResolvedValue('path/to/file');
      fileRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(
        fileService.upload(file, { retentionDays: '7', maxDownloads: 'unlimited' }, 'session-1')
      ).rejects.toThrow('DB error');

      expect(mockStorage.remove).toHaveBeenCalledWith('path/to/file');
    });
  });

  describe('getFileInfo - получение информации о файле', () => {
    it('должен возвращать информацию о файле', async () => {
      const mockFile = {
        original_name: 'test.txt',
        file_size: 1024,
        mime_type: 'text/plain',
        password_hash: null,
        max_downloads: null,
        download_count: 5,
        expires_at: new Date(Date.now() + 86400000), // завтра
        status: 'active',
        created_at: new Date(),
      };

      fileRepository.findByShortLink.mockResolvedValue(mockFile);

      const info = await fileService.getFileInfo('test1234');

      expect(info.name).toBe('test.txt');
      expect(info.size).toBe(1024);
      expect(info.hasPassword).toBe(false);
      expect(info.status).toBe('active');
    });

    it('должен выбрасывать ошибку если файл не найден', async () => {
      fileRepository.findByShortLink.mockResolvedValue(null);

      await expect(fileService.getFileInfo('nonexistent')).rejects.toThrow('File not found');
    });

    it('должен помечать файл как истёкший', async () => {
      const mockFile = {
        original_name: 'test.txt',
        file_size: 1024,
        mime_type: 'text/plain',
        password_hash: null,
        max_downloads: null,
        download_count: 0,
        expires_at: new Date(Date.now() - 86400000), // вчера
        status: 'active',
        created_at: new Date(),
      };

      fileRepository.findByShortLink.mockResolvedValue(mockFile);

      const info = await fileService.getFileInfo('test1234');
      expect(info.status).toBe('expired');
    });

    it('должен помечать файл как достигший лимита скачиваний', async () => {
      const mockFile = {
        original_name: 'test.txt',
        file_size: 1024,
        mime_type: 'text/plain',
        password_hash: null,
        max_downloads: 5,
        download_count: 5,
        expires_at: new Date(Date.now() + 86400000),
        status: 'active',
        created_at: new Date(),
      };

      fileRepository.findByShortLink.mockResolvedValue(mockFile);

      const info = await fileService.getFileInfo('test1234');
      expect(info.status).toBe('max_downloads_reached');
    });
  });

  describe('verifyPassword - проверка пароля', () => {
    it('должен возвращать true для файла без пароля', async () => {
      fileRepository.findByShortLink.mockResolvedValue({
        password_hash: null,
      });

      const result = await fileService.verifyPassword('test1234', 'anypassword');
      expect(result).toBe(true);
    });

    it('должен проверять корректный пароль', async () => {
      fileRepository.findByShortLink.mockResolvedValue({
        password_hash: 'hashed_secret123',
      });

      const result = await fileService.verifyPassword('test1234', 'secret123');
      expect(result).toBe(true);
    });

    it('должен отклонять некорректный пароль', async () => {
      fileRepository.findByShortLink.mockResolvedValue({
        password_hash: 'hashed_secret123',
      });

      const result = await fileService.verifyPassword('test1234', 'wrongpassword');
      expect(result).toBe(false);
    });
  });

  describe('generateUniqueShortLink - генерация уникальной короткой ссылки', () => {
    it('должен генерировать уникальную ссылку', async () => {
      fileRepository.isShortLinkUnique.mockResolvedValue(true);

      const link = await fileService.generateUniqueShortLink();
      expect(link).toBe('test1234');
    });

    it('должен повторять попытку если ссылка не уникальна', async () => {
      fileRepository.isShortLinkUnique
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const link = await fileService.generateUniqueShortLink();
      expect(fileRepository.isShortLinkUnique).toHaveBeenCalledTimes(3);
    });

    it('должен выбрасывать ошибку после максимального количества попыток', async () => {
      fileRepository.isShortLinkUnique.mockResolvedValue(false);

      await expect(fileService.generateUniqueShortLink(3)).rejects.toThrow(
        'Failed to generate unique short link'
      );
    });
  });
});
