import React from 'react';
import { Badge } from './Badge';

interface InputSectionProps {
    repoUrl: string;
    isLoading: boolean;
    error: string;
    setRepoUrl: (url: string) => void;
    onAnalyze: () => void;
    onTryDemo: () => void;
}

const InputSection: React.FC<InputSectionProps> = ({
    repoUrl,
    isLoading,
    error,
    setRepoUrl,
    onAnalyze,
    onTryDemo
}) => {
    return (
        <section className="relative bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-slate-950/70 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-8 shadow-2xl shadow-purple-900/20 mb-8 overflow-hidden">
            {/* Card gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-pink-900/10 pointer-events-none"></div>

            <div className="relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                    Analyze a Repository
                </h2>
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                    <input
                        type="text"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === "Enter" && !isLoading && onAnalyze()
                        }
                        placeholder="https://github.com/OWNER/REPO or .../tree/BRANCH"
                        className="w-full md:flex-1 rounded-xl bg-slate-950/80 border border-slate-700/50 px-5 py-3.5 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-slate-100 shadow-inner"
                        disabled={isLoading}
                    />
                    <div className="flex gap-3">
                        <button
                            className="flex-1 md:w-auto rounded-xl px-8 py-3.5 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 hover:from-purple-500 hover:via-purple-400 hover:to-pink-400 disabled:opacity-60 text-white font-semibold shadow-lg shadow-purple-500/30 transition-all duration-300 transform hover:scale-105 hover:shadow-purple-500/50 whitespace-nowrap"
                            disabled={isLoading}
                            onClick={onAnalyze}
                        >
                            {isLoading ? "Analyzing..." : "Analyze"}
                        </button>
                        <button
                            className="flex-1 md:w-auto rounded-xl px-8 py-3.5 bg-slate-800/60 hover:bg-slate-700/60 text-slate-100 border border-slate-600/50 hover:border-slate-500/50 transition-all duration-300 font-medium backdrop-blur-sm whitespace-nowrap"
                            disabled={isLoading}
                            onClick={onTryDemo}
                        >
                            Try Demo
                        </button>
                    </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2.5">
                    <Badge>Example: https://github.com/vercel/next.js</Badge>
                    <Badge variant="primary">Supports all public repositories</Badge>
                    <Badge variant="success">AI-powered analysis</Badge>
                </div>

                {error && (
                    <div className="mt-6 p-4 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <strong className="mr-1 font-semibold">Error:</strong> {error}
                    </div>
                )}
            </div>
        </section>
    );
};

export default InputSection;
