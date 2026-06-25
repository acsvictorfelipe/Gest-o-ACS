import CryptoJS from 'crypto-js';

class EncryptionService {
  private key: string | null = null;
  private fallbackKey: string = '';

  constructor() {
    // Generate a secure, non-predictable session fallback key on initialization
    try {
      if (typeof window !== 'undefined' && window.crypto) {
        const array = new Uint32Array(8);
        window.crypto.getRandomValues(array);
        this.fallbackKey = Array.from(array, dec => dec.toString(16)).join('');
      } else {
        this.fallbackKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }
    } catch (e) {
      this.fallbackKey = 'fallback_' + Date.now();
    }
  }

  setKey(newKey: string) {
    if (newKey) {
      this.key = newKey;
    }
  }

  private getKey(): string {
    return this.key || this.fallbackKey;
  }

  encrypt(data: string): string {
    try {
      if (!data) return '';
      // Prefix encryption with 'enc_v2_' to easily recognize the AES format
      return 'enc_v2_' + CryptoJS.AES.encrypt(data, this.getKey()).toString();
    } catch (e) {
      console.error('Encryption error:', e);
      return data;
    }
  }

  decrypt(ciphertext: string): string {
    try {
      if (!ciphertext) return '';
      
      // If it doesn't start with 'enc_v2_', it's either plaintext or the old Base64 format.
      // We return it as-is so the calling service can apply fallback logic.
      if (!ciphertext.startsWith('enc_v2_')) {
        return ciphertext;
      }
      
      const cleanCipher = ciphertext.substring(7);
      
      let decrypted = '';
      try {
        const bytes = CryptoJS.AES.decrypt(cleanCipher, this.getKey());
        decrypted = bytes.toString(CryptoJS.enc.Utf8);
      } catch (err) {
        // Fall through to legacy check
      }
      
      if (!decrypted) {
        // Attempt legacy fallback key decryption for backward compatibility with old data
        try {
          const legacyBytes = CryptoJS.AES.decrypt(cleanCipher, 'gestao_acs_fallback_key_2026');
          const legacyDecrypted = legacyBytes.toString(CryptoJS.enc.Utf8);
          if (legacyDecrypted) {
            console.info('Successfully decrypted with legacy fallback key.');
            return legacyDecrypted;
          }
        } catch (legacyErr) {
          // Ignore legacy decryption errors
        }

        console.warn('Decryption returned empty. Falling back to original.');
        return ciphertext;
      }
      
      return decrypted;
    } catch (e) {
      console.error('Decryption error, returning original ciphertext:', e);
      return ciphertext;
    }
  }
}

export const encryptionService = new EncryptionService();
