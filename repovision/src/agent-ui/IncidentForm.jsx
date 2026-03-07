import { useState, useEffect } from 'react';
import {
    Send, AlertCircle, CheckCircle2, Loader2, Copy, FileCode,
    ChevronDown, ChevronUp, Sparkles, Zap, Bug, Code,
    GitPullRequest, Layout, Activity, Search, BrainCircuit
} from 'lucide-react';

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
        <div className="bg-slate-900/40 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm group hover:border-purple-500/30 transition-all duration-300">
            <div className="flex items-center justify-between px-5 py-4 bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                        <FileCode size={20} />
                    </div>
                    <code className="text-sm text-slate-100 font-mono font-bold truncate">{edit.file}</code>
                </div>
                <button
                    onClick={copyEdited}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white text-xs font-bold transition-all"
                >
                    <Copy size={14} />
                    {copied ? 'Copied!' : 'Copy Fix'}
                </button>
            </div>
            {edit.change_summary && (
                <div className="px-5 py-3 text-xs text-slate-400 border-b border-white/5 italic">
                    {edit.change_summary}
                </div>
            )}
            <div className="p-4 space-y-3">
                <div className="rounded-xl overflow-hidden border border-white/5">
                    <button
                        type="button"
                        onClick={() => setShowOriginal(!showOriginal)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/40 hover:bg-slate-800/60 text-slate-400 text-xs font-bold uppercase tracking-widest"
                    >
                        <span>Before Change</span>
                        {showOriginal ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showOriginal && (
                        <pre className="p-4 bg-black/80 text-[11px] text-slate-300 font-mono overflow-x-auto max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                            {originalLines.map((line, i) => (
                                <div key={i} className={`flex ${affected.includes(i + 1) ? 'bg-red-500/10' : ''}`}>
                                    <span className="text-slate-600 select-none w-10 border-r border-white/5 mr-3">{i + 1}</span> {line || ' '}
                                </div>
                            ))}
                        </pre>
                    )}
                </div>

                <div className="rounded-xl overflow-hidden border border-green-500/20 shadow-lg shadow-green-500/5">
                    <button
                        type="button"
                        onClick={() => setShowEdited(!showEdited)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-green-500/5 hover:bg-green-500/10 text-green-400 text-xs font-bold uppercase tracking-widest"
                    >
                        <span>AI Proposed Fix</span>
                        {showEdited ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showEdited && (
                        <pre className="p-4 bg-black/80 text-[11px] text-slate-100 font-mono overflow-x-auto max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-green-900">
                            {editedLines.map((line, i) => (
                                <div key={i} className={`flex ${affected.includes(i + 1) ? 'bg-green-500/20' : ''}`}>
                                    <span className="text-green-900 select-none w-10 border-r border-green-900/30 mr-3">{i + 1}</span>
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
    const [repoUrl, setRepoUrl] = useState('d:\\test_repovisionai_fx\\shopstack-platform');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loadingIncident, setLoadingIncident] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (prefilledIncidentId) {
            handlePrefill(prefilledIncidentId);
        }
    }, [prefilledIncidentId]);

    const handlePrefill = async (id) => {
        setLoadingIncident(true);
        setError(null);
        try {
            const response = await fetch(`http://localhost:8000/incidents/${id}`);
            if (!response.ok) throw new Error('Failed to fetch incident details');
            const data = await response.json();

            const fullDesc = `Title: ${data.title}\n\nDescription: ${data.description}\n\nError Log:\n${data.error_log || 'N/A'}`;
            setDescription(fullDesc);
            if (data.repo_url) setRepoUrl(data.repo_url);
            setResult(null);
            setCurrentStep(0);
        } catch (err) {
            setError(`Failed to load incident details: ${err.message}`);
        } finally {
            setLoadingIncident(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setResult(null);

        // Manual incremental steps simulation (since backend doesn't stream yet)
        const stepInterval = setInterval(() => {
            setCurrentStep(prev => prev < 7 ? prev + 1 : prev);
        }, 1500);

        try {
            const response = await fetch('http://localhost:8000/incident', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    repo_url: repoUrl,
                    description,
                }),
            });

            clearInterval(stepInterval);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

            const data = await response.json();
            setResult(data);
            setCurrentStep(8);
        } catch (err) {
            clearInterval(stepInterval);
            const msg = err.message === 'Failed to fetch'
                ? 'Cannot reach the backend. Ensure hackathon_api.py is running on port 8000.'
                : err.message;
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-10">
            {/* Main Workspace Card */}
            <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                <div className="relative bg-slate-950/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-3xl overflow-hidden">

                    {/* Glowing background accent */}
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                                <Zap className="text-amber-400 fill-amber-400" />
                                Autonomous Resolver
                            </h2>
                            <p className="text-slate-400 mt-1 font-medium">Neural engine for real-time repository healing.</p>
                        </div>

                        {isLoading && (
                            <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
                                <Loader2 className="animate-spin text-cyan-400" size={20} />
                                <div className="text-sm font-bold text-white uppercase tracking-widest">
                                    Processing Stage {currentStep}/8
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-1 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 ml-1">Target Repository</label>
                                    <div className="relative group/input">
                                        <input
                                            type="text"
                                            value={repoUrl}
                                            onChange={(e) => setRepoUrl(e.target.value)}
                                            disabled={isLoading}
                                            className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 group-hover/input:border-white/20 transition-all disabled:opacity-50"
                                            placeholder="URL or Local Path"
                                        />
                                    </div>
                                </div>

                                <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                        <Activity size={14} className="text-purple-400" />
                                        System Status
                                    </h4>
                                    <div className="space-y-3">
                                        {[
                                            { label: "AI Engine", value: "Groq Llama-3.1", color: "text-green-400" },
                                            { label: "Connectivity", value: "Live", color: "text-cyan-400" },
                                            { label: "Integration", value: "GitHub Push", color: "text-purple-400" }
                                        ].map((stat, i) => (
                                            <div key={i} className="flex justify-between text-[11px]">
                                                <span className="text-slate-500 font-bold">{stat.label}</span>
                                                <span className={`${stat.color} font-mono font-bold`}>{stat.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-400 ml-1">Incident Profile</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={isLoading}
                                    rows="8"
                                    className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-3xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/30 resize-none font-mono text-sm leading-relaxed disabled:opacity-50"
                                    placeholder="Paste stack traces, logs, or bug reports here..."
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !repoUrl || !description}
                            className="w-full relative group/btn overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-[length:200%_auto] animate-gradient-x group-hover/btn:scale-105 transition-transform duration-500"></div>
                            <div className="relative py-5 rounded-2xl flex justify-center items-center gap-4 text-white font-black text-lg shadow-2xl shadow-purple-900/40">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={24} />
                                        DEPLOYING REPAIR AGENT
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={24} className="group-hover/btn:rotate-12 transition-transform" />
                                        COMMENCE RESOLUTION
                                    </>
                                )}
                            </div>
                        </button>
                    </form>
                </div>
            </div>

            {/* Pipeline Steps Visualization */}
            {(isLoading || result) && (
                <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <div className="flex flex-col md:flex-row justify-between gap-4 relative">
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-[28px] left-[5%] right-[5%] h-0.5 bg-white/5 -z-0"></div>

                        {PIPELINE_STEPS.map((step) => {
                            const isCompleted = currentStep >= step.id;
                            const isActive = currentStep === step.id - 1 && isLoading;

                            return (
                                <div key={step.id} className="relative z-10 flex flex-col items-center md:w-1/8 flex-1 group">
                                    <div className={`
                                        w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border
                                        ${isCompleted ? 'bg-purple-600 border-purple-400 text-white scale-110 shadow-lg shadow-purple-600/30' :
                                            isActive ? 'bg-slate-800 border-cyan-500 text-cyan-400 animate-pulse scale-105' :
                                                'bg-slate-900 border-white/5 text-slate-600'}
                                    `}>
                                        {isCompleted && currentStep > step.id ? <CheckCircle2 size={24} /> : step.icon}
                                    </div>
                                    <span className={`
                                        mt-4 text-[9px] font-black uppercase tracking-widest text-center transition-colors
                                        ${isCompleted ? 'text-purple-300' : isActive ? 'text-cyan-400' : 'text-slate-600'}
                                    `}>
                                        {step.name}
                                    </span>
                                    {isActive && (
                                        <div className="mt-2 flex gap-1">
                                            <div className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce"></div>
                                            <div className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></div>
                                            <div className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-950/40 border border-red-500/30 rounded-3xl p-6 flex gap-5 items-center animate-in zoom-in duration-300">
                    <div className="p-3 bg-red-500/20 rounded-2xl text-red-500">
                        <AlertCircle size={32} />
                    </div>
                    <div>
                        <h3 className="font-black text-red-300 uppercase tracking-widest text-sm">Deployment Failure</h3>
                        <p className="text-red-200/80 text-sm font-medium mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Comprehensive Results Section */}
            {result && result.status === 'success' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-20 duration-1000">
                    {/* Analysis Summary Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Root Cause Card */}
                        <div className="md:col-span-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <BrainCircuit size={120} className="text-purple-500" />
                            </div>
                            <h3 className="text-sm font-black text-purple-400 uppercase tracking-[0.3em] mb-4">Neural Diagnosis</h3>
                            <p className="text-2xl font-bold text-slate-100 leading-tight">
                                {result.llm_context?.root_cause_analysis?.root_cause || "Anomalous code patterns detected in service logic."}
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                {result.signals?.error_types?.map((err, i) => (
                                    <span key={i} className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg font-mono text-[10px] font-bold">
                                        {err}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Impact Stat */}
                        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-950 border border-white/10 rounded-3xl p-8 flex flex-col justify-between">
                            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-[0.3em]">Codebase Impact</h3>
                            <div className="py-2">
                                <div className="text-5xl font-black text-white">{result.edited_files?.length || 0}</div>
                                <div className="text-slate-400 text-xs font-bold mt-1">MODULES MODIFIED</div>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full w-[65%]" />
                            </div>
                        </div>
                    </div>

                    {/* Proposed Edits Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-0.5 flex-grow bg-white/5"></div>
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.5em] whitespace-nowrap">Proposed Atomic Edits</h2>
                            <div className="h-0.5 flex-grow bg-white/5"></div>
                        </div>

                        <div className="grid grid-cols-1 gap-8">
                            {result.edited_files?.map((edit, idx) => (
                                <EditedFileCard key={idx} edit={edit} />
                            ))}
                        </div>
                    </div>

                    {/* Final Status Footer */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
                            <span className="text-slate-300 font-bold tracking-wide">{result.message}</span>
                        </div>
                        {result.github_integration?.pr_url && (
                            <a
                                href={result.github_integration.pr_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-8 py-3 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-colors flex items-center gap-3"
                            >
                                <GitPullRequest size={18} />
                                VIEW PULL REQUEST
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
