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
import { setUser } from '@/store/features/authSlice';
import { useAppDispatch } from '@/store';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { Colors, FontSizes, BorderRadius } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    triggerGoogleLogin,
    isLoading: isGoogleLoading,
    error: googleError,
    debugInfo,
  } = useGoogleAuth();

  const handleLogin = async () => {
    setServerError('');
    if (!email || !password) {
      setServerError('Vui lòng nhập email và mật khẩu');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await authApi.login({ email, password });
      dispatch(setUser(response.data.user));
      router.replace('/(tabs)' as any);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || 'Đăng nhập thất bại'
          : 'Đăng nhập thất bại';
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
          {/* Brand */}
          <View style={styles.brandSection}>
            <Text style={styles.brandText}>Hành Trình Sử Việt</Text>
          </View>

          {/* Form Panel */}
          <ImageBackground
            source={require('@/assets/images/login_card_bg.png')}
            style={styles.panel}
            resizeMode="stretch"
          >
            <View style={styles.panelInner}>
              {/* Tab Switcher */}
              <View style={styles.tabHeader}>
                <TouchableOpacity style={[styles.tabButton, styles.tabButtonActive]} activeOpacity={0.8}>
                  <Text style={[styles.tabButtonText, styles.tabButtonTextActive]}>ĐĂNG NHẬP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.tabButton}
                  onPress={() => router.push('/register')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tabButtonText}>ĐĂNG KÝ</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>Chào mừng Trở lại!</Text>
              <Text style={styles.subtitle}>Đăng nhập để tiếp tục hành trình khám phá.</Text>

            {serverError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{serverError}</Text>
              </View>
            ) : null}
            {googleError && !serverError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{googleError}</Text>
              </View>
            ) : null}

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
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { width: '100%' }]}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor="rgba(74, 52, 28, 0.45)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.light.authLabel}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotLink}
              onPress={() => router.push('/forgot-password')}
            >
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#3a2312" size="small" />
              ) : (
                <Text style={styles.submitText}>Đăng Nhập</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC ĐĂNG NHẬP VỚI</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ── Google Sign-In ── */}
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
                  <Text style={styles.googleText}>Đăng nhập với Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={[styles.footerLink, { fontWeight: 'bold' }]}>Đăng ký ngay</Text>
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
    marginBottom: 20,
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
  errorText: {
    color: Colors.light.error,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  field: {
    width: '100%',
    marginBottom: 12,
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
  passwordRow: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 1,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    fontSize: FontSizes.sm,
    color: '#6b451d',
    textDecorationLine: 'underline',
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
  // ── Debug ──
  debugPanel: {
    marginTop: 20,
    backgroundColor: '#0a0a0a',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#333',
    padding: 12,
    maxHeight: 200,
  },
  debugTitle: {
    color: '#0f0',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  debugScroll: {
    maxHeight: 160,
  },
  debugLine: {
    color: '#aaa',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
