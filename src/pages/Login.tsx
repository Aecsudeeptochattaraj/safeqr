import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Shield, ArrowRight, Smartphone, Download } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorStatus(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // Trigger PWA install banner for smart onboarding
      window.dispatchEvent(new Event('beforeinstallprompt_custom_trigger'));
    } catch (error: any) {
      console.error('Login failed:', error);
      
      if (error.code === 'auth/network-request-failed') {
        setErrorStatus('Network error. If you are in Incognito/Private mode or have an Ad-Blocker, please try in a normal window.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setErrorStatus('Login window was closed. Please try again.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setErrorStatus('This domain is not authorized. Please check your Firebase Console settings.');
      } else {
        setErrorStatus('Login failed. Please try again later.');
      }
    }
  };

  const triggerInstall = () => {
    window.dispatchEvent(new Event('beforeinstallprompt_custom_trigger'));
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      alert('To install on iPhone: Tap "Share" and "Add to Home Screen"');
    } else {
      alert('To install on Android/Laptop: Click the [⊕] icon in address bar or browser menu.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row bg-white overflow-hidden">
      {/* Visual Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center p-24 overflow-hidden">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent)]" />
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
         
         <div className="relative z-10 space-y-12">
            <div className="reveal">
              <h2 className="text-6xl font-black text-white uppercase tracking-tighter leading-[0.9]">
                Safe<br /><span className="text-blue-600">Travels.</span>
              </h2>
              <p className="text-slate-400 mt-8 text-xl max-w-sm leading-relaxed font-medium">Log in to manage your registered vehicles and protective QR codes.</p>
            </div>
         </div>
         
         {/* Decorative Element */}
         <div className="absolute bottom-24 right-24 w-12 h-12 border border-white/10 rounded-full animate-ping" />
      </div>

      {/* Auth Side */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-24 bg-slate-50 lg:bg-white">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md w-full"
        >
          <div className="text-center lg:text-left mb-16">
            <Shield className="w-12 h-12 text-blue-600 mb-8 mx-auto lg:mx-0 shadow-2xl shadow-blue-900/10" />
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Welcome Back</h1>
            <p className="text-slate-500 font-medium">Log in securely using your Google account.</p>
          </div>

          <div className="space-y-6">
            {errorStatus && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 overflow-hidden mb-4"
              >
                <div className="w-5 h-5 bg-red-600 rounded flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-red-200">
                  <span className="text-[10px] font-black text-white uppercase italic">!</span>
                </div>
                <p className="text-[11px] text-red-700 font-bold uppercase tracking-tight leading-tight">
                  {errorStatus}
                </p>
              </motion.div>
            )}
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-4 px-10 py-6 bg-white lg:bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-bold shadow-sm hover:bg-slate-900 hover:text-white transition-all active:scale-95 group"
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google"
                className="w-6 h-6 group-hover:scale-110 transition-transform"
                referrerPolicy="no-referrer"
              />
              <span>Sign in with Google</span>
              <ArrowRight className="w-4 h-4 ml-auto lg:opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            
            <p className="text-[10px] text-slate-400 font-bold uppercase text-center px-8 mt-6">
              By proceeding, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
