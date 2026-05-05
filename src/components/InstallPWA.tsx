import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
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

  if (!isVisible && !isIOS) return null;

  return (
    <AnimatePresence>
      {(isVisible || (isIOS && !window.matchMedia('(display-mode: standalone)').matches && isVisible)) && (
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-4 left-4 right-4 z-[9999] pointer-events-none"
        >
          <div className="bg-white border border-blue-100 shadow-2xl shadow-blue-200/50 rounded-2xl p-4 flex items-center justify-between pointer-events-auto max-w-lg mx-auto overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Download className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-wider">Install My Park Saathi</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">
                  {isIOS ? 'Tap Share and "Add to Home Screen"' : 'Fast access from your home screen'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {deferredPrompt && (
                <button 
                  onClick={handleInstall}
                  className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-200"
                >
                  Install
                </button>
              )}
              {!deferredPrompt && !isIOS && (
                <div className="px-3 py-1 bg-amber-50 text-amber-700 text-[8px] font-black uppercase tracking-widest rounded border border-amber-100 italic">
                  Use Browser Menu
                </div>
              )}
              <button 
                onClick={() => {
                  setIsVisible(false);
                  sessionStorage.setItem('pwa_dismissed', 'true');
                }}
                className="p-2 text-slate-300 hover:text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
