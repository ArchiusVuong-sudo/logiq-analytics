import { NextRequest } from 'next/server';
import { forecastDemand, trainDelayClassifier, trainCustomModel } from '@/lib/tools/forecast';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, ...rest } = body;
  try {
    if (action === 'forecast_demand') return Response.json(await forecastDemand(rest));
    if (action === 'train_delay_classifier') return Response.json(await trainDelayClassifier(rest));
    if (action === 'train_custom_model') return Response.json(await trainCustomModel(rest));
    return Response.json({ error: 'unknown action' }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
