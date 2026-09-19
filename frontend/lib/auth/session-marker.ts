/**
 * A purely client-side "has this browser ever logged in" flag, kept in
 * localStorage rather than a cookie because the frontend and backend run on
 * different origins (localhost:3000 vs :3001 locally, separate domains in
 * production) — a cookie the backend sets, even a non-httpOnly one, is
 * scoped to the backend's origin and invisible to frontend JS.
 *
 * Used to skip the silent-refresh attempt on mount for a guest who has
 * never had a session: without it, every cold visit fires a doomed
 * POST /auth/refresh (the backend correctly 400s with no cookie present,
 * but it's a wasted round-trip plus a console error before anything else
 * has happened). Never treated as proof of a valid session — the refresh
 * call itself is still what actually verifies that.
 */
const STORAGE_KEY = 'musify_had_session';

export const markSessionActive = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Private browsing / blocked storage — silent refresh will just run every time instead.
  }
};

export const clearSessionMarker = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage isn't available in the first place.
  }
};

export const hadSession = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true; // Unknown state — fall back to attempting refresh, the safe default.
  }
};
