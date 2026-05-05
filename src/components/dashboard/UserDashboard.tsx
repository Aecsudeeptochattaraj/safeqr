import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Vehicle } from '../../types';
import { QRCodeCanvas } from 'qrcode.react';
import { Plus, QrCode, Calendar, ShieldCheck, ExternalLink, Download, Car, Smartphone, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { drawBrandedQR } from '../../lib/qrBranding';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState<Vehicle | null>(null);
  const [isPWA, setIsPWA] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    setIsPWA(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
    setIsInIframe(window.self !== window.top);
    
    if (!user) return;
    const q = query(collection(db, 'vehicles'), where('ownerUid', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => doc.data() as Vehicle);
      setVehicles(docs);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const downloadQR = async (vehicleId: string) => {
    const canvas = document.createElement('canvas');
    const qrSrc = document.getElementById(`qr-src-${vehicleId}`)?.querySelector('canvas');
    if (qrSrc) {
      await drawBrandedQR(canvas, vehicleId, qrSrc);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `MyParkSaathi-${vehicleId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <Car className="w-5 h-5 text-blue-600" />
             <span className="text-sm font-bold uppercase tracking-widest text-slate-500">My Vehicles</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Vehicle Dashboard</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage your registered vehicles and safety QR codes.</p>
        </div>
        <div>
          <Link 
            to="/register-vehicle"
            className="flex items-center px-8 py-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Register New Vehicle
          </Link>
        </div>
      </div>

      {!isPWA && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 relative overflow-hidden"
        >
          <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-[32px] p-8 md:p-10 text-white shadow-2xl shadow-blue-200">
            {/* Background elements */}
            <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12 hidden md:block">
              <Smartphone className="w-64 h-64" />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-inner border border-white/20">
                  <Download className="w-10 h-10 text-white animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <span className="px-3 py-1 bg-blue-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">PWA Recommended</span>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Install Park Saathi</h2>
                  </div>
                  <p className="text-blue-100 text-sm font-bold uppercase tracking-widest opacity-80 max-w-md">
                    Access your QR codes 5x faster from your home screen with our native mobile experience.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center md:items-end gap-4 w-full md:w-auto">
                <button 
                  onClick={() => window.dispatchEvent(new Event('beforeinstallprompt_custom_trigger'))}
                  className="w-full md:w-auto px-12 py-5 bg-white text-blue-900 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-950/20 flex items-center justify-center gap-3"
                >
                  Start Installation
                </button>
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-300 uppercase tracking-widest">
                  <ShieldCheck className="w-3 h-3 text-blue-500" />
                  Secure & Lightweight
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-slate-50 animate-pulse rounded-2xl border border-slate-200"></div>)}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-24 flex flex-col items-center text-center shadow-sm">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 border border-slate-200">
            <Car className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Vehicles Registered</h3>
          <p className="text-slate-500 max-w-sm mb-8">Register your car, bike, or scooter to get a safety QR code.</p>
          <Link to="/register-vehicle" className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">Start Registration</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {vehicles.map((v) => (
             <div 
               key={v.id}
               className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:border-blue-500 transition-colors flex flex-col"
             >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className={cn(
                      "inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full mb-3",
                      v.status === 'active' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {v.status === 'active' ? 'Active' : 'Awaiting Approval'}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{v.vehicleNumber}</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">{v.ownerName}</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (v.status !== 'active') return;
                      setSelectedQR(v);
                    }}
                    disabled={v.status !== 'active'}
                    className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
                      v.status === 'active' 
                        ? "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white" 
                        : "bg-slate-100 text-slate-300 cursor-not-allowed"
                    )}
                  >
                    <QrCode className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-3 mb-8 bg-slate-50 p-4 rounded-xl">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Valid until: {v.subscriptionExpiry.toDate().toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span>Safety Profile Protected</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-auto">
                  <Link 
                    to={`/s/${v.id}`}
                    target="_blank"
                    className={cn(
                      "flex-1 py-3 px-4 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-colors",
                      v.status === 'active'
                        ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        : "bg-slate-50 border-slate-100 text-slate-300 pointer-events-none"
                    )}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Public View
                  </Link>
                  <button 
                    onClick={() => {
                      if (v.status !== 'active') return;
                      setSelectedQR(v);
                    }}
                    disabled={v.status !== 'active'}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-colors",
                      v.status === 'active'
                        ? "bg-slate-900 text-white hover:bg-slate-800"
                        : "bg-slate-100 text-slate-300 cursor-not-allowed"
                    )}
                  >
                    {v.status === 'active' ? 'View QR Code' : 'Locked'}
                  </button>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* QR Code Modal */}
      <AnimatePresence>
        {selectedQR && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-8 max-w-sm w-full relative shadow-2xl flex flex-col items-center text-center"
            >
              <div className="bg-white p-6 rounded-xl border border-slate-200 mb-6 shadow-sm">
                <QRCodeCanvas 
                  id={`qr-${selectedQR.id}`}
                  value={`${window.location.origin}/s/${selectedQR.id}`} 
                  size={200}
                  level="H"
                  includeMargin={false}
                />
                {/* Hidden high-res source for branded download */}
                <div className="hidden" id={`qr-src-${selectedQR.id}`}>
                   <QRCodeCanvas value={`${window.location.origin}/s/${selectedQR.id}`} size={600} />
                </div>
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">{selectedQR.vehicleNumber}</h3>
              <p className="text-slate-500 text-sm font-medium mb-8">Scan to view contact details</p>
              
              <div className="flex flex-col gap-3 w-full">
                <button 
                  onClick={() => downloadQR(selectedQR.id)}
                  className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download QR Code
                </button>
                <button 
                  onClick={() => setSelectedQR(null)}
                  className="py-3 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
