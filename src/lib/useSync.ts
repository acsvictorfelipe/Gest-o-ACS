import { useState, useEffect } from 'react';
import { syncService } from './syncService';

export function useSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(syncService.getQueueLength());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setPendingCount(syncService.getQueueLength());
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const sync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    await syncService.sync();
    setPendingCount(syncService.getQueueLength());
    setIsSyncing(false);
  };

  return { isOnline, pendingCount, isSyncing, sync };
}
