import { tokenStorage } from './tokens';
import { clearCsrfToken } from './csrf';

export const sessionManager = {
  isAuthenticated: (): boolean => {
    return !!tokenStorage.getToken();
  },

  clearSession: (): void => {
    tokenStorage.clearToken();
    clearCsrfToken();
  },
};
