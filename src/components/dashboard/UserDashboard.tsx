import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Vehicle } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, QrCode, Calendar, ShieldCheck, ExternalLink, Download, Car } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState<Vehicle | null>(null);

  useEffect(() => {
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

  const downloadQR = (vehicleId: string) => {
    const svg = document.getElementById(`qr-${vehicleId}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-${vehicleId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
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
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full mb-3">Active</span>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{v.vehicleNumber}</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">{v.ownerName}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedQR(v)}
                    className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
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
                    className="flex-1 py-3 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Public View
                  </Link>
                  <button 
                    onClick={() => setSelectedQR(v)}
                    className="flex-1 py-3 px-4 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
                  >
                    View QR Code
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
                <QRCodeSVG 
                  id={`qr-${selectedQR.id}`}
                  value={`${window.location.origin}/s/${selectedQR.id}`} 
                  size={200}
                  level="H"
                  includeMargin={false}
                />
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
