import pool from '../config/database.js';

/**
 * SessionRepository — слой работы с БД для сессий.
 */
export class SessionRepository {
  async findByToken(token) {
    const result = await pool.query(
      'SELECT id, token, expires_at FROM sessions WHERE token = $1',
      [token]
    );
    return result.rows[0] || null;
  }

  async create(token, expiresAt) {
    const result = await pool.query(
      'INSERT INTO sessions (token, last_activity, expires_at) VALUES ($1, NOW(), $2) RETURNING id',
      [token, expiresAt]
    );
    return result.rows[0].id;
  }

  async updateActivity(id, expiresAt) {
    await pool.query(
      'UPDATE sessions SET last_activity = NOW(), expires_at = $1 WHERE id = $2',
      [expiresAt, id]
    );
  }

  async delete(id) {
    await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
  }

  async findExpired() {
    const result = await pool.query(
      'DELETE FROM sessions WHERE expires_at < NOW() RETURNING id'
    );
    return result.rows;
  }

  async countActive() {
    const result = await pool.query(
      'SELECT COUNT(*) FROM sessions WHERE expires_at > NOW()'
    );
    return parseInt(result.rows[0].count);
  }
}

export const sessionRepository = new SessionRepository();
