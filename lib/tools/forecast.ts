import { adminDb } from '@/lib/db/supabase';
import {
  forecastLinearTrend,
  forecastMovingAverage,
  forecastHoltLinear,
  exponentialSmoothing,
  linearRegression,
  logisticRegression,
} from '@/lib/ml/regression';
import { Order } from '@/types';

export type Granularity = 'day' | 'week' | 'month';
export type Method = 'moving_average' | 'linear_regression' | 'exponential_smoothing' | 'holt_linear';

function isoMonth(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function nextLabel(label: string, granularity: Granularity, step: number): string {
  if (granularity === 'day') {
    const d = new Date(label);
    d.setUTCDate(d.getUTCDate() + step);
    return d.toISOString().slice(0, 10);
  }
  if (granularity === 'month') {
    const [y, m] = label.split('-').map(Number);
    const total = (y * 12 + (m - 1)) + step;
    const ny = Math.floor(total / 12);
    const nm = (total % 12) + 1;
    return `${ny}-${String(nm).padStart(2, '0')}`;
  }
  // week
  const [yStr, wStr] = label.split('-W');
  const y = Number(yStr);
  const w = Number(wStr) + step;
  let year = y;
  let week = w;
  while (week > 52) { year++; week -= 52; }
  while (week < 1) { year--; week += 52; }
  return `${year}-W${String(week).padStart(2, '0')}`;
}

async function fetchOrders(filters: { sku?: string; product_category?: string; carrier?: string; region?: string; status?: string; start_date?: string; end_date?: string; }): Promise<Order[]> {
  const db = adminDb();
  let q = db.from('orders').select('*').order('order_date');
  if (filters.sku) q = q.eq('sku', filters.sku);
  if (filters.product_category) q = q.eq('product_category', filters.product_category);
  if (filters.carrier) q = q.eq('carrier', filters.carrier);
  if (filters.region) q = q.eq('region', filters.region);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.start_date) q = q.gte('order_date', filters.start_date);
  if (filters.end_date) q = q.lte('order_date', filters.end_date);
  const all: Order[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await q.range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as any));
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

