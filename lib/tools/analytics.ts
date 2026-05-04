import { adminDb } from '@/lib/db/supabase';
import { Order } from '@/types';

export type Filters = {
  start_date?: string;
  end_date?: string;
  carrier?: string;
  status?: string;
  region?: string;
  product_category?: string;
  sku?: string;
  warehouse?: string;
};

export type GroupBy =
  | 'day'
  | 'week'
  | 'month'
  | 'carrier'
  | 'status'
  | 'region'
  | 'product_category'
  | 'sku'
  | 'warehouse'
  | 'destination_city'
  | 'origin_city';

export type Agg = 'count' | 'sum_value' | 'avg_value' | 'avg_delivery_days' | 'on_time_rate' | 'delay_rate';

const PAGE = 1000;

async function fetchAll(filters: Filters): Promise<Order[]> {
  const db = adminDb();
  let query = db.from('orders').select('*');
  if (filters.start_date) query = query.gte('order_date', filters.start_date);
  if (filters.end_date) query = query.lte('order_date', filters.end_date);
  if (filters.carrier) query = query.eq('carrier', filters.carrier);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.region) query = query.eq('region', filters.region);
  if (filters.product_category) query = query.eq('product_category', filters.product_category);
  if (filters.sku) query = query.eq('sku', filters.sku);
  if (filters.warehouse) query = query.eq('warehouse', filters.warehouse);

  const all: Order[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as any));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function deliveryDays(o: Order): number | null {
  if (!o.delivery_date) return null;
  const d1 = new Date(o.order_date).getTime();
  const d2 = new Date(o.delivery_date).getTime();
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.round((d2 - d1) / 86400000);
}

function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function bucketKey(o: Order, gb: GroupBy): string {
  const d = new Date(o.order_date);
  switch (gb) {
    case 'day': return o.order_date;
    case 'week': return isoWeek(d);
    case 'month': return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    case 'carrier': return o.carrier;
    case 'status': return o.status;
    case 'region': return o.region || 'Unknown';
    case 'product_category': return o.product_category;
    case 'sku': return o.sku;
    case 'warehouse': return o.warehouse || 'Unknown';
    case 'destination_city': return o.destination_city || 'Unknown';
    case 'origin_city': return o.origin_city || 'Unknown';
  }
}

export async function computeKPIs(filters: Filters = {}) {
  const rows = await fetchAll(filters);
  const total = rows.length;
  const delivered = rows.filter(r => r.status === 'delivered').length;
  const delayed = rows.filter(r => r.status === 'delayed').length;
  const inTransit = rows.filter(r => r.status === 'in_transit').length;
  const exceptions = rows.filter(r => r.status === 'exception').length;
  const canceled = rows.filter(r => r.status === 'canceled').length;
  const completed = delivered + delayed;
  const onTimeRate = completed > 0 ? delivered / completed : 0;
  const delayRate = completed > 0 ? delayed / completed : 0;
  const days = rows.map(deliveryDays).filter((d): d is number => d != null && d >= 0);
  const avgDeliveryDays = days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0;
  const totalRevenue = rows.reduce((s, r) => s + (Number(r.order_value_usd) || 0), 0);
  const promoOrders = rows.filter(r => r.is_promo).length;

  return {
    filters,
    total_orders: total,
    delivered_orders: delivered,
    delayed_orders: delayed,
    in_transit_orders: inTransit,
    exception_orders: exceptions,
    canceled_orders: canceled,
    on_time_delivery_rate: round4(onTimeRate),
    delay_rate: round4(delayRate),
    avg_delivery_days: round2(avgDeliveryDays),
    total_revenue_usd: round2(totalRevenue),
    promo_orders: promoOrders,
    promo_share: round4(total ? promoOrders / total : 0),
  };
}

