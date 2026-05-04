import { describe, it, expect } from 'vitest';
import {
  linearRegression,
  movingAverage,
  exponentialSmoothing,
  holtLinear,
  forecastHoltLinear,
  forecastMovingAverage,
  forecastLinearTrend,
  logisticRegression,
} from '../lib/ml/regression';

describe('linearRegression', () => {
  it('recovers slope and intercept of a perfect line', () => {
    const x = [0, 1, 2, 3, 4];
    const y = x.map(v => 2 * v + 5); // slope=2, intercept=5
    const fit = linearRegression(x, y);
    expect(fit.slope).toBeCloseTo(2, 6);
    expect(fit.intercept).toBeCloseTo(5, 6);
    expect(fit.r2).toBeCloseTo(1, 6);
    expect(fit.residuals.every(r => Math.abs(r) < 1e-9)).toBe(true);
  });

  it('returns r2 between 0 and 1 on noisy data', () => {
    const x = [0, 1, 2, 3, 4, 5];
    const y = [1.1, 2.0, 2.9, 4.2, 4.8, 6.1];
    const fit = linearRegression(x, y);
    expect(fit.r2).toBeGreaterThan(0.95);
    expect(fit.r2).toBeLessThanOrEqual(1);
  });
});

describe('movingAverage', () => {
  it('returns same length as input', () => {
    const ma = movingAverage([10, 20, 30, 40, 50], 3);
    expect(ma).toHaveLength(5);
  });

  it('averages within window', () => {
    const ma = movingAverage([10, 20, 30, 40, 50], 3);
    expect(ma[2]).toBeCloseTo(20, 6); // (10+20+30)/3
    expect(ma[4]).toBeCloseTo(40, 6); // (30+40+50)/3
  });
});

describe('exponentialSmoothing', () => {
  it('seeds at first value and converges', () => {
    const sm = exponentialSmoothing([10, 12, 14, 16], 0.5);
    expect(sm.fitted[0]).toBe(10);
    expect(sm.fitted[3]).toBeGreaterThan(sm.fitted[0]);
    expect(sm.level).toBe(sm.fitted[sm.fitted.length - 1]);
  });

  it('handles empty input', () => {
    const sm = exponentialSmoothing([], 0.5);
    expect(sm.fitted).toEqual([]);
    expect(sm.level).toBe(0);
  });
});

describe('holtLinear', () => {
  it('captures both level and trend on a linear series', () => {
    const series = [10, 12, 14, 16, 18, 20];
    const f = holtLinear(series, 0.5, 0.3);
    expect(f.trend).toBeGreaterThan(0);
    expect(f.level).toBeGreaterThan(15);
  });
});

describe('forecast wrappers', () => {
  it('forecastHoltLinear projects horizon steps', () => {
    const r = forecastHoltLinear([10, 12, 14, 16], 4);
    expect(r.future).toHaveLength(4);
    // Increasing series → forecast should be ascending
    expect(r.future[3]).toBeGreaterThan(r.future[0]);
  });

  it('forecastMovingAverage returns flat forecast equal to last window mean', () => {
    const r = forecastMovingAverage([10, 20, 30, 40, 50], 3, 3);
    // Last 3 = [30,40,50] → avg 40
    expect(r.future).toEqual([40, 40, 40]);
    expect(r.last_avg).toBe(40);
  });

  it('forecastLinearTrend extends a linear trend', () => {
    const r = forecastLinearTrend([10, 20, 30, 40], 2);
    // slope=10, next two are at indices 4,5 → 50,60
    expect(r.future[0]).toBeCloseTo(50, 6);
    expect(r.future[1]).toBeCloseTo(60, 6);
  });
});

describe('logisticRegression', () => {
  it('separates a linearly-separable binary problem with high accuracy', () => {
    // Two clusters: class 0 around (-2,-2), class 1 around (+2,+2)
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 30; i++) {
      X.push([-2 + Math.random() * 0.5, -2 + Math.random() * 0.5]);
      y.push(0);
    }
    for (let i = 0; i < 30; i++) {
      X.push([2 + Math.random() * 0.5, 2 + Math.random() * 0.5]);
      y.push(1);
    }
    const fit = logisticRegression(X, y, { lr: 0.3, iters: 600 });
    expect(fit.accuracy).toBeGreaterThan(0.95);
    expect(fit.weights).toHaveLength(2);
    expect(fit.probabilities).toHaveLength(60);
    expect(fit.lossHistory.length).toBeGreaterThan(0);
    // Loss should generally decrease
    expect(fit.lossHistory[fit.lossHistory.length - 1]).toBeLessThan(fit.lossHistory[0]);
  });
});
