'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Key, Eye, EyeOff, Sparkles, Wand2, Eye as EyeIcon, Check, ChevronDown } from 'lucide-react';

const LS_ANTHROPIC = 'logiq_anthropic_key';
const LS_GEMINI = 'logiq_gemini_key';
const LS_MODEL = 'logiq_model';
const LS_GEMINI_VISION = 'logiq_gemini_vision_model';
const LS_GEMINI_IMAGE = 'logiq_gemini_image_model';

export function loadKeys() {
  if (typeof window === 'undefined') return { anthropic: '', gemini: '', model: '', geminiVisionModel: '', geminiImageModel: '' };
  return {
    anthropic: localStorage.getItem(LS_ANTHROPIC) || '',
    gemini: localStorage.getItem(LS_GEMINI) || '',
    model: localStorage.getItem(LS_MODEL) || 'claude-opus-4-7',
    geminiVisionModel: localStorage.getItem(LS_GEMINI_VISION) || 'gemini-3.1-pro-preview',
    geminiImageModel: localStorage.getItem(LS_GEMINI_IMAGE) || 'gemini-3-pro-image-preview',
  };
}

type ModelOpt = { value: string; label: string; hint?: string; tag?: string; tagTone?: 'accent' | 'good' | 'neutral' };

const CLAUDE_MODELS: ModelOpt[] = [
  { value: 'claude-opus-4-7', label: 'claude-opus-4-7', hint: 'most capable', tag: 'recommended', tagTone: 'accent' },
  { value: 'claude-sonnet-4-6', label: 'claude-sonnet-4-6', hint: 'fast + capable', tag: 'balanced', tagTone: 'neutral' },
  { value: 'claude-sonnet-4-5', label: 'claude-sonnet-4-5' },
  { value: 'claude-haiku-4-5', label: 'claude-haiku-4-5', hint: 'lowest latency', tag: 'fastest', tagTone: 'good' },
];

