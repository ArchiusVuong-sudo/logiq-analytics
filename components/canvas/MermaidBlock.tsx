'use client';
import { memo, useEffect, useRef } from 'react';
import { MessageCircle, Trash2 } from 'lucide-react';
import { useTheme } from '@/components/ThemeToggle';
import { KindChip, PinChip, ActionBtn } from './BlockHeader';

let mermaidLib: any = null;
async function getMermaid() {
  if (!mermaidLib) {
    const m = await import('mermaid');
    mermaidLib = m.default;
  }
  return mermaidLib;
}

function MermaidBlock({ payload, onAsk, onDelete, kind, pinned }: { payload: any; onAsk?: (q: string) => void; onDelete?: () => void; kind?: string; pinned?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [theme] = useTheme();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const m = await getMermaid();
      const dark = theme !== 'light';
      m.initialize({
        startOnLoad: false,
        theme: dark ? 'dark' : 'default',
        themeVariables: dark ? {
          primaryColor: '#7c5cff', primaryTextColor: '#e6e9f2', primaryBorderColor: '#46d9ff',
          lineColor: '#46d9ff', secondaryColor: '#161b27', tertiaryColor: '#0c1018',
          background: '#0c1018', mainBkg: '#161b27', textColor: '#e6e9f2',
        } : {
          primaryColor: '#dbe2ff', primaryTextColor: '#0d1220', primaryBorderColor: '#6e3bff',
          lineColor: '#0aaad0', secondaryColor: '#f3f5fa', tertiaryColor: '#ffffff',
          background: '#ffffff', mainBkg: '#f3f5fa', textColor: '#0d1220',
        },
      });
      const id = `m_${Math.random().toString(36).slice(2, 9)}`;
      try {
        const { svg } = await m.render(id, payload.code);
        if (!mounted) return;
        if (ref.current) ref.current.innerHTML = svg;
      } catch (e: any) {
        if (ref.current) ref.current.innerHTML = `<div style="color:#f87171;font-size:12px">Mermaid error: ${e?.message || e}</div>`;
      }
    })();
    return () => { mounted = false; };
  }, [payload.code, theme]);

  return (
    <div className="canvas-block card">
      <div className="block-header">
        <div className="block-header-meta min-w-0">
          <KindChip kind={kind || 'mermaid'} size="xs" />
          {pinned && <PinChip />}
          <div className="block-header-title truncate">{payload.title || 'Diagram'}</div>
        </div>
        <div className="block-header-actions">
          <ActionBtn icon={Trash2} onClick={onDelete} title="Delete" danger />
        </div>
      </div>
      <div ref={ref} className="overflow-auto" />
      {onAsk && (
        <button onClick={() => onAsk(`About this diagram: `)} className="float-ask">
          <MessageCircle size={12} /> Ask
        </button>
      )}
    </div>
  );
}

export default memo(MermaidBlock, (prev, next) =>
  prev.payload === next.payload &&
  prev.pinned === next.pinned &&
  prev.kind === next.kind,
);
