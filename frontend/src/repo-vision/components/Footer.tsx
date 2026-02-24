import type { FC } from "react";

const Footer: FC = () => {
  return (
    <footer className="bg-white/5 backdrop-blur border-t border-white/10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-slate-400">
          <p className="font-semibold text-slate-200">RepoVision - Advanced GitHub Repository Analyzer</p>
          <p className="text-sm mt-2">
            Built with React, Node.js, and AI-powered insights
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
