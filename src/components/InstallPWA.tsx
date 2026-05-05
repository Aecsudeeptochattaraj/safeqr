import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Info, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

    // Check if running in an iframe (like AI Studio preview)
    setIsInIframe(window.self !== window.top);

    // Check if device is iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const customTriggerHandler = () => {
      setIsVisible(true);
    };
    window.addEventListener('beforeinstallprompt_custom_trigger', customTriggerHandler);

    // If iOS and not standalone, we can optionally show instructions
    if (isIOSDevice && !window.matchMedia('(display-mode: standalone)').matches) {
       // Only show once per session for iOS to avoid annoyance
       const dismissed = sessionStorage.getItem('pwa_dismissed');
       if (!dismissed) {
         // We don't auto-show for iOS to keep it "Smart", let them find it in Dashboard 
         // or show small hint after some time
       }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('beforeinstallprompt_custom_trigger', customTriggerHandler);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (isStandalone) return null;
  if (!isVisible && !isIOS) return null;

  return (
    <AnimatePresence>
      {(isVisible || (isIOS && !window.matchMedia('(display-mode: standalone)').matches && isVisible)) && (
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="fixed top-20 right-4 lg:right-8 z-[9999] pointer-events-none w-full max-w-[360px] px-4 sm:px-0"
        >
          <div className="bg-white/95 backdrop-blur-xl border border-slate-100 shadow-2xl shadow-blue-900/10 rounded-2xl p-4 flex flex-col pointer-events-auto overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-[12px] font-black uppercase text-slate-900 tracking-tight leading-none">Install App</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-70">
                    Fast Home Screen Access
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {deferredPrompt ? (
                  <button 
                    onClick={handleInstall}
                    className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 whitespace-nowrap"
                  >
                    Install
                  </button>
                ) : (
                  <div className="hidden sm:flex flex-col items-end">
                    <div className="px-2 py-1 bg-amber-50 text-amber-700 text-[8px] font-black uppercase tracking-widest rounded-lg border border-amber-100 italic">
                      {isIOS ? 'Safari Menu' : 'Browser App'}
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => {
                    setIsVisible(false);
                    sessionStorage.setItem('pwa_dismissed', 'true');
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
