'use client';
import { memo, useState } from 'react';
import { Download, MessageCircle, Trash2, ImagePlus, Wand2, Copy, Check } from 'lucide-react';
import { KindChip, PinChip, ActionBtn } from './BlockHeader';

function GeneratedImageBlock({ payload, onAsk, onDelete, kind, pinned }: {
  payload: any;
  onAsk?: (q: string) => void;
  onDelete?: () => void;
  kind?: string;
  pinned?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const dataUrl = `data:${payload.mime || 'image/png'};base64,${payload.base64}`;

  const download = () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `generated-${Date.now()}.${(payload.mime || 'image/png').split('/')[1] || 'png'}`;
    a.click();
  };

  const copyPrompt = async () => {
    if (!payload.prompt) return;
    await navigator.clipboard.writeText(payload.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="canvas-block card relative">
      <div className="block-header">
        <div className="block-header-meta min-w-0">
          <KindChip kind={kind || 'generated_image'} size="xs" />
          {pinned && <PinChip />}
          <div className="block-header-title truncate">
            <Wand2 size={13} className="text-[var(--color-accent)] shrink-0" /> Generated image
          </div>
        </div>
        <div className="block-header-actions">
          <ActionBtn icon={Download} onClick={download} title="Download image" />
          <ActionBtn icon={Trash2} onClick={onDelete} title="Delete" danger />
        </div>
      </div>

      <div className="block-header-tags mb-3 -mt-1">
        {payload.aspect_ratio && <span className="tag">{payload.aspect_ratio}</span>}
        {payload.model && <span className="tag font-mono text-[10px]">{payload.model}</span>}
        {payload.mime && <span className="tag">{payload.mime}</span>}
      </div>

      <div className="rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-2)]">
        <img src={dataUrl} alt={payload.caption || payload.prompt || 'generated'} className="w-full block" />
      </div>

      {payload.caption && (
        <div className="mt-3 text-sm text-[var(--color-text)] leading-snug">{payload.caption}</div>
      )}

      {payload.prompt && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-[var(--color-accent-2)] inline-flex items-center gap-1">
            <ImagePlus size={11} /> Prompt
          </summary>
          <div className="mt-2 p-2.5 rounded-md bg-[var(--color-bg-2)] border border-[var(--color-border)] text-[var(--color-text-dim)] leading-relaxed flex items-start gap-2">
            <div className="flex-1 whitespace-pre-wrap">{payload.prompt}</div>
            <button
              onClick={copyPrompt}
              className="icon-action-btn shrink-0"
              title="Copy prompt"
            >
              {copied ? <Check size={11} className="text-[var(--color-good)]" /> : <Copy size={11} />}
            </button>
          </div>
        </details>
      )}

      {onAsk && <button onClick={() => onAsk(`About this generated image: `)} className="float-ask"><MessageCircle size={12} /> Ask</button>}
    </div>
  );
}

export default memo(GeneratedImageBlock, (prev, next) =>
  prev.payload === next.payload &&
  prev.pinned === next.pinned &&
  prev.kind === next.kind,
);
