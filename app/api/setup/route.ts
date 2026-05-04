import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/db/supabase';
import { readFileSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: report setup status
export async function GET() {
  const db = adminDb();
  const checkTable = async (t: string) => {
    try {
      // Do a real SELECT (limit 0). PostgREST returns PGRST205 for missing tables.
      const r = await db.from(t).select('*').limit(0);
      if (r.error) return { ok: false, count: 0, error: r.error.message };
      // Then count separately
      const c = await db.from(t).select('id', { count: 'exact', head: true });
      return { ok: true, count: c.count || 0 };
    } catch (e: any) {
      return { ok: false, count: 0, error: e?.message };
    }
  };
  const [oOrders, oThreads, oMessages, oCanvas, oModels] = await Promise.all([
    checkTable('orders'), checkTable('threads'), checkTable('messages'), checkTable('canvas_blocks'), checkTable('trained_models'),
  ]);
  const ordersOk = oOrders.ok, threadsOk = oThreads.ok, messagesOk = oMessages.ok, canvasOk = oCanvas.ok, modelsOk = oModels.ok;
  const count = oOrders.count;

  let sql = '';
  try {
    sql = readFileSync(path.join(process.cwd(), 'lib/db/schema.sql'), 'utf-8');
  } catch {}

  return Response.json({
    schema_ok: ordersOk && threadsOk && messagesOk && canvasOk && modelsOk,
    tables: { orders: ordersOk, threads: threadsOk, messages: messagesOk, canvas_blocks: canvasOk, trained_models: modelsOk },
    orders_count: count,
    schema_sql: sql,
  });
}

// POST: try to seed orders from the bundled mock CSV (only inserts, requires schema to exist)
export async function POST(req: NextRequest) {
  const { action } = await req.json().catch(() => ({}));
  const db = adminDb();
  if (action === 'seed_mock') {
    let csv = '';
    try {
      csv = readFileSync(path.join(process.cwd(), 'public/mock_logistics_data.csv'), 'utf-8');
    } catch {
      try {
        csv = readFileSync(path.join(process.cwd(), 'mock_logistics_data.csv'), 'utf-8');
      } catch (e: any) {
        return Response.json({ ok: false, error: 'mock_logistics_data.csv not found' }, { status: 404 });
      }
    }
    const Papa = (await import('papaparse')).default;
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
    const rows = (parsed.data as any[]).map(r => ({
      client_id: r.client_id,
      order_id: r.order_id,
      order_date: r.order_date,
      delivery_date: r.delivery_date || null,
      carrier: r.carrier,
      origin_city: r.origin_city,
      destination_city: r.destination_city,
      status: r.status,
      sku: r.sku,
      product_category: r.product_category,
      quantity: Number(r.quantity) || 1,
      unit_price_usd: r.unit_price_usd ? Number(r.unit_price_usd) : null,
      order_value_usd: Number(r.order_value_usd) || 0,
      is_promo: r.is_promo === '1' || r.is_promo === 'true',
      promo_discount_pct: Number(r.promo_discount_pct) || 0,
      region: r.region || null,
      warehouse: r.warehouse || null,
    }));
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error, data } = await db.from('orders').upsert(chunk, { onConflict: 'order_id' }).select('id');
      if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
      inserted += data?.length || 0;
    }
    return Response.json({ ok: true, inserted });
  }
  return Response.json({ ok: false, error: 'unknown action' }, { status: 400 });
}
