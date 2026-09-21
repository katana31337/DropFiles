import { describe, it, expect } from '@jest/globals';
import { hashPassword, verifyPassword } from '../utils/hash.js';

describe('hashPassword', () => {
  it('should hash a password', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should generate different hashes for same password', async () => {
    const password = 'testPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    // bcrypt использует разные соли, поэтому хэши будут разными
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty password', async () => {
    const hash = await hashPassword('');
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should handle long password', async () => {
    const longPassword = 'a'.repeat(1000);
    const hash = await hashPassword(longPassword);
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should handle special characters', async () => {
    const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should handle unicode characters', async () => {
    const password = 'пароль123密码';
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });
});

describe('verifyPassword', () => {
  it('should verify correct password', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword('wrongPassword', hash);
    expect(isValid).toBe(false);
  });

  it('should reject empty password when hash was created with password', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword('', hash);
    expect(isValid).toBe(false);
  });

  it('should verify empty password hash', async () => {
    const hash = await hashPassword('');
    const isValid = await verifyPassword('', hash);
    expect(isValid).toBe(true);
  });

  it('should handle special characters correctly', async () => {
    const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
    
    const isInvalid = await verifyPassword('!@#$%^&*()_+-=[]{}|;:,.<>? ', hash);
    expect(isInvalid).toBe(false);
  });

  it('should handle unicode characters correctly', async () => {
    const password = 'пароль123密码';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should be case sensitive', async () => {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);
    
    expect(await verifyPassword('TestPassword123', hash)).toBe(true);
    expect(await verifyPassword('testpassword123', hash)).toBe(false);
    expect(await verifyPassword('TESTPASSWORD123', hash)).toBe(false);
  });
});
