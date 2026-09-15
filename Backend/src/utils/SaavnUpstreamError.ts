/**
 * Thrown by SaavnService when the external JioSaavn API itself failed
 * (network error, timeout, non-JSON/HTML response, or an open circuit
 * breaker) — as opposed to the call succeeding with a genuinely empty
 * result. Callers (controllers, via errorHandler) map this to 502/503
 * instead of treating it as "not found".
 */
export class SaavnUpstreamError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'SaavnUpstreamError';
  }
}
