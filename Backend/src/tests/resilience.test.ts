import { resilientCall } from '@utils/resilience';

describe('resilientCall', () => {
  it('resolves normally when the call succeeds', async () => {
    const result = await resilientCall('dep-success', async () => 'ok', { timeoutMs: 200 });
    expect(result).toBe('ok');
  });

  it('times out a call that takes longer than timeoutMs', async () => {
    const neverResolves = () => new Promise(() => {}); // simulates an unresponsive upstream
    await expect(
      resilientCall('dep-timeout', neverResolves, { timeoutMs: 50, retries: 0 })
    ).rejects.toThrow(/timed out/);
  });

  it('retries a transient failure and succeeds on a later attempt', async () => {
    let attempts = 0;
    const flaky = async () => {
      attempts += 1;
      if (attempts < 2) throw new Error('transient failure');
      return 'recovered';
    };

    const result = await resilientCall('dep-retry', flaky, { timeoutMs: 200, retries: 2, retryDelayMs: 1 });
    expect(result).toBe('recovered');
    expect(attempts).toBe(2);
  });

  it('gives up and throws after exhausting retries', async () => {
    const alwaysFails = async () => {
      throw new Error('permanent failure');
    };

    await expect(
      resilientCall('dep-exhausted', alwaysFails, { timeoutMs: 200, retries: 1, retryDelayMs: 1 })
    ).rejects.toThrow('permanent failure');
  });

  it('opens the circuit after repeated failures, failing fast on the next call', async () => {
    const alwaysFails = async () => {
      throw new Error('downstream is down');
    };

    // Each resilientCall itself retries once (default), so this trips the
    // breaker's failure count several times over within its rolling window.
    for (let i = 0; i < 10; i++) {
      await resilientCall('dep-breaker', alwaysFails, { timeoutMs: 100, retries: 0, retryDelayMs: 1 }).catch(() => {});
    }

    // Once open, opossum rejects immediately with its own error rather than
    // ever invoking the wrapped function again.
    let invoked = false;
    await resilientCall('dep-breaker', async () => {
      invoked = true;
      return 'should not run';
    }).catch(() => {});

    expect(invoked).toBe(false);
  });
});
