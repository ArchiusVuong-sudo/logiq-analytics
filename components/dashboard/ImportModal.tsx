'use client';
import { useRef, useState } from 'react';
import { X, Upload, FileSpreadsheet, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { loadKeys } from './SettingsModal';

export default function ImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [tab, setTab] = useState<'csv' | 'image'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const submitCsv = async () => {
    if (!file) return;
    setBusy(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', 'upsert');
      const r = await fetch('/api/import', { method: 'POST', body: fd });
      const j = await r.json();
      setResult(j);
      if (j.ok) onImported();
    } finally { setBusy(false); }
  };

  const submitImage = async () => {
    if (!imageFile) return;
    setBusy(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', imageFile);
      fd.append('instruction', 'Extract any tabular logistics order data with columns: order_id, order_date, delivery_date, carrier, status, sku, product_category, quantity, unit_price_usd, order_value_usd, region, origin_city, destination_city, warehouse, client_id.');
      const k = loadKeys();
      if (k.gemini) fd.append('gemini_key', k.gemini);
      const r = await fetch('/api/image', { method: 'POST', body: fd });
      const j = await r.json();
      setResult(j);
    } finally { setBusy(false); }
  };

  const importExtracted = async () => {
    if (!result?.rows) return;
    setBusy(true);
    try {
      const csv = ['client_id,order_id,order_date,delivery_date,carrier,origin_city,destination_city,status,sku,product_category,quantity,unit_price_usd,order_value_usd,is_promo,promo_discount_pct,region,warehouse']
        .concat(result.rows.map((r: any) => [
          r.client_id || 'CL-IMG', r.order_id || `IMG-${Math.random().toString(36).slice(2, 8)}`, r.order_date,
          r.delivery_date || '', r.carrier, r.origin_city || '', r.destination_city || '',
          r.status, r.sku, r.product_category, r.quantity || 1, r.unit_price_usd || '',
          r.order_value_usd || 0, r.is_promo ? 1 : 0, r.promo_discount_pct || 0, r.region || '', r.warehouse || '',
        ].map(v => String(v).includes(',') ? `"${v}"` : v).join(','))).join('\n');
      const r = await fetch('/api/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ csv, mode: 'upsert' }) });
      const j = await r.json();
      setResult({ ...result, imported: j });
      if (j.ok) onImported();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2"><Upload size={16} className="text-[var(--color-accent)]" /> Import data</h2>
          <button className="btn btn-ghost !px-2 !py-1" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="flex gap-1 mb-4 p-1 rounded-lg bg-[var(--color-bg-2)] w-fit">
          <button onClick={() => setTab('csv')} className={`px-3 py-1.5 rounded text-xs ${tab === 'csv' ? 'bg-[var(--color-panel)] text-[var(--color-text)]' : 'text-[var(--color-text-dim)]'}`}><FileSpreadsheet size={11} className="inline mr-1" /> CSV</button>
          <button onClick={() => setTab('image')} className={`px-3 py-1.5 rounded text-xs ${tab === 'image' ? 'bg-[var(--color-panel)] text-[var(--color-text)]' : 'text-[var(--color-text-dim)]'}`}><ImageIcon size={11} className="inline mr-1" /> Image (Gemini Vision)</button>
        </div>

        {tab === 'csv' && (
          <div className="space-y-3">
            <div className="rounded-lg border-2 border-dashed border-[var(--color-border)] p-6 text-center hover:border-[var(--color-accent)] cursor-pointer" onClick={() => csvRef.current?.click()}>
              <FileSpreadsheet className="mx-auto text-[var(--color-text-dim)] mb-2" />
              <div className="text-sm">{file ? file.name : 'Click to choose a CSV file'}</div>
              <div className="text-[11px] text-[var(--color-text-faint)] mt-1">required columns: order_id, order_date, carrier, status, sku, product_category, quantity, order_value_usd</div>
              <input type="file" hidden ref={csvRef} accept=".csv,text/csv" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <button className="btn btn-primary w-full" onClick={submitCsv} disabled={!file || busy}>
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />} Upsert into orders
            </button>
            {result && result.ok && <div className="text-xs text-[var(--color-good)] flex items-center gap-1.5"><CheckCircle2 size={12} /> Imported {result.inserted} rows.</div>}
            {result && !result.ok && <div className="text-xs text-[var(--color-bad)]">{result.error}</div>}
          </div>
        )}

        {tab === 'image' && (
          <div className="space-y-3">
            <div className="rounded-lg border-2 border-dashed border-[var(--color-border)] p-6 text-center hover:border-[var(--color-accent)] cursor-pointer" onClick={() => imgRef.current?.click()}>
              <ImageIcon className="mx-auto text-[var(--color-text-dim)] mb-2" />
              <div className="text-sm">{imageFile ? imageFile.name : 'Click to choose an image (table screenshot, invoice, shipping doc)'}</div>
              <div className="text-[11px] text-[var(--color-text-faint)] mt-1">Gemini will extract structured rows; you'll review before importing.</div>
              <input type="file" hidden ref={imgRef} accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
            </div>
            <button className="btn btn-primary w-full" onClick={submitImage} disabled={!imageFile || busy}>
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />} Analyze with Gemini
            </button>
            {result?.summary && (
              <div className="card !p-3">
                <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-faint)] mb-1">Summary</div>
                <div className="text-xs">{result.summary}</div>
                {result.rows && result.rows.length > 0 && (
                  <>
                    <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-faint)] mt-2 mb-1">{result.rows.length} extracted rows</div>
                    <div className="overflow-auto max-h-[160px] rounded-md border border-[var(--color-border)]">
                      <table className="w-full text-[10px]">
                        <thead className="bg-[var(--color-panel-2)] sticky top-0">
                          <tr>{Object.keys(result.rows[0]).map((k: string) => <th key={k} className="text-left px-2 py-1 text-[var(--color-text-faint)]">{k}</th>)}</tr>
                        </thead>
                        <tbody>{result.rows.map((r: any, i: number) => (
                          <tr key={i}>{Object.keys(result.rows[0]).map((k: string) => <td key={k} className="px-2 py-0.5 border-b border-[var(--color-border)]/40">{String(r[k] ?? '')}</td>)}</tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <button className="btn btn-primary mt-2 w-full" onClick={importExtracted} disabled={busy}>
                      Import {result.rows.length} rows into Supabase
                    </button>
                    {result.imported?.ok && <div className="text-xs text-[var(--color-good)] mt-2 flex items-center gap-1"><CheckCircle2 size={12} /> Imported {result.imported.inserted} rows.</div>}
                  </>
                )}
              </div>
            )}
            {result && !result.ok && result.error && <div className="text-xs text-[var(--color-bad)]">{result.error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
