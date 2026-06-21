import CryptoJS from 'crypto-js';

// Lê sincronamente o ID do usuário Supabase do localStorage no boot do módulo.
// Isso evita que a chave fallback seja usada temporariamente enquanto a sessão
// assíncrona resolve, eliminando qualquer race condition.
function getStoredUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const value = localStorage.getItem(key);
        if (value) {
          const parsed = JSON.parse(value);
          const userId = parsed?.user?.id;
          if (userId) return userId;
        }
      }
    }
  } catch (e) {
    console.error('Error reading Supabase session from localStorage:', e);
  }
  return null;
}

class EncryptionService {
  private key: string = getStoredUserId() || 'gestao_acs_fallback_key_2026';

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
