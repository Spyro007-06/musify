import { apiClient } from "@/shared/services/api-client";
import type { LoginPayload, SignupPayload, AuthResponse } from "@/types/auth";

export const authService = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<{ data: AuthResponse }>("/auth/login", payload);
    return res.data.data;
  },

  signup: async (payload: SignupPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<{ data: AuthResponse }>("/auth/signup", payload);
    return res.data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const res = await apiClient.post<{ data: { accessToken: string } }>("/auth/refresh", { refreshToken });
    return res.data.data;
  },

  getProfile: async () => {
    const res = await apiClient.get("/auth/me");
    return res.data.data;
  },
};
