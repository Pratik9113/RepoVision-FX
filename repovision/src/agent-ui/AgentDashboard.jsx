import { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../repo-vision/components/Footer';
import ThreeBackground from '../components/layout/ThreeBackground';
import IncidentForm from './IncidentForm';
import IncidentExplorer from './IncidentExplorer';

export default function AgentDashboard() {
    const [activeTab, setActiveTab] = useState('explore');
    const [selectedIncidentId, setSelectedIncidentId] = useState(null);

    const handleSelectIncident = (id) => {
        setSelectedIncidentId(id);
        setActiveTab('incident');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 relative overflow-hidden flex flex-col font-sans">
            <ThreeBackground />

            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

            <Navbar />

            <main className="relative z-10 flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

                {/* Visual Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 mb-2">
                        RepoVision Mission Control
                    </h1>
                    <p className="text-slate-400 text-lg">Autonomous AI Agent for Repository Incident Resolution</p>
                </div>

                {/* Tab Navigation */}
                <div className="flex justify-center gap-4 mb-10">
                    <button
                        onClick={() => setActiveTab('explore')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all duration-300 shadow-lg ${activeTab === 'explore'
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-600/20 scale-105'
                                : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 border border-white/5'
                            }`}
                    >
                        📡 Incident Explorer
                    </button>
                    <button
                        onClick={() => setActiveTab('incident')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all duration-300 shadow-lg ${activeTab === 'incident'
                                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-pink-600/20 scale-105'
                                : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 border border-white/5'
                            }`}
                    >
                        ⚡ AI Resolution
                    </button>
                </div>

                {/* Content Area */}
                <div className="transition-all duration-500 transform">
                    {activeTab === 'explore' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <IncidentExplorer onSelectIncident={handleSelectIncident} />
                        </div>
                    )}

                    {activeTab === 'incident' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <IncidentForm prefilledIncidentId={selectedIncidentId} />
                        </div>
                    )}
                </div>

            </main>

            <Footer />
        </div>
    );
}
