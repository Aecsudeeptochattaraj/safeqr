import { useAuth } from '../hooks/useAuth';
import UserDashboard from '../components/dashboard/UserDashboard';
import PartnerDashboard from '../components/dashboard/PartnerDashboard';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import { UserRole } from '../types';
import { Cpu, Loader2 } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useState } from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {
  const { profile, loading } = useAuth();

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
       <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  const currentRole = profile?.role || 'user';

  const renderDashboard = () => {
    switch (currentRole) {
      case 'admin':
        return <AdminDashboard />;
      case 'partner':
        return <PartnerDashboard />;
      default:
        return <UserDashboard />;
    }
  };

  return (
    <div className="relative min-h-screen">
      {renderDashboard()}
    </div>
  );
}
