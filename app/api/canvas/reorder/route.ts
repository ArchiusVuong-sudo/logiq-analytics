import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/db/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { ordered_ids } = await req.json();
  if (!Array.isArray(ordered_ids)) return Response.json({ error: 'ordered_ids[] required' }, { status: 400 });
  const db = adminDb();
  const updates = await Promise.all(
    ordered_ids.map((id: string, i: number) =>
      db.from('canvas_blocks').update({ layout: { position: i } }).eq('id', id),
    ),
  );
  const errs = updates.filter(u => u.error);
  if (errs.length) return Response.json({ ok: false, errors: errs.map(e => e.error?.message) }, { status: 500 });
  return Response.json({ ok: true, count: ordered_ids.length });
}
