import React, { useState } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "./components/Footer";
import { useRepoVision } from "./hooks/useRepoVision";
import { ThreeDGraphViewer } from "./components/ThreeDGraph";
import InputSection from "./components/InputSection";
import LoadingIndicator from "./components/LoadingIndicator";

export default function ThreeDGraphPage() {
  const {
    repoUrl,
    setRepoUrl,
    isLoading,
    data,
    error,
    analyze,
    tryDemo,
  } = useRepoVision();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Navbar />

      <div className="relative z-10 flex flex-col min-h-screen">
        <main className="flex-grow w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">3D Architecture Graph</h1>
              <p className="text-slate-400">
                Visualize your repository's architecture and dependencies in an interactive 3D environment
              </p>
            </div>

            <InputSection
              repoUrl={repoUrl}
              isLoading={isLoading}
              error={error}
              setRepoUrl={setRepoUrl}
              onAnalyze={() => analyze(repoUrl)}
              onTryDemo={tryDemo}
            />

            {isLoading && <LoadingIndicator />}

            {data?.threeDGraph && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900/50 rounded-lg border border-white/10 p-6">
                  <ThreeDGraphViewer data={data.threeDGraph} />
                </div>
              </div>
            )}

            {!isLoading && !data?.threeDGraph && !error && (
              <div className="mt-12 text-center">
                <div className="text-slate-400 py-12">
                  <p className="text-lg mb-2">Enter a repository URL above to generate the 3D graph</p>
                  <p className="text-sm">The graph will show your codebase architecture with interactive visualization</p>
                </div>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