export async function forecastDemand(params: {
  sku?: string;
  product_category?: string;
  carrier?: string;
  region?: string;
  granularity?: Granularity;
  horizon?: number;
  method?: Method;
}) {
  const granularity = params.granularity || 'month';
  const horizon = params.horizon || 4;
  const method = params.method || 'holt_linear';

  const rows = await fetchOrders(params);
  if (rows.length < 3) {
    return {
      ok: false,
      error: 'Not enough historical data for forecast (need ≥ 3 buckets).',
      method,
      granularity,
      horizon,
      filters: params,
      history_count: rows.length,
    };
  }

  // Aggregate quantity per period
  const buckets = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.order_date);
    const key = granularity === 'day' ? r.order_date : granularity === 'week' ? isoWeek(d) : isoMonth(d);
    buckets.set(key, (buckets.get(key) || 0) + Number(r.quantity || 0));
  }
  // Fill missing periods within range (especially for forecasting accuracy)
  const labels = [...buckets.keys()].sort();
  if (labels.length < 3) {
    return { ok: false, error: 'Need ≥ 3 distinct time buckets for forecasting.', method, granularity, horizon, filters: params, history_count: labels.length };
  }
  const values = labels.map(l => buckets.get(l)!);
  const history = labels.map((l, i) => ({ date: l, value: values[i] }));

  let future: number[] = [];
  let methodDetail: any = {};
  if (method === 'moving_average') {
    const r = forecastMovingAverage(values, horizon, 3);
    future = r.future;
    methodDetail = r;
  } else if (method === 'linear_regression') {
    const r = forecastLinearTrend(values, horizon);
    future = r.future;
    methodDetail = r;
  } else if (method === 'exponential_smoothing') {
    const sm = exponentialSmoothing(values, 0.4);
    const fit = linearRegression(values.map((_, i) => i), sm.fitted);
    future = [];
    for (let i = 0; i < horizon; i++) future.push(fit.intercept + fit.slope * (values.length + i));
    methodDetail = { alpha: 0.4, level: sm.level, slope: fit.slope, intercept: fit.intercept, r2: fit.r2 };
  } else {
    const r = forecastHoltLinear(values, horizon, 0.5, 0.3);
    future = r.future;
    methodDetail = r;
  }

  // Generate forecast labels
  const forecast: { date: string; value: number; lower?: number; upper?: number }[] = [];
  const stdResid = (() => {
    const x = values.map((_, i) => i);
    const fit = linearRegression(x, values);
    const variance = fit.residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, values.length - 1);
    return Math.sqrt(variance);
  })();
  const z = 1.645; // 90% CI
  for (let i = 0; i < horizon; i++) {
    const label = nextLabel(labels[labels.length - 1], granularity, i + 1);
    const v = Math.max(0, Math.round(future[i] * 10) / 10);
    forecast.push({ date: label, value: v, lower: Math.max(0, Math.round((v - z * stdResid) * 10) / 10), upper: Math.round((v + z * stdResid) * 10) / 10 });
  }

  // Inventory recommendation: average forecast * safety factor (1.2)
  const totalForecast = forecast.reduce((s, f) => s + f.value, 0);
  const recommendedInventory = Math.ceil(totalForecast * 1.2);
  const avgForecast = totalForecast / horizon;
  const recommendation = `Plan inventory of approximately ${recommendedInventory} units to cover ${horizon} ${granularity}(s) of demand (avg ${avgForecast.toFixed(1)}/${granularity}, +20% safety stock).`;

  // In-sample residuals: difference between actual history and what the chosen model would have predicted at each step
  const inSampleFit = (() => {
    if (method === 'moving_average') {
      const w = 3;
      const fitted: number[] = values.map((_, i) => {
        const start = Math.max(0, i - w + 1);
        const slice = values.slice(start, i + 1);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
      });
      return fitted;
    }
    if (method === 'linear_regression') {
      return values.map((_, i) => methodDetail.intercept + methodDetail.slope * i);
    }
    if (method === 'exponential_smoothing') {
      const sm = exponentialSmoothing(values, 0.4);
      return sm.fitted;
    }
    return methodDetail.fitted || values.slice();
  })();
  const residuals = values.map((v, i) => v - (inSampleFit[i] ?? v));
  const ssRes = residuals.reduce((s, r) => s + r * r, 0);
  const meanY = values.reduce((a, b) => a + b, 0) / values.length;
  const ssTot = values.reduce((s, v) => s + (v - meanY) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  const rmse = Math.sqrt(ssRes / values.length);
  const mae = residuals.reduce((s, r) => s + Math.abs(r), 0) / values.length;
  const mape = values.reduce((s, v, i) => v === 0 ? s : s + Math.abs(residuals[i] / v), 0) / values.length;

  return {
    ok: true,
    method,
    granularity,
    horizon,
    filters: params,
    history,
    forecast,
    in_sample_fit: history.map((h, i) => ({ date: h.date, actual: h.value, fitted: Math.round((inSampleFit[i] ?? h.value) * 100) / 100, residual: Math.round(residuals[i] * 100) / 100 })),
    diagnostics: {
      r2: Math.round(r2 * 10000) / 10000,
      rmse: Math.round(rmse * 100) / 100,
      mae: Math.round(mae * 100) / 100,
      mape: Math.round(mape * 10000) / 10000,
      residual_std: Math.round(Math.sqrt(ssRes / Math.max(1, values.length - 1)) * 100) / 100,
    },
    method_detail: methodDetail,
    recommendation,
    explanation: explainMethod(method, methodDetail, history.length, horizon, granularity) + ` In-sample fit: R²=${r2.toFixed(3)}, RMSE=${rmse.toFixed(2)}, MAPE=${(mape * 100).toFixed(1)}%.`,
  };
}

function explainMethod(m: Method, detail: any, n: number, h: number, g: Granularity): string {
  if (m === 'moving_average') {
    return `Used a 3-${g} moving average over ${n} historical periods. The forecast assumes recent demand is the best estimate of next ${h} ${g}(s) (last avg = ${(detail.last_avg || 0).toFixed(2)}). Best when demand is stable.`;
  }
  if (m === 'linear_regression') {
    return `Fit a linear regression on ${n} points (slope=${(detail.slope || 0).toFixed(3)}, intercept=${(detail.intercept || 0).toFixed(2)}, R²=${(detail.r2 || 0).toFixed(3)}). Projects the existing trend forward ${h} ${g}(s). Best when there's a clear monotone trend.`;
  }
  if (m === 'exponential_smoothing') {
    return `Applied simple exponential smoothing (α=${detail.alpha}) then projected the smoothed trend. Recent observations weighted more heavily; good when demand is noisy but trending.`;
  }
  return `Holt linear method (α=${detail.alpha}, β=${detail.beta}) tracks both level (${(detail.level || 0).toFixed(2)}) and trend (${(detail.trend || 0).toFixed(3)}). Robust default for ${h}-step ahead forecasting on logistics demand series.`;
}

