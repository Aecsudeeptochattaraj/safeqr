import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, limit, serverTimestamp, writeBatch, doc, where, updateDoc, onSnapshot } from 'firebase/firestore';
import { AppUser, QRInventory } from '../../types';
import { Users, Car, Coins, ShieldCheck, QrCode, Package, Download, UserMinus, Layers, Loader2, Printer, ExternalLink } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { QRCodeCanvas } from 'qrcode.react';

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

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, vehicles: 0, revenue: 0, availableQRs: 0 });
  const [view, setView] = useState<'overview' | 'qr_management' | 'users'>('overview');

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
// ... code ...
      setStats(prev => ({ ...prev, users: snap.size }));
    });
    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), snap => {
      setStats(prev => ({ ...prev, vehicles: snap.size }));
    });
    const unsubQRs = onSnapshot(query(collection(db, 'qr_inventory'), where('status', '==', 'available')), snap => {
      setStats(prev => ({ ...prev, availableQRs: snap.size }));
    });
    const unsubPayments = onSnapshot(collection(db, 'payments'), snap => {
      let revenue = 0;
      snap.forEach(d => { revenue += d.data().amount || 0; });
      setStats(prev => ({ ...prev, revenue }));
    });
    return () => {
      unsubUsers();
      unsubVehicles();
      unsubQRs();
      unsubPayments();
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 font-sans">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Administrator Console</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">System Intelligence</h1>
          <p className="text-slate-500 font-medium mt-2">Global oversight and inventory dispatch control.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {(['overview', 'qr_management', 'users'] as const).map(v => (
            <button 
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              {v.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      {view === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={Users} label="Active Users" value={stats.users} color="bg-slate-900" />
          <StatCard icon={Car} label="Fleet Size" value={stats.vehicles} color="bg-blue-600" />
          <StatCard icon={Coins} label="Net Revenue" value={`₹${stats.revenue}`} color="bg-slate-900" />
          <StatCard icon={Package} label="Vault Stock" value={stats.availableQRs} color="bg-blue-600" />
        </div>
      )}
      {view === 'qr_management' && <QRManagement />}
      {view === 'users' && <UserManagement />}
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
    if (selectedIds.length === items.length) setSelectedIds([]);
    else setSelectedIds(items.map(i => i.id));
  };

  const generateBulkQRs = async () => {
    if (generateAmount <= 0) return;
    setIsGenerating(true);
    try {
      const batch = writeBatch(db);
      for (let i = 0; i < generateAmount; i++) {
        const docId = Math.random().toString(36).substring(2, 10).toUpperCase();
        batch.set(doc(db, 'qr_inventory', docId), {
          id: docId,
          status: 'available',
          createdAt: serverTimestamp(),
          partnerUid: null
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
      if (snap.empty) { alert("Vault empty."); return; }
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.update(d.ref, { partnerUid: selectedPartner });
      });
      await batch.commit();
    } finally {
      setAllocating(false);
    }
  };

  const unassignQR = async (id: string) => {
    try {
      await updateDoc(doc(db, 'qr_inventory', id), { 
        partnerUid: null,
        status: 'available' 
      });
    } catch (err) {
      console.error("Unassign error:", err);
    }
  };

  const executePrint = () => {
    if (selectedIds.length === 0) {
      alert("Select nodes to print first.");
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
          <div style="font-size: 8px; font-weight: bold; color: #94a3b8; margin-top: 5px; text-transform: uppercase;">Scan to connect owner</div>
        </div>
      `;
    }).join('');
    printWindow.document.write(`
      <html>
        <head><title>Print Stickers</title></head>
        <body style="margin:0; padding: 20px; background: #f8fafc; text-align: center;">
          <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">${cardsHtml}</div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 700); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center gap-3 mb-4">
              <QrCode className="w-5 h-5 text-blue-600" />
              <h3 className="text-xl font-black text-slate-900 uppercase">Initialize Batch</h3>
           </div>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">Mint IDs into the ledger.</p>
           <div className="flex gap-4">
              <input type="number" value={generateAmount} onChange={(e) => setGenerateAmount(Number(e.target.value))} className="border-2 border-slate-100 rounded-xl px-4 py-3 font-black w-32 outline-none" />
              <button onClick={generateBulkQRs} disabled={isGenerating} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase flex-1 transition-all">Mint Nodes</button>
           </div>
        </div>
        <div className="bg-slate-900 p-8 rounded-2xl text-white shadow-2xl relative overflow-hidden">
           <div className="flex items-center gap-3 mb-4">
              <Layers className="w-5 h-5 text-blue-400" />
              <h3 className="text-xl font-black text-white uppercase">Dispatch Inventory</h3>
           </div>
           <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-12">Transfer nodes to partners.</p>
           <div className="space-y-4">
              <select value={selectedPartner} onChange={(e) => setSelectedPartner(e.target.value)} className="w-full bg-slate-800 rounded-xl px-4 py-4 text-[10px] font-black text-white outline-none">
                 <option value="">-- Target Showroom --</option>
                 {partners.map(p => <option key={p.uid} value={p.uid}>{p.email}</option>)}
              </select>
              <div className="flex gap-4">
                 <input type="number" value={allocateAmount} onChange={(e) => setAllocateAmount(Number(e.target.value))} className="bg-slate-800 rounded-xl px-4 py-3 text-white text-center w-32 outline-none" />
                 <button onClick={allocateBatch} disabled={!selectedPartner || allocating} className="bg-white text-slate-900 px-6 py-3 rounded-xl text-[10px] font-black uppercase flex-1 uppercase">Dispatch</button>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
                <input type="checkbox" checked={selectedIds.length === items.length && items.length > 0} onChange={toggleSelectAll} className="w-5 h-5 border-slate-300 text-blue-600 cursor-pointer" />
                <h3 className="text-sm font-black text-slate-900 uppercase">Ledger Room</h3>
            </div>
            <button onClick={executePrint} disabled={selectedIds.length === 0} className="px-8 py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl shadow-blue-100 hover:scale-105 active:scale-95 transition-all">
               <Printer className="w-4 h-4 mr-2 inline" /> Print Selected ({selectedIds.length})
            </button>
        </div>
        <div className="hidden">
           {items.map(item => (
             <div key={item.id} id={`qr-src-${item.id}`}>
                <QRCodeCanvas value={`${window.location.origin}/s/${item.id}`} size={600} />
             </div>
           ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
             <thead className="bg-white text-slate-400 font-black uppercase text-[9px] tracking-widest border-b border-slate-100">
               <tr>
                 <th className="px-8 py-5 w-10 text-center">Select</th>
                 <th className="px-8 py-5">Node Identity</th>
                 <th className="px-8 py-5">State</th>
                 <th className="px-8 py-5">Showroom</th>
                 <th className="px-8 py-5 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {items.map(item => (
                 <tr key={item.id} className={cn("transition-colors group", selectedIds.includes(item.id) ? "bg-blue-50/50" : "hover:bg-slate-50/50")}>
                   <td className="px-8 py-6 text-center">
                      <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="w-5 h-5 border-slate-300 text-blue-600 cursor-pointer" />
                   </td>
                   <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 border border-slate-200 rounded flex items-center justify-center p-1 bg-white">
                            <QRCodeCanvas value={`${window.location.origin}/s/${item.id}`} size={32} />
                         </div>
                         <p className="text-lg font-black font-mono text-slate-900">{item.id}</p>
                      </div>
                   </td>
                   <td className="px-8 py-6">
                     <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase", item.status === 'available' ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-700")}>{item.status}</span>
                   </td>
                   <td className="px-8 py-6">
                      <span className="font-bold text-slate-600 text-[10px] uppercase">{item.partnerUid ? partners.find(p => p.uid === item.partnerUid)?.email : 'Vault'}</span>
                   </td>
                   <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {item.partnerUid && item.status === 'available' && (
                          <button onClick={() => unassignQR(item.id)} className="p-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"><UserMinus className="w-4 h-4" /></button>
                        )}
                        {item.status === 'assigned' && (
                           <a href={`/s/${item.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase hover:scale-105 transition-all"><ExternalLink className="w-3 h-3" /> View Profile</a>
                        )}
                        {!item.partnerUid && <span className="text-[9px] font-black text-slate-300 uppercase">Master</span>}
                      </div>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    const q = query(collection(db, 'users'), limit(50));
// ... code ...
    const unsub = onSnapshot(q, snap => {
      setUsers(snap.docs.map(d => ({ ...d.data(), uid: d.id } as AppUser)).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
    return () => unsub();
  }, []);
  const updateRole = async (uid: string, newRole: string) => {
    try { await updateDoc(doc(db, 'users', uid), { role: newRole }); } catch (err) {}
  };
  const filtered = users.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase()));
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
       <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-6">
          <h3 className="text-sm font-black text-slate-900 uppercase">Identity Management</h3>
          <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-80 bg-white border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none focus:border-blue-500" />
       </div>
       <table className="w-full text-left text-sm">
          <thead className="bg-white text-slate-400 font-black uppercase text-[9px] tracking-widest border-b border-slate-100">
             <tr><th className="px-8 py-5">Email</th><th className="px-8 py-5">Name</th><th className="px-8 py-5 text-right">Role</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
             {filtered.map(u => (
               <tr key={u.uid} className="hover:bg-slate-50/50">
                 <td className="px-8 py-6 font-black text-slate-900">{u.email}</td>
                 <td className="px-8 py-6 text-slate-500 font-bold uppercase text-[10px]">{u.displayName || 'Entity'}</td>
                 <td className="px-8 py-6 text-right">
                    <select value={u.role} onChange={(e) => updateRole(u.uid, e.target.value)} className={cn("bg-white border rounded px-3 py-1.5 text-[9px] font-black uppercase", u.role === 'admin' ? "border-slate-900 text-slate-900" : "border-blue-600 text-blue-600")}>
                       <option value="user">User</option><option value="partner">Partner</option><option value="admin">Admin</option>
                    </select>
                 </td>
               </tr>
             ))}
          </tbody>
       </table>
    </div>
  );
}
