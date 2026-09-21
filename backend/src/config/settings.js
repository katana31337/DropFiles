import pool from '../config/database.js';

/**
 * Сервис для работы с настройками приложения.
 * Настройки хранятся в PostgreSQL и кэшируются в памяти.
 */

let settingsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // 1 минута

/**
 * Получить все настройки из БД (с кэшированием)
 */
export async function getAllSettings() {
  const now = Date.now();
  
  if (settingsCache && now - cacheTimestamp < CACHE_TTL) {
    return settingsCache;
  }

  try {
    const result = await pool.query('SELECT key, value FROM settings');
    
    settingsCache = result.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    
    cacheTimestamp = now;
    return settingsCache;
  } catch (error) {
    console.error('Failed to load settings from DB:', error);
    return settingsCache || {};
  }
}

/**
 * Получить конкретную настройку
 */
export async function getSetting(key, defaultValue = null) {
  const settings = await getAllSettings();
  return settings[key] !== undefined ? settings[key] : defaultValue;
}

/**
 * Получить числовую настройку
 */
export async function getNumericSetting(key, defaultValue = 0) {
  const value = await getSetting(key);
  const num = parseInt(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Получить настройку как массив чисел (через запятую)
 */
export async function getNumberArraySetting(key, defaultValue = []) {
  const value = await getSetting(key);
  if (!value) return defaultValue;
  return value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
}

/**
 * Получить настройку как массив строк (через запятую)
 */
export async function getStringArraySetting(key, defaultValue = []) {
  const value = await getSetting(key);
  if (!value) return defaultValue;
  return value.split(',').map(s => s.trim());
}

/**
 * Обновить настройку
 */
export async function updateSetting(key, value) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    await client.query(
      `INSERT INTO settings (key, value, updated_at) 
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, String(value)]
    );
    
    await client.query('COMMIT');
    invalidateCache();
    
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update setting:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Обновить несколько настроек (транзакция)
 */
export async function updateSettings(settings) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const [key, value] of Object.entries(settings)) {
      await client.query(
        `INSERT INTO settings (key, value, updated_at) 
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, String(value)]
      );
    }
    
    await client.query('COMMIT');
    invalidateCache();
    
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update settings:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Инвалидировать кэш настроек
 */
export function invalidateCache() {
  settingsCache = null;
  cacheTimestamp = 0;
}

/**
 * Получить настройки с типизацией (для удобного использования)
 */
export async function getAppConfig() {
  const settings = await getAllSettings();
  
  return {
    files: {
      maxFileSizeMB: parseInt(settings.max_file_size_mb) || 100,
      retentionDays: (settings.retention_days || '1,3,5,7,20,30')
        .split(',')
        .map(n => parseInt(n.trim()))
        .filter(n => !isNaN(n)),
      maxDownloadsOptions: (settings.max_downloads_options || '1,2,5,7,*')
        .split(',')
        .map(s => s.trim() === '*' ? null : parseInt(s)),
    },
    session: {
      durationDays: parseInt(settings.session_duration_days) || 7,
    },
    rateLimit: {
      uploadPerMinute: parseInt(settings.upload_rate_limit) || 5,
      apiPerMinute: parseInt(settings.api_rate_limit) || 60,
    },
  };
}

/**
 * Валидация формата retention_days: "число,число,число"
 * Возвращает { valid: boolean, error?: string }
 */
export function validateRetentionDays(value) {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Value must be a string' };
  }

  // Регулярное выражение: одна или более групп "число" разделённых запятыми (с возможными пробелами)
  const pattern = /^\d+(\s*,\s*\d+)*$/;
  
  if (!pattern.test(value.trim())) {
    return { 
      valid: false, 
      error: 'Invalid format. Use: number,number,number (e.g., 1,3,7,30)' 
    };
  }

  // Проверяем что все числа валидны и в разумных пределах
  const numbers = value.split(',').map(s => parseInt(s.trim()));
  
  for (const num of numbers) {
    if (isNaN(num) || num < 1 || num > 365) {
      return { 
        valid: false, 
        error: 'Each number must be between 1 and 365' 
      };
    }
  }

  return { valid: true };
}

/**
 * Валидация формата max_downloads_options: "число,число,*"
 * Поддерживает форматы: "1,3,5,*" или "1, 3, 5, *"
 */
export function validateMaxDownloadsOptions(value) {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Value must be a string' };
  }

  // Поддерживаем "*" вместо "unlimited"
  const pattern = /^(\d+|\*)(\s*,\s*(\d+|\*))*$/;
  
  if (!pattern.test(value.trim())) {
    return { 
      valid: false, 
      error: 'Invalid format. Use: number,number,* (e.g., 1,5,10,*)' 
    };
  }

  const parts = value.split(',').map(s => s.trim());
  
  for (const part of parts) {
    if (part !== '*') {
      const num = parseInt(part);
      if (isNaN(num) || num < 1 || num > 10000) {
        return { 
          valid: false, 
          error: 'Each number must be between 1 and 10000' 
        };
      }
    }
  }

  return { valid: true };
}
