import { describe, it, expect } from '@jest/globals';
import { hashPassword, verifyPassword } from '../../src/utils/hash.js';

describe('hashPassword - хэширование паролей', () => {
  it('должен хэшировать пароль', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('должен генерировать разные хэши для одного пароля', async () => {
    const password = 'testPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    // bcrypt использует разные соли, поэтому хэши будут разными
    expect(hash1).not.toBe(hash2);
  });

  it('должен обрабатывать пустой пароль', async () => {
    const hash = await hashPassword('');
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });

  it('должен обрабатывать длинный пароль', async () => {
    const longPassword = 'a'.repeat(1000);
    const hash = await hashPassword(longPassword);
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });

  it('должен обрабатывать специальные символы', async () => {
    const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });

  it('должен обрабатывать юникод символы', async () => {
    const password = 'пароль123密码';
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });
});

describe('verifyPassword - проверка паролей', () => {
  it('должен проверять корректный пароль', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('должен отклонять некорректный пароль', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword('wrongPassword', hash);
    expect(isValid).toBe(false);
  });

  it('должен отклонять пустой пароль когда хэш создан с паролем', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword('', hash);
    expect(isValid).toBe(false);
  });

  it('должен проверять хэш пустого пароля', async () => {
    const hash = await hashPassword('');
    const isValid = await verifyPassword('', hash);
    expect(isValid).toBe(true);
  });

  it('должен корректно обрабатывать специальные символы', async () => {
    const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
    
    const isInvalid = await verifyPassword('!@#$%^&*()_+-=[]{}|;:,.<>? ', hash);
    expect(isInvalid).toBe(false);
  });

  it('должен корректно обрабатывать юникод символы', async () => {
    const password = 'пароль123密码';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('должен быть чувствителен к регистру', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);
    
    expect(await verifyPassword('TestPassword123', hash)).toBe(true);
    expect(await verifyPassword('testpassword123', hash)).toBe(false);
    expect(await verifyPassword('TESTPASSWORD123', hash)).toBe(false);
  });
});
