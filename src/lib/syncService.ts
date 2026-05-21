import { supabase } from './supabase';
import { encryptionService } from './encryption';

interface SyncItem {
  id: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  timestamp: number;
}

class SyncService {
  private queueKey = 'gestao_acs_sync_queue';
  private listeners: (() => void)[] = [];
  private syncing = false;
  private lastSyncedAt: Date | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.sync();
        this.notifyListeners();
      });
      window.addEventListener('offline', () => {
        this.notifyListeners();
      });
    }
  }

  subscribe(callback: () => void) {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (e) {
        console.error("Error calling sync listener:", e);
      }
    });
  }

  private obfuscate(data: string): string {
    return encryptionService.encrypt(data);
  }

  private deobfuscate(data: string): string {
    if (!data) return '';
    
    // Fallback retrocompatível: decodifica o formato Base64 v1 antigo se encontrado
    if (data.startsWith('sec_v1_')) {
      try {
        const clean = data.substring(7);
        const reversed = clean.split('').reverse().join('');
        return decodeURIComponent(atob(reversed));
      } catch (e) {
        console.error('Falha no fallback de decodificação Base64 legada:', e);
        return data;
      }
    }
    
    // Caso contrário, decifra de forma segura com AES-256
    return encryptionService.decrypt(data);
  }

  private getQueue(): SyncItem[] {
    const queue = localStorage.getItem(this.queueKey);
    if (!queue) return [];
    try {
      const decoded = this.deobfuscate(queue);
      return JSON.parse(decoded);
    } catch (e) {
      // Fallback em caso de falha de decodificação de dados antigos
      try {
        return JSON.parse(queue);
      } catch {
        return [];
      }
    }
  }

  private saveQueue(queue: SyncItem[]) {
    const serialized = JSON.stringify(queue);
    const obfuscated = this.obfuscate(serialized);
    localStorage.setItem(this.queueKey, obfuscated);
    this.notifyListeners();
  }

  async addToQueue(table: string, action: 'INSERT' | 'UPDATE' | 'DELETE', data: any) {
    const queue = this.getQueue();
    const newItem: SyncItem = {
      id: crypto.randomUUID(),
      table,
      action,
      data,
      timestamp: Date.now(),
    };
    queue.push(newItem);
    this.saveQueue(newItem ? queue : queue); // Save and trigger subscriber updates
    
    if (navigator.onLine) {
      await this.sync();
    }
  }

  async sync() {
    if (!navigator.onLine || this.syncing) return;
    
    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.syncing = true;
    this.notifyListeners();

    const remainingItems: SyncItem[] = [];

    for (const item of queue) {
      try {
        let error;
        if (item.action === 'INSERT') {
          ({ error } = await supabase.from(item.table).insert(item.data));
        } else if (item.action === 'UPDATE') {
          ({ error } = await supabase.from(item.table).update(item.data).eq('id', item.data.id));
        } else if (item.action === 'DELETE') {
          const query = supabase.from(item.table).delete();
          if (item.data.id) {
            ({ error } = await query.eq('id', item.data.id));
          } else if (item.data.filter) {
            ({ error } = await query.match(item.data.filter));
          } else {
            ({ error } = await query.eq('id', item.data.id));
          }
        }

        if (error) throw error;
      } catch (err) {
        console.error(`Sync failed for ${item.table}:`, err);
        remainingItems.push(item);
      }
    }

    this.syncing = false;
    if (remainingItems.length < queue.length) {
      // At least one item synced successfully
      this.lastSyncedAt = new Date();
    }
    this.saveQueue(remainingItems);
  }

  getQueueLength(): number {
    return this.getQueue().length;
  }

  isSyncing(): boolean {
    return this.syncing;
  }

  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  getLastSyncedAt(): Date | null {
    return this.lastSyncedAt;
  }
}

export const syncService = new SyncService();

