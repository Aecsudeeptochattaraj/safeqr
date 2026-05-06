import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Info, ExternalLink, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { logEvent } from '../lib/firebase';

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
      
      logEvent('pwa_prompt_available');

      // Auto-show if not dismissed in last 24 hours and not already installed
      const dismissedAt = localStorage.getItem('pwa_install_dismissed');
      const isDismissedRecently = dismissedAt && (Date.now() - parseInt(dismissedAt) < 24 * 60 * 60 * 1000);
      
      if (!isDismissedRecently && !isStandaloneMode) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    const customTriggerHandler = () => {
      console.log('[PWA] Custom trigger received. deferredPrompt:', !!deferredPrompt);
      if (deferredPrompt) {
        handleInstall();
      } else {
        setIsVisible(true);
      }
    };
    window.addEventListener('beforeinstallprompt_custom_trigger', customTriggerHandler);

    const installedHandler = () => {
      console.log('[PWA] App installed successfully');
      setIsVisible(false);
      localStorage.setItem('pwa_installed', 'true');
      setIsStandalone(true);
    };
    window.addEventListener('appinstalled', installedHandler);

    const resetHandler = () => {
      localStorage.removeItem('pwa_install_dismissed');
      localStorage.removeItem('pwa_installed');
      setIsVisible(true);
    };
    window.addEventListener('pwa_reset_state', resetHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('beforeinstallprompt_custom_trigger', customTriggerHandler);
      window.removeEventListener('appinstalled', installedHandler);
      window.removeEventListener('pwa_reset_state', resetHandler);
    };
  }, [deferredPrompt]); // Re-bind if deferredPrompt changes

  const [isInstalled, setIsInstalled] = useState(false);

  const handleInstall = async () => {
    logEvent('pwa_install_click', { platform: isIOS ? 'ios' : 'android_desktop', hasPrompt: !!deferredPrompt });
    
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] User choice: ${outcome}`);
        setDeferredPrompt(null);
        
        if (outcome === 'accepted') {
          logEvent('pwa_install_accepted');
          setIsInstalled(true);
          setTimeout(() => {
            setIsVisible(false);
            localStorage.setItem('pwa_installed', 'true');
          }, 3000);
        } else {
          logEvent('pwa_install_dismissed_native');
          setIsVisible(false);
        }
      } catch (err) {
        console.error('[PWA] Install error:', err);
        setIsVisible(true); // Show modal if native fails
      }
    } else if (isIOS) {
      setIsVisible(true); 
    } else {
      // For Android/Desktop with no prompt, showing the modal is the right fallback
      setIsVisible(true);
    }
  };

  const handleDismiss = () => {
    logEvent('pwa_install_dismissed_ui');
    setIsVisible(false);
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  };

  if (isStandalone || localStorage.getItem('pwa_installed') === 'true') return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, y: 100, rotate: -5 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0, 
            rotate: 0,
          }}
          exit={{ opacity: 0, scale: 0.8, y: 100 }}
          className="fixed inset-x-4 bottom-4 md:bottom-8 md:right-8 md:left-auto z-[100] w-full max-w-sm mx-auto md:mx-0"
        >
          {/* Ding-Dong Sound Element (Visual Only) */}
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, -15, 15, -15, 15, 0]
            }}
            transition={{ 
              delay: 0.5, 
              duration: 1, 
              repeat: 2,
              repeatDelay: 3
            }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[10px] font-black px-3 py-1 rounded-full shadow-lg z-10 border-2 border-white uppercase tracking-widest"
          >
            Ding Dong! 🔔
          </motion.div>

          <div className="bg-white rounded-[32px] shadow-2xl shadow-blue-900/40 border-4 border-blue-600 overflow-hidden relative">
            {/* Pulsing Highlight */}
            <motion.div 
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-blue-50/50 pointer-events-none"
            />
            
            {/* Header with App Logo */}
            <div className="relative bg-blue-600 p-6 flex items-center justify-between">
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
              {isInstalled ? (
                <div className="py-12 text-center">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </motion.div>
                  <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Hooray! 🎉</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Install Successful</p>
                </div>
              ) : (
                <>
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

                  {/* Android/Others Manual Instructions (when native prompt fails) */}
                  {!isIOS && !deferredPrompt && (
                    <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-center">
                      <p className="text-[10px] text-blue-900 font-black uppercase leading-tight mb-3">One last step to install</p>
                      <div className="space-y-2">
                        <p className="text-[9px] font-bold text-blue-700">1. Tap the three dots <span className="text-sm">⋮</span> in your browser menu</p>
                        <p className="text-[9px] font-bold text-blue-700">2. Tap <span className="bg-blue-600 text-white px-2 py-0.5 rounded">Install App</span> or <span className="bg-blue-600 text-white px-2 py-0.5 rounded">Add to Home screen</span></p>
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
                    {(deferredPrompt || isIOS) && (
                      <button 
                        onClick={handleInstall}
                        className="flex-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
                      >
                        {isIOS ? 'Got it!' : 'Install Now'}
                      </button>
                    )}
                    {!isIOS && !deferredPrompt && (
                      <button 
                        onClick={handleDismiss}
                        className="flex-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
                      >
                        Okay, Done!
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
