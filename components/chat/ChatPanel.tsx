'use client';
import { useEffect, useRef, useState } from 'react';
import MessageBubble, { Step } from './MessageBubble';
import ChatInput from './ChatInput';
import { Brain } from 'lucide-react';

export type ChatMsg = { id: string; role: 'user' | 'assistant'; text: string; steps?: Step[]; streaming?: boolean; startedAt?: number; endedAt?: number };

export default function ChatPanel({ messages, busy, prefill, onSend, onCancel, onPrefillConsumed }: {
  messages: ChatMsg[];
  busy: boolean;
  prefill?: string;
  onSend: (t: string, images: { id: string; mime: string; base64: string }[]) => void;
  onCancel: () => void;
  onPrefillConsumed: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [messages]);
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto px-4 py-3 space-y-4" ref={ref}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center mb-3">
              <Brain className="text-[var(--color-accent)]" />
            </div>
            <div className="text-sm font-semibold gradient-text">Ask the AI Analyst</div>
            <div className="text-xs text-[var(--color-text-faint)] mt-1 max-w-sm">
              The agent calls structured tools (KPIs, aggregations, forecasts) and renders the results on the canvas.
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 w-full max-w-md">
              {[
                'Show delayed orders by week for the last 3 months',
                'Which carrier has the highest delay rate?',
                'Predict demand for CRAYON category for the next 4 months',
                'Train a logistic regression to predict delay risk',
              ].map(q => (
                <button key={q} onClick={() => onSend(q, [])} className="btn btn-ghost !justify-start text-left text-xs !py-2 hover:!border-[var(--color-accent)]">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(m => <MessageBubble key={m.id} role={m.role} text={m.text} steps={m.steps} streaming={m.streaming} startedAt={m.startedAt} endedAt={m.endedAt} />)}
        {busy && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-2.5 items-center text-xs text-[var(--color-text-dim)] thinking-glow rounded-md px-3 py-2 max-w-fit">
            <div className="dot-pulse">Thinking…</div>
          </div>
        )}
      </div>
      <ChatInput onSend={onSend} busy={busy} onCancel={onCancel} prefill={prefill} onPrefillConsumed={onPrefillConsumed} />
    </div>
  );
}
