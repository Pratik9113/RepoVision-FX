import { Zap } from 'lucide-react';

const LoadingIndicator = () => {
    return (
        <section className="p-8">
            <div className="flex flex-col items-center justify-center gap-6 text-center">
                <div className="relative">
                    <div className="w-16 h-16 border-2 border-sky-500/10 border-t-sky-500 rounded-full animate-spin"></div>
                    <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-sky-500 animate-pulse" />
                </div>
                <div>
                   <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white animate-pulse mb-1">Deep Signal Scanning</p>
                   <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">INGESTING REPOSITORY TOPOLOGY...</p>
               </div>
                <p className="text-[10px] text-white/10 font-bold max-w-[200px] leading-relaxed">
                    NEURAL ENGINE IS MAPPING DEPENDENCIES. THIS MAY TAKE UP TO 60s FOR LARGE CODEBASES.
                </p>
            </div>
        </section>
    );
};

export default LoadingIndicator;
