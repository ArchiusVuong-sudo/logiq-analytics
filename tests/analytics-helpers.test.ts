import { describe, it, expect } from 'vitest';
import { _testHelpers } from '../lib/tools/analytics';
import type { Order } from '../types';

const { deliveryDays, isoWeek, bucketKey } = _testHelpers;

function order(over: Partial<Order> = {}): Order {
  return {
    client_id: 'c1',
    order_id: 'o1',
    order_date: '2025-06-15',
    delivery_date: '2025-06-20',
    carrier: 'DHL',
    origin_city: 'NYC',
    destination_city: 'LA',
    status: 'delivered',
    sku: 'SKU-1',
    product_category: 'BOOK',
    quantity: 1,
    unit_price_usd: 10,
    order_value_usd: 10,
    is_promo: false,
    promo_discount_pct: 0,
    region: 'US-E',
    warehouse: 'WH-01',
    ...over,
  } as Order;
}

describe('deliveryDays', () => {
  it('returns whole-day delta for valid dates', () => {
    expect(deliveryDays(order({ order_date: '2025-01-01', delivery_date: '2025-01-05' }))).toBe(4);
  });

  it('returns null when delivery_date missing', () => {
    expect(deliveryDays(order({ delivery_date: undefined as any }))).toBeNull();
  });

  it('returns null on invalid date', () => {
    expect(deliveryDays(order({ delivery_date: 'not-a-date' }))).toBeNull();
  });
});

describe('isoWeek', () => {
  it('formats as YYYY-Www with zero-padded week', () => {
    expect(isoWeek(new Date('2025-01-06'))).toMatch(/^2025-W0[12]$/);
  });

  it('produces stable keys for the same week', () => {
    const a = isoWeek(new Date('2025-06-16')); // Mon
    const b = isoWeek(new Date('2025-06-19')); // Thu
    expect(a).toBe(b);
  });
});

describe('bucketKey', () => {
  it('keys time dimensions consistently', () => {
    const o = order({ order_date: '2025-06-15' });
    expect(bucketKey(o, 'day')).toBe('2025-06-15');
    expect(bucketKey(o, 'month')).toBe('2025-06');
    expect(bucketKey(o, 'week')).toMatch(/^2025-W\d{2}$/);
  });

  it('keys categorical dimensions verbatim', () => {
    const o = order({ carrier: 'FedEx', region: 'EU', sku: 'X', product_category: 'PAPER', warehouse: 'WH-2' });
    expect(bucketKey(o, 'carrier')).toBe('FedEx');
    expect(bucketKey(o, 'region')).toBe('EU');
    expect(bucketKey(o, 'sku')).toBe('X');
    expect(bucketKey(o, 'product_category')).toBe('PAPER');
    expect(bucketKey(o, 'warehouse')).toBe('WH-2');
  });

  it('falls back to "Unknown" for nullable dimensions', () => {
    const o = order({ region: undefined as any, warehouse: null as any, destination_city: null as any });
    expect(bucketKey(o, 'region')).toBe('Unknown');
    expect(bucketKey(o, 'warehouse')).toBe('Unknown');
    expect(bucketKey(o, 'destination_city')).toBe('Unknown');
  });
});
