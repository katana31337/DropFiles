import { describe, it, expect } from '@jest/globals';
import { validateRetentionDays, validateMaxDownloadsOptions } from '../../src/config/settings.js';

describe('validateRetentionDays - валидация сроков хранения', () => {
  it('должен принимать валидный формат с одним числом', () => {
    const result = validateRetentionDays('7');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('должен принимать валидный формат с несколькими числами', () => {
    const result = validateRetentionDays('1,3,5,7,20,30');
    expect(result.valid).toBe(true);
  });

  it('должен принимать числа с пробелами', () => {
    const result = validateRetentionDays('1, 3, 5, 7');
    expect(result.valid).toBe(true);
  });

  it('должен отклонять пустую строку', () => {
    const result = validateRetentionDays('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('должен отклонять значение null', () => {
    const result = validateRetentionDays(null);
    expect(result.valid).toBe(false);
  });

  it('должен отклонять нестроковое значение', () => {
    const result = validateRetentionDays(123);
    expect(result.valid).toBe(false);
  });

  it('должен отклонять формат с буквами', () => {
    const result = validateRetentionDays('1,abc,3');
    expect(result.valid).toBe(false);
  });

  it('должен отклонять формат с завершающей запятой', () => {
    const result = validateRetentionDays('1,3,5,');
    expect(result.valid).toBe(false);
  });

  it('должен отклонять формат с начальной запятой', () => {
    const result = validateRetentionDays(',1,3,5');
    expect(result.valid).toBe(false);
  });

  it('должен отклонять формат с двойными запятыми', () => {
    const result = validateRetentionDays('1,,3,5');
    expect(result.valid).toBe(false);
  });

  it('должен отклонять числа меньше 1', () => {
    const result = validateRetentionDays('0,3,5');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between 1 and 365');
  });

  it('должен отклонять числа больше 365', () => {
    const result = validateRetentionDays('1,3,400');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between 1 and 365');
  });

  it('должен принимать граничные значения', () => {
    expect(validateRetentionDays('1').valid).toBe(true);
    expect(validateRetentionDays('365').valid).toBe(true);
    expect(validateRetentionDays('1,365').valid).toBe(true);
  });
});

describe('validateMaxDownloadsOptions - валидация лимитов скачиваний', () => {
  it('должен принимать валидный формат с числами', () => {
    const result = validateMaxDownloadsOptions('1,2,5,7');
    expect(result.valid).toBe(true);
  });

  it('должен принимать формат со звёздочкой', () => {
    const result = validateMaxDownloadsOptions('1,5,10,*');
    expect(result.valid).toBe(true);
  });

  it('должен принимать только звёздочку', () => {
    const result = validateMaxDownloadsOptions('*');
    expect(result.valid).toBe(true);
  });

  it('должен принимать звёздочку в любой позиции', () => {
    expect(validateMaxDownloadsOptions('*,1,5').valid).toBe(true);
    expect(validateMaxDownloadsOptions('1,*,5').valid).toBe(true);
    expect(validateMaxDownloadsOptions('1,5,*').valid).toBe(true);
  });

  it('должен отклонять пустую строку', () => {
    const result = validateMaxDownloadsOptions('');
    expect(result.valid).toBe(false);
  });

  it('должен отклонять значение null', () => {
    const result = validateMaxDownloadsOptions(null);
    expect(result.valid).toBe(false);
  });

  it('должен отклонять формат с невалидными словами', () => {
    const result = validateMaxDownloadsOptions('1,invalid,5');
    expect(result.valid).toBe(false);
  });

  it('должен отклонять формат с завершающей запятой', () => {
    const result = validateMaxDownloadsOptions('1,5,');
    expect(result.valid).toBe(false);
  });

  it('должен отклонять числа меньше 1', () => {
    const result = validateMaxDownloadsOptions('0,5,10');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between 1 and 10000');
  });

  it('должен отклонять числа больше 10000', () => {
    const result = validateMaxDownloadsOptions('1,5,20000');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between 1 and 10000');
  });

  it('должен принимать граничные значения', () => {
    expect(validateMaxDownloadsOptions('1').valid).toBe(true);
    expect(validateMaxDownloadsOptions('10000').valid).toBe(true);
    expect(validateMaxDownloadsOptions('1,10000,*').valid).toBe(true);
  });

  it('должен принимать формат с пробелами', () => {
    const result = validateMaxDownloadsOptions('1, 5, *');
    expect(result.valid).toBe(true);
  });

  it('должен принимать формат без пробелов', () => {
    const result = validateMaxDownloadsOptions('1,5,*');
    expect(result.valid).toBe(true);
  });
});
