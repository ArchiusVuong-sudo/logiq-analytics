'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Chart, CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, BarController, LineController, PieController, DoughnutController, Tooltip, Legend, Filler, Title,
} from 'chart.js';
import { Boxes, CheckCircle2, Clock, AlertCircle, TrendingUp, Loader2, X, Tag, Bookmark } from 'lucide-react';
import { useTheme } from '@/components/ThemeToggle';
import { barAnimation, progressiveLineAnimation, pieAnimation, hoverPolish, makeAreaGradient } from '@/lib/utils/chart-animations';

const FILTER_PRESETS: { name: string; filters: any }[] = [
  { name: 'Last quarter (Q4 2025)', filters: { start_date: '2025-10-01', end_date: '2025-12-30' } },
  { name: 'Delayed only', filters: { status: 'delayed' } },
  { name: 'EU region', filters: { region: 'EU' } },
  { name: 'US-East region', filters: { region: 'US-E' } },
  { name: 'FedEx carrier', filters: { carrier: 'FedEx' } },
  { name: 'Promo orders', filters: {} }, // placeholder; we don't filter is_promo via UI
];

const FILTER_LABELS: Record<string, string> = {
  region: 'Region',
  carrier: 'Carrier',
  product_category: 'Category',
  status: 'Status',
  start_date: 'From',
  end_date: 'To',
  sku: 'SKU',
  warehouse: 'Warehouse',
};

Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, BarController, LineController, PieController, DoughnutController, Tooltip, Legend, Filler, Title);

const PALETTE = ['#7c5cff', '#46d9ff', '#34d399', '#fbbf24', '#f87171', '#f472b6', '#a78bfa', '#60a5fa'];

