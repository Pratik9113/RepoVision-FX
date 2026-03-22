import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  LogOut, 
  Activity,
  Shield,
  LayoutDashboard
} from 'lucide-react';
import IncidentsList from './IncidentsList';
import { useAuth } from '../context/AuthContext';

export default function IncidentsDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleIncidentClick = (id) => {
     navigate(`/agent?id=${id}`);
  };

  const getUserInitials = () => {
    if (!user?.username) return 'AI';
    return user.username.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-display { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #06060c; color: #f4f3ff; margin: 0; }

        .grid-bg::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
          z-index: 0;
        }

        .hero-glow {
          position: absolute;
          width: 800px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%);
          top: -100px; left: 50%;
          transform: translateX(-50%);
          pointer-events: none;
          z-index: 0;
        }

        .brand-glow { box-shadow: 0 0 18px rgba(56,189,248,0.4); }
        
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.2); border-radius: 3px; }

        @keyframes blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        .blink { animation: blink 2s ease-in-out infinite; }
      `}</style>

      <div className="grid-bg min-h-screen bg-[#06060c] text-[#f4f3ff] relative overflow-x-hidden flex flex-col">
        <div className="hero-glow" />

        {/* Global Nav */}
        <nav className={`fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-10 z-50 transition-all duration-300 ${scrolled ? "border-b border-white/[0.09]" : "border-b border-white/[0.06]"} bg-[#06060c]/75 backdrop-blur-xl`}>
          <a href="/" className="flex items-center gap-2.5 font-display text-[18px] font-extrabold tracking-tight text-[#f4f3ff] no-underline">
            <div className="w-[34px] h-[34px] rounded-[9px] bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-base brand-glow">🔭</div>
            RepoVisionAI-FX
          </a>

          <ul className="flex items-center gap-8 list-none m-0 p-0 hidden md:flex">
            <li><a href="/agent" className="text-[13.5px] font-medium text-white/45 hover:text-white no-underline transition-colors">Agent Dashboard</a></li>
            <li><a href="/3d" className="text-[13.5px] font-medium text-white/45 hover:text-white no-underline transition-colors">3D Explorer</a></li>
            <li><a href="/incidents" className="text-[13.5px] font-medium text-white no-underline transition-colors border-b-2 border-sky-500 pb-1">Incidents Feed</a></li>
            <li><a href="#" className="text-[13.5px] font-medium text-white/45 hover:text-white no-underline transition-colors">Docs</a></li>
          </ul>

          <div className="flex items-center gap-4">
             <div className="relative">
                <div 
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-[11px] cursor-pointer hover:scale-105 transition-transform brand-glow"
                >
                    {getUserInitials()}
                </div>
                
                {showProfileMenu && (
                    <div className="absolute right-0 mt-3 w-48 bg-[#0e0e1a]/90 backdrop-blur-xl border border-white/[0.07] rounded-xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in duration-200">
                        <div className="px-4 py-2 border-b border-white/[0.07] mb-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-sky-400">Current Agent</p>
                            <p className="text-sm font-bold text-white truncate">{user?.username || 'Guest'}</p>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors font-medium text-left border-none bg-transparent cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </div>
                )}
            </div>
          </div>
        </nav>

        {/* Full Page Content */}
        <main className="relative z-10 pt-28 pb-10 px-10 w-full flex flex-col flex-grow">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-sky-500/30 bg-sky-500/[0.08] font-mono text-[9px] text-sky-400 tracking-widest uppercase mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)] blink" />
                        System Feed
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter leading-tight">
                        Incident <span className="text-sky-500">Intelligence.</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                   <button 
                      onClick={() => navigate('/agent')}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[13px] font-bold no-underline transition-all active:scale-95 shadow-[0_0_20px_rgba(14,165,233,0.3)] border-none cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> New Resolution
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               {[
                 { label: "Active Analyzers", value: "4", icon: <Activity className="w-4 h-4 text-sky-400" /> },
                 { label: "Total Resolved", value: "1,240", icon: <Shield className="w-4 h-4 text-purple-400" /> },
                 { label: "Mean Time to Fix", value: "4.2m", icon: <LayoutDashboard className="w-4 h-4 text-cyan-400" /> }
               ].map((stat, i) => (
                 <div key={i} className="bg-[#0e0e1a]/40 border border-white/[0.07] rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1 font-bold">{stat.label}</p>
                        <p className="text-xl font-black text-white">{stat.value}</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                        {stat.icon}
                    </div>
                 </div>
               ))}
            </div>

            <div className="flex-grow flex flex-col">
                <div className="bg-[#0e0e1a]/60 backdrop-blur-xl border border-white/[0.07] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.5)] flex flex-col flex-grow min-h-[500px]">
                    <IncidentsList onSelectIncident={handleIncidentClick} />
                </div>
            </div>

            <div className="text-center py-6 text-white/[0.01] font-display text-[100px] font-black tracking-tighter select-none leading-none mt-auto">
                REPOVISIONAI-FX
            </div>
        </main>
      </div>
    </>
  );
}