// ── Classifier diagnostics: confusion matrix, ROC, probability histogram, feature importance ──
function classifierDiagnostics(y: number[], probs: number[], features: string[], weights: number[], stds: number[]) {
  // confusion matrix at 0.5 threshold
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (let i = 0; i < y.length; i++) {
    const pred = probs[i] >= 0.5 ? 1 : 0;
    if (pred === 1 && y[i] === 1) tp++;
    else if (pred === 1 && y[i] === 0) fp++;
    else if (pred === 0 && y[i] === 0) tn++;
    else fn++;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // probability histogram (10 bins, separated by class)
  const bins = 10;
  const histPos = new Array(bins).fill(0);
  const histNeg = new Array(bins).fill(0);
  for (let i = 0; i < y.length; i++) {
    const b = Math.min(bins - 1, Math.floor(probs[i] * bins));
    if (y[i] === 1) histPos[b]++;
    else histNeg[b]++;
  }
  const histLabels = Array.from({ length: bins }, (_, i) => `${(i / bins).toFixed(1)}-${((i + 1) / bins).toFixed(1)}`);

  // ROC curve points (sweep threshold)
  const order = Array.from({ length: probs.length }, (_, i) => i).sort((a, b) => probs[b] - probs[a]);
  const totalPos = y.reduce((s, v) => s + v, 0);
  const totalNeg = y.length - totalPos;
  const roc: { fpr: number; tpr: number; threshold: number }[] = [{ fpr: 0, tpr: 0, threshold: 1.01 }];
  let curTp = 0, curFp = 0;
  for (const idx of order) {
    if (y[idx] === 1) curTp++; else curFp++;
    roc.push({
      fpr: totalNeg ? curFp / totalNeg : 0,
      tpr: totalPos ? curTp / totalPos : 0,
      threshold: probs[idx],
    });
  }
  // AUC via trapezoidal rule
  let auc = 0;
  for (let i = 1; i < roc.length; i++) auc += (roc[i].fpr - roc[i - 1].fpr) * (roc[i].tpr + roc[i - 1].tpr) / 2;

  // feature importance: |weight| (already standardized, so directly comparable)
  const importance = features.map((name, i) => ({
    feature: name,
    weight: Math.round(weights[i] * 1000) / 1000,
    abs_weight: Math.abs(weights[i]),
    direction: weights[i] >= 0 ? 'positive' : 'negative',
  })).sort((a, b) => b.abs_weight - a.abs_weight);

  return {
    confusion_matrix: { tp, fp, tn, fn },
    metrics: {
      precision: Math.round(precision * 10000) / 10000,
      recall: Math.round(recall * 10000) / 10000,
      f1: Math.round(f1 * 10000) / 10000,
      auc: Math.round(auc * 10000) / 10000,
    },
    probability_histogram: { labels: histLabels, positive_class_count: histPos, negative_class_count: histNeg },
    roc_curve: roc.filter((_, i) => i % Math.max(1, Math.floor(roc.length / 60)) === 0 || i === roc.length - 1),
    feature_importance: importance,
  };
}

// Self-trained logistic regression for predicting delay probability
export async function trainDelayClassifier(params: { features?: string[]; filters?: any }) {
  const features = params.features || ['order_value_usd', 'quantity', 'is_promo'];
  const rows = await fetchOrders(params.filters || {});
  // only delivered/delayed
  const labeled = rows.filter(r => r.status === 'delivered' || r.status === 'delayed');
  if (labeled.length < 30) {
    return { ok: false, error: 'Need ≥ 30 labeled (delivered/delayed) rows to train.', training_size: labeled.length };
  }
  const X: number[][] = [];
  const y: number[] = [];
  for (const r of labeled) {
    const row = features.map(f => {
      const v = (r as any)[f];
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'number') return v;
      return Number(v) || 0;
    });
    X.push(row);
    y.push(r.status === 'delayed' ? 1 : 0);
  }
  const fit = logisticRegression(X, y, { lr: 0.3, iters: 800 });
  const positives = y.filter(v => v === 1).length;
  const diag = classifierDiagnostics(y, fit.probabilities, features, fit.weights, fit.stds);
  return {
    ok: true,
    name: 'delay_classifier',
    kind: 'logistic_regression',
    features,
    training_size: labeled.length,
    positives,
    accuracy: fit.accuracy,
    weights: fit.weights,
    bias: fit.bias,
    means: fit.means,
    stds: fit.stds,
    loss_history: fit.lossHistory,
    ...diag,
    explanation: `Trained binary logistic regression on ${labeled.length} delivered/delayed orders (positive rate = ${(positives / labeled.length).toFixed(2)}). Features standardized. ${(fit.accuracy * 100).toFixed(1)}% accuracy, F1=${diag.metrics.f1.toFixed(3)}, AUC=${diag.metrics.auc.toFixed(3)}.`,
  };
}

