import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Car, Smartphone, MessageCircle, CreditCard, CheckCircle, ShieldCheck, Camera, Sparkles, Loader2, RefreshCw, Download } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function RegisterVehicle() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    ownerName: '',
    phone: '',
    whatsapp: '',
    emergencyContact: '',
    qrId: '', // Optional physical tag ID
    planId: '2yr' as '2yr' | '5yr'
  });

  const [isAiScanning, setIsAiScanning] = useState(false);

  useEffect(() => {
    console.log('RegisterVehicle mounted. User:', user?.email);
  }, [user]);

  const handleAiScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiScanning(true);
    setApiError(null);
    try {
      const fd = new FormData();
      fd.append('image', file);

      const response = await fetch('/api/scanPlate', {
        method: 'POST',
        body: fd
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || 'AI Scan failed on server');
      }
      
      const data = await response.json();
      if (data.vehicleNumber) {
        setFormData(prev => ({ ...prev, vehicleNumber: data.vehicleNumber.toUpperCase() }));
      } else {
        setApiError('Auto-scan could not detect a plate number. Please enter it manually.');
      }
    } catch (err: any) {
      console.error('AI Scan failed:', err);
      setApiError('Auto-scan failed. Please enter the number manually.');
    } finally {
      setIsAiScanning(false);
    }
  };

  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 8 * 1024 * 1024) { // 8MB limit
      setApiError('Screenshot too large. Please use a file smaller than 8MB.');
      setScreenshot(null);
      e.target.value = '';
      return;
    }
    setScreenshot(file);
    if (file) setApiError(null);
  };

  const submitPayment = async () => {
    if (!transactionId || !screenshot) {
      setApiError('Please provide both the Transaction ID and a screenshot.');
      return;
    }
    setLoading(true);
    setApiError(null);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('screenshot', screenshot);
      formDataToSend.append('transactionId', transactionId);
      formDataToSend.append('userId', user?.uid || '');

      const apiResponse = await fetch('/api/submitPayment', {
        method: 'POST',
        body: formDataToSend
      });

      let errorData: any = null;
      const responseText = await apiResponse.text();
      
      try {
        if (responseText) {
          errorData = JSON.parse(responseText);
        }
      } catch (e) {
        console.error("Failed to parse server response:", responseText);
      }

      if (!apiResponse.ok) {
        throw new Error(errorData?.message || errorData?.error || `Server responded with ${apiResponse.status}: ${responseText.substring(0, 50)}`);
      }

      if (!errorData) {
        throw new Error("Empty success response from server");
      }

      const { scrubbedImage } = errorData;

      // Continue with Firestore storage
      const vehicleRef = doc(collection(db, 'vehicles'));
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + (formData.planId === '5yr' ? 5 : 2));

      // Handle QR Inventory update if qrId provided
      if (formData.qrId) {
        const qrRef = doc(db, 'qr_inventory', formData.qrId);
        const qrSnap = await getDoc(qrRef);
        if (qrSnap.exists()) {
          const qrData = qrSnap.data();
          if (qrData.status === 'available') {
            await updateDoc(qrRef, {
              status: 'assigned',
              mappedVehicleId: vehicleRef.id,
              updatedAt: serverTimestamp()
            });
          }
        }
      }

      await setDoc(vehicleRef, {
        id: vehicleRef.id,
        ownerUid: user?.uid,
        ...formData,
        qrId: formData.qrId || null,
        status: 'pending_verification',
        subscriptionExpiry: expiryDate,
        createdAt: serverTimestamp(),
      });

      const paymentRef = doc(db, 'payments', transactionId);
      await setDoc(paymentRef, {
        id: transactionId,
        userId: user?.uid,
        vehicleId: vehicleRef.id,
        transactionId,
        amount: formData.planId === '5yr' ? 1000 : 500,
        status: 'pending',
        scrubbedScreenshotUrl: scrubbedImage,
        createdAt: serverTimestamp(),
      });

      setStep(4);
    } catch (err: any) {
      console.error("Payment error:", err);
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Real-time listener for Payment Status (Supabase/Firestore equivalent)
  useEffect(() => {
    if (step !== 4 || !user?.uid) return;

    const q = query(
      collection(db, 'payments'), 
      where('userId', '==', user.uid),
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
  }, [step, user]);

  return (
    <div className="min-h-screen bg-slate-50 pt-12 pb-24 px-4">
      <div className="max-w-xl mx-auto">
        {/* Progress Pins */}
        <div className="flex justify-between mb-12 relative">
           {[1, 2, 3].map((s) => (
             <div key={s} className="flex flex-col items-center relative z-10">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 border-2",
                  step >= s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-300 border-slate-200"
                )}>
                  {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                <span className={cn(
                  "text-xs font-bold mt-2 transition-colors",
                  step >= s ? "text-slate-900" : "text-slate-400"
                )}>
                  {s === 1 ? 'Details' : s === 2 ? 'Plan' : 'Payment'}
                </span>
             </div>
           ))}
           <div className="absolute top-4 left-0 w-full h-px bg-slate-200 -z-0">
             <div 
               className="h-full bg-blue-600 transition-all duration-500" 
               style={{ width: `${((Math.min(step, 3) - 1) / 2) * 100}%` }}
             ></div>
           </div>
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Register Vehicle</h1>
              <p className="text-slate-500 font-medium mt-1">Enter your vehicle details to get started.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-bold text-slate-700">Vehicle Number</label>
                  <label className="text-xs font-bold text-blue-600 cursor-pointer flex items-center gap-1 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                    <Sparkles className="w-3 h-3" />
                    Scan Number Plate
                    <input type="file" accept="image/*" onChange={handleAiScan} className="hidden" />
                  </label>
                </div>
                <div className="relative group">
                  <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input 
                    name="vehicleNumber"
                    value={formData.vehicleNumber}
                    onChange={handleInputChange}
                    placeholder="e.g. MH 12 AB 1234"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none font-bold uppercase text-slate-900"
                  />
                  {isAiScanning && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Owner Name</label>
                <input 
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  placeholder="Full Name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Phone Number</label>
                  <div className="relative group">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none font-medium text-slate-900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">WhatsApp Number</label>
                  <div className="relative group">
                    <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleInputChange}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none font-medium text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1 flex items-center justify-between">
                  <span>Physical Tag ID</span>
                  <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-50 px-2 py-0.5 rounded italic">Optional</span>
                </label>
                <div className="relative group">
                  <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input 
                    name="qrId"
                    value={formData.qrId}
                    onChange={(e) => setFormData({...formData, qrId: e.target.value.toUpperCase()})}
                    placeholder="e.g. MPS-12345"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none font-bold uppercase text-slate-900"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium ml-1">Already have a physical sticker? Enter the ID to Link it.</p>
              </div>

              <button 
                onClick={handleNext}
                disabled={!formData.vehicleNumber || !formData.ownerName || !formData.phone}
                className="w-full py-4 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm mt-4"
              >
                Continue to Plans
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="text-center mb-10">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Select Plan</h1>
              <p className="text-slate-500 font-medium mt-1">Choose the duration of your QR code validity.</p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => setFormData({ ...formData, planId: '2yr' })}
                className={cn(
                  "w-full p-6 bg-white rounded-xl border-2 flex items-center justify-between transition-all outline-none",
                  formData.planId === '2yr' ? "border-blue-600 bg-blue-50/50" : "border-slate-200 hover:border-blue-300"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center", formData.planId === '2yr' ? "border-blue-600" : "border-slate-300")}>
                    {formData.planId === '2yr' && <div className="w-3 h-3 bg-blue-600 rounded-full" />}
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-slate-900">Standard Plan</p>
                    <p className="text-sm text-slate-500 font-medium">Valid for 2 Years</p>
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900">₹500</p>
              </button>

              <button 
                onClick={() => setFormData({ ...formData, planId: '5yr' })}
                className={cn(
                  "w-full p-6 bg-white rounded-xl border-2 flex items-center justify-between transition-all outline-none relative overflow-hidden",
                  formData.planId === '5yr' ? "border-blue-600 bg-blue-50/50" : "border-slate-200 hover:border-blue-300"
                )}
              >
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">Recommended</div>
                <div className="flex items-center gap-4">
                   <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center", formData.planId === '5yr' ? "border-blue-600" : "border-slate-300")}>
                    {formData.planId === '5yr' && <div className="w-3 h-3 bg-blue-600 rounded-full" />}
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-slate-900">Premium Plan</p>
                    <p className="text-sm text-slate-500 font-medium">Valid for 5 Years</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-900">₹1000</p>
                  <p className="text-xs text-blue-600 font-bold mt-1">Best Value</p>
                </div>
              </button>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={handleBack} 
                className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button 
                onClick={handleNext} 
                className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Continue to Payment
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
             <div className="text-center mb-10">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manual Payment</h1>
              <p className="text-slate-500 font-medium mt-1">Scan to pay and upload your receipt securely.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
               <div className="p-8 space-y-4 bg-white flex flex-col items-center border-b border-slate-100">
                  <div className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Scan & Pay ₹{formData.planId === '5yr' ? 1000 : 500}</div>
                  <div className="w-56 h-56 bg-slate-100 rounded-2xl p-4 flex items-center justify-center border-2 border-dashed border-slate-300">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=sudeepto84-4@okicici&pn=VehicleRegistration&am=${formData.planId === '5yr' ? 1000 : 500}&cu=INR`)}`} alt="UPI QR Code" className="w-full h-full object-contain" />
                  </div>
                  <p className="text-xs font-bold text-slate-500">UPI ID: sudeepto84-4@okicici</p>
               </div>

               <div className="p-8 space-y-6 bg-slate-50">
                 {apiError && (
                   <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-200 text-center">
                     {apiError}
                   </div>
                 )}
                 <div>
                   <label className="text-xs font-black uppercase text-slate-500 tracking-wider ml-1 mb-2 block">Transaction / UTR ID</label>
                   <input 
                     type="text"
                     value={transactionId}
                     onChange={(e) => setTransactionId(e.target.value)}
                     placeholder="e.g. 123456789012"
                     className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold uppercase text-slate-900"
                   />
                 </div>
                 <div>
                   <label className="text-xs font-black uppercase text-slate-500 tracking-wider ml-1 mb-2 block">Upload Screenshot</label>
                   <input 
                     type="file"
                     accept="image/*"
                     onChange={handleScreenshotChange}
                     className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 outline-none font-medium text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
                   />
                 </div>
               </div>
            </div>
            
            <button 
              onClick={submitPayment}
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying Integrities...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Submit for Verification
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-4 font-medium uppercase tracking-widest leading-relaxed">
              * Image metadata will be automatically scrubbed by our API to protect your privacy.
            </p>
            <button 
              onClick={handleBack} 
              disabled={loading} 
              className="w-full mt-2 text-center text-slate-500 text-sm font-bold hover:text-slate-900 disabled:opacity-50"
            >
              Go Back
            </button>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center relative overflow-hidden">
              
              {!paymentVerified ? (
                <>
                  <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400 animate-pulse"></div>
                  <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mb-6 border border-yellow-200 shadow-inner">
                    <Loader2 className="w-10 h-10 text-yellow-600 animate-spin" />
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 mb-2">Awaiting Admin Verification</h1>
                  <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                    Your transaction <span className="font-bold text-slate-700">{transactionId}</span> has been securely submitted. 
                    An administrator is actively reviewing the screenshot. This page will automatically update once approved.
                  </p>
                </>
              ) : (
                <>
                  <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 border border-green-200 shadow-inner">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h1 className="text-3xl font-black text-slate-900 mb-2">Payment Verified!</h1>
                  <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm">
                    Your protected QR node has been successfully minted. You can now access your encrypted Secret QR Code.
                  </p>
                  
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold tracking-widest uppercase text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Reveal Secret QR Code
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
