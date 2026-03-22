import { useState, useEffect } from 'react';
import {
    Send, AlertCircle, CheckCircle2, Loader2, Copy, FileCode,
    ChevronDown, ChevronUp, Sparkles, Zap, Bug, Code,
    GitPullRequest, Layout, Activity, Search, BrainCircuit
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PIPELINE_STEPS = [
    { id: 1, name: "Clone/Update Repo", icon: <Layout size={18} /> },
    { id: 2, name: "Scan Files", icon: <Search size={18} /> },
    { id: 3, name: "Extract Signals", icon: <Activity size={18} /> },
    { id: 4, name: "Code Search", icon: <Code size={18} /> },
    { id: 5, name: "Function Lookup", icon: <Zap size={18} /> },
    { id: 6, name: "AI Deep Analysis", icon: <BrainCircuit size={18} /> },
    { id: 7, name: "Generate Edits", icon: <Bug size={18} /> },
    { id: 8, name: "GitHub Integration", icon: <GitPullRequest size={18} /> }
];

function EditedFileCard({ edit }) {
    const [showOriginal, setShowOriginal] = useState(false);
    const [showEdited, setShowEdited] = useState(true);
    const [copied, setCopied] = useState(false);

    const copyEdited = () => {
        navigator.clipboard.writeText(edit.edited_content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const originalLines = (edit.original_content || '').split('\n');
    const editedLines = (edit.edited_content || '').split('\n');
    const affected = edit.affected_lines || [];

    return (
        <div className="bg-[#0e0e1a]/40 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-md group hover:border-sky-500/30 transition-all duration-300">
            <div className="flex items-center justify-between px-5 py-4 bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform">
                        <FileCode size={20} />
                    </div>
                    <code className="text-sm text-slate-100 font-mono font-bold truncate">{edit.file}</code>
                </div>
                <button
                    onClick={copyEdited}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white text-xs font-bold transition-all border-none cursor-pointer"
                >
                    <Copy size={14} />
                    {copied ? 'Copied!' : 'Copy Fix'}
                </button>
            </div>
            {edit.change_summary && (
                <div className="px-5 py-3 text-xs text-white/40 border-b border-white/5 italic font-medium">
                    {edit.change_summary}
                </div>
            )}
            <div className="p-4 space-y-3">
                <div className="rounded-xl overflow-hidden border border-white/5">
                    <button
                        type="button"
                        onClick={() => setShowOriginal(!showOriginal)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest border-none cursor-pointer"
                    >
                        <span>Before Change</span>
                        {showOriginal ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showOriginal && (
                        <pre className="p-4 bg-black/40 text-[11px] text-white/60 font-mono overflow-x-auto max-h-64 overflow-y-auto custom-scrollbar-minimal">
                            {originalLines.map((line, i) => (
                                <div key={i} className={`flex ${affected.includes(i + 1) ? 'bg-red-500/10' : ''}`}>
                                    <span className="text-white/20 select-none w-10 border-r border-white/5 mr-3">{i + 1}</span> {line || ' '}
                                </div>
                            ))}
                        </pre>
                    )}
                </div>

                <div className="rounded-xl overflow-hidden border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                    <button
                        type="button"
                        onClick={() => setShowEdited(!showEdited)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border-none cursor-pointer"
                    >
                        <span>AI Proposed Fix</span>
                        {showEdited ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showEdited && (
                        <pre className="p-4 bg-black/40 text-[11px] text-white/90 font-mono overflow-x-auto max-h-80 overflow-y-auto custom-scrollbar-minimal">
                            {editedLines.map((line, i) => (
                                <div key={i} className={`flex ${affected.includes(i + 1) ? 'bg-emerald-500/20' : ''}`}>
                                    <span className="text-emerald-900 select-none w-10 border-r border-emerald-900/30 mr-3">{i + 1}</span>
                                    <span className={affected.includes(i + 1) ? 'font-bold' : ''}>{line || ' '}</span>
                                </div>
                            ))}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function IncidentForm({ prefilledIncidentId }) {
    const [repoUrl, setRepoUrl] = useState('d:\\SYRUS_REPOVISIONAI-FX');
    const [description, setDescription] = useState('');
    const [optionalData, setOptionalData] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (prefilledIncidentId) {
            handlePrefill(prefilledIncidentId);
        }
    }, [prefilledIncidentId]);

    const handlePrefill = async (id) => {
        setError(null);
        try {
            const response = await fetch(`http://localhost:8000/incidents/${id}`);
            if (!response.ok) throw new Error('Failed to fetch incident details');
            const data = await response.json();
            setOptionalData(data);
            const fullDesc = `Title: ${data.title}\n\nDescription: ${data.description}\n\nError Log:\n${data.error_log || 'N/A'}`;
            setDescription(fullDesc);
            setResult(null);
            setCurrentStep(0);
        } catch (err) {
            setError(`Failed to load incident details: ${err.message}`);
        }
    };

    const { token } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) {
            setError("Authentication required. Please login to resolve incidents.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        const stepInterval = setInterval(() => {
            setCurrentStep(prev => prev < 7 ? prev + 1 : prev);
        }, 1500);
        try {
            const response = await fetch('http://localhost:8000/incident', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    repo_url: repoUrl,
                    description,
                    ...optionalData,
                }),
            });
            clearInterval(stepInterval);
            if (response.status === 401) throw new Error("Session expired. Please login again.");
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();
            setResult(data);
            setCurrentStep(8);
        } catch (err) {
            clearInterval(stepInterval);
            setError(err.message === 'Failed to fetch' ? 'Cannot reach backend server.' : err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full space-y-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3">
                        <Zap className="text-sky-400 fill-sky-400 w-8 h-8" />
                        Atomic Resolver
                    </h2>
                    <p className="text-white/40 font-medium text-sm uppercase tracking-[0.2em]">Neural Engine v4.2 // Real-time Repository Healing</p>
                </div>

                {isLoading && (
                    <div className="flex items-center gap-4 bg-sky-500/5 border border-sky-500/20 px-6 py-3 rounded-2xl shadow-[0_0_20px_rgba(14,165,233,0.1)]">
                        <Loader2 className="animate-spin text-sky-400" size={20} />
                        <div className="text-[10px] font-black text-white uppercase tracking-widest">
                            Resolving Anomaly Stage {currentStep}/8
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-1">Target Repository</label>
                            <div className="relative group">
                                <Code className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-sky-400 transition-colors" />
                                <input
                                    type="text"
                                    value={repoUrl}
                                    onChange={(e) => setRepoUrl(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-mono text-xs focus:outline-none focus:border-sky-500/40 focus:ring-4 focus:ring-sky-500/5 transition-all outline-none"
                                    placeholder="Local Path or Git URL"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 space-y-4">
                            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Activity size={14} className="text-sky-400" />
                                Core Status
                            </h4>
                            <div className="space-y-3">
                                {[
                                    { label: "AI Engine", value: "RepoVision-FX-L", color: "text-sky-400" },
                                    { label: "Latency", value: "14ms", color: "text-emerald-400" },
                                    { label: "Autopilot", value: "ENABLED", color: "text-sky-400" }
                                ].map((stat, i) => (
                                    <div key={i} className="flex justify-between text-[11px]">
                                        <span className="text-white/20 font-bold uppercase tracking-wider">{stat.label}</span>
                                        <span className={`${stat.color} font-mono font-black tracking-tighter`}>{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-1">Anomalous Profile</label>
                        <div className="relative group">
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={isLoading}
                                rows="8"
                                className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-3xl text-white/90 placeholder-white/10 focus:outline-none focus:border-sky-500/40 focus:ring-4 focus:ring-sky-500/5 transition-all outline-none font-mono text-xs leading-relaxed resize-none"
                                placeholder="PASTE STACK TRACES, ERROR LOGS, OR BUG TICKETS"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !repoUrl || !description}
                    className="w-full relative group overflow-hidden border-none"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-sky-600 via-blue-700 to-sky-600 bg-[length:200%_auto] animate-gradient-x group-hover:scale-105 transition-transform duration-500"></div>
                    <div className="relative py-5 rounded-2xl flex justify-center items-center gap-4 text-white font-black text-sm uppercase tracking-[0.4em] shadow-2xl shadow-sky-900/20 cursor-pointer">
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Processing Ingestion
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                                Commence Resolution Cycle
                            </>
                        )}
                    </div>
                </button>
            </form>

            {(isLoading || result) && (
                <div className="py-10 border-t border-white/5">
                    <div className="flex flex-wrap justify-between gap-6 relative">
                        <div className="hidden lg:block absolute top-[28px] left-10 right-10 h-px bg-white/5 -z-0"></div>
                        {PIPELINE_STEPS.map((step) => {
                            const isDone = currentStep >= step.id;
                            const isCurrent = currentStep === step.id - 1 && isLoading;
                            return (
                                <div key={step.id} className="relative z-10 flex flex-col items-center flex-1 min-w-[100px] group">
                                    <div className={`
                                        w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 border
                                        ${isDone ? 'bg-sky-600 border-sky-400 text-white shadow-lg shadow-sky-600/30' :
                                            isCurrent ? 'bg-white/10 border-sky-500 text-sky-400 animate-pulse' :
                                                'bg-white/[0.02] border-white/5 text-white/20'}
                                    `}>
                                        {isDone && currentStep > step.id ? <CheckCircle2 size={20} /> : step.icon}
                                    </div>
                                    <span className={`
                                        mt-4 text-[9px] font-black uppercase tracking-widest text-center transition-colors
                                        ${isDone ? 'text-sky-300' : isCurrent ? 'text-sky-400' : 'text-white/20'}
                                    `}>
                                        {step.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex gap-5 items-center animate-in zoom-in duration-300">
                    <AlertCircle size={28} className="text-red-500" />
                    <div>
                        <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest">Protocol Failure</h3>
                        <p className="text-red-300/60 text-[11px] font-bold mt-1 uppercase leading-relaxed">{error}</p>
                    </div>
                </div>
            )}

            {result && result.status === 'success' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-700">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white/[0.02] border border-white/10 rounded-2xl p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                                <BrainCircuit size={100} className="text-sky-500" />
                            </div>
                            <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em] mb-4">Neural Diagnosis</h3>
                            <p className="text-xl font-bold text-white leading-snug">
                                {result.llm_context?.root_cause_analysis?.root_cause || "System anomalies successfully neutralized."}
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-950/40 to-black/20 border border-white/10 rounded-2xl p-8 flex flex-col justify-between">
                            <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em]">Codebase Influx</h3>
                            <div className="py-4">
                                <div className="text-5xl font-black text-white tracking-tighter">{result.edited_files?.length || 0}</div>
                                <div className="text-white/20 text-[10px] font-black uppercase tracking-widest mt-1">Modules Reconstructed</div>
                            </div>
                            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                <div className="bg-sky-500 h-full w-[100%] transition-all duration-1000 shadow-[0_0_8px_rgba(14,165,233,0.5)]" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-px flex-grow bg-white/5"></div>
                            <h2 className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em] whitespace-nowrap">Proposed Atomic Edits</h2>
                            <div className="h-px flex-grow bg-white/5"></div>
                        </div>

                        <div className="grid grid-cols-1 gap-8">
                            {result.edited_files?.map((edit, idx) => (
                                <EditedFileCard key={idx} edit={edit} />
                            ))}
                        </div>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4 text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                            {result.message}
                        </div>
                        {result.github_integration?.pr_url && (
                            <a
                                href={result.github_integration.pr_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-8 py-3 bg-white text-black font-black rounded-xl hover:bg-white/90 transition-all flex items-center gap-3 text-xs uppercase tracking-widest no-underline"
                            >
                                <GitPullRequest size={16} />
                                Pull Request
                            </a>
                        )}
                    </div>
                </div>
            )}
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar-minimal::-webkit-scrollbar { width: 3px; height: 3px; }
                .custom-scrollbar-minimal::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar-minimal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-scrollbar-minimal::-webkit-scrollbar-thumb:hover { background: rgba(56,189,248,0.4); }
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 3s ease infinite; }
            `}} />
        </div>
    );
}
