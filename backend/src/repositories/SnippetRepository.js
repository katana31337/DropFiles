import pool from '../config/database.js';

/**
 * SnippetRepository — слой работы с БД для текстовых сниппетов.
 */
export class SnippetRepository {
  async findByShortLink(shortLink) {
    const result = await pool.query(
      `SELECT id, session_id, content, title, language, password_hash,
              max_views, view_count, expires_at, status, created_at
       FROM text_snippets WHERE short_link = $1`,
      [shortLink]
    );
    return result.rows[0] || null;
  }

  async create(snippetData) {
    const result = await pool.query(
      `INSERT INTO text_snippets (
        session_id, short_link, content, title, language,
        password_hash, max_views, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, short_link, title, language, expires_at, max_views, view_count`,
      [
        snippetData.sessionId,
        snippetData.shortLink,
        snippetData.content,
        snippetData.title || null,
        snippetData.language || null,
        snippetData.passwordHash || null,
        snippetData.maxViews,
        snippetData.expiresAt,
      ]
    );
    return result.rows[0];
  }

  async incrementViewCount(shortLink) {
    await pool.query(
      'UPDATE text_snippets SET view_count = view_count + 1 WHERE short_link = $1',
      [shortLink]
    );
  }

  async findBySessionId(sessionId) {
    const result = await pool.query(
      `SELECT id, short_link, title, language, max_views, view_count,
              expires_at, status, created_at,
              CASE WHEN password_hash IS NOT NULL THEN true ELSE false END as has_password
       FROM text_snippets
       WHERE session_id = $1
       ORDER BY created_at DESC`,
      [sessionId]
    );
    return result.rows;
  }

  async isShortLinkUnique(shortLink, client) {
    const queryClient = client || pool;
    const result = await queryClient.query(
      'SELECT id FROM text_snippets WHERE short_link = $1',
      [shortLink]
    );
    return result.rows.length === 0;
  }

  async count() {
    const result = await pool.query('SELECT COUNT(*) FROM text_snippets');
    return parseInt(result.rows[0].count);
  }
}

export const snippetRepository = new SnippetRepository();
