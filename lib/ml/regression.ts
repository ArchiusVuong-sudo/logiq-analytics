import { SimpleLinearRegression } from 'ml-regression-simple-linear';
import MLR from 'ml-regression-multivariate-linear';

export type LinearFit = {
  slope: number;
  intercept: number;
  r2: number;
  predictions: number[];
  residuals: number[];
};

export function linearRegression(x: number[], y: number[]): LinearFit {
  const m = new SimpleLinearRegression(x, y);
  const yhat = x.map(v => m.predict(v));
  const meanY = y.reduce((a, b) => a + b, 0) / y.length;
  const ssRes = y.reduce((s, yi, i) => s + (yi - yhat[i]) ** 2, 0);
  const ssTot = y.reduce((s, yi) => s + (yi - meanY) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return {
    slope: m.slope,
    intercept: m.intercept,
    r2,
    predictions: yhat,
    residuals: y.map((yi, i) => yi - yhat[i]),
  };
}

export function predictLinear(fit: { slope: number; intercept: number }, x: number[]): number[] {
  return x.map(v => fit.intercept + fit.slope * v);
}

export function movingAverage(values: number[], window: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
}

export function exponentialSmoothing(values: number[], alpha: number): { fitted: number[]; level: number } {
  if (!values.length) return { fitted: [], level: 0 };
  const fitted: number[] = [values[0]];
  let level = values[0];
  for (let i = 1; i < values.length; i++) {
    level = alpha * values[i] + (1 - alpha) * level;
    fitted.push(level);
  }
  return { fitted, level };
}

export function holtLinear(values: number[], alpha: number, beta: number): { fitted: number[]; level: number; trend: number } {
  if (values.length < 2) return { fitted: values.slice(), level: values[0] || 0, trend: 0 };
  let level = values[0];
  let trend = values[1] - values[0];
  const fitted: number[] = [level];
  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    fitted.push(level);
  }
  return { fitted, level, trend };
}

export function forecastHoltLinear(values: number[], horizon: number, alpha = 0.5, beta = 0.3) {
  const f = holtLinear(values, alpha, beta);
  const out: number[] = [];
  for (let i = 1; i <= horizon; i++) {
    out.push(f.level + f.trend * i);
  }
  return { future: out, alpha, beta, level: f.level, trend: f.trend, fitted: f.fitted };
}

export function forecastMovingAverage(values: number[], horizon: number, window = 3) {
  if (!values.length) return { future: new Array(horizon).fill(0), window };
  const tail = values.slice(-window);
  const avg = tail.reduce((a, b) => a + b, 0) / tail.length;
  return { future: new Array(horizon).fill(avg), window, last_avg: avg };
}

export function forecastLinearTrend(values: number[], horizon: number) {
  const x = values.map((_, i) => i);
  const fit = linearRegression(x, values);
  const future = [];
  for (let i = 0; i < horizon; i++) {
    future.push(fit.intercept + fit.slope * (values.length + i));
  }
  return { future, slope: fit.slope, intercept: fit.intercept, r2: fit.r2 };
}

// Simple logistic regression (binary classification) using gradient descent
export function logisticRegression(X: number[][], y: number[], opts: { lr?: number; iters?: number } = {}) {
  const lr = opts.lr ?? 0.1;
  const iters = opts.iters ?? 500;
  const n = X.length;
  const dim = X[0].length;
  // standardize features
  const means = new Array(dim).fill(0);
  const stds = new Array(dim).fill(1);
  for (let j = 0; j < dim; j++) {
    means[j] = X.reduce((s, r) => s + r[j], 0) / n;
    const v = X.reduce((s, r) => s + (r[j] - means[j]) ** 2, 0) / n;
    stds[j] = Math.sqrt(v) || 1;
  }
  const Xs = X.map(r => r.map((v, j) => (v - means[j]) / stds[j]));

  const weights = new Array(dim).fill(0);
  let bias = 0;
  const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
  const lossHistory: number[] = [];

  for (let it = 0; it < iters; it++) {
    let dw = new Array(dim).fill(0);
    let db = 0;
    let loss = 0;
    for (let i = 0; i < n; i++) {
      const z = Xs[i].reduce((s, v, j) => s + v * weights[j], 0) + bias;
      const p = sigmoid(z);
      const e = p - y[i];
      for (let j = 0; j < dim; j++) dw[j] += e * Xs[i][j];
      db += e;
      loss += -(y[i] * Math.log(p + 1e-12) + (1 - y[i]) * Math.log(1 - p + 1e-12));
    }
    for (let j = 0; j < dim; j++) weights[j] -= (lr * dw[j]) / n;
    bias -= (lr * db) / n;
    if (it % Math.max(1, Math.floor(iters / 10)) === 0) lossHistory.push(loss / n);
  }

  // accuracy
  let correct = 0;
  const probs: number[] = [];
  for (let i = 0; i < n; i++) {
    const z = Xs[i].reduce((s, v, j) => s + v * weights[j], 0) + bias;
    const p = sigmoid(z);
    probs.push(p);
    if ((p >= 0.5 ? 1 : 0) === y[i]) correct++;
  }
  return { weights, bias, means, stds, accuracy: correct / n, lossHistory, probabilities: probs };
}

export function multivariateLinear(X: number[][], y: number[][]) {
  const m = new MLR(X, y);
  const yhat = X.map(r => m.predict(r));
  return { weights: (m as any).weights, predictions: yhat };
}
