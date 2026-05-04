'use client';
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Send, X, Square, Sparkles } from 'lucide-react';

const SUGGESTED = [
  "Show delayed orders by week for the last 3 months",
  "Which carrier has the highest delay rate?",
  "Predict demand for CRAYON for the next 4 months",
  "Train a model on order_value, quantity to predict delay risk",
  "Compare on-time rate across regions",
];

export default function ChatInput({ onSend, busy, onCancel, prefill, onPrefillConsumed }: {
  onSend: (text: string, images: { id: string; mime: string; base64: string }[]) => void;
  busy?: boolean;
  onCancel?: () => void;
  prefill?: string;
  onPrefillConsumed?: () => void;
}) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<{ id: string; mime: string; base64: string; preview: string }[]>([]);
  const [focused, setFocused] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (prefill && !text) {
      setText(prefill);
      onPrefillConsumed?.();
      requestAnimationFrame(() => taRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  // Rotating placeholder tip when empty + unfocused
  useEffect(() => {
    if (text || focused) return;
    const id = setInterval(() => setTipIndex(i => (i + 1) % SUGGESTED.length), 4500);
    return () => clearInterval(id);
  }, [text, focused]);

  // Auto-resize textarea up to 6 lines
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const lh = 22;
    const max = lh * 6 + 24;
    ta.style.height = Math.min(ta.scrollHeight, max) + 'px';
  }, [text]);

  const onPickFiles = async (files: File[]) => {
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const buf = await f.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const id = `img_${Math.random().toString(36).slice(2, 9)}`;
      const preview = `data:${f.type};base64,${base64}`;
      setImages(prev => [...prev, { id, mime: f.type, base64, preview }]);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = () => {
    if (!text.trim() && images.length === 0) return;
    onSend(text, images.map(i => ({ id: i.id, mime: i.mime, base64: i.base64 })));
    setText(''); setImages([]);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) onPickFiles(files);
  };

  const onPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files: File[] = [];
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault();
      onPickFiles(files);
    }
  };

  const canSend = text.trim().length > 0 || images.length > 0;
  const showSuggest = !text && !focused && images.length === 0;

  return (
    <div
      className="px-3 pt-2 pb-3 bg-[var(--color-bg-2)] border-t border-[var(--color-border)]"
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {images.map((im, i) => (
            <div key={im.id} className="relative group">
              <img src={im.preview} className="h-16 w-16 object-cover rounded-lg border border-[var(--color-border)] shadow-sm" />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition" />
              <button
                onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--color-bad)] text-white flex items-center justify-center shadow-md hover:scale-110 transition"
                title="Remove"
              >
                <X size={10} strokeWidth={3} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 px-1 text-[9px] text-white truncate opacity-0 group-hover:opacity-100">
                {im.mime.split('/')[1]?.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className={`composer-shell ${focused ? 'focused' : ''} ${dragOver ? 'drag-over' : ''} ${busy ? 'busy' : ''}`}>
        <div className="composer-inner">
          <input type="file" multiple accept="image/*" hidden ref={fileRef} onChange={e => onPickFiles(Array.from(e.target.files || []))} />

          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 relative">
              <textarea
                ref={taRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onPaste={onPaste}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
                }}
                rows={1}
                placeholder=""
                className="composer-textarea"
              />
              {!text && (
                <div className="composer-placeholder pointer-events-none">
                  <Sparkles size={12} className="opacity-70" />
                  <span key={tipIndex} className="placeholder-text">
                    {showSuggest ? SUGGESTED[tipIndex] : 'Ask anything about your logistics data…'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
              <button
                className="composer-icon-btn"
                onClick={() => fileRef.current?.click()}
                title="Attach images (PNG/JPG) → Gemini vision"
                disabled={busy}
              >
                <ImagePlus size={14} />
              </button>
              {busy ? (
                <button className="composer-stop" onClick={onCancel} title="Stop">
                  <Square size={12} fill="currentColor" />
                </button>
              ) : (
                <button
                  className={`composer-send ${canSend ? 'active' : ''}`}
                  onClick={submit}
                  disabled={!canSend}
                  title="Send (↵)"
                >
                  <Send size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hint footer */}
      <div className="mt-1.5 px-1 flex items-center justify-between text-[10px] text-[var(--color-text-faint)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="kbd">↵</span><span>send</span></span>
          <span className="flex items-center gap-1"><span className="kbd">⇧↵</span><span>newline</span></span>
          <span className="hidden md:inline opacity-70">paste / drop images</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="composer-status-dot" />
          <span>{busy ? 'agent thinking…' : 'agent ready'}</span>
        </div>
      </div>
    </div>
  );
}
