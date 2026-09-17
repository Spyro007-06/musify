/**
 * Thrown by AIService.analyzeLyrics when the Claude API call itself failed
 * (network error, timeout, open circuit breaker, missing API key
 * configuration) or returned a response that doesn't match the expected
 * shape — as opposed to a successful call. Callers (controllers, via
 * errorHandler) map this to 503 instead of a generic 500, mirroring
 * SaavnUpstreamError's treatment of the JioSaavn dependency.
 */
export class ClaudeUpstreamError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ClaudeUpstreamError';
  }
}
