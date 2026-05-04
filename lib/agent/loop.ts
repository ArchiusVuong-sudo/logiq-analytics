import Anthropic from '@anthropic-ai/sdk';
import { TOOLS, runTool, isCanvasTool, canvasKindFromTool, persistCanvasBlock } from './tools';
import { SYSTEM_PROMPT } from './system';
import { adminDb } from '@/lib/db/supabase';

export type SSEEvent =
  | { type: 'started'; thread_id: string }
  | { type: 'reasoning_start' }
  | { type: 'reasoning_end' }
  | { type: 'thinking_delta'; text: string }
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call'; id: string; name: string; input: any }
  | { type: 'tool_result'; id: string; name: string; result: any; error?: boolean }
  | { type: 'block'; block: { id: string; kind: string; payload: any } }
  | { type: 'message_complete'; message_id: string; text: string; block_ids: string[] }
  | { type: 'error'; error: string }
  | { type: 'done' };

type RunArgs = {
  threadId: string;
  userText: string;
  apiKey: string;
  images?: { id: string; mime: string; base64: string }[];
  modelOverride?: string;
};

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';
const MAX_LOOPS = 20;

export async function* runAgentLoop({ threadId, userText, apiKey, images, modelOverride }: RunArgs): AsyncGenerator<SSEEvent> {
  const client = new Anthropic({ apiKey });
  const db = adminDb();

  // Persist user message
  const userParts: any[] = [];
  if (images && images.length) {
    for (const im of images) {
      userParts.push({ type: 'image', source: { type: 'base64', media_type: im.mime, data: im.base64 } });
    }
  }
  userParts.push({ type: 'text', text: userText });

  await db.from('messages').insert({ thread_id: threadId, role: 'user', content: { parts: userParts.map(p => p.type === 'image' ? { type: 'image', mime: p.source.media_type, image_id: images?.[0]?.id } : p) } });

  yield { type: 'started', thread_id: threadId };

  // Load short history (last 12 messages from DB) to give context
  const { data: hist } = await db
    .from('messages')
    .select('role,content,created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(40);

  const messages: Anthropic.Messages.MessageParam[] = [];
  for (const h of hist || []) {
    if (h.role === 'user') {
      const parts = (h.content as any)?.parts || [{ type: 'text', text: '(empty)' }];
      const cnt: any[] = [];
      for (const p of parts) {
        if (p.type === 'text') cnt.push({ type: 'text', text: p.text });
      }
      if (cnt.length === 0) cnt.push({ type: 'text', text: '(message)' });
      messages.push({ role: 'user', content: cnt });
    } else if (h.role === 'assistant') {
      const text = (h.content as any)?.text;
      if (text) messages.push({ role: 'assistant', content: text });
    }
  }
  // Replace last user with the full multimodal version (with images)
  if (messages.length > 0) messages[messages.length - 1] = { role: 'user', content: userParts };
  else messages.push({ role: 'user', content: userParts });

  const blockIds: string[] = [];
  let finalText = '';

  for (let loop = 0; loop < MAX_LOOPS; loop++) {
    let response: Anthropic.Messages.Message;
    try {
      response = await client.messages.create({
        model: modelOverride || MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS as any,
        messages,
      });
    } catch (e: any) {
      yield { type: 'error', error: `Claude API error: ${e?.message || String(e)}` };
      return;
    }

    const assistantContent: any[] = [];
    const toolUses: { id: string; name: string; input: any }[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        finalText += block.text;
        assistantContent.push({ type: 'text', text: block.text });
        yield { type: 'text_delta', text: block.text };
      } else if (block.type === 'tool_use') {
        toolUses.push({ id: block.id, name: block.name, input: block.input });
        assistantContent.push(block);
        yield { type: 'tool_call', id: block.id, name: block.name, input: block.input };
      }
    }

    if (toolUses.length === 0 || response.stop_reason === 'end_turn') {
      messages.push({ role: 'assistant', content: assistantContent });
      break;
    }

    messages.push({ role: 'assistant', content: assistantContent });

    const toolResults: any[] = [];
    for (const tu of toolUses) {
      try {
        if (isCanvasTool(tu.name)) {
          const kind = canvasKindFromTool(tu.name);
          const payload = tu.input;
          const blockId = await persistCanvasBlock(threadId, kind, payload);
          blockIds.push(blockId);
          yield { type: 'block', block: { id: blockId, kind, payload } };
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: JSON.stringify({ ok: true, block_id: blockId, kind }),
          });
          yield { type: 'tool_result', id: tu.id, name: tu.name, result: { ok: true, block_id: blockId } };
        } else if (tu.name === 'generate_image_block') {
          // Runs Gemini → image; emits a canvas block; sends a *small* tool_result to Claude (no base64).
          const result = await runTool(tu.name, tu.input, { images });
          if ((result as any).ok) {
            const r: any = result;
            const payload = {
              prompt: tu.input?.prompt,
              caption: tu.input?.caption,
              aspect_ratio: tu.input?.aspect_ratio || '16:9',
              base64: r.base64,
              mime: r.mime,
              model: r.model,
            };
            const blockId = await persistCanvasBlock(threadId, 'generated_image', payload);
            blockIds.push(blockId);
            yield { type: 'block', block: { id: blockId, kind: 'generated_image', payload } };
            const slim = { ok: true, block_id: blockId, kind: 'generated_image', model: r.model, mime: r.mime, aspect_ratio: payload.aspect_ratio };
            toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(slim) });
            yield { type: 'tool_result', id: tu.id, name: tu.name, result: slim };
          } else {
            const err = { error: (result as any).error || 'image generation failed' };
            toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(err), is_error: true });
            yield { type: 'tool_result', id: tu.id, name: tu.name, result: err, error: true };
          }
        } else {
          const result = await runTool(tu.name, tu.input, { images });
          yield { type: 'tool_result', id: tu.id, name: tu.name, result };
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: JSON.stringify(result).slice(0, 60_000),
          });
        }
      } catch (e: any) {
        yield { type: 'tool_result', id: tu.id, name: tu.name, result: { error: e?.message || String(e) }, error: true };
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify({ error: e?.message || String(e) }),
          is_error: true,
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }

  // Persist assistant message
  const ins = await db
    .from('messages')
    .insert({ thread_id: threadId, role: 'assistant', content: { text: finalText, block_ids: blockIds } })
    .select('id')
    .single();

  await db.from('threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);

  yield { type: 'message_complete', message_id: ins.data?.id || '', text: finalText, block_ids: blockIds };
  yield { type: 'done' };
}
