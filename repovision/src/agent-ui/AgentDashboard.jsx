import { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../repo-vision/components/Footer';
import ThreeBackground from '../components/layout/ThreeBackground';
import IncidentForm from './IncidentForm';

export default function AgentDashboard() {
    const [activeTab, setActiveTab] = useState('incident');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 relative overflow-hidden flex flex-col">
            <ThreeBackground />

            <Navbar />

            <main className="relative z-10 flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                
                {/* Tab Navigation */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('incident')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${
                            activeTab === 'incident'
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                        🔍 Incident Analyzer
                    </button>
                </div>

                {/* Incident Form Tab */}
                {activeTab === 'incident' && <IncidentForm />}

            </main>

            <Footer />
        </div>
    );
}
