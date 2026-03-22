import { useEffect, useRef, useState } from "react";

/* ─── tiny data ─────────────────────────────────────────── */
const NAV_LINKS = ["Dashboard", "3D Architecture", "Agentic Fixes", "Incidents", "Docs"];

const STATS = [
  { label: "Files Indexed",    value: "-",   color: "text-blue-400",   badge: "● Ready",       badgeCls: "bg-blue-500/10 text-blue-400 border border-blue-500/20"  },
  { label: "Active Agents",    value: "0",   color: "text-purple-400", badge: "Idle",     badgeCls: "bg-purple-500/10 text-purple-400 border border-purple-500/20" },
  { label: "Avg Fix Time",     value: "-",   color: "text-cyan-400",   badge: "N/A", badgeCls: "bg-cyan-400/10 text-cyan-300 border border-cyan-400/20" },
  { label: "Auto-Resolved",    value: "0%",  color: "text-green-400",  badge: "-",       badgeCls: "bg-green-500/10 text-green-400 border border-green-500/20"  },
];

const INCIDENTS = [
  { sev: "bg-red-500",    title: "Critical: Memory Leak in Billing Service", time: "2m ago",  status: "ANALYZING", statusCls: "bg-blue-500/10 text-blue-400 border border-blue-500/25" },
  { sev: "bg-orange-500", title: "Warning: High Latency in Search API",      time: "14m ago", status: "FIXING",     statusCls: "bg-yellow-400/10 text-yellow-300 border border-yellow-400/20" },
  { sev: "bg-yellow-400", title: "Info: Database Connection Pool Warning",   time: "1h ago",  status: "RESOLVED",   statusCls: "bg-green-500/10 text-green-400 border border-green-500/20"  },
];

const STEPS = [
  {
    n: "01", icon: "🔍",
    title: "Deep Repository Ingestion",
    desc:  "Connect your GitHub or GitLab. RepoVisionAI-FX parses your AST, maps dependency graphs, and builds a semantic vector index of your entire codebase.",
    tags:  ["AST Parsing", "Dependency Graphs", "Vector Embeddings"],
  },
  {
    n: "02", icon: "🧠",
    title: "Autonomous Root Cause Analysis",
    desc:  "When an incident strikes, our agents traverse your code, analyze recent commits, and find the exact line causing the failure in seconds.",
    tags:  ["LLM Reasoning", "Contextual Analysis", "Trace Mapping"],
  },
  {
    n: "03", icon: "🛠️",
    title: "Generative Fix & Validation",
    desc:  "AI agents propose high-confidence fixes, write unit tests to verify the solution, and run them in sandboxed environments before you even wake up.",
    tags:  ["Auto-Fixes", "Test Generation", "Sandboxed Execution"],
  },
  {
    n: "04", icon: "🔭",
    title: "3D Architecture Intelligence",
    desc:  "Visualize your system topology in immersive 3D. See how services interact and identify bottlenecks through structural analysis.",
    tags:  ["3D Graphing", "Service Topology", "Architecture Drift"],
  },
];

const FEATURES = [
  { icon: "🏎️", title: "Agentic Resolution",    desc: "Autonomous loops that don't just alert, but actively solve engineering problems." },
  { icon: "🧬", title: "AST-Aware Reasoning",   desc: "Understands the structure of your code, not just the text. Precision fixes every time." },
  { icon: "🌐", title: "3D Visualization",     desc: "Explore your codebase like a galaxy. Understand complex dependencies at a glance." },
  { icon: "🔎", title: "Semantic Search",       desc: "Search logic patterns, not just keywords. Find 'how we handle auth' instantly." },
  { icon: "📈", title: "System Health",         desc: "Real-time metrics on code quality, technical debt, and incident resolution efficiency." },
  { icon: "🛡️", title: "Secure & Compliant",    desc: "Fully sandboxed execution and enterprise-grade security for your proprietary code." },
];

const INTEGRATIONS = [
  { icon: "🐙", name: "GitHub"      },
  { icon: "🦊", name: "GitLab"      },
  { icon: "🤖", name: "Anthropic"   },
  { icon: "🌌", name: "OpenAI"      },
  { icon: "📦", name: "AWS"         },
  { icon: "☁️", name: "Azure"       },
  { icon: "🔷", name: "Jira"        },
  { icon: "💬", name: "Slack"       },
  { icon: "🔴", name: "Datadog"     },
  { icon: "📈", name: "Prometheus"  },
  { icon: "🔶", name: "Sentry"      },
];

