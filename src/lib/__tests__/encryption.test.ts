import { describe, it, expect } from 'vitest';
import { encryptionService } from '../encryption';

describe('EncryptionService', () => {
  it('should encrypt and decrypt a string successfully', () => {
    const originalText = 'Secret Patient Data 123';
    const encryptedText = encryptionService.encrypt(originalText);
    
    expect(encryptedText).not.toBe(originalText);
    expect(encryptedText.startsWith('enc_v2_')).toBe(true);

    const decryptedText = encryptionService.decrypt(encryptedText);
    expect(decryptedText).toBe(originalText);
  });

  it('should pass through plaintext strings if they do not start with enc_v2_', () => {
    const plainText = 'Plaintext with no prefix';
    const decryptedText = encryptionService.decrypt(plainText);
    expect(decryptedText).toBe(plainText);
  });

  it('should handle custom encryption keys when setKey is called', () => {
    const originalText = 'Confidential Record';
    encryptionService.setKey('my-custom-unit-test-key-2026');
    
    const encrypted = encryptionService.encrypt(originalText);
    const decrypted = encryptionService.decrypt(encrypted);
    
    expect(decrypted).toBe(originalText);
  });
});
