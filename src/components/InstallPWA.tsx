import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, Check, MoreVertical, Monitor } from 'lucide-react';

const DISMISSED_KEY = 'pwa_install_dismissed';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isWindows, setIsWindows] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [showWindowsModal, setShowWindowsModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === 'true'; } catch { return false; }
  });

  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    // Check if app is running in an iframe
    try {
      if (window.self !== window.top) {
        setInIframe(true);
      }
    } catch (e) {
      setInIframe(true);
    }

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
    const isWindowsDevice = /win/.test(userAgent) && !isAndroidDevice;

    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);
    setIsWindows(isWindowsDevice);

    // Check if early window.deferredPwaPrompt was captured before React mounted
    if ((window as any).deferredPwaPrompt) {
      setDeferredPrompt((window as any).deferredPwaPrompt);
    }
    (window as any).onPwaPromptReady = (e: any) => {
      setDeferredPrompt(e);
    };

    // Listen for beforeinstallprompt event (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPwaPrompt = e;
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      delete (window as any).onPwaPromptReady;
    };
  }, []);

  const openInNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, 'true'); } catch {}
  };

  const handleInstallClick = async () => {
    const activePrompt = deferredPrompt || (window as any).deferredPwaPrompt;
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choiceResult = await activePrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
        (window as any).deferredPwaPrompt = null;
      } catch (err) {
        console.warn('Erro ao chamar instalador PWA:', err);
        if (isAndroid) setShowAndroidModal(true);
        else if (isWindows) setShowWindowsModal(true);
      }
    } else if (isIOS) {
      setShowIosModal(true);
    } else if (isAndroid) {
      setShowAndroidModal(true);
    } else {
      // Desktop (Windows, Linux, macOS)
      setShowWindowsModal(true);
    }
  };

  // If already running in standalone app or installed, hide
  if (isStandalone || isInstalled) return null;

  // Mostrar banner apenas quando há prompt disponível OU no mobile (iOS/Android) — nunca forçar em desktop sem prompt
  const shouldShowBanner = !dismissed && (deferredPrompt || isAndroid || isIOS || isWindows);

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
              onClick={handleDismiss}
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
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Instalar na Gaveta de Apps do Android</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Instalação nativa WebAPK no Google Chrome</p>
              </div>
            </div>

            {inIframe && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3 rounded-xl text-xs text-amber-800 dark:text-amber-200 space-y-2">
                <p className="font-semibold">⚠️ Pré-visualização Detectada</p>
                <p className="text-[11px] leading-relaxed">
                  Para o Android instalar como <strong>aplicativo completo na gaveta de apps</strong> (WebAPK), o site deve ser aberto diretamente no Chrome, fora do editor.
                </p>
                <button
                  onClick={openInNewTab}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Share className="w-3.5 h-3.5" /> Abrir em Nova Aba do Chrome
                </button>
              </div>
            )}

            <ol className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <span>Abra este link no <strong>Google Chrome</strong> no seu celular Android.</span>
              </li>

              <li className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span>Toque no menu de <strong>três pontos</strong> <MoreVertical className="w-4 h-4 inline text-teal-600 mx-0.5" /> no canto superior do Chrome.</span>
              </li>

              <li className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span>Selecione <strong>"Instalar aplicativo"</strong> (não "Adicionar à tela de início"). Confirmando, o Android compilará o app diretamente para sua <strong>gaveta de apps</strong>!</span>
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
      {/* Modal Guide for Windows / Desktop */}
      {showWindowsModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 relative space-y-4">
            <button
              onClick={() => setShowWindowsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Instalar no Windows</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Funciona no Chrome e no Edge</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <span>Abra este link no <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>.</span>
              </li>
              <li className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span>
                  No <strong>Chrome</strong>: clique no ícone <strong>⊕</strong> na barra de endereço → <strong>"Instalar"</strong>.<br/>
                  No <strong>Edge</strong>: clique nos <strong>3 pontos</strong> → <strong>Apps</strong> → <strong>"Instalar este site como app"</strong>.
                </span>
              </li>
              <li className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span>O app aparecerá no <strong>Menu Iniciar</strong> e na <strong>barra de tarefas</strong> do Windows.</span>
              </li>
            </ol>

            <button
              onClick={() => setShowWindowsModal(false)}
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
