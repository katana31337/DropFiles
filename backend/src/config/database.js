import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'filedrop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    // Создание таблиц
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token VARCHAR(64) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        original_name VARCHAR(255) NOT NULL,
        storage_path VARCHAR(512) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(128),
        short_link VARCHAR(16) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        max_downloads INTEGER,
        download_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(20) DEFAULT 'active'
      );

      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(64) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Индексы
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_files_short_link ON files(short_link);
      CREATE INDEX IF NOT EXISTS idx_files_expires ON files(expires_at);
      CREATE INDEX IF NOT EXISTS idx_files_session ON files(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    `);

    // Таблица администраторов
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(64) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE
      );
    `);

    // Таблица текстовых сниппетов
    await client.query(`
      CREATE TABLE IF NOT EXISTS text_snippets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        short_link VARCHAR(16) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        title VARCHAR(255),
        language VARCHAR(32),
        password_hash VARCHAR(255),
        max_views INTEGER,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(20) DEFAULT 'active'
      );
    `);

    // Начальные настройки
    await client.query(`
      INSERT INTO settings (key, value) VALUES
        ('max_file_size_mb', '100'),
        ('session_duration_days', '7'),
        ('retention_options', '1,3,5,7,20,30'),
        ('max_downloads_options', '1,2,5,7,unlimited'),
        ('upload_rate_limit', '5'),
        ('api_rate_limit', '60'),
        ('is_setup_complete', 'false'),
        ('admin_secret_path', ''),
        ('notification_email', ''),
        ('notification_webhook', '')
      ON CONFLICT (key) DO NOTHING;
    `);

  } finally {
    client.release();
  }
}

export { pool };
export default pool;
