import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Vehicle, QRInventory } from '../../types';
import { Coins, Plus, Users, Package, QrCode, Download, Loader2, Car, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { QRCodeCanvas } from 'qrcode.react';
import JSZip from 'jszip';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function StatTile({ label, value, color = "bg-blue-600" }: { label: string, value: string | number, color?: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-6 hover:border-blue-500 transition-colors">
      <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center text-white shadow-sm shrink-0`}>
        <Package className="w-7 h-7" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-500 mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function PartnerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ mappedVehicles: 0, earnings: 0, totalStock: 0, availableStock: 0 });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [myStock, setMyStock] = useState<QRInventory[]>([]);
  const [isZipping, setIsZipping] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === myStock.filter(s => s.status === 'available').length) setSelectedIds([]);
    else setSelectedIds(myStock.filter(s => s.status === 'available').map(i => i.id));
  };

  const executePrint = () => {
    if (selectedIds.length === 0) {
      console.warn("Print skipped: Select nodes to print first.");
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const brand = "SAFE-TAG";
    const cardsHtml = selectedIds.map(id => {
      const canvas = document.getElementById(`qr-src-${id}`)?.querySelector('canvas');
      const dataUrl = canvas?.toDataURL("image/png");
      return `
        <div style="width: 200px; padding: 20px; border: 1px solid #eee; margin: 10px; display: inline-block; text-align: center; font-family: sans-serif; page-break-inside: avoid; border-radius: 12px; background: #fff;">
          <div style="font-size: 14px; font-weight: 900; letter-spacing: 2px; margin-bottom: 10px;">${brand}</div>
          <img src="${dataUrl}" style="width: 160px; height: 160px; display: block; margin: 0 auto;" />
          <div style="margin-top: 10px; font-family: monospace; font-size: 18px; font-weight: 900; color: #3b82f6;">${id}</div>
          <div style="font-size: 8px; font-weight: bold; color: #94a3b8; margin-top: 5px; text-transform: uppercase;">Ready to Map</div>
        </div>
      `;
    }).join('');
    printWindow.document.write(`
      <html>
        <head><title>Print Stickers - ${brand}</title></head>
        <body style="margin:0; padding: 20px; background: #f8fafc; text-align: center;">
          <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">${cardsHtml}</div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 700); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    if (!user) return;

    const qVehicles = query(collection(db, 'vehicles'), where('partnerUid', '==', user.uid));
    const unsubVehicles = onSnapshot(qVehicles, snap => {
      const allDocs = snap.docs.map(doc => doc.data() as Vehicle);
      // Only show and calculate commission for APPROVED (active) vehicles
      const activeDocs = allDocs.filter(v => v.status === 'active');
      
      setVehicles(activeDocs);
      
      let earnings = 0;
      activeDocs.forEach(v => {
        earnings += v.planId === '5yr' ? 200 : (v.planId === '2yr' ? 100 : 50);
      });
      setStats(prev => ({ ...prev, mappedVehicles: activeDocs.length, earnings }));
    }, (err) => console.error("Vehicles Stream Error:", err));

    const qStock = query(collection(db, 'qr_inventory'), where('partnerUid', '==', user.uid));
    const unsubStock = onSnapshot(qStock, snap => {
      const docs = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as QRInventory));
      setMyStock(docs);
      setStats(prev => ({ 
        ...prev, 
        totalStock: snap.size, 
        availableStock: docs.filter(s => s.status === 'available').length 
      }));
    }, (err) => console.error("Stock Stream Error:", err));

    return () => {
      unsubVehicles();
      unsubStock();
    };
  }, [user]);

  const downloadAllAvailableQRs = async () => {
    const available = myStock.filter(s => s.status === 'available');
    if (available.length === 0) return;
    setIsZipping(true);
    
    try {
      const zip = new JSZip();
      const folder = zip.folder("MY_READY_STICKERS");
      const brand = "SAFE-TAG";
      
      for (const item of available) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        const size = 600;
        const padding = 60;
        const header = 120;
        const footer = 100;

        canvas.width = size + (padding * 2);
        canvas.height = size + header + footer + (padding * 2);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#1E293B';
        ctx.font = 'black 60px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(brand, canvas.width / 2, padding + 70);

        ctx.fillStyle = '#64748B';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText("SMART VEHICLE TAG", canvas.width / 2, padding + 110);

        const qrSrc = document.getElementById(`qr-src-${item.id}`)?.querySelector('canvas');
        if (qrSrc) {
          ctx.drawImage(qrSrc, padding, padding + header, size, size);
        }

        ctx.fillStyle = '#3B82F6';
        ctx.font = '900 45px monospace';
        ctx.fillText(item.id, canvas.width / 2, canvas.height - padding - 20);

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob && folder) {
          folder.file(`${brand}_${item.id}.png`, blob);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `MY_PRINT_READY_STOCK_${Date.now()}.zip`;
      link.click();
    } catch (err) {
      console.error("Batch production error:", err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="max-w-[90rem] mx-auto px-4 sm:px-6 py-12 font-sans bg-[#f8fafc] min-h-screen">
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-10 gap-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-200/50 border border-slate-300/50 mb-4 backdrop-blur-sm shadow-sm">
            <Users className="w-4 h-4 text-slate-700" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-700">Showroom / Partner Node</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Showroom Dashboard
          </h1>
          <p className="text-slate-500 font-medium mt-3 text-base md:text-lg">
            Manage your local inventory and rapidly map customer telemetry.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
           <button 
             onClick={executePrint}
             disabled={selectedIds.length === 0}
             className="flex items-center px-6 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl text-[10.5px] font-black uppercase tracking-[0.15em] hover:bg-slate-50 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:hover:shadow-none shadow-sm"
           >
             <Printer className="w-4 h-4 mr-2" />
             Print ({selectedIds.length})
           </button>
           <button 
             onClick={downloadAllAvailableQRs}
             disabled={isZipping || stats.availableStock === 0}
             className="flex items-center px-6 py-4 bg-blue-600 text-white rounded-2xl text-[10.5px] font-black uppercase tracking-[0.15em] hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all duration-200 disabled:opacity-50 disabled:hover:shadow-none shadow-md"
           >
             {isZipping ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
             Bulk ZIP ({stats.availableStock})
           </button>
           <Link 
             to="/partner/onboard"
             className="flex items-center px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10.5px] font-black uppercase tracking-[0.15em] hover:bg-black hover:shadow-lg hover:shadow-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md"
           >
             <Plus className="w-4 h-4 mr-2" />
             New Map
           </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatTile label="Total Earnings" value={`₹${stats.earnings}`} color="bg-green-600" />
        <StatTile label="Mapped Vehicles" value={stats.mappedVehicles} color="bg-slate-900" />
        <StatTile label="Available QR Stock" value={stats.availableStock} color="bg-blue-600" />
        <StatTile label="Total QR Stock" value={stats.totalStock} color="bg-slate-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
             <div className="px-8 py-6 border-b border-slate-100 bg-slate-50">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Live Registration Ledger</h2>
             </div>
             
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-white text-slate-400 font-black uppercase text-[9px] tracking-[0.2em] border-b border-slate-100">
                      <tr>
                         <th className="px-8 py-5">Vehicle Identity</th>
                         <th className="px-8 py-5">Customer Name</th>
                         <th className="px-8 py-5">Plan Selected</th>
                         <th className="px-8 py-5 text-right">Yield</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {vehicles.map((v, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6 font-black font-mono text-slate-900 text-lg tracking-tighter">{v.vehicleNumber}</td>
                          <td className="px-8 py-6 text-slate-600 font-bold uppercase text-[11px]">{v.ownerName}</td>
                          <td className="px-8 py-6">
                            <span className={cn(
                               "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                               v.planId === '5yr' ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"
                            )}>
                               {v.planId === '5yr' ? '5 Years' : (v.planId === '2yr' ? '2 Years' : '1 Year')}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right font-black text-green-600 text-lg">
                             ₹{v.planId === '5yr' ? 200 : (v.planId === '2yr' ? 100 : 50)}
                          </td>
                        </tr>
                      ))}
                      {vehicles.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-8 py-16 text-center text-slate-400">
                             <div className="max-w-xs mx-auto">
                                <Car className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest leading-loose">No active registrations detected.</p>
                             </div>
                          </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
             <div className="px-8 py-6 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <input 
                     type="checkbox" 
                     checked={selectedIds.length === myStock.filter(s => s.status === 'available').length && selectedIds.length > 0}
                     onChange={toggleSelectAll}
                     className="w-4 h-4 rounded border-slate-800 bg-slate-800 text-blue-500 mr-2"
                   />
                   <QrCode className="w-5 h-5 text-blue-400" />
                   <h2 className="text-sm font-black uppercase tracking-tighter">Your QR Vault</h2>
                </div>
                <span className="bg-blue-600 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase">Live Stock</span>
             </div>
             
             {/* Hidden QR Source for Canvas Export */}
             <div className="hidden">
               {myStock.filter(s => s.status === 'available').map(item => (
                 <div key={item.id} id={`qr-src-${item.id}`}>
                    <QRCodeCanvas value={`${window.location.origin}/s/${item.id}`} size={600} />
                 </div>
               ))}
             </div>

             <div className="p-4 overflow-y-auto max-h-[600px] bg-slate-50 space-y-4">
                {myStock.map(qr => (
                   <div key={qr.id} className={cn(
                     "flex items-center justify-between p-5 bg-white rounded-2xl border transition-all group",
                     selectedIds.includes(qr.id) ? "border-blue-500 bg-blue-50/30" : "border-slate-200 shadow-sm hover:border-blue-500"
                   )}>
                      <div className="flex items-center gap-4">
                         {qr.status === 'available' && (
                           <input 
                              type="checkbox" 
                              checked={selectedIds.includes(qr.id)}
                              onChange={() => toggleSelect(qr.id)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 mr-1"
                           />
                         )}
                         <div className={cn(
                           "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2",
                           qr.status === 'available' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-100 text-slate-400 border-slate-200"
                         )}>
                           <QrCode className="w-6 h-6" />
                         </div>
                         <div>
                            <p className="text-lg font-black font-mono text-slate-900 tracking-tighter leading-none mb-1">{qr.id}</p>
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-[0.2em]",
                                qr.status === 'available' ? "text-green-600" : "text-slate-400"
                            )}>
                               {qr.status === 'available' ? 'Stock Ready' : 'Active Mapping'}
                            </span>
                         </div>
                      </div>
                      {qr.status === 'available' && (
                        <Link 
                          to="/partner/onboard" 
                          className="px-4 py-2 bg-slate-100 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-600 hover:text-white transition-all transform active:scale-95"
                        >
                           Map Node
                        </Link>
                      )}
                   </div>
                ))}
                {myStock.length === 0 && (
                   <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-100">
                      <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vault Empty</p>
                      <button className="mt-4 text-xs font-bold text-blue-600 hover:underline">Request Stock Expansion</button>
                   </div>
                )}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
