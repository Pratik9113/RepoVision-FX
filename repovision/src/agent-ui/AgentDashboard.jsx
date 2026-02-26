import { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../repo-vision/components/Footer';
import ThreeBackground from '../components/layout/ThreeBackground';
import { Terminal, Send, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function AgentDashboard() {
    const [ticketContent, setTicketContent] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState([]);
    const [result, setResult] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!ticketContent.trim()) return;

        setIsRunning(true);
        setLogs(['Initiating Autonomous Agent Pipeline...']);
        setResult(null);

        try {
            const response = await fetch('http://localhost:6060/api/agent/incident', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketText: ticketContent })
            });

            const data = await response.json();

            if (data.error) {
                setLogs(prev => [...prev, `[Critical Error] ${data.error}`]);
            } else {
                setLogs(prev => [...prev, ...data.logs]);
                setResult(data);
            }
        } catch (err) {
            setLogs(prev => [...prev, `[System Failure] Request interrupted: ${err.message}`]);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 relative overflow-hidden flex flex-col">
            <ThreeBackground />

            <Navbar />

            <main className="relative z-10 flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">

                {/* Left Side: Ticket Input */}
                <section className="flex-1 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
                            <Terminal size={24} className="text-pink-400" />
                            Incident Ticketing
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">Paste a bug report or Jira ticket directly below.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-grow flex flex-col gap-4">
                        <textarea
                            className="flex-grow w-full bg-black/40 border border-slate-700/50 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono text-sm resize-none"
                            placeholder={'Example:\n\n"The backend fails to process user payments. \nError logs show a TypeError in src/services/PaymentService.js at line 42 on the .charge() method.\nRepo URL: https://github.com/my-org/my-repo"'}
                            value={ticketContent}
                            onChange={(e) => setTicketContent(e.target.value)}
                            disabled={isRunning}
                        />
                        <button
                            type="submit"
                            disabled={isRunning || !ticketContent}
                            className="flex justify-center items-center gap-2 w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isRunning ? <><Loader2 className="animate-spin" /> Autonomous ReAct Loop Active</> : <><Send size={18} /> Resolve Incident</>}
                        </button>
                    </form>
                </section>

                {/* Right Side: Execution Logs */}
                <section className="flex-1 bg-black/60 backdrop-blur-md border border-cyan-500/20 rounded-3xl p-6 shadow-2xl flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 w-full h-32 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />

                    <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                        Execution Console
                    </h2>

                    <div className="flex-grow bg-[#0c1021] rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-y-auto max-h-[500px] flex flex-col gap-2 shadow-inner">
                        {logs.length === 0 ? (
                            <span className="text-slate-600 italic">Waiting for an incident to be reported...</span>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="pb-2 border-b border-slate-800/50 last:border-0 whitespace-pre-wrap">
                                    <span className="text-cyan-600 font-bold mr-2">&gt;</span>
                                    {log}
                                </div>
                            ))
                        )}
                        {isRunning && (
                            <div className="flex items-center gap-2 text-cyan-400 mt-2">
                                <span className="animate-pulse">██</span>
                            </div>
                        )}
                    </div>

                    {result && !isRunning && (
                        <div className={`mt-4 p-4 rounded-xl border flex items-start gap-4 ${result.status === 'Resolved' ? 'bg-green-950/30 border-green-500/30 text-green-300' : 'bg-red-950/30 border-red-500/30 text-red-300'}`}>
                            {result.status === 'Resolved' ? <CheckCircle size={24} className="text-green-400 shrink-0" /> : <AlertTriangle size={24} className="text-red-400 shrink-0" />}
                            <div>
                                <h3 className="font-bold text-lg">{result.status === 'Resolved' ? 'Resolution Successful' : 'Resolution Failed'}</h3>
                                {result.context && (
                                    <p className="text-sm opacity-80 mt-1">
                                        The system concluded analyzing files: {result.context.suspected_files?.join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </main>

            <Footer />
        </div>
    );
}
