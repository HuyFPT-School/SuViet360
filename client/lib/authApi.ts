import { api } from "@/lib/api";
import type { User } from "@/types/auth";

interface AuthResponse {
  data: {
    user: User;
  };
  message?: string;
}

const ensureCsrfToken = async () => {
  const response = await api.get<{ data: { csrfToken: string } }>(
    "/csrf-token"
  );
  return response.data.data.csrfToken;
};

export const authApi = {
  register: async (payload: {
    name: string;
    email: string;
    password: string;
  }) => {
    const token = await ensureCsrfToken();
    const response = await api.post<AuthResponse>("/auth/register", payload, {
      headers: {
        "x-csrf-token": token,
      },
    });
    return response.data;
  },
  login: async (payload: { email: string; password: string }) => {
    const token = await ensureCsrfToken();
    const response = await api.post<AuthResponse>("/auth/login", payload, {
      headers: {
        "x-csrf-token": token,
      },
    });
    return response.data;
  },
  me: async () => {
    const response = await api.get<AuthResponse>("/auth/me");
    return response.data;
  },
  logout: async () => {
    const token = await ensureCsrfToken();
    await api.post(
      "/auth/logout",
      {},
      {
        headers: {
          "x-csrf-token": token,
        },
      }
    );
  },
};
