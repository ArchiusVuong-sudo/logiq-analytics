import { NextRequest } from 'next/server';
import { analyzeWithGemini } from '@/lib/tools/image';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const f = fd.get('file');
  const instruction = (fd.get('instruction') as string) || 'Extract any tabular logistics data and return it as rows.';
  const apiKey = (fd.get('gemini_key') as string) || '';
  if (apiKey) process.env.GEMINI_API_KEY = apiKey;
  if (!f || typeof f === 'string') return Response.json({ error: 'file missing' }, { status: 400 });

  const file = f as File;
  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString('base64');
  const result = await analyzeWithGemini({ id: 'upload', mime: file.type, base64 }, instruction);
  return Response.json({ ...result, mime: file.type });
}
