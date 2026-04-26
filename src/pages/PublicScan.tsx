import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Vehicle } from '../types';
import { Phone, MessageCircle, AlertCircle, Shield, Camera, Send, CheckCircle2, RefreshCw, MapPin, MessageSquare, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function PublicScan() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Anti-abuse state
  const [isVerified, setIsVerified] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  
  // Emergency reporting state
  const [isReporting, setIsReporting] = useState(false);
  const [emergencySummary, setEmergencySummary] = useState({ message: '', photo: null as string | null });
  const [reportSuccess, setReportSuccess] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  // Feedback state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: 'general' as 'general' | 'bug' | 'suggestion' | 'scan_issue', rating: 5 });
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    // Start geolocation as early as possible
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        null,
        { timeout: 10000, enableHighAccuracy: true }
      );
    }

    // Capture Location & Device Info
    const captureScan = (vehicleData: Vehicle, qrIdParam?: string) => {
      const ua = navigator.userAgent;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
      const isTablet = /iPad/i.test(ua);
      
      const fireLog = (lat?: number, lng?: number) => {
        const latitude = typeof lat === 'number' ? lat : currentLocation?.lat || null;
        const longitude = typeof lng === 'number' ? lng : currentLocation?.lng || null;

        if (latitude && longitude && !currentLocation) {
          setCurrentLocation({ lat: latitude, lng: longitude });
        }

        addDoc(collection(db, 'logs'), {
           vehicleId: vehicleData.id,
           action: 'scan',
           timestamp: serverTimestamp(),
           device: {
             browser: ua.includes('Firefox') ? 'Firefox' : ua.includes('Chrome') ? 'Chrome' : 'Safari',
             os: ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'Windows/Mac',
             type: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'
           },
           location: { 
             city: latitude ? 'Live' : 'Unknown', 
             region: 'Live', 
             country: 'IN',
             lat: latitude,
             lng: longitude
           },
           metadata: { 
             userAgent: ua,
             qrId: qrIdParam || null,
             vehicleNumber: vehicleData.vehicleNumber
           }
        });
      };

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => fireLog(pos.coords.latitude, pos.coords.longitude),
          () => fireLog(),
          { timeout: 8000 }
        );
      } else {
        fireLog();
      }
    };

    async function fetchVehicle() {
      if (!id) return;
      console.log("[SCAN] Fetching node:", id);
      try {
        // 1. Try Inventory Lookup (Physical Tag ID)
        const qrDoc = await getDoc(doc(db, 'qr_inventory', id));
        
        if (qrDoc.exists()) {
          const qrData = qrDoc.data();
          console.log("[SCAN] Inventory profile found:", qrData.status);
          
          if ((qrData.status === 'assigned' || qrData.status === 'mapped') && qrData.mappedVehicleId) {
            console.log("[SCAN] Node is mapped to vehicle:", qrData.mappedVehicleId);
            const vDoc = await getDoc(doc(db, 'vehicles', qrData.mappedVehicleId));
            if (vDoc.exists()) {
              const vData = { ...vDoc.data(), id: vDoc.id } as Vehicle;
              if (vData.isDeleted) {
                setError('This safety terminal has been decommissioned.');
                setLoading(false);
                return;
              }
              // Allow both active and pending_verification for scanning
              if (vData.status !== 'active' && vData.status !== 'pending_verification') {
                setError('This safety terminal is currently awaiting administrative activation. Please check back later.');
                setLoading(false);
                return;
              }
              setVehicle(vData);
              generateCaptcha();
              captureScan(vData, id);
              setLoading(false);
              return;
            } else {
              console.warn("[SCAN] Referenced vehicle document missing");
            }
          }
          
          // If in inventory but not mapped/assigned properly
          setError('This MyParkSaathi node is ready but not yet mapped. Please link it to a vehicle via the Partner Portal.');
          setLoading(false);
          return;
        }
        
        // 2. Try Direct Vehicle ID Lookup
        console.log("[SCAN] Checking direct vehicle ID...");
        const directDoc = await getDoc(doc(db, 'vehicles', id));
        if (directDoc.exists()) {
          const vData = { ...directDoc.data(), id: directDoc.id } as Vehicle;
          if (vData.isDeleted) {
            setError('This safety terminal has been decommissioned.');
            setLoading(false);
            return;
          }
          if (vData.status !== 'active' && vData.status !== 'pending_verification') {
            setError('This safety terminal is currently awaiting administrative activation. Please check back later.');
            setLoading(false);
            return;
          }
          setVehicle(vData);
          generateCaptcha();
          captureScan(vData, id);
          setLoading(false);
          return;
        }

        setError('Safety profile not active or invalid QR node.');
        setLoading(false);
      } catch (err) {
        console.error("Public Scan Critical Error:", err);
        setError(`Security terminal communication failure: ${err instanceof Error ? err.message : 'Unknown Fault'}`);
        setLoading(false);
      }
    }
    fetchVehicle();
  }, [id]);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(result);
  };

  const handleVerify = () => {
    if (captchaInput.toUpperCase() === captchaText) {
      setIsVerified(true);
      // Re-trigger geolocation on valid interaction for better accuracy
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCurrentLocation(loc);
            logAction('authorized', 'Verification success');
          },
          () => logAction('authorized', 'Verification success (No GPS)'),
          { timeout: 5000 }
        );
      } else {
        logAction('authorized', 'Verification success');
      }
    } else {
      setError('Invalid verification code. Please refresh the captcha and try again.');
      setCaptchaInput('');
      generateCaptcha();
    }
  };

  const logAction = async (action: 'call' | 'whatsapp' | 'emergency' | 'authorized', msg?: string) => {
    if (!id || !vehicle) return;
    const ua = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
    const isTablet = /iPad/i.test(ua);

    const captureLog = (lat?: number, lng?: number) => {
      const latitude = typeof lat === 'number' ? lat : currentLocation?.lat || null;
      const longitude = typeof lng === 'number' ? lng : currentLocation?.lng || null;
      
      if (latitude && longitude && !currentLocation) {
        setCurrentLocation({ lat: latitude, lng: longitude });
      }

      addDoc(collection(db, 'logs'), {
        vehicleId: vehicle.id,
        action,
        timestamp: serverTimestamp(),
        device: {
          browser: ua.includes('Firefox') ? 'Firefox' : ua.includes('Chrome') ? 'Chrome' : 'Safari',
          os: ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'Windows/Mac',
          type: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'
        },
        location: { 
          city: latitude ? 'Live' : 'Unknown', 
          region: 'Live', 
          country: 'IN',
          lat: latitude,
          lng: longitude
        },
        metadata: { 
          message: msg || null,
          vehicleNumber: vehicle.vehicleNumber,
          userAgent: ua
        }
      });
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => captureLog(pos.coords.latitude, pos.coords.longitude),
        () => captureLog(),
        { timeout: 5000 }
      );
    } else {
      captureLog();
    }
  };

  const handleCall = () => {
    logAction('call');
    window.location.href = `tel:${vehicle?.phone}`;
  };

  const handleWhatsApp = () => {
    logAction('whatsapp');
    const msg = encodeURIComponent(`Hi, I'm reaching out regarding your vehicle ${vehicle?.vehicleNumber}.`);
    window.open(`https://wa.me/${vehicle?.whatsapp}?text=${msg}`, '_blank');
  };

  const submitEmergency = async () => {
    if (!id || !vehicle) return;
    setLoading(true);
    await logAction('emergency', emergencySummary.message);
    setReportSuccess(true);
    setLoading(false);
    setIsReporting(false);
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.message) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        ...feedback,
        userUid: 'public',
        userName: 'Public User',
        source: 'public_scan',
        vehicleId: vehicle?.id || null,
        qrId: id || null,
        createdAt: serverTimestamp(),
        status: 'new'
      });
      setFeedbackSuccess(true);
      setIsFeedbackOpen(false);
      setFeedback({ message: '', type: 'general', rating: 5 });
    } catch (err) {
      console.error("Feedback upload error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !vehicle) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8 text-slate-900 border border-slate-200">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-red-50 p-6 rounded-full mb-6">
          <AlertCircle className="w-12 h-12 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
        <p className="text-gray-500 mb-8">{error}</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={() => window.location.href = '/'} className="w-full px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px]">MyParkSaathi Home</button>
          <a 
            href="https://wa.me/91XXXXXXXXXX?text=I%20am%20having%20trouble%20scanning%20a%20MyParkSaathi%20node"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-green-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[11px]"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp Support
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-md mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
             <div className="relative z-10">
                <div className="bg-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-xl shadow-slate-950/40">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-black text-white uppercase tracking-tight">{vehicle?.vehicleNumber}</h1>
                <p className={cn(
                  "font-bold text-[10px] uppercase tracking-[0.2em] mt-2",
                  vehicle?.status === 'pending_verification' ? "text-amber-400 animate-pulse" : "text-slate-400"
                )}>
                  {vehicle?.status === 'pending_verification' ? 'Awaiting Verification' : 'Verified Terminal'}
                </p>
             </div>
          </div>

          {vehicle?.status === 'pending_verification' && (
            <div className="bg-amber-50 border-b border-amber-100 p-3 text-center">
               <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
                  Mapping active but pending admin review.
               </p>
            </div>
          )}

          {!isVerified ? (
            <div className="p-8 space-y-8">
              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-900 mb-2 uppercase tracking-tight">Access Verification</h2>
                <p className="text-xs text-slate-500 font-medium">Verify your session to initiate secure encrypted communication.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-4">
                  <div className="bg-slate-50 px-6 py-4 rounded-lg border border-slate-200 select-none">
                    <span className="text-3xl font-black text-slate-900 tracking-widest">{captchaText}</span>
                  </div>
                  <button 
                    onClick={generateCaptcha}
                    className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative">
                  <input 
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    placeholder="ENTER CODE"
                    className="w-full bg-slate-50 border border-slate-200 rounded py-4 px-6 text-center font-black text-xl uppercase focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                  />
                </div>

                <button 
                  onClick={handleVerify}
                  className="w-full py-4 bg-blue-600 text-white rounded text-xs font-bold uppercase tracking-[0.2em] shadow-lg shadow-blue-900/10 hover:bg-blue-700 transition-all active:scale-95"
                >
                  Authorize Node
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 space-y-6">
              <h2 className="text-center font-bold text-slate-400 text-[10px] uppercase tracking-[0.2em] mb-4">Operations Center</h2>
              
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={handleCall}
                  className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Phone className="w-5 h-5 text-slate-600 group-hover:text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900 uppercase">Secure Call</p>
                      <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                        {vehicle?.phone ? `${vehicle.phone.slice(0, 3)}XXXX${vehicle.phone.slice(-3)}` : 'MASKED'}
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                </button>

                <button 
                  onClick={handleWhatsApp}
                  className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                      <MessageCircle className="w-5 h-5 text-slate-600 group-hover:text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900 uppercase">WhatsApp</p>
                      <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Direct Mesh</p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </button>

                {currentLocation && (
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`, '_blank')}
                    className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-100 p-3 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors">
                        <MapPin className="w-5 h-5 text-slate-600 group-hover:text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-900 uppercase">View Location</p>
                        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Open in Google Maps</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-red-500" />
                  </button>
                )}

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                  <button 
                    onClick={() => setIsReporting(true)}
                    className="w-full flex items-center justify-center gap-3 p-4 bg-slate-900 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 shadow-md transition-all active:scale-95"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Report Emergency
                  </button>

                  <a 
                    href="https://wa.me/91XXXXXXXXXX?text=Feedback%20on%20MyParkSaathi%20Public%20Scan%20Interface"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-3 p-4 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    WhatsApp Support
                  </a>

                  <button 
                    onClick={() => setIsFeedbackOpen(true)}
                    className="w-full flex items-center justify-center gap-3 p-4 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-200"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Share Feedback
                  </button>
                </div>
              </div>

              <div className="text-center">
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-loose">
                   Your contact attempts are logged for safety.<br />Misuse results in permanent bans.
                 </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Emergency Modal */}
      <AnimatePresence>
        {isReporting && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 backdrop-blur-md bg-slate-900/60 transition-all">
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="bg-white rounded-xl p-8 max-w-md w-full relative z-10 shadow-2xl border border-slate-200"
            >
              <div className="text-center mb-8">
                <div className="bg-red-50 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 border border-red-100">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Emergency Broadcast</h3>
                <p className="text-slate-500 text-xs mt-2 font-medium">Verified alerts are prioritized in our system stack.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Message Context</label>
                  <textarea 
                    value={emergencySummary.message}
                    onChange={(e) => setEmergencySummary({...emergencySummary, message: e.target.value})}
                    placeholder="Provide details..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-4 px-6 focus:ring-4 focus:ring-red-100 focus:bg-white transition-all outline-none text-sm h-32 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <button className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-600">
                     <Camera className="w-5 h-5" />
                     <span className="text-[9px] uppercase font-black tracking-widest">Attach Photo</span>
                   </button>
                   <button 
                    onClick={submitEmergency}
                    disabled={!emergencySummary.message}
                    className="bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-2 disabled:opacity-50 hover:bg-red-700 transition-all shadow-lg shadow-red-900/10"
                   >
                     <Send className="w-5 h-5" />
                     <span className="text-[9px]">Initiate Alert</span>
                   </button>
                </div>

                <button 
                  onClick={() => setIsReporting(false)}
                  className="w-full py-2 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600"
                >
                  Terminate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {reportSuccess && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 backdrop-blur-md bg-white/80">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gray-900 p-10 rounded-[3rem] text-center max-w-sm w-full shadow-2xl shadow-green-200/50"
            >
              <div className="bg-green-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-black text-white uppercase mb-4">Alert Sent</h3>
              <p className="text-gray-400 mb-10">We've notified the owner and their emergency contact about the situation.</p>
              <button 
                onClick={() => setReportSuccess(false)}
                className="w-full py-5 bg-white text-gray-900 rounded-2xl font-black uppercase tracking-widest hover:bg-green-50 transition-all"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {isFeedbackOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 backdrop-blur-md bg-slate-900/60">
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="text-center mb-6">
                <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Share Your Experience</h3>
                <p className="text-slate-500 text-xs mt-1 font-medium">Your feedback helps us maintain road safety standards.</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center gap-2 mb-4">
                   {[1, 2, 3, 4, 5].map(star => (
                     <button 
                      key={star} 
                      onClick={() => setFeedback({...feedback, rating: star})}
                      className="p-1 hover:scale-110 transition-transform"
                     >
                       <Star className={cn("w-8 h-8", feedback.rating >= star ? "text-amber-400 fill-amber-400" : "text-slate-200")} />
                     </button>
                   ))}
                </div>

                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Feedback Category</p>
                   <div className="grid grid-cols-2 gap-2">
                      {['general', 'scan_issue', 'suggestion', 'bug'].map(t => (
                        <button 
                          key={t}
                          onClick={() => setFeedback({...feedback, type: t as any})}
                          className={cn(
                            "py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                            feedback.type === t ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300"
                          )}
                        >
                          {t.replace('_', ' ')}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Comments</p>
                  <textarea 
                    value={feedback.message}
                    onChange={(e) => setFeedback({...feedback, message: e.target.value})}
                    placeholder="Tell us what you think..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none text-sm h-28 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsFeedbackOpen(false)}
                    className="flex-1 py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600 bg-slate-50 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmitFeedback}
                    disabled={!feedback.message || loading}
                    className="flex-[2] bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-black transition-all shadow-lg active:scale-95"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feedback Success Modal */}
      <AnimatePresence>
        {feedbackSuccess && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 backdrop-blur-md bg-white/80">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 p-10 rounded-[3rem] text-center max-w-sm w-full shadow-2xl"
            >
              <div className="bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase mb-2">Thank You</h3>
              <p className="text-slate-400 text-xs mb-8">Your feedback has been routed to our system administrator for review.</p>
              <button 
                onClick={() => setFeedbackSuccess(false)}
                className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all text-[11px]"
              >
                Continue
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
