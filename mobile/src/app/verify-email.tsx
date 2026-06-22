import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authApi } from '@/services/authApi';
import { setUser } from '@/store/features/authSlice';
import { useAppDispatch } from '@/store';
import { Colors, FontSizes, BorderRadius } from '@/constants/theme';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token xác thực không hợp lệ.');
      return;
    }

    const verify = async () => {
      try {
        const response = await authApi.verifyEmail(token);
        dispatch(setUser(response.data.user));
        setStatus('success');
        setMessage('Email đã được xác thực thành công!');
        setTimeout(() => router.replace('/(tabs)' as any), 2000);
      } catch {
        setStatus('error');
        setMessage('Token xác thực không hợp lệ hoặc đã hết hạn.');
      }
    };

    verify();
  }, [token]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={Colors.light.gold} />
            <Text style={styles.text}>Đang xác thực email...</Text>
          </>
        )}
        {status === 'success' && (
          <>
            <Text style={styles.icon}>✅</Text>
            <Text style={styles.text}>{message}</Text>
            <Text style={styles.subtext}>Đang chuyển hướng...</Text>
          </>
        )}
        {status === 'error' && (
          <>
            <Text style={styles.icon}>❌</Text>
            <Text style={styles.text}>{message}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120a06',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.light.panel,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    width: '100%',
    maxWidth: 400,
  },
  icon: { fontSize: 48 },
  text: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.lg,
    color: Colors.light.text,
    textAlign: 'center',
  },
  subtext: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.sm,
    color: Colors.light.textMuted,
    fontStyle: 'italic',
  },
});
