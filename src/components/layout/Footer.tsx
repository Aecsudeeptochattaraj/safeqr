import { Shield, Smartphone, Download } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Footer() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
  }, []);

  const handleInstallClick = () => {
    window.dispatchEvent(new Event('beforeinstallprompt_custom_trigger'));
  };

  return (
    <footer className="bg-slate-900 text-white border-t border-slate-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!isStandalone && (
          <div className="mb-16 p-8 bg-blue-600/10 border border-blue-500/20 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-8 group">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/50 group-hover:scale-110 transition-transform">
                <Smartphone className="w-7 h-7 text-white" />
              </div>
              <div>
                <h4 className="text-xl font-black text-white uppercase tracking-tight italic">Install My Park Saathi Mobile</h4>
                <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mt-1">Get instant QR access & native alerts.</p>
              </div>
            </div>
            <button 
              onClick={handleInstallClick}
              className="w-full md:w-auto px-10 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
            >
              <Download className="w-4 h-4" />
              Install Now
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-blue-600 p-2 rounded">
                 <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-white tracking-tighter uppercase italic">MyParkSaathi</span>
            </div>
            <p className="text-slate-400 text-sm font-medium max-w-sm leading-relaxed mb-8">
              Global infrastructure for vehicle-to-human communication. Bridging the gap between physical assets and secure digital identity through encrypted QR nodes.
            </p>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Direct Contact</p>
              <a 
                href="mailto:aecsudeepto80@gmail.com" 
                className="text-lg font-black text-blue-400 hover:text-blue-300 transition-colors"
              >
                aecsudeepto80@gmail.com
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Partnership</h3>
            <ul className="space-y-4">
              <li><a href="mailto:aecsudeepto80@gmail.com?subject=Business%20Inquiry" className="text-sm text-slate-400 hover:text-white transition-colors">Business with Us</a></li>
              <li><a href="mailto:aecsudeepto80@gmail.com?subject=Collaboration%20Inquiry" className="text-sm text-slate-400 hover:text-white transition-colors">Collaborate with Us</a></li>
              <li><a href="mailto:aecsudeepto80@gmail.com?subject=Connect%20Inquiry" className="text-sm text-slate-400 hover:text-white transition-colors">Connect Us</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Legal</h3>
            <ul className="space-y-4">
              <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Terms of Op</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Privacy Protocol</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Encryption standards</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">© {new Date().getFullYear()} MyParkSaathi Global Operations. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/20"></span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">All Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
