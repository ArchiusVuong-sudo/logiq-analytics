'use client';
import { memo, useState } from 'react';
import { Image as ImageIcon, Trash2, MessageCircle, Upload } from 'lucide-react';
import { KindChip, PinChip, ActionBtn } from './BlockHeader';

function ImageAnalysisBlock({ payload, onAsk, onDelete, onImport, kind, pinned }: { payload: any; onAsk?: (q: string) => void; onDelete?: () => void; onImport?: (rows: any[]) => void; kind?: string; pinned?: boolean }) {
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<null | string>(null);
  const rows = payload.suggestedImport?.rows || payload.structured?.rows || [];

  const doImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    try {
      const csv = ['client_id,order_id,order_date,delivery_date,carrier,origin_city,destination_city,status,sku,product_category,quantity,unit_price_usd,order_value_usd,is_promo,promo_discount_pct,region,warehouse']
        .concat(rows.map((r: any) => [
          r.client_id || 'CL-IMG',
          r.order_id,
          r.order_date,
          r.delivery_date || '',
          r.carrier,
          r.origin_city || '',
          r.destination_city || '',
          r.status,
          r.sku,
          r.product_category,
          r.quantity || 1,
          r.unit_price_usd || '',
          r.order_value_usd || 0,
          r.is_promo ? 1 : 0,
          r.promo_discount_pct || 0,
          r.region || '',
          r.warehouse || '',
        ].map(v => String(v).includes(',') ? `"${v}"` : v).join(',')))
        .join('\n');
      const res = await fetch('/api/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ csv, mode: 'upsert' }) });
      const j = await res.json();
      if (j.ok) setDone(`Imported ${j.inserted} rows`);
      else setDone(`Error: ${j.error}`);
    } catch (e: any) {
      setDone(`Error: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="canvas-block card relative">
      <div className="block-header">
        <div className="block-header-meta min-w-0">
          <KindChip kind={kind || 'image_analysis'} size="xs" />
          {pinned && <PinChip />}
          <div className="block-header-title truncate">Image analysis</div>
        </div>
        <div className="block-header-actions">
          <ActionBtn icon={Trash2} onClick={onDelete} title="Delete" danger />
        </div>
      </div>
      {payload.imageUrl && <img src={payload.imageUrl} alt="" className="max-h-[180px] rounded-lg border border-[var(--color-border)] mb-3" />}
      <div className="text-xs text-[var(--color-text-dim)] leading-relaxed whitespace-pre-wrap">{payload.analysis}</div>
      {rows.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-faint)] mb-1">Extracted rows ({rows.length})</div>
          <div className="overflow-auto max-h-[160px] rounded-md border border-[var(--color-border)]">
            <table className="w-full text-[10px]">
              <thead className="bg-[var(--color-panel-2)] sticky top-0">
                <tr>{Object.keys(rows[0]).map((k: string) => <th key={k} className="text-left px-2 py-1 text-[var(--color-text-faint)]">{k}</th>)}</tr>
              </thead>
              <tbody>{rows.slice(0, 30).map((r: any, i: number) => (
                <tr key={i}>{Object.keys(rows[0]).map((k: string) => <td key={k} className="px-2 py-0.5 border-b border-[var(--color-border)]/40">{String(r[k] ?? '')}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
          <button className="btn btn-primary mt-3" onClick={doImport} disabled={importing}>
            <Upload size={12} /> {importing ? 'Importing…' : `Import ${rows.length} rows`}
          </button>
          {done && <div className="mt-2 text-xs text-[var(--color-good)]">{done}</div>}
        </div>
      )}
      {onAsk && <button onClick={() => onAsk(`About this image analysis: `)} className="float-ask"><MessageCircle size={12} /> Ask</button>}
    </div>
  );
}

export default memo(ImageAnalysisBlock, (prev, next) =>
  prev.payload === next.payload &&
  prev.pinned === next.pinned &&
  prev.kind === next.kind,
);
