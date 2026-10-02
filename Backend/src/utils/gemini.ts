import { env } from '@config/env';
import { logger } from '@utils/logger';

/**
 * Google's moving aliases (they track the current Flash / Flash-Lite, so they
 * don't go stale), tried in order. 404 is included in case an alias is retired.
 */
const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
const GEMINI_RETRYABLE = new Set([404, 429, 500, 503]);
const GEMINI_ROUND_PAUSE_MS = 1500;

/**
 * Asks Gemini for a JSON reply shaped by `responseSchema` and returns the
 * reply text. Null when no key is set or no model answered.
 */
export async function askGeminiJson(parts: unknown[], responseSchema: unknown): Promise<string | null> {
  if (!env.GEMINI_API_KEY) return null;
  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: { responseMimeType: 'application/json', responseSchema },
  });

  // Two rounds over the models with a short pause between: a model that's
  // overloaded (Gemini 503s "high demand" for minutes at a time) or
  // rate-limited falls through to the next.
  let res: Response | null = null;
  const attempts = [...GEMINI_MODELS, ...GEMINI_MODELS];
  for (let i = 0; i < attempts.length; i++) {
    if (i === GEMINI_MODELS.length) await new Promise((r) => setTimeout(r, GEMINI_ROUND_PAUSE_MS));
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${attempts[i]}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body,
      signal: AbortSignal.timeout(20_000),
    }).catch(() => null); // timeout or network error: try the next one
    if (res && (res.ok || !GEMINI_RETRYABLE.has(res.status))) break;
    logger.warn(`Gemini ${attempts[i]} returned ${res?.status ?? 'no response'}: ${(await res?.text())?.slice(0, 300) ?? ''}`);
  }
  if (!res?.ok) {
    if (res && !GEMINI_RETRYABLE.has(res.status)) {
      logger.warn(`Gemini returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    return null;
  }
  const reply: any = await res.json();
  return reply?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}
