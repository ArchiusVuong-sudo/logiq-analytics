'use client';
import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { MessageCircle, Trash2 } from 'lucide-react';
import { KindChip, PinChip, ActionBtn } from './BlockHeader';

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'style', 'data*'],
    blockquote: ['className'],
    div: ['className', 'style'],
    span: ['className', 'style'],
    code: ['className'],
    pre: ['className'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'kbd', 'mark', 'details', 'summary', 'sub', 'sup',
  ],
};

function MarkdownBlock({ payload, onAsk, onDelete, kind, pinned }: { payload: any; onAsk?: (q: string) => void; onDelete?: () => void; kind?: string; pinned?: boolean }) {
  return (
    <div className="canvas-block card relative">
      <div className="block-header">
        <div className="block-header-meta min-w-0">
          <KindChip kind={kind || 'markdown'} size="xs" />
          {pinned && <PinChip />}
          <div className="block-header-title truncate">{payload.title || 'Note'}</div>
        </div>
        <div className="block-header-actions">
          <ActionBtn icon={Trash2} onClick={onDelete} title="Delete" danger />
        </div>
      </div>
      <div className="md-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        >
          {payload.content || ''}
        </ReactMarkdown>
      </div>
      {onAsk && <button onClick={() => onAsk(`About this note: `)} className="float-ask"><MessageCircle size={12} /> Ask</button>}
    </div>
  );
}

export default memo(MarkdownBlock, (prev, next) =>
  prev.payload === next.payload &&
  prev.pinned === next.pinned &&
  prev.kind === next.kind,
);
