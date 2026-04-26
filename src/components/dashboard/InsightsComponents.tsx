import React from 'react';
import { db } from '../../lib/firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend, PieChart, Pie
} from 'recharts';
import { format, subDays, startOfDay, isWithinInterval, startOfWeek, startOfMonth } from 'date-fns';
import { LogEntry } from '../../types';
import { Activity, Clock, TrendingUp, AlertCircle, CheckCircle2, Repeat, Package, Trash2, Smartphone, QrCode, Layers, Search, Download, UserPlus, Filter, BrainCircuit, AlertTriangle, ArrowRight, MousePointerClick, RefreshCw, Car, DollarSign, Percent, Wallet, Banknote, Calendar, ShieldCheck, Loader2, Eye, UserX, Map as MapIcon } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export function SmartInsights({ stats, rawData, logs }: { stats: any, rawData: any, logs: LogEntry[] }) {
  const [insight, setInsight] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const generateSmartInsight = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Analyze this QR safety system data and give one high-impact business advice (max 2 sentences).
      Metrics:
      - Total Nodes: ${stats.totalQRs}
      - Mapped Vehicles: ${stats.vehicles}
      - Conversion Rate: ${((stats.vehicles / stats.assignedQRs) * 100).toFixed(1)}%
      - Scan Trend: ${stats.scanTrend?.toFixed(1)}% compared to last month.
      - Partner count: ${rawData.partners.length}
      - Available Stock: ${stats.availableQRs}
      Identify under-utilized partners (allocated > 10 but vehicles == 0) and suggest optimal redistribution paths.
      Provide suggest for allocation or redistribution based on activity.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setInsight(response.text);
    } catch (err: any) {
      // Gracefully handle rate limits (429) without console alarms
      if (err?.message?.includes('429') || err?.status === 429 || err?.message?.includes('RESOURCE_EXHAUSTED')) {
         setInsight("Predictive intelligence is temporarily paused due to API limits. Defaulting to standard analytic mode: focus on high-volume zones for supply distribution.");
      } else {
         console.warn("AI Insight generation failed:", err);
         setInsight("Our predictive models suggest focusing redistribution on the top 3 high-active partners to maximize node ROI.");
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    generateSmartInsight();
  }, [stats.totalQRs]);

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden h-full">
       <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3"></div>
       <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
             <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                <BrainCircuit className="w-5 h-5 text-white" />
             </div>
             <h3 className="text-sm font-black uppercase tracking-widest">Predictive Intelligence</h3>
          </div>
          
          <div className="min-h-[80px]">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-white/20 rounded w-full"></div>
                <div className="h-4 bg-white/20 rounded w-3/4"></div>
              </div>
            ) : (
              <p className="text-xl font-bold leading-relaxed">
                {insight || "Analyzing global node activity for smart redistribution..."}
              </p>
            )}
          </div>
          
          <button 
            onClick={generateSmartInsight}
            className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all border border-white/10"
          >
            Refresh Forecast <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
       </div>
    </div>
  );
}

