import { describe, it, expect } from '@jest/globals';
import { generateShortLink, generateStorageFilename } from '../utils/shortLink.js';

describe('generateShortLink', () => {
  it('should generate a link of default length (8)', () => {
    const link = generateShortLink();
    expect(link).toBeDefined();
    expect(link.length).toBe(8);
  });

  it('should generate a link of custom length', () => {
    const link = generateShortLink(12);
    expect(link.length).toBe(12);
  });

  it('should generate URL-safe characters only', () => {
    const link = generateShortLink(100);
    // URL-safe: a-z, A-Z, 0-9, -, _
    const urlSafePattern = /^[a-zA-Z0-9_-]+$/;
    expect(urlSafePattern.test(link)).toBe(true);
  });

  it('should generate unique links', () => {
    const links = new Set();
    for (let i = 0; i < 1000; i++) {
      links.add(generateShortLink());
    }
    // Все ссылки должны быть уникальными
    expect(links.size).toBe(1000);
  });

  it('should generate different links each time', () => {
    const link1 = generateShortLink();
    const link2 = generateShortLink();
    expect(link1).not.toBe(link2);
  });

  it('should handle minimum length (1)', () => {
    const link = generateShortLink(1);
    expect(link.length).toBe(1);
  });

  it('should handle large length', () => {
    const link = generateShortLink(100);
    expect(link.length).toBe(100);
  });
});

describe('generateStorageFilename', () => {
  it('should generate a filename with timestamp and random part', () => {
    const filename = generateStorageFilename('test.jpg');
    expect(filename).toBeDefined();
    expect(filename.length).toBeGreaterThan(0);
  });

  it('should include original filename', () => {
    const filename = generateStorageFilename('document.pdf');
    expect(filename).toContain('document.pdf');
  });

  it('should sanitize special characters in filename', () => {
    const filename = generateStorageFilename('file with spaces & special!.txt');
    // Пробелы и спецсимволы должны быть заменены на _
    expect(filename).not.toContain(' ');
    expect(filename).not.toContain('&');
    expect(filename).not.toContain('!');
    expect(filename).toContain('_');
  });

  it('should handle unicode characters', () => {
    const filename = generateStorageFilename('файл.txt');
    expect(filename).toBeDefined();
    // Unicode символы должны быть заменены на _
    expect(filename).not.toContain('ф');
  });

  it('should truncate very long filenames', () => {
    const longName = 'a'.repeat(200) + '.txt';
    const filename = generateStorageFilename(longName);
    // Имя файла должно быть обрезано до 100 символов
    const parts = filename.split('_');
    const originalPart = parts[parts.length - 1];
    expect(originalPart.length).toBeLessThanOrEqual(100);
  });

  it('should preserve file extension', () => {
    const filename = generateStorageFilename('image.png');
    expect(filename).toMatch(/\.png$/);
  });

  it('should generate unique filenames', () => {
    const filenames = new Set();
    for (let i = 0; i < 100; i++) {
      filenames.add(generateStorageFilename('test.txt'));
    }
    expect(filenames.size).toBe(100);
  });

  it('should start with timestamp', () => {
    const before = Date.now();
    const filename = generateStorageFilename('test.txt');
    const after = Date.now();
    
    const timestamp = parseInt(filename.split('_')[0]);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('should handle empty filename', () => {
    const filename = generateStorageFilename('');
    expect(filename).toBeDefined();
    expect(filename.length).toBeGreaterThan(0);
  });

  it('should handle filename with only extension', () => {
    const filename = generateStorageFilename('.gitignore');
    expect(filename).toBeDefined();
    expect(filename).toContain('.gitignore');
  });
});
