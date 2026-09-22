import { describe, it, expect } from '@jest/globals';
import { generateShortLink, generateStorageFilename } from '../../src/utils/shortLink.js';

describe('generateShortLink - генерация коротких ссылок', () => {
  it('должен генерировать ссылку стандартной длины (8)', () => {
    const link = generateShortLink();
    expect(link).toBeDefined();
    expect(link.length).toBe(8);
  });

  it('должен генерировать ссылку произвольной длины', () => {
    const link = generateShortLink(12);
    expect(link.length).toBe(12);
  });

  it('должен генерировать только URL-safe символы', () => {
    const link = generateShortLink(100);
    // URL-safe: a-z, A-Z, 0-9, -, _
    const urlSafePattern = /^[a-zA-Z0-9_-]+$/;
    expect(urlSafePattern.test(link)).toBe(true);
  });

  it('должен генерировать уникальные ссылки', () => {
    const links = new Set();
    for (let i = 0; i < 1000; i++) {
      links.add(generateShortLink());
    }
    // Все ссылки должны быть уникальными
    expect(links.size).toBe(1000);
  });

  it('должен генерировать разные ссылки каждый раз', () => {
    const link1 = generateShortLink();
    const link2 = generateShortLink();
    expect(link1).not.toBe(link2);
  });

  it('должен обрабатывать минимальную длину (1)', () => {
    const link = generateShortLink(1);
    expect(link.length).toBe(1);
  });

  it('должен обрабатывать большую длину', () => {
    const link = generateShortLink(100);
    expect(link.length).toBe(100);
  });
});

describe('generateStorageFilename - генерация имён файлов для хранилища', () => {
  it('должен генерировать имя файла с временной меткой и случайной частью', () => {
    const filename = generateStorageFilename('test.jpg');
    expect(filename).toBeDefined();
    expect(filename.length).toBeGreaterThan(0);
  });

  it('должен включать оригинальное имя файла', () => {
    const filename = generateStorageFilename('document.pdf');
    expect(filename).toContain('document.pdf');
  });

  it('должен очищать специальные символы в имени файла', () => {
    const filename = generateStorageFilename('file with spaces & special!.txt');
    // Пробелы и спецсимволы должны быть заменены на _
    expect(filename).not.toContain(' ');
    expect(filename).not.toContain('&');
    expect(filename).not.toContain('!');
    expect(filename).toContain('_');
  });

  it('должен обрабатывать юникод символы', () => {
    const filename = generateStorageFilename('файл.txt');
    expect(filename).toBeDefined();
    // Unicode символы должны быть заменены на _
    expect(filename).not.toContain('ф');
  });

  it('должен обрезать очень длинные имена файлов', () => {
    const longName = 'a'.repeat(200) + '.txt';
    const filename = generateStorageFilename(longName);
    // Имя файла должно быть обрезано до 100 символов
    const parts = filename.split('_');
    const originalPart = parts[parts.length - 1];
    expect(originalPart.length).toBeLessThanOrEqual(100);
  });

  it('должен сохранять расширение файла', () => {
    const filename = generateStorageFilename('image.png');
    expect(filename).toMatch(/\.png$/);
  });

  it('должен генерировать уникальные имена файлов', () => {
    const filenames = new Set();
    for (let i = 0; i < 100; i++) {
      filenames.add(generateStorageFilename('test.txt'));
    }
    expect(filenames.size).toBe(100);
  });

  it('должен начинаться с временной метки', () => {
    const before = Date.now();
    const filename = generateStorageFilename('test.txt');
    const after = Date.now();
    
    const timestamp = parseInt(filename.split('_')[0]);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('должен обрабатывать пустое имя файла', () => {
    const filename = generateStorageFilename('');
    expect(filename).toBeDefined();
    expect(filename.length).toBeGreaterThan(0);
  });

  it('должен обрабатывать имя файла только с расширением', () => {
    const filename = generateStorageFilename('.gitignore');
    expect(filename).toBeDefined();
    expect(filename).toContain('.gitignore');
  });
});
