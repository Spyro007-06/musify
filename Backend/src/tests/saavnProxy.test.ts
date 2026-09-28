import { viaSaavnProxy } from '@utils/saavnProxy';

describe('viaSaavnProxy', () => {
  const ok = (..._args: any[]) => Promise.resolve(new Response('{}'));

  it('sends JioSaavn api.php calls to the relay, keeping the query and adding the key', async () => {
    const real = jest.fn(ok);
    const f = viaSaavnProxy(real as any, 'https://front.example/saavn', 'k1');
    await f('https://www.jiosaavn.com/api.php?__call=search.getResults&q=Starboy', { headers: { 'User-Agent': 'ua' } });
    const [url, init] = real.mock.calls[0] as any;
    expect(url).toBe('https://front.example/saavn?__call=search.getResults&q=Starboy');
    expect(new Headers(init.headers).get('x-saavn-proxy-key')).toBe('k1');
    expect(new Headers(init.headers).get('user-agent')).toBe('ua');
  });

  it('leaves every other request alone', async () => {
    const real = jest.fn(ok);
    const f = viaSaavnProxy(real as any, 'https://front.example/saavn');
    const other = { headers: { a: 'b' } };
    await f('https://open.spotify.com/embed/track/x', other);
    await f('https://www.jiosaavn.com/api.phpx?__call=a', other); // look-alike, not the API
    expect(real.mock.calls.map((c: any) => c[0])).toEqual(['https://open.spotify.com/embed/track/x', 'https://www.jiosaavn.com/api.phpx?__call=a']);
    expect(real.mock.calls[0][1]).toBe(other);
  });

  it('handles URL objects too (the SDK passes a string today)', async () => {
    const real = jest.fn(ok);
    await viaSaavnProxy(real as any, 'https://front.example/saavn')(new URL('https://www.jiosaavn.com/api.php?__call=x'));
    expect(real.mock.calls[0][0]).toBe('https://front.example/saavn?__call=x');
  });
});
