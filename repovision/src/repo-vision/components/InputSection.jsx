import { Badge } from './Badge';
import { Search, Zap } from 'lucide-react';

const InputSection = ({
    repoUrl,
    isLoading,
    error,
    setRepoUrl,
    onAnalyze,
    onTryDemo,
}) => {
    return (
        <section className="relative">
            <div className="relative z-10">
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                    <div className="relative flex-grow group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-sky-400 transition-colors" />
                        <input
                            type="text"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !isLoading && onAnalyze()}
                            placeholder="https://github.com/OWNER/REPO"
                            className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/40 transition-all duration-300"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            className="flex-1 md:w-auto rounded-xl px-10 py-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold shadow-lg shadow-sky-500/20 transition-all duration-300 active:scale-95 whitespace-nowrap border-none cursor-pointer flex items-center justify-center gap-2"
                            disabled={isLoading}
                            onClick={onAnalyze}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Zap className="w-4 h-4 fill-white" />
                            )}
                            {isLoading ? "Analyzing..." : "Analyze Repo"}
                        </button>
                        <button
                            className="flex-1 md:w-auto rounded-xl px-10 py-4 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-all duration-300 font-bold whitespace-nowrap cursor-pointer border-none"
                            disabled={isLoading}
                            onClick={onTryDemo}
                        >
                            Test Demo
                        </button>
                    </div>
                </div>
                
                <div className="mt-8 flex flex-wrap gap-3">
                    <Badge variant="blue">Supports GitHub HTTPS/SSH</Badge>
                    <Badge variant="sky">Deep Neural indexing</Badge>
                    <Badge variant="indigo">3D Topology Mapping</Badge>
                </div>

                {error && (
                    <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold tracking-wide uppercase backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                        {error}
                    </div>
                )}
            </div>
        </section>
    );
};

export default InputSection;
