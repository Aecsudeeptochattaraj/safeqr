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
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-4 left-4 right-4 z-[9999] pointer-events-none"
        >
          <div className="bg-white border border-blue-100 shadow-2xl shadow-blue-200/50 rounded-2xl p-4 flex flex-col pointer-events-auto max-w-lg mx-auto overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-[14px] font-black uppercase text-slate-900 tracking-tight leading-none">Install Park Saathi</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 opacity-80">
                    {isIOS ? 'Native experience required' : 'Fast home screen access'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {deferredPrompt ? (
                  <button 
                    onClick={handleInstall}
                    className="px-8 py-3 bg-blue-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-200"
                  >
                    Install Now
                  </button>
                ) : (
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest italic mb-1">Incomplete Setup</span>
                    <div className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-100">
                      {isIOS ? 'Safari Menu' : 'Browser Settings'}
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => {
                    setIsVisible(false);
                    sessionStorage.setItem('pwa_dismissed', 'true');
                  }}
                  className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Instruction Panel */}
            {(!deferredPrompt || isInIframe) && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-6 pt-6 border-t border-slate-100 space-y-4"
              >
                {isInIframe && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-4 mb-2">
                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-red-200">
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-black uppercase text-red-900 leading-tight">Installation Blocked</p>
                      <p className="text-[10px] text-red-700 font-medium leading-relaxed mt-1">
                        You are viewing in a sandboxed preview. Tap <span className="font-black bg-white/50 px-1 rounded">↗ Open in New Tab</span> at the top right to enable native installation.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Warning for Incognito/Preview */}
                  <div className="col-span-1 sm:col-span-2 bg-amber-50/50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                      <Info className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase text-amber-900 leading-tight">Installation Tip</p>
                      <p className="text-[9px] text-amber-700 font-bold leading-relaxed mt-1">
                        If "Install" isn't showing, ensure you are <span className="font-black underline">NOT in Incognito/Private mode</span> and using a supported browser like Chrome or Safari.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-100 group hover:border-blue-200 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[12px] font-black text-blue-600 mb-3 group-hover:scale-110 transition-transform">1</div>
                    <p className="text-[11px] text-slate-600 font-bold uppercase tracking-tight leading-tight">
                      {isIOS 
                        ? 'Tap "Share" button in Safari' 
                        : 'Tap "3 Dots" in address bar'}
                    </p>
                  </div>
                  <div className="bg-slate-50/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-100 group hover:border-blue-200 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[12px] font-black text-blue-600 mb-3 group-hover:scale-110 transition-transform">2</div>
                    <p className="text-[11px] text-slate-600 font-bold uppercase tracking-tight leading-tight">
                      {isIOS 
                        ? 'Select "Add to Home Screen"' 
                        : 'Select "Install App"'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
