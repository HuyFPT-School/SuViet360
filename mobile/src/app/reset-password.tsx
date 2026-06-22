import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AxiosError } from 'axios';
import { authApi } from '@/services/authApi';
import { setUser } from '@/store/features/authSlice';
import { useAppDispatch } from '@/store';
import { Colors, FontSizes, BorderRadius } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setServerError('');
    if (!password) {
      setServerError('Vui lòng nhập mật khẩu mới');
      return;
    }
    if (password !== confirmPassword) {
      setServerError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (!token) {
      setServerError('Token đặt lại mật khẩu không hợp lệ');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await authApi.resetPassword(token, password);
      dispatch(setUser(response.data.user));
      router.replace('/(tabs)' as any);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || 'Đã xảy ra lỗi'
          : 'Đã xảy ra lỗi';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Token đặt lại mật khẩu không hợp lệ</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.panel}>
          <View style={styles.panelInner}>
            <Text style={styles.title}>Đặt Lại Mật Khẩu</Text>
            <Text style={styles.subtitle}>Nhập mật khẩu mới của bạn</Text>

            {serverError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{serverError}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Mật khẩu mới</Text>
              <TextInput
                style={styles.input}
                placeholder="Ít nhất 8 ký tự"
                placeholderTextColor="rgba(74, 52, 28, 0.45)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Xác nhận mật khẩu</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor="rgba(74, 52, 28, 0.45)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#3a2312" size="small" />
              ) : (
                <Text style={styles.submitText}>Đặt Lại</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120a06',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
  },
  errorText: {
    color: Colors.light.error,
    fontSize: FontSizes.md,
  },
  panel: {
    backgroundColor: Colors.light.panel,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  panelInner: {
    padding: 28,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.light.textAuth,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(61, 42, 23, 0.75)',
    marginTop: 4,
    marginBottom: 24,
    fontFamily: 'Cormorant Garamond',
    fontStyle: 'italic',
  },
  errorBox: {
    width: '100%',
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(175, 55, 55, 0.5)',
    backgroundColor: Colors.light.errorBg,
    marginBottom: 12,
  },
  field: {
    width: '100%',
    marginBottom: 14,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.authLabel,
    marginBottom: 6,
    fontFamily: 'Cinzel',
  },
  input: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.authBorder,
    backgroundColor: Colors.light.authInputBg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: FontSizes.md,
    color: Colors.light.textAuth,
  },
  submitButton: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.goldDark,
    paddingVertical: 13,
    backgroundColor: Colors.light.gold,
    alignItems: 'center',
    marginTop: 8,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#3a2312',
  },
});
