'use client';
import { useEffect, useState, useCallback } from 'react';
import SidebarNav, { Thread } from '@/components/SidebarNav';
import ChatPanel, { ChatMsg } from '@/components/chat/ChatPanel';
import Canvas, { Block } from '@/components/canvas/Canvas';
import Dashboard from '@/components/dashboard/Dashboard';
import SettingsModal, { loadKeys } from '@/components/dashboard/SettingsModal';
import ImportModal from '@/components/dashboard/ImportModal';
import { AlertTriangle } from 'lucide-react';
import type { Step } from '@/components/chat/MessageBubble';
import { ConfirmProvider, useConfirm } from '@/components/ConfirmDialog';

export default function WorkspacePage() {
  return (
    <ConfirmProvider>
      <Workspace />
    </ConfirmProvider>
  );
}

function Workspace() {
  const confirm = useConfirm();
  const [view, setView] = useState<'workspace' | 'dashboard'>('workspace');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [prefill, setPrefill] = useState<string | undefined>();
  const [filters, setFilters] = useState<any>({});
  const [setupOk, setSetupOk] = useState<boolean | null>(null);
  const [ordersCount, setOrdersCount] = useState(0);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // ── Initial setup status ──
  useEffect(() => {
    fetch('/api/setup').then(r => r.json()).then(j => {
      setSetupOk(!!j.schema_ok);
      setOrdersCount(j.orders_count || 0);
    }).catch(() => setSetupOk(false));
  }, []);

  // ── Deep link: ?prompt=... pre-fills the chat input ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const p = sp.get('prompt');
    if (p) {
      setPrefill(p);
      setView('workspace');
      // strip the query so reload doesn't re-prompt
      window.history.replaceState({}, '', '/workspace');
    }
  }, []);

  const loadThreads = async () => {
    const r = await fetch('/api/threads').then(r => r.json());
    setThreads(r.threads || []);
    return r.threads || [];
  };

  useEffect(() => { if (setupOk) loadThreads(); }, [setupOk]);

  const newThread = async () => {
    const r = await fetch('/api/threads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'New conversation' }) }).then(r => r.json());
    if (r.thread) {
      setCurrentThread(r.thread.id);
      setMessages([]);
      setBlocks([]);
      await loadThreads();
    }
  };

  const selectThread = async (id: string) => {
    setCurrentThread(id);
    setLoadingThread(true);
    setMessages([]);
    setBlocks([]);
    try {
      const r = await fetch(`/api/threads/${id}`).then(r => r.json());
      const msgs: ChatMsg[] = [];
      for (const m of r.messages || []) {
        if (m.role === 'user') msgs.push({ id: m.id, role: 'user', text: m.content?.parts?.find((p: any) => p.type === 'text')?.text || '' });
        else msgs.push({ id: m.id, role: 'assistant', text: m.content?.text || '', steps: [] });
      }
      setMessages(msgs);
      setBlocks((r.blocks || []).map((b: any) => ({ id: b.id, kind: b.kind, payload: b.payload, pinned: b.pinned })));
    } finally {
      setLoadingThread(false);
    }
  };

  const deleteThread = async (id: string) => {
    const t = threads.find(x => x.id === id);
    const ok = await confirm({
      title: 'Delete this conversation?',
      message: (
        <>
          {t?.title ? <><strong className="text-[var(--color-text)]">"{t.title}"</strong> and all its messages and canvas blocks will be permanently deleted. </> : 'All messages and canvas blocks in this conversation will be permanently deleted. '}
          This action cannot be undone.
        </>
      ),
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await fetch(`/api/threads?id=${id}`, { method: 'DELETE' });
    if (currentThread === id) {
      setCurrentThread(null);
      setMessages([]);
      setBlocks([]);
    }
    await loadThreads();
  };

  const onSend = useCallback(async (text: string, images: { id: string; mime: string; base64: string }[]) => {
    if (!text.trim() && images.length === 0) return;

    // Validate the API key BEFORE creating any DB rows. Otherwise a missing
    // key creates an orphan thread (title set, no messages persisted).
    const keys = loadKeys();
    if (!keys.anthropic) {
      setMessages(prev => [...prev, { id: `e_${Date.now()}`, role: 'assistant', text: '⚠ No Anthropic API key set. Open Settings to add one.' }]);
      setOpenSettings(true);
      return;
    }

    let tid = currentThread;
    if (!tid) {
      const r = await fetch('/api/threads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: text.slice(0, 60) || 'New conversation' }) }).then(r => r.json());
      tid = r.thread.id;
      setCurrentThread(tid);
      await loadThreads();
    } else if (messages.length === 0) {
      // update title
      await fetch(`/api/threads/${tid}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: text.slice(0, 60) }) });
      await loadThreads();
    }

    const userMsg: ChatMsg = { id: `u_${Date.now()}`, role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setBusy(true);

    const ac = new AbortController();
    setAbortController(ac);

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          thread_id: tid,
          text,
          images,
          anthropic_key: keys.anthropic,
          gemini_key: keys.gemini,
          model: keys.model || undefined,
          gemini_vision_model: keys.geminiVisionModel || undefined,
          gemini_image_model: keys.geminiImageModel || undefined,
        }),
        signal: ac.signal,
      });
      if (!resp.ok || !resp.body) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      const aMsgId = `a_${Date.now()}`;
      const startedAt = Date.now();
      const aMsg: ChatMsg = { id: aMsgId, role: 'assistant', text: '', steps: [], streaming: true, startedAt };
      setMessages(prev => [...prev, aMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() || '';
        for (const p of parts) {
          const line = p.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          let ev: any;
          try { ev = JSON.parse(payload); } catch { continue; }
          handleEvent(ev, aMsgId);
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setMessages(prev => [...prev, { id: `e_${Date.now()}`, role: 'assistant', text: `⚠ Error: ${e?.message || String(e)}` }]);
      }
    } finally {
      setBusy(false);
      setAbortController(null);
      // mark all assistant messages as no longer streaming + stamp end time
      const endedAt = Date.now();
      setMessages(prev => prev.map(m => m.streaming ? { ...m, streaming: false, endedAt } : m));
      // refresh orders count after possible image-import flows
      fetch('/api/setup').then(r => r.json()).then(j => setOrdersCount(j.orders_count || 0)).catch(() => {});
    }
  }, [currentThread, messages.length]);

  const handleEvent = (ev: any, aMsgId: string) => {
    if (ev.type === 'text_delta') {
      setMessages(prev => prev.map(m => m.id === aMsgId ? { ...m, text: (m.text || '') + ev.text } : m));
    } else if (ev.type === 'tool_call') {
      const step: Step = { type: 'tool_call', id: ev.id, name: ev.name, input: ev.input, status: 'running' };
      setMessages(prev => prev.map(m => m.id === aMsgId ? { ...m, steps: [...(m.steps || []), step] } : m));
    } else if (ev.type === 'tool_result') {
      setMessages(prev => prev.map(m => m.id === aMsgId ? {
        ...m,
        steps: (m.steps || []).map(s => s.type === 'tool_call' && s.id === ev.id ? { ...s, result: ev.result, status: ev.error ? 'error' : 'done' } : s),
      } : m));
    } else if (ev.type === 'block') {
      setBlocks(prev => [...prev, { id: ev.block.id, kind: ev.block.kind, payload: ev.block.payload, freshAt: Date.now() }]);
    } else if (ev.type === 'error') {
      setMessages(prev => [...prev, { id: `e_${Date.now()}`, role: 'assistant', text: `⚠ ${ev.error}` }]);
    }
  };

  const onCancel = () => {
    abortController?.abort();
    setAbortController(null);
    setBusy(false);
  };

  const onAsk = (q: string) => {
    setView('workspace');
    setPrefill(q);
  };

  const onDeleteBlock = async (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    await fetch(`/api/canvas?id=${id}`, { method: 'DELETE' });
  };
  const onPinBlock = async (id: string) => {
    const b = blocks.find(x => x.id === id);
    if (!b) return;
    await fetch('/api/canvas', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, pinned: !b.pinned }) });
    setBlocks(prev => prev.map(x => x.id === id ? { ...x, pinned: !x.pinned } : x));
  };

  const onReorder = (orderedIds: string[]) => {
    setBlocks(prev => {
      const map = new Map(prev.map(b => [b.id, b]));
      const next = orderedIds.map(id => map.get(id)!).filter(Boolean);
      // tail any blocks not in orderedIds (defensive)
      for (const b of prev) if (!orderedIds.includes(b.id)) next.push(b);
      return next;
    });
    // persist as layout positions
    fetch('/api/canvas/reorder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ordered_ids: orderedIds }),
    }).catch(() => {});
  };

  const exportCanvasPdf = async () => {
    const root = document.getElementById('canvas-export-root');
    if (!root) return;
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');
    const canvas = await html2canvas(root, { backgroundColor: '#0c1018', scale: 2 });
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = canvas.width / canvas.height;
    const imgW = pageWidth - 40;
    const imgH = imgW / ratio;
    let y = 40;
    if (imgH < pageHeight - 80) {
      pdf.setFontSize(14); pdf.setTextColor(20, 20, 30);
      pdf.text('LogIQ — Canvas export', 20, 24);
      pdf.addImage(img, 'PNG', 20, y, imgW, imgH);
    } else {
      // tile across pages
      const pageContentH = pageHeight - 60;
      const totalPages = Math.ceil(imgH / pageContentH);
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();
        pdf.addImage(img, 'PNG', 20, 40 - i * pageContentH, imgW, imgH);
        pdf.setFontSize(10); pdf.setTextColor(120);
        pdf.text(`LogIQ — page ${i + 1} of ${totalPages}`, 20, 24);
      }
    }
    pdf.save('logiq-canvas.pdf');
  };

  // ── Setup screen ──
  if (setupOk === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative">
        <div className="aurora" />
        <div className="card max-w-md text-center relative">
          <AlertTriangle className="mx-auto mb-3 text-[var(--color-warn)]" />
          <div className="text-base font-semibold mb-1">Database not initialized</div>
          <div className="text-xs text-[var(--color-text-dim)] mb-4">Run the schema once in Supabase, then seed the mock data.</div>
          <a href="/setup" className="btn btn-primary inline-flex">Go to Setup →</a>
        </div>
      </div>
    );
  }
  if (setupOk === null) {
    return <div className="min-h-screen flex items-center justify-center text-[var(--color-text-faint)]">Loading…</div>;
  }

  return (
    <div className="h-screen flex">
      <SidebarNav
        threads={threads}
        currentThread={currentThread}
        onSelect={selectThread}
        onNew={newThread}
        onDelete={deleteThread}
        onOpenSettings={() => setOpenSettings(true)}
        onOpenImport={() => setOpenImport(true)}
        ordersCount={ordersCount}
        view={view}
        onViewChange={setView}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {view === 'dashboard' ? (
          <div className="flex-1 overflow-auto p-4 relative">
            <div className="aurora opacity-40" />
            <div className="relative">
              <Dashboard filters={filters} onFilters={setFilters} onAsk={onAsk} />
            </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-[1.05fr_1fr] min-h-0">
            <div className="border-r border-[var(--color-border)] min-h-0">
              <Canvas
                blocks={blocks}
                onAsk={onAsk}
                onDelete={onDeleteBlock}
                onPin={onPinBlock}
                onExportPdf={exportCanvasPdf}
                onReorder={onReorder}
                loading={loadingThread}
              />
            </div>
            <div className="min-h-0">
              <ChatPanel
                messages={messages}
                busy={busy}
                prefill={prefill}
                onSend={onSend}
                onCancel={onCancel}
                onPrefillConsumed={() => setPrefill(undefined)}
                loading={loadingThread}
              />
            </div>
          </div>
        )}
      </main>

      <SettingsModal open={openSettings} onClose={() => setOpenSettings(false)} />
      <ImportModal open={openImport} onClose={() => setOpenImport(false)} onImported={() => fetch('/api/setup').then(r => r.json()).then(j => setOrdersCount(j.orders_count || 0))} />
    </div>
  );
}
