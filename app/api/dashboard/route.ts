import { NextRequest } from 'next/server';
import { computeKPIs, aggregate, timeSeries, dimensions } from '@/lib/tools/analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filters: any = {};
  for (const k of ['start_date', 'end_date', 'carrier', 'status', 'region', 'product_category', 'sku', 'warehouse']) {
    const v = sp.get(k);
    if (v) filters[k] = v;
  }

  try {
    const [kpis, byCarrier, byStatus, byRegion, byCategory, ts, dims] = await Promise.all([
      computeKPIs(filters),
      aggregate({ group_by: 'carrier', metric: 'count', filters, top: 10 }),
      aggregate({ group_by: 'status', metric: 'count', filters }),
      aggregate({ group_by: 'region', metric: 'count', filters }),
      aggregate({ group_by: 'product_category', metric: 'count', filters }),
      timeSeries({ metric: 'count', granularity: 'month', series_by: 'status', filters }),
      dimensions(),
    ]);
    const carrierDelay = await aggregate({ group_by: 'carrier', metric: 'delay_rate', filters, top: 10 });
    return Response.json({ kpis, byCarrier, byStatus, byRegion, byCategory, ts, carrierDelay, dims });
  } catch (e: any) {
    return Response.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
