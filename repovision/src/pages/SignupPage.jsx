import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Sparkles, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import ThreeBackground from '../components/layout/ThreeBackground';

export default function SignupPage() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setIsLoading(false);
            return;
        }

        try {
            await signup(formData.username, formData.email, formData.password);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
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
                    <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                        <ShieldCheck className="text-emerald-400 w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                        Join RepoVisionAI-FX
                    </h1>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Initialize System Access</p>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

                    {success ? (
                        <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                                <Sparkles size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-white">Account Initialized</h2>
                            <p className="text-slate-400 text-sm">Redirecting to authentication terminal...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 ml-1">Username</label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-emerald-400 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        name="username"
                                        required
                                        value={formData.username}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all font-mono"
                                        placeholder="Agent name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 ml-1">Email Terminal</label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-emerald-400 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all font-mono"
                                        placeholder="agent@repovision.ai"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 ml-1">Access Key</label>
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 ml-1">Confirm Key</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                                        placeholder="••••••••"
                                    />
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
                                className="w-full relative group/btn overflow-hidden mt-2"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 group-hover/btn:scale-105 transition-transform duration-500"></div>
                                <div className="relative py-4 rounded-2xl flex justify-center items-center gap-2 text-white font-black text-sm uppercase tracking-widest shadow-xl">
                                    {isLoading ? (
                                        <Loader2 className="animate-spin" size={18} />
                                    ) : (
                                        <>
                                            Deploy Profile <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </div>
                            </button>
                        </form>
                    )}

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-slate-500 text-xs font-medium">
                            Already registered? <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-bold ml-1">Access Terminal</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
