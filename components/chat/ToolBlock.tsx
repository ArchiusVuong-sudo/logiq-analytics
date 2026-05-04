'use client';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ToolBlock({ name, input, result, status }: {
  name: string;
  input?: any;
  result?: any;
  status: 'running' | 'done' | 'error';
}) {
  const [open, setOpen] = useState(false);
  const isCanvas = name.startsWith('create_') && name.endsWith('_block');
  return (
    <div className={`my-1.5 text-xs rounded-md ${status === 'error' ? 'tool-error-stripe' : status === 'done' ? 'tool-result-stripe' : 'tool-stripe'}`}>
      <button onClick={() => setOpen(s => !s)} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left">
        {status === 'running' && <Loader2 size={11} className="animate-spin text-[var(--color-accent-2)]" />}
        {status === 'done' && <CheckCircle2 size={11} className="text-[var(--color-good)]" />}
        {status === 'error' && <AlertCircle size={11} className="text-[var(--color-bad)]" />}
        {!isCanvas && <Wrench size={10} className="text-[var(--color-text-faint)]" />}
        <span className="font-mono text-[10px] tracking-wider">{name}</span>
        {isCanvas && <span className="tag !text-[9px] !py-0">canvas</span>}
        <span className="ml-auto text-[var(--color-text-faint)]">{open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}</span>
      </button>
      {open && (
        <div className="px-3 pb-2.5 space-y-1.5">
          {input !== undefined && (
            <div>
              <div className="text-[9px] uppercase text-[var(--color-text-faint)] mb-0.5">input</div>
              <pre className="text-[10px] bg-[var(--color-bg-2)] p-2 rounded overflow-auto max-h-[180px] text-[var(--color-text-dim)]">{JSON.stringify(input, null, 2)}</pre>
            </div>
          )}
          {result !== undefined && (
            <div>
              <div className="text-[9px] uppercase text-[var(--color-text-faint)] mb-0.5">result</div>
              <pre className="text-[10px] bg-[var(--color-bg-2)] p-2 rounded overflow-auto max-h-[180px] text-[var(--color-text-dim)]">{JSON.stringify(result, null, 2).slice(0, 4000)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
