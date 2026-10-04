import { withCache } from '@utils/cache';

// Tests run without Redis, so this exercises the in-memory fallback.
describe('withCache (in-memory fallback)', () => {
  it('reuses a value, shares an in-flight call, and does not cache failures', async () => {
    const fn = jest.fn().mockResolvedValue('a');
    const [x, y] = await Promise.all([withCache('k', 60, fn), withCache('k', 60, fn)]);
    expect([x, y, await withCache('k', 60, fn)]).toEqual(['a', 'a', 'a']);
    expect(fn).toHaveBeenCalledTimes(1);

    const failing = jest.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue('ok');
    await expect(withCache('f', 60, failing)).rejects.toThrow('down');
    expect(await withCache('f', 60, failing)).toBe('ok');
  });

  it('expires after the TTL', async () => {
    jest.useFakeTimers();
    try {
      const fn = jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
      expect(await withCache('t', 10, fn)).toBe(1);
      jest.advanceTimersByTime(11_000);
      expect(await withCache('t', 10, fn)).toBe(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
