import axios from 'axios';
import { Platform } from 'react-native';
import { API_URL as RAW_API_URL } from '@/constants/theme';

// Android emulator uses 10.0.2.2 to reach host machine's localhost
const BASE_URL = Platform.select({
  android: RAW_API_URL.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2'),
  default: RAW_API_URL,
});

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Cross-platform storage ─────────────────────────────────────
// SecureStore only works on native. On web we fall back to memory + sessionStorage.
let csrfTokenMemory: string | null = null;

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return sessionStorage.getItem(key) || csrfTokenMemory;
      } catch {
        return csrfTokenMemory;
      }
    }
    try {
      const { getItemAsync } = await import('expo-secure-store');
      return getItemAsync(key);
    } catch {
      return csrfTokenMemory;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    csrfTokenMemory = value;
    if (Platform.OS === 'web') {
      try { sessionStorage.setItem(key, value); } catch { /* ignore */ }
    } else {
      try {
        const { setItemAsync } = await import('expo-secure-store');
        await setItemAsync(key, value);
      } catch { /* ignore */ }
    }
  },
};

// ─── Refresh-token queue ────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh-token') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const csrfResponse = await api.get<{ data: { csrfToken: string } }>('/csrf-token');
        const csrfToken = csrfResponse.data.data.csrfToken;
        await storage.setItem('csrf_token', csrfToken);
        await api.post('/auth/refresh-token', {}, {
          headers: { 'x-csrf-token': csrfToken },
        });
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const ensureCsrfToken = async (): Promise<string> => {
  let token = await storage.getItem('csrf_token');
  if (!token) {
    const response = await api.get<{ data: { csrfToken: string } }>('/csrf-token');
    token = response.data.data.csrfToken;
    await storage.setItem('csrf_token', token);
  }
  return token;
};
