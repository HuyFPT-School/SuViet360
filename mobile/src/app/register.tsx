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
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AxiosError } from 'axios';
import Ionicons from '@expo/vector-icons/Ionicons';
import { authApi } from '@/services/authApi';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
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

  const {
    triggerGoogleLogin,
    isLoading: isGoogleLoading,
    error: googleError,
  } = useGoogleAuth();

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
    <ImageBackground
      source={require('@/assets/images/login_screen_bg.jpg')}
      style={styles.container}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandSection}>
            <Text style={styles.brandText}>Hành Trình Sử Việt</Text>
          </View>

          <ImageBackground
            source={require('@/assets/images/login_card_bg.png')}
            style={styles.panel}
            resizeMode="stretch"
          >
            <View style={styles.panelInner}>
              {/* Tab Switcher */}
              <View style={styles.tabHeader}>
                <TouchableOpacity
                  style={styles.tabButton}
                  onPress={() => router.push('/login')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tabButtonText}>ĐĂNG NHẬP</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabButton, styles.tabButtonActive]} activeOpacity={0.8}>
                  <Text style={[styles.tabButtonText, styles.tabButtonTextActive]}>ĐĂNG KÝ</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>Tạo Tài Khoản!</Text>
              <Text style={styles.subtitle}>Đăng ký để bắt đầu hành trình khám phá.</Text>

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
                placeholder="Nhập họ và tên của bạn"
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
                placeholder="Nhập email của bạn"
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
                placeholder="Nhập mật khẩu (ít nhất 8 ký tự)"
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
                placeholder="Nhập lại mật khẩu để xác nhận"
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

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC ĐĂNG KÝ VỚI</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ── Google Sign-Up ── */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                (isGoogleLoading || isSubmitting) && styles.submitDisabled,
              ]}
              onPress={triggerGoogleLogin}
              disabled={isGoogleLoading || isSubmitting}
              activeOpacity={0.8}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#3a2312" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="logo-google"
                    size={20}
                    color="#3a2312"
                    style={styles.googleIcon}
                  />
                  <Text style={styles.googleText}>Đăng ký với Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={[styles.footerLink, { fontWeight: 'bold' }]}>Đăng nhập ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  panelInner: {
    paddingHorizontal: 55,
    paddingTop: 95, // give space for the dragon decoration
    paddingBottom: 48, // give space for the bottom border
    alignItems: 'center',
  },
  tabHeader: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#c7ab73',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#b5834c',
  },
  tabButtonActive: {
    backgroundColor: '#502e17',
  },
  tabButtonText: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: '#e2cfb4',
  },
  tabButtonTextActive: {
    color: '#fbf5e6',
  },
  title: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.xl,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.divider,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: FontSizes.sm,
    color: Colors.light.authFrame,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  googleButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 13,
    backgroundColor: '#fff',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleText: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#3a2312',
    letterSpacing: 0.5,
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
