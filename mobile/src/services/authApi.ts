import { api, ensureCsrfToken } from './api';
import type { User } from '@/types/auth';

interface AuthResponse {
  data: {
    user: User;
  };
  message?: string;
}

export const authApi = {
  register: async (payload: { name: string; email: string; password: string }) => {
    const token = await ensureCsrfToken();
    const response = await api.post<AuthResponse>('/auth/register', payload, {
      headers: { 'x-csrf-token': token },
    });
    return response.data;
  },

  login: async (payload: { email: string; password: string }) => {
    const token = await ensureCsrfToken();
    const response = await api.post<AuthResponse>('/auth/login', payload, {
      headers: { 'x-csrf-token': token },
    });
    return response.data;
  },

  me: async () => {
    const response = await api.get<AuthResponse>('/auth/me');
    return response.data;
  },

  logout: async () => {
    const token = await ensureCsrfToken();
    await api.post('/auth/logout', {}, {
      headers: { 'x-csrf-token': token },
    });
  },

  forgotPassword: async (email: string) => {
    const token = await ensureCsrfToken();
    const response = await api.post('/auth/forgot-password', { email }, {
      headers: { 'x-csrf-token': token },
    });
    return response.data;
  },

  resetPassword: async (resetToken: string, password: string) => {
    const token = await ensureCsrfToken();
    const response = await api.post<AuthResponse>(
      `/auth/reset-password?token=${resetToken}`,
      { password },
      { headers: { 'x-csrf-token': token } }
    );
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const token = await ensureCsrfToken();
    const response = await api.post('/auth/change-password', { currentPassword, newPassword }, {
      headers: { 'x-csrf-token': token },
    });
    return response.data;
  },

  refreshToken: async () => {
    const token = await ensureCsrfToken();
    const response = await api.post<AuthResponse>('/auth/refresh-token', {}, {
      headers: { 'x-csrf-token': token },
    });
    return response.data;
  },

  resendVerification: async (email: string) => {
    const token = await ensureCsrfToken();
    const response = await api.post('/auth/resend-verification', { email }, {
      headers: { 'x-csrf-token': token },
    });
    return response.data;
  },

  verifyEmail: async (verifyToken: string) => {
    const response = await api.get<AuthResponse>(`/auth/verify-email?token=${verifyToken}`);
    return response.data;
  },

  googleLogin: async (idToken: string) => {
    const token = await ensureCsrfToken();
    const response = await api.post<AuthResponse>('/auth/google', { idToken }, {
      headers: { 'x-csrf-token': token },
    });
    return response.data;
  },

  /** Mobile Google OAuth: gọi sau khi nhận mobileToken từ backend callback */
  googleMobileFinalize: async (mobileToken: string) => {
    const token = await ensureCsrfToken();
    const response = await api.post<AuthResponse>(
      '/auth/google/mobile-finalize',
      { mobileToken },
      { headers: { 'x-csrf-token': token } },
    );
    return response.data;
  },
};
