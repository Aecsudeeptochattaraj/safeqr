import { Smartphone, Download, CheckCircle, ChevronRight, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';

export function InstallBanner() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);
    
    const dismissed = localStorage.getItem('pwa_banner_dismissed') === 'true';
    setIsDismissed(dismissed);

    const resetHandler = () => {
      localStorage.removeItem('pwa_banner_dismissed');
      setIsDismissed(false);
    };
    window.addEventListener('pwa_reset_state', resetHandler);
    return () => window.removeEventListener('pwa_reset_state', resetHandler);
  }, []);

  const triggerPrompt = () => {
    const event = new CustomEvent('beforeinstallprompt_custom_trigger');
    window.dispatchEvent(event);
  };

  if (isStandalone || isDismissed) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group mb-8"
    >
      {/* Decorative background effects */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-amber-400 to-blue-600 rounded-[36px] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
      
      <div className="relative bg-white border-4 border-blue-600 rounded-[32px] p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
        {/* Playful Ding-Dong Icon */}
        <div className="relative shrink-0">
          <motion.div 
            animate={{ 
              rotate: [0, -20, 20, -20, 20, 0],
              scale: [1, 1.1, 1.1, 1.1, 1.1, 1]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 2,
              repeatDelay: 3
            }}
            className="w-24 h-24 bg-blue-600 rounded-[32px] flex items-center justify-center shadow-xl shadow-blue-200 ring-8 ring-blue-50"
          >
            <Bell className="w-12 h-12 text-white fill-white/20" />
          </motion.div>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ 
              scale: [0, 1.2, 1],
              rotate: [0, -15, 15, -15, 15, 0]
            }}
            transition={{ 
              delay: 1, 
              duration: 1,
              repeat: Infinity,
              repeatDelay: 4
            }}
            className="absolute -top-3 -right-3 bg-amber-400 text-amber-950 text-[10px] font-black px-3 py-1 rounded-full border-4 border-white shadow-lg uppercase tracking-widest whitespace-nowrap"
          >
            DING DONG! 🔔
          </motion.div>
        </div>

        {/* Text Content */}
        <div className="flex-1 text-center md:text-left">
          <div className="inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            Recommended for Mobile
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">
            Get the <span className="text-blue-600">Official</span> App
          </h2>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-wide flex flex-wrap items-center justify-center md:justify-start gap-4">
            <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> Super Fast</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> No Browser Needed</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> Instant Alerts</span>
          </p>
        </div>

        {/* Action Button */}
        <div className="w-full md:w-auto">
          <button 
            onClick={triggerPrompt}
            className="w-full md:w-auto group/btn relative"
          >
            <div className="absolute -inset-1 bg-blue-600 rounded-2xl blur opacity-30 group-hover/btn:opacity-60 transition"></div>
            <div className="relative bg-blue-600 text-white px-10 py-6 rounded-2xl font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-blue-700 active:scale-95 transition-all">
              Install App
              <Download className="w-5 h-5 group-hover/btn:translate-y-1 transition-transform" />
            </div>
          </button>
        </div>

        {/* Close Button */}
        <button 
          onClick={() => {
            setIsDismissed(true);
            localStorage.setItem('pwa_banner_dismissed', 'true');
          }}
          className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 transition-colors"
        >
          <Smartphone className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
