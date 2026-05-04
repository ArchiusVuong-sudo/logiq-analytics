'use client';
import { Sparkles, User, Wrench, Layers, Clock } from 'lucide-react';
import ToolBlock from './ToolBlock';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export type Step =
  | { type: 'tool_call'; id: string; name: string; input: any; result?: any; status: 'running' | 'done' | 'error' }
  | { type: 'text'; text: string };

export default function MessageBubble({ role, text, steps, ts, streaming, startedAt, endedAt }: {
  role: 'user' | 'assistant';
  text: string;
  steps?: Step[];
  ts?: number;
  streaming?: boolean;
  startedAt?: number;
  endedAt?: number;
}) {
  if (role === 'user') {
    return (
      <div className="flex gap-2.5 items-start">
        <div className="w-7 h-7 rounded-lg bg-[var(--color-panel-2)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
          <User size={13} className="text-[var(--color-text-dim)]" />
        </div>
        <div className="flex-1 text-sm leading-relaxed pt-0.5">{text}</div>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5 items-start">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7c5cff, #46d9ff)' }}>
        <Sparkles size={13} className="text-[#06070a]" />
      </div>
      <div className="flex-1 min-w-0">
        {steps && steps.length > 0 && (
          <div className="mb-2 space-y-0.5">
            {steps.map((s, i) => s.type === 'tool_call' ? (
              <div key={s.id + i} className="step-enter">
                <ToolBlock name={s.name} input={s.input} result={s.result} status={s.status} />
              </div>
            ) : null)}
          </div>
        )}
        {(text || streaming) && (
          <div className={`md-content md-compact ${streaming ? 'streaming-cursor' : ''}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{text}</ReactMarkdown>
          </div>
        )}
        {!streaming && steps && steps.length > 0 && (() => {
          const toolCalls = steps.filter(s => s.type === 'tool_call');
          const blocks = toolCalls.filter(s => s.type === 'tool_call' && s.name.startsWith('create_') && s.name.endsWith('_block')).length;
          const tools = toolCalls.length - blocks;
          const errors = toolCalls.filter(s => s.type === 'tool_call' && s.status === 'error').length;
          const elapsed = startedAt && endedAt ? ((endedAt - startedAt) / 1000) : null;
          return (
            <div className="msg-summary">
              <Wrench size={9} /><span><strong>{tools}</strong> tool{tools === 1 ? '' : 's'}</span>
              <span className="sep" />
              <Layers size={9} /><span><strong>{blocks}</strong> block{blocks === 1 ? '' : 's'}</span>
              {elapsed != null && <><span className="sep" /><Clock size={9} /><span><strong>{elapsed.toFixed(1)}</strong>s</span></>}
              {errors > 0 && <><span className="sep" /><span className="tone-bad"><strong>{errors}</strong> error{errors === 1 ? '' : 's'}</span></>}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
