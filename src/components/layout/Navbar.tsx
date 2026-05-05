import { Link, useNavigate } from 'react-router-dom';
import { Shield, Menu, X, LogOut, User, LayoutDashboard, QrCode, Smartphone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../hooks/useAuth';

export default function Navbar() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
  }, []);

  const handleInstallClick = () => {
    window.dispatchEvent(new Event('beforeinstallprompt_custom_trigger'));
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-[100] bg-white/70 backdrop-blur-xl border-b border-line px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="bg-slate-900 p-2 rounded-xl transition-transform group-hover:scale-110 group-active:scale-95 shadow-lg shadow-slate-200">
                <QrCode className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">MyParkSaathi</span>
                <span className="text-[8px] font-black text-blue-600 tracking-[0.3em] uppercase leading-none mt-1">Safety Grid</span>
              </div>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-12">
            {!isStandalone && (
              <button 
                onClick={handleInstallClick}
                className="group flex flex-col items-center transition-all"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 group-hover:text-blue-700">
                  <Smartphone className="w-3.5 h-3.5" />
                  Install
                </div>
                <div className="w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full mt-0.5" />
              </button>
            )}
            <Link to="/" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 transition-colors">Network</Link>
            
            {user ? (
              <>
                <Link to="/dashboard" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 flex items-center gap-2 transition-colors">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Terminal
                </Link>
                <div className="h-8 w-px bg-slate-200" />
                <div className="flex items-center gap-4 pl-2">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{profile?.displayName}</span>
                    <span className="text-[8px] text-blue-600 uppercase font-black tracking-widest leading-none">{profile?.role}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-10 h-10 rounded-full bg-slate-50 border border-line flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all hover:rotate-12"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center px-8 py-3 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
              >
                Access Portal
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-line text-slate-400"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-line p-6 animate-reveal">
          <div className="space-y-4">
            {!isStandalone && (
              <button 
                onClick={handleInstallClick}
                className="w-full flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase text-blue-900 leading-tight">Install App</p>
                    <p className="text-[8px] text-blue-600 font-bold uppercase tracking-tight">Access 5x faster</p>
                  </div>
                </div>
                <Menu className="w-4 h-4 text-blue-300" />
              </button>
            )}
            <Link onClick={() => setIsOpen(false)} to="/" className="block text-[10px] font-black uppercase tracking-widest text-slate-900 py-2 border-b border-slate-50">Network</Link>
            {user ? (
              <>
                <Link onClick={() => setIsOpen(false)} to="/dashboard" className="block text-[10px] font-black uppercase tracking-widest text-slate-900 py-2 border-b border-slate-50">Terminal</Link>
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsOpen(false);
                  }}
                  className="w-full text-left block text-[10px] font-black uppercase tracking-widest text-red-600 py-2"
                >
                  Terminate Session
                </button>
              </>
            ) : (
              <Link onClick={() => setIsOpen(false)} to="/login" className="block text-center py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Login</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