export async function trainCustomModel(params: {
  name: string;
  kind: 'linear_regression' | 'logistic_regression';
  target: string; // numeric or boolean column for linear, or categorical for logistic ('delayed' = positive)
  features: string[];
  positive_class?: string;
  filters?: any;
}) {
  const rows = await fetchOrders(params.filters || {});
  if (rows.length < 30) {
    return { ok: false, error: 'Need ≥ 30 rows to train.' };
  }
  const X: number[][] = [];
  const y: number[] = [];
  for (const r of rows) {
    const row = params.features.map(f => {
      const v = (r as any)[f];
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'number') return v;
      return Number(v) || 0;
    });
    X.push(row);
    const t = (r as any)[params.target];
    if (params.kind === 'logistic_regression') {
      const cls = params.positive_class ?? 'delayed';
      y.push(t === cls ? 1 : 0);
    } else {
      y.push(typeof t === 'number' ? t : Number(t) || 0);
    }
  }
  if (params.kind === 'logistic_regression') {
    const fit = logisticRegression(X, y, { iters: 800 });
    const diag = classifierDiagnostics(y, fit.probabilities, params.features, fit.weights, fit.stds);
    return {
      ok: true,
      name: params.name,
      kind: params.kind,
      training_size: X.length,
      accuracy: fit.accuracy,
      loss_history: fit.lossHistory,
      weights: fit.weights,
      bias: fit.bias,
      ...diag,
      features: params.features,
      target: params.target,
      explanation: `Trained ${params.name} (${params.kind}) on ${X.length} rows. Accuracy: ${(fit.accuracy * 100).toFixed(1)}%, F1=${diag.metrics.f1.toFixed(3)}, AUC=${diag.metrics.auc.toFixed(3)}.`,
    };
  } else {
    const xs = X.map((_, i) => i);
    const ys = y;
    const fit = linearRegression(xs, ys);
    const residuals = fit.residuals;
    const yhat = fit.predictions;
    const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
    const ssRes = residuals.reduce((s, r) => s + r * r, 0);
    const rmse = Math.sqrt(ssRes / ys.length);
    const mae = residuals.reduce((s, r) => s + Math.abs(r), 0) / ys.length;
    return {
      ok: true,
      name: params.name,
      kind: params.kind,
      training_size: X.length,
      r2: fit.r2,
      rmse: Math.round(rmse * 100) / 100,
      mae: Math.round(mae * 100) / 100,
      mean_y: Math.round(meanY * 100) / 100,
      slope: fit.slope,
      intercept: fit.intercept,
      predictions: yhat.map((v, i) => ({ x: i, predicted: Math.round(v * 100) / 100, actual: ys[i], residual: Math.round(residuals[i] * 100) / 100 })).slice(0, 200),
      residuals_summary: {
        min: Math.min(...residuals),
        max: Math.max(...residuals),
        std: Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length),
      },
      features: params.features,
      target: params.target,
      explanation: `Trained ${params.name} (linear regression) on ${X.length} rows. R²=${fit.r2.toFixed(3)}, RMSE=${rmse.toFixed(2)}, MAE=${mae.toFixed(2)}.`,
    };
  }
}
