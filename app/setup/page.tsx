'use client';
import { useEffect, useState } from 'react';
import { Check, Copy, Database, ExternalLink, Loader2, RefreshCw, Sparkles, Upload } from 'lucide-react';

export default function SetupPage() {
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);

  const refresh = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/setup');
      setStatus(await r.json());
    } finally { setBusy(false); }
  };

  useEffect(() => { refresh(); }, []);

  const seed = async () => {
    setSeeding(true);
    try {
      const r = await fetch('/api/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'seed_mock' }) });
      const j = await r.json();
      setSeedResult(j);
      await refresh();
    } finally { setSeeding(false); }
  };

  const copy = () => {
    if (!status?.schema_sql) return;
    navigator.clipboard.writeText(status.schema_sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const ref = supaUrl.replace('https://', '').split('.')[0];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="aurora" />
      <div className="relative z-10 w-full max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c5cff, #46d9ff)' }}>
            <Sparkles size={18} className="text-[#06070a]" />
          </div>
          <div>
            <div className="text-xl font-bold gradient-text">LogIQ Setup</div>
            <div className="text-xs text-[var(--color-text-faint)]">Initialize the Supabase schema and seed mock logistics data.</div>
          </div>
        </div>

        <div className="card mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Database size={14} className={status?.schema_ok ? 'text-[var(--color-good)]' : 'text-[var(--color-warn)]'} />
            <div className="font-semibold text-sm">Step 1 — Database schema</div>
            <button onClick={refresh} disabled={busy} className="ml-auto btn btn-ghost"><RefreshCw size={11} className={busy ? 'animate-spin' : ''} /></button>
          </div>
          {status && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px] mb-3">
              {Object.entries(status.tables).map(([k, v]: any) => (
                <div key={k} className={`px-2 py-1.5 rounded-md border ${v ? 'border-[var(--color-good)]/30 bg-[var(--color-good)]/10 text-[var(--color-good)]' : 'border-[var(--color-bad)]/30 bg-[var(--color-bad)]/10 text-[var(--color-bad)]'}`}>
                  {v ? '✓' : '✗'} {k}
                </div>
              ))}
            </div>
          )}
          {!status?.schema_ok && (
            <>
              <div className="text-xs text-[var(--color-text-dim)] mb-2">
                One-time setup: open <a href={`https://supabase.com/dashboard/project/${ref}/sql/new`} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent-2)] hover:underline inline-flex items-center gap-0.5">Supabase SQL Editor <ExternalLink size={10} /></a>, paste the SQL below, and click <strong>Run</strong>.
              </div>
              <div className="relative">
                <pre className="text-[10px] bg-[var(--color-bg-2)] p-3 rounded-lg overflow-auto max-h-[280px] text-[var(--color-text-dim)] border border-[var(--color-border)]">{status?.schema_sql}</pre>
                <button onClick={copy} className="btn btn-ghost absolute top-2 right-2">
                  {copied ? <><Check size={11} className="text-[var(--color-good)]" /> Copied</> : <><Copy size={11} /> Copy SQL</>}
                </button>
              </div>
            </>
          )}
          {status?.schema_ok && (
            <div className="text-xs text-[var(--color-good)] flex items-center gap-1.5"><Check size={12} /> Schema ready ({status.orders_count.toLocaleString()} orders).</div>
          )}
        </div>

        {status?.schema_ok && (
          <div className="card mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Upload size={14} className="text-[var(--color-accent-2)]" />
              <div className="font-semibold text-sm">Step 2 — Seed sample data</div>
            </div>
            <div className="text-xs text-[var(--color-text-dim)] mb-3">Bootstrap the dataset with the bundled mock logistics CSV (400 orders).</div>
            <button onClick={seed} disabled={seeding} className="btn btn-primary">
              {seeding ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Seed mock dataset
            </button>
            {seedResult && seedResult.ok && <div className="mt-2 text-xs text-[var(--color-good)]">✓ Seeded {seedResult.inserted} rows.</div>}
            {seedResult && !seedResult.ok && <div className="mt-2 text-xs text-[var(--color-bad)]">{seedResult.error}</div>}
            <div className="text-[11px] text-[var(--color-text-faint)] mt-2">You can also import any CSV later from the Workspace's Import button.</div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <a href="/workspace" className="text-xs text-[var(--color-accent-2)] hover:underline">← Skip to Workspace</a>
          {status?.schema_ok && status.orders_count > 0 && (
            <a href="/workspace" className="btn btn-primary">Continue to Workspace →</a>
          )}
        </div>
      </div>
    </div>
  );
}
