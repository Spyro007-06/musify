/**
 * Thrown by AIService.analyzeLyrics when the LLM API call itself failed
 * (network error, timeout, open circuit breaker, missing API key
 * configuration) or returned a response that doesn't match the expected
 * shape — as opposed to a successful call. Callers (controllers, via
 * errorHandler) map this to 503 instead of a generic 500, mirroring
 * SaavnUpstreamError's treatment of the JioSaavn dependency.
 *
 * Named provider-neutrally (not GeminiUpstreamError) since this is the
 * second provider this feature has used (originally Claude) — a generic
 * name means swapping providers again later doesn't require another
 * rename across error handling, tests, and errorHandler.ts's mapping.
 */
export class LLMUpstreamError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'LLMUpstreamError';
  }
}
