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
  it('should format 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('should handle decimal values', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});

describe('formatDate', () => {
  it('should format Date object', () => {
    const date = new Date('2024-01-15T10:30:00');
    const formatted = formatDate(date);
    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });

  it('should format date string', () => {
    const formatted = formatDate('2024-01-15T10:30:00');
    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });
});

describe('formatExpiry', () => {
  it('should return "Истёк" for past date', () => {
    const pastDate = new Date(Date.now() - 86400000); // вчера
    expect(formatExpiry(pastDate)).toBe('Истёк');
  });

  it('should return "1 день" for tomorrow', () => {
    const tomorrow = new Date(Date.now() + 86400000);
    expect(formatExpiry(tomorrow)).toBe('1 день');
  });

  it('should return "N дня" for 2-4 days', () => {
    const twoDays = new Date(Date.now() + 2 * 86400000);
    const threeDays = new Date(Date.now() + 3 * 86400000);
    const fourDays = new Date(Date.now() + 4 * 86400000);
    
    expect(formatExpiry(twoDays)).toBe('2 дня');
    expect(formatExpiry(threeDays)).toBe('3 дня');
    expect(formatExpiry(fourDays)).toBe('4 дня');
  });

  it('should return "N дней" for 5+ days', () => {
    const fiveDays = new Date(Date.now() + 5 * 86400000);
    const tenDays = new Date(Date.now() + 10 * 86400000);
    
    expect(formatExpiry(fiveDays)).toBe('5 дней');
    expect(formatExpiry(tenDays)).toBe('10 дней');
  });

  it('should handle date string', () => {
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString();
    const result = formatExpiry(futureDate);
    expect(result).toBe('7 дней');
  });
});

describe('retentionLabel', () => {
  it('should return "1 день" for 1', () => {
    expect(retentionLabel(1)).toBe('1 день');
  });

  it('should return "N дня" for 3', () => {
    expect(retentionLabel(3)).toBe('3 дня');
  });

  it('should return "N дней" for 5+', () => {
    expect(retentionLabel(5)).toBe('5 дней');
    expect(retentionLabel(7)).toBe('7 дней');
    expect(retentionLabel(20)).toBe('20 дней');
    expect(retentionLabel(30)).toBe('30 дней');
  });
});

describe('downloadLabel', () => {
  it('should return "Без ограничений" for unlimited', () => {
    expect(downloadLabel('unlimited')).toBe('Без ограничений');
  });

  it('should return number as string', () => {
    expect(downloadLabel(1)).toBe('1');
    expect(downloadLabel(2)).toBe('2');
    expect(downloadLabel(5)).toBe('5');
    expect(downloadLabel(7)).toBe('7');
  });
});

describe('isExpired', () => {
  it('should return true for past date', () => {
    const pastDate = new Date(Date.now() - 86400000);
    expect(isExpired(pastDate)).toBe(true);
  });

  it('should return false for future date', () => {
    const futureDate = new Date(Date.now() + 86400000);
    expect(isExpired(futureDate)).toBe(false);
  });

  it('should handle date string', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    
    expect(isExpired(pastDate)).toBe(true);
    expect(isExpired(futureDate)).toBe(false);
  });
});
