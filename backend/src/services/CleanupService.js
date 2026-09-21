import cron from 'node-cron';
import pool from '../config/database.js';
import { getStorage } from './storage/index.js';

/**
 * Сервис автоматической очистки истёкших файлов.
 * 
 * Запускается каждые 15 минут и:
 * 1. Находит файлы с истёкшим сроком хранения
 * 2. Удаляет их из хранилища
 * 3. Удаляет записи из БД
 * 
 * Также удаляет истёкшие сессии (вместе с их историей).
 */
export function startCleanupJob() {
  // Каждые 15 минут
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Cleanup] Running cleanup job...');
    
    try {
      await cleanupExpiredFiles();
      await cleanupExpiredSessions();
      console.log('[Cleanup] Job completed');
    } catch (error) {
      console.error('[Cleanup] Job failed:', error);
    }
  });
}

/**
 * Удаление истёкших файлов
 */
async function cleanupExpiredFiles() {
  const storage = getStorage();
  
  // Находим истёкшие файлы
  const expiredFiles = await pool.query(
    `SELECT id, storage_path FROM files 
     WHERE expires_at < NOW() 
     OR (max_downloads IS NOT NULL AND download_count >= max_downloads)`
  );

  let removedCount = 0;

  for (const file of expiredFiles.rows) {
    try {
      // Удаляем из хранилища
      await storage.remove(file.storage_path);
      
      // Удаляем из БД
      await pool.query('DELETE FROM files WHERE id = $1', [file.id]);
      
      removedCount++;
    } catch (error) {
      console.error(`[Cleanup] Failed to remove file ${file.id}:`, error);
    }
  }

  if (removedCount > 0) {
    console.log(`[Cleanup] Removed ${removedCount} expired files`);
  }
}

/**
 * Удаление истёкших сессий
 * (каскадно удалит файлы из истории, но НЕ сами файлы — у файлов свой срок)
 */
async function cleanupExpiredSessions() {
  const result = await pool.query(
    `DELETE FROM sessions WHERE expires_at < NOW() RETURNING id`
  );

  if (result.rows.length > 0) {
    console.log(`[Cleanup] Removed ${result.rows.length} expired sessions`);
  }
}
