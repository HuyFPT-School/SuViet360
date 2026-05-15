import { api } from "@/lib/api";
import type { User } from "@/types/auth";

interface AuthResponse {
  data: {
    user: User;
  };
  message?: string;
}

export const authApi = {
  register: async (payload: {
    name: string;
    email: string;
    password: string;
  }) => {
    const response = await api.post<AuthResponse>("/auth/register", payload);
    return response.data;
  },
  login: async (payload: { email: string; password: string }) => {
    const response = await api.post<AuthResponse>("/auth/login", payload);
    return response.data;
  },
  me: async () => {
    const response = await api.get<AuthResponse>("/auth/me");
    return response.data;
  },
  logout: async () => {
    await api.post("/auth/logout");
  },
};
