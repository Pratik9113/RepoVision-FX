import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Info, ArrowRight, RefreshCcw, Tag, Server, Terminal, Cpu } from 'lucide-react';

export default function IncidentExplorer({ onSelectIncident }) {
    const [incidents, setIncidents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchIncidents();
    }, []);

    const fetchIncidents = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:8000/incidents');
            if (!response.ok) throw new Error('Failed to fetch incidents');
            const data = await response.json();
            setIncidents(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getSeverityColor = (severity) => {
        const s = severity?.toLowerCase() || '';
        if (s.includes('critical') || s.includes('p0')) return 'from-red-600/20 to-red-900/10 text-red-400 border-red-500/30';
        if (s.includes('high') || s.includes('p1')) return 'from-orange-600/20 to-orange-900/10 text-orange-400 border-orange-500/30';
        return 'from-blue-600/20 to-blue-900/10 text-blue-400 border-blue-500/30';
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <div className="relative">
                    <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 animate-pulse"></div>
                    <Terminal className="animate-bounce text-purple-500 mb-6 relative z-10" size={48} />
                </div>
                <p className="font-black uppercase tracking-[0.3em] text-slate-500 text-xs animate-pulse">Syncing Mission Data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-slate-950/80 backdrop-blur-xl border border-red-500/20 rounded-[2rem] p-12 text-center max-w-2xl mx-auto shadow-2xl shadow-red-900/10">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                    <Cpu className="text-red-500" size={40} />
                </div>
                <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter italic">Server Connection Severed</h3>
                <p className="text-slate-400 font-medium leading-relaxed mb-8">
                    The autonomous backend is offline. Verify <code className="bg-white/5 px-2 py-1 rounded text-red-300">hackathon_api.py</code> is operational on port 8000.
                </p>
                <button
                    onClick={fetchIncidents}
                    className="group relative px-10 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:scale-105 transition-all"
                >
                    <span className="relative z-10 flex items-center gap-3">
                        <RefreshCcw size={16} /> Reconnect uplink
                    </span>
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            <div className="flex items-end justify-between border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.4em]">Active Terminal</span>
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">INCIDENT DECK</h2>
                </div>
                <button
                    onClick={fetchIncidents}
                    className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-slate-400 transition-all hover:scale-110"
                >
                    <RefreshCcw size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {incidents.map((incident) => (
                    <div
                        key={incident.id}
                        className="group relative"
                        onClick={() => onSelectIncident(incident.id)}
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/30 to-cyan-500/30 rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                        <div className="relative h-full bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-7 cursor-pointer overflow-hidden transition-all duration-500 group-hover:-translate-y-2">

                            <div className="flex justify-between items-start mb-8">
                                <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 font-mono text-[10px] font-black text-slate-400 group-hover:text-purple-400 transition-colors">
                                    {incident.id}
                                </div>
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border bg-gradient-to-br text-[9px] font-black uppercase tracking-wider ${getSeverityColor(incident.severity)}`}>
                                    {incident.severity}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-500 transition-all duration-500 line-clamp-2 mb-8 leading-tight">
                                {incident.title}
                            </h3>

                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Environment</span>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                                        <Server size={12} className="text-cyan-400" />
                                        {incident.service}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Status</span>
                                    <div className="flex flex-wrap gap-1">
                                        {incident.tags?.slice(0, 2).map((tag, idx) => (
                                            <span key={idx} className="bg-white/5 border border-white/5 px-2 py-0.5 rounded text-[8px] font-bold text-slate-500">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-500">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-black">
                                    <ArrowRight size={20} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {incidents.length === 0 && (
                <div className="text-center py-40 border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.02]">
                    <div className="p-6 bg-white/5 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                        <Terminal className="text-slate-700" size={32} />
                    </div>
                    <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-xs">No threats detected in sector</p>
                </div>
            )}
        </div>
    );
}
