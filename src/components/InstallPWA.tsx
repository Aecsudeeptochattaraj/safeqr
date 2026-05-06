import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Info, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Check if device is iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Auto-show if not dismissed in last 24 hours and not already installed
      const dismissedAt = localStorage.getItem('pwa_install_dismissed');
      const isDismissedRecently = dismissedAt && (Date.now() - parseInt(dismissedAt) < 24 * 60 * 60 * 1000);
      
      if (!isDismissedRecently && !isStandaloneMode) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    const customTriggerHandler = () => {
      setIsVisible(true);
    };
    window.addEventListener('beforeinstallprompt_custom_trigger', customTriggerHandler);

    const installedHandler = () => {
      setIsVisible(false);
      localStorage.setItem('pwa_installed', 'true');
      setIsStandalone(true);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('beforeinstallprompt_custom_trigger', customTriggerHandler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setIsVisible(false);
      
      if (outcome === 'accepted') {
        localStorage.setItem('pwa_installed', 'true');
      }
    } else if (isIOS) {
      // iOS users just need to follow the share instruction
      setIsVisible(false);
      localStorage.setItem('pwa_installed', 'true'); // Assume they followed or will follow
    } else {
      // Fallback for non-iOS/non-prompt cases (e.g. Chrome on Windows without prompt)
      setIsVisible(false);
      alert('To install: Look for the [Add to Home Screen] or [Install] option in your browser menu (usually three dots ⋮ or a plus + icon in the address bar).');
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  };

  if (isStandalone || localStorage.getItem('pwa_installed') === 'true') return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed inset-x-4 bottom-4 md:bottom-8 md:right-8 md:left-auto z-[100] w-full max-w-sm mx-auto md:mx-0"
        >
          <div className="bg-white rounded-[32px] shadow-2xl shadow-blue-900/20 border border-slate-100 overflow-hidden">
            {/* Header with App Logo */}
            <div className="bg-blue-600 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                  <Smartphone className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-white font-black uppercase tracking-tight leading-tight">Park Saathi App</h3>
                  <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest opacity-80">Faster & Offline Access</p>
                </div>
              </div>
              <button 
                onClick={handleDismiss}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Benefits */}
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-2xl">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase">Native Experience</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">5x faster loading and smooth transitions.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-2xl">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase">Instant Access</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">One-tap entry from your home screen.</p>
                  </div>
                </div>
              </div>

              {/* iOS Manual Instructions */}
              {isIOS && !deferredPrompt && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center">
                  <p className="text-[10px] text-amber-900 font-black uppercase leading-tight mb-3">Setup on iPhone/iPad</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-[9px] font-bold text-amber-700 bg-white px-2 py-1 rounded shadow-sm">1. Tap Share</span>
                    <span className="text-[9px] font-bold text-amber-700 bg-white px-2 py-1 rounded shadow-sm">2. Add to Home Screen</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  onClick={handleDismiss}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Not Now
                </button>
                <button 
                  onClick={handleInstall}
                  className="flex-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
                >
                  {isIOS ? 'Got it!' : 'Install Now'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
