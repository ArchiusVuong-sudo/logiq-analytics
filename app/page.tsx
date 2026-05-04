'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight, BarChart3, Brain, Database, Image as ImageIcon, Sparkles,
  Workflow, Wrench, Layers, Zap, MessageSquare, FileText, Activity,
  TrendingUp, ShieldCheck, GripVertical, MousePointer2, Github,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { Reveal, CountUp, Particles, Spotlight, Sparkline } from '@/components/landing/Reveal';

const FEATURES = [
  {
    icon: Brain,
    title: 'Claude Agent SDK',
    color: '#7c5cff',
    desc: 'Tool-using agent loop with structured JSON-Schema tools. The AI orchestrates, never fabricates.',
  },
  {
    icon: BarChart3,
    title: 'Dynamic charts',
    color: '#46d9ff',
    desc: 'Chart.js + Mermaid. Bar, line, doughnut, scatter, ROC, confusion matrices — all picked by the agent.',
  },
  {
    icon: TrendingUp,
    title: 'Forecasting suite',
    color: '#34d399',
    desc: 'Moving avg, linear regression, exponential smoothing, Holt linear. Confidence bands + inventory recs.',
  },
  {
    icon: Sparkles,
    title: 'Self-trained ML',
    color: '#f472b6',
    desc: 'In-process logistic regression with full diagnostics: ROC, AUC, F1, feature importance, loss curve.',
  },
  {
    icon: ImageIcon,
    title: 'Vision import',
    color: '#60a5fa',
    desc: 'Upload an image of a shipping doc; Claude orchestrates Gemini Vision to extract rows for import.',
  },
  {
    icon: Layers,
    title: 'Persistent canvas',
    color: '#a78bfa',
    desc: 'Multi-block canvas with kind chips, drag-and-drop reorder, filters, and PDF export.',
  },
  {
    icon: Workflow,
    title: 'Reasoning steps',
    color: '#fbbf24',
    desc: 'Every tool call is visible in the chat — input, result, status, duration. No black box.',
  },
  {
    icon: Database,
    title: 'Supabase backed',
    color: '#22d3ee',
    desc: 'Read-only orders table + persisted threads, messages, canvas blocks, trained models.',
  },
];

const HOW = [
  {
    step: '01',
    title: 'Ask anything',
    desc: '"Which carrier has the highest delay rate?" or "Forecast CRAYON demand for the next 4 months."',
    icon: MessageSquare,
  },
  {
    step: '02',
    title: 'Agent calls tools',
    desc: 'Claude picks from 17 typed tools — analytics, ML training, forecasting, canvas-emit. You see every step.',
    icon: Wrench,
  },
  {
    step: '03',
    title: 'Canvas populates',
    desc: 'Charts, forecasts, ML training reports, mermaid diagrams stream onto the canvas with rich metrics.',
    icon: Layers,
  },
];

const SAMPLE_PROMPTS = [
  { q: 'Which carrier has the highest delay rate?',                        tag: 'diagnostic' },
  { q: 'Show delayed orders by week for the last 3 months',                tag: 'descriptive' },
  { q: 'Predict demand for CRAYON for the next 4 months',                  tag: 'forecast' },
  { q: 'Train a logistic regression to predict delay risk',                tag: 'ml' },
  { q: 'Compare on-time rate across regions',                              tag: 'descriptive' },
  { q: 'Build a mermaid flowchart of the analytics → forecasting plan',    tag: 'visualize' },
];

