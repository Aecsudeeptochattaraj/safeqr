import { Link } from 'react-router-dom';
import { Shield, Phone, MessageCircle, AlertCircle, QrCode, ArrowRight, Zap, Globe, Lock, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';

const FeatureBubble = ({ icon: Icon, title, className = "" }: { icon: any, title: string, className?: string }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.8 }}
    whileInView={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", stiffness: 100 }}
    className={`absolute glass-panel px-6 py-4 rounded-full flex items-center gap-3 whitespace-nowrap z-20 ${className}`}
  >
    <div className="bg-blue-600 p-2 rounded-full">
      <Icon className="w-4 h-4 text-white" />
    </div>
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{title}</span>
  </motion.div>
);

export default function Landing() {
  return (
    <div className="bg-paper overflow-hidden">
      {/* Hero Section - Split Layout Editorial */}
      <section className="relative min-h-[90vh] flex flex-col lg:flex-row border-b border-line">
        {/* Left Pane - Typography focus */}
        <div className="flex-1 p-8 lg:p-24 flex flex-col justify-center relative overflow-hidden bg-white">
          <div className="absolute top-12 left-12 nav-rail hidden lg:block">System // v2.0</div>
          
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 mb-8 group cursor-default">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-blue-600 transition-colors">Global Safety Network</span>
            </div>
            
            <h1 className="text-7xl lg:text-[140px] font-black leading-[0.82] uppercase mb-12 tracking-tighter text-slate-900">
              MYPARK<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 italic font-medium -ml-2">SAATHI.</span>
            </h1>
            
            <p className="text-xl text-slate-500 mb-12 max-w-md leading-relaxed font-medium">
              Elite vehicle security through encrypted QR nodes. Stay accessible without exposing personal identity.
            </p>
            
            <div className="flex flex-wrap gap-6 items-center">
              <Link
                to="/register-vehicle"
                className="group relative inline-flex items-center justify-center px-10 py-5 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-2xl hover:scale-105 active:scale-95"
              >
                Onboard Vehicle
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={() => window.dispatchEvent(new Event('beforeinstallprompt_custom_trigger'))}
                className="flex items-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-blue-600 transition-colors">
                  <Smartphone className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900">Install App</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Right Pane - Visual focus */}
        <div className="flex-1 bg-slate-50 relative min-h-[500px] lg:min-h-full border-l border-line flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.2, ease: "circOut" }}
            className="relative w-full max-w-md p-6"
          >
            <FeatureBubble icon={Zap} title="Instant Alerts" className="-top-10 -left-10 rotate-[-8deg]" />
            <FeatureBubble icon={Lock} title="Privacy Shield" className="top-1/4 -right-16 rotate-[4deg]" />
            <FeatureBubble icon={Globe} title="Cloud Node" className="bottom-10 left-10 rotate-[-4deg]" />
            
            <div className="relative bg-white p-3 rounded-[32px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] border border-white">
              <img 
                src="https://picsum.photos/seed/vehicle-qr/800/1000" 
                alt="Product Mockup"
                className="w-full h-auto rounded-[24px] object-cover"
                referrerPolicy="no-referrer"
              />
              {/* Floating ID Card */}
              <div className="absolute -bottom-8 -right-8 glass-panel p-6 rounded-3xl border border-white/50 animate-bounce">
                <div className="flex gap-4 items-center">
                   <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
                     <QrCode className="w-6 h-6 text-blue-500" />
                   </div>
                   <div>
                     <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Active Node</p>
                     <p className="text-xs font-black text-slate-900 uppercase">VH-9928-X</p>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Grid Features - Systematic Layout */}
      <section className="py-32 border-b border-line">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-24 gap-8">
            <div className="max-w-xl">
              <p className="text-blue-600 text-[11px] font-black uppercase tracking-[0.4em] mb-4">Core Infrastructure</p>
              <h2 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[0.9] tracking-tighter uppercase transition-all duration-700">
                Engineered for <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500">Unfailing Security.</span>
              </h2>
            </div>
            <p className="text-slate-500 max-w-xs font-medium text-lg leading-snug">
              Every connection is routed through our secure gateway, ensuring 100% anonymized communication between users and responders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-12">
            {[
              { icon: Phone, title: "Ghost Calls", desc: "Connect with owners via our proxy network. Your real number stays hidden, always." },
              { icon: MessageCircle, title: "Deep Sync", desc: "Automated WhatsApp coordination for parking, minor collisions, or security updates." },
              { icon: AlertCircle, title: "SOS Vector", desc: "Scanners can transmit GPS-tagged emergency reports including high-res image documentation." },
              { icon: QrCode, title: "Vector QR", desc: "Generate high-precision vector QR codes optimized for transparent physical application." },
              { icon: Shield, title: "Ratchet Protocol", desc: "Advanced rate-limiting and neural filters block spam and malicious interactions instantly." },
              { icon: Zap, title: "Low Latency", desc: "Built on Global Edge Nodes for near-instant message delivery anywhere in the safety grid." }
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group"
              >
                <div className="mb-8 relative">
                   <div className="absolute -inset-2 bg-blue-100 rounded-2xl opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100" />
                   <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all relative z-10">
                     <f.icon className="w-6 h-6" />
                   </div>
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Gated Communities Section - Urban Solutions */}
      <section className="py-32 bg-slate-50 border-b border-line">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-20 items-center">
            <div className="flex-1 space-y-10">
              <div>
                <p className="text-blue-600 text-[11px] font-black uppercase tracking-[0.4em] mb-4">Ecosystem Focus</p>
                <h2 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[0.9] tracking-tighter uppercase">
                  Tailored for <br />Gated Communities.
                </h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {[
                  { title: "Wrong Slot Alerts", desc: "Private resident-to-resident parking notifications without guard drama." },
                  { title: "Delivery Blockage", desc: "Instantly alert courier vans blocking your exit path in narrow lanes." },
                  { title: "Pet/Child Safety", desc: "Emergency alerts if pets are spotted near your vehicle in common zones." },
                  { title: "Maintenance Sync", desc: "Washers and technical staff can notify owners before moving cars." }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                      <Lock className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-black uppercase text-slate-900 tracking-tight">{item.title}</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 relative">
               <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 blur-3xl rounded-[48px]" />
               <div className="relative bg-white rounded-[40px] p-4 shadow-2xl border border-slate-200">
                  <img 
                    src="https://images.unsplash.com/photo-1545127398-14699f92334b?q=80&w=2670&auto=format&fit=crop" 
                    alt="Apartment Parking" 
                    className="w-full h-[400px] object-cover rounded-[32px]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-10 -right-10 bg-slate-900 text-white p-8 rounded-3xl max-w-xs shadow-2xl hidden md:block border border-slate-700">
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2">Apartment Admin View</p>
                     <p className="text-sm font-bold leading-relaxed italic opacity-80">
                       "Since deploying MyParkSaathi, our security gate calls have decreased by 40% as residents resolve parking issues privately."
                     </p>
                     <div className="mt-4 flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-slate-700" />
                        <span className="text-[9px] font-black uppercase text-slate-300">Society Management Commitee</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Prestige Theme */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-900 rounded-[48px] p-12 lg:p-32 relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_50%)]" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-30" />
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="relative z-10"
            >
              <h2 className="text-5xl lg:text-[80px] font-black text-white leading-[0.85] uppercase tracking-tighter mb-12">
                Join the <br /><span className="text-blue-500">Global Mesh.</span>
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                 <Link to="/register-vehicle" className="px-12 py-5 bg-white text-slate-900 rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-2xl">
                    Deploy QR Node
                 </Link>
                 <Link to="/login" className="px-12 py-5 border border-white/20 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                    Partner Terminal
                 </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                 {[
                   { val: "99.9%", label: "Uptime Rate" },
                   { val: "2s", label: "Relay Delay" },
                   { val: "100%", label: "Encrypted" },
                   { val: "24/7", label: "Monitoring" }
                 ].map((s, i) => (
                   <div key={i} className="text-center">
                      <p className="text-2xl font-black text-white">{s.val}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">{s.label}</p>
                   </div>
                 ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
