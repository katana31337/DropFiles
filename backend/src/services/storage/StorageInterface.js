/**
 * Интерфейс хранилища (Storage Interface).
 * 
 * Определяет контракт для всех реализаций хранилища.
 * Позволяет легко переключаться между локальным FS и S3.
 */
export class StorageInterface {
  /**
   * Сохранить файл
   * @param {Buffer} buffer - содержимое файла
   * @param {string} filename - имя файла в хранилище
   * @param {string} mimeType - MIME тип
   * @returns {Promise<string>} путь к файлу в хранилище
   */
  async save(buffer, filename, mimeType) {
    throw new Error('Method save() must be implemented');
  }

  /**
   * Получить файл
   * @param {string} path - путь к файлу в хранилище
   * @returns {Promise<Buffer>} содержимое файла
   */
  async get(path) {
    throw new Error('Method get() must be implemented');
  }

  /**
   * Удалить файл
   * @param {string} path - путь к файлу в хранилище
   * @returns {Promise<boolean>} успешно ли удалён
   */
  async remove(path) {
    throw new Error('Method remove() must be implemented');
  }

  /**
   * Проверить существование файла
   * @param {string} path - путь к файлу
   * @returns {Promise<boolean>}
   */
  async exists(path) {
    throw new Error('Method exists() must be implemented');
  }

  /**
   * Получить публичный URL для скачивания
   * @param {string} path - путь к файлу
   * @param {number} expiresIn - время жизни ссылки в секундах
   * @returns {Promise<string>} URL
   */
  async getSignedUrl(path, expiresIn) {
    throw new Error('Method getSignedUrl() must be implemented');
  }
}
