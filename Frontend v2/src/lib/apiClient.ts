import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let csrfTokenPromise: Promise<string | null> | null = null;

export const clearCsrfToken = () => {
  csrfTokenPromise = null;
};

// Fetch CSRF token once
const getCsrfToken = async () => {
  if (!csrfTokenPromise) {
    csrfTokenPromise = axios.get('/api/auth/csrf', { withCredentials: true })
      .then(res => res.data.csrfToken)
      .catch(err => {
        console.error('Failed to fetch CSRF token:', err);
        return null;
      });
  }
  return csrfTokenPromise;
};

// Interceptor to attach tokens
apiClient.interceptors.request.use(async (config) => {
  // Attach JWT
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Attach CSRF Token
  const csrf = await getCsrfToken();
  if (csrf) {
    config.headers['x-csrf-token'] = csrf;
  }
  
  return config;
});

// Interceptor to retry on CSRF failure or logout on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle expired or invalid session token
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
    
    if (error.response?.status === 403 && error.response?.data?.message === 'invalid csrf token' && !originalRequest._retry) {
      originalRequest._retry = true;
      clearCsrfToken(); // clear the old token
      const newCsrf = await getCsrfToken(); // fetch a fresh one
      if (newCsrf) {
        originalRequest.headers['x-csrf-token'] = newCsrf;
        return apiClient(originalRequest); // retry the request
      }
    }
    return Promise.reject(error);
  }
);