export async function aggregate(params: {
  group_by: GroupBy;
  metric: Agg;
  filters?: Filters;
  top?: number;
  sort?: 'asc' | 'desc' | 'natural';
}) {
  const { group_by, metric, filters = {}, top, sort = 'desc' } = params;
  const rows = await fetchAll(filters);

  const groups = new Map<string, Order[]>();
  for (const r of rows) {
    const k = bucketKey(r, group_by);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  const buckets: { key: string; value: number; count: number }[] = [];
  for (const [key, items] of groups) {
    let value = 0;
    if (metric === 'count') value = items.length;
    else if (metric === 'sum_value') value = items.reduce((s, x) => s + Number(x.order_value_usd || 0), 0);
    else if (metric === 'avg_value') value = items.length ? items.reduce((s, x) => s + Number(x.order_value_usd || 0), 0) / items.length : 0;
    else if (metric === 'avg_delivery_days') {
      const ds = items.map(deliveryDays).filter((d): d is number => d != null && d >= 0);
      value = ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : 0;
    } else if (metric === 'on_time_rate') {
      const completed = items.filter(x => x.status === 'delivered' || x.status === 'delayed');
      value = completed.length ? completed.filter(x => x.status === 'delivered').length / completed.length : 0;
    } else if (metric === 'delay_rate') {
      const completed = items.filter(x => x.status === 'delivered' || x.status === 'delayed');
      value = completed.length ? completed.filter(x => x.status === 'delayed').length / completed.length : 0;
    }
    buckets.push({ key, value: round4(value), count: items.length });
  }

  if (sort === 'natural' && (group_by === 'day' || group_by === 'week' || group_by === 'month')) {
    buckets.sort((a, b) => a.key.localeCompare(b.key));
  } else if (sort === 'asc') {
    buckets.sort((a, b) => a.value - b.value);
  } else {
    buckets.sort((a, b) => b.value - a.value);
  }
  const final = top ? buckets.slice(0, top) : buckets;
  return { group_by, metric, filters, buckets: final };
}

export async function topN(params: {
  dimension: GroupBy;
  metric: Agg;
  n: number;
  filters?: Filters;
  order?: 'asc' | 'desc';
}) {
  return aggregate({
    group_by: params.dimension,
    metric: params.metric,
    filters: params.filters,
    top: params.n,
    sort: params.order || 'desc',
  });
}

export async function timeSeries(params: {
  metric: Agg;
  granularity: 'day' | 'week' | 'month';
  filters?: Filters;
  series_by?: 'carrier' | 'status' | 'region' | 'product_category' | 'none';
}) {
  const { metric, granularity, filters = {}, series_by = 'none' } = params;
  const rows = await fetchAll(filters);
  const labelSet = new Set<string>();
  const seriesMap = new Map<string, Map<string, Order[]>>();

  for (const r of rows) {
    const t = bucketKey(r, granularity);
    labelSet.add(t);
    const s = series_by === 'none' ? 'value' : (r as any)[series_by] ?? 'Unknown';
    if (!seriesMap.has(s)) seriesMap.set(s, new Map());
    const ts = seriesMap.get(s)!;
    if (!ts.has(t)) ts.set(t, []);
    ts.get(t)!.push(r);
  }

  const labels = [...labelSet].sort();
  const series = [...seriesMap.entries()].map(([name, byT]) => {
    const data = labels.map(l => {
      const items = byT.get(l) || [];
      if (metric === 'count') return items.length;
      if (metric === 'sum_value') return round2(items.reduce((s, x) => s + Number(x.order_value_usd || 0), 0));
      if (metric === 'avg_value') return round2(items.length ? items.reduce((s, x) => s + Number(x.order_value_usd || 0), 0) / items.length : 0);
      if (metric === 'avg_delivery_days') {
        const ds = items.map(deliveryDays).filter((d): d is number => d != null && d >= 0);
        return round2(ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : 0);
      }
      if (metric === 'on_time_rate') {
        const c = items.filter(x => x.status === 'delivered' || x.status === 'delayed');
        return round4(c.length ? c.filter(x => x.status === 'delivered').length / c.length : 0);
      }
      if (metric === 'delay_rate') {
        const c = items.filter(x => x.status === 'delivered' || x.status === 'delayed');
        return round4(c.length ? c.filter(x => x.status === 'delayed').length / c.length : 0);
      }
      return 0;
    });
    return { name, data };
  });

  return { metric, granularity, series_by, filters, labels, series };
}

export async function listSamples(params: { filters?: Filters; limit?: number; order_by?: 'order_date' | 'delivery_date' | 'order_value_usd' }) {
  const db = adminDb();
  const limit = Math.min(params.limit || 25, 200);
  const ob = params.order_by || 'order_date';
  let query = db.from('orders').select('*').order(ob, { ascending: false }).limit(limit);
  const f = params.filters || {};
  if (f.start_date) query = query.gte('order_date', f.start_date);
  if (f.end_date) query = query.lte('order_date', f.end_date);
  if (f.carrier) query = query.eq('carrier', f.carrier);
  if (f.status) query = query.eq('status', f.status);
  if (f.region) query = query.eq('region', f.region);
  if (f.product_category) query = query.eq('product_category', f.product_category);
  if (f.sku) query = query.eq('sku', f.sku);
  const { data, error } = await query;
  if (error) throw error;
  return { rows: data || [], count: (data || []).length, filters: f };
}

export async function dimensions() {
  const rows = await fetchAll({});
  return {
    total_rows: rows.length,
    date_range: {
      min: rows.reduce((m, r) => (m && m < r.order_date ? m : r.order_date), '' as string),
      max: rows.reduce((m, r) => (m && m > r.order_date ? m : r.order_date), '' as string),
    },
    carriers: [...new Set(rows.map(r => r.carrier))].sort(),
    statuses: [...new Set(rows.map(r => r.status))].sort(),
    regions: [...new Set(rows.map(r => r.region).filter(Boolean))].sort(),
    product_categories: [...new Set(rows.map(r => r.product_category))].sort(),
    warehouses: [...new Set(rows.map(r => r.warehouse).filter(Boolean))].sort(),
    sku_count: new Set(rows.map(r => r.sku)).size,
  };
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round4(n: number) { return Math.round(n * 10000) / 10000; }

export const _testHelpers = { deliveryDays, isoWeek, bucketKey };
