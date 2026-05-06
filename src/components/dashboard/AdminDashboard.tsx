import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, limit, serverTimestamp, writeBatch, doc, where, updateDoc, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
import { AppUser, QRInventory, LogEntry } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { Users, Car, Coins, ShieldCheck, QrCode, Package, Download, UserMinus, Layers, Loader2, Printer, ExternalLink, Trash2, Repeat, AlertTriangle, CheckCircle2, TrendingUp, Activity, Clock, PieChart, Info, Search, UserX, UserCheck, ShieldOff, Eye, Map as MapIcon, List, ChevronDown, LayoutDashboard, MessageSquare, Smartphone, RefreshCw, Mail } from 'lucide-react';

const viewConfig = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'insights', label: 'Insights', icon: Activity },
  { id: 'financials', label: 'Financials', icon: Coins },
  { id: 'payments', label: 'Manual Payments', icon: ShieldCheck },
  { id: 'supply_chain', label: 'Supply Chain', icon: Layers },
  { id: 'audit_logs', label: 'Audit Logs', icon: List },
  { id: 'qr_management', label: 'QR Management', icon: QrCode },
  { id: 'fleet', label: 'Fleet', icon: Car },
  { id: 'projection', label: '5Y Projection', icon: TrendingUp },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'diagnostics', label: 'Diagnostics', icon: RefreshCw },
  { id: 'danger_zone', label: 'Danger Zone', icon: AlertTriangle },
] as const;
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { QRCodeCanvas } from 'qrcode.react';
import { motion } from 'motion/react';
import JSZip from 'jszip';
import { drawBrandedQR } from '../../lib/qrBranding';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, startOfWeek, startOfMonth } from 'date-fns';
import { InsightsDashboard, LiveActivity, ScanTrends, AuditLogs, InventorySupplyChain, SmartInsights, FleetManagement, FinancialsManagement, FutureProjection, PaymentVerificationModule, FeedbackManagement, SystemDiagnostics } from './InsightsComponents';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const StatCard = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-6 hover:border-blue-500 transition-colors">
    <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center text-white shadow-sm shrink-0`}>
      <Icon className="w-7 h-7" />
    </div>
    <div>
      <p className="text-sm font-bold text-slate-500 mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-900">{value}</p>
    </div>
  </div>
);

type TimeRange = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

import { InstallBanner } from '../InstallBanner';

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  const [stats, setStats] = useState({ 
    users: 0, 
    vehicles: 0, 
    revenue: 0, 
    availableQRs: 0,
    totalQRs: 0,
    assignedQRs: 0,
    scansToday: 0,
    scansWeek: 0,
    scansMonth: 0,
    scanTrend: 0 
  });
  const [view, setView] = useState<'overview' | 'insights' | 'feedback' | 'supply_chain' | 'audit_logs' | 'qr_management' | 'fleet' | 'users' | 'financials' | 'projection' | 'payments' | 'diagnostics'>('overview');
  const [isPWA, setIsPWA] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    setIsPWA(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
    setIsInIframe(window.self !== window.top);
  }, []);

  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<LogEntry[]>([]);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [commissionsData, setCommissionsData] = useState<any[]>([]);
  const [rawData, setRawData] = useState<{ 
    inventory: QRInventory[], 
    vehicles: any[], 
    partners: AppUser[],
    allUsers: AppUser[]
  }>({ inventory: [], vehicles: [], partners: [], allUsers: [] });

  useEffect(() => {
    // Basic Counts
    const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
      const allUsers = snap.docs.map(d => ({ ...d.data(), uid: d.id } as AppUser));
      const partners = allUsers.filter(u => u.role === 'partner');
      setRawData(prev => ({ ...prev, allUsers, partners }));
      setStats(prev => ({ ...prev, users: partners.length }));
    });
    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), snap => {
      const vehicles = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setRawData(prev => ({ ...prev, vehicles }));
      setStats(prev => ({ ...prev, vehicles: snap.size }));
    });
    
    // QR Counts
    const unsubQRs = onSnapshot(collection(db, 'qr_inventory'), snap => {
      const docs = snap.docs.map(d => d.data() as QRInventory);
      setRawData(prev => ({ ...prev, inventory: docs }));
      setStats(prev => ({ 
        ...prev, 
        totalQRs: snap.size,
        availableQRs: docs.filter(d => d.status === 'available' && !d.partnerUid).length,
        assignedQRs: docs.filter(d => d.partnerUid).length
      }));
    });

    // Scans & Trends
    const unsubLogs = onSnapshot(collection(db, 'logs'), snap => {
      const logs = snap.docs.map(d => ({ ...d.data(), id: d.id } as LogEntry))
        .sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      
      setAllLogs(logs);
      setActivityLogs(logs.slice(0, 100)); // Limit for live feed

      const now = new Date();
      const today = startOfDay(now);
      const week = startOfWeek(now);
      const month = startOfMonth(now);

      // Period comparison (e.g., this month vs last month)
      const lastMonthStart = startOfMonth(subDays(month, 1));
      const lastMonthEnd = month;

      let sToday = 0, sWeek = 0, sMonth = 0, sLastMonth = 0;
      
      logs.forEach(l => {
        if (l.action !== 'scan') return;
        const ts = l.timestamp?.toDate ? l.timestamp.toDate() : new Date();
        if (ts >= today) sToday++;
        if (ts >= week) sWeek++;
        if (ts >= month) sMonth++;
        if (ts >= lastMonthStart && ts < lastMonthEnd) sLastMonth++;
      });

      const trend = sLastMonth > 0 ? ((sMonth - sLastMonth) / sLastMonth) * 100 : 0;

      setStats(prev => ({ 
        ...prev, 
        scansToday: sToday, 
        scansWeek: sWeek, 
        scansMonth: sMonth,
        scanTrend: trend
      }));
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), snap => {
      const payments = snap.docs.map(d => ({ ...d.data(), id: d.id } as any));
      const approvedRevenue = payments
        .filter(p => p.status === 'verified')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      
      setPaymentsData(payments);
      setStats(prev => ({ ...prev, revenue: approvedRevenue }));
    });
    
    const unsubCommissions = onSnapshot(collection(db, 'commissions'), snap => {
      setCommissionsData(snap.docs.map(d => ({ ...d.data(), id: d.id } as any)));
    });

    const unsubFeedback = onSnapshot(collection(db, 'feedback'), snap => {
      setFeedbacks(snap.docs.map(d => ({ ...d.data(), id: d.id } as any))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
    
    return () => {
      unsubUsers();
      unsubVehicles();
      unsubQRs();
      unsubLogs();
      unsubPayments();
      unsubCommissions();
      unsubFeedback();
    };
  }, []);

  return (
    <div className="max-w-[90rem] mx-auto px-4 sm:px-6 py-12 font-sans bg-[#f8fafc] min-h-screen">
      
      {/* Premium Header Layout */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-10 gap-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/50 border border-blue-200/50 mb-4 backdrop-blur-sm shadow-sm">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-700">Administrator Console</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            System Intelligence
          </h1>
          <p className="text-slate-500 font-medium mt-3 text-base md:text-lg">
            Global oversight, real-time telemetry, and inventory dispatch control.
          </p>
        </div>
        
        <div className="flex flex-col items-start xl:items-end w-full xl:w-auto gap-4">
          
          {/* Mobile Glassmorphism Dropdown */}
          <div className="w-full xl:hidden relative z-50">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1 mb-2 block">Active Dashboard Module</label>
            <button 
              onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
              className="w-full flex items-center justify-between bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl py-4 px-5 focus:ring-4 focus:ring-blue-100/50 outline-none shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                {(() => {
                  const activeConfig = viewConfig.find(v => v.id === view);
                  const Icon = activeConfig?.icon || LayoutDashboard;
                  return <Icon className={cn("w-5 h-5", view === 'danger_zone' ? 'text-red-500' : 'text-blue-600')} />;
                })()}
                <span className="font-extrabold text-slate-900 uppercase tracking-widest text-[11px]">
                  {view.replace('_', ' ')}
                </span>
              </div>
              <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300 ease-out", isMobileDropdownOpen && "rotate-180")} />
            </button>
            
            {isMobileDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-sm" onClick={() => setIsMobileDropdownOpen(false)}></div>
                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-2xl z-50 overflow-hidden transform opacity-100 transition-all origin-top scale-100">
                  <div className="flex flex-col max-h-[60vh] overflow-y-auto p-2 hide-scrollbar">
                    {viewConfig.map(v => (
                      <button 
                        key={v.id}
                        onClick={() => { setView(v.id as any); setIsMobileDropdownOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 text-left px-4 py-4 rounded-xl transition-all duration-200 group mb-1 last:mb-0",
                          view === v.id 
                            ? (v.id === 'danger_zone' ? 'bg-red-50 text-red-600 shadow-sm border border-red-100' : 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100') 
                            : (v.id === 'danger_zone' ? 'text-red-500 hover:bg-red-50/50 border border-transparent' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent')
                        )}
                      >
                        <v.icon className={cn("w-5 h-5 transition-transform duration-200 group-hover:scale-110", view === v.id ? 'opacity-100' : 'opacity-70')} />
                        <span className="text-[11px] font-black uppercase tracking-widest mt-0.5">{v.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Desktop High-End Pill Navigation */}
          <div className="hidden xl:flex flex-wrap justify-end gap-2 bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 shadow-sm">
            {viewConfig.map(v => (
              <button 
                key={v.id}
                onClick={() => setView(v.id as any)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-200",
                  view === v.id 
                    ? (v.id === 'danger_zone' ? 'bg-red-500 text-white shadow-md shadow-red-200 translate-y-[-1px]' : 'bg-slate-900 text-white shadow-md shadow-slate-300 translate-y-[-1px]') 
                    : (v.id === 'danger_zone' ? 'text-red-500 hover:bg-red-50 hover:text-red-600' : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm')
                )}
              >
                <v.icon className="w-4 h-4" />
                {v.label}
              </button>
            ))}
          </div>
          
          {view === 'insights' && (
            <div className="flex bg-white/60 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/80 shadow-sm">
               {(['today', 'week', 'month', 'year'] as const).map(tr => (
                  <button 
                    key={tr}
                    onClick={() => setTimeRange(tr)}
                    className={cn(
                      "px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      timeRange === tr ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    )}
                  >
                    {tr}
                  </button>
               ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-12">
        <InstallBanner />
      </div>

      {view === 'overview' && (
        <div className="space-y-12">
          {/* Proactive Intelligence Alerts */}
          <div className="space-y-4">
            {rawData.inventory.length > 100 && stats.availableQRs < 10 && (
               <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center justify-between shadow-sm animate-pulse">
                  <div className="flex items-center gap-4">
                     <div className="bg-red-100 p-3 rounded-xl">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                     </div>
                     <div>
                        <p className="text-sm font-black text-red-900 uppercase tracking-tight">Critical Stock Alert</p>
                        <p className="text-xs text-red-600 font-medium">Global vault inventory is critically low ({stats.availableQRs} nodes). Immediate replenishment suggested.</p>
                     </div>
                  </div>
                  <button 
                    onClick={() => setView('qr_management')}
                    className="px-6 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Mint Now
                  </button>
               </div>
            )}

            {allLogs.some(l => l.action === 'suspicious') && (
               <div className="bg-purple-50 border border-purple-100 p-6 rounded-3xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                     <div className="bg-purple-100 p-3 rounded-xl">
                        <ShieldOff className="w-6 h-6 text-purple-600" />
                     </div>
                     <div>
                        <p className="text-sm font-black text-purple-900 uppercase tracking-tight">Fraud Intelligence Active</p>
                        <p className="text-xs text-purple-600 font-medium">Unexpected scan patterns detected outside primary service zones. Review Geo Intelligence Heatmap.</p>
                     </div>
                  </div>
                  <button 
                    onClick={() => setView('insights')}
                    className="px-6 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Audit Locations
                  </button>
               </div>
            )}

            {stats.scanTrend > 50 && (
               <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                     <div className="bg-blue-100 p-3 rounded-xl">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                     </div>
                     <div>
                        <p className="text-sm font-black text-blue-900 uppercase tracking-tight">Abnormal Scan Surge</p>
                        <p className="text-xs text-blue-600 font-medium">Scan trends are up by {stats.scanTrend.toFixed(1)}%. Review high-activity regions for fraud or spikes.</p>
                     </div>
                  </div>
                  <button 
                    onClick={() => setView('insights')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    View Heatmap
                  </button>
               </div>
            )}

            {rawData.partners.length > 0 && rawData.partners.some(p => !rawData.vehicles.some(v => v.partnerUid === p.uid)) && (
               <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                     <div className="bg-amber-100 p-3 rounded-xl">
                        <Users className="w-6 h-6 text-amber-600" />
                     </div>
                     <div>
                        <p className="text-sm font-black text-amber-900 uppercase tracking-tight">Inactive Partner Detected</p>
                        <p className="text-xs text-amber-600 font-medium">Some partners have allocated QRs but zero mapped vehicles. Suggest redistribution.</p>
                     </div>
                  </div>
                  <button 
                    onClick={() => setView('users')}
                    className="px-6 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Audit Partners
                  </button>
               </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={Users} label="Active Users" value={stats.users} color="bg-slate-900" />
            <StatCard icon={Car} label="Fleet Size" value={stats.vehicles} color="bg-blue-600" />
            <StatCard icon={Coins} label="Net Revenue" value={`₹${stats.revenue}`} color="bg-slate-900" />
            <StatCard icon={Package} label="Vault Stock" value={stats.availableQRs} color="bg-blue-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">
               <SmartInsights stats={stats} rawData={rawData} logs={allLogs} />
            </div>
            <div>
               <LiveActivity feed={activityLogs} />
            </div>
          </div>
        </div>
      )}

      {view === 'insights' && <InsightsDashboard stats={stats} rawData={rawData} logs={allLogs} timeRange={timeRange} />}
      {view === 'financials' && <FinancialsManagement payments={paymentsData} commissions={commissionsData} users={rawData.allUsers} cn={cn} vehicles={rawData.vehicles} />}
      {view === 'payments' && <PaymentVerificationModule payments={paymentsData} users={rawData.allUsers} />}
      {view === 'supply_chain' && <InventorySupplyChain rawData={rawData} logs={allLogs} />}
      {view === 'audit_logs' && <AuditLogs logs={allLogs} partners={rawData.partners} />}
      {view === 'qr_management' && <QRManagement />}
      {view === 'fleet' && <FleetManagement vehicles={rawData.vehicles} payments={paymentsData} users={rawData.allUsers} cn={cn} logs={allLogs} />}
      {view === 'projection' && <FutureProjection />}
      {view === 'feedback' && <FeedbackManagement feedbacks={feedbacks} />}
      {view === 'diagnostics' && <SystemDiagnostics />}
      {view === 'users' && <UserManagement />}
      {view === 'danger_zone' && <DangerZone />}
    </div>
  );
}

function DangerZone() {
  const { user } = useAuth();
  const [wiping, setWiping] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const executeHardReset = async () => {
    if (confirmText !== 'CLEAR ALL DATA') return;

    setWiping(true);
    setStatus('COMMENCING TOTAL SYSTEM WIPE...');
    setProgress({ current: 0, total: 0 });

    try {
      const collectionsToWipe = ['vehicles', 'qr_inventory', 'logs', 'payments', 'commissions', 'users'];
      
      for (const colName of collectionsToWipe) {
        setStatus(`AUDITING: ${colName.toUpperCase()}...`);
        const snap = await getDocs(collection(db, colName));
        const total = snap.size;
        setProgress({ current: 0, total });

        // Use batches of 500 for Firestore limits
        let batch = writeBatch(db);
        let count = 0;
        let deletedInCol = 0;

        for (const d of snap.docs) {
          const data = d.data();
          
          // CRITICAL: Protect ALL admin users to prevent total system locked-out state
          if (colName === 'users' && data.role === 'admin') {
            console.log(`Preserving Admin Node: ${d.id}`);
            continue;
          }

          batch.delete(d.ref);
          count++;
          deletedInCol++;

          if (count >= 500) {
            setStatus(`OBLITERATING ${colName.toUpperCase()}: ${deletedInCol}/${total}...`);
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
          
          setProgress(p => ({ ...p, current: deletedInCol }));
        }

        if (count > 0) {
          setStatus(`FINALIZING ${colName.toUpperCase()} OBLITERATION...`);
          await batch.commit();
        }
      }

      setStatus('FACTORY RESET COMPLETE. SYSTEM PURIFIED.');
      setShowConfirm(false);
      setConfirmText('');
      setTimeout(() => {
        setStatus(null);
        window.location.reload(); // Reload to refresh all state
      }, 3000);
    } catch (err: any) {
      console.error('CRITICAL WIPE FAILURE:', err);
      setStatus(`FATAL ERROR: ${err.message}`);
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white border-2 border-red-100 rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-red-600 p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">Restricted Area: Danger Zone</h2>
              <p className="text-red-100 text-xs font-bold uppercase tracking-widest opacity-80">Global System Integrity Override</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <p className="text-slate-900 font-extrabold uppercase text-sm tracking-tight mb-2">Consequences of Initialization</p>
              <ul className="space-y-3">
                {[
                  "Permanent deletion of all vehicle registrations",
                  "Purge of all payment transactions and ledgers",
                  "Wipe of all system audit logs and scan history",
                  "Hard delete for all non-admin participant accounts",
                  "Reset of QR Inventory mapping states"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-500 font-medium text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">System Warning</p>
               <p className="text-xs text-slate-600 leading-relaxed font-medium italic">
                 "This action cannot be undone. Once initialized, the database will be purged of all operational data. Only Admin nodes will be preserved to maintain control of the environment."
               </p>
            </div>
          </div>
          
          {!showConfirm ? (
            <button 
              onClick={() => setShowConfirm(true)}
              className="w-full sm:w-auto px-8 py-4 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-xl shadow-red-200 flex items-center justify-center gap-3 border-b-4 border-red-800"
            >
              <Trash2 className="w-5 h-5" />
              Initialize Factory Reset
            </button>
          ) : (
            <div className="bg-red-50 p-8 rounded-2xl border-2 border-red-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3 mb-6">
                 <ShieldOff className="w-6 h-6 text-red-600" />
                 <p className="text-sm font-black text-red-900 uppercase tracking-widest">Type 'CLEAR ALL DATA' to confirm</p>
              </div>
              
              <input 
                type="text" 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoFocus
                className="w-full bg-white border-2 border-red-200 rounded-xl px-6 py-4 mb-6 outline-none focus:border-red-600 font-black text-red-900 text-lg uppercase tracking-widest placeholder:text-red-100" 
                placeholder="PROCEED WITH CAUTION"
                disabled={wiping}
              />

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                  disabled={wiping}
                  className="flex-1 py-4 bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl font-black uppercase text-xs transition-all disabled:opacity-50"
                >
                  Terminate Request
                </button>
                <button 
                  onClick={executeHardReset}
                  disabled={confirmText !== 'CLEAR ALL DATA' || wiping}
                  className="flex-[2] py-4 bg-red-600 text-white hover:bg-red-700 rounded-xl font-black uppercase text-xs disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  {wiping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                  {wiping ? 'OBLITERATING...' : 'Confirm System Wipe'}
                </button>
              </div>

              {status && (
                <div className="mt-8 space-y-4">
                   <div className="flex justify-between items-end mb-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 animate-pulse">
                        {status}
                      </p>
                      {progress.total > 0 && (
                        <p className="text-[10px] font-black text-red-400">
                          {Math.round((progress.current / progress.total) * 100)}%
                        </p>
                      )}
                   </div>
                   <div className="w-full h-2 bg-red-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-600 transition-all duration-300 ease-out" 
                        style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                      />
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Forensic Cleanliness Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { icon: ShieldCheck, label: "Admin Security", sub: "Control Nodes Preserved" },
           { icon: Layers, label: "Hard Data Wipe", sub: "No Residual Records" },
           { icon: Repeat, label: "Clean Slate", sub: "Ready for Migration" }
         ].map((item, i) => (
           <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 opacity-50 grayscale">
              <item.icon className="w-6 h-6 text-slate-400" />
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">{item.label}</p>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.sub}</p>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}

function QRManagement() {
  const [generateAmount, setGenerateAmount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [items, setItems] = useState<QRInventory[]>([]);
  const [partners, setPartners] = useState<AppUser[]>([]);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [allocateAmount, setAllocateAmount] = useState(10);
  const [isZipping, setIsZipping] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const qInventory = query(collection(db, 'qr_inventory'), limit(50));
    const unsubInventory = onSnapshot(qInventory, snap => {
// ... code ...
      const docs = snap.docs.map(d => ({ ...d.data(), id: d.id } as QRInventory));
      setItems(docs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 50));
    });
    const qPartners = query(collection(db, 'users'), where('role', '==', 'partner'));
    const unsubPartners = onSnapshot(qPartners, snap => {
      setPartners(snap.docs.map(d => d.data() as AppUser));
    });
    return () => {
      unsubInventory();
      unsubPartners();
    };
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const printableItems = items.filter(i => i.partnerUid);
    if (selectedIds.length === printableItems.length && printableItems.length > 0) setSelectedIds([]);
    else setSelectedIds(printableItems.map(i => i.id));
  };

  const generateBulkQRs = async () => {
    if (generateAmount <= 0) return;
    setIsGenerating(true);
    const batchId = `LOT-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    try {
      const batch = writeBatch(db);
      for (let i = 0; i < generateAmount; i++) {
        const docId = Math.random().toString(36).substring(2, 10).toUpperCase();
        const docRef = doc(db, 'qr_inventory', docId);
        batch.set(docRef, {
          id: docId,
          status: 'available',
          batchId: batchId,
          createdAt: serverTimestamp(),
          partnerUid: null
        });

        // Log creation
        const logRef = doc(collection(db, 'logs'));
        batch.set(logRef, {
          action: 'creation',
          adminUid: 'SUPER-ADMIN',
          timestamp: serverTimestamp(),
          metadata: { qrId: docId, batchId: batchId }
        });
      }
      await batch.commit();
    } finally {
      setIsGenerating(false);
    }
  };

  const allocateBatch = async () => {
    if (!selectedPartner || allocateAmount <= 0) return;
    setAllocating(true);
    try {
      const q = query(collection(db, 'qr_inventory'), where('status', '==', 'available'), where('partnerUid', '==', null), limit(allocateAmount));
      const snap = await getDocs(q);
      if (snap.empty) { 
        console.warn("Vault empty - no available nodes to dispatch.");
        return; 
      }
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.update(d.ref, { 
          partnerUid: selectedPartner,
          assignedAt: serverTimestamp() 
        });

        // Log allocation
        const logRef = doc(collection(db, 'logs'));
        batch.set(logRef, {
          action: 'transfer',
          adminUid: 'SUPER-ADMIN',
          targetUid: selectedPartner,
          timestamp: serverTimestamp(),
          metadata: { qrId: d.id, target: selectedPartner, type: 'bulk' }
        });
      });
      await batch.commit();
    } finally {
      setAllocating(false);
    }
  };

  const unassignQR = async (id: string) => {
    if (!window.confirm('Reclaim this node to the global system vault? The partner will lose access to it.')) return;
    try {
      await updateDoc(doc(db, 'qr_inventory', id), { 
        partnerUid: null,
        status: 'available',
        mappedVehicleId: null,
        ownerUid: null
      });
      // Log reclaiming
      await addDoc(collection(db, 'logs'), {
        action: 'transfer',
        adminUid: 'SUPER-ADMIN',
        timestamp: serverTimestamp(),
        metadata: { qrId: id, target: 'vault', type: 'reclaim' }
      });
    } catch (err) {
      console.error("Unassign error:", err);
    }
  };

  const unlinkQR = async (id: string) => {
    if (!window.confirm('Unlink this node from the current vehicle? This will reset the mapping but keep the node with the partner.')) return;
    try {
      await updateDoc(doc(db, 'qr_inventory', id), { 
        status: 'available',
        mappedVehicleId: null,
        ownerUid: null
      });
      // Log unlinking
      await addDoc(collection(db, 'logs'), {
        action: 'unlink_qr',
        adminUid: 'SUPER-ADMIN',
        timestamp: serverTimestamp(),
        metadata: { qrId: id }
      });
    } catch (err) {}
  };

  const deleteQR = async (id: string) => {
    if (!window.confirm('PERMANENTLY delete this node from the database? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'qr_inventory', id));
      setSelectedIds(prev => prev.filter(i => i !== id));
      
      // Log deletion
      await addDoc(collection(db, 'logs'), {
        action: 'deletion',
        adminUid: 'SUPER-ADMIN',
        timestamp: serverTimestamp(),
        vehicleId: 'SYSTEM',
        metadata: { qrId: id }
      });
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const transferQR = async (id: string, newPartnerUid: string) => {
    try {
      await updateDoc(doc(db, 'qr_inventory', id), { 
        partnerUid: newPartnerUid === 'vault' ? null : newPartnerUid,
        assignedAt: newPartnerUid === 'vault' ? null : serverTimestamp()
      });
      
      // Log transfer
      await addDoc(collection(db, 'logs'), {
        action: 'transfer',
        adminUid: 'SUPER-ADMIN',
        timestamp: serverTimestamp(),
        metadata: { qrId: id, target: newPartnerUid }
      });
    } catch (err) {
      console.error("Transfer error:", err);
    }
  };

  const executePrint = async () => {
    // Only allow printing for nodes that are assigned to a partner
    const validIds = selectedIds.filter(id => {
      const item = items.find(i => i.id === id);
      return item && item.partnerUid;
    });

    if (validIds.length === 0) {
      console.warn("Print skipped: Only assigned or mapped nodes can be downloaded/printed.");
      return;
    }

    // Log print/download action
    try {
      await addDoc(collection(db, 'logs'), {
        action: 'download',
        adminUid: 'SUPER-ADMIN',
        status: 'success',
        timestamp: serverTimestamp(),
        metadata: { qrIds: validIds, type: 'print_view', count: validIds.length }
      });
    } catch (err) {
      console.error("Audit log failed:", err);
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const brand = "MyParkSaathi";
    const cards = [];
    
    for (const id of validIds) {
      const canvas = document.createElement('canvas');
      const qrSrc = document.getElementById(`qr-src-${id}`)?.querySelector('canvas');
      if (qrSrc) {
        await drawBrandedQR(canvas, id, qrSrc);
        const dataUrl = canvas.toDataURL("image/png");
        cards.push(`
          <div style="width: 450px; padding: 10px; border: 1px solid #eee; margin: 5px; display: inline-block; page-break-inside: avoid; border-radius: 12px; background: #fff; overflow: hidden;">
            <img src="${dataUrl}" style="width: 100%; display: block;" />
          </div>
        `);
      }
    }

    printWindow.document.write(`
      <html>
        <head><title>Print Stickers - ${brand}</title></head>
        <body style="margin:0; padding: 10px; background: #f8fafc; text-align: center;">
          <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 5px;">${cards.join('')}</div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 1000); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadSelectedQRs = async () => {
    const validIds = selectedIds.filter(id => {
      const item = items.find(i => i.id === id);
      return item && item.partnerUid;
    });

    if (validIds.length === 0) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      
      // Log download
      await addDoc(collection(db, 'logs'), {
        action: 'download',
        adminUid: 'SUPER-ADMIN',
        timestamp: serverTimestamp(),
        metadata: { qrIds: validIds, type: 'zip_package' }
      });

      const folder = zip.folder("MYPARK_TAG_STICKERS");

      for (const id of validIds) {
        const canvas = document.createElement('canvas');
        const qrSrc = document.getElementById(`qr-src-${id}`)?.querySelector('canvas');
        
        if (qrSrc) {
          await drawBrandedQR(canvas, id, qrSrc);
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
          if (blob && folder) {
            folder.file(`MyParkSaathi_${id}.png`, blob);
          }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `MYPARK_TAG_NODES_PNG_${Date.now()}.zip`;
      link.click();
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full translate-x-1/2 -translate-y-1/2 -z-0"></div>
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <QrCode className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-black text-slate-900 uppercase">Initialize Batch</h3>
              </div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8">Mint IDs into the global ledger vault.</p>
              <div className="flex gap-4">
                <input type="number" value={generateAmount} onChange={(e) => setGenerateAmount(Number(e.target.value))} className="border-2 border-slate-100 rounded-xl px-4 py-3 font-black w-32 outline-none focus:border-blue-500 transition-all" />
                <button onClick={generateBulkQRs} disabled={isGenerating} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase flex-1 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50">Mint Nodes</button>
              </div>
           </div>
        </div>
        <div className="bg-slate-900 p-8 rounded-2xl text-white shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full"></div>
           <div className="relative z-10 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <Layers className="w-5 h-5 text-blue-400" />
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Mass Dispatch</h3>
              </div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">Allocate master vault stock to partners.</p>
              <div className="space-y-4">
                <select value={selectedPartner} onChange={(e) => setSelectedPartner(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-[10px] font-black text-white outline-none focus:border-blue-500 transition-all cursor-pointer">
                   <option value="">-- Select Destination Partner --</option>
                   {partners.map(p => <option key={p.uid} value={p.uid}>{p.email}</option>)}
                </select>
                <div className="flex gap-4">
                   <input type="number" value={allocateAmount} onChange={(e) => setAllocateAmount(Number(e.target.value))} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-center w-32 outline-none font-bold" />
                   <button onClick={allocateBatch} disabled={!selectedPartner || allocating} className="bg-white text-slate-900 px-6 py-3 rounded-xl text-[10px] font-black uppercase flex-1 shadow-xl hover:bg-slate-200 transition-all disabled:opacity-50">Dispatch Nodes</button>
                </div>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === items.filter(i => i.partnerUid).length && items.filter(i => i.partnerUid).length > 0} 
                  onChange={toggleSelectAll} 
                  className="w-5 h-5 border-slate-300 text-blue-600 cursor-pointer rounded transition-all" 
                />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Regional Ledger Inventory</h3>
            </div>
            <div className="flex gap-2">
                <button 
                  onClick={downloadSelectedQRs} 
                  disabled={selectedIds.length === 0 || isZipping} 
                  className="px-8 py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase shadow-xl shadow-slate-100 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download PNGs ({selectedIds.filter(id => items.find(i => i.id === id)?.partnerUid).length})
                </button>
                <button 
                  onClick={executePrint} 
                  disabled={selectedIds.length === 0} 
                  className="px-8 py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> 
                  Print Layout
                </button>
            </div>
        </div>
        <div className="hidden">
           {items.map(item => (
             <div key={item.id} id={`qr-src-${item.id}`}>
                <QRCodeCanvas value={`${window.location.origin}/s/${item.id}`} size={600} />
             </div>
           ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
             <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[9px] tracking-widest border-b border-slate-100">
               <tr>
                 <th className="px-8 py-5 w-10 text-center"></th>
                 <th className="px-8 py-5">Node Reference</th>
                 <th className="px-8 py-5">Asset Mapping</th>
                 <th className="px-8 py-5">Security State</th>
                 <th className="px-8 py-5">Distribution Channel</th>
                 <th className="px-8 py-5">Printable</th>
                 <th className="px-8 py-5 text-right font-black">Controls</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {items.map(item => (
                 <tr key={item.id} className={cn("transition-all duration-200 group", selectedIds.includes(item.id) ? "bg-blue-50/50" : "hover:bg-slate-50/50")}>
                   <td className="px-8 py-6 text-center">
                      {item.partnerUid && (
                        <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="w-5 h-5 border-slate-300 text-blue-600 cursor-pointer rounded" />
                      )}
                   </td>
                   <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 border border-slate-200 rounded-lg flex items-center justify-center p-1 bg-white shadow-sm group-hover:border-blue-200 transition-colors">
                            <QRCodeCanvas value={`${window.location.origin}/s/${item.id}`} size={32} />
                         </div>
                         <div>
                            <p className="text-sm font-black font-mono text-slate-900 tracking-wider uppercase">{item.id}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Physical Tag ID</p>
                         </div>
                      </div>
                   </td>
                   <td className="px-8 py-6">
                      {item.vehicleId ? (
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-slate-900 uppercase">{item.vehicleId}</span>
                           <div className="flex items-center gap-1 mt-1">
                              <button 
                                onClick={() => unlinkQR(item.id)}
                                className="text-[8px] font-black uppercase text-red-500 hover:underline"
                              >
                                Unlink
                              </button>
                           </div>
                        </div>
                      ) : (
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Unmapped</span>
                      )}
                   </td>
                   <td className="px-8 py-6">
                     <span className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all", 
                        item.status === 'available' ? "bg-green-50 text-green-700 border-green-100" : "bg-blue-50 text-blue-700 border-blue-100"
                      )}>
                        {item.status}
                      </span>
                   </td>
                   <td className="px-8 py-6">
                      <div className="flex flex-col">
                         <span className={cn("font-black text-[10px] uppercase", item.partnerUid ? "text-slate-900" : "text-slate-300")}>
                           {item.partnerUid ? partners.find(p => p.uid === item.partnerUid)?.email : 'MASTER VAULT'}
                         </span>
                         <div className="mt-2 group-hover:opacity-100 lg:opacity-0 transition-opacity">
                              <select 
                                onChange={(e) => transferQR(item.id, e.target.value)}
                                className={cn("text-[9px] font-black uppercase bg-transparent border-none outline-none cursor-pointer hover:underline p-0", item.partnerUid ? "text-blue-600" : "text-slate-400")}
                              >
                                <option value="">{item.partnerUid ? 'Transfer Node...' : 'Assign from Vault...'}</option>
                                {item.partnerUid && <option value="vault">Move to Vault</option>}
                                {partners.filter(p => p.uid !== item.partnerUid).map(p => (
                                  <option key={p.uid} value={p.uid}>Assign to {p.email.split('@')[0]}</option>
                                ))}
                              </select>
                         </div>
                      </div>
                   </td>
                   <td className="px-8 py-6">
                      {item.partnerUid ? (
                        <div className="flex items-center gap-2 text-green-600 font-black text-[9px] uppercase tracking-tighter">
                          <CheckCircle2 className="w-3 h-3" /> Yes
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-300 font-black text-[9px] uppercase tracking-tighter">
                          <AlertTriangle className="w-3 h-3" /> No
                        </div>
                      )}
                   </td>
                   <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.partnerUid && item.status === 'available' && (
                          <button 
                            onClick={() => unassignQR(item.id)} 
                            title="Reclaim to System Vault"
                            className="p-2.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
                          >
                            <Repeat className="w-4 h-4" />
                          </button>
                        )}
                        
                        {item.status === 'assigned' && (
                           <a href={`/s/${item.id}`} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                              <ExternalLink className="w-4 h-4" />
                           </a>
                        )}

                        {/* Delete logic: only if in vault (unassigned) */}
                        {!item.partnerUid && item.status === 'available' && (
                           <button 
                             onClick={() => deleteQR(item.id)}
                             className="p-2.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                             title="Delete Node"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                        )}
                      </div>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
          {items.length === 0 && (
            <div className="py-20 text-center border-t border-slate-50 bg-slate-50/20">
               <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
               <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Global Vault is Empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), limit(500));
    const unsub = onSnapshot(q, snap => {
      setUsers(snap.docs.map(d => ({ ...d.data(), uid: d.id } as AppUser)).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateRole = async (uid: string, newRole: string) => {
    try { 
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      await addDoc(collection(db, 'logs'), {
        action: 'edit_role',
        adminUid: 'current-admin',
        targetUid: uid,
        timestamp: serverTimestamp(),
        metadata: { newRole }
      });
    } catch (err: any) {
      alert(`Error updating role: ${err.message}`);
    }
  };

  const toggleStatus = async (uid: string, currentStatus: string) => {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    try {
      await updateDoc(doc(db, 'users', uid), { accountStatus: newStatus });
      await addDoc(collection(db, 'logs'), {
        action: newStatus === 'blocked' ? 'block_user' : 'unblock_user',
        adminUid: 'current-admin',
        targetUid: uid,
        timestamp: serverTimestamp()
      });
    } catch (err: any) {
      alert(`Error toggling status: ${err.message}`);
    }
  };

  const softDeleteUser = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this user? This will soft-delete their profile.')) return;
    try {
      await updateDoc(doc(db, 'users', uid), { isDeleted: true });
      await addDoc(collection(db, 'logs'), {
        action: 'delete_user',
        adminUid: 'current-admin',
        targetUid: uid,
        timestamp: serverTimestamp()
      });
    } catch (err: any) {
      alert(`Error deleting user: ${err.message}`);
    }
  };

  const filtered = users.filter(u => {
    if (u.isDeleted === true) return false;
    const search = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(search) || 
      u.displayName?.toLowerCase().includes(search) ||
      u.phoneNumber?.includes(searchTerm)
    );
  });

  if (loading) return (
    <div className="bg-white rounded-3xl border border-slate-200 p-20 flex flex-col items-center justify-center gap-6">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Identity Vault...</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
        <div className="px-8 py-8 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
           <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Identity Management</h3>
              <p className="text-xs text-slate-500 font-medium italic">Full master data control for all platform participants.</p>
           </div>
           <div className="relative w-full lg:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="SEARCH BY EMAIL, NAME, PHONE..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-300" 
              />
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[9px] tracking-widest border-b border-slate-100">
               <tr>
                 <th className="px-8 py-5">Profile</th>
                 <th className="px-8 py-5">Role</th>
                 <th className="px-8 py-5">Status</th>
                 <th className="px-8 py-5">Contact</th>
                 <th className="px-8 py-5 text-right">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {filtered.map(u => (
                 <tr key={u.uid} className="hover:bg-slate-50/30 transition-colors group">
                   <td className="px-8 py-6">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-xs font-black text-white italic">
                          {u.displayName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 leading-none">{u.displayName || 'Anonymous User'}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-bold">{u.email}</p>
                        </div>
                     </div>
                   </td>
                   <td className="px-8 py-6">
                      <select 
                        value={u.role} 
                        onChange={(e) => updateRole(u.uid, e.target.value)} 
                        className={cn(
                          "bg-white border rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-widest outline-none", 
                          u.role === 'admin' ? "border-slate-900 text-slate-900" : "border-blue-200 text-blue-600"
                        )}
                      >
                         <option value="user">Standard User</option>
                         <option value="partner">Sales Partner</option>
                         <option value="admin">System Admin</option>
                         <option value="super-admin">Super Admin</option>
                         <option value="viewer">Dashboard Viewer</option>
                      </select>
                   </td>
                   <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                        u.accountStatus === 'blocked' ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                      )}>
                        {u.accountStatus || 'active'}
                      </span>
                   </td>
                   <td className="px-8 py-6">
                      <p className="text-[10px] font-bold text-slate-600">{u.phoneNumber || 'NO PHONE'}</p>
                   </td>
                   <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => toggleStatus(u.uid, u.accountStatus || 'active')}
                          title={u.accountStatus === 'blocked' ? "Unblock User" : "Block User"}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          {u.accountStatus === 'blocked' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => softDeleteUser(u.uid)}
                          title="Soft Delete"
                          className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                   </td>
                 </tr>
               ))}
               {filtered.length === 0 && (
                 <tr>
                   <td colSpan={5} className="px-8 py-20 text-center">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No participants segments found matching your query.</p>
                   </td>
                 </tr>
               )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
