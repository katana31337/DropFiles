import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  formatDate,
  formatExpiry,
  retentionLabel,
  downloadLabel,
  isExpired,
} from '../utils/format';

describe('formatFileSize', () => {
  it('должен форматировать 0 байт', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('должен форматировать байты', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('должен форматировать килобайты', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('должен форматировать мегабайты', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
  });

  it('должен форматировать гигабайты', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('должен обрабатывать десятичные значения', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});

describe('formatDate', () => {
  it('должен форматировать объект Date', () => {
    const date = new Date('2024-01-15T10:30:00');
    const formatted = formatDate(date);
    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });

  it('должен форматировать строку даты', () => {
    const formatted = formatDate('2024-01-15T10:30:00');
    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });
});

describe('formatExpiry', () => {
  it('должен возвращать "Истёк" для прошедшей даты', () => {
    const pastDate = new Date(Date.now() - 86400000); // вчера
    expect(formatExpiry(pastDate)).toBe('Истёк');
  });

  it('должен возвращать "1 день" для завтра', () => {
    const tomorrow = new Date(Date.now() + 86400000);
    expect(formatExpiry(tomorrow)).toBe('1 день');
  });

  it('должен возвращать "N дня" для 2-4 дней', () => {
    const twoDays = new Date(Date.now() + 2 * 86400000);
    const threeDays = new Date(Date.now() + 3 * 86400000);
    const fourDays = new Date(Date.now() + 4 * 86400000);
    
    expect(formatExpiry(twoDays)).toBe('2 дня');
    expect(formatExpiry(threeDays)).toBe('3 дня');
    expect(formatExpiry(fourDays)).toBe('4 дня');
  });

  it('должен возвращать "N дней" для 5+ дней', () => {
    const fiveDays = new Date(Date.now() + 5 * 86400000);
    const tenDays = new Date(Date.now() + 10 * 86400000);
    
    expect(formatExpiry(fiveDays)).toBe('5 дней');
    expect(formatExpiry(tenDays)).toBe('10 дней');
  });

  it('должен обрабатывать строку даты', () => {
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString();
    const result = formatExpiry(futureDate);
    expect(result).toBe('7 дней');
  });
});

describe('retentionLabel', () => {
  it('должен возвращать "1 день" для 1', () => {
    expect(retentionLabel(1)).toBe('1 день');
  });

  it('должен возвращать "N дня" для 3', () => {
    expect(retentionLabel(3)).toBe('3 дня');
  });

  it('должен возвращать "N дней" для 5+', () => {
    expect(retentionLabel(5)).toBe('5 дней');
    expect(retentionLabel(7)).toBe('7 дней');
    expect(retentionLabel(20)).toBe('20 дней');
    expect(retentionLabel(30)).toBe('30 дней');
  });
});

describe('downloadLabel', () => {
  it('должен возвращать "Без ограничений" для звёздочки', () => {
    expect(downloadLabel('*')).toBe('Без ограничений');
  });

  it('должен возвращать число как строку', () => {
    expect(downloadLabel(1)).toBe('1');
    expect(downloadLabel(2)).toBe('2');
    expect(downloadLabel(5)).toBe('5');
    expect(downloadLabel(7)).toBe('7');
  });
});

describe('isExpired', () => {
  it('должен возвращать true для прошедшей даты', () => {
    const pastDate = new Date(Date.now() - 86400000);
    expect(isExpired(pastDate)).toBe(true);
  });

  it('должен возвращать false для будущей даты', () => {
    const futureDate = new Date(Date.now() + 86400000);
    expect(isExpired(futureDate)).toBe(false);
  });

  it('должен обрабатывать строку даты', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    
    expect(isExpired(pastDate)).toBe(true);
    expect(isExpired(futureDate)).toBe(false);
  });
});
