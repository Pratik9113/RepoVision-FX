import type { FC } from "react";

const LoadingIndicator: FC = () => {
  return (
    <section className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
        <div>
          <p className="text-slate-300">Analyzing repository...</p>
          <p className="text-sm text-slate-400">
            This can take up to a minute for large repositories
          </p>
        </div>
      </div>
    </section>
  );
};

export default LoadingIndicator;
