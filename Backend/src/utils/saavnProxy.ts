export const JIOSAAVN_API = 'https://www.jiosaavn.com/api.php';

/**
 * Wraps fetch so calls to JioSaavn's api.php go to the Mumbai relay
 * (frontend/app/saavn/route.ts) instead; everything else is untouched.
 * JioSaavn serves a smaller catalog outside India, and this backend runs in
 * Singapore. jiosaavn-sdk fetches that one fixed URL through the global
 * fetch with no option to change it, hence wrapping fetch.
 */
export function viaSaavnProxy(realFetch: typeof fetch, proxyUrl: string, key?: string): typeof fetch {
  return (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(`${JIOSAAVN_API}?`)) return realFetch(input, init);
    const headers = new Headers(init?.headers);
    if (key) headers.set('x-saavn-proxy-key', key);
    return realFetch(proxyUrl + url.slice(JIOSAAVN_API.length), { ...init, headers });
  };
}
