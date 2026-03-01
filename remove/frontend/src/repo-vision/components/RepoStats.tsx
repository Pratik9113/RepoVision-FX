import type { FC } from "react";
import { Badge } from "./Badge";
import { Stat } from "./Stat";
import type { RepoData } from "../types";

interface RepoStatsProps {
  data: RepoData;
}

const RepoStats: FC<RepoStatsProps> = ({ data }) => {
  return (
    <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-8 shadow-2xl shadow-indigo-500/5 relative overflow-hidden">
      {/* Decorative background pulse */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"></div>

      <div className="relative z-10">
        {/* Repo Header with Image */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8 group">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <img
              src={`https://github.com/${data.repoMeta.owner}.png`}
              alt={data.repoMeta.owner}
              className="relative w-20 h-20 rounded-2xl border border-white/10 shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
              }}
            />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold text-white flex flex-wrap justify-center md:justify-start items-center gap-3">
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">
                {data.repoMeta.repo}
              </span>
              <a
                href={`https://github.com/${data.repoMeta.owner}/${data.repoMeta.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
                View on GitHub
              </a>
            </h2>
            <p className="mt-2 text-slate-400 flex items-center justify-center md:justify-start gap-2">
              <span>by</span>
              <span className="text-indigo-400 font-medium">{data.repoMeta.owner}</span>
              <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
              <span>{data.repoMeta.branchTried} branch</span>
            </p>
          </div>
        </div>

        {/* Info row */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Badge variant="primary" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
            {data.repoMeta.language || "Mixed Languages"}
          </Badge>
          <Badge variant="success" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
            ⭐ {data.repoMeta.stars} Stars
          </Badge>
          <Badge className="bg-slate-500/10 text-slate-300 border-slate-500/20">
            🍴 {data.repoMeta.forks} Forks
          </Badge>
          {data.repoMeta.license && (
            <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20">
              ⚖️ {data.repoMeta.license}
            </Badge>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Stat label="Files" value={data.stats.files} icon="📄" />
          <Stat label="Functions" value={data.stats.functions} icon="⚙️" />
          <Stat label="Classes" value={data.stats.classes} icon="🏗️" />
          <Stat label="Components" value={data.stats.components} icon="⚛️" />
          <Stat label="Endpoints" value={data.stats.apis} icon="🔗" />
          <Stat label="Models" value={data.stats.models} icon="🗄️" />
          <Stat label="Databases" value={data.stats.databases} icon="💾" />
        </div>

        {/* File counts by language */}
        {data.repoMeta.fileCountsByLanguage && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(data.repoMeta.fileCountsByLanguage).map(([lang, count]) => (
              <Badge key={lang} variant="default">
                <strong>{lang}:</strong>&nbsp;{count}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default RepoStats;
