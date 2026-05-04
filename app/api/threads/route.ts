import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/db/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = adminDb();
  const { data, error } = await db.from('threads').select('id,title,created_at,updated_at').order('updated_at', { ascending: false }).limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ threads: data || [] });
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
