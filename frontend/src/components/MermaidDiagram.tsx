import React, { useState, useEffect, useRef } from "react";
import mermaid from "mermaid";
import type { FC } from "react";

interface MermaidDiagramProps {
  diagram: string;
  title: string;
}

export const MermaidDiagram: FC<MermaidDiagramProps> = ({ diagram, title }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const [renderId] = useState(() => `mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!diagram || diagram.trim() === "") {
      setIsLoading(false);
      return;
    }

    const renderDiagram = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!initializedRef.current) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "loose",
            theme: "dark",
            themeVariables: {
              primaryColor: "#1e293b",
              primaryTextColor: "#f1f5f9",
              primaryBorderColor: "#06b6d4",
              lineColor: "#06b6d4",
              secondaryColor: "#0f172a",
              tertiaryColor: "#334155",
              background: "#0f172a",
              mainBkg: "#1e293b",
              nodeBorder: "#06b6d4",
              clusterBkg: "#334155",
              clusterBorder: "#06b6d4",
              edgeLabelBackground: "#1e293b",
              fontSize: "16px",
            },
          });
          initializedRef.current = true;
        }

        try {
          mermaid.parse(diagram);
        } catch (parseErr: any) {
          setError(parseErr?.message || "Invalid Mermaid diagram syntax");
          setIsLoading(false);
          return;
        }

        const { svg } = await mermaid.render(renderId, diagram);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgElement = containerRef.current.querySelector("svg");
          if (svgElement) {
            svgElement.style.maxWidth = "100%";
            svgElement.style.height = "auto";
          }
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error("Mermaid render error:", err);
        setError(err?.message || "Failed to render diagram");
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [diagram, renderId]);

  if (isLoading) {
    return (
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-cyan-500/20 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5"></div>
        <div className="relative p-12 text-center">
          <div className="inline-block relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 blur-xl opacity-50 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-cyan-400 border-r-purple-400"></div>
          </div>
          <p className="text-slate-300 text-lg font-medium">Generating Architecture Diagram...</p>
          <p className="text-slate-500 text-sm mt-2">Parsing and rendering your project structure</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative rounded-2xl bg-gradient-to-br from-red-950/80 to-slate-900/80 backdrop-blur-xl border border-red-500/30 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent"></div>
        <div className="relative p-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-red-300 font-bold text-lg mb-2">Diagram Rendering Failed</h3>
              <p className="text-red-200/80 text-sm font-mono bg-red-950/50 p-3 rounded-lg border border-red-500/20">{error}</p>
              <p className="text-slate-400 text-xs mt-3">Please check your Mermaid diagram syntax</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-cyan-500/20 overflow-hidden shadow-2xl transition-all duration-500 ${isFullscreen ? "fixed inset-4 z-50" : ""
        }`}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-800/80 to-slate-900/80 px-6 py-4 border-b border-cyan-500/20 backdrop-blur-sm flex justify-between items-center">
        <h3 className="text-slate-200 font-bold text-lg tracking-tight">{title}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-all duration-200 border border-slate-600/50 hover:border-cyan-500/50"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isFullscreen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
          </button>
          <button
            onClick={() => {
              const svg = containerRef.current?.querySelector("svg");
              if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const blob = new Blob([svgData], { type: "image/svg+xml" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${title.replace(/\s+/g, "-").toLowerCase()}.svg`;
                link.click();
                URL.revokeObjectURL(url);
              }
            }}
            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-all duration-200 border border-slate-600/50 hover:border-cyan-500/50"
            title="Download SVG"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Diagram Container */}
      <div
        ref={containerRef}
        className={`diagram-container relative p-8 overflow-auto bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm ${isFullscreen ? "h-[calc(100%-64px)]" : "max-h-[600px]"
          }`}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#475569 #1e293b",
        }}
      ></div>

      {/* Footer */}
      <div className="relative bg-gradient-to-r from-slate-800/60 to-slate-900/60 px-6 py-3 border-t border-cyan-500/10 backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
            Rendered successfully
          </span>
          <span className="font-mono">Mermaid Diagram</span>
        </div>
      </div>
    </div>
  );
};
