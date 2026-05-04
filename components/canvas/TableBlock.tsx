'use client';
import { MessageCircle, Trash2, Download } from 'lucide-react';
import { KindChip, PinChip, ActionBtn } from './BlockHeader';

export default function TableBlock({ payload, onAsk, onDelete, kind, pinned }: { payload: any; onAsk?: (q: string) => void; onDelete?: () => void; kind?: string; pinned?: boolean }) {
  const downloadCsv = () => {
    const cols = payload.columns || [];
    const rows = payload.rows || [];
    const csv = [cols.join(','), ...rows.map((r: any[]) => r.map(c => {
      const s = String(c ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(payload.title || 'data').replace(/[^a-z0-9]+/gi, '-')}.csv`;
    a.click();
  };
  return (
    <div className="canvas-block card">
      <div className="block-header">
        <div className="block-header-meta min-w-0">
          <KindChip kind={kind || 'table'} size="xs" />
          {pinned && <PinChip />}
          <div className="block-header-title truncate">{payload.title || 'Table'}</div>
          {payload.rows && <span className="tag !text-[10px]">{payload.rows.length} rows</span>}
        </div>
        <div className="block-header-actions">
          <ActionBtn icon={Download} onClick={downloadCsv} title="Download CSV" />
          <ActionBtn icon={Trash2} onClick={onDelete} title="Delete" danger />
        </div>
      </div>
      <div className="overflow-auto max-h-[320px] rounded-md border border-[var(--color-border)]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[var(--color-panel-2)]">
            <tr>{(payload.columns || []).map((c: string) => <th key={c} className="text-left px-2 py-1.5 font-medium text-[var(--color-text-dim)] border-b border-[var(--color-border)]">{c}</th>)}</tr>
          </thead>
          <tbody>
            {(payload.rows || []).map((r: any[], i: number) => (
              <tr key={i} className="hover:bg-[var(--color-panel-2)]">
                {r.map((c: any, j: number) => <td key={j} className="px-2 py-1 border-b border-[var(--color-border)]/40">{String(c ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {payload.explanation && <div className="mt-2 text-xs text-[var(--color-text-dim)]">{payload.explanation}</div>}
      {onAsk && <button onClick={() => onAsk(`About this table "${payload.title || ''}": `)} className="float-ask"><MessageCircle size={12} /> Ask</button>}
    </div>
  );
}
