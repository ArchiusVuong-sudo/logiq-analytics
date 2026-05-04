import { GoogleGenAI } from '@google/genai';

// Default model IDs (overridable via env or per-request)
const VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-3.1-pro-preview';
const IMAGE_GEN_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';
const IMAGE_GEN_FALLBACKS = ['gemini-3.1-flash-image-preview', 'gemini-2.5-flash-image', 'nano-banana-pro-preview'];

export async function analyzeWithGemini(
  img: { id: string; mime: string; base64: string },
  instruction: string,
  modelOverride?: string,
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'GEMINI_API_KEY is not set. Add it via Settings → API Keys.' };
  }
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `${instruction}\n\nIf the image contains tabular logistics data (orders, shipments, SKUs, dates, carriers), return JSON of the form:\n{\n  "summary": "1-2 sentences",\n  "rows": [\n    {"order_id":"…","order_date":"YYYY-MM-DD","delivery_date":"YYYY-MM-DD or null","carrier":"…","status":"delivered|delayed|in_transit|exception|canceled","sku":"…","product_category":"…","quantity":1,"order_value_usd":0,"region":"…","origin_city":"…","destination_city":"…","warehouse":"…","client_id":"…"}\n  ]\n}\nIf it's not tabular, set rows to [] and put a description in summary. ALWAYS return strict JSON only.`;

  try {
    const response = await ai.models.generateContent({
      model: modelOverride || VISION_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: img.base64, mimeType: img.mime } },
            { text: prompt },
          ],
        },
      ],
      config: { responseMimeType: 'application/json' },
    });
    const text = response.text || '';
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch {}
    }
    return {
      ok: true,
      raw: text,
      parsed,
      summary: parsed?.summary || text.slice(0, 500),
      rows: Array.isArray(parsed?.rows) ? parsed.rows : [],
      model: modelOverride || VISION_MODEL,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// ── Image generation via Gemini ────────────────────────────────────────────────
// Uses generateContent with responseModalities: ['IMAGE']. Tries the requested
// model first, then falls back to known image-gen models if not available.
export async function generateImageWithGemini(
  prompt: string,
  opts?: { aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'; modelOverride?: string },
): Promise<{ ok: true; mime: string; base64: string; prompt: string; model: string; aspect_ratio?: string } | { ok: false; error: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: 'GEMINI_API_KEY is not set. Add it via Settings → API Keys.' };

  const ai = new GoogleGenAI({ apiKey });
  const aspect = opts?.aspect_ratio || '16:9';
  const aspectHint = aspect === '1:1' ? 'square' : aspect === '16:9' ? 'wide landscape' : aspect === '9:16' ? 'tall portrait' : aspect === '4:3' ? 'landscape' : 'portrait';
  const fullPrompt = `${prompt}\n\nFormat: ${aspectHint} aspect ratio. High quality, detailed.`;

  const candidates = [opts?.modelOverride, IMAGE_GEN_MODEL, ...IMAGE_GEN_FALLBACKS].filter(Boolean) as string[];
  const tried: string[] = [];
  let lastError = 'unknown';

  for (const model of candidates) {
    if (tried.includes(model)) continue;
    tried.push(model);
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        config: { responseModalities: ['IMAGE', 'TEXT'] as any },
      });
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if ((part as any).inlineData?.data) {
          const inline = (part as any).inlineData;
          return {
            ok: true,
            mime: inline.mimeType || 'image/png',
            base64: inline.data,
            prompt,
            model,
            aspect_ratio: aspect,
          };
        }
      }
      lastError = `no image returned by ${model}`;
    } catch (e: any) {
      lastError = `${model}: ${e?.message || String(e)}`;
      // try next fallback
    }
  }

  return { ok: false, error: `Image generation failed across ${tried.length} models. Last: ${lastError}` };
}
