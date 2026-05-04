'use client';
import { memo, useEffect, useMemo, useRef } from 'react';
import { Chart, CategoryScale, LinearScale, LineElement, PointElement, LineController, Tooltip, Legend, Filler, Title } from 'chart.js';
import { MessageCircle, Trash2, TrendingUp, TrendingDown, Minus, ShieldCheck, Shield, ShieldAlert } from 'lucide-react';
import { useTheme } from '@/components/ThemeToggle';
import { KindChip, PinChip, ActionBtn } from './BlockHeader';
import { progressiveLineAnimation, hoverPolish, makeAreaGradient } from '@/lib/utils/chart-animations';

Chart.register(CategoryScale, LinearScale, LineElement, PointElement, LineController, Tooltip, Legend, Filler, Title);

function ForecastBlock({ payload, onAsk, onDelete, kind, pinned, animate = true }: { payload: any; onAsk?: (q: string) => void; onDelete?: () => void; kind?: string; pinned?: boolean; animate?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [theme] = useTheme();
  const tickColor = theme === 'light' ? '#5b6373' : '#6b7185';
  const legendColor = theme === 'light' ? '#3b4150' : '#9aa3b6';
  const gridColor = theme === 'light' ? 'rgba(15,15,30,0.06)' : 'rgba(255,255,255,0.04)';
  const tooltipBg = theme === 'light' ? '#ffffff' : '#0c1018';
  const tooltipBorder = theme === 'light' ? '#cbd2dd' : '#2c3346';
  const tooltipText = theme === 'light' ? '#0d1220' : '#e6e9f2';
  const tooltipDim = theme === 'light' ? '#5e6678' : '#9aa3b6';
  useEffect(() => {
    if (!ref.current) return;
    const history = payload.history || [];
    const forecast = payload.forecast || [];
    const labels = [...history.map((h: any) => h.date), ...forecast.map((f: any) => f.date)];
    const histVals = [...history.map((h: any) => h.value), ...forecast.map(() => null)];
    const fcVals = [...history.map(() => null), ...forecast.map((f: any) => f.value)];
    if (history.length > 0) {
      // bridge history → forecast
      const bridge = new Array(history.length - 1).fill(null).concat([history[history.length - 1].value]).concat(forecast.map((f: any) => f.value));
      // adjust: actually use bridge as second dataset
      const bridgeData = new Array(history.length - 1).fill(null);
      bridgeData.push(history[history.length - 1].value);
      forecast.forEach((f: any) => bridgeData.push(f.value));
      // pad for length
      while (bridgeData.length < labels.length) bridgeData.push(null);
      fcVals.length = 0;
      bridgeData.forEach(v => fcVals.push(v as any));
    }

    const lower = [...history.map(() => null), ...forecast.map((f: any) => f.lower ?? null)];
    const upper = [...history.map(() => null), ...forecast.map((f: any) => f.upper ?? null)];

    const c = new Chart(ref.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Confidence band (upper)', data: upper, borderColor: 'transparent', backgroundColor: 'rgba(70,217,255,0.10)', pointRadius: 0, fill: '+1', tension: 0.3 },
          { label: 'Confidence band (lower)', data: lower, borderColor: 'transparent', backgroundColor: 'rgba(70,217,255,0.10)', pointRadius: 0, fill: false, tension: 0.3 },
          {
            label: 'History', data: histVals,
            borderColor: '#7c5cff', backgroundColor: 'rgba(124,92,255,0.18)',
            pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: '#7c5cff',
            pointBorderColor: theme === 'light' ? '#fff' : '#0a0c12', pointBorderWidth: 1.5,
            borderWidth: 2.4, tension: 0.4, fill: false,
          },
          {
            label: 'Forecast', data: fcVals,
            borderColor: '#46d9ff', backgroundColor: 'rgba(70,217,255,0.18)',
            pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: '#46d9ff',
            pointBorderColor: theme === 'light' ? '#fff' : '#0a0c12', pointBorderWidth: 1.5,
            borderWidth: 2.4, tension: 0.4, borderDash: [6, 6], fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: animate ? { duration: 1200, easing: 'easeOutCubic', ...(progressiveLineAnimation(labels.length, Math.min(1500, labels.length * 90)) as any) } : false,
        ...(hoverPolish as any),
        plugins: {
          legend: { labels: { color: legendColor, font: { size: 11 }, filter: (l: any) => !l.text.startsWith('Confidence'), usePointStyle: true, pointStyle: 'circle', boxWidth: 8 } },
          tooltip: {
            backgroundColor: tooltipBg, borderColor: tooltipBorder, borderWidth: 1,
            titleColor: tooltipText, bodyColor: tooltipText, footerColor: tooltipDim,
            padding: 10, displayColors: true, boxPadding: 4,
            animation: { duration: 200, easing: 'easeOutCubic' },
          },
        },
        scales: {
          x: { ticks: { color: tickColor, font: { size: 10 } }, grid: { color: gridColor }, border: { color: tickColor + '20' } as any },
          y: { ticks: { color: tickColor, font: { size: 10 } }, grid: { color: gridColor }, beginAtZero: true, border: { color: tickColor + '20' } as any },
        },
      },
    });

    // Apply gradient backgrounds to history + forecast lines once chartArea is known
    setTimeout(() => {
      if (!c.ctx) return;
      c.data.datasets[2].backgroundColor = makeAreaGradient(c, 'rgba(124,92,255,0.4)', 'rgba(124,92,255,0)');
      c.data.datasets[3].backgroundColor = makeAreaGradient(c, 'rgba(70,217,255,0.4)', 'rgba(70,217,255,0)');
      c.update('none');
    }, 0);

    return () => c.destroy();
  }, [payload, theme, animate]);

  const trend = useMemo(() => {
    const fc = payload.forecast || [];
    const hist = payload.history || [];
    if (fc.length < 2 || hist.length === 0) return { kind: 'flat', delta: 0, pct: 0 };
    const histTail = hist.slice(-3).reduce((s: number, h: any) => s + Number(h.value || 0), 0) / Math.min(3, hist.length);
    const fcAvg = fc.reduce((s: number, f: any) => s + Number(f.value || 0), 0) / fc.length;
    const delta = fcAvg - histTail;
    const pct = histTail > 0 ? delta / histTail : 0;
    if (Math.abs(pct) < 0.05) return { kind: 'flat', delta, pct };
    return { kind: pct > 0 ? 'up' : 'down', delta, pct };
  }, [payload.forecast, payload.history]);

  const confidence = useMemo(() => {
    const r2 = Number(payload.diagnostics?.r2);
    if (isNaN(r2)) return { tier: 'mid', label: 'Moderate' };
    if (r2 >= 0.7) return { tier: 'high', label: 'High confidence' };
    if (r2 >= 0.3) return { tier: 'mid', label: 'Moderate confidence' };
    return { tier: 'low', label: 'Low confidence' };
  }, [payload.diagnostics]);

  const TrendIcon = trend.kind === 'up' ? TrendingUp : trend.kind === 'down' ? TrendingDown : Minus;
  const ConfIcon = confidence.tier === 'high' ? ShieldCheck : confidence.tier === 'mid' ? Shield : ShieldAlert;

  return (
    <div className="canvas-block card relative">
      <div className="block-header">
        <div className="block-header-meta min-w-0">
          <KindChip kind={kind || 'forecast'} size="xs" />
          {pinned && <PinChip />}
          <div className="block-header-title truncate">Demand Forecast</div>
        </div>
        <div className="block-header-actions">
          <ActionBtn icon={Trash2} onClick={onDelete} title="Delete" danger />
        </div>
      </div>
      <div className="block-header-tags mb-3 -mt-1">
        {payload.sku && <span className="tag">{payload.sku}</span>}
        {payload.granularity && <span className="tag">{payload.granularity}</span>}
        {payload.horizon && <span className="tag">+{payload.horizon} steps</span>}
        <span className="tag">method: <code className="text-[10.5px]">{payload.method}</code></span>
        <span className={`trend-badge trend-${trend.kind}`}>
          <TrendIcon size={11} /> {trend.kind === 'up' ? '+' : trend.kind === 'down' ? '' : '±'}{(trend.pct * 100).toFixed(1)}%
        </span>
        <span className={`grade-badge grade-${confidence.tier === 'high' ? 'A' : confidence.tier === 'mid' ? 'B' : 'D'}`}>
          <ConfIcon size={11} /> {confidence.label}
        </span>
      </div>

      <div className="relative" style={{ height: 240 }}>
        <canvas ref={ref} />
      </div>

      {/* Diagnostics grid */}
      {payload.diagnostics && (
        <div className="detail-grid mt-3">
          {payload.diagnostics.r2 != null && <div className="detail-cell"><div className="lbl">R²</div><div className={`val ${payload.diagnostics.r2 < 0 ? 'tone-bad' : ''}`}>{Number(payload.diagnostics.r2).toFixed(3)}</div></div>}
          {payload.diagnostics.rmse != null && <div className="detail-cell"><div className="lbl">RMSE</div><div className="val">{Number(payload.diagnostics.rmse).toFixed(2)}</div></div>}
          {payload.diagnostics.mae != null && <div className="detail-cell"><div className="lbl">MAE</div><div className="val">{Number(payload.diagnostics.mae).toFixed(2)}</div></div>}
          {payload.diagnostics.mape != null && <div className="detail-cell"><div className="lbl">MAPE</div><div className="val">{(Number(payload.diagnostics.mape) * 100).toFixed(1)}%</div></div>}
          {payload.diagnostics.residual_std != null && <div className="detail-cell"><div className="lbl">Resid σ</div><div className="val">{Number(payload.diagnostics.residual_std).toFixed(2)}</div></div>}
        </div>
      )}

      {payload.recommendation && (
        <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-good)] mb-1 flex items-center gap-1.5">
            📦 Inventory recommendation
          </div>
          <div className="text-sm">{payload.recommendation}</div>
        </div>
      )}
      {payload.explanation && <div className="mt-2 text-xs text-[var(--color-text-dim)]">{payload.explanation}</div>}
      {onAsk && <button onClick={() => onAsk(`About this forecast: `)} className="float-ask"><MessageCircle size={12} /> Ask</button>}
    </div>
  );
}

export default memo(ForecastBlock, (prev, next) =>
  prev.payload === next.payload &&
  prev.pinned === next.pinned &&
  prev.animate === next.animate &&
  prev.kind === next.kind,
);
