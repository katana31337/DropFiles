import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Хэширование пароля
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Проверка пароля
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
