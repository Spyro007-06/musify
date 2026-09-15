import CircuitBreaker from 'opossum';
import { logger } from './logger';

/**
 * Wraps calls to a flaky external dependency with a timeout, a couple of
 * retries with backoff, and a circuit breaker so a downed/slow upstream
 * fails fast instead of piling up hung requests.
 *
 * One breaker per named dependency, shared across every call site that
 * hits it — SaavnService is the only consumer today (see
 * src/services/saavn.service.ts), since every method there ultimately
 * calls the same external JioSaavn API.
 */

interface ResilienceOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 200;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function withRetry<T>(fn: () => Promise<T>, retries: number, delayMs: number): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * 2 ** attempt));
      }
    }
  }
  throw lastErr;
}

type Task<T> = () => Promise<T>;

const breakers = new Map<string, CircuitBreaker<[Task<unknown>], unknown>>();

function getBreaker(name: string): CircuitBreaker<[Task<unknown>], unknown> {
  let breaker = breakers.get(name);
  if (!breaker) {
    // Breaker itself doesn't enforce a timeout — resilientCall races its own
    // per-call timeout first, since different calls may want different limits.
    breaker = new CircuitBreaker<[Task<unknown>], unknown>((task) => task(), {
      timeout: false,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      rollingCountTimeout: 10000,
      name,
    });
    breaker.on('open', () => logger.warn(`Circuit breaker "${name}" opened — failing fast on external calls.`));
    breaker.on('halfOpen', () => logger.info(`Circuit breaker "${name}" half-open — probing external service.`));
    breaker.on('close', () => logger.info(`Circuit breaker "${name}" closed — external service recovered.`));
    breakers.set(name, breaker);
  }
  return breaker;
}

/**
 * Run `fn` against a named external dependency with timeout + retry +
 * circuit breaking. Throws on failure — callers already wrap SaavnService
 * methods in try/catch with safe fallbacks, so this doesn't need its own
 * fallback value.
 */
export async function resilientCall<T>(
  dependency: string,
  fn: Task<T>,
  options: ResilienceOptions = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, retryDelayMs = DEFAULT_RETRY_DELAY_MS } = options;
  const breaker = getBreaker(dependency);
  const result = await breaker.fire(() => withRetry(() => withTimeout(fn(), timeoutMs, dependency), retries, retryDelayMs));
  return result as T;
}
