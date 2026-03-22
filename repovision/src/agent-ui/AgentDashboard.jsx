import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
    LogOut, 
    Activity, 
    Terminal, 
    Zap, 
    BarChart3, 
    Bell, 
    ShieldAlert, 
    Settings,
    LayoutDashboard,
    Telescope
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import IncidentForm from './IncidentForm';

export default function AgentDashboard() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [searchParams] = useSearchParams();
    const idParam = searchParams.get('id');
    const [selectedIncidentId, setSelectedIncidentId] = useState(idParam);
    const [scrolled, setScrolled] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [activeSection, setActiveSection] = useState('fixer');

    useEffect(() => {
        if (idParam) {
            setSelectedIncidentId(idParam);
        }
    }, [idParam]);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const getUserInitials = () => {
        if (!user?.username) return 'AI';
        return user.username.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const sidebarItems = [
        { id: 'fixer', label: 'AI Fixer', icon: <Zap size={18} /> },
        { id: 'alerts', label: 'Alert Signals', icon: <Bell size={18} /> },
        { id: 'logs', label: 'System Logs', icon: <Terminal size={18} /> },
        { id: 'monitor', label: 'Cloud Monitor', icon: <BarChart3 size={18} /> },
        { id: 'security', label: 'Security', icon: <ShieldAlert size={18} /> },
    ];

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
                        linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
                    background-size: 48px 48px;
                    pointer-events: none;
                    z-index: 0;
                }

                .hero-glow {
                    position: absolute;
                    width: 100%; height: 100vh;
                    background: radial-gradient(circle at 20% 30%, rgba(56,189,248,0.04) 0%, transparent 50%),
                                radial-gradient(circle at 80% 70%, rgba(168,85,247,0.04) 0%, transparent 50%);
                    top: 0; left: 0;
                    pointer-events: none;
                    z-index: 0;
                }

                .brand-glow { box-shadow: 0 0 18px rgba(56,189,248,0.4); }
                
                @keyframes blink {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.75); }
                }
                .blink { animation: blink 2s ease-in-out infinite; }

                .glass-card {
                    background: rgba(14, 14, 26, 0.6);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.07);
                }
            `}</style>

            <div className="grid-bg min-h-screen bg-[#06060c] text-[#f4f3ff] relative flex flex-col">
                <div className="hero-glow" />

                {/* Navbar */}
                <nav className={`fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-8 z-50 transition-all duration-300 ${scrolled ? "border-b border-white/[0.09]" : "border-b border-white/[0.06]"} bg-[#06060c]/75 backdrop-blur-xl`}>
                    <a href="/" className="flex items-center gap-2.5 font-display text-[18px] font-extrabold tracking-tight text-[#f4f3ff] no-underline">
                        <div className="w-[34px] h-[34px] rounded-[9px] bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-base brand-glow">🔭</div>
                        RepoVisionAI-FX
                    </a>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div 
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-[11px] cursor-pointer hover:scale-105 transition-transform brand-glow"
                            >
                                {getUserInitials()}
                            </div>
                            
                            {showProfileMenu && (
                                <div className="absolute right-0 mt-3 w-48 bg-[#0e0e1a]/95 backdrop-blur-xl border border-white/[0.07] rounded-xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in duration-200">
                                    <div className="px-4 py-2 border-b border-white/[0.07] mb-1 text-left">
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

                <div className="flex flex-1 pt-16 h-screen overflow-hidden">
                    
                    {/* Left Sidebar */}
                    <aside className="w-64 border-r border-white/5 bg-[#06060c]/50 backdrop-blur-md flex flex-col py-8 px-4 z-40">
                        <div className="px-4 mb-10">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-1">Navigation</p>
                            <h3 className="text-xs font-bold text-white/50 tracking-wider">Mission Tools</h3>
                        </div>

                        <nav className="space-y-1 flex-1">
                            {sidebarItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border-none cursor-pointer ${
                                        activeSection === item.id 
                                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' 
                                        : 'bg-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                                    }`}
                                >
                                    <span className={activeSection === item.id ? 'text-sky-400' : 'text-inherit'}>
                                        {item.icon}
                                    </span>
                                    <span className="text-xs font-bold tracking-wide uppercase">{item.label}</span>
                                    {activeSection === item.id && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                                    )}
                                </button>
                            ))}
                        </nav>

                        <div className="mt-auto px-4 py-4 space-y-4">
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-white/[0.05]">
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Agent Health</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                                        <div className="h-full w-[88%] bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.4)]" />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-sky-400">88%</span>
                                </div>
                            </div>
                            
                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition-all border-none bg-transparent cursor-pointer">
                                <Settings size={18} />
                                <span className="text-xs font-bold tracking-wide uppercase">System Hub</span>
                            </button>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <main className="flex-1 overflow-y-auto relative p-10 custom-scrollbar-dark">
                        
                        {/* Section Header */}
                        <div className="mb-10 text-left">
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-sky-500/30 bg-sky-500/[0.08] font-mono text-[9px] text-sky-400 tracking-widest uppercase mb-4">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)] blink" />
                                {activeSection === 'fixer' ? 'Fixer Mode' : activeSection.toUpperCase()}
                            </div>
                            <h1 className="text-4xl font-black tracking-tighter leading-tight mb-2">
                                {activeSection === 'fixer' ? (
                                    <>Autonomous <span className="text-sky-500">Atomic Resolution.</span></>
                                ) : (
                                    <>System <span className="text-sky-500">{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</span> Terminal.</>
                                )}
                            </h1>
                            <p className="text-white/45 text-sm font-medium max-w-[700px]">
                                {activeSection === 'fixer' 
                                    ? 'Witness the agentic reasoning loop detect, fix, and validate repository anomalies in real-time.' 
                                    : `Deep-dive into the live ${activeSection} signals of your indexing system.`}
                            </p>
                        </div>

                        {activeSection === 'fixer' ? (
                            <div className="glass-card rounded-2xl p-8 relative overflow-hidden min-h-[600px] shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
                                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
                                <IncidentForm prefilledIncidentId={selectedIncidentId} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-40 glass-card rounded-2xl border border-white/5">
                                <Activity className="w-16 h-16 text-white/5 animate-pulse mb-6" />
                                <h3 className="text-xl font-black tracking-tighter text-white/20 uppercase">Streaming {activeSection}...</h3>
                                <p className="text-white/10 text-xs font-bold tracking-[0.2em] mt-2">LINKING NEURAL CHANNELS</p>
                            </div>
                        )}

                        <div className="text-center py-10 text-white/[0.01] font-display text-[100px] font-black tracking-tighter select-none leading-none mt-10">
                            REPOVISIONAI-FX
                        </div>
                    </main>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar-dark::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar-dark::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover {
                    background: rgba(56,189,248,0.2);
                }
            `}} />
        </>
    );
}
