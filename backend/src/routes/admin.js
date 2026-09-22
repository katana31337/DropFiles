import { Router } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';
import { getSetting, updateSetting } from '../config/settings.js';
import { config } from '../config/app.js';

export const adminRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRES_IN = '24h';

/**
 * POST /api/admin/setup
 * Первичная установка администратора
 */
adminRouter.post('/setup', async (req, res) => {
  try {
    // Проверяем, не установлен ли уже админ
    const isSetupComplete = await getSetting('is_setup_complete', 'false');
    if (isSetupComplete === 'true') {
      return res.status(400).json({ error: 'Admin already configured' });
    }

    const { username, password } = req.body;

    // Валидация
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.length < 3 || username.length > 64) {
      return res.status(400).json({ error: 'Username must be 3-64 characters' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Хэшируем пароль
    const passwordHash = await hashPassword(password);

    // Создаём админа
    await pool.query(
      `INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)`,
      [username, passwordHash]
    );

    // Устанавливаем флаг завершения настройки
    await updateSetting('is_setup_complete', 'true');

    res.json({ success: true, message: 'Admin account created' });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Setup failed' });
  }
});

/**
 * POST /api/admin/login
 * Вход администратора
 */
adminRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Ищем админа
    const result = await pool.query(
      `SELECT id, username, password_hash FROM admin_users WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];

    // Проверяем пароль
    const isValid = await verifyPassword(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Обновляем last_login
    await pool.query(
      `UPDATE admin_users SET last_login = NOW() WHERE id = $1`,
      [admin.id]
    );

    // Генерируем JWT токен
    const token = jwt.sign(
      { adminId: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      username: admin.username,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/admin/status
 * Проверка статуса установки
 */
adminRouter.get('/status', async (req, res) => {
  try {
    const isSetupComplete = await getSetting('is_setup_complete', 'false');
    res.json({
      isSetupComplete: isSetupComplete === 'true',
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Status check failed' });
  }
});
