export type User = {
  id: string;
  email: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  role?: string;
  isPremium?: boolean;
  isVerified?: boolean;
  // Convenience aliases — kept for backward compat with old components
  name?: string;
  avatar?: string;
};

export type AuthState = {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignupPayload = {
  username: string;
  displayName?: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken?: string;
};
