import { createClient, SupabaseClient } from '@supabase/supabase-js';
import https from 'https';
import { env } from './env';

/**
 * Custom fetch implementation using Node's native https module.
 * This bypasses undici (Node 18+ global fetch) Happy Eyeballs connection timeouts
 * on systems with misconfigured/broken IPv6 routing or strict firewalls.
 */
const customFetch = (url: any, options: any = {}): Promise<Response> => {
  return new Promise((resolve, reject) => {
    let targetUrl: string | URL;
    let method: string = options.method || 'GET';
    const headers: Record<string, string> = {};

    if (url && typeof url === 'object' && 'url' in url) {
      targetUrl = url.url;
      method = options.method || url.method || 'GET';
      if (url.headers) {
        if (url.headers instanceof Headers) {
          url.headers.forEach((value: string, key: string) => {
            headers[key] = value;
          });
        } else {
          Object.assign(headers, url.headers);
        }
      }
    } else {
      targetUrl = url;
    }

    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value: string, key: string) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]: [string, string]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    const requestOptions: https.RequestOptions = {
      method,
      headers,
      timeout: options.timeout || 15000,
    };

    const req = https.request(targetUrl, requestOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        
        const responseHeaders = new Headers();
        Object.entries(res.headers).forEach(([key, val]) => {
          if (val !== undefined) {
            if (Array.isArray(val)) {
              val.forEach(v => responseHeaders.append(key, v));
            } else {
              responseHeaders.set(key, val);
            }
          }
        });

        const fetchResponse = {
          ok: (res.statusCode ?? 200) >= 200 && (res.statusCode ?? 200) < 300,
          status: res.statusCode ?? 200,
          statusText: res.statusMessage ?? '',
          headers: responseHeaders,
          text: () => Promise.resolve(body),
          json: () => {
            try {
              return Promise.resolve(JSON.parse(body));
            } catch (e) {
              return Promise.reject(new Error('Invalid JSON response'));
            }
          },
        };
        resolve(fetchResponse as any);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      if (typeof options.body === 'string' || Buffer.isBuffer(options.body)) {
        req.write(options.body);
      } else if (typeof options.body.pipe === 'function') {
        options.body.pipe(req);
      } else {
        req.write(options.body.toString());
      }
    }
    
    req.end();
  });
};

/**
 * Anon client — safe to use in middleware / user-facing operations.
 * Respects Row Level Security (RLS).
 */
export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: customFetch,
    },
  }
);

/**
 * Service-role client — bypasses RLS.
 * Use ONLY for trusted server-side operations (e.g. admin lookups, migrations).
 * Never expose this client to the browser.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: customFetch,
    },
  }
);
