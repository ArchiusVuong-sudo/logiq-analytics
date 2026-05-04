import { NextRequest } from 'next/server';
import { runAgentLoop, SSEEvent } from '@/lib/agent/loop';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { thread_id, text, images, anthropic_key, gemini_key, model, gemini_vision_model, gemini_image_model } = body || {};

  if (!thread_id || !text) {
    return new Response(JSON.stringify({ error: 'thread_id and text are required' }), { status: 400 });
  }
  const apiKey = anthropic_key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'No Anthropic API key. Add it via Settings.' }), { status: 400 });
  }
  if (gemini_key) process.env.GEMINI_API_KEY = gemini_key;
  if (gemini_vision_model) process.env.GEMINI_VISION_MODEL = gemini_vision_model;
  if (gemini_image_model) process.env.GEMINI_IMAGE_MODEL = gemini_image_model;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: SSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      };
      try {
        for await (const ev of runAgentLoop({ threadId: thread_id, userText: text, apiKey, images, modelOverride: model })) {
          send(ev);
        }
      } catch (e: any) {
        send({ type: 'error', error: e?.message || String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