export default function Landing() {
  const [orders, setOrders] = useState<number | null>(null);
  const [schemaOk, setSchemaOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/setup').then(r => r.json()).then(j => {
      setSchemaOk(!!j.schema_ok);
      setOrders(j.orders_count || 0);
    }).catch(() => {});
  }, []);

  const goTo = (q: string) => `/workspace?prompt=${encodeURIComponent(q)}`;

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      {/* aurora — anchored to the top of the page; not fixed (avoids scroll repaints) */}
      <div className="aurora pointer-events-none absolute top-0 left-0 right-0" style={{ height: 1100, zIndex: 0 }} />
      {/* Subtle particle dust limited to hero region */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: 900, zIndex: 0 }}>
        <Particles count={8} />
      </div>

      {/* Nav */}
      <header className="relative z-10 px-6 md:px-10 py-4 flex items-center justify-between max-w-[1400px] mx-auto">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="logo-glow w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c5cff, #46d9ff)' }}>
            <Sparkles size={15} className="text-[#06070a] group-hover:rotate-12 transition-transform" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">LogIQ</div>
            <div className="text-[10px] text-[var(--color-text-faint)] leading-tight">Logistics AI Analyst</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--color-text-dim)]">
          <a href="#features" className="hover:text-[var(--color-text)]">Features</a>
          <a href="#how" className="hover:text-[var(--color-text)]">How it works</a>
          <a href="#prompts" className="hover:text-[var(--color-text)]">Try it</a>
          <Link href="/workspace" className="hover:text-[var(--color-text)]">Workspace</Link>
          <Link href="/setup" className="hover:text-[var(--color-text)]">Setup</Link>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/workspace" className="btn btn-primary">
            Open app <ArrowRight size={13} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-10 pt-16 pb-24 max-w-[1100px] mx-auto text-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass mb-6">
            <span className="status-ring" />
            <span className="text-[11px] text-[var(--color-text-dim)]">
              {schemaOk == null ? 'Connecting…' : schemaOk
                ? <>Connected · <strong className="text-[var(--color-text)]"><CountUp to={orders || 0} /></strong> orders in Supabase</>
                : <>Database not initialized — <Link href="/setup" className="underline">setup</Link></>}
            </span>
          </div>
        </Reveal>

        <Reveal delay={1}>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            The AI <span className="gradient-text-anim">analyst</span> for your<br />logistics data.
          </h1>
        </Reveal>

        <Reveal delay={2}>
          <p className="text-lg md:text-xl text-[var(--color-text-dim)] max-w-2xl mx-auto leading-relaxed">
            Ask questions in plain English. Get charts, forecasts, and trained models — every number traceable to a structured tool call. No fabrication.
          </p>
        </Reveal>

        <Reveal delay={3}>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/workspace" className="btn btn-primary !px-5 !py-2.5 !text-sm cta-pulse">
              Open Workspace <ArrowRight size={14} />
            </Link>
            <Link href="/workspace?view=dashboard" className="btn btn-ghost !px-5 !py-2.5 !text-sm">
              <Activity size={14} /> View Dashboard
            </Link>
            <a href="#prompts" className="btn btn-ghost !px-5 !py-2.5 !text-sm">
              <Sparkles size={14} /> Try a sample prompt
            </a>
          </div>
        </Reveal>

        {/* Hero preview card */}
        <Reveal delay={4}>
          <Spotlight className="mt-16 max-w-[920px] mx-auto float-y rounded-2xl">
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl opacity-60 blur-2xl"
                   style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.5), rgba(70,217,255,0.4))' }} />
              <div className="relative card !p-0 overflow-hidden border border-[var(--color-border-2)]">
                <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-2)] flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="ml-3 text-[11px] text-[var(--color-text-faint)] font-mono">localhost:3010 / workspace</div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="kind-badge" style={{ background: 'rgba(244,114,182,0.14)', color: '#f472b6', borderColor: 'rgba(244,114,182,0.4)' }}>
                      <Brain size={9} /> ML MODEL
                    </span>
                    <span className="kind-badge" style={{ background: 'rgba(52,211,153,0.14)', color: '#34d399', borderColor: 'rgba(52,211,153,0.4)' }}>
                      <TrendingUp size={9} /> FORECAST
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 text-left">
                  <PreviewMetric icon={ShieldCheck} label="On-time rate" value="84.7%" tone="good" />
                  <PreviewMetric icon={Activity} label="Delay rate" value="15.3%" tone="bad" />
                  <div className="rounded-lg p-3" style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 size={11} className="tone-neutral" />
                      <div className="text-[9.5px] uppercase tracking-wider text-[var(--color-text-faint)]">Orders by carrier</div>
                    </div>
                    <div className="mini-bars">
                      <div className="bar" /><div className="bar" /><div className="bar" /><div className="bar" />
                      <div className="bar" /><div className="bar" /><div className="bar" /><div className="bar" />
                    </div>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp size={11} className="tone-neutral" />
                      <div className="text-[9.5px] uppercase tracking-wider text-[var(--color-text-faint)]">CRAYON forecast (4 mo)</div>
                    </div>
                    <Sparkline values={[12, 9, 15, 22, 18, 24, 21, 28, 26, 31, 29, 34]} />
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-2)] flex items-center gap-3 text-[11px] text-[var(--color-text-dim)]">
                  <Wrench size={11} /><span><strong>5</strong> tools</span>
                  <span className="opacity-30">|</span>
                  <Layers size={11} /><span><strong>11</strong> blocks</span>
                  <span className="opacity-30">|</span>
                  <Zap size={11} /><span><strong>12.3s</strong></span>
                  <span className="ml-auto text-[var(--color-accent-2)] streaming-cursor" style={{ minWidth: 10 }}>&nbsp;</span>
                </div>
              </div>
            </div>
          </Spotlight>
        </Reveal>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-6 md:px-10 py-20 max-w-[1200px] mx-auto">
        <Reveal>
          <div className="text-center mb-14">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent-2)] mb-2">What it does</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Eight things, done well.</h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const delay = ((i % 4) + 1) as 1 | 2 | 3 | 4;
            return (
              <Reveal key={f.title} delay={delay}>
                <div className="card hover-lift !p-5 h-full">
                  <div className="icon-tile w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                       style={{ background: f.color + '22', border: `1px solid ${f.color}44` }}>
                    <Icon size={18} style={{ color: f.color }} />
                  </div>
                  <div className="text-sm font-semibold mb-1.5">{f.title}</div>
                  <div className="text-xs text-[var(--color-text-dim)] leading-relaxed">{f.desc}</div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 px-6 md:px-10 py-20 max-w-[1200px] mx-auto">
        <Reveal>
          <div className="text-center mb-14">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent-2)] mb-2">How it works</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Tools first, words second.</h2>
            <p className="text-sm text-[var(--color-text-dim)] mt-3 max-w-xl mx-auto">
              Every figure on screen comes from a real tool call against Supabase or a deterministic ML routine. The AI selects the path; humans audit the input.
            </p>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {HOW.map((h, i) => {
            const Icon = h.icon;
            const delay = (i + 1) as 1 | 2 | 3;
            return (
              <Reveal key={h.step} delay={delay}>
                <div className="card hover-lift !p-6 relative overflow-hidden h-full">
                  <div className="step-number-ghost absolute top-3 right-4 text-5xl">{h.step}</div>
                  <div className="icon-tile w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                       style={{ background: 'rgba(70,217,255,0.10)', border: '1px solid rgba(70,217,255,0.3)' }}>
                    <Icon size={17} className="text-[var(--color-accent-2)]" />
                  </div>
                  <div className="text-base font-semibold mb-1.5">{h.title}</div>
                  <div className="text-xs text-[var(--color-text-dim)] leading-relaxed">{h.desc}</div>
                  {i < HOW.length - 1 && (
                    <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                      <div className="w-6 h-6 rounded-full glass flex items-center justify-center">
                        <ArrowRight size={11} className="text-[var(--color-accent-2)]" />
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Try it now */}
      <section id="prompts" className="relative z-10 px-6 md:px-10 py-20 max-w-[1100px] mx-auto">
        <Reveal>
          <div className="text-center mb-14">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent-2)] mb-2">Try it</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Click any prompt to launch.</h2>
            <p className="text-sm text-[var(--color-text-dim)] mt-3">Each one opens the workspace with the prompt pre-filled.</p>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SAMPLE_PROMPTS.map((p, i) => {
            const delay = ((i % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
            return (
              <Reveal key={p.q} delay={delay}>
                <Link href={goTo(p.q)} className="group card link-card flex items-start gap-3 !p-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 icon-tile"
                       style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.18), rgba(70,217,255,0.18))', border: '1px solid var(--color-border)' }}>
                    <Sparkles size={14} className="text-[var(--color-accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--color-text)] leading-snug">{p.q}</div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="kind-badge" style={{ background: 'rgba(70,217,255,0.10)', color: '#46d9ff', borderColor: 'rgba(70,217,255,0.35)' }}>
                        {p.tag}
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={14} className="arrow-icon text-[var(--color-text-faint)] mt-1" />
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Bullet capabilities */}
      <section className="relative z-10 px-6 md:px-10 py-20 max-w-[1100px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent-2)] mb-2">Power user features</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Designed for real analysis.</h2>
            <ul className="space-y-3 text-sm text-[var(--color-text-dim)]">
              <Bullet icon={GripVertical} text="Drag-and-drop blocks to rearrange the canvas." />
              <Bullet icon={MousePointer2} text="Hover any block, click ‘Ask about this’ to chain a follow-up." />
              <Bullet icon={ImageIcon} text="Drop an image of a shipping doc and Gemini extracts rows for import." />
              <Bullet icon={Brain} text="Self-creating models: pick target + features at runtime, watch training visualize live." />
              <Bullet icon={ShieldCheck} text="Performance grade (A/B/C/D) on every model. Trend + confidence on every forecast." />
              <Bullet icon={FileText} text="Export individual charts to PNG/PDF, or the full canvas to a multi-page report." />
            </ul>
          </Reveal>
          <Reveal delay={2} className="relative">
            <div className="absolute -inset-1 rounded-2xl opacity-50 blur-2xl"
                 style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.4), rgba(70,217,255,0.3))' }} />
            <div className="relative card !p-5">
              <div className="block-header">
                <div className="block-header-meta">
                  <span className="kind-badge" style={{ background: 'rgba(244,114,182,0.14)', color: '#f472b6', borderColor: 'rgba(244,114,182,0.4)' }}>
                    <Brain size={9} /> ML MODEL
                  </span>
                  <div className="block-header-title">Delay Risk Predictor</div>
                </div>
                <span className="grade-badge grade-D">D · Weak</span>
              </div>
              <div className="block-header-tags mb-3 -mt-1">
                <span className="tag">logistic_regression</span>
                <span className="tag">7 features</span>
                <span className="tag">359 samples</span>
              </div>
              <div className="detail-grid">
                <div className="detail-cell"><div className="lbl">accuracy</div><div className="val">84.7%</div></div>
                <div className="detail-cell"><div className="lbl">f1</div><div className="val">0.0%</div></div>
                <div className="detail-cell"><div className="lbl">auc</div><div className="val">57.5%</div></div>
                <div className="detail-cell"><div className="lbl">samples</div><div className="val">359</div></div>
              </div>
              <div className="mt-3 text-[11px] text-[var(--color-text-faint)]">
                <Wrench size={9} className="inline mr-1" /> 5 tools · <Layers size={9} className="inline mx-1" /> 11 blocks · <Zap size={9} className="inline mx-1" /> 12.3s
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-6 md:px-10 py-24 max-w-[900px] mx-auto text-center">
        <Reveal>
          <Spotlight className="card !p-10 rounded-xl">
            <div className="absolute inset-0 opacity-50 pointer-events-none"
                 style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,92,255,0.18), transparent 60%)' }} />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Ready to <span className="gradient-text-anim">talk to your data</span>?
              </h2>
              <p className="text-sm text-[var(--color-text-dim)] mb-7">
                The dataset is loaded. The agent is online. Ask anything.
              </p>
              <Link href="/workspace" className="btn btn-primary !px-6 !py-3 !text-sm cta-pulse">
                Launch workspace <ArrowRight size={14} />
              </Link>
            </div>
          </Spotlight>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 md:px-10 py-8 border-t border-[var(--color-border)] mt-10">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-faint)]">
          <div className="flex items-center gap-2">
            <Sparkles size={11} className="text-[var(--color-accent)]" />
            LogIQ — Logistics AI Analyst · built with Claude Sonnet 4.5 + Gemini 2.5 + Supabase
          </div>
          <div className="flex items-center gap-4">
            <Link href="/setup" className="hover:text-[var(--color-text)]">Setup</Link>
            <Link href="/workspace" className="hover:text-[var(--color-text)]">Workspace</Link>
            <a href="https://github.com/anthropics/claude-code" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-text)] inline-flex items-center gap-1">
              <Github size={11} /> Source
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function PreviewMetric({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: 'good' | 'bad' | 'neutral' }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={11} className={`tone-${tone}`} />
        <div className="text-[9.5px] uppercase tracking-wider text-[var(--color-text-faint)]">{label}</div>
      </div>
      <div className="text-2xl font-bold gradient-text leading-none">{value}</div>
    </div>
  );
}

function Bullet({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
           style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-border)' }}>
        <Icon size={11} className="text-[var(--color-accent-2)]" />
      </div>
      <span>{text}</span>
    </li>
  );
}
