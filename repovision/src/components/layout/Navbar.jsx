import { Eye, LogOut, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavigationControls from './NavigationControls';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getUserInitials = () => {
        if (!user?.username) return 'AI';
        return user.username.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <header className="relative z-10 flex justify-between items-center px-8 py-6">
            <div className="flex items-center gap-6">
                <Link to="/" className="flex items-center gap-3 no-underline group">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-300"></div>
                        <div className="relative w-10 h-10 bg-slate-900 border border-white/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Eye className="w-6 h-6 text-purple-400 group-hover:text-white transition-colors" />
                        </div>
                    </div>
                    <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent group-hover:from-purple-400 group-hover:to-pink-400 transition-all duration-300">
                        RepoVisionAI-FX
                    </span>
                </Link>

                <NavigationControls />
            </div>

            <nav className="flex items-center gap-10">
                <div className="hidden md:flex items-center gap-8">
                    <Link
                        to="/incidents"
                        className="text-amber-300/80 font-bold hover:text-white transition duration-300 flex items-center gap-2 group relative uppercase tracking-widest text-[10px]"
                    >
                        <span className="relative z-10">Incidents Panel</span>
                        <span className="absolute bottom-[-4px] left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400 group-hover:w-full transition-all duration-300"></span>
                    </Link>
                    <Link
                        to="/agent"
                        className="text-purple-300/80 font-bold hover:text-white transition duration-300 flex items-center gap-2 group relative uppercase tracking-widest text-[10px]"
                    >
                        <span className="relative z-10">Mission Control</span>
                        <span className="absolute bottom-[-4px] left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 group-hover:w-full transition-all duration-300"></span>
                    </Link>
                </div>
                
                {user ? (
                    <div className="relative ml-4">
                        <button 
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full bg-slate-900/50 border border-white/10 hover:border-white/20 transition-all group"
                        >
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 hidden sm:block">{user.username}</span>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-indigo-500/20 border border-white/10 group-hover:scale-105 transition-transform">
                                {getUserInitials()}
                            </div>
                            <ChevronDown size={14} className={`text-slate-500 mr-1 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showDropdown && (
                            <div className="absolute right-0 mt-3 w-56 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="px-5 py-3 border-b border-white/5 mb-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Authorized Agent</p>
                                    <p className="text-sm font-bold text-white truncate">{user.username}</p>
                                </div>
                                <button 
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors font-bold"
                                >
                                    <LogOut className="w-4 h-4" /> Sign Out from System
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link
                        to="/login"
                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95"
                    >
                        Login
                    </Link>
                )}
            </nav>
        </header>
    );
};

export default Navbar;
