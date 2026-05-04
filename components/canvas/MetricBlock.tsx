'use client';
import { MessageCircle, Trash2 } from 'lucide-react';
import { KindChip, PinChip, ActionBtn } from './BlockHeader';

export default function MetricBlock({ payload, onAsk, onDelete, kind, pinned }: { payload: any; onAsk?: (q: string) => void; onDelete?: () => void; kind?: string; pinned?: boolean }) {
  const tone = payload.tone || 'neutral';
  return (
    <div className="canvas-block card relative">
      <div className="block-header">
        <div className="block-header-meta">
          <KindChip kind={kind || 'metric'} size="xs" />
          {pinned && <PinChip />}
        </div>
        <div className="block-header-actions">
          <ActionBtn icon={Trash2} onClick={onDelete} title="Delete" danger />
        </div>
      </div>
      <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-faint)]">{payload.label}</div>
      <div className="text-3xl font-bold mt-1 gradient-text leading-tight">{payload.value}</div>
      {payload.delta && <div className={`mt-1 text-xs tone-${tone}`}>{payload.delta}</div>}
      {payload.sub && <div className="mt-1 text-[11px] text-[var(--color-text-faint)]">{payload.sub}</div>}
      {onAsk && <button onClick={() => onAsk(`About metric "${payload.label}" (${payload.value}): `)} className="float-ask"><MessageCircle size={12} /> Ask</button>}
    </div>
  );
}
