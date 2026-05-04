'use client';
import {
  BarChart3, Brain, FileText, Hash, Image as ImageIcon,
  Pin, Table2, TrendingUp, Workflow, Trash2, Wand2,
} from 'lucide-react';

export const KIND_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  metric:           { label: 'KPI',         icon: Hash,        color: '#fbbf24', bg: 'rgba(251,191,36,0.14)' },
  chart:            { label: 'Chart',       icon: BarChart3,   color: '#7c5cff', bg: 'rgba(124,92,255,0.14)' },
  table:            { label: 'Table',       icon: Table2,      color: '#46d9ff', bg: 'rgba(70,217,255,0.14)' },
  forecast:         { label: 'Forecast',    icon: TrendingUp,  color: '#34d399', bg: 'rgba(52,211,153,0.14)' },
  model_training:   { label: 'ML Model',    icon: Brain,       color: '#f472b6', bg: 'rgba(244,114,182,0.14)' },
  mermaid:          { label: 'Diagram',     icon: Workflow,    color: '#a78bfa', bg: 'rgba(167,139,250,0.14)' },
  markdown:         { label: 'Note',        icon: FileText,    color: '#9aa3b6', bg: 'rgba(154,163,182,0.14)' },
  image_analysis:   { label: 'Image',       icon: ImageIcon,   color: '#60a5fa', bg: 'rgba(96,165,250,0.14)' },
  generated_image:  { label: 'AI Image',    icon: Wand2,       color: '#ec4899', bg: 'rgba(236,72,153,0.14)' },
};

export function KindChip({ kind, size = 'sm' }: { kind?: string; size?: 'sm' | 'xs' }) {
  if (!kind) return null;
  const meta = KIND_META[kind] || KIND_META.markdown;
  const Icon = meta.icon;
  return (
    <span
      className="kind-badge"
      style={{
        background: meta.bg,
        color: meta.color,
        borderColor: meta.color + '66',
        fontSize: size === 'xs' ? 9 : 9.5,
      }}
    >
      <Icon size={size === 'xs' ? 8 : 9} /> {meta.label}
    </span>
  );
}

export function PinChip() {
  return (
    <span className="kind-badge" style={{ background: 'rgba(251,191,36,0.14)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.4)' }}>
      <Pin size={9} /> Pinned
    </span>
  );
}

export function ActionBtn({ icon: Icon, onClick, title, danger, active }: { icon: any; onClick?: () => void; title?: string; danger?: boolean; active?: boolean }) {
  return (
    <button
      className={`icon-action-btn ${danger ? 'danger' : ''} ${active ? 'active' : ''}`}
      onClick={onClick}
      title={title}
    >
      <Icon size={12} />
    </button>
  );
}
