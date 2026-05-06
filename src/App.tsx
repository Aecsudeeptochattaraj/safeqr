import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useEffect } from 'react';
import { logEvent } from './lib/firebase';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PublicScan from './pages/PublicScan';
import RegisterVehicle from './pages/RegisterVehicle';
import PartnerOnboarding from './pages/PartnerOnboarding';

import { InstallPWA } from './components/InstallPWA';

function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    logEvent('page_view', {
      page_path: location.pathname,
      page_search: location.search,
      page_title: document.title
    });
  }, [location]);

  return null;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-slate-900 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Authenticating Node...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <PageTracker />
      <div className="flex flex-col min-h-screen font-sans selection:bg-blue-100 selection:text-blue-900">
        <InstallPWA />
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
            <Route path="/register-vehicle" element={user ? <RegisterVehicle /> : <Navigate to="/" />} />
            <Route path="/partner/onboard" element={user ? <PartnerOnboarding /> : <Navigate to="/" />} />
            <Route path="/s/:id" element={<PublicScan />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
