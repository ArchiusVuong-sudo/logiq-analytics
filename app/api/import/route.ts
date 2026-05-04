import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/db/supabase';
import Papa from 'papaparse';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';
  let csvText = '';
  let mode: 'upsert' | 'append' = 'upsert';

  if (ct.startsWith('multipart/form-data')) {
    const fd = await req.formData();
    const f = fd.get('file');
    mode = ((fd.get('mode') as string) || 'upsert') as any;
    if (!f || typeof f === 'string') return Response.json({ error: 'file missing' }, { status: 400 });
    csvText = await (f as File).text();
  } else {
    const body = await req.json();
    csvText = body.csv || '';
    mode = body.mode || 'upsert';
  }

  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  if (parsed.errors.length && parsed.data.length === 0) {
    return Response.json({ error: 'CSV parse failed', details: parsed.errors }, { status: 400 });
  }
  const required = ['order_id', 'order_date', 'carrier', 'status', 'sku', 'product_category', 'quantity', 'order_value_usd'];
  const sample = parsed.data[0] as any;
  const missing = required.filter(k => !(k in (sample || {})));
  if (missing.length) {
    return Response.json({ error: `Missing required columns: ${missing.join(', ')}`, found_columns: Object.keys(sample || {}) }, { status: 400 });
  }

  const rows = (parsed.data as any[]).map(r => ({
    client_id: r.client_id || 'CL-IMPORT',
    order_id: r.order_id,
    order_date: r.order_date,
    delivery_date: r.delivery_date || null,
    carrier: r.carrier,
    origin_city: r.origin_city || null,
    destination_city: r.destination_city || null,
    status: r.status,
    sku: r.sku,
    product_category: r.product_category,
    quantity: Number(r.quantity) || 1,
    unit_price_usd: r.unit_price_usd ? Number(r.unit_price_usd) : null,
    order_value_usd: Number(r.order_value_usd) || 0,
    is_promo: r.is_promo === '1' || r.is_promo === 'true' || r.is_promo === true,
    promo_discount_pct: Number(r.promo_discount_pct) || 0,
    region: r.region || null,
    warehouse: r.warehouse || null,
  }));

  const db = adminDb();
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const q = mode === 'upsert' ? db.from('orders').upsert(chunk, { onConflict: 'order_id' }) : db.from('orders').insert(chunk);
    const { error, data } = await q.select('id');
    if (error) return Response.json({ ok: false, error: error.message, inserted_so_far: inserted }, { status: 500 });
    inserted += data?.length || chunk.length;
  }
  return Response.json({ ok: true, inserted, total_rows_in_csv: rows.length, mode });
}
