import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { PageBackground } from '@/components/PageBackground';
import GoldButton from '@/components/ui/GoldButton';
import HeaderBar from '@/components/ui/HeaderBar';
import { useAuth } from '@/hooks/useAuth';
import { subscriptionApi } from '@/services/subscriptionApi';

export default function RedeemScreen() {
  const { user, refreshUser } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) { setError('Vui lòng nhập mã quà tặng.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setShowAnimation(true);
      await new Promise((r) => setTimeout(r, 1500)); // opening animation
      const res = await subscriptionApi.redeem(code.trim());
      setResult(res);
      setCode('');
      await refreshUser?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Mã không hợp lệ hoặc đã hết hạn.');
      setShowAnimation(false);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <PageBackground style={styles.container}>
        <HeaderBar title="Đổi Mã Quà Tặng" showBack />
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={Colors.light.textMuted} />
          <Text style={styles.emptyText}>Vui lòng đăng nhập để sử dụng.</Text>
        </View>
      </PageBackground>
    );
  }

  return (
    <PageBackground style={styles.container}>
      <HeaderBar title="Đổi Mã Quà Tặng" showBack />

      <View style={styles.content}>
        {showAnimation && !result && !error && (
          <View style={styles.animationBox}>
            <ActivityIndicator size="large" color={Colors.light.gold} />
            <Text style={styles.animationText}>Đang mở quà...</Text>
          </View>
        )}

        {result ? (
          <View style={styles.resultBox}>
            <Ionicons name="gift" size={64} color={Colors.light.gold} />
            <Text style={styles.resultTitle}>Chúc mừng!</Text>
            <Text style={styles.resultText}>
              Bạn đã nhận được gói{' '}
              <Text style={styles.resultHighlight}>
                {result.data?.tier?.name || result.tier}
              </Text>
            </Text>
            {!!result.data?.sender && (
              <Text style={styles.resultSender}>
                Từ: {result.data.sender.name}
              </Text>
            )}
            {!!result.data?.giftMessage && (
              <Text style={styles.resultMessage}>"{result.data.giftMessage}"</Text>
            )}
            <GoldButton title="Đổi Mã Khác" onPress={() => { setResult(null); setShowAnimation(false); }} style={{ marginTop: 16 }} />
          </View>
        ) : !showAnimation && (
          <View style={styles.inputBox}>
            <Ionicons name="gift-outline" size={48} color={Colors.light.gold} style={{ alignSelf: 'center' }} />
            <Text style={styles.label}>Nhập mã quà tặng của bạn</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: SV360-XXXX-XXXX"
              placeholderTextColor={Colors.light.textMuted}
              value={code}
              onChangeText={(t) => { setCode(t); setError(''); }}
              autoCapitalize="characters"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <GoldButton title="Đổi Mã" onPress={handleRedeem} loading={loading} disabled={loading} />
          </View>
        )}
      </View>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: Colors.light.textMuted, fontSize: FontSizes.md, marginTop: 12 },
  content: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  animationBox: { alignItems: 'center', gap: 16 },
  animationText: { color: Colors.light.gold, fontSize: FontSizes.lg },
  resultBox: { alignItems: 'center', gap: 8 },
  resultTitle: { color: Colors.light.gold, fontSize: FontSizes.xl, fontWeight: '700' },
  resultText: { color: Colors.light.textMain, fontSize: FontSizes.md, textAlign: 'center' },
  resultHighlight: { color: Colors.light.gold, fontWeight: '700' },
  resultSender: { color: Colors.light.textMuted, fontSize: FontSizes.sm },
  resultMessage: { color: Colors.light.textMuted, fontSize: FontSizes.sm, fontStyle: 'italic' },
  inputBox: { gap: 16 },
  label: { color: Colors.light.textMuted, fontSize: FontSizes.sm, textAlign: 'center' },
  input: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    color: Colors.light.textMain,
    fontSize: FontSizes.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'center',
    letterSpacing: 2,
  },
  errorText: { color: Colors.light.error, fontSize: FontSizes.xs, textAlign: 'center' },
});
