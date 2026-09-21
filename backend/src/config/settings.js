import pool from './database.js';

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
  
  // Возвращаем из кэша если актуально
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
    // Возвращаем кэш даже если он устарел (лучше что-то чем ничего)
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
 * Получить настройку как массив (через запятую)
 */
export async function getArraySetting(key, defaultValue = []) {
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
    
    // Инвалидируем кэш
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
    
    // Инвалидируем кэш
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
      retentionDays: (settings.retention_options || '1,3,5,7,20,30')
        .split(',')
        .map(n => parseInt(n.trim())),
      maxDownloadsOptions: (settings.max_downloads_options || '1,2,5,7,unlimited')
        .split(',')
        .map(s => s.trim() === 'unlimited' ? null : parseInt(s)),
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
