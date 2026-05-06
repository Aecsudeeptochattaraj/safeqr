import { Download, Smartphone, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';

export function InstallBanner() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);
    
    // Hide if already installed or recently dismissed
    if (localStorage.getItem('pwa_installed') === 'true' || isStandaloneMode) {
      setIsVisible(false);
    }
  }, []);

  const handleInstallClick = () => {
    window.dispatchEvent(new Event('beforeinstallprompt_custom_trigger'));
    // Scroll to the custom popup if needed, or just let it show
  };

  if (!isVisible) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[32px] bg-slate-900 border border-white/10"
    >
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/10 blur-[80px] -ml-24 -mb-24" />

      <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
            <Zap className="w-3 h-3 text-blue-400 fill-blue-400" />
            <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">PWA Recommended</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight italic mb-4 leading-none">
            Install Park Saathi
          </h2>
          
          <p className="text-slate-400 text-sm md:text-base font-medium max-w-md leading-relaxed mb-8">
            Access your QR codes 5x faster from your home screen with our native mobile experience.
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                <ShieldCheck className="w-3 h-3 text-blue-400" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Secure & Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                <Smartphone className="w-3 h-3 text-blue-400" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Desktop & Mobile</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          <button 
            onClick={handleInstallClick}
            className="w-full md:w-auto group relative px-12 py-6 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.3em] overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-blue-500/20"
          >
            <div className="relative flex items-center justify-center gap-3">
              <Download className="w-4 h-4 text-blue-600 transition-transform group-hover:-translate-y-1" />
              Start Installation
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