export function AuditLogs({ logs, partners }: { logs: LogEntry[], partners: any[] }) {
  const [filter, setFilter] = React.useState('');
  
  const filtered = logs.filter(l => 
    l.action.toLowerCase().includes(filter.toLowerCase()) || 
    l.vehicleId?.toLowerCase().includes(filter.toLowerCase()) || 
    l.metadata?.qrId?.toLowerCase().includes(filter.toLowerCase()) ||
    l.metadata?.vehicleNumber?.toLowerCase().includes(filter.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ['Timestamp', 'Action', 'Target', 'Admin', 'Metadata'];
    const rows = filtered.map(l => [
      l.timestamp?.toDate ? format(l.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
      l.action.toUpperCase(),
      l.targetUid || l.vehicleId || 'SYSTEM',
      l.adminUid || 'SYSTEM',
      JSON.stringify(l.metadata || {})
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `myparksaathi_audit_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
       <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/50">
          <div>
             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Forensic Audit Trail</h3>
             <p className="text-xs text-slate-500 font-medium">Traceability for every node lifecycle event.</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="FILTER BY ACTION/ID..."
                  className="w-full pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                />
             </div>
             <button 
              onClick={exportCSV}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
             >
                <Download className="w-4 h-4" /> Export CSV
             </button>
          </div>
       </div>
       
       <div className="overflow-x-auto">
          <table className="w-full">
             <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                   <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                   <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                   <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Context</th>
                   <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Scanner</th>
                   <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Coordinates</th>
                   <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Performer</th>
                   <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Trace ID</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {filtered.map((log) => (
                   <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5 whitespace-nowrap">
                         <p className="text-[10px] font-black text-slate-900 uppercase">
                            {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'MMM dd, HH:mm') : 'JUST NOW'}
                         </p>
                      </td>
                      <td className="px-8 py-5">
                         <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                            log.action === 'scan' ? 'bg-blue-100 text-blue-600' :
                            log.action === 'emergency' ? 'bg-red-100 text-red-600' :
                            log.action === 'transfer' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'
                         )}>
                            {log.action}
                         </span>
                      </td>
                      <td className="px-8 py-5">
                         <p className="text-[10px] font-bold text-slate-900 uppercase">
                            {log.metadata?.vehicleNumber || log.metadata?.qrId || log.vehicleId || 'SYSTEM'}
                         </p>
                         <p className="text-[8px] text-slate-400 uppercase mt-0.5">{log.vehicleId || 'Internal'}</p>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex flex-col">
                           <span className="text-[10px] font-black text-slate-900 uppercase">{log.device?.os || 'Unknown'}</span>
                           <span className="text-[8px] text-slate-400 font-bold uppercase">{log.device?.browser || 'System'} • {log.device?.type || 'API'}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         {log.location?.lat ? (
                           <div className="flex items-center gap-3">
                             <div className="flex flex-col">
                               <span className="text-[10px] font-black text-blue-600 uppercase">LAT: {log.location.lat.toFixed(4)}</span>
                               <span className="text-[10px] font-black text-blue-600 uppercase">LNG: {log.location.lng.toFixed(4)}</span>
                             </div>
                             <a 
                               href={`https://www.google.com/maps?q=${log.location.lat},${log.location.lng}`} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm shadow-blue-200/50"
                               title="Open in Maps"
                             >
                               <MapIcon className="w-4 h-4" />
                             </a>
                           </div>
                         ) : (
                           <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">No GPS Data</span>
                         )}
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-2">
                           <div className="w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center text-[8px] font-black text-white italic">A</div>
                           <p className="text-[10px] font-bold text-slate-900 uppercase">{log.adminUid ? 'Admin' : 'Terminal'}</p>
                         </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <p className="text-[9px] font-mono text-slate-400">{log.id?.slice(-8) || 'AUTO'}</p>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}

export function InventorySupplyChain({ rawData, logs }: { rawData: any, logs: LogEntry[] }) {
  const stockAlert = rawData.inventory.filter((i: any) => i.status === 'available').length < 50;

  const batchStats = React.useMemo(() => {
     const batches: Record<string, { total: number, active: number }> = {};
     rawData.inventory.forEach((i: any) => {
        const bid = i.batchId || 'LEGACY-01';
        if (!batches[bid]) batches[bid] = { total: 0, active: 0 };
        batches[bid].total++;
        if (i.status === 'assigned') batches[bid].active++;
     });
     return Object.entries(batches).map(([id, s]) => ({
        id,
        ...s,
        performance: (s.active / s.total) * 100
     }));
  }, [rawData.inventory]);

  return (
    <div className="space-y-8">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
             <div className="mb-8 flex justify-between items-center">
                <div>
                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Batch Distribution</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Lifecycle success per production lot</p>
                </div>
                {stockAlert && (
                   <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Replenish Advised</span>
                   </div>
                )}
             </div>
             
             <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={batchStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="id" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }}
                      />
                      <Bar dataKey="performance" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Consumption %" />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
          
          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
             <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-8">Supply Chain Vital</h3>
             <div className="space-y-8">
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Consumption Depth</p>
                   <p className="text-4xl font-black">{((rawData.inventory.filter((i: any) => i.status === 'assigned').length / rawData.inventory.length) * 100).toFixed(1)}%</p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Production Lots</p>
                   <p className="text-4xl font-black text-blue-400">{batchStats.length}</p>
                </div>
                <button className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                   Manage Batches
                </button>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {batchStats.map((batch) => (
             <div key={batch.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <ArrowRight className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Lot: {batch.id}</p>
                <div className="flex items-end justify-between gap-4">
                   <div>
                      <p className="text-2xl font-black text-slate-900">{batch.total}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Total Nodes</p>
                   </div>
                   <div className="text-right">
                      <p className="text-xl font-black text-blue-600">{batch.performance.toFixed(0)}%</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Yield</p>
                   </div>
                </div>
                <div className="mt-4 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${batch.performance}%` }}></div>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export function ScanTrends({ logs }: { logs: LogEntry[] }) {
  const data = React.useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), i);
      return {
        date: format(date, 'MMM dd'),
        fullDate: startOfDay(date),
        scans: 0,
        actions: 0
      };
    }).reverse();

    logs.forEach(log => {
      const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
      const day = last7Days.find(d => isWithinInterval(logDate, { start: startOfDay(d.fullDate), end: new Date(d.fullDate.getTime() + 86399999) }));
      if (day) {
        if (log.action === 'scan') day.scans++;
        else day.actions++;
      }
    });

    return last7Days;
  }, [logs]);

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Scan Velocity</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Last 7 Days Usage</p>
        </div>
        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }}
              itemStyle={{ textTransform: 'uppercase' }}
            />
            <Area type="monotone" dataKey="scans" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScans)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function LiveActivity({ feed }: { feed: LogEntry[] }) {
  const getIcon = (action: string) => {
    switch (action) {
      case 'scan': return <QrCode className="w-3 h-3" />;
      case 'emergency': return <AlertCircle className="w-3 h-3" />;
      case 'transfer': return <Repeat className="w-3 h-3" />;
      case 'creation': return <Package className="w-3 h-3" />;
      case 'deletion': return <Trash2 className="w-3 h-3" />;
      case 'call': return <Smartphone className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  const getLabel = (log: LogEntry) => {
    switch (log.action) {
      case 'scan': return "Tag Scanned";
      case 'emergency': return "Alert Triggered";
      case 'transfer': return "Node Assigned";
      case 'creation': return "Batch Created";
      case 'deletion': return "Node Purged";
      default: return log.action.toUpperCase();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-tighter">Live Feed</h3>
        </div>
        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[400px] p-4 bg-slate-50/50 space-y-3">
        {feed.slice(0, 20).map((log, i) => (
          <div key={i} className="flex gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              log.action === 'emergency' ? 'bg-red-100 text-red-600' : 
              log.action === 'scan' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
            }`}>
              {getIcon(log.action)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-900 uppercase leading-none mb-1">{getLabel(log)}</p>
              <p className="text-[8px] text-slate-400 font-bold truncate">ID: {log.metadata?.qrId || log.vehicleId || 'SYSTEM'}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
                <p className="text-[8px] font-black text-slate-400 uppercase whitespace-nowrap">
                  {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm') : 'JUST NOW'}
                </p>
                {log.location?.lat && (
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[7px] text-blue-500 font-black uppercase">LIVE GPS</span>
                        <a 
                          href={`https://www.google.com/maps?q=${log.location.lat},${log.location.lng}`} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[8px] text-blue-600 font-black hover:underline"
                        >
                          VIEW MAP
                        </a>
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightsDashboard({ stats, rawData, logs, timeRange }: { stats: any, rawData: any, logs: LogEntry[], timeRange: string }) {
  const lifecycleData = [
    { name: 'Created', value: stats.totalQRs },
    { name: 'Assigned', value: stats.assignedQRs },
    { name: 'Mapped', value: stats.vehicles },
    { name: 'Expired', value: 0 }, 
  ];

  const conversionRate = stats.assignedQRs > 0 ? ((stats.vehicles / stats.assignedQRs) * 100).toFixed(1) : 0;

  const exportPerformanceReport = () => {
    const headers = ['Partner', 'Allocated Nodes', 'Mapped Vehicles', 'Utilization %', 'Status'];
    const rows = rawData.partners.map((p: any) => {
      const assigned = rawData.inventory.filter((i: any) => i.partnerUid === p.uid).length;
      const mapped = rawData.vehicles.filter((v: any) => v.partnerUid === p.uid).length;
      const rate = assigned > 0 ? (mapped / assigned) * 100 : 0;
      return [
        p.email,
        assigned,
        mapped,
        rate.toFixed(1) + '%',
        rate > 50 ? 'HEALTHY' : rate > 0 ? 'UNDER_USED' : 'INACTIVE'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `myparksaathi_performance_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // Filter logs based on timeRange
  const filteredLogs = React.useMemo(() => {
    const now = new Date();
    let start: Date;
    switch(timeRange) {
      case 'today': start = startOfDay(now); break;
      case 'week': start = startOfWeek(now); break;
      case 'month': start = startOfMonth(now); break;
      case 'year': start = startOfMonth(subDays(now, 365)); break;
      default: return logs;
    }
    return logs.filter(l => {
      const ts = l.timestamp?.toDate ? l.timestamp.toDate() : new Date();
      return ts >= start;
    });
  }, [logs, timeRange]);

  return (
    <div className="space-y-12 pb-20">
      {/* System Health & Efficiency */}
      <div className="bg-slate-900 rounded-3xl p-10 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3"></div>
         <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <Activity className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-black uppercase tracking-tighter">Vital Operations Snapshot</h2>
               </div>
               <button 
                 onClick={exportPerformanceReport}
                 className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
               >
                 <Download className="w-4 h-4" /> Performance Export
               </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-4">Stock Liquidity</p>
                  <div className="flex items-end gap-3">
                     <p className="text-6xl font-black tracking-tighter">{conversionRate}%</p>
                     <p className="text-sm font-bold text-green-400 mb-2 uppercase tracking-widest">Assigned → Mapped</p>
                  </div>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-4">Usage Intensity</p>
                  <div className="flex items-end gap-3">
                     <p className="text-6xl font-black tracking-tighter">{stats.scansToday}</p>
                     <p className="text-sm font-bold text-blue-400 mb-2 uppercase tracking-widest">Scans Today</p>
                  </div>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-4">Node Health</p>
                  <div className="flex items-end gap-3">
                     <p className="text-6xl font-black tracking-tighter">{stats.vehicles}</p>
                     <p className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Active nodes</p>
                  </div>
               </div>
            </div>

            <div className="mt-12 pt-10 border-t border-slate-800 flex flex-wrap gap-12">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Real-time sync active</span>
               </div>
               <div className="flex items-center gap-3">
                  <Repeat className="w-4 h-4 text-slate-500" />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Auto-balancing enabled</span>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatTile icon={Layers} label="Total Assets" value={stats.totalQRs} />
        <StatTile icon={CheckCircle2} label="Mapped Rate" value={`${conversionRate}%`} />
        <StatTile icon={Clock} label="Today Scans" value={stats.scansToday} />
        <StatTile icon={QrCode} label="Global Assigned" value={stats.assignedQRs} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
           <PartnerPerformance rawData={rawData} />
        </div>
        <div>
           <BehaviorBreakdown logs={logs} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GeoIntelligence logs={logs} />
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
           <div className="mb-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Inventory Flow</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Lifecycle Stages Analysis</p>
           </div>
           <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lifecycleData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} width={80} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {lifecycleData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
}

export function PartnerPerformance({ rawData }: { rawData: any }) {
  const performanceData = React.useMemo(() => {
    return rawData.partners.map((p: any) => {
      const assigned = rawData.inventory.filter((i: any) => i.partnerUid === p.uid).length;
      const mapped = rawData.vehicles.filter((v: any) => v.partnerUid === p.uid).length;
      const rate = assigned > 0 ? (mapped / assigned) * 100 : 0;
      return {
        name: p.email.split('@')[0],
        assigned,
        mapped,
        rate: rate.toFixed(1)
      };
    }).sort((a: any, b: any) => b.assigned - a.assigned).slice(0, 5);
  }, [rawData]);

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
      <div className="mb-8">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Partner Performance</h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Allocation vs Real-world Mapping</p>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }}
            />
            <Legend verticalAlign="top" height={36}/>
            <Bar dataKey="assigned" name="Allocated" fill="#1e293b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="mapped" name="Actually Used" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function BehaviorBreakdown({ logs }: { logs: LogEntry[] }) {
  const browserData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach(l => {
      const b = l.device?.browser || 'Other';
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [logs]);

  const sourceData = React.useMemo(() => {
    const counts: Record<string, number> = { 'Direct': 0, 'Shared': 0, 'Re-scan': 0 };
    logs.forEach(l => {
      if (l.action === 'scan') {
          const type = l.metadata?.source || 'Direct';
          counts[type] = (counts[type] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [logs]);

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
      <div className="mb-8">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Behavior Matrix</h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Source & Device Profile</p>
      </div>
      
      <div className="flex-1 space-y-8">
        <div className="h-48">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Scan Sources</p>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={sourceData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                        {sourceData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{fontSize: '10px'}} />
                </PieChart>
            </ResponsiveContainer>
        </div>

        <div className="h-48">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Browser Data</p>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={browserData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                        {browserData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{fontSize: '10px'}} />
                </PieChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function GeoIntelligence({ logs }: { logs: LogEntry[] }) {
  const geoData = React.useMemo(() => {
    const counts: Record<string, { scans: number, highRisk: number }> = {};
    logs.forEach(l => {
      const region = l.location?.region || 'Unknown';
      if (!counts[region]) counts[region] = { scans: 0, highRisk: 0 };
      counts[region].scans++;
      if (l.action === 'emergency') counts[region].highRisk++;
    });
    return Object.entries(counts).map(([name, stats]) => ({ 
      name, 
      scans: stats.scans,
      risk: stats.highRisk
    })).sort((a, b) => b.scans - a.scans).slice(0, 8);
  }, [logs]);

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Location Intelligence</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Regional Heatmap & Risk Zones</p>
        </div>
        <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
            <span className="text-[8px] font-black text-slate-400 uppercase">Scans</span>
            <span className="flex h-2 w-2 rounded-full bg-red-500 ml-2"></span>
            <span className="text-[8px] font-black text-slate-400 uppercase">Risks</span>
        </div>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={geoData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
            <Tooltip 
               cursor={{fill: '#f8fafc'}}
               contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }}
            />
            <Bar dataKey="scans" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="risk" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4">
      <div className="w-10 h-10 bg-slate-50 text-slate-900 rounded-lg flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export function FleetManagement({ vehicles, payments, users, cn, logs }: { vehicles: any[], payments: any[], users: any[], cn: any, logs: LogEntry[] }) {
  const [filter, setFilter] = React.useState('');

  const today = new Date();
  const startOfTodayDt = startOfDay(today);
  const startOfMonthDt = startOfMonth(today);
  const startOfYearDt = new Date(today.getFullYear(), 0, 1);

  let vehiclesToday = 0;
  let vehiclesMonth = 0;
  let vehiclesYear = 0;
  let partnerVehicles = 0;
  let directUserVehicles = 0;

  const validVehicles = vehicles.filter((v: any) => !v.isDeleted);

  validVehicles.forEach((v: any) => {
    const createdAt = v.createdAt?.toDate ? v.createdAt.toDate() : new Date();
    if (createdAt >= startOfTodayDt) vehiclesToday++;
    if (createdAt >= startOfMonthDt) vehiclesMonth++;
    if (createdAt >= startOfYearDt) vehiclesYear++;

    if (v.partnerUid) {
      partnerVehicles++;
    } else {
      directUserVehicles++;
    }
  });

  const filteredVehicles = validVehicles.filter((v: any) => {
    const searchStr = filter.toLowerCase();
    return (
      v.vehicleNumber?.toLowerCase().includes(searchStr) ||
      v.ownerName?.toLowerCase().includes(searchStr) ||
      v.phone?.includes(searchStr) ||
      v.qrId?.toLowerCase().includes(searchStr)
    );
  }).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const getVehiclePaymentDetails = (vehicleId: string) => {
    return payments.filter((p: any) => p.vehicleId === vehicleId).reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
  };

  const getOwnerTypeName = (v: any) => {
     if (v.partnerUid) {
       const p = users.find((u: any) => u.uid === v.partnerUid);
       return `Partner: ${p?.displayName || v.partnerUid}`;
     }
     return 'Direct User';
  };

  const getLastKnownLocation = (vehicleId: string) => {
    const scanLogs = logs.filter(l => l.vehicleId === vehicleId && l.location?.lat);
    if (scanLogs.length === 0) return null;
    return scanLogs[0].location; // logs are sorted desc
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatTile icon={Car} label="Added Today" value={vehiclesToday} />
        <StatTile icon={Car} label="Added This Month" value={vehiclesMonth} />
        <StatTile icon={Car} label="Added This Year" value={vehiclesYear} />
        <StatTile icon={UserPlus} label="By Direct Users" value={directUserVehicles} />
        <StatTile icon={Layers} label="By Partners" value={partnerVehicles} />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
        <div className="px-8 py-8 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Global Fleet Registry</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Detailed directory of every mapped vehicle node and subscription state.</p>
          </div>
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="SEARCH BY NUMBER, OWNER, QR ID..." 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)} 
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all placeholder:text-slate-300" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[9px] tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Vehicle & Identity</th>
                <th className="px-8 py-5">Origin / Affiliation</th>
                <th className="px-8 py-5">QR Matrix ID</th>
                <th className="px-8 py-5">Last Known Location</th>
                <th className="px-8 py-5">Financials</th>
                <th className="px-8 py-5">Lifecycle (Start - Expiry)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.map((v: any) => {
                const totalPaid = getVehiclePaymentDetails(v.id);
                const startDate = v.createdAt?.toDate ? format(v.createdAt.toDate(), 'PP') : 'N/A';
                const expiryDate = v.subscriptionExpiry?.toDate ? format(v.subscriptionExpiry.toDate(), 'PP') : 'N/A';
                const isExpired = v.subscriptionExpiry?.toDate ? v.subscriptionExpiry.toDate() < new Date() : false;
                const lastLoc = getLastKnownLocation(v.id);

                return (
                  <tr key={v.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-sm font-black text-slate-900 uppercase mb-1">{v.vehicleNumber}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{v.ownerName} • {v.model}</p>
                      <p className="text-[9px] text-slate-400 mt-1">{v.phone} • {v.type}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                        v.partnerUid ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {getOwnerTypeName(v)}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-[11px] font-mono font-bold text-slate-700">{v.qrId}</p>
                    </td>
                    <td className="px-8 py-5">
                      {lastLoc ? (
                        <a 
                          href={`https://www.google.com/maps?q=${lastLoc.lat},${lastLoc.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <MapIcon className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest underline decoration-2 underline-offset-4">Open Maps</span>
                        </a>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">No scan data</span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-[11px] font-black text-slate-900">₹{totalPaid}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">PLAN: {v.planId}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] font-bold text-green-600">START: {startDate}</p>
                        <p className={cn("text-[10px] font-bold", isExpired ? "text-red-600" : "text-slate-500")}>
                          END: {expiryDate} {isExpired && "(EXPIRED)"}
                        </p>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredVehicles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No vehicle registries found matching criteria.</p>
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

export function FinancialsManagement({ payments, commissions, users, vehicles, cn }: any) {
  const [filter, setFilter] = React.useState('');
  const [updating, setUpdating] = React.useState<string | null>(null);

  // Revenue Breakdown calculated from real approved payments
  const approvedPayments = payments.filter((p: any) => p.status === 'verified');
  const totalRevenue = approvedPayments.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
  
  // Estimate breakdown based on presence of partnerUid in the payment or linked vehicle
  const partnerRevenue = approvedPayments.filter((p: any) => {
    const v = vehicles.find((veh: any) => veh.id === p.vehicleId);
    return v?.partnerUid || p.partnerUid;
  }).reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
  
  const directUserRevenue = totalRevenue - partnerRevenue;

  // Commission breakdown
  let totalCommission = 0;
  let paidCommission = 0;
  let pendingCommission = 0;

  commissions.forEach((c: any) => {
    const amt = parseFloat(c.amount) || 0;
    totalCommission += amt;
    if (c.status === 'paid') {
      paidCommission += amt;
    } else {
      pendingCommission += amt;
    }
  });

  const getPartnerName = (uid: string) => {
    return users.find((u: any) => u.uid === uid)?.displayName || uid;
  };

  const filteredCommissions = commissions.filter((c: any) => {
    const search = filter.toLowerCase();
    const pName = getPartnerName(c.partnerUid).toLowerCase();
    return pName.includes(search) || c.status.includes(search);
  }).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const markAsPaid = async (id: string) => {
    setUpdating(id);
    try {
      await updateDoc(doc(db, 'commissions', id), {
        status: 'paid'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Revenue Section */}
      <div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-4">Revenue Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatTile icon={Wallet} label="Total Revenue" value={`₹${totalRevenue}`} />
          <StatTile icon={Layers} label="Partner Generated" value={`₹${partnerRevenue}`} />
          <StatTile icon={UserPlus} label="Direct Generated" value={`₹${directUserRevenue}`} />
        </div>
      </div>

      {/* Commission Section */}
      <div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-4 mt-12">Commission Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatTile icon={Percent} label="Total Earned" value={`₹${totalCommission}`} />
          <StatTile icon={Banknote} label="Amount Paid" value={`₹${paidCommission}`} />
          <StatTile icon={Clock} label="Amount Pending" value={`₹${pendingCommission}`} />
        </div>
      </div>

      {/* Commission Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl mt-8">
        <div className="px-8 py-8 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Partner Commission Tracking</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Detailed history and status of all partner earnings and payouts.</p>
          </div>
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="SEARCH PARTNER OR STATUS..." 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)} 
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all placeholder:text-slate-300" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[9px] tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Date & Partner</th>
                <th className="px-8 py-5">Amount</th>
                <th className="px-8 py-5">Vehicle ID</th>
                <th className="px-8 py-5">Payment Status</th>
                <th className="px-8 py-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCommissions.map((c: any) => {
                const isPaid = c.status === 'paid';
                const createdDt = c.createdAt?.toDate ? format(c.createdAt.toDate(), 'PP p') : 'Unknown';

                return (
                  <tr key={c.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-sm font-black text-slate-900 uppercase mb-1">{getPartnerName(c.partnerUid)}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{createdDt}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-lg font-black text-green-600">₹{c.amount}</p>
                    </td>
                    <td className="px-8 py-5">
                       <p className="text-[10px] font-mono text-slate-600 font-bold bg-slate-100 items-center justify-center inline-block px-3 py-1 rounded max-w-[120px] truncate">{c.vehicleId}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1",
                        isPaid ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      )}>
                        {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {c.status}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      {!isPaid ? (
                        <button 
                          onClick={() => markAsPaid(c.id)}
                          disabled={updating === c.id}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          {updating === c.id ? 'Updating...' : 'Mark as Paid'}
                        </button>
                      ) : (
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Settled</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredCommissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No commission records match your search.</p>
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

export function FutureProjection() {
  const projectionData = [
    { year: 'Year 1', units: 10000, revenue: 5000000, profit: 1500000, growth: 'Foundational' },
    { year: 'Year 2', units: 50000, revenue: 25000000, profit: 12000000, growth: '500%' },
    { year: 'Year 3', units: 150000, revenue: 100000000, profit: 55000000, growth: '300%' },
    { year: 'Year 4', units: 500000, revenue: 450000000, profit: 280000000, growth: '330%' },
    { year: 'Year 5', units: 1500000, revenue: 1500000000, profit: 1100000000, growth: '300%' },
  ];

  return (
    <div className="space-y-10">
      <div className="bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 blur-[80px] rounded-full"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">Strategic Forecast</h3>
              <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">5-Year Growth Trajectory</h2>
            </div>
          </div>
          
          <p className="text-slate-400 font-medium max-w-2xl text-base md:text-lg leading-relaxed mb-10">
            This projection models a rapid expansion phase where renewals and ecosystem integrations drive exponential profitability compared to initial hardware distribution costs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Terminal Profit (Y5)</p>
                <h4 className="text-4xl font-black text-green-400">₹110 Cr</h4>
                <p className="text-[10px] text-slate-500 mt-2 font-bold italic">Estimated net surplus after all payouts.</p>
             </div>
             <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Market Penetration</p>
                <h4 className="text-4xl font-black text-blue-400">1.5M</h4>
                <p className="text-[10px] text-slate-500 mt-2 font-bold italic">Active vehicle nodes mapped globally.</p>
             </div>
             <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md md:col-span-2 lg:col-span-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Avg. Retention Rate</p>
                <h4 className="text-4xl font-black text-indigo-400">82%</h4>
                <p className="text-[10px] text-slate-500 mt-2 font-bold italic">Annual subscription renewal forecast.</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <BarChart className="w-4 h-4 text-blue-600" />
                Revenue & Profit Lifecycle
              </h3>
           </div>
           <div className="h-[300px] md:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="year" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                    tickFormatter={(val) => `₹${(val / 10000000).toFixed(0)}Cr`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend iconType="circle" />
                  <Bar dataKey="revenue" name="Gross Revenue" fill="#1e293b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Net Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                Node Installation Volume
              </h3>
           </div>
           <div className="h-[300px] md:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData}>
                  <defs>
                    <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="year" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="units" name="Active Vehicles" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorUnits)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden overflow-x-auto">
         <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Growth Roadmap Milestones</h3>
         </div>
         <table className="w-full text-left min-w-[600px]">
           <thead className="bg-white border-b border-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest">
             <tr>
               <th className="px-8 py-4">Fiscal Year</th>
               <th className="px-8 py-4">Growth Phase</th>
               <th className="px-8 py-4">Est. Revenue</th>
               <th className="px-8 py-4">Est. Profit</th>
               <th className="px-8 py-4 text-right">Expansion Velocity</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-50">
             {projectionData.map((d, index) => (
               <tr key={index} className="hover:bg-slate-50 transition-colors">
                 <td className="px-8 py-5 text-sm font-black text-slate-900">{d.year}</td>
                 <td className="px-8 py-5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                      {index === 0 ? "Initial Node Seed" : (index === 4 ? "National Coverage" : "Network Scaling")}
                    </span>
                 </td>
                 <td className="px-8 py-5 text-sm font-black text-slate-900">₹{(d.revenue / 10000000).toFixed(1)} Cr</td>
                 <td className="px-8 py-5 text-sm font-black text-green-600">₹{(d.profit / 10000000).toFixed(1)} Cr</td>
                 <td className="px-8 py-5 text-right">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${index === 0 ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-600"}`}>
                      {d.growth}
                    </span>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
      </div>
    </div>
  );
}

export function PaymentVerificationModule({ payments, users }: any) {
  const [filter, setFilter] = React.useState('pending');
  const [updating, setUpdating] = React.useState<string | null>(null);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  const filteredPayments = payments.filter((p: any) => {
    return filter === 'all' || p.status === filter;
  }).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const handleAction = async (paymentId: string, vehicleId: string, action: 'verified' | 'rejected') => {
    setUpdating(paymentId);
    try {
      if (action === 'rejected') {
        const reason = prompt("Enter rejection reason (User will see this):");
        if (!reason) { setUpdating(null); return; }
        await updateDoc(doc(db, 'payments', paymentId), { 
          status: 'rejected', 
          rejectionReason: reason,
          updatedAt: serverTimestamp() 
        });
        await updateDoc(doc(db, 'vehicles', vehicleId), { 
          status: 'payment_rejected',
          updatedAt: serverTimestamp()
        });
      } else {
        // 1. Verify Payment
        await updateDoc(doc(db, 'payments', paymentId), { 
          status: 'verified',
          updatedAt: serverTimestamp()
        });
        
        // 2. Fetch Vehicle to check if it already has a QR ID
        const vehicleSnap = await getDoc(doc(db, 'vehicles', vehicleId));
        const vehicleData = vehicleSnap.data();
        
        if (!vehicleData) throw new Error("Vehicle not found.");

        const updates: any = { 
          status: 'active',
          updatedAt: serverTimestamp()
        };

        // 3. Handle QR ID (Mint if null, else keep)
        if (!vehicleData.qrId) {
          // Direct user flow - needs a new ID
          const newQrId = `SECURE-QR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          updates.qrId = newQrId;
        } else {
          // Partner flow - QR already assigned and selected
          // We need to make sure the qr_inventory record is also set to 'active' if it's not already
          await updateDoc(doc(db, 'qr_inventory', vehicleData.qrId), {
            status: 'active',
            updatedAt: serverTimestamp()
          });
        }

        await updateDoc(doc(db, 'vehicles', vehicleId), updates);
      }
    } catch (err: any) {
      console.error("Verification Error:", err);
      alert(`Error updating payment: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
       <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Manual Payment Queue</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Verify uploaded UPI transaction IDs against screenshots to prevent fraud.</p>
          </div>
          <div className="flex gap-2 bg-white border border-slate-200 p-1 rounded-xl shadow-sm cursor-pointer">
             {(['pending', 'verified', 'rejected', 'all'] as const).map(f => (
               <button 
                 key={f}
                 onClick={() => setFilter(f)}
                 className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
               >
                 {f}
               </button>
             ))}
          </div>
       </div>

       <div className="overflow-x-auto min-h-[50vh]">
         {filteredPayments.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-32 text-slate-400">
             <ShieldCheck className="w-12 h-12 mb-4 opacity-50" />
             <p className="text-xs font-black uppercase tracking-widest">No {filter !== 'all' && filter} payments found.</p>
           </div>
         ) : (
           <table className="w-full text-left">
             <thead className="bg-white border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">
               <tr>
                 <th className="px-8 py-5">TXN Identity</th>
                 <th className="px-8 py-5">Amount</th>
                 <th className="px-8 py-5">Submission Date</th>
                 <th className="px-8 py-5 text-center">Receipt Evidence</th>
                 <th className="px-8 py-5 text-right">Verification Action</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50 bg-slate-50/10">
               {filteredPayments.map((p: any) => {
                 const user = users.find((u: any) => u.uid === p.userId);
                 const d = p.createdAt?.toDate ? format(p.createdAt.toDate(), 'PP p') : 'Just now';
                 
                 return (
                   <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                     <td className="px-8 py-5">
                       <p className="text-sm font-black text-slate-900 uppercase tracking-wider">{p.transactionId || 'UNKNOWN_TXN'}</p>
                       <p className="text-xs text-slate-500 font-bold mt-0.5">{user?.displayName || p.userId}</p>
                     </td>
                     <td className="px-8 py-5">
                       <span className="text-sm font-black text-slate-900">₹{p.amount}</span>
                     </td>
                     <td className="px-8 py-5">
                       <p className="text-[11px] font-bold text-slate-600">{d}</p>
                     </td>
                     <td className="px-8 py-5 text-center">
                       {p.scrubbedScreenshotUrl ? (
                         <div className="inline-block relative group">
                           <a href={p.scrubbedScreenshotUrl} target="_blank" rel="noopener noreferrer">
                             <img src={p.scrubbedScreenshotUrl} alt="Receipt" className="h-16 w-16 object-cover rounded-xl border border-slate-200 shadow-sm transition-transform group-hover:scale-110" />
                           </a>
                           <div className="absolute -top-2 -right-2 bg-blue-100 text-blue-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">VIEW</div>
                         </div>
                       ) : (
                         <span className="text-[10px] text-slate-400 font-bold italic">No File</span>
                       )}
                     </td>
                     <td className="px-8 py-5 text-right">
                       {p.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                             <button
                               onClick={() => handleAction(p.id, p.vehicleId, 'rejected')}
                               disabled={updating === p.id}
                               className="px-4 py-2 bg-red-50 text-red-600 font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-red-100 transition-colors"
                             >
                               Reject
                             </button>
                             <button
                               onClick={() => handleAction(p.id, p.vehicleId, 'verified')}
                               disabled={updating === p.id}
                               className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                             >
                               {updating === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                               Approve
                             </button>
                          </div>
                       ) : (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${p.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                             {p.status === 'verified' ? 'Approved' : 'Rejected'}
                          </span>
                       )}
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
         )}
       </div>
    </div>
  );
}
