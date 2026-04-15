import { useState, useEffect } from 'react';
import { syncService } from './syncService';
import { toast } from 'sonner';

export function useSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(syncService.getQueueLength());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexão restabelecida!', {
        description: 'Seu sistema está online novamente.',
      });
      // Tenta sincronizar se houver itens na fila
      if (syncService.getQueueLength() > 0) {
        sync();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Modo Offline Ativado', {
        description: 'Seus próximos cadastros serão salvos no dispositivo e sincronizados quando houver rede.',
      });
    };

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
    if (!navigator.onLine) return;
    setIsSyncing(true);
    
    try {
      if (syncService.getQueueLength() > 0) {
        toast.promise(syncService.sync(), {
          loading: 'Sincronizando banco de dados...',
          success: () => {
            setPendingCount(syncService.getQueueLength());
            return 'Sincronização concluída com sucesso!';
          },
          error: 'Ocorreu um erro durante a sincronização.',
        });
      } else {
        await syncService.sync();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
      setPendingCount(syncService.getQueueLength());
    }
  };

  return { isOnline, pendingCount, isSyncing, sync };
}
