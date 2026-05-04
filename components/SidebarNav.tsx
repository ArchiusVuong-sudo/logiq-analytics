'use client';
import { Activity, MessageSquare, Plus, Settings, Trash2, Upload, Database, Sparkles } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export type Thread = { id: string; title: string; updated_at: string };

export default function SidebarNav({ threads, currentThread, onSelect, onNew, onDelete, onOpenSettings, onOpenImport, ordersCount, view, onViewChange }: {
  threads: Thread[];
  currentThread: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
  onOpenImport: () => void;
  ordersCount: number;
  view: 'workspace' | 'dashboard';
  onViewChange: (v: 'workspace' | 'dashboard') => void;
}) {
  return (
    <aside className="w-[260px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-2)] flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c5cff, #46d9ff)' }}>
            <Sparkles size={14} className="text-[#06070a]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold leading-tight">LogIQ</div>
            <div className="text-[10px] text-[var(--color-text-faint)] leading-tight">Logistics AI Analyst</div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="px-3 py-2 border-b border-[var(--color-border)]">
        <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-panel)]">
          <button onClick={() => onViewChange('workspace')} className={`flex-1 px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1 ${view === 'workspace' ? 'bg-[var(--color-panel-2)] text-[var(--color-text)]' : 'text-[var(--color-text-dim)]'}`}>
            <MessageSquare size={11} /> Workspace
          </button>
          <button onClick={() => onViewChange('dashboard')} className={`flex-1 px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1 ${view === 'dashboard' ? 'bg-[var(--color-panel-2)] text-[var(--color-text)]' : 'text-[var(--color-text-dim)]'}`}>
            <Activity size={11} /> Dashboard
          </button>
        </div>
      </div>

      <div className="px-3 pt-3">
        <button onClick={onNew} className="btn btn-primary w-full"><Plus size={13} /> New conversation</button>
      </div>

      <div className="flex-1 overflow-auto px-2 pt-2">
        {threads.map(t => (
          <div key={t.id} className={`group flex items-center gap-1 rounded-md mb-0.5 ${currentThread === t.id ? 'bg-[var(--color-panel-2)]' : ''}`}>
            <button onClick={() => onSelect(t.id)} className="flex-1 text-left px-2 py-1.5 text-xs truncate hover:text-[var(--color-text)] text-[var(--color-text-dim)]">
              <MessageSquare size={11} className="inline mr-1.5 -mt-0.5 text-[var(--color-text-faint)]" />
              {t.title}
            </button>
            <button onClick={() => onDelete(t.id)} className="opacity-0 group-hover:opacity-100 px-1.5 py-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-bad)]">
              <Trash2 size={11} />
            </button>
          </div>
        ))}
        {threads.length === 0 && <div className="text-[11px] text-[var(--color-text-faint)] px-2 py-3">No conversations yet</div>}
      </div>

      <div className="border-t border-[var(--color-border)] px-3 py-2.5 space-y-1">
        <div className="text-[10px] text-[var(--color-text-faint)] flex items-center gap-1.5 px-2">
          <Database size={10} />
          <span>{ordersCount.toLocaleString()} orders in Supabase</span>
        </div>
        <button onClick={onOpenImport} className="btn btn-ghost w-full !justify-start"><Upload size={12} /> Import data</button>
        <button onClick={onOpenSettings} className="btn btn-ghost w-full !justify-start"><Settings size={12} /> API keys & model</button>
      </div>
    </aside>
  );
}
