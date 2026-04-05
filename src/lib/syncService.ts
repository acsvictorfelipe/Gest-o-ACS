import { supabase } from './supabase';

interface SyncItem {
  id: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  timestamp: number;
}

class SyncService {
  private queueKey = 'gestao_acs_sync_queue';

  private getQueue(): SyncItem[] {
    const queue = localStorage.getItem(this.queueKey);
    return queue ? JSON.parse(queue) : [];
  }

  private saveQueue(queue: SyncItem[]) {
    localStorage.setItem(this.queueKey, JSON.stringify(queue));
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
    this.saveQueue(queue);
    
    if (navigator.onLine) {
      await this.sync();
    }
  }

  async sync() {
    if (!navigator.onLine) return;

    const queue = this.getQueue();
    if (queue.length === 0) return;

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
            // Fallback for safety
            ({ error } = await query.eq('id', item.data.id));
          }
        }

        if (error) throw error;
      } catch (err) {
        console.error(`Sync failed for ${item.table}:`, err);
        remainingItems.push(item);
      }
    }

    this.saveQueue(remainingItems);
  }

  getQueueLength(): number {
    return this.getQueue().length;
  }
}

export const syncService = new SyncService();
