'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

type ConfirmOpts = {
  title?: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: 'warning' | 'delete' | null;
};

const ConfirmCtx = createContext<((opts: ConfirmOpts) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmOpts | null>(null);
  const [closing, setClosing] = useState(false);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((opts: ConfirmOpts) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setClosing(false);
      setState(opts);
    });
  }, []);

  const handle = useCallback((val: boolean) => {
    setClosing(true);
    setTimeout(() => {
      resolverRef.current?.(val);
      resolverRef.current = null;
      setState(null);
      setClosing(false);
    }, 140);
  }, []);

  // Esc + Enter handlers; focus the action button
  useEffect(() => {
    if (!state || closing) return;
    confirmBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); handle(false); }
      else if (e.key === 'Enter') { e.preventDefault(); handle(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, closing, handle]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <div
          className={`modal-backdrop ${closing ? 'closing' : ''}`}
          onClick={() => handle(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-msg"
        >
          <div className={`modal-card ${closing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => handle(false)}
              aria-label="Close"
            >
              <X size={14} />
            </button>

            {state.icon !== null && (
              <div className={`modal-icon ${state.destructive ? 'destructive' : ''}`}>
                {state.icon === 'delete' || state.destructive
                  ? <Trash2 size={18} />
                  : <AlertTriangle size={18} />}
              </div>
            )}

            <div id="confirm-title" className="text-base font-semibold mb-1.5 leading-snug">
              {state.title || 'Are you sure?'}
            </div>
            <div id="confirm-msg" className="text-sm text-[var(--color-text-dim)] leading-relaxed mb-5">
              {state.message}
            </div>

            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost !px-4 !py-2" onClick={() => handle(false)}>
                {state.cancelLabel || 'Cancel'}
              </button>
              <button
                ref={confirmBtnRef}
                className={`!px-4 !py-2 btn ${state.destructive ? 'btn-destructive' : 'btn-primary'}`}
                onClick={() => handle(true)}
              >
                {state.confirmLabel || 'Confirm'}
              </button>
            </div>

            <div className="modal-hint">
              <span className="kbd">↵</span> confirm · <span className="kbd">esc</span> cancel
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const fn = useContext(ConfirmCtx);
  if (!fn) {
    // Graceful fallback if not wrapped — fall back to native confirm
    if (typeof window !== 'undefined') {
      return (opts: ConfirmOpts) => Promise.resolve(window.confirm(typeof opts.message === 'string' ? opts.message : 'Confirm?'));
    }
    return async () => false;
  }
  return fn;
}
