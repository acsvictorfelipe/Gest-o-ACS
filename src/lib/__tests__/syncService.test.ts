import { describe, it, expect, beforeEach, vi } from 'vitest';
import { syncService, ALLOWED_SYNC_TABLES } from '../syncService';
import { safeStorage } from '../safeStorage';

// Mock Supabase client
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      insert: vi.fn().mockImplementation((data: any) => {
        if (data.fail) return Promise.resolve({ error: { message: 'Database constraint failure' } });
        return Promise.resolve({ error: null });
      }),
      update: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      })),
      delete: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
        match: vi.fn().mockResolvedValue({ error: null })
      }))
    }))
  }
}));

describe('SyncService Offline Queue & Idempotency', () => {
  beforeEach(() => {
    safeStorage.clear();
    syncService.clearQueue();
  });

  it('should reject unauthorized tables from being added to sync queue', async () => {
    await syncService.addToQueue('unauthorized_table_xyz', 'INSERT', { id: '123' });
    expect(syncService.getQueueLength()).toBe(0);
  });

  it('should add valid items to queue for allowed tables', async () => {
    for (const table of ALLOWED_SYNC_TABLES) {
      await syncService.addToQueue(table, 'INSERT', { id: `item_${table}` });
    }
    expect(syncService.getQueueLength()).toBe(ALLOWED_SYNC_TABLES.length);
  });

  it('should handle idempotency when updating the same record multiple times', async () => {
    // Offline update 1
    await syncService.addToQueue('patients', 'UPDATE', { id: 'pat_1', name: 'Original Name', phone: '1111' });
    expect(syncService.getQueueLength()).toBe(1);

    // Offline update 2 for same ID
    await syncService.addToQueue('patients', 'UPDATE', { id: 'pat_1', name: 'Updated Name' });
    expect(syncService.getQueueLength()).toBe(1);

    const queue = syncService.getQueue();
    expect(queue[0].data.name).toBe('Updated Name');
    expect(queue[0].data.phone).toBe('1111');
  });

  it('should replace previous updates with DELETE when record is deleted offline', async () => {
    await syncService.addToQueue('patients', 'INSERT', { id: 'pat_del', name: 'To be deleted' });
    expect(syncService.getQueueLength()).toBe(1);

    await syncService.addToQueue('patients', 'DELETE', { id: 'pat_del' });
    expect(syncService.getQueueLength()).toBe(1);

    const queue = syncService.getQueue();
    expect(queue[0].action).toBe('DELETE');
  });

  it('should recover legacy non-obfuscated JSON queues without losing items', () => {
    const legacyQueue = JSON.stringify([
      { id: 'leg_1', table: 'patients', action: 'INSERT', data: { id: 'p1' }, timestamp: 12345 }
    ]);
    safeStorage.setItem('gestao_acs_sync_queue', legacyQueue);

    const items = syncService.getQueue();
    expect(items.length).toBe(1);
    expect(items[0].id).toBe('leg_1');
  });

  it('should isolate corrupted queue payload to backup key without silent data wipe', () => {
    safeStorage.setItem('gestao_acs_sync_queue', 'enc_v2_INVALID_CORRUPTED_CIPHERTEXT');

    const items = syncService.getQueue();
    expect(items).toEqual([]);

    const backup = safeStorage.getItem('gestao_acs_sync_queue_corrupted_backup');
    expect(backup).toBe('enc_v2_INVALID_CORRUPTED_CIPHERTEXT');
  });
});
