import { User, UserRole } from './user';

export interface AuthResponseData {
  user: User;
  accessToken?: string;
  expiresIn?: number;
}

export interface RefreshResponseData {
  accessToken: string;
  expiresIn?: number;
  user?: User | null;
}

export interface CsrfResponseData {
  csrfToken: string;
}

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  username: string;
  password: string;
  displayName?: string;
  role?: UserRole;
}
