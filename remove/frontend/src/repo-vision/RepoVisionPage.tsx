import Navbar from "../components/layout/Navbar";
import Footer from "./components/Footer";
import ThreeBackground from "../components/layout/ThreeBackground";
import InputSection from "./components/InputSection";
import LoadingIndicator from "./components/LoadingIndicator";
import RepoStats from "./components/RepoStats";
import RepoTabs from "./components/RepoTabs";
import { useRepoVision } from "./hooks/useRepoVision";
import type { Tab } from "./types";

const REPO_TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "files", label: "Files", icon: "📁" },
  { id: "endpoints", label: "Endpoints", icon: "🔗" },
  { id: "models", label: "Models", icon: "🗄️" },
  { id: "controllers", label: "Controllers", icon: "🎮" },
  { id: "databases", label: "Databases", icon: "💾" },
  { id: "functions", label: "Functions", icon: "⚙️" },
  { id: "diagram", label: "Architecture", icon: "📈" },
  { id: "modules", label: "Modules", icon: "🧩" },
  { id: "directories", label: "Directories", icon: "🌳" },
  { id: "digest", label: "Digest", icon: "📝" },
  { id: "ai", label: "AI Analysis", icon: "🤖" },
  { id: "raw", label: "Raw Data", icon: "📋" },
];

export default function RepoVisionPage() {
  const {
    repoUrl,
    setRepoUrl,
    isLoading,
    data,
    error,
    activeTab,
    setActiveTab,
    selectedFile,
    fileContent,
    analyze,
    fetchFileContent,
    tryDemo,
  } = useRepoVision();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 relative overflow-hidden">
      <ThreeBackground />

      {/* Subtle Gradient Glows */}
      <div className="fixed inset-0 pointer-events-none z-1">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-pink-600/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
          <InputSection
            repoUrl={repoUrl}
            isLoading={isLoading}
            error={error}
            setRepoUrl={setRepoUrl}
            onAnalyze={() => analyze(repoUrl)}
            onTryDemo={tryDemo}
          />

          {isLoading && <LoadingIndicator />}

          {data && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <RepoStats data={data} />
              <RepoTabs
                tabs={REPO_TABS}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                data={data}
                fetchFileContent={fetchFileContent}
                fileContent={fileContent}
                selectedFile={selectedFile}
              />
            </div>
          )}
        </main>

        <Footer />
      </div>

      <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.05); }
                }
            `}</style>
    </div>
  );
}
