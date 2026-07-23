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

  // Stages: 'input' | 'opening' | 'success'
  const [stage, setStage] = useState<'input' | 'opening' | 'success'>('input');
  const [giftData, setGiftData] = useState<{
    tierName: string;
    senderName: string;
    message: string;
  } | null>(null);

  const handleRedeem = async () => {
    if (!code.trim()) { setError('Vui lòng nhập mã quà tặng.'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await subscriptionApi.redeem(code.trim().toUpperCase());

      const returnedData = res.data || res;
      const tierName = returnedData?.tier?.name || returnedData?.tierName || 'Gói VIP';
      const senderName = returnedData?.sender?.name || returnedData?.senderName || 'Người bạn bí ẩn';
      const message = returnedData?.giftMessage || returnedData?.message || '';

      setGiftData({ tierName, senderName, message });

      // Advance to opening animation
      setStage('opening');
      await refreshUser?.();

      // Show success after 1.8 seconds
      setTimeout(() => {
        setStage('success');
        setLoading(false);
      }, 1800);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Mã không hợp lệ hoặc đã hết hạn.');
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
        {/* Stage: input */}
        {stage === 'input' && (
          <View style={styles.inputBox}>
            <Ionicons name="gift-outline" size={48} color={Colors.light.gold} style={{ alignSelf: 'center' }} />
            <Text style={styles.label}>Nhập mã quà tặng của bạn</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: SV360-XXXX-XXXX"
              placeholderTextColor={Colors.light.textMuted}
              value={code}
              onChangeText={(t) => { setCode(t.toUpperCase()); setError(''); }}
              autoCapitalize="characters"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <GoldButton title="Nhận Quà Ngay" onPress={handleRedeem} loading={loading} disabled={loading || !code.trim()} />
          </View>
        )}

        {/* Stage: opening animation */}
        {stage === 'opening' && (
          <View style={styles.animationBox}>
            <Ionicons name="gift" size={80} color={Colors.light.gold} />
            <ActivityIndicator size="large" color={Colors.light.gold} />
            <Text style={styles.animationText}>Đang mở hộp quà lịch sử...</Text>
            <Text style={styles.animationSub}>Dấu ấn thời gian đang hiển hiện</Text>
          </View>
        )}

        {/* Stage: success */}
        {stage === 'success' && giftData && (
          <View style={styles.resultBox}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.light.success} />
            </View>
            <Text style={styles.resultTitle}>Nhận Quà Thành Công!</Text>
            <Text style={styles.resultSubtitle}>Hộp quà đã được mở</Text>
            <View style={styles.divider} />
            <Text style={styles.resultText}>
              Bạn đã mở khóa gói thành viên:
            </Text>
            <Text style={styles.resultHighlight}>{giftData.tierName}</Text>
            <Text style={styles.resultSender}>
              Được gửi tặng bởi: {giftData.senderName}
            </Text>
            {giftData.message ? (
              <View style={styles.giftMessageBox}>
                <Text style={styles.giftMessageLabel}>Lời chúc:</Text>
                <Text style={styles.giftMessageText}>"{giftData.message}"</Text>
              </View>
            ) : null}
            <GoldButton
              title="Đổi Mã Khác"
              onPress={() => { setStage('input'); setGiftData(null); setCode(''); }}
              style={{ marginTop: 20 }}
            />
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
  // ─── Animation ───
  animationBox: { alignItems: 'center', gap: 12 },
  animationText: { color: Colors.light.gold, fontSize: FontSizes.xl, fontWeight: '700' },
  animationSub: { color: Colors.light.textMuted, fontSize: FontSizes.sm, fontStyle: 'italic' },
  // ─── Success ───
  successIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  divider: { width: 48, height: 2, backgroundColor: Colors.light.gold, marginVertical: 16, alignSelf: 'center' },
  resultBox: { alignItems: 'center', gap: 6 },
  resultTitle: { color: Colors.light.gold, fontSize: FontSizes.xl, fontWeight: '700' },
  resultSubtitle: { color: Colors.light.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  resultText: { color: Colors.light.textMain, fontSize: FontSizes.md, textAlign: 'center', marginTop: 4 },
  resultHighlight: { color: Colors.light.gold, fontSize: FontSizes.xl, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  resultSender: { color: Colors.light.textMuted, fontSize: FontSizes.sm },
  giftMessageBox: {
    backgroundColor: Colors.light.backgroundCardAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.goldDark,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
    maxWidth: '90%',
  },
  giftMessageLabel: { color: Colors.light.gold, fontSize: FontSizes.xs, fontWeight: '700', marginBottom: 4 },
  giftMessageText: { color: Colors.light.textMuted, fontSize: FontSizes.sm, fontStyle: 'italic', textAlign: 'center' },
  // ─── Input ───
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
