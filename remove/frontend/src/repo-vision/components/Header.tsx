import type { FC } from "react";
import NavigationControls from "../../components/layout/NavigationControls";

const Header: FC = () => {
  return (
    <header className="bg-white/5 backdrop-blur border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">

          {/* Title */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              RepoVision
            </h1>
            <p className="mt-1 text-slate-300 text-sm md:text-base">
              Advanced GitHub Repository Analyzer with AI-powered insights
            </p>
          </div>

          {/* Navigation */}
          <NavigationControls />
        </div>
      </div>
    </header>
  );
};

export default Header;
