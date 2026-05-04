import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/db/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminDb();
  const [t, m, b] = await Promise.all([
    db.from('threads').select('*').eq('id', id).single(),
    db.from('messages').select('id,role,content,created_at').eq('thread_id', id).order('created_at'),
    db.from('canvas_blocks').select('id,kind,payload,created_at,pinned').eq('thread_id', id).order('created_at'),
  ]);
  if (t.error) return Response.json({ error: t.error.message }, { status: 404 });
  return Response.json({
    thread: t.data,
    messages: m.data || [],
    blocks: b.data || [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = adminDb();
  const { data, error } = await db.from('threads').update(body).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ thread: data });
}
