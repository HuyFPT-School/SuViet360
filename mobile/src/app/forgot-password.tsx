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
import { useRouter } from 'expo-router';
import { AxiosError } from 'axios';
import { authApi } from '@/services/authApi';
import { Colors, FontSizes, BorderRadius } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setServerError('');
    setServerSuccess('');
    if (!email) {
      setServerError('Vui lòng nhập email');
      return;
    }
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setServerSuccess(
        'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.'
      );
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandSection}>
          <Text style={styles.brandText}>Hành Trình Sử Việt</Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelInner}>
            <Text style={styles.title}>Quên Mật Khẩu</Text>
            <Text style={styles.subtitle}>
              Nhập email để nhận hướng dẫn đặt lại mật khẩu
            </Text>

            {serverError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{serverError}</Text>
              </View>
            ) : null}
            {serverSuccess ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{serverSuccess}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="rgba(74, 52, 28, 0.45)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
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
                <Text style={styles.submitText}>Gửi Yêu Cầu</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.backText}>← Quay lại đăng nhập</Text>
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
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandText: {
    fontFamily: 'Cinzel',
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.goldLight,
    letterSpacing: 2,
    textTransform: 'uppercase',
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
    marginTop: 8,
    marginBottom: 24,
    fontFamily: 'Cormorant Garamond',
    textAlign: 'center',
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
  errorText: {
    color: Colors.light.error,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  successBox: {
    width: '100%',
    padding: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(80, 138, 72, 0.5)',
    backgroundColor: Colors.light.successBg,
    marginBottom: 12,
  },
  successText: {
    color: Colors.light.success,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  field: {
    width: '100%',
    marginBottom: 16,
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
    shadowColor: Colors.light.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
  backButton: {
    marginTop: 16,
  },
  backText: {
    fontSize: FontSizes.sm,
    color: '#6b451d',
    textDecorationLine: 'underline',
  },
});