const FOOTER_COLS = [
  { title: "Platform",   links: ["3D Architecture","Agent Dashboard","Incident Feed","AI Analysis","Search"] },
  { title: "Company",    links: ["About","Blog","Careers","Press","Security"] },
  { title: "Resources",  links: ["Documentation","API Reference","Changelog","Status","Community"] },
  { title: "Contact",    links: ["Support","Sales","Pricing","Partnerships"] },
];

/* ─── reveal hook ───────────────────────────────────────── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ─── Reveal wrapper ────────────────────────────────────── */
function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Arrow icon ─────────────────────────────────────────── */
const ArrowRight = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const PlayIcon = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <path d="M10 8l6 4-6 4V8z" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      
      const xRot = (e.clientY / window.innerHeight - 0.5) * 6;
      const yRot = (e.clientX / window.innerWidth - 0.5) * -6;
      setRotation({ x: xRot, y: yRot });
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .font-display { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        .font-mono-jb { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }

        /* grid background */
        .grid-container {
          position: fixed;
          inset: 0;
          perspective: 1200px;
          pointer-events: none;
          z-index: 0;
        }

        .grid-bg-interactive {
          position: absolute;
          inset: -200px;
          background-image:
            linear-gradient(rgba(56,189,248,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.12) 1px, transparent 1px);
          background-size: 48px 48px;
          transform-style: preserve-3d;
          transition: transform 0.15s ease-out;
        }

        /* The 'Pop' Grid Layer - Extra Intensity on Hover */
        .grid-bg-pop {
          position: absolute;
          inset: -200px;
          background-image:
            linear-gradient(rgba(56,189,248,0.6) 1.5px, transparent 1.5px),
            linear-gradient(90deg, rgba(56,189,248,0.6) 1.5px, transparent 1.5px);
          background-size: 48px 48px;
          transform-style: preserve-3d;
          pointer-events: none;
          z-index: 1;
          filter: drop-shadow(0 0 12px rgba(56,189,248,0.5));
          mask-image: radial-gradient(circle 220px at var(--mouse-x) var(--mouse-y), black, transparent);
          -webkit-mask-image: radial-gradient(circle 220px at var(--mouse-x) var(--mouse-y), black, transparent);
          transition: transform 0.1s ease-out;
        }

        .mouse-glow {
          position: fixed;
          width: 600px; height: 600px;
          background: radial-gradient(circle at center, rgba(56,189,248,0.08) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 2;
          transform: translate(-50%, -50%);
          transition: top 0.1s ease-out, left 0.1s ease-out;
        }

        .hero-glow {
          position: absolute;
          width: 700px; height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .cta-glow {
          position: absolute;
          width: 600px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .step-card-hover::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(56,189,248,0.5), transparent);
          opacity: 0; transition: opacity 0.2s;
        }
        .step-card-hover:hover::before { opacity: 1; }
        .step-card-hover:hover { border-color: rgba(56,189,248,0.25) !important; }

        .brand-glow { box-shadow: 0 0 18px rgba(56,189,248,0.4); }
        .brand-glow-lg { box-shadow: 0 4px 24px rgba(56,189,248,0.4); }

        /* scrollbar */
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.2); border-radius: 3px; }

        @keyframes blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        .blink { animation: blink 2s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen bg-[#06060c] text-[#f4f3ff] overflow-x-hidden relative" style={{ 
        '--mouse-x': `${mousePos.x + window.scrollX + 100}px`, 
        '--mouse-y': `${mousePos.y + window.scrollY + 100}px` 
      }}>
        <div className="grid-container">
          <div 
            className="grid-bg-interactive" 
            style={{ 
              transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` 
            }}
          />
          <div 
            className="grid-bg-pop" 
            style={{ 
              transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) translateZ(30px)` 
            }}
          />
        </div>

        <div 
          className="mouse-glow" 
          style={{ 
            left: mousePos.x, 
            top: mousePos.y 
          }} 
        />
        <nav className={`fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-12 z-50 transition-all duration-300 ${scrolled ? "border-b border-white/[0.09]" : "border-b border-white/[0.06]"} bg-[#06060c]/75 backdrop-blur-xl`}>
          <a href="/" className="flex items-center gap-2.5 font-display text-[18px] font-extrabold tracking-tight text-[#f4f3ff] no-underline">
            <div className="w-[34px] h-[34px] rounded-[9px] bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-base brand-glow">🔭</div>
            RepoVisionAI-FX
          </a>

          <ul className="flex items-center gap-8 list-none">
            <li><a href="/agent" className="text-[13.5px] font-medium text-white/45 hover:text-white no-underline transition-colors">Agent Dashboard</a></li>
            <li><a href="/3d" className="text-[13.5px] font-medium text-white/45 hover:text-white no-underline transition-colors">3D Explorer</a></li>
            <li><a href="/incidents" className="text-[13.5px] font-medium text-white/45 hover:text-white no-underline transition-colors">Incidents Feed</a></li>
            <li><a href="#" className="text-[13.5px] font-medium text-white/45 hover:text-white no-underline transition-colors">Docs</a></li>
          </ul>

          <div className="flex items-center gap-3">
            <a href="/login" className="px-[18px] py-2 rounded-lg border border-white/10 text-white/45 hover:text-white hover:bg-white/5 text-[13.5px] font-medium transition-all no-underline">Log In</a>
            <a href="/signup" className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[13.5px] font-bold no-underline transition-all brand-glow">Get Started →</a>
          </div>
        </nav>

        {/* ══ HERO ═════════════════════════════════════════════ */}
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-12 pt-32 pb-20 z-10">
          <div className="hero-glow" />

          {/* badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/[0.08] font-mono-jb text-[11px] text-sky-400 tracking-widest mb-8 animate-[fadeUp_0.6s_ease_both]">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)] blink" />
            Autonomous Engineering Agent
          </div>

          {/* headline */}
          <h1 className="font-display text-[clamp(44px,7vw,88px)] font-extrabold leading-[1.0] tracking-[-0.03em] text-[#f4f3ff] max-w-[1000px]">
            The AI that builds,<br />
            <span className="text-sky-500">fixes, & visualizes.</span>
          </h1>

          <p className="text-[18px] font-normal text-white/45 max-w-[620px] mt-6 leading-[1.7]">
            RepoVisionAI-FX is an autonomous incident-to-fix platform. It navigates your codebase via 3D graphs and AST analysis to resolve bugs before you even start your meeting.
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-3.5 mt-10">
            <a href="/signup" className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[15px] font-bold no-underline brand-glow-lg hover:-translate-y-0.5 active:scale-95 transition-all">
              Initialize Repository <ArrowRight />
            </a>
            <a href="/agent" className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/10 hover:border-white/20 text-white/45 hover:text-white hover:bg-white/[0.04] text-[15px] font-medium no-underline transition-all">
              <PlayIcon /> View Agent Live
            </a>
          </div>

          {/* social proof */}
          <div className="flex items-center gap-4 mt-12">
            <div className="flex items-center">
              {[["RV","from-sky-500 to-blue-400"],["AI","from-purple-500 to-violet-400"],["FX","from-cyan-500 to-cyan-400"],["EN","from-pink-500 to-rose-400"]].map(([init,grad], i) => (
                <span key={i} className={`w-8 h-8 rounded-full border-2 border-[#06060c] flex items-center justify-center text-[11px] font-bold text-white bg-gradient-to-br ${grad} ${i > 0 ? "-ml-2" : ""}`}>{init}</span>
              ))}
            </div>
            <p className="text-[13px] text-white/25">Trusted by <strong className="text-white/45 font-semibold">Engineering Teams</strong></p>
          </div>

          {/* ── Dashboard mockup ── */}
          <div className="w-full max-w-[960px] mt-16 rounded-2xl border border-white/10 bg-[#0e0e1a] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
            {/* browser bar */}
            <div className="h-11 bg-[#13131f] border-b border-white/[0.07] flex items-center px-4 gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
              <div className="flex-1 mx-4 h-6 rounded-md bg-white/[0.05] border border-white/[0.07] flex items-center px-2.5 font-mono-jb text-[11px] text-white/25">
                app.repovision.ai/dashboard/agents
              </div>
            </div>

            {/* stats row */}
            <div className="grid grid-cols-4 gap-4 p-6">
              {STATS.map(s => (
                <div key={s.label} className="bg-[#0e0e1a] border border-white/[0.07] rounded-xl p-4 text-left">
                  <div className="font-mono-jb text-[10px] text-white/25 uppercase tracking-widest mb-2">{s.label}</div>
                  <div className={`font-display text-[28px] font-extrabold tracking-tight ${s.color}`}>{s.value}</div>
                  <div className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full font-mono-jb text-[10px] font-semibold ${s.badgeCls}`}>{s.badge}</div>
                </div>
              ))}

              {/* incident list */}
              <div className="col-span-4 bg-[#0e0e1a] border border-white/[0.07] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                  <span className="font-mono-jb text-[12px] font-semibold text-[#f4f3ff]">ACTIVE RESOLUTIONS</span>
                  <span className="font-mono-jb text-[11px] text-white/25">Agents working: 4</span>
                </div>
                {INCIDENTS.map((inc, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors ${i < INCIDENTS.length - 1 ? "border-b border-white/[0.07]" : ""}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${inc.sev} shadow-[0_0_6px_currentColor]`} />
                    <span className="flex-1 text-[13px] text-[#f4f3ff] font-medium text-left">{inc.title}</span>
                    <span className="font-mono-jb text-[11px] text-white/25">{inc.time}</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-mono-jb text-[10px] font-semibold ${inc.statusCls}`}>{inc.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══ HOW IT WORKS ═════════════════════════════════════ */}
        <section className="relative z-10 px-12 py-28">
          <div className="max-w-[1160px] mx-auto">
            <Reveal><p className="font-mono-jb text-[11px] text-sky-500 uppercase tracking-[0.1em] mb-4">HOW IT WORKS</p></Reveal>
            <Reveal delay={80}><h2 className="font-display text-[clamp(32px,4vw,52px)] font-extrabold tracking-[-0.03em] leading-[1.1]">Autonomous engineering<br />from ingestion to production.</h2></Reveal>
            <Reveal delay={160}><p className="text-[17px] text-white/45 max-w-[520px] mt-4 leading-[1.7]">A complete loop that understands, reasons, and acts. RepoVisionAI-FX manages the complexity so you can focus on building.</p></Reveal>

            <div className="grid grid-cols-2 gap-8 mt-16 text-left">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 100}>
                  <div className="step-card-hover relative bg-[#0e0e1a] border border-white/[0.07] rounded-2xl p-8 transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
                    <div className="flex items-center gap-3 font-mono-jb text-[11px] text-sky-500 tracking-[0.1em] mb-5">
                      PHASE {s.n}
                      <span className="flex-1 h-px bg-white/[0.07]" />
                    </div>
                    <div className="w-12 h-12 rounded-xl border border-white/10 bg-[#06060c] flex items-center justify-center text-[22px] mb-5">{s.icon}</div>
                    <h3 className="font-display text-[20px] font-bold tracking-tight mb-2.5">{s.title}</h3>
                    <p className="text-[14.5px] text-white/45 leading-[1.7]">{s.desc}</p>
                    <div className="flex flex-wrap gap-2 mt-5">
                      {s.tags.map(t => (
                        <span key={t} className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.07] font-mono-jb text-[11px] text-white/30">{t}</span>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══ FEATURES ═════════════════════════════════════════ */}
        <section className="relative z-10 px-12 py-28 bg-[#0b0b14]">
          <div className="max-w-[1160px] mx-auto">
            <Reveal><p className="font-mono-jb text-[11px] text-sky-500 uppercase tracking-[0.1em] mb-4">CAPABILITIES</p></Reveal>
            <Reveal delay={80}><h2 className="font-display text-[clamp(32px,4vw,52px)] font-extrabold tracking-[-0.03em] leading-[1.1]">Built for the future<br />of engineering teams.</h2></Reveal>

            <Reveal delay={160}>
              <div className="grid grid-cols-3 mt-16 border border-white/[0.07] rounded-2xl overflow-hidden text-left" style={{ gap: "1px", background: "rgba(255,255,255,0.07)" }}>
                {FEATURES.map(f => (
                  <div key={f.title} className="bg-[#0b0b14] hover:bg-[#13131f] transition-colors p-9">
                    <span className="text-[28px] block mb-4">{f.icon}</span>
                    <h3 className="font-display text-[17px] font-bold tracking-tight mb-2.5">{f.title}</h3>
                    <p className="text-[14px] text-white/45 leading-[1.7]">{f.desc}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══ INTEGRATIONS ═════════════════════════════════════ */}
        <section className="relative z-10 px-12 py-28 text-center">
          <div className="max-w-[1160px] mx-auto">
            <Reveal><p className="font-mono-jb text-[11px] text-sky-500 uppercase tracking-[0.1em] mb-4">ECOSYSTEM</p></Reveal>
            <Reveal delay={80}><h2 className="font-display text-[clamp(32px,4vw,52px)] font-extrabold tracking-[-0.03em] leading-[1.1]">Integrates with your<br />existing CI/CD stack.</h2></Reveal>
            <Reveal delay={160}><p className="text-[17px] text-white/45 max-w-[480px] mx-auto mt-4 leading-[1.7]">Connect RepoVisionAI-FX with your source control, ticketing, and monitoring tools.</p></Reveal>

            <Reveal delay={240}>
              <div className="flex flex-wrap justify-center gap-4 mt-14">
                {INTEGRATIONS.map(int => (
                  <div key={int.name} className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#0e0e1a] border border-white/10 hover:border-sky-500/30 hover:bg-sky-500/[0.06] text-[14px] font-medium text-white/45 hover:text-white transition-all cursor-pointer">
                    <span className="text-[18px]">{int.icon}</span>
                    {int.name}
                  </div>
                ))}
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0e0e1a] border border-white/10 hover:border-sky-500/30 hover:bg-sky-500/[0.06] text-[14px] font-medium text-white/45 hover:text-white transition-all cursor-pointer">
                  + 20 more →
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══ CTA ══════════════════════════════════════════════ */}
        <section className="relative z-10 px-12 py-28 text-center">
          <div className="cta-glow" />
          <div className="max-w-[700px] mx-auto relative">
            <Reveal>
              <div className="relative border border-white/10 rounded-3xl p-16 bg-[#0e0e1a] overflow-hidden">
                {/* top shimmer line */}
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(14,165,233,0.5), transparent)" }} />

                <h2 className="font-display text-[clamp(36px,5vw,58px)] font-extrabold tracking-[-0.03em] leading-[1.05] mb-5">
                  Automate your<br />
                  <span className="text-sky-500">Eng Intelligence.</span>
                </h2>
                <p className="text-[16px] text-white/45 leading-[1.7] mb-9">
                  Bring your own codebase or try our demo environment.<br />Experience the next generation of software engineering.
                </p>
                <div className="flex items-center justify-center gap-3.5">
                  <a href="/signup" className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[15px] font-bold no-underline brand-glow-lg hover:-translate-y-0.5 active:scale-95 transition-all">
                    Get Started Free <ArrowRight />
                  </a>
                  <a href="/3d" className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/10 hover:border-white/20 text-white/45 hover:text-white hover:bg-white/[0.04] text-[15px] font-medium no-underline transition-all">
                    Explore Demo 3D
                  </a>
                </div>
                <p className="font-mono-jb text-[12.5px] text-white/25 mt-5">Enterprise Ready · SOC2 Compliant · Secure Ingestion</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══ FOOTER ═══════════════════════════════════════════ */}
        <footer className="relative z-10 border-t border-white/[0.07] bg-[#06060c] px-12 pt-16 pb-10">
          <div className="max-w-[1160px] mx-auto">
            <div className="grid pb-12 border-b border-white/[0.07] text-left" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "48px" }}>
              {/* brand */}
              <div>
                <div className="flex items-center gap-2.5 font-display text-[18px] font-extrabold tracking-tight">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-base brand-glow">🔭</div>
                  RepoVisionAI-FX
                </div>
                <p className="text-[14px] text-white/45 leading-[1.7] mt-3.5 max-w-[240px]">
                  Autonomous incident-to-fix engineering platform. Scale your engineering intelligence with agentic reasoning.
                </p>
              </div>

              {/* link cols */}
              {FOOTER_COLS.map(col => (
                <div key={col.title}>
                  <p className="font-display text-[12px] font-bold tracking-[0.05em] uppercase text-[#f4f3ff] mb-4">{col.title}</p>
                  <ul className="list-none space-y-2.5 p-0">
                    {col.links.map(l => (
                      <li key={l}><a href="#" className="text-[13.5px] text-white/25 hover:text-white no-underline transition-colors">{l}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* bottom row */}
            <div className="flex items-center justify-between pt-8 text-[12.5px] text-white/25">
              <span>© 2026 RepoVisionAI-FX. All rights reserved.</span>
              <div className="flex gap-5">
                {["Terms","Privacy","Status"].map(l => (
                  <a key={l} href="#" className="text-white/25 hover:text-white no-underline transition-colors">{l}</a>
                ))}
              </div>
            </div>

            {/* wordmark */}
            <div className="font-display text-[80px] font-extrabold tracking-[-0.05em] text-white/[0.02] text-center mt-10 leading-none select-none">
              REPOVISION
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}