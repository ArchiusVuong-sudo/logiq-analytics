import type Anthropic from '@anthropic-ai/sdk';
import * as analytics from '@/lib/tools/analytics';
import * as forecast from '@/lib/tools/forecast';
import { adminDb } from '@/lib/db/supabase';

type Tool = Anthropic.Messages.Tool;

const FILTERS_SCHEMA = {
  type: 'object' as const,
  properties: {
    start_date: { type: 'string', description: 'YYYY-MM-DD inclusive' },
    end_date: { type: 'string', description: 'YYYY-MM-DD inclusive' },
    carrier: { type: 'string' },
    status: { type: 'string', enum: ['delivered', 'delayed', 'in_transit', 'exception', 'canceled'] },
    region: { type: 'string' },
    product_category: { type: 'string' },
    sku: { type: 'string' },
    warehouse: { type: 'string' },
  },
};

export const TOOLS: Tool[] = [
  {
    name: 'list_dimensions',
    description: 'Return the unique values available for each dimension (carriers, regions, statuses, categories, warehouses, date range, sku count). Call this first when you need to know what values exist before filtering.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'compute_kpis',
    description: 'Compute headline KPIs: total/delivered/delayed/in_transit orders, on-time rate, delay rate, avg delivery days, total revenue, promo share. Optional filters narrow the scope.',
    input_schema: { type: 'object', properties: { filters: FILTERS_SCHEMA } },
  },
  {
    name: 'aggregate',
    description: 'Group orders by a dimension and compute a metric. Returns ordered buckets. Useful for "by carrier", "by week", "by region" breakdowns.',
    input_schema: {
      type: 'object',
      properties: {
        group_by: { type: 'string', enum: ['day', 'week', 'month', 'carrier', 'status', 'region', 'product_category', 'sku', 'warehouse', 'destination_city', 'origin_city'] },
        metric: { type: 'string', enum: ['count', 'sum_value', 'avg_value', 'avg_delivery_days', 'on_time_rate', 'delay_rate'] },
        filters: FILTERS_SCHEMA,
        top: { type: 'number', description: 'Optional: limit to top N buckets' },
        sort: { type: 'string', enum: ['asc', 'desc', 'natural'], description: '"natural" for time order' },
      },
      required: ['group_by', 'metric'],
    },
  },
  {
    name: 'time_series',
    description: 'Build a time series (day/week/month) of any metric, optionally split into multiple series by carrier/status/region/category. Returns labels + per-series data.',
    input_schema: {
      type: 'object',
      properties: {
        metric: { type: 'string', enum: ['count', 'sum_value', 'avg_value', 'avg_delivery_days', 'on_time_rate', 'delay_rate'] },
        granularity: { type: 'string', enum: ['day', 'week', 'month'] },
        series_by: { type: 'string', enum: ['carrier', 'status', 'region', 'product_category', 'none'] },
        filters: FILTERS_SCHEMA,
      },
      required: ['metric', 'granularity'],
    },
  },
  {
    name: 'top_n',
    description: 'Top-N entities for a given metric (e.g. top 5 SKUs by revenue, top 3 carriers by delay rate).',
    input_schema: {
      type: 'object',
      properties: {
        dimension: { type: 'string', enum: ['carrier', 'sku', 'region', 'product_category', 'warehouse', 'destination_city', 'origin_city'] },
        metric: { type: 'string', enum: ['count', 'sum_value', 'avg_value', 'avg_delivery_days', 'on_time_rate', 'delay_rate'] },
        n: { type: 'number' },
        order: { type: 'string', enum: ['asc', 'desc'] },
        filters: FILTERS_SCHEMA,
      },
      required: ['dimension', 'metric', 'n'],
    },
  },
  {
    name: 'list_samples',
    description: 'Return up to 200 raw rows matching a filter (for explainability "show me the data").',
    input_schema: {
      type: 'object',
      properties: {
        filters: FILTERS_SCHEMA,
        limit: { type: 'number' },
        order_by: { type: 'string', enum: ['order_date', 'delivery_date', 'order_value_usd'] },
      },
    },
  },
  {
    name: 'forecast_demand',
    description: 'Forecast future demand (units shipped) using moving_average / linear_regression / exponential_smoothing / holt_linear. Returns history + forecast + inventory recommendation + methodology explanation.',
    input_schema: {
      type: 'object',
      properties: {
        sku: { type: 'string' },
        product_category: { type: 'string' },
        carrier: { type: 'string' },
        region: { type: 'string' },
        granularity: { type: 'string', enum: ['day', 'week', 'month'] },
        horizon: { type: 'number' },
        method: { type: 'string', enum: ['moving_average', 'linear_regression', 'exponential_smoothing', 'holt_linear'] },
      },
    },
  },
  {
    name: 'train_delay_classifier',
    description: 'Train a logistic-regression model to predict order delay risk. Returns weights, accuracy, and a loss curve.',
    input_schema: {
      type: 'object',
      properties: {
        features: { type: 'array', items: { type: 'string' } },
        filters: FILTERS_SCHEMA,
      },
    },
  },
  {
    name: 'train_custom_model',
    description: 'User-driven self-creating model. Pick any subset of numeric/boolean features and any target. Supports linear_regression and logistic_regression.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        kind: { type: 'string', enum: ['linear_regression', 'logistic_regression'] },
        target: { type: 'string' },
        features: { type: 'array', items: { type: 'string' } },
        positive_class: { type: 'string' },
        filters: FILTERS_SCHEMA,
      },
      required: ['name', 'kind', 'target', 'features'],
    },
  },
  // ─── Canvas tools (output blocks) ────────────────────────────────────────────
  {
    name: 'create_metric_block',
    description: 'Render a single KPI metric card on the canvas.',
    input_schema: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        value: { type: 'string' },
        delta: { type: 'string' },
        tone: { type: 'string', enum: ['good', 'bad', 'neutral'] },
        sub: { type: 'string' },
      },
      required: ['label', 'value'],
    },
  },
  {
    name: 'create_chart_block',
    description: 'Render a chart on the canvas. Provide explicit labels + datasets (use values you computed via the analytics tools above).',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['bar', 'line', 'pie', 'doughnut', 'scatter', 'radar', 'mixed'] },
        title: { type: 'string' },
        subtitle: { type: 'string' },
        labels: { type: 'array', items: { type: 'string' } },
        datasets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              data: { type: 'array', items: { type: 'number' } },
              type: { type: 'string', enum: ['bar', 'line'] },
              backgroundColor: { description: 'Optional CSS color or array of colors' },
              borderColor: { description: 'Optional border color(s)' },
              fill: { type: 'boolean' },
            },
            required: ['label', 'data'],
          },
        },
        explanation: { type: 'string', description: 'REQUIRED. Filters used + metrics + how to read the chart' },
        queryPlan: {
          type: 'object',
          properties: {
            filters: { type: 'object' },
            dimension: { type: 'string' },
            metric: { type: 'string' },
            granularity: { type: 'string' },
            tools_called: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['type', 'title', 'labels', 'datasets', 'explanation'],
    },
  },
  {
    name: 'create_table_block',
    description: 'Render a table of underlying data on the canvas. Useful for "show me the rows" explainability.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        columns: { type: 'array', items: { type: 'string' } },
        rows: { type: 'array', items: { type: 'array' } },
        explanation: { type: 'string' },
      },
      required: ['columns', 'rows'],
    },
  },
  {
    name: 'create_mermaid_block',
    description: 'Render a Mermaid diagram (flowchart, sequenceDiagram, etc.) for visualizing the query plan or system flow.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        code: { type: 'string', description: 'Valid mermaid syntax e.g. "flowchart TD\\nA-->B"' },
      },
      required: ['code'],
    },
  },
  {
    name: 'create_markdown_block',
    description: 'Render a markdown explanation block on the canvas (good for written summaries / methodology notes).',
    input_schema: {
      type: 'object',
      properties: { title: { type: 'string' }, content: { type: 'string' } },
      required: ['content'],
    },
  },
  {
    name: 'create_forecast_block',
    description: 'Render a forecast block with history + forecast lines + inventory recommendation.',
    input_schema: {
      type: 'object',
      properties: {
        sku: { type: 'string' },
        method: { type: 'string' },
        history: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, value: { type: 'number' } }, required: ['date', 'value'] } },
        forecast: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, value: { type: 'number' }, lower: { type: 'number' }, upper: { type: 'number' } }, required: ['date', 'value'] } },
        recommendation: { type: 'string' },
        explanation: { type: 'string' },
      },
      required: ['method', 'history', 'forecast', 'recommendation', 'explanation'],
    },
  },
  {
    name: 'create_model_training_block',
    description: 'Visualize a model training process (steps + final metrics + spec). Use after train_delay_classifier or train_custom_model.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        kind: { type: 'string' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'running', 'done'] },
              detail: { type: 'string' },
            },
            required: ['label', 'status'],
          },
        },
        metrics: { type: 'object' },
        spec: { type: 'object' },
      },
      required: ['name', 'kind', 'steps'],
    },
  },
  {
    name: 'analyze_image_with_gemini',
    description: 'Send an image to Gemini Vision to extract structured logistics data (rows of orders/shipments). Returns analysis text + suggested rows that can be imported.',
    input_schema: {
      type: 'object',
      properties: {
        image_id: { type: 'string', description: 'The id of an attached image (provided by the system)' },
        instruction: { type: 'string', description: 'What to extract or describe' },
      },
      required: ['image_id', 'instruction'],
    },
  },
  {
    name: 'generate_image_block',
    description: 'Generate a NEW image from a text prompt using Gemini and render it on the canvas. Use this when a visual mock-up, illustration, or concept art would help the user — e.g. cover image for a forecast report, packaging concept, warehouse layout sketch, infographic illustration. NEVER use this to render data charts (use create_chart_block for that).',
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Detailed prompt describing the image (style, subject, mood, colors).' },
        caption: { type: 'string', description: 'Short caption shown under the image' },
        aspect_ratio: { type: 'string', enum: ['1:1', '16:9', '9:16', '4:3', '3:4'] },
      },
      required: ['prompt'],
    },
  },
];

