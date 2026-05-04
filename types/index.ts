export type Order = {
  id?: string;
  client_id: string;
  order_id: string;
  order_date: string;
  delivery_date: string | null;
  carrier: string;
  origin_city: string | null;
  destination_city: string | null;
  status: 'delivered' | 'delayed' | 'in_transit' | 'exception' | 'canceled';
  sku: string;
  product_category: string;
  quantity: number;
  unit_price_usd: number | null;
  order_value_usd: number;
  is_promo: boolean;
  promo_discount_pct: number;
  region: string | null;
  warehouse: string | null;
};

export type AggBucket = { key: string; count: number; value?: number };

export type ChartSpec = {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'radar' | 'mixed';
  title: string;
  subtitle?: string;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    type?: 'bar' | 'line';
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    fill?: boolean;
    tension?: number;
    yAxisID?: string;
  }>;
  options?: {
    stacked?: boolean;
    dualAxis?: boolean;
    xLabel?: string;
    yLabel?: string;
    yLabel2?: string;
  };
};

export type CanvasBlock =
  | { id: string; kind: 'metric'; payload: { label: string; value: string | number; delta?: string; tone?: 'good' | 'bad' | 'neutral'; sub?: string } }
  | { id: string; kind: 'chart'; payload: ChartSpec & { explanation?: string; queryPlan?: any } }
  | { id: string; kind: 'mermaid'; payload: { title?: string; code: string } }
  | { id: string; kind: 'table'; payload: { title?: string; columns: string[]; rows: any[][]; explanation?: string } }
  | { id: string; kind: 'markdown'; payload: { title?: string; content: string } }
  | { id: string; kind: 'forecast'; payload: { sku?: string; method: string; history: { date: string; value: number }[]; forecast: { date: string; value: number; lower?: number; upper?: number }[]; recommendation: string; explanation: string } }
  | { id: string; kind: 'model_training'; payload: { name: string; kind: string; steps: { label: string; status: 'pending' | 'running' | 'done'; detail?: string }[]; metrics?: Record<string, number>; spec?: any } }
  | { id: string; kind: 'image_analysis'; payload: { imageBase64?: string; imageUrl?: string; analysis: string; structured?: any; suggestedImport?: any } };

export type ReasoningStep = {
  id: string;
  type: 'thinking' | 'tool_call' | 'tool_result' | 'text';
  toolName?: string;
  input?: any;
  output?: any;
  text?: string;
  ts: number;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  steps?: ReasoningStep[];
  blockIds?: string[];
  ts: number;
};
