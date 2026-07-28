import { supabase } from './supabase';
import { encryptionService } from './encryption';
import { generateUUID } from './utils';
import { safeStorage } from './safeStorage';

export const ALLOWED_SYNC_TABLES = ['patients', 'visits', 'households', 'profiles', 'visit_requests'] as const;
export type AllowedSyncTable = (typeof ALLOWED_SYNC_TABLES)[number];

export interface SyncItem {
  id: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  timestamp: number;
  attempts?: number;
  lastAttemptAt?: number;
  lastError?: string;
}

class SyncService {
  private queueKey = 'gestao_acs_sync_queue';
  private backupKey = 'gestao_acs_sync_queue_corrupted_backup';
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
    
    // Caso contrário, decifra com o serviço de criptografia
    return encryptionService.decrypt(data);
  }

  getQueue(): SyncItem[] {
    const rawQueue = safeStorage.getItem(this.queueKey);
    if (!rawQueue) return [];

    try {
      const decoded = this.deobfuscate(rawQueue);
      const items = JSON.parse(decoded);
      if (Array.isArray(items)) {
        return items;
      }
      throw new Error('Queue data is not an array');
    } catch (e) {
      // Fallback 1: tente interpretar raw sin deobfuscation (dados legados não cifrados)
      try {
        const legacyItems = JSON.parse(rawQueue);
        if (Array.isArray(legacyItems)) {
          return legacyItems;
        }
      } catch (legacyErr) {
        // Fallback 2: preserva dados em chave de backup sem apagar para evitar perda silenciosa
        console.error('Sync queue corruption detected. Backing up payload before safe isolation:', e);
        safeStorage.setItem(this.backupKey, rawQueue);
      }
      return [];
    }
  }

  private saveQueue(queue: SyncItem[]) {
    const serialized = JSON.stringify(queue);
    const obfuscated = this.obfuscate(serialized);
    safeStorage.setItem(this.queueKey, obfuscated);
    this.notifyListeners();
  }

  async addToQueue(table: string, action: 'INSERT' | 'UPDATE' | 'DELETE', data: any) {
    // Validação estrita de tabela
    if (!ALLOWED_SYNC_TABLES.includes(table as AllowedSyncTable)) {
      console.error(`Tabela não permitida para sincronização offline: "${table}"`);
      return;
    }

    const queue = this.getQueue();
    const now = Date.now();
    const itemId = data?.id;

    // Lógica de idempotência para evitar itens duplicados da mesma entidade
    if (itemId) {
      const existingIdx = queue.findIndex(
        item => item.table === table && item.data?.id === itemId
      );

      if (existingIdx !== -1) {
        const existing = queue[existingIdx];

        if (action === 'DELETE') {
          // Se for DELETE, substitui qualquer INSERT/UPDATE pendente anterior pelo DELETE definitivo
          queue[existingIdx] = {
            id: generateUUID(),
            table,
            action: 'DELETE',
            data,
            timestamp: now,
            attempts: 0
          };
          this.saveQueue(queue);
          if (this.isOnline()) await this.sync();
          return;
        }

        if (action === 'UPDATE' && (existing.action === 'UPDATE' || existing.action === 'INSERT')) {
          // Mescla dados de UPDATE para manter fila idempotente
          queue[existingIdx] = {
            ...existing,
            data: { ...existing.data, ...data },
            timestamp: now,
            attempts: 0,
            lastError: undefined
          };
          this.saveQueue(queue);
          if (this.isOnline()) await this.sync();
          return;
        }
      }
    }

    const newItem: SyncItem = {
      id: generateUUID(),
      table,
      action,
      data,
      timestamp: now,
      attempts: 0
    };

    queue.push(newItem);
    this.saveQueue(queue);
    
    if (this.isOnline()) {
      await this.sync();
    }
  }

  async sync() {
    if (!this.isOnline() || this.syncing) return;
    
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
      } catch (err: any) {
        console.error(`Sync failed for ${item.table}:`, err?.message || err);
        const updatedItem: SyncItem = {
          ...item,
          attempts: (item.attempts || 0) + 1,
          lastAttemptAt: Date.now(),
          lastError: err?.message || String(err)
        };
        remainingItems.push(updatedItem);
      }
    }

    this.syncing = false;
    if (remainingItems.length < queue.length) {
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
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return false;
  }

  getLastSyncedAt(): Date | null {
    return this.lastSyncedAt;
  }

  clearQueue(): void {
    safeStorage.removeItem(this.queueKey);
    this.notifyListeners();
  }
}

export const syncService = new SyncService();

