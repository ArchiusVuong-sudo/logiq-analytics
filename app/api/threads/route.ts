import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/db/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = adminDb();
  const { data: threads, error } = await db.from('threads').select('id,title,created_at,updated_at').order('updated_at', { ascending: false }).limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!threads || threads.length === 0) return Response.json({ threads: [] });

  // Filter out empty threads (no user/assistant messages AND no canvas blocks).
  // These are orphans — usually from a failed first-send (e.g. missing API key)
  // or a "New conversation" click that was never used. They clutter the sidebar.
  const ids = threads.map(t => t.id);
  const [{ data: msgRows }, { data: blkRows }] = await Promise.all([
    db.from('messages').select('thread_id').in('thread_id', ids),
    db.from('canvas_blocks').select('thread_id').in('thread_id', ids),
  ]);
  const hasContent = new Set<string>();
  for (const r of msgRows || []) if (r.thread_id) hasContent.add(r.thread_id);
  for (const r of blkRows || []) if (r.thread_id) hasContent.add(r.thread_id);

  const visible = threads.filter(t => hasContent.has(t.id)).slice(0, 50);
  return Response.json({ threads: visible });
}

export async function POST(req: NextRequest) {
  const { title } = await req.json().catch(() => ({}));
  const db = adminDb();
  const { data, error } = await db.from('threads').insert({ title: title || 'New conversation' }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ thread: data });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });
  const db = adminDb();
  const { error } = await db.from('threads').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
