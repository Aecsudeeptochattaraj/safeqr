import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white border-t border-slate-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-blue-600 p-2 rounded">
                 <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-white tracking-tighter uppercase italic">Safe<span className="text-blue-500">QR</span></span>
            </div>
            <p className="text-slate-400 text-sm font-medium max-w-sm leading-relaxed">
              Global infrastructure for vehicle-to-human communication. Bridging the gap between physical assets and secure digital identity through encrypted QR nodes.
            </p>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Network</h3>
            <ul className="space-y-4">
              <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing Engine</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Feature Protocol</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Documentation</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Organization</h3>
            <ul className="space-y-4">
              <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Corporate</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Terms of Op</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Encryption</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">© {new Date().getFullYear()} SafeQR Global Operations. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/20"></span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">All Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