const GEMINI_VISION_MODELS: ModelOpt[] = [
  { value: 'gemini-3.1-pro-preview', label: 'gemini-3.1-pro-preview', tag: 'recommended', tagTone: 'accent' },
  { value: 'gemini-3-pro-preview', label: 'gemini-3-pro-preview' },
  { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
  { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash', hint: 'fast', tagTone: 'good' },
];

const GEMINI_IMAGE_MODELS: ModelOpt[] = [
  { value: 'gemini-3-pro-image-preview', label: 'gemini-3-pro-image-preview', hint: '~20s', tag: 'recommended', tagTone: 'accent' },
  { value: 'gemini-3.1-flash-image-preview', label: 'gemini-3.1-flash-image-preview', hint: '~13s' },
  { value: 'nano-banana-pro-preview', label: 'nano-banana-pro-preview', hint: '~20s' },
  { value: 'gemini-2.5-flash-image', label: 'gemini-2.5-flash-image', hint: '~8s', tag: 'fastest', tagTone: 'good' },
];

function ThemedSelect({ value, options, onChange, mono = true, ariaLabel }: { value: string; options: ModelOpt[]; onChange: (v: string) => void; mono?: boolean; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const current = useMemo(() => options.find(o => o.value === value) || options[0], [value, options]);

  useEffect(() => {
    if (!open) return;
    const i = options.findIndex(o => o.value === value);
    setActiveIdx(i >= 0 ? i : 0);
  }, [open, value, options]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(options.length - 1, i + 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); }
      if (e.key === 'Enter') { e.preventDefault(); onChange(options[activeIdx].value); setOpen(false); }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, activeIdx, options, onChange]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  return (
    <div ref={wrapRef} className="themed-select" aria-label={ariaLabel}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`themed-select-trigger ${open ? 'is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`themed-select-value ${mono ? 'font-mono' : ''}`}>{current?.label}</span>
        {current?.tag && <span className={`themed-select-tag tone-${current.tagTone || 'neutral'}`}>{current.tag}</span>}
        {!current?.tag && current?.hint && <span className="themed-select-hint">{current.hint}</span>}
        <ChevronDown size={13} className={`themed-select-chev ${open ? 'rotate' : ''}`} />
      </button>
      {open && (
        <div ref={listRef} role="listbox" className="themed-select-panel">
          {options.map((o, i) => {
            const selected = o.value === value;
            const active = i === activeIdx;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                data-idx={i}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`themed-select-option ${selected ? 'is-selected' : ''} ${active ? 'is-active' : ''}`}
              >
                <span className={`themed-select-check ${selected ? 'visible' : ''}`}>
                  <Check size={11} />
                </span>
                <div className="themed-select-option-body">
                  <div className={`themed-select-option-label ${mono ? 'font-mono' : ''}`}>{o.label}</div>
                  {o.hint && <div className="themed-select-option-hint">{o.hint}</div>}
                </div>
                {o.tag && <span className={`themed-select-tag tone-${o.tagTone || 'neutral'}`}>{o.tag}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [anthropic, setAnthropic] = useState('');
  const [gemini, setGemini] = useState('');
  const [model, setModel] = useState('claude-opus-4-7');
  const [geminiVision, setGeminiVision] = useState('gemini-3.1-pro-preview');
  const [geminiImage, setGeminiImage] = useState('gemini-3-pro-image-preview');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  useEffect(() => {
    if (open) {
      const k = loadKeys();
      setAnthropic(k.anthropic);
      setGemini(k.gemini);
      setModel(k.model);
      setGeminiVision(k.geminiVisionModel);
      setGeminiImage(k.geminiImageModel);
    }
  }, [open]);

  if (!open) return null;

  const save = () => {
    localStorage.setItem(LS_ANTHROPIC, anthropic.trim());
    localStorage.setItem(LS_GEMINI, gemini.trim());
    localStorage.setItem(LS_MODEL, model);
    localStorage.setItem(LS_GEMINI_VISION, geminiVision);
    localStorage.setItem(LS_GEMINI_IMAGE, geminiImage);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-base font-semibold">Settings</h2>
          </div>
          <button className="btn btn-ghost !px-2 !py-1" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[var(--color-text-dim)] mb-1 block">Anthropic API Key (Claude)</label>
            <div className="relative">
              <input type={show1 ? 'text' : 'password'} value={anthropic} onChange={e => setAnthropic(e.target.value)} placeholder="sk-ant-…" className="w-full !pr-10 font-mono text-xs" />
              <button onClick={() => setShow1(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]">{show1 ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
            <div className="text-[10px] text-[var(--color-text-faint)] mt-1">Stored in localStorage. Sent server-side per request, never persisted on the server.</div>
          </div>

          <div>
            <label className="text-xs text-[var(--color-text-dim)] mb-1 block">Gemini API Key (vision + image generation)</label>
            <div className="relative">
              <input type={show2 ? 'text' : 'password'} value={gemini} onChange={e => setGemini(e.target.value)} placeholder="AIza…" className="w-full !pr-10 font-mono text-xs" />
              <button onClick={() => setShow2(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]">{show2 ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] mb-2 flex items-center gap-1.5">
              <Sparkles size={11} className="text-[var(--color-accent)]" /> Models
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--color-text-dim)] mb-1 block">Claude (orchestrator)</label>
                <ThemedSelect value={model} onChange={setModel} options={CLAUDE_MODELS} ariaLabel="Claude model" />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-dim)] mb-1 flex items-center gap-1.5"><EyeIcon size={11} /> Gemini (vision / extract)</label>
                <ThemedSelect value={geminiVision} onChange={setGeminiVision} options={GEMINI_VISION_MODELS} ariaLabel="Gemini vision model" />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-dim)] mb-1 flex items-center gap-1.5"><Wand2 size={11} /> Gemini (image generation)</label>
                <ThemedSelect value={geminiImage} onChange={setGeminiImage} options={GEMINI_IMAGE_MODELS} ariaLabel="Gemini image model" />
                <div className="text-[10px] text-[var(--color-text-faint)] mt-1">If your account doesn't have access to the selected model, the agent automatically falls back to the next available image-gen model.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
