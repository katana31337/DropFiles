import { LocalStorage } from './LocalStorage.js';
import { S3Storage } from './S3Storage.js';

/**
 * Фабрика хранилищ.
 * 
 * Выбор реализации через переменную окружения STORAGE_TYPE:
 * - 'local' (по умолчанию) — локальная файловая система
 * - 's3' — S3-совместимое хранилище
 */
let storageInstance = null;

export function getStorage() {
  if (storageInstance) return storageInstance;

  const type = process.env.STORAGE_TYPE || 'local';

  switch (type) {
    case 'local':
      storageInstance = new LocalStorage(process.env.DATASTORE_PATH || './datastore');
      break;
    case 's3':
      storageInstance = new S3Storage({});
      break;
    default:
      throw new Error(`Unknown storage type: ${type}`);
  }

  console.log(`✓ Storage initialized: ${type}`);
  return storageInstance;
}
