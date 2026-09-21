import { describe, it, expect } from '@jest/globals';
import { validateRetentionDays, validateMaxDownloadsOptions } from '../config/settings.js';

describe('validateRetentionDays', () => {
  it('should accept valid format with single number', () => {
    const result = validateRetentionDays('7');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept valid format with multiple numbers', () => {
    const result = validateRetentionDays('1,3,5,7,20,30');
    expect(result.valid).toBe(true);
  });

  it('should accept numbers with spaces', () => {
    const result = validateRetentionDays('1, 3, 5, 7');
    expect(result.valid).toBe(true);
  });

  it('should reject empty string', () => {
    const result = validateRetentionDays('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject null value', () => {
    const result = validateRetentionDays(null);
    expect(result.valid).toBe(false);
  });

  it('should reject non-string value', () => {
    const result = validateRetentionDays(123);
    expect(result.valid).toBe(false);
  });

  it('should reject format with letters', () => {
    const result = validateRetentionDays('1,abc,3');
    expect(result.valid).toBe(false);
  });

  it('should reject format with trailing comma', () => {
    const result = validateRetentionDays('1,3,5,');
    expect(result.valid).toBe(false);
  });

  it('should reject format with leading comma', () => {
    const result = validateRetentionDays(',1,3,5');
    expect(result.valid).toBe(false);
  });

  it('should reject format with double commas', () => {
    const result = validateRetentionDays('1,,3,5');
    expect(result.valid).toBe(false);
  });

  it('should reject numbers less than 1', () => {
    const result = validateRetentionDays('0,3,5');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between 1 and 365');
  });

  it('should reject numbers greater than 365', () => {
    const result = validateRetentionDays('1,3,400');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between 1 and 365');
  });

  it('should accept boundary values', () => {
    expect(validateRetentionDays('1').valid).toBe(true);
    expect(validateRetentionDays('365').valid).toBe(true);
    expect(validateRetentionDays('1,365').valid).toBe(true);
  });
});

describe('validateMaxDownloadsOptions', () => {
  it('should accept valid format with numbers', () => {
    const result = validateMaxDownloadsOptions('1,2,5,7');
    expect(result.valid).toBe(true);
  });

  it('should accept format with unlimited', () => {
    const result = validateMaxDownloadsOptions('1,5,10,unlimited');
    expect(result.valid).toBe(true);
  });

  it('should accept only unlimited', () => {
    const result = validateMaxDownloadsOptions('unlimited');
    expect(result.valid).toBe(true);
  });

  it('should accept unlimited in any position', () => {
    expect(validateMaxDownloadsOptions('unlimited,1,5').valid).toBe(true);
    expect(validateMaxDownloadsOptions('1,unlimited,5').valid).toBe(true);
    expect(validateMaxDownloadsOptions('1,5,unlimited').valid).toBe(true);
  });

  it('should reject empty string', () => {
    const result = validateMaxDownloadsOptions('');
    expect(result.valid).toBe(false);
  });

  it('should reject null value', () => {
    const result = validateMaxDownloadsOptions(null);
    expect(result.valid).toBe(false);
  });

  it('should reject format with invalid words', () => {
    const result = validateMaxDownloadsOptions('1,invalid,5');
    expect(result.valid).toBe(false);
  });

  it('should reject format with trailing comma', () => {
    const result = validateMaxDownloadsOptions('1,5,');
    expect(result.valid).toBe(false);
  });

  it('should reject numbers less than 1', () => {
    const result = validateMaxDownloadsOptions('0,5,10');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between 1 and 10000');
  });

  it('should reject numbers greater than 10000', () => {
    const result = validateMaxDownloadsOptions('1,5,20000');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between 1 and 10000');
  });

  it('should accept boundary values', () => {
    expect(validateMaxDownloadsOptions('1').valid).toBe(true);
    expect(validateMaxDownloadsOptions('10000').valid).toBe(true);
    expect(validateMaxDownloadsOptions('1,10000,unlimited').valid).toBe(true);
  });

  it('should accept format with spaces', () => {
    const result = validateMaxDownloadsOptions('1, 5, unlimited');
    expect(result.valid).toBe(true);
  });
});
