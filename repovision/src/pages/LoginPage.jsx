import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, User, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import ThreeBackground from '../components/layout/ThreeBackground';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await login(username, password);
            navigate('/agent');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            <ThreeBackground />

            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="mb-8 text-center">
                    <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
                        <Sparkles className="text-indigo-400 w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                        Welcome Back
                    </h1>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Access Mission Control</p>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 ml-1">Username</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-indigo-400 transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-11 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                                    placeholder="Enter your username"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 ml-1">Password</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-indigo-400 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold animate-in zoom-in duration-300">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full relative group/btn overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 group-hover/btn:scale-105 transition-transform duration-500"></div>
                            <div className="relative py-4 rounded-2xl flex justify-center items-center gap-2 text-white font-black text-sm uppercase tracking-widest shadow-xl">
                                {isLoading ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <>
                                        Authenticate <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-slate-500 text-xs font-medium">
                            First time here? <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-bold ml-1">Initialize Account</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