export type ToolRunner = (name: string, input: any, ctx: { images?: { id: string; mime: string; base64: string }[] }) => Promise<any>;

export const runTool: ToolRunner = async (name, input, ctx) => {
  switch (name) {
    case 'list_dimensions':
      return await analytics.dimensions();
    case 'compute_kpis':
      return await analytics.computeKPIs(input?.filters || {});
    case 'aggregate':
      return await analytics.aggregate(input);
    case 'time_series':
      return await analytics.timeSeries(input);
    case 'top_n':
      return await analytics.topN(input);
    case 'list_samples':
      return await analytics.listSamples(input || {});
    case 'forecast_demand':
      return await forecast.forecastDemand(input || {});
    case 'train_delay_classifier':
      return await forecast.trainDelayClassifier(input || {});
    case 'train_custom_model':
      return await forecast.trainCustomModel(input);
    case 'analyze_image_with_gemini': {
      const { analyzeWithGemini } = await import('@/lib/tools/image');
      const img = ctx.images?.find(i => i.id === input.image_id);
      if (!img) return { ok: false, error: 'image not found in context' };
      return await analyzeWithGemini(img, input.instruction);
    }
    case 'generate_image_block': {
      const { generateImageWithGemini } = await import('@/lib/tools/image');
      return await generateImageWithGemini(input.prompt, { aspect_ratio: input.aspect_ratio });
    }
    // Canvas-emitting tools: handled by the agent loop (mark as block emit).
    case 'create_metric_block':
    case 'create_chart_block':
    case 'create_table_block':
    case 'create_mermaid_block':
    case 'create_markdown_block':
    case 'create_forecast_block':
    case 'create_model_training_block':
      return { ok: true, emitted: true };
    default:
      return { ok: false, error: `Unknown tool ${name}` };
  }
};

