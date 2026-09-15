let cachedToken: string | null = null;
let fetchPromise: Promise<string | null> | null = null;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const setCsrfToken = (token: string | null): void => {
  cachedToken = token;
};

export const clearCsrfToken = (): void => {
  cachedToken = null;
  fetchPromise = null;
};

export const getCsrfToken = async (): Promise<string | null> => {
  if (cachedToken) {
    return cachedToken;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const url = `${API_BASE_URL}/auth/csrf`;
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        return null;
      }

      const json = await res.json();
      const token = json.csrfToken || null;
      cachedToken = token;
      return token;
    } catch {
      return null;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
};
