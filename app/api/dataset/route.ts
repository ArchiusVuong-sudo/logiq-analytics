import { dimensions } from '@/lib/tools/analytics';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const dims = await dimensions();
    return Response.json(dims);
  } catch (e: any) {
    return Response.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
