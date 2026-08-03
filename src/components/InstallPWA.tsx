import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, Check, MoreVertical } from 'lucide-react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed PWA)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isInStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);

    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // Listen for beforeinstallprompt event (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIosModal(true);
    } else if (isAndroid || !deferredPrompt) {
      setShowAndroidModal(true);
    }
  };

  // If already running in standalone app or installed, hide
  if (isStandalone || isInstalled) return null;

  // Show banner if deferredPrompt is present OR on Android/iOS/mobile or if not dismissed
  const shouldShowBanner = !dismissed && (deferredPrompt || isAndroid || isIOS || true);

  return (
    <>
      {/* Install Banner */}
      {shouldShowBanner && (
        <div className="bg-teal-700 dark:bg-teal-900/90 text-white px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs font-bold truncate">Instalar Aplicativo Gestão ACS</p>
              <p className="text-[10px] text-teal-100 truncate">Adicione à gaveta de apps do Android para uso rápido e offline</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-white hover:bg-teal-50 text-teal-800 text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-teal-700" />
              Instalar
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-teal-200 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Guide for Android */}
      {showAndroidModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 relative space-y-4">
            <button
              onClick={() => setShowAndroidModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Instalar no Android (Gaveta de Apps)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Siga estes passos no seu navegador Chrome:</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <span>Toque no menu de <strong>três pontos</strong> <MoreVertical className="w-4 h-4 inline text-teal-600 mx-0.5" /> no canto superior direito do Chrome.</span>
              </li>

              <li className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span>Selecione a opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à Tela Inicial"</strong>.</span>
              </li>

              <li className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span>Confirme em <strong>Instalar</strong>. O ícone do <strong>Gestão ACS</strong> aparecerá na sua gaveta de apps do celular!</span>
              </li>
            </ol>

            <button
              onClick={() => setShowAndroidModal(false)}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" /> Entendi
            </button>
          </div>
        </div>
      )}

      {/* Modal Guide for iOS Safari */}
      {showIosModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 relative space-y-4">
            <button
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Como Instalar no iPhone/iPad</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Siga os passos abaixo no Safari:</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <span>Toque no botão <strong>Compartilhar</strong> <Share className="w-4 h-4 inline text-teal-600 mx-0.5" /> na barra inferior do Safari.</span>
              </li>

              <li className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span>Role as opções para baixo e selecione <strong>Adicionar à Tela de Início</strong> <PlusSquare className="w-4 h-4 inline text-teal-600 mx-0.5" />.</span>
              </li>

              <li className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span>Toque em <strong>Adicionar</strong> no canto superior direito para concluir.</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" /> Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
