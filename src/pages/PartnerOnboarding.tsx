import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Users, Car, Smartphone, MessageCircle, Sparkles, Loader2, 
  CheckCircle, QrCode, Camera, ShieldCheck, ArrowRight, Package,
  TrendingUp, Coins, Download
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { QRCodeSVG } from 'qrcode.react';
import { 
  doc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc,
  runTransaction, onSnapshot, orderBy, limit
} from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { QRInventory } from '../types';
import { scanVehicleDetails } from '../lib/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function PartnerOnboarding() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [availableStock, setAvailableStock] = useState<QRInventory[]>([]);
  const [internalError, setInternalError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    whatsapp: '',
    vehicleNumber: '',
    vehicleType: 'car' as 'car' | 'bike' | 'scooter',
    vehicleBrand: '',
    vehicleColor: '',
    selectedQrId: '',
    plan: '2yr' as '1yr' | '2yr' | '5yr'
  });

  const [isAiScanning, setIsAiScanning] = useState(false);

  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [registeredVehicleId, setRegisteredVehicleId] = useState<string | null>(null);
  const [syntheticOwnerUid, setSyntheticOwnerUid] = useState<string | null>(null);

  useEffect(() => {
    console.log('PartnerOnboarding mounted. User:', user?.email, 'Role:', profile?.role);
  }, [user, profile]);

  const submitPartnerPayment = async () => {
    if (!transactionId || !screenshot || !registeredVehicleId || !syntheticOwnerUid) {
      setApiError("Please provide Transaction ID and upload screenshot.");
      return;
    }

    setLoading(true);
    setApiError(null);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('screenshot', screenshot);
      formDataToSend.append('transactionId', transactionId);
      formDataToSend.append('userId', syntheticOwnerUid);

      const apiResponse = await fetch('/api/submitPayment', {
        method: 'POST',
        body: formDataToSend
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.message || 'Payment processing failed');
      }

      const { scrubbedImage } = await apiResponse.json();

      const paymentRef = doc(db, 'payments', transactionId);
      await setDoc(paymentRef, {
        id: transactionId,
        userId: syntheticOwnerUid,
        vehicleId: registeredVehicleId,
        transactionId,
        amount: formData.plan === '5yr' ? 1000 : (formData.plan === '2yr' ? 500 : 250),
        status: 'pending',
        channel: 'partner',
        partnerUid: user?.uid,
        scrubbedScreenshotUrl: scrubbedImage,
        createdAt: serverTimestamp(),
      });

      setStep(5);
    } catch (err: any) {
      console.error("Partner payment error:", err);
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const completeMapping = async () => {
    if (!user || !formData.selectedQrId || profile?.role !== 'partner') {
      setInternalError("Required parameters or permissions missing.");
      return;
    }

    setLoading(true);
    try {
      const vId = doc(collection(db, 'vehicles')).id;
      const ownerUid = 'PARTNER_REGISTERED_' + Math.random().toString(36).slice(2, 9);
      
      await runTransaction(db, async (transaction) => {
        const vehicleRef = doc(db, 'vehicles', vId);
        const qrRef = doc(db, 'qr_inventory', formData.selectedQrId);
        
        const qrSnap = await transaction.get(qrRef);
        if (!qrSnap.exists()) throw new Error("QR not found.");
        const qrData = qrSnap.data() as QRInventory;
        
        if (qrData.partnerUid !== user.uid) throw new Error("Permission Denied.");
        if (qrData.status === 'assigned') throw new Error("Already assigned.");

        const expiryDate = new Date();
        const years = formData.plan === '5yr' ? 5 : formData.plan === '2yr' ? 2 : 1;
        expiryDate.setFullYear(expiryDate.getFullYear() + years);

        transaction.set(vehicleRef, {
          id: vId,
          ownerUid: ownerUid,
          partnerUid: user.uid,
          qrId: formData.selectedQrId,
          vehicleNumber: (formData.vehicleNumber || '').trim().toUpperCase(),
          model: formData.vehicleBrand,
          color: formData.vehicleColor,
          type: formData.vehicleType,
          ownerName: formData.customerName,
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          emergencyContact: formData.phone,
          planId: formData.plan,
          subscriptionExpiry: expiryDate,
          status: 'pending_verification',
          isDeleted: false,
          createdAt: serverTimestamp(),
        });

        transaction.update(qrRef, {
          status: 'assigned',
          mappedVehicleId: vId,
          updatedAt: serverTimestamp()
        });

        const commRef = doc(collection(db, 'commissions'));
        transaction.set(commRef, {
          id: commRef.id,
          partnerUid: user.uid,
          vehicleId: vId,
          amount: formData.plan === '5yr' ? 200 : 100,
          status: 'pending',
          createdAt: serverTimestamp(),
        });
      });

      setRegisteredVehicleId(vId);
      setSyntheticOwnerUid(ownerUid);
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Transaction Failed:', err);
      setInternalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'qr_inventory'), 
        where('partnerUid', '==', user.uid),
        where('status', '==', 'available')
      );
      
      const unsub = onSnapshot(q, (snap) => {
        setAvailableStock(snap.docs.map(d => ({ 
          ...d.data(), 
          id: d.id 
        } as QRInventory)));
      }, (err) => {
        console.error('Inventory snapshot error:', err);
      });

      return () => unsub();
    } catch (err: any) {
      console.error('Snapshot Setup Error:', err);
      setInternalError(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (step !== 5 || !syntheticOwnerUid) return;

    const q = query(
      collection(db, 'payments'),
      where('userId', '==', syntheticOwnerUid),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const payment = snap.docs[0].data();
        if (payment.status === 'verified') {
          setPaymentVerified(true);
        }
      }
    });

    return () => unsub();
  }, [step, syntheticOwnerUid]);

  if (authLoading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
       <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  if (internalError) return (
    <div className="p-8 text-red-600 font-bold bg-red-50 min-h-screen flex items-center justify-center">
      <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl text-center">
        <h1 className="text-2xl font-black mb-4 uppercase tracking-tighter">System Error</h1>
        <p className="text-slate-500 mb-6 font-medium">{internalError}</p>
        <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95">Reload Page</button>
      </div>
    </div>
  );

  const handleAiScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiScanning(true);
    setApiError(null);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = (e) => {
          const res = e.target?.result as string;
          resolve(res.split(',')[1]);
        };
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const extracted = await scanVehicleDetails(base64);
      
      setFormData(prev => ({ 
        ...prev, 
        vehicleNumber: extracted.plate !== 'NOT_FOUND' ? extracted.plate.toUpperCase() : prev.vehicleNumber,
        vehicleBrand: extracted.brand !== 'NOT_FOUND' ? extracted.brand.toUpperCase() : prev.vehicleBrand,
        vehicleColor: extracted.color !== 'NOT_FOUND' ? extracted.color.toUpperCase() : prev.vehicleColor,
        vehicleType: extracted.type !== 'NOT_FOUND' ? extracted.type.toLowerCase() : prev.vehicleType
      }));
    } catch (err) {
      console.error('AI Scan failed:', err);
      setApiError('Auto-scan failed. Please enter details manually.');
    } finally {
      setIsAiScanning(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const downloadQR = () => {
    const qrSrc = document.getElementById(`success-qr`)?.querySelector('svg');
    if (!qrSrc) return;
    
    const svgData = new XMLSerializer().serializeToString(qrSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 600;
    const padding = 60;
    const header = 120;
    const footer = 100;

    canvas.width = size + (padding * 2);
    canvas.height = size + header + footer + (padding * 2);

    const img = new Image();
    img.onload = () => {
      // Background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Brand
      ctx.fillStyle = '#1E293B';
      ctx.font = 'black 60px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("MyParkSaathi", canvas.width / 2, padding + 70);

      // Subtitle
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText("SMART VEHICLE TAG", canvas.width / 2, padding + 110);

      // QR
      ctx.drawImage(img, padding, padding + header, size, size);

      // ID
      ctx.fillStyle = '#3B82F6';
      ctx.font = '900 45px monospace';
      ctx.fillText(formData.selectedQrId, canvas.width / 2, canvas.height - padding - 20);

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `MYPARK_TAG_${formData.selectedQrId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-12 pb-24 px-4 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-12">
           <div>
             <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-1">Partner Operation</h2>
             <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Onboard Customer</h1>
           </div>
           <div className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-3">
              <Package className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">{availableStock.length} In Stock</span>
           </div>
        </div>

        {/* Custom Progress Bar */}
        <div className="grid grid-cols-5 gap-2 mb-12">
           {[1, 2, 3, 4, 5].map(s => (
             <div key={s} className={cn(
               "h-1.5 rounded-full transition-all duration-500",
               step >= s ? "bg-blue-600 shadow-sm" : "bg-slate-200"
             )} />
           ))}
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
                 <Users className="w-4 h-4 text-blue-600" />
                 Customer Profile
               </h3>
               
               <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Full Name</label>
                    <input 
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      placeholder="ENTER NAME"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-900 uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Phone Number</label>
                      <input 
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="MOBILE NO."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">WhatsApp</label>
                      <input 
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={handleInputChange}
                        placeholder="WHATSAPP NO."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-900"
                      />
                    </div>
                  </div>
               </div>

               <button 
                onClick={() => setStep(2)}
                disabled={!formData.customerName || !formData.phone}
                className="w-full mt-8 py-5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl"
              >
                Continue to Vehicle
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-600" />
                  Vehicle Attributes
                </h3>

                <div className="space-y-6">
                   <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center gap-4 relative group hover:border-blue-600 transition-colors">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center">
                        {isAiScanning ? <Loader2 className="w-6 h-6 text-blue-600 animate-spin" /> : <Camera className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />}
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">Upload Vehicle Proof</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">AI will detect plate number</p>
                      </div>
                      <input type="file" accept="image/*" onChange={handleAiScan} className="absolute inset-0 opacity-0 cursor-pointer" />
                   </div>

                   <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Validated Plate Number</label>
                    <input 
                      name="vehicleNumber"
                      value={formData.vehicleNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. MH 12 AB 1234"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 focus:ring-2 focus:ring-blue-100 outline-none font-black text-slate-900 uppercase tracking-widest text-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vehicle Brand / Model</label>
                      <input 
                        name="vehicleBrand"
                        value={formData.vehicleBrand}
                        onChange={handleInputChange}
                        placeholder="e.g. KIA SELTOS"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-900 uppercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vehicle Color</label>
                      <input 
                        name="vehicleColor"
                        value={formData.vehicleColor}
                        onChange={handleInputChange}
                        placeholder="e.g. WHITE"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-900 uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vehicle Type</label>
                    <div className="flex gap-4">
                      {['car', 'bike', 'scooter'].map(t => (
                        <button
                          key={t}
                          onClick={() => setFormData({...formData, vehicleType: t as any})}
                          className={cn(
                            "flex-1 py-3 rounded-lg text-[10px] font-black uppercase border-2 transition-all",
                            formData.vehicleType === t ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-100 text-slate-400"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setFormData({...formData, plan: '2yr'})}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        formData.plan === '2yr' ? "border-blue-600 bg-blue-50/10 shadow-sm" : "border-slate-100 bg-slate-50 grayscale opacity-60"
                      )}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">2 Year</p>
                      <p className="font-black text-slate-900">₹500</p>
                    </button>
                    <button 
                      onClick={() => setFormData({...formData, plan: '5yr'})}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        formData.plan === '5yr' ? "border-blue-600 bg-blue-50/10 shadow-sm" : "border-slate-100 bg-slate-50 grayscale opacity-60"
                      )}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">5 Year</p>
                      <p className="font-black text-slate-900">₹1000</p>
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 mt-10">
                   <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-50 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100">Back</button>
                   <button 
                    onClick={() => setStep(3)} 
                    disabled={!formData.vehicleNumber || isAiScanning}
                    className="flex-[2] py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-200 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Select QR Sticker
                  </button>
                </div>
             </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-600" />
                  Map Physical Sticker
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10 h-64 overflow-y-auto pr-2 custom-scrollbar">
                   {availableStock.map(qr => (
                     <button
                        key={qr.id}
                        onClick={() => setFormData({...formData, selectedQrId: qr.id})}
                        className={cn(
                          "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                          formData.selectedQrId === qr.id ? "border-blue-600 bg-blue-50/30 ring-2 ring-blue-100" : "border-slate-100 hover:border-slate-200"
                        )}
                     >
                        <QrCode className={cn("w-6 h-6", formData.selectedQrId === qr.id ? "text-blue-600" : "text-slate-300")} />
                        <span className="text-[10px] font-black font-mono text-slate-900 uppercase">{qr.id}</span>
                     </button>
                   ))}
                   {availableStock.length === 0 && (
                     <div className="col-span-full py-12 text-center">
                        <Package className="w-10 h-10 text-slate-100 mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Zero Stock Available</p>
                        <p className="text-[9px] text-slate-500 font-bold mt-1">Request batches from admin vault.</p>
                     </div>
                   )}
                </div>

                <div className="bg-slate-900 rounded-xl p-6 text-white mb-8 border border-slate-800 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 blur-2xl"></div>
                   <div className="flex justify-between items-center relative z-10">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Mapping To</p>
                        <p className="text-lg font-black uppercase tracking-tight">{formData.vehicleNumber || 'PENDING'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Commission</p>
                        <p className="text-lg font-black text-green-400">₹{formData.plan === '5yr' ? 200 : 100}</p>
                      </div>
                   </div>
                </div>

                <div className="flex gap-4">
                   <button onClick={() => setStep(2)} className="flex-1 py-4 bg-slate-50 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100">Back</button>
                   <button 
                    onClick={completeMapping}
                    disabled={!formData.selectedQrId || loading}
                    className="flex-[2] py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Finalize Assignment'}
                  </button>
                </div>
             </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
             <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-200">
                <div className="text-center mb-10">
                   <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Manual Payment</h2>
                   <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Customer must pay ₹{formData.plan === '5yr' ? 1000 : (formData.plan === '2yr' ? 500 : 250)}</p>
                </div>

                <div className="flex justify-center mb-8">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative group">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=sudeepto84-4@okicici&pn=MyParkSaathi&am=${formData.plan === '5yr' ? 1000 : (formData.plan === '2yr' ? 500 : 250)}&cu=INR`}
                      alt="Payment QR"
                      className="w-48 h-48 rounded-xl mix-blend-multiply transition-transform group-hover:scale-105"
                    />
                    <div className="mt-4 text-center">
                       <p className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest">sudeepto84-4@okicici</p>
                    </div>
                  </div>
                </div>

                {apiError && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest mb-6 text-center">
                    {apiError}
                  </div>
                )}

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">UTR / Transaction ID</label>
                    <input 
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="ENTER REFERENCE NO."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Payment Proof</label>
                    <label className="cursor-pointer flex items-center justify-center gap-3 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-600 transition-all text-[10px] font-black uppercase tracking-widest">
                       <Camera className="w-5 h-5 text-slate-400" />
                       {screenshot ? screenshot.name : "Capture Screenshot"}
                       <input 
                         type="file" 
                         accept="image/*" 
                         className="hidden" 
                         onChange={(e) => setScreenshot(e.target.files?.[0] || null)} 
                       />
                    </label>
                  </div>

                  <button 
                    onClick={submitPartnerPayment}
                    disabled={loading || !transactionId || !screenshot}
                    className="w-full py-5 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-100 flex items-center justify-center gap-3 hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-5 h-5" /> Submit for Verification</>}
                  </button>
                </div>
             </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
             <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col items-center max-w-lg mx-auto">
                <div className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center mb-8 border transition-all duration-1000",
                  paymentVerified ? "bg-green-50 border-green-100" : "bg-blue-50 border-blue-100 animate-pulse"
                )}>
                   {paymentVerified ? <ShieldCheck className="w-12 h-12 text-green-600" /> : <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />}
                </div>
                
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2 whitespace-nowrap">
                  {paymentVerified ? "Node Activated" : "Validating Proof"}
                </h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-10 leading-relaxed">
                  {paymentVerified ? "The Digital Sticker is now globally discoverable." : "Admin is verifying the payment receipt for the mapping."}
                </p>
                
                <div className="w-full bg-slate-50 rounded-3xl p-8 border border-slate-100 mb-10 relative group">
                   <div className={cn(
                     "bg-white p-6 rounded-2xl shadow-sm inline-block border border-slate-200 mb-6 transition-all duration-500",
                     !paymentVerified && "opacity-30 grayscale blur-[4px]"
                   )}>
                      <QRCodeSVG 
                        id="success-qr"
                        value={`${window.location.origin}/s/${formData.selectedQrId}`} 
                        size={180}
                        level="H"
                      />
                   </div>
                   <p className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-[0.4em] mb-6">NODE ID: {formData.selectedQrId}</p>
                   
                   {paymentVerified && (
                     <button 
                      onClick={downloadQR}
                      className="flex items-center gap-2 mx-auto px-8 py-3 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all hover:shadow-lg shadow-blue-200 active:scale-95"
                     >
                       <Download className="w-4 h-4" />
                       Download PNG
                     </button>
                   )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                   <button 
                    onClick={() => {
                       setFormData({
                         customerName: '',
                         phone: '',
                         whatsapp: '',
                         vehicleNumber: '',
                         vehicleType: 'car',
                         vehicleBrand: '',
                         vehicleColor: '',
                         selectedQrId: '',
                         plan: '2yr'
                       });
                       setStep(1);
                    }}
                    className="py-4 bg-slate-100 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 shadow-sm transition-all"
                   >
                     New Map
                   </button>
                   <button 
                    onClick={() => navigate('/dashboard')}
                    className="py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all"
                   >
                     Vault
                   </button>
                </div>
             </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