export function isCanvasTool(name: string) {
  return name.startsWith('create_') && name.endsWith('_block');
}

export function canvasKindFromTool(name: string): string {
  return name.replace(/^create_/, '').replace(/_block$/, '');
}

// Claude occasionally serializes complex tool args as a JSON string instead
// of the actual array/object (e.g. datasets="[…]" rather than datasets=[…]).
// Normalize known array-shaped fields before persisting so renderers don't
// have to defend against it.
function coerceJsonField(payload: any, key: string) {
  const v = payload?.[key];
  if (typeof v !== 'string') return;
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed) || (parsed && typeof parsed === 'object')) {
      payload[key] = parsed;
    }
  } catch { /* leave the original string; renderer has its own fallback */ }
}

function normalizeCanvasPayload(kind: string, payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  if (kind === 'chart') {
    coerceJsonField(payload, 'datasets');
    coerceJsonField(payload, 'labels');
  } else if (kind === 'forecast') {
    coerceJsonField(payload, 'history');
    coerceJsonField(payload, 'forecast');
  } else if (kind === 'table') {
    coerceJsonField(payload, 'rows');
    coerceJsonField(payload, 'columns');
  }
  return payload;
}

export async function persistCanvasBlock(threadId: string | null, kind: string, payload: any): Promise<string> {
  const db = adminDb();
  const normalized = normalizeCanvasPayload(kind, payload);
  const ins = await db.from('canvas_blocks').insert({ thread_id: threadId, kind, payload: normalized }).select('id').single();
  if (ins.error) throw ins.error;
  return ins.data.id;
}
