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

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    setServerError('');
    setServerSuccess('');
    if (!name || !email || !password) {
      setServerError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (password.length < 8) {
      setServerError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setServerError('Mật khẩu xác nhận không khớp');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await authApi.register({ name, email, password });
      setServerSuccess(
        response.message ||
          'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.'
      );
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || 'Đăng ký thất bại'
          : 'Đăng ký thất bại';
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
            <Text style={styles.title}>Đăng Ký</Text>
            <Text style={styles.subtitle}>Khám phá lịch sử Việt Nam</Text>

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
              <Text style={styles.label}>Họ tên</Text>
              <TextInput
                style={styles.input}
                placeholder="Nguyễn Văn A"
                placeholderTextColor="rgba(74, 52, 28, 0.45)"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

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

            <View style={styles.field}>
              <Text style={styles.label}>Mật khẩu</Text>
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
              style={styles.showPwButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.showPwText}>
                {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
              onPress={handleRegister}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#3a2312" size="small" />
              ) : (
                <Text style={styles.submitText}>Đăng Ký</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.footerLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
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
    padding: 20,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandText: {
    fontFamily: 'Cinzel',
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.goldLight,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
    padding: 24,
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
    marginBottom: 16,
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
    marginBottom: 8,
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
    marginBottom: 8,
  },
  successText: {
    color: Colors.light.success,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  field: {
    width: '100%',
    marginBottom: 10,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.light.authLabel,
    marginBottom: 4,
    fontFamily: 'Cinzel',
  },
  input: {
    width: '100%',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.authBorder,
    backgroundColor: Colors.light.authInputBg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: FontSizes.sm,
    color: Colors.light.textAuth,
  },
  showPwButton: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  showPwText: {
    fontSize: FontSizes.xs,
    color: '#6b451d',
  },
  submitButton: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.goldDark,
    paddingVertical: 12,
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: FontSizes.sm,
    color: 'rgba(61, 42, 23, 0.75)',
  },
  footerLink: {
    fontSize: FontSizes.sm,
    color: '#6b451d',
    fontWeight: '600',
  },
});
