import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';

// Initialize Sentry gracefully
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
  console.log('Sentry telemetria inicializada com sucesso.');
} else {
  console.log('Sentry DSN não configurado. Fallback de console ativo.');
}

// Handle Vite dynamic import chunk loading errors (e.g. after a new build deployment on Vercel)
window.addEventListener('vite:preloadError', () => {
  console.warn('Vite preload error detected (chunk updated/missing). Reloading window...');
  const reloaded = sessionStorage.getItem('vite_preload_error_reloaded');
  if (!reloaded) {
    sessionStorage.setItem('vite_preload_error_reloaded', 'true');
    window.location.reload();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason?.message || event?.reason || '';
  if (
    typeof reason === 'string' &&
    (reason.includes('Failed to fetch dynamically imported module') ||
     reason.includes('Importing a module script failed') ||
     reason.includes('dynamically imported module'))
  ) {
    console.warn('Dynamic import module error caught globally. Forcing reload...');
    const reloaded = sessionStorage.getItem('chunk_import_reloaded');
    if (!reloaded) {
      sessionStorage.setItem('chunk_import_reloaded', 'true');
      window.location.reload();
    }
  }
});

// Register service worker for installable Android webapp (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });
  });
}

function ErrorFallback({ error, resetErrorBoundary }: { error: any; resetErrorBoundary: () => void }) {
  const clearCacheAndReload = () => {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(r => r.unregister());
        });
      }
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
    } catch (e) {
      console.warn('Error clearing caches:', e);
    }
    window.location.reload();
  };

  const downloadBackupData = () => {
    try {
      const backup: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          backup[key] = localStorage.getItem(key) || '';
        }
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `gestao_acs_backup_emergencia_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.warn('Não foi possível gerar o backup dos dados offline:', e);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 mb-6">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Ocorreu um erro inesperado
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          O aplicativo encontrou uma falha no dispositivo. Não se preocupe, nosso sistema de telemetria (Sentry) já registrou os detalhes técnicos para correção.
        </p>

        {error && (
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-left text-xs font-mono text-red-600 dark:text-red-400 mb-6 overflow-auto max-h-32">
            <strong>Erro:</strong> {error.message || error.toString()}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={resetErrorBoundary}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm transition duration-150 ease-in-out cursor-pointer"
          >
            Tentar Novamente / Recarregar
          </button>
          
          <button
            onClick={clearCacheAndReload}
            className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl font-medium transition duration-150 ease-in-out cursor-pointer text-xs"
          >
            Limpar Cache do Navegador e Recarregar
          </button>

          <button
            onClick={downloadBackupData}
            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition duration-150 ease-in-out cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Salvar Cópia dos Dados Offline
          </button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={({ error, resetError }) => (
      <ErrorFallback error={error} resetErrorBoundary={resetError} />
    )}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);


