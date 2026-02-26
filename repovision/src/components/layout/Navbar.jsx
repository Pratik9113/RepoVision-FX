import { Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import NavigationControls from './NavigationControls';

const Navbar = () => {
    return (
        <header className="relative z-10 flex justify-between items-center px-8 py-6">
            <div className="flex items-center gap-6">
                <Link to="/" className="flex items-center gap-3 no-underline group">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-300"></div>
                        <div className="relative w-10 h-10 bg-slate-900 border border-white/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Eye className="w-6 h-6 text-purple-400 group-hover:text-white transition-colors" />
                        </div>
                    </div>
                    <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent group-hover:from-purple-400 group-hover:to-pink-400 transition-all duration-300">
                        RepoVision
                    </span>
                </Link>

                <NavigationControls />
            </div>

            <nav className="flex items-center gap-8">
                <Link
                    to="/agent"
                    className="text-purple-300 font-bold hover:text-white transition duration-300 flex items-center gap-2 group relative"
                >
                    <span className="relative z-10">Autonomous Agent</span>
                    <span className="absolute bottom-[-4px] left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 group-hover:w-full transition-all duration-300"></span>
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[150%] bg-purple-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                </Link>
                <Link
                    to="/playground"
                    className="text-gray-300 hover:text-white transition duration-300 relative group no-underline"
                >
                    Playground
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 group-hover:w-full transition-all duration-300"></span>
                </Link>
            </nav>
        </header>
    );
};

export default Navbar;
