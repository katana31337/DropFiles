/**
 * Простой in-memory rate limiter.
 * 
 * Для продакшена лучше использовать Redis-based решение (ioredis + rolling window).
 * Этот вариант подходит для одного инстанса приложения.
 */

const store = new Map();

/**
 * Rate limiter middleware
 * @param {Object} options
 * @param {number} options.windowMs - окно времени в миллисекундах
 * @param {number} options.max - максимум запросов за окно
 * @param {string} options.keyPrefix - префикс для ключа (по умолчанию IP)
 * @param {Function} options.keyGenerator - функция для генерации ключа
 */
export function rateLimit({ windowMs, max, keyPrefix = 'ip', keyGenerator }) {
  // Очистка старых записей каждые 5 минут
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of store.entries()) {
      if (now - data.windowStart > windowMs * 2) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req, res, next) => {
    const key = keyGenerator 
      ? keyGenerator(req) 
      : `${keyPrefix}:${req.ip || req.connection.remoteAddress}`;
    
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      entry = { windowStart: now, count: 0 };
      store.set(key, entry);
    }

    entry.count++;

    // Устанавливаем заголовки
    const remaining = Math.max(0, max - entry.count);
    const reset = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', reset);

    if (entry.count > max) {
      res.setHeader('Retry-After', reset);
      return res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: reset,
      });
    }

    next();
  };
}
