import React, { useState, useEffect } from 'react';
import { 
  Search,
  RefreshCw,
  MoreVertical,
  ChevronDown,
  Filter,
  Clock,
  Activity,
  Zap,
  ExternalLink
} from 'lucide-react';

const IncidentRow = ({ incident, onClick }) => {
  const statusConfig = {
    'CRITICAL': 'text-red-400 bg-red-400/10 border-red-400/20 shadow-[0_0_10px_rgba(248,113,113,0.1)]',
    'HIGH': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    'MEDIUM': 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    'LOW': 'text-green-400 bg-green-400/10 border-green-400/20',
    'TRIGGERED': 'text-red-400 bg-red-400/10 border-red-400/20',
    'ACK\'ED': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    'RESOLVED': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  };

  const status = incident.status || (incident.severity?.includes('Critical') ? 'CRITICAL' : 'ACK\'ED');

  return (
    <div 
      onClick={onClick}
      className="flex items-center border-b border-white/[0.05] py-4 px-6 hover:bg-white/[0.03] transition-all group cursor-pointer"
    >
      <div className="w-12 flex flex-col items-center">
         <div className={`w-1.5 h-1.5 rounded-full ${status.includes('CRITICAL') || status.includes('TRIGGERED') ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-white/20'} mb-2`} />
      </div>
      
      <div className="w-24 flex flex-col">
        <span className="text-white/20 text-[10px] font-mono tracking-tighter mb-1 uppercase">INC-{incident.id.replace('INC-', '')}</span>
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border self-start tracking-widest uppercase ${statusConfig[status] || 'text-white/45 bg-white/5 border-white/10'}`}>
          {status}
        </span>
      </div>

      <div className="flex-1 px-6">
        <h3 className="text-[14px] font-bold text-white mb-1.5 group-hover:text-sky-400 transition-colors leading-tight">
          {incident.title}
        </h3>
        <div className="flex items-center gap-4 text-[11px] text-white/30">
          <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {incident.timestamp ? new Date(incident.timestamp).toLocaleTimeString() : 'Just now'}</span>
          <span className="w-1 h-1 bg-white/10 rounded-full" />
          <span className="flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider text-white/40">
             {incident.severity}
          </span>
          {incident.tags && incident.tags.map(tag => (
            <span key={tag} className="uppercase font-black text-[9px] text-sky-500/80 bg-sky-500/5 px-2 py-0.5 rounded border border-sky-500/10 tracking-widest">{tag}</span>
          ))}
        </div>
      </div>

      <div className="w-48 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-white/60 font-black text-[10px]">
          {(incident.reported_by || 'AI').split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex flex-col">
            <span className="text-[12px] text-white/60 font-semibold">{incident.reported_by || 'System Agent'}</span>
            <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Assignee</span>
        </div>
      </div>

      <div className="w-32 hidden lg:flex flex-col">
        <span className="text-[12px] text-sky-500/60 font-bold hover:text-sky-400 transition-colors cursor-pointer">{incident.service}</span>
        <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest leading-none mt-1">Component</span>
      </div>

      <div className="w-12 flex justify-end">
         <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 group-hover:text-white/60 hover:bg-white/10 transition-all">
            <ExternalLink className="w-4 h-4" />
         </div>
      </div>
    </div>
  );
};

export default function IncidentsList({ onSelectIncident }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All Intelligence');

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/incidents');
      const data = await response.json();
      setIncidents(data);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const filteredIncidents = incidents.filter(inc => 
    inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inc.service.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col bg-transparent flex-grow">
        {/* Control Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between px-8 py-5 border-b border-white/[0.07] gap-5">
          <div className="flex flex-wrap items-center gap-4">
             <button 
                onClick={fetchIncidents}
                className={`w-9 h-9 flex items-center justify-center bg-white/[0.03] border border-white/10 rounded-xl text-white/40 hover:text-sky-400 hover:border-sky-400/30 transition-all ${loading ? 'animate-spin' : ''}`}
             >
                <RefreshCw className="w-4 h-4" />
             </button>
             
             <div className="flex p-1 bg-white/[0.03] border border-white/10 rounded-xl">
                {['All Intelligence', 'My Resolutions'].map(pill => (
                    <button 
                        key={pill}
                        onClick={() => setActiveTab(pill)}
                        className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border-none cursor-pointer ${activeTab === pill ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20' : 'text-white/30 hover:text-white/60 bg-transparent'}`}
                    >
                        {pill}
                    </button>
                ))}
             </div>

             <div className="h-4 w-px bg-white/10 mx-2 hidden lg:block"></div>

             <button className="flex items-center gap-2 text-white/30 font-black text-[10px] hover:text-white transition-colors uppercase tracking-[0.1em] bg-transparent border-none cursor-pointer">
                <Filter className="w-3.5 h-3.5" /> Filter Signals
             </button>
          </div>

          <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-sky-400 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search incidents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full lg:w-72 pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500/40 focus:ring-4 focus:ring-sky-500/5 transition-all outline-none"
                />
          </div>
        </div>

        {/* Table Header */}
        <div className="flex items-center px-6 py-4 bg-white/[0.02] border-b border-white/[0.07] text-[9px] font-black text-white/20 uppercase tracking-[0.2em] shrink-0">
            <div className="w-12"></div>
            <div className="w-24">IDENTIFIER</div>
            <div className="flex-1 px-6">ANOMALY DETAILS</div>
            <div className="w-48">RESOLUTION AGENT</div>
            <div className="w-44 hidden lg:block">ECOSYSTEM</div>
            <div className="w-12 text-right">SCAN</div>
        </div>

        {/* Incident List */}
        <div className="flex-grow overflow-y-auto custom-scrollbar-dark min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-24 text-white/20 gap-6">
               <div className="relative">
                  <div className="w-12 h-12 border-2 border-sky-500/10 border-t-sky-500 rounded-full animate-spin"></div>
                  <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-sky-500 animate-pulse" />
               </div>
               <div className="text-center">
                   <p className="text-[11px] font-black uppercase tracking-[0.3em] animate-pulse mb-1">Deep Scanning</p>
                   <p className="text-[9px] font-bold text-white/10">INGESTING REPOSITORY SIGNALS...</p>
               </div>
            </div>
          ) : filteredIncidents.length > 0 ? (
            <div className="flex flex-col pb-10">
              {filteredIncidents.map((incident) => (
                <IncidentRow 
                  key={incident.id} 
                  incident={incident} 
                  onClick={() => onSelectIncident(incident.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-24 text-white/10 space-y-4">
               <Activity className="w-12 h-12 opacity-50" />
               <div className="text-center">
                   <p className="font-black text-[12px] uppercase tracking-[0.2em]">Signal Clear</p>
                   <p className="text-[10px] font-bold">NO ANOMALIES DETECTED IN MONITORING CYCLE</p>
               </div>
            </div>
          )}
        </div>
        
        <style dangerouslySetInnerHTML={{ __html: `
            .custom-scrollbar-dark::-webkit-scrollbar {
              width: 4px;
            }
            .custom-scrollbar-dark::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar-dark::-webkit-scrollbar-thumb {
              background: rgba(255,255,255,0.05);
              border-radius: 10px;
            }
            .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover {
              background: rgba(56,189,248,0.2);
            }
        `}} />
    </div>
  );
}
