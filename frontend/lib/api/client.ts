import { ApiResponse, ApiError } from '@/types/api';
import { useAuthStore } from '@/stores/auth-store';
import { getCsrfToken, clearCsrfToken, setCsrfToken } from '@/lib/auth/csrf';
import { clearSessionMarker } from '@/lib/auth/session-marker';

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  requiresCsrf?: boolean;
  _retry?: boolean;
  _csrfRetry?: boolean;
}

// Refresh token mutex to prevent multiple concurrent refresh calls
let refreshPromise: Promise<string | null> | null = null;

async function performTokenRefresh(): Promise<string | null> {
  try {
    const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
    const csrf = await getCsrfToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (csrf) {
      headers['x-csrf-token'] = csrf;
    }

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });

    if (!res.ok) {
      logout();
      clearSessionMarker();
      return null;
    }

    const json: ApiResponse<{ accessToken: string }> = await res.json();
    const newAccessToken = json.data?.accessToken;

    if (newAccessToken) {
      setAccessToken(newAccessToken);
      // A successful refresh rotates the refreshToken cookie, which the
      // backend's CSRF check uses as its session identifier — any
      // already-cached CSRF token is now bound to the old cookie value
      // and will 403 on the next CSRF-protected request unless cleared.
      clearCsrfToken();
      return newAccessToken;
    }

    logout();
    clearSessionMarker();
    return null;
  } catch {
    useAuthStore.getState().logout();
    clearSessionMarker();
    return null;
  } finally {
    refreshPromise = null;
  }
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  const {
    requiresAuth = true,
    requiresCsrf = isMutation,
    headers: customHeaders = {},
    ...restOptions
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  // 1. Attach Bearer token if authenticated
  if (requiresAuth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // 2. Attach CSRF token on mutations
  if (requiresCsrf) {
    let csrf = useAuthStore.getState().csrfToken;
    if (!csrf) {
      csrf = await getCsrfToken();
      if (csrf) {
        useAuthStore.getState().setCsrfToken(csrf);
      }
    }
    if (csrf) {
      headers['x-csrf-token'] = csrf;
    }
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      method,
      headers,
      credentials: 'include',
    });
  } catch (networkError) {
    throw new ApiError(
      networkError instanceof Error ? networkError.message : 'Network error occurred',
      0
    );
  }

  // Parse response body
  let json: ApiResponse<T>;
  if (response.status === 204) {
    return { success: true, message: 'No Content' };
  }

  try {
    json = await response.json();
  } catch {
    json = {
      success: response.ok,
      message: response.statusText || 'Unexpected response format',
    };
  }

  // 3. Handle 401 Unauthorized: Attempt token refresh & retry once
  const isAuthEndpoint =
    endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/signup') ||
    endpoint.includes('/auth/refresh');

  if (response.status === 401 && !options._retry && !isAuthEndpoint) {
    if (!refreshPromise) {
      refreshPromise = performTokenRefresh();
    }

    const newAccessToken = await refreshPromise;
    if (newAccessToken) {
      return apiClient<T>(endpoint, {
        ...options,
        _retry: true,
      });
    }

    // Refresh failed -> redirect to login if in browser (skip on public auth pages)
    if (
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/signup')
    ) {
      window.location.href = '/login';
    }
    throw new ApiError(json.message || 'Session expired. Please log in again.', 401, json.data);
  }

  // 4. Handle 403 Invalid CSRF Token: Fetch fresh CSRF & retry once
  if (
    response.status === 403 &&
    !options._csrfRetry &&
    json.message?.toLowerCase().includes('csrf')
  ) {
    clearCsrfToken();
    const freshCsrf = await getCsrfToken();
    if (freshCsrf) {
      setCsrfToken(freshCsrf);
      useAuthStore.getState().setCsrfToken(freshCsrf);
      return apiClient<T>(endpoint, {
        ...options,
        _csrfRetry: true,
      });
    }
  }

  // 5. Throw ApiError on non-2xx responses
  if (!response.ok) {
    throw new ApiError(
      json.message || `Request failed with status ${response.status}`,
      response.status,
      json.data,
      json.errors
    );
  }

  return json;
}

// Typed helper methods
apiClient.get = <T = unknown>(endpoint: string, options?: RequestOptions) =>
  apiClient<T>(endpoint, { ...options, method: 'GET' });

apiClient.post = <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

apiClient.put = <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

apiClient.patch = <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

apiClient.delete = <T = unknown>(endpoint: string, options?: RequestOptions) =>
  apiClient<T>(endpoint, { ...options, method: 'DELETE' });
