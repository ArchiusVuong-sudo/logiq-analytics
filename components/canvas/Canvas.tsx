'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import ChartBlock from './ChartBlock';
import MermaidBlock from './MermaidBlock';
import TableBlock from './TableBlock';
import MetricBlock from './MetricBlock';
import ForecastBlock from './ForecastBlock';
import ModelTrainingBlock from './ModelTrainingBlock';
import MarkdownBlock from './MarkdownBlock';
import ImageAnalysisBlock from './ImageAnalysisBlock';
import GeneratedImageBlock from './GeneratedImageBlock';
import {
  Hash, Layers, Pin, Filter, ArrowUpDown, GitBranch, GripVertical, FileText, Loader2,
} from 'lucide-react';
import { KIND_META } from './BlockHeader';

export type Block = { id: string; kind: string; payload: any; pinned?: boolean; freshAt?: number; created_at?: string };

type SortMode = 'natural' | 'pinned-first' | 'newest' | 'oldest' | 'kind';

export default function Canvas({ blocks, onAsk, onDelete, onPin, onExportPdf, onReorder, loading = false }: {
  blocks: Block[];
  onAsk: (q: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onExportPdf: () => void;
  onReorder?: (orderedIds: string[]) => void;
  loading?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [kindFilter, setKindFilter] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>('pinned-first');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of blocks) m[b.kind] = (m[b.kind] || 0) + 1;
    return m;
  }, [blocks]);

  const visible = useMemo(() => {
    let arr = blocks.slice();
    if (kindFilter.size > 0) arr = arr.filter(b => kindFilter.has(b.kind));
    if (sortMode === 'pinned-first') arr.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    else if (sortMode === 'newest') arr.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    else if (sortMode === 'oldest') arr.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    else if (sortMode === 'kind') arr.sort((a, b) => a.kind.localeCompare(b.kind));
    return arr;
  }, [blocks, kindFilter, sortMode]);

  useEffect(() => {
    if (autoScroll && ref.current && sortMode === 'natural') ref.current.scrollTop = ref.current.scrollHeight;
  }, [blocks.length, autoScroll, sortMode]);

  const toggleKind = (k: string) => {
    setKindFilter(prev => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const onDragOver = (e: React.DragEvent, id: string) => {
    if (!dragId || dragId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetId(id);
  };
  const onDragEnd = () => { setDragId(null); setDropTargetId(null); };
  const onDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId || !onReorder) { onDragEnd(); return; }
    const ids = blocks.map(b => b.id);
    const fromIdx = ids.indexOf(dragId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) { onDragEnd(); return; }
    const next = ids.slice();
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, dragId);
    onReorder(next);
    onDragEnd();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-2)]">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-[var(--color-text-dim)]" />
          <div className="text-sm font-medium">Canvas</div>
          <span className="tag">{visible.length}<span className="opacity-60">/{blocks.length}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <SortDropdown value={sortMode} onChange={setSortMode} />
          <label className="text-[11px] text-[var(--color-text-faint)] flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="!p-0 !h-3 !w-3" />
            auto-scroll
          </label>
          <button className="btn btn-ghost" onClick={onExportPdf}><FileText size={12} /> Export PDF</button>
        </div>
      </div>

      {/* Filter chips */}
      {Object.keys(counts).length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-bg)] overflow-x-auto">
          <Filter size={11} className="text-[var(--color-text-faint)] shrink-0" />
          {(Object.entries(counts) as [string, number][])
            .sort((a, b) => b[1] - a[1])
            .map(([k, c]) => {
              const meta = KIND_META[k] || { label: k, icon: Hash, color: '#9aa3b6', bg: 'rgba(154,163,182,0.14)' };
              const Icon = meta.icon;
              const active = kindFilter.has(k);
              return (
                <button
                  key={k}
                  onClick={() => toggleKind(k)}
                  className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition border ${active ? '' : 'opacity-70 hover:opacity-100'}`}
                  style={{
                    background: active ? meta.bg : 'transparent',
                    borderColor: active ? meta.color : 'var(--color-border)',
                    color: active ? meta.color : 'var(--color-text-dim)',
                  }}
                >
                  <Icon size={10} /> {meta.label}
                  <span className="opacity-70">{c}</span>
                </button>
              );
            })}
          {kindFilter.size > 0 && (
            <button className="shrink-0 text-[11px] text-[var(--color-text-faint)] hover:text-[var(--color-text)] ml-1" onClick={() => setKindFilter(new Set())}>
              clear
            </button>
          )}
        </div>
      )}

      <div ref={ref} className="flex-1 overflow-auto p-4">
        {loading && blocks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[var(--color-text-faint)]">
            <Loader2 className="animate-spin text-[var(--color-accent)] mb-3" size={22} />
            <div className="text-sm font-semibold gradient-text">Loading canvas…</div>
            <div className="text-xs mt-1">Restoring blocks from this conversation.</div>
          </div>
        ) : blocks.length === 0 ? (
          <EmptyState />
        ) : visible.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[var(--color-text-faint)] text-sm">
            No blocks match the current filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min" id="canvas-export-root">
            {visible.map(b => {
              const isFresh = b.freshAt && Date.now() - b.freshAt < 1500;
              const isDragging = dragId === b.id;
              const isDropTarget = dropTargetId === b.id;
              const meta = KIND_META[b.kind] || KIND_META.markdown;
              return (
                <div
                  key={b.id}
                  draggable={!!onReorder}
                  onDragStart={e => onDragStart(e, b.id)}
                  onDragOver={e => onDragOver(e, b.id)}
                  onDrop={e => onDrop(e, b.id)}
                  onDragEnd={onDragEnd}
                  className={`group relative ${b.kind === 'metric' ? '' : 'md:col-span-2'} ${isFresh ? 'block-enter' : ''} ${isDragging ? 'opacity-30' : ''} ${isDropTarget ? 'drop-target-glow' : ''}`}
                >
                  {/* Drop indicator */}
                  {isDropTarget && <div className="drop-indicator" />}

                  {/* Drag handle (floats outside top-left) */}
                  {onReorder && (
                    <div
                      className="absolute -top-1 -left-1 z-10 cursor-grab active:cursor-grabbing text-[var(--color-text-faint)] hover:text-[var(--color-text)] opacity-0 group-hover:opacity-100 transition w-6 h-6 rounded-md bg-[var(--color-panel-2)] border border-[var(--color-border)] flex items-center justify-center"
                      style={{ opacity: isDragging ? 1 : undefined }}
                      title="Drag to reorder"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <GripVertical size={11} />
                    </div>
                  )}

                  <div className={isFresh ? 'block-glow rounded-xl' : ''}>
                    {render(b, onAsk, () => onDelete(b.id), () => onPin(b.id), !!isFresh)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SortDropdown({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  const [open, setOpen] = useState(false);
  const opts: { v: SortMode; label: string; icon: any }[] = [
    { v: 'natural', label: 'Natural', icon: GitBranch },
    { v: 'pinned-first', label: 'Pinned first', icon: Pin },
    { v: 'newest', label: 'Newest', icon: ArrowUpDown },
    { v: 'oldest', label: 'Oldest', icon: ArrowUpDown },
    { v: 'kind', label: 'By type', icon: Hash },
  ];
  const cur = opts.find(o => o.v === value)!;
  const Icon = cur.icon;
  return (
    <div className="relative">
      <button className="btn btn-ghost" onClick={() => setOpen(o => !o)} onBlur={() => setTimeout(() => setOpen(false), 150)}>
        <Icon size={11} /> {cur.label}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 card !p-1 min-w-[140px]">
          {opts.map(o => {
            const I = o.icon;
            return (
              <button
                key={o.v}
                onMouseDown={() => { onChange(o.v); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-[var(--color-panel-2)] ${value === o.v ? 'text-[var(--color-accent-2)]' : 'text-[var(--color-text-dim)]'}`}
              >
                <I size={10} /> {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6">
      <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mb-4">
        <Layers className="text-[var(--color-accent-2)]" />
      </div>
      <div className="text-sm font-semibold gradient-text">Empty canvas</div>
      <div className="text-xs text-[var(--color-text-faint)] mt-1 max-w-xs leading-relaxed">
        Ask a question on the right and the agent will populate this canvas with charts, tables, forecasts, mermaid diagrams, and trained models. Drag blocks to rearrange.
      </div>
    </div>
  );
}

function render(b: Block, onAsk: (q: string) => void, onDelete: () => void, onPin: () => void, animate: boolean) {
  const common = { onAsk, onDelete, pinned: b.pinned, kind: b.kind, onPin };
  switch (b.kind) {
    case 'chart': return <ChartBlock payload={b.payload} animate={animate} {...common} />;
    case 'mermaid': return <MermaidBlock payload={b.payload} {...common} />;
    case 'table': return <TableBlock payload={b.payload} {...common} />;
    case 'metric': return <MetricBlock payload={b.payload} {...common} />;
    case 'forecast': return <ForecastBlock payload={b.payload} animate={animate} {...common} />;
    case 'model_training': return <ModelTrainingBlock payload={b.payload} {...common} />;
    case 'markdown': return <MarkdownBlock payload={b.payload} {...common} />;
    case 'image_analysis': return <ImageAnalysisBlock payload={b.payload} {...common} />;
    case 'generated_image': return <GeneratedImageBlock payload={b.payload} {...common} />;
    default: return <div className="card text-xs text-[var(--color-text-faint)]">Unknown block: {b.kind}</div>;
  }
}
