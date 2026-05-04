'use client';
import { memo, useEffect, useRef, useState } from 'react';
import {
  Chart, CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, RadialLinearScale, ScatterController, BarController, LineController,
  PieController, DoughnutController, RadarController, Tooltip, Legend, Filler,
  Title, ChartConfiguration,
} from 'chart.js';
import { Download, Image as ImageIcon, MessageCircle, Pin, Trash2 } from 'lucide-react';
import { useTheme } from '@/components/ThemeToggle';
import { KindChip, PinChip, ActionBtn } from './BlockHeader';
import { chartAnimationFor, hoverPolish, makeAreaGradient } from '@/lib/utils/chart-animations';

Chart.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, RadialLinearScale, ScatterController, BarController, LineController,
  PieController, DoughnutController, RadarController, Tooltip, Legend, Filler, Title,
);

const PALETTE = ['#7c5cff', '#46d9ff', '#34d399', '#fbbf24', '#f87171', '#f472b6', '#a78bfa', '#60a5fa', '#22d3ee', '#84cc16'];

function ChartBlock({ payload, onAsk, onDelete, onPin, pinned, kind, animate = true }: {
  payload: any;
  onAsk?: (q: string) => void;
  onDelete?: () => void;
  onPin?: () => void;
  pinned?: boolean;
  kind?: string;
  animate?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [showExplain, setShowExplain] = useState(false);
  const [theme] = useTheme();
  const tickColor = theme === 'light' ? '#5b6373' : '#6b7185';
  const legendColor = theme === 'light' ? '#3b4150' : '#9aa3b6';
  const gridColor = theme === 'light' ? 'rgba(15,15,30,0.06)' : 'rgba(255,255,255,0.04)';
  const tooltipBg = theme === 'light' ? '#ffffff' : '#0c1018';
  const tooltipBorder = theme === 'light' ? '#cbd2dd' : '#2c3346';
  const tooltipText = theme === 'light' ? '#0d1220' : '#e6e9f2';

  useEffect(() => {
    if (!ref.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    const isPie = payload.type === 'pie' || payload.type === 'doughnut';
    const isLine = payload.type === 'line';
    const isBar = payload.type === 'bar';
    const datasets = (payload.datasets || []).map((d: any, i: number) => {
      const color = PALETTE[i % PALETTE.length];
      const fill = d.fill ?? isLine;
      const base: any = {
        ...d,
        type: payload.type === 'mixed' ? d.type || 'bar' : undefined,
        borderColor: d.borderColor || color,
        borderWidth: isLine ? 2.4 : 1.6,
        fill,
        tension: d.tension ?? 0.4,
        pointBackgroundColor: color,
        pointBorderColor: theme === 'light' ? '#ffffff' : '#0a0c12',
        pointBorderWidth: 1.5,
        pointRadius: isLine ? 3 : 0,
        pointHoverRadius: isLine ? 6 : 0,
        pointHoverBorderWidth: 2,
        pointHitRadius: 14,
        hoverBorderWidth: 3,
        hoverBorderColor: color,
      };
      // Gradient backgrounds: bars get vertical fade; line area gets purple-to-transparent
      if (isPie) {
        base.backgroundColor = d.backgroundColor || PALETTE.slice(0, (payload.labels || []).length);
        base.borderWidth = 2;
        base.borderColor = theme === 'light' ? '#ffffff' : '#11141d';
        base.hoverOffset = 8;
        base.hoverBorderWidth = 3;
      } else if (isLine && fill) {
        // Will be set on `mounted` below via canvas context; default fallback for first paint
        base.backgroundColor = d.backgroundColor || color + '22';
      } else if (isBar) {
        base.backgroundColor = d.backgroundColor || color + 'aa';
        base.hoverBackgroundColor = color;
        base.borderRadius = 6;
        base.borderSkipped = false;
      } else {
        base.backgroundColor = d.backgroundColor || color + '88';
      }
      return base;
    });

    const baseType = payload.type === 'mixed' ? 'bar' : payload.type;
    const pointCount = (payload.labels || []).length;
    const cfg: ChartConfiguration = {
      type: baseType,
      data: { labels: payload.labels || [], datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: animate ? chartAnimationFor(baseType, pointCount) : false,
        ...(hoverPolish as any),
        plugins: {
          legend: {
            labels: { color: legendColor, font: { size: 11 }, usePointStyle: true, pointStyle: 'circle', boxWidth: 8 },
            position: isPie ? 'right' : 'top',
          },
          tooltip: {
            backgroundColor: tooltipBg, borderColor: tooltipBorder, borderWidth: 1,
            titleColor: tooltipText, bodyColor: tooltipText, padding: 10,
            displayColors: true, boxPadding: 4,
            animation: { duration: 200, easing: 'easeOutCubic' },
          },
        },
        scales: isPie ? undefined : {
          x: { ticks: { color: tickColor, font: { size: 10 } }, grid: { color: gridColor }, border: { color: tickColor + '20' } as any },
          y: { ticks: { color: tickColor, font: { size: 10 } }, grid: { color: gridColor }, beginAtZero: true, border: { color: tickColor + '20' } as any },
        },
      },
    };

    chartRef.current = new Chart(ref.current, cfg);

    // Apply gradient backgrounds AFTER chart is mounted (need chartArea)
    if (isLine) {
      datasets.forEach((d: any, i: number) => {
        if (!d.fill) return;
        const c = PALETTE[i % PALETTE.length];
        const grad = makeAreaGradient(chartRef.current!, c + '99', c + '00');
        chartRef.current!.data.datasets[i].backgroundColor = grad;
      });
      chartRef.current.update('none');
    }

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [payload, theme, animate]);

  const downloadPng = () => {
    if (!ref.current) return;
    const url = ref.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(payload.title || 'chart').replace(/[^a-z0-9]+/gi, '-')}.png`;
    a.click();
  };

  const downloadPdf = async () => {
    if (!ref.current) return;
    const { jsPDF } = await import('jspdf');
    const url = ref.current.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    pdf.setFontSize(16);
    pdf.setTextColor(20, 20, 30);
    pdf.text(payload.title || 'Chart', 40, 40);
    if (payload.subtitle) {
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(payload.subtitle, 40, 58);
    }
    pdf.addImage(url, 'PNG', 40, 80, 760, 380);
    if (payload.explanation) {
      pdf.setFontSize(9);
      pdf.setTextColor(60);
      const split = pdf.splitTextToSize(payload.explanation, 720);
      pdf.text(split, 40, 480);
    }
    pdf.save(`${(payload.title || 'chart').replace(/[^a-z0-9]+/gi, '-')}.pdf`);
  };

  return (
    <div ref={wrapRef} className="canvas-block card">
      <div className="block-header">
        <div className="block-header-meta min-w-0">
          <KindChip kind={kind || 'chart'} size="xs" />
          {pinned && <PinChip />}
          <div className="block-header-title truncate">{payload.title || 'Chart'}</div>
        </div>
        <div className="block-header-actions">
          <ActionBtn icon={Pin} onClick={onPin} title={pinned ? 'Unpin' : 'Pin'} active={pinned} />
          <ActionBtn icon={ImageIcon} onClick={downloadPng} title="Download PNG" />
          <ActionBtn icon={Download} onClick={downloadPdf} title="Download PDF" />
          <ActionBtn icon={Trash2} onClick={onDelete} title="Delete" danger />
        </div>
      </div>
      {payload.subtitle && <div className="block-header-subtitle -mt-1.5 mb-2">{payload.subtitle}</div>}

      <div className="relative" style={{ height: 280 }}>
        <canvas ref={ref} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-faint)]">
        {payload.queryPlan?.tools_called?.map((t: string) => <span key={t} className="tag">{t}</span>)}
        {Object.entries(payload.queryPlan?.filters || {}).map(([k, v]: any) => v ? <span key={k} className="tag">{k}={String(v)}</span> : null)}
        {payload.queryPlan?.metric && <span className="tag">metric: {payload.queryPlan.metric}</span>}
        {payload.queryPlan?.granularity && <span className="tag">granularity: {payload.queryPlan.granularity}</span>}
      </div>

      {payload.explanation && (
        <button onClick={() => setShowExplain(s => !s)} className="mt-2 text-[11px] text-[var(--color-accent-2)] hover:underline">
          {showExplain ? 'Hide explanation' : 'Why this chart?'}
        </button>
      )}
      {showExplain && payload.explanation && (
        <div className="mt-2 text-xs text-[var(--color-text-dim)] leading-relaxed">{payload.explanation}</div>
      )}

      {onAsk && (
        <button onClick={() => onAsk(`About the chart "${payload.title}":\n`)} className="float-ask">
          <MessageCircle size={12} /> Ask about this
        </button>
      )}
    </div>
  );
}

export default memo(ChartBlock, (prev, next) =>
  prev.payload === next.payload &&
  prev.pinned === next.pinned &&
  prev.animate === next.animate &&
  prev.kind === next.kind,
);