export default function Dashboard({ filters, onFilters, onAsk }: { filters: any; onFilters: (f: any) => void; onAsk: (q: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [theme] = useTheme();
  const tickColor = theme === 'light' ? '#5b6373' : '#6b7185';
  const legendColor = theme === 'light' ? '#3b4150' : '#9aa3b6';
  const gridColor = theme === 'light' ? 'rgba(15,15,30,0.06)' : 'rgba(255,255,255,0.04)';
  const tooltipBg = theme === 'light' ? '#ffffff' : '#0c1018';
  const tooltipBorder = theme === 'light' ? '#cbd2dd' : '#2c3346';
  const doughnutBorder = theme === 'light' ? '#ffffff' : '#11141d';

  const carrierRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<HTMLCanvasElement>(null);
  const tsRef = useRef<HTMLCanvasElement>(null);
  const carrierDelayRef = useRef<HTMLCanvasElement>(null);
  const categoryRef = useRef<HTMLCanvasElement>(null);
  const charts = useRef<Chart[]>([]);

  const reload = async () => {
    setLoading(true); setErr(null);
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(filters || {})) if (v) sp.set(k, String(v));
    try {
      const r = await fetch(`/api/dashboard?${sp.toString()}`);
      const j = await r.json();
      if (j.error) setErr(j.error);
      else setData(j);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, [JSON.stringify(filters)]);

  useEffect(() => {
    charts.current.forEach(c => c.destroy());
    charts.current = [];
    if (!data) return;

    const baseOpts = {
      responsive: true,
      maintainAspectRatio: false,
      ...(hoverPolish as any),
      plugins: {
        legend: { labels: { color: legendColor, font: { size: 10 }, usePointStyle: true, pointStyle: 'circle', boxWidth: 7 } },
        tooltip: {
          backgroundColor: tooltipBg, borderColor: tooltipBorder, borderWidth: 1,
          titleColor: theme === 'light' ? '#0d1220' : '#e6e9f2',
          bodyColor: theme === 'light' ? '#0d1220' : '#e6e9f2',
          padding: 10, displayColors: true, boxPadding: 4,
          animation: { duration: 200, easing: 'easeOutCubic' as const },
        },
      },
      scales: {
        x: { ticks: { color: tickColor, font: { size: 9 } }, grid: { color: gridColor }, border: { color: tickColor + '20' } },
        y: { ticks: { color: tickColor, font: { size: 9 } }, grid: { color: gridColor }, beginAtZero: true, border: { color: tickColor + '20' } },
      },
    } as any;

    if (carrierRef.current) {
      charts.current.push(new Chart(carrierRef.current, {
        type: 'bar',
        data: {
          labels: data.byCarrier.buckets.map((b: any) => b.key),
          datasets: [{ label: 'Orders', data: data.byCarrier.buckets.map((b: any) => b.value), backgroundColor: '#7c5cffaa', hoverBackgroundColor: '#7c5cff', borderColor: '#7c5cff', borderWidth: 1.5, borderRadius: 6, borderSkipped: false }],
        },
        options: { ...baseOpts, animation: barAnimation as any },
      }));
    }
    if (statusRef.current) {
      charts.current.push(new Chart(statusRef.current, {
        type: 'doughnut',
        data: {
          labels: data.byStatus.buckets.map((b: any) => b.key),
          datasets: [{ data: data.byStatus.buckets.map((b: any) => b.value), backgroundColor: PALETTE.slice(0, data.byStatus.buckets.length), borderColor: doughnutBorder, borderWidth: 2, hoverOffset: 10, hoverBorderWidth: 3 }],
        },
        options: { ...baseOpts, animation: pieAnimation as any, scales: undefined, plugins: { ...baseOpts.plugins, legend: { ...baseOpts.plugins.legend, position: 'right' } } },
      }));
    }
    if (tsRef.current) {
      const labels = data.ts.labels;
      const datasets = data.ts.series.map((s: any, i: number) => ({
        label: s.name, data: s.data,
        borderColor: PALETTE[i % PALETTE.length], backgroundColor: PALETTE[i % PALETTE.length] + '33',
        fill: true, tension: 0.4, pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: PALETTE[i % PALETTE.length],
        pointBorderColor: theme === 'light' ? '#fff' : '#0a0c12', pointBorderWidth: 1.5, borderWidth: 2.4,
      }));
      const c = new Chart(tsRef.current, {
        type: 'line',
        data: { labels, datasets },
        options: { ...baseOpts, animation: { duration: 1400, easing: 'easeOutCubic', ...(progressiveLineAnimation(labels.length, Math.min(1600, labels.length * 100)) as any) } },
      });
      // gradient fills
      setTimeout(() => {
        datasets.forEach((_: any, i: number) => {
          c.data.datasets[i].backgroundColor = makeAreaGradient(c, PALETTE[i % PALETTE.length] + '88', PALETTE[i % PALETTE.length] + '00');
        });
        c.update('none');
      }, 0);
      charts.current.push(c);
    }
    if (carrierDelayRef.current) {
      charts.current.push(new Chart(carrierDelayRef.current, {
        type: 'bar',
        data: {
          labels: data.carrierDelay.buckets.map((b: any) => b.key),
          datasets: [{ label: 'Delay rate', data: data.carrierDelay.buckets.map((b: any) => b.value * 100), backgroundColor: '#f87171aa', hoverBackgroundColor: '#f87171', borderColor: '#f87171', borderWidth: 1.5, borderRadius: 6, borderSkipped: false }],
        },
        options: {
          ...baseOpts,
          animation: barAnimation as any,
          scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, ticks: { ...baseOpts.scales.y.ticks, callback: (v: any) => v + '%' } } },
        },
      }));
    }
    if (categoryRef.current) {
      charts.current.push(new Chart(categoryRef.current, {
        type: 'bar',
        data: {
          labels: data.byCategory.buckets.map((b: any) => b.key),
          datasets: [{ label: 'Orders', data: data.byCategory.buckets.map((b: any) => b.value), backgroundColor: '#46d9ffaa', hoverBackgroundColor: '#46d9ff', borderColor: '#46d9ff', borderWidth: 1.5, borderRadius: 6, borderSkipped: false }],
        },
        options: { ...baseOpts, animation: barAnimation as any, indexAxis: 'y' as any },
      }));
    }
    return () => { charts.current.forEach(c => c.destroy()); charts.current = []; };
  }, [data, theme]);

  if (loading) return <div className="h-full flex items-center justify-center text-[var(--color-text-faint)]"><Loader2 className="animate-spin mr-2" size={14} /> Loading dashboard…</div>;
  if (err) return <div className="p-4"><div className="card text-sm text-[var(--color-bad)]">{err}</div></div>;
  if (!data) return null;

  const k = data.kpis;
  const activeFilters = Object.entries(filters || {}).filter(([_, v]) => v != null && v !== '');
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-faint)] mr-2">Filters</span>

        <select value={filters.region || ''} onChange={e => onFilters({ ...filters, region: e.target.value || undefined })} className="text-xs">
          <option value="">All regions</option>
          {data.dims.regions.map((r: string) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filters.carrier || ''} onChange={e => onFilters({ ...filters, carrier: e.target.value || undefined })} className="text-xs">
          <option value="">All carriers</option>
          {data.dims.carriers.map((c: string) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.product_category || ''} onChange={e => onFilters({ ...filters, product_category: e.target.value || undefined })} className="text-xs">
          <option value="">All categories</option>
          {data.dims.product_categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.status || ''} onChange={e => onFilters({ ...filters, status: e.target.value || undefined })} className="text-xs">
          <option value="">All statuses</option>
          {data.dims.statuses.map((s: string) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.warehouse || ''} onChange={e => onFilters({ ...filters, warehouse: e.target.value || undefined })} className="text-xs">
          <option value="">All warehouses</option>
          {data.dims.warehouses.map((w: string) => <option key={w} value={w}>{w}</option>)}
        </select>
        <input type="date" value={filters.start_date || ''} onChange={e => onFilters({ ...filters, start_date: e.target.value || undefined })} className="text-xs" />
        <input type="date" value={filters.end_date || ''} onChange={e => onFilters({ ...filters, end_date: e.target.value || undefined })} className="text-xs" />

        <PresetDropdown onApply={(f) => onFilters(f)} />

        {activeFilters.length > 0 && (
          <button className="btn btn-ghost text-xs" onClick={() => onFilters({})}>Clear all</button>
        )}
        <span className="ml-auto text-[11px] text-[var(--color-text-faint)]">{data.dims.total_rows.toLocaleString()} total rows · {data.dims.date_range.min} → {data.dims.date_range.max}</span>
      </div>

      {/* Active filter tags */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag size={11} className="text-[var(--color-text-faint)]" />
          {activeFilters.map(([k, v]) => (
            <button
              key={k}
              onClick={() => onFilters({ ...filters, [k]: undefined })}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border transition group"
              style={{ background: 'rgba(124,92,255,0.10)', borderColor: 'rgba(124,92,255,0.45)', color: 'var(--color-text)' }}
              title="Remove filter"
            >
              <span className="opacity-70">{FILTER_LABELS[k] || k}:</span>
              <strong>{String(v)}</strong>
              <X size={10} className="opacity-50 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Total orders" value={k.total_orders.toLocaleString()} icon={Boxes} tone="neutral" onAsk={onAsk} q={`Explain how the total of ${k.total_orders} orders breaks down by carrier and region.`} />
        <Kpi label="Delivered" value={k.delivered_orders.toLocaleString()} icon={CheckCircle2} tone="good" onAsk={onAsk} q={`Show delivered orders trend over time.`} />
        <Kpi label="Delayed" value={k.delayed_orders.toLocaleString()} icon={AlertCircle} tone="bad" onAsk={onAsk} q={`Why are orders delayed? Break down delay by carrier.`} />
        <Kpi label="On-time rate" value={(k.on_time_delivery_rate * 100).toFixed(1) + '%'} icon={CheckCircle2} tone={k.on_time_delivery_rate >= 0.9 ? 'good' : 'bad'} onAsk={onAsk} q={`How has on-time rate trended monthly?`} />
        <Kpi label="Avg delivery days" value={k.avg_delivery_days.toFixed(1)} icon={Clock} tone="neutral" onAsk={onAsk} q={`Which carriers and regions have the longest avg delivery time?`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DashCard title="Orders over time (by status)" onAsk={() => onAsk('Show orders volume over time, broken down by status.')}>
          <div style={{ height: 240 }}><canvas ref={tsRef} /></div>
        </DashCard>
        <DashCard title="Status breakdown" onAsk={() => onAsk('Show status breakdown and explain delivery quality.')}>
          <div style={{ height: 240 }}><canvas ref={statusRef} /></div>
        </DashCard>
        <DashCard title="Orders by carrier" onAsk={() => onAsk('Which carrier is most used and what is its delay rate?')}>
          <div style={{ height: 240 }}><canvas ref={carrierRef} /></div>
        </DashCard>
        <DashCard title="Carrier delay rate" onAsk={() => onAsk('Which carrier has the highest delay rate? Build a comparison table with rates and order counts.')}>
          <div style={{ height: 240 }}><canvas ref={carrierDelayRef} /></div>
        </DashCard>
        <DashCard title="Orders by product category" onAsk={() => onAsk('Forecast demand for the top 3 product categories for the next 4 months.')}>
          <div style={{ height: 240 }}><canvas ref={categoryRef} /></div>
        </DashCard>
        <DashCard title="Quick forecast launcher" onAsk={() => onAsk('Predict demand for SKU X for the next 4 months — pick a top-selling SKU.')}>
          <div className="space-y-1.5 text-xs">
            <div className="text-[var(--color-text-dim)]">Try asking:</div>
            {[
              'Predict demand for the top SKU for the next 4 months',
              'Train a logistic regression on order_value, quantity, is_promo to predict delay risk',
              'Build a mermaid flow showing the analytics → forecasting query plan',
              'Show me which destinations are most exception-prone',
            ].map(q => (
              <button key={q} onClick={() => onAsk(q)} className="text-left w-full px-2 py-1.5 rounded hover:bg-[var(--color-panel-2)] border border-transparent hover:border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]">→ {q}</button>
            ))}
          </div>
        </DashCard>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, tone, onAsk, q }: { label: string; value: string; icon: any; tone: 'good' | 'bad' | 'neutral'; onAsk: (q: string) => void; q: string }) {
  return (
    <button onClick={() => onAsk(q)} className="card card-hover text-left">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={11} className={`tone-${tone}`} />
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-faint)]">{label}</div>
      </div>
      <div className="text-xl font-bold gradient-text">{value}</div>
    </button>
  );
}

function PresetDropdown({ onApply }: { onApply: (f: any) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="btn btn-ghost text-xs" onClick={() => setOpen(o => !o)} onBlur={() => setTimeout(() => setOpen(false), 150)}>
        <Bookmark size={11} /> Presets
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 card !p-1 min-w-[200px]">
          {FILTER_PRESETS.map(p => (
            <button
              key={p.name}
              onMouseDown={() => { onApply(p.filters); setOpen(false); }}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-[var(--color-panel-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] text-left"
            >
              <Bookmark size={10} /> {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DashCard({ title, children, onAsk }: { title: string; children: React.ReactNode; onAsk?: () => void }) {
  return (
    <div className="canvas-block card relative">
      <div className="text-sm font-semibold mb-2">{title}</div>
      {children}
      {onAsk && <button onClick={onAsk} className="float-ask">💬 Ask the agent</button>}
    </div>
  );
}
