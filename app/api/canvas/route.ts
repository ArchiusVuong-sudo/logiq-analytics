import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/db/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { thread_id, kind, payload, layout, pinned } = await req.json();
  if (!kind || !payload) return Response.json({ error: 'kind and payload required' }, { status: 400 });
  const db = adminDb();
  const { data, error } = await db.from('canvas_blocks').insert({ thread_id, kind, payload, layout, pinned: !!pinned }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ block: data });
}

export async function PATCH(req: NextRequest) {
  const { id, payload, layout, pinned } = await req.json();
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });
  const db = adminDb();
  const update: any = {};
  if (payload) update.payload = payload;
  if (layout) update.layout = layout;
  if (typeof pinned === 'boolean') update.pinned = pinned;
  const { data, error } = await db.from('canvas_blocks').update(update).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ block: data });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });
  const db = adminDb();
  const { error } = await db.from('canvas_blocks').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
