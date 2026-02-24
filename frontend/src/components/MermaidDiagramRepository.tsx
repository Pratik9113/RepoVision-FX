import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import {
  Download,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Move,
  Loader2,
  AlertTriangle
} from "lucide-react";

/* ---------------- Types ---------------- */
interface MermaidDiagramRepositoryProps {
  diagram: string;
  title?: string;
  className?: string;
}

/* ---------------- Component ---------------- */
const MermaidDiagramRepository: React.FC<MermaidDiagramRepositoryProps> = ({
  diagram,
  title = "Repo Function Interaction Map",
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renderId] = useState(() => `mermaid-${Math.random().toString(36).slice(2)}`);
  const [svgContent, setSvgContent] = useState<string>("");

  /* ---------------- Mermaid Init ---------------- */
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "dark",
      themeVariables: {
        fontFamily: "Inter, ui-sans-serif",
        primaryColor: "#0f172a", // Dark Slate
        primaryTextColor: "#e2e8f0", // Light Text
        primaryBorderColor: "#38bdf8", // Sky Blue Border
        lineColor: "#a855f7", // Purple Lines
        secondaryColor: "#1e293b",
        tertiaryColor: "#334155",
        background: "transparent",
        mainBkg: "#1e293b", // Slate 800
        nodeBorder: "#22d3ee", // Cyan Border
        clusterBkg: "rgba(30, 41, 59, 0.5)",
        clusterBorder: "#818cf8", // Indigo
        edgeLabelBackground: "#0f172a", // Match bg
        fontSize: "16px",
        actorBorder: "#f472b6", // Pink
        actorBkg: "#1e293b",
        signalColor: "#f472b6",
        signalTextColor: "#f8fafc",
      },
    });
  }, []);

  /* ---------------- Render Diagram ---------------- */
  useEffect(() => {
    if (!diagram) {
      setSvgContent("");
      return;
    }

    const renderDiagram = async () => {
      try {
        setLoading(true);
        setError(null);

        // Validate first
        try {
          await mermaid.parse(diagram);
        } catch (e: any) {
          throw new Error(e.message || "Invalid Mermaid syntax");
        }

        const { svg } = await mermaid.render(renderId, diagram);
        setSvgContent(svg);

      } catch (e: any) {
        console.error(e);
        setError(e.message || "Mermaid syntax error. Diagram failed to render.");
      } finally {
        setLoading(false);
      }
    };

    renderDiagram();
  }, [diagram, renderId]);

  /* ---------------- Auto Fit ---------------- */
  useEffect(() => {
    if (!svgContent || !containerRef.current || !transformRef.current) return;

    // The SVG is now in the DOM (via dangerouslySetInnerHTML)
    // We need to apply the fix and center it.
    const svgEl = containerRef.current.querySelector("svg");
    if (!svgEl) return;

    /* ---- SVG FIX ---- */
    let viewBox = svgEl.getAttribute("viewBox");
    if (!viewBox) {
      const w = svgEl.getAttribute("width") || "1000";
      const h = svgEl.getAttribute("height") || "800";
      viewBox = `0 0 ${w} ${h}`;
      svgEl.setAttribute("viewBox", viewBox);
    }

    svgEl.removeAttribute("width");
    svgEl.removeAttribute("height");
    svgEl.style.width = "100%";
    svgEl.style.height = "auto";
    svgEl.style.maxWidth = "none";

    /* ---- AUTO FIT ---- */
    setTimeout(() => {
      if (transformRef.current) {
        const [, , vbWidth, vbHeight] = viewBox!.split(" ").map(Number);
        const wrapper = transformRef.current.instance.wrapperComponent;

        if (wrapper) {
          const w = wrapper.clientWidth;
          const h = wrapper.clientHeight;

          if (w && h && vbWidth && vbHeight) {
            const scale = Math.min(w / vbWidth, h / vbHeight) * 0.9;
            const centerScale = Math.max(0.1, Math.min(scale, 2)); // Clamp initial scale

            transformRef.current.centerView(centerScale, 0);
          }
        }
      }
    }, 50);

  }, [svgContent]);


  /* ---------------- Fullscreen ---------------- */
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const el = containerRef.current?.closest(".repo-diagram-container");
        if (el) {
          await el.requestFullscreen();
          setIsFullscreen(true);
          setTimeout(() => transformRef.current?.centerView(1, 100), 200);
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  /* ---------------- Download SVG ---------------- */
  const downloadSVG = () => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;

    const blob = new Blob(
      [new XMLSerializer().serializeToString(svg)],
      { type: "image/svg+xml" }
    );

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/\s+/g, "_").toLowerCase()}.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  /* ---------------- UI ---------------- */
  const isEmpty = !diagram && !loading && !error;

  return (
    <div className={`repo-diagram-container relative bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col ${isFullscreen ? 'w-screen h-screen fixed inset-0 z-50' : 'w-full h-full min-h-[600px]'} ${className}`}>

      {/* Background Effects */}
      {!isFullscreen && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>
      )}

      <TransformWrapper
        ref={transformRef}
        minScale={0.1}
        maxScale={8}
        wheel={{ step: 0.1 }}
        centerOnInit
        limitToBounds={false}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <div className="flex flex-col h-full relative z-10 text-white font-sans">
            {/* -------- Toolbar -------- */}
            <header className="flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-white/10 select-none">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-cyan-500/10">
                  <Move size={16} className="text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-sm font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
                    {title}
                  </h1>
                  <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                    Interactive Diagram
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1 shadow-xl shadow-black/20">
                <IconBtn onClick={() => zoomOut()} tooltip="Zoom Out"><ZoomOut size={16} /></IconBtn>
                <IconBtn onClick={() => resetTransform()} tooltip="Reset View"><RefreshCw size={16} /></IconBtn>
                <IconBtn onClick={() => zoomIn()} tooltip="Zoom In"><ZoomIn size={16} /></IconBtn>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <IconBtn onClick={downloadSVG} tooltip="Download SVG"><Download size={16} /></IconBtn>
                <IconBtn onClick={toggleFullscreen} tooltip={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </IconBtn>
              </div>
            </header>

            {/* -------- Canvas -------- */}
            <main className="flex-1 overflow-hidden relative bg-[#0b1020]/50" style={{ cursor: 'grab' }} onMouseDown={e => e.currentTarget.style.cursor = 'grabbing'} onMouseUp={e => e.currentTarget.style.cursor = 'grab'}>
              {error && (
                <div className="absolute inset-0 flex items-center justify-center p-8 z-20">
                  <div className="max-w-md w-full bg-red-950/30 border border-red-500/20 rounded-2xl p-6 backdrop-blur-xl">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
                        <AlertTriangle size={24} />
                      </div>
                      <div>
                        <h3 className="text-red-200 font-semibold mb-1">Rendering Failed</h3>
                        <p className="text-red-300/70 text-sm mb-4">
                          There was an error parsing the Mermaid diagram.
                        </p>
                        <div className="p-3 bg-black/30 rounded-lg border border-red-500/10 text-xs font-mono text-red-300/90 break-all">
                          {error}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center p-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
                      <Move size={32} className="text-slate-600" />
                    </div>
                    <h3 className="text-slate-400 font-medium">No architecture diagram available</h3>
                    <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
                      Run an analysis to generate the repository structure.
                    </p>
                  </div>
                </div>
              )}

              {/* Always render TransformComponent, but content might be empty if check failed */}
              <TransformComponent
                wrapperClass="w-full h-full"
                contentClass="w-full h-full"
                wrapperStyle={{ width: '100%', height: '100%' }}
              >
                <div
                  ref={containerRef}
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              </TransformComponent>

              {loading && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="text-cyan-400 animate-spin" />
                    <div className="text-sm font-medium text-cyan-200/80 animate-pulse">
                      Rendering Layout...
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}
      </TransformWrapper>
    </div>
  );
};

/* ---------------- Icon Button ---------------- */
const IconBtn: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  tooltip?: string;
}> = ({ onClick, children, tooltip }) => (
  <button
    onClick={onClick}
    title={tooltip}
    className="p-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 active:scale-95 transition-all duration-200 outline-none focus:ring-1 focus:ring-cyan-500/50"
  >
    {children}
  </button>
);

export default MermaidDiagramRepository;
