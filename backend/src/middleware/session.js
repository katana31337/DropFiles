import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { getAppConfig } from '../config/settings.js';
import { config } from '../config/app.js';

const COOKIE_NAME = config.session.cookieName;

/**
 * Middleware для работы с анонимными сессиями.
 * 
 * Логика:
 * 1. Проверяем cookie с токеном сессии
 * 2. Если токен есть и сессия валидна — обновляем last_activity и expires_at
 * 3. Если токена нет или сессия истекла — создаём новую
 * 4. Сессия привязана к файлам через session_id (ON DELETE CASCADE)
 */
export async function sessionMiddleware(req, res, next) {
  try {
    // Получаем настройки из БД (с кэшированием)
    const appConfig = await getAppConfig();
    const sessionDurationDays = appConfig.session.durationDays;

    const token = req.cookies[COOKIE_NAME];

    if (token) {
      // Ищем существующую сессию
      const result = await pool.query(
        `SELECT id, expires_at FROM sessions WHERE token = $1`,
        [token]
      );

      if (result.rows.length > 0) {
        const session = result.rows[0];
        const now = new Date();
        const expiresAt = new Date(session.expires_at);

        if (expiresAt > now) {
          // Сессия валидна — обновляем активность (rolling expiration)
          const newExpiresAt = new Date(now.getTime() + sessionDurationDays * 24 * 60 * 60 * 1000);
          
          await pool.query(
            `UPDATE sessions SET last_activity = $1, expires_at = $2 WHERE id = $3`,
            [now, newExpiresAt, session.id]
          );

          req.session = {
            id: session.id,
            token: token,
            expiresAt: newExpiresAt,
          };

          return next();
        } else {
          // Сессия истекла — удаляем (каскадно удалятся файлы из истории)
          await pool.query(`DELETE FROM sessions WHERE id = $1`, [session.id]);
        }
      }
    }

    // Создаём новую сессию
    const newToken = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + sessionDurationDays * 24 * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO sessions (token, last_activity, expires_at) VALUES ($1, $2, $3) RETURNING id`,
      [newToken, now, expiresAt]
    );

    const sessionId = result.rows[0].id;

    // Устанавливаем cookie
    res.cookie(COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionDurationDays * 24 * 60 * 60 * 1000,
      path: '/',
    });

    req.session = {
      id: sessionId,
      token: newToken,
      expiresAt: expiresAt,
    };

    next();
  } catch (error) {
    console.error('Session middleware error:', error);
    // В случае ошибки БД — продолжаем без сессии
    req.session = null;
    next();
  }
}

/**
 * Middleware для обязательной сессии
 */
export function requireSession(req, res, next) {
  if (!req.session) {
    return res.status(401).json({ error: 'Session required' });
  }
  next();
}
