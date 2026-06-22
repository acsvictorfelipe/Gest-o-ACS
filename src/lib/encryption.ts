import CryptoJS from 'crypto-js';

class EncryptionService {
  private key: string = 'gestao_acs_fallback_key_2026';

  setKey(newKey: string) {
    if (newKey) {
      this.key = newKey;
    }
  }

  encrypt(data: string): string {
    try {
      if (!data) return '';
      // Prefix encryption with 'enc_v2_' to easily recognize the AES format
      return 'enc_v2_' + CryptoJS.AES.encrypt(data, this.key).toString();
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
      const bytes = CryptoJS.AES.decrypt(cleanCipher, this.key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
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
