import { useEffect, useState, useCallback, useRef } from 'react';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { AxiosError } from 'axios';
import { authApi } from '@/services/authApi';
import { setUser } from '@/store/features/authSlice';
import { useAppDispatch } from '@/store';

// ─── Config ──────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
const BACKEND_CALLBACK = `${API_BASE}/auth/google/callback`;

// WebBrowser lắng nghe URL này để bắt redirect từ backend
const APP_RETURN_URL = makeRedirectUri({ path: 'login' });

// ─── Debug ────────────────────────────────────────────────────
const DBG = (...args: unknown[]) => {
  console.log('━━━━ [GoogleAuth] ━━━━');
  args.forEach((a) => console.log('  ', a));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━');
};

export function useGoogleAuth() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const addDebug = (msg: string) => {
    if (__DEV__) { console.log('[GoogleAuth]', msg); setDebugInfo((p) => [...p.slice(-30), msg]); }
  };

  useEffect(() => {
    DBG(
      '=== CONFIG ===',
      `GOOGLE_CLIENT_ID : ${GOOGLE_CLIENT_ID.slice(0, 20)}...`,
      `BACKEND_CALLBACK : ${BACKEND_CALLBACK}`,
      `APP_RETURN_URL   : ${APP_RETURN_URL}`,
    );
  }, []);

  const triggerGoogleLogin = useCallback(async () => {
    setError(null);
    addDebug('🚀 Starting...');
    if (!GOOGLE_CLIENT_ID) { setError('Thiếu GOOGLE_CLIENT_ID'); return; }

    const nonce = Math.random().toString(36).substring(2, 15);
    const state = APP_RETURN_URL; // backend dùng state để redirect về app

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: BACKEND_CALLBACK,
      response_type: 'code',
      scope: 'openid profile email',
      nonce,
      state,
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    addDebug(`📱 Opening browser → backend callback`);
    addDebug(`   redirect_uri: ${BACKEND_CALLBACK}`);

    try {
      setIsProcessing(true);

      const result = await WebBrowser.openAuthSessionAsync(authUrl, APP_RETURN_URL);
      addDebug(`📥 type=${result.type}`);

      if (result.type !== 'success') { addDebug(`⏹ ${result.type}`); return; }

      const returnUrl = result.url;
      const qs = new URLSearchParams(returnUrl.split('?')[1] || '');
      const mobileToken = qs.get('mt');
      const errMsg = qs.get('error');

      if (errMsg) { setError(decodeURIComponent(errMsg)); addDebug(`❌ ${errMsg}`); return; }
      if (!mobileToken) { setError('Không nhận được token'); addDebug('❌ No mt'); return; }

      addDebug('📤 Finalizing...');
      const authRes = await authApi.googleMobileFinalize(mobileToken);
      dispatch(setUser(authRes.data.user));
      addDebug('✅ Login OK');
      router.replace('/(tabs)' as any);
    } catch (err) {
      const msg = err instanceof AxiosError
        ? err.response?.data?.message || 'Backend từ chối'
        : err instanceof Error ? err.message : 'Lỗi';
      setError(msg); addDebug(`❌ ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  }, [router, dispatch]);

  return { triggerGoogleLogin, isLoading: isProcessing, error, debugInfo };
}
