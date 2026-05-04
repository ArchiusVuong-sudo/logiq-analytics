'use client';
import { useEffect, useState } from 'react';
import { X, Key, Eye, EyeOff, Sparkles, Wand2, Eye as EyeIcon } from 'lucide-react';

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
                <select value={model} onChange={e => setModel(e.target.value)} className="w-full text-xs">
                  <option value="claude-opus-4-7">claude-opus-4-7 (recommended — most capable)</option>
                  <option value="claude-sonnet-4-6">claude-sonnet-4-6 (fast + capable)</option>
                  <option value="claude-sonnet-4-5">claude-sonnet-4-5</option>
                  <option value="claude-haiku-4-5">claude-haiku-4-5 (fastest)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-dim)] mb-1 flex items-center gap-1.5"><EyeIcon size={11} /> Gemini (vision / extract)</label>
                <select value={geminiVision} onChange={e => setGeminiVision(e.target.value)} className="w-full text-xs font-mono">
                  <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (recommended)</option>
                  <option value="gemini-3-pro-preview">gemini-3-pro-preview</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash (fast)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-dim)] mb-1 flex items-center gap-1.5"><Wand2 size={11} /> Gemini (image generation)</label>
                <select value={geminiImage} onChange={e => setGeminiImage(e.target.value)} className="w-full text-xs font-mono">
                  <option value="gemini-3-pro-image-preview">gemini-3-pro-image-preview (recommended, ~20s)</option>
                  <option value="gemini-3.1-flash-image-preview">gemini-3.1-flash-image-preview (~13s)</option>
                  <option value="nano-banana-pro-preview">nano-banana-pro-preview (~20s)</option>
                  <option value="gemini-2.5-flash-image">gemini-2.5-flash-image (fastest, ~8s)</option>
                </select>
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
