import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput as RNTextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { PageBackground } from '@/components/PageBackground';
import GoldButton from '@/components/ui/GoldButton';
import HeaderBar from '@/components/ui/HeaderBar';
import { useAuth } from '@/hooks/useAuth';
import { subscriptionApi } from '@/services/subscriptionApi';
import type { SubscriptionTier } from '@/types/subscription';

export default function CheckoutScreen() {
  const { tierId, cycle } = useLocalSearchParams<{ tierId: string; cycle: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [loadingTier, setLoadingTier] = useState(true);
  const [buying, setBuying] = useState(false);
  const [mode, setMode] = useState<'self' | 'gift'>('self');

  // Gift form
  const [recipient, setRecipient] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [giftMode, setGiftMode] = useState<'instant' | 'code'>('instant');
  const [recipientVerified, setRecipientVerified] = useState<any>(null);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<any>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    const load = async () => {
      const tiers = await subscriptionApi.getTiers();
      const found = tiers.find((t) => t._id === tierId);
      setTier(found || null);
      setLoadingTier(false);
    };
    load();
  }, [tierId]);

  const validateCoupon = async () => {
    if (!couponCode.trim() || !tier) return;
    setValidatingCoupon(true);
    setCouponResult(null);
    try {
      const price = cycle === 'yearly' ? tier.priceYearly : tier.priceMonthly;
      const result = await subscriptionApi.validateCoupon(couponCode.trim(), tier._id, price);
      setCouponResult(result);
    } catch {
      Alert.alert('Lỗi', 'Mã giảm giá không hợp lệ.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const verifyRecipient = async () => {
    if (!recipient.trim()) return;
    try {
      const info = await subscriptionApi.verifyRecipient(recipient.trim());
      setRecipientVerified(info);
    } catch {
      Alert.alert('Lỗi', 'Không tìm thấy người nhận.');
    }
  };

  const handlePurchase = async () => {
    if (!tier) return;
    setBuying(true);
    try {
      if (mode === 'gift') {
        if (!recipient.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập email người nhận.'); return; }
        await subscriptionApi.purchaseGift(
          recipient.trim(), tier._id, cycle as 'monthly' | 'yearly',
          giftMessage, giftMode, couponCode.trim() || undefined,
        );
      } else {
        await subscriptionApi.purchase(
          tier._id, cycle as 'monthly' | 'yearly',
          couponCode.trim() || undefined,
        );
      }
      Alert.alert('Thành công', 'Giao dịch đã được xử lý!', [
        { text: 'OK', onPress: () => router.replace('/subscription' as any) },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Giao dịch thất bại. Vui lòng thử lại.');
    } finally {
      setBuying(false);
    }
  };

  if (loadingTier) {
    return (
      <PageBackground style={styles.container}>
        <HeaderBar title="Thanh Toán" showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      </PageBackground>
    );
  }

  if (!tier || !user) {
    return (
      <PageBackground style={styles.container}>
        <HeaderBar title="Thanh Toán" showBack />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.light.textMuted} />
          <Text style={styles.errorText}>{!tier ? 'Gói không tồn tại.' : 'Vui lòng đăng nhập.'}</Text>
        </View>
      </PageBackground>
    );
  }

  const price = cycle === 'yearly' ? tier.priceYearly : tier.priceMonthly;
  const finalPrice = couponResult ? price - couponResult.discount : price;

  return (
    <PageBackground style={styles.container}>
      <HeaderBar title="Thanh Toán" showBack />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{tier.name}</Text>
          <Text style={styles.summaryCycle}>{cycle === 'yearly' ? 'Hàng năm' : 'Hàng tháng'}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{finalPrice.toLocaleString('vi-VN')}₫</Text>
            {!!couponResult && (
              <Text style={styles.originalPrice}>{price.toLocaleString('vi-VN')}₫</Text>
            )}
          </View>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'self' && styles.modeBtnActive]}
            onPress={() => setMode('self')}
          >
            <Text style={[styles.modeText, mode === 'self' && styles.modeTextActive]}>Mua Cho Mình</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'gift' && styles.modeBtnActive]}
            onPress={() => setMode('gift')}
          >
            <Text style={[styles.modeText, mode === 'gift' && styles.modeTextActive]}>Tặng Bạn Bè</Text>
          </TouchableOpacity>
        </View>

        {/* Gift form */}
        {mode === 'gift' && (
          <View style={styles.giftCard}>
            <Text style={styles.label}>Email người nhận</Text>
            <View style={styles.recipientRow}>
              <RNTextInput
                style={styles.input}
                placeholder="email@example.com"
                placeholderTextColor={Colors.light.textMuted}
                value={recipient}
                onChangeText={setRecipient}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <GoldButton title="Kiểm Tra" variant="secondary" onPress={verifyRecipient} />
            </View>
            {recipientVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
                <Text style={styles.verifiedText}>{recipientVerified.name} ({recipientVerified.email})</Text>
              </View>
            )}
            <Text style={styles.label}>Lời nhắn</Text>
            <RNTextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
              placeholder="Lời nhắn tặng kèm..."
              placeholderTextColor={Colors.light.textMuted}
              value={giftMessage}
              onChangeText={setGiftMessage}
              multiline
            />
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtnSmall, giftMode === 'instant' && styles.modeBtnActive]}
                onPress={() => setGiftMode('instant')}
              >
                <Text style={[styles.modeText, giftMode === 'instant' && styles.modeTextActive]}>Gửi Ngay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtnSmall, giftMode === 'code' && styles.modeBtnActive]}
                onPress={() => setGiftMode('code')}
              >
                <Text style={[styles.modeText, giftMode === 'code' && styles.modeTextActive]}>Tạo Mã</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Coupon */}
        <View style={styles.couponCard}>
          <Text style={styles.label}>Mã giảm giá</Text>
          <View style={styles.recipientRow}>
            <RNTextInput
              style={styles.input}
              placeholder="Nhập mã..."
              placeholderTextColor={Colors.light.textMuted}
              value={couponCode}
              onChangeText={setCouponCode}
              autoCapitalize="characters"
            />
            <GoldButton title="Áp Dụng" variant="secondary" onPress={validateCoupon} loading={validatingCoupon} />
          </View>
          {!!couponResult && (
            <View style={styles.couponBadge}>
              <Ionicons name="pricetag" size={14} color={Colors.light.success} />
              <Text style={styles.couponText}>
                Giảm {couponResult.discount.toLocaleString('vi-VN')}₫ ({couponResult.description})
              </Text>
            </View>
          )}
        </View>

        {/* Payment */}
        <GoldButton
          title={`Thanh Toán ${finalPrice.toLocaleString('vi-VN')}₫`}
          onPress={handlePurchase}
          loading={buying}
          disabled={buying}
        />
        <Text style={styles.demoNote}>* Thanh toán demo — không mất phí thực tế</Text>
      </ScrollView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: Colors.light.textMuted, fontSize: FontSizes.md, marginTop: 12 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: 16, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.gold,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  summaryTitle: { color: Colors.light.textMain, fontSize: FontSizes.xl, fontWeight: '700' },
  summaryCycle: { color: Colors.light.textMuted, fontSize: FontSizes.sm, marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 12 },
  price: { color: Colors.light.gold, fontSize: 32, fontWeight: '700' },
  originalPrice: {
    color: Colors.light.textMuted,
    fontSize: FontSizes.sm,
    textDecorationLine: 'line-through',
  },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
  },
  modeBtnSmall: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.backgroundCardAlt,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
  },
  modeBtnActive: { backgroundColor: Colors.light.gold + '33', borderColor: Colors.light.gold },
  modeText: { color: Colors.light.textMuted, fontSize: FontSizes.sm },
  modeTextActive: { color: Colors.light.gold, fontWeight: '700' },
  giftCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.lg,
    gap: 12,
  },
  couponCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.lg,
    gap: 8,
  },
  label: { color: Colors.light.textMuted, fontSize: FontSizes.sm },
  input: {
    flex: 1,
    backgroundColor: Colors.light.backgroundCardAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    color: Colors.light.textMain,
    fontSize: FontSizes.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  recipientRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedText: { color: Colors.light.success, fontSize: FontSizes.xs },
  couponBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  couponText: { color: Colors.light.success, fontSize: FontSizes.xs },
  demoNote: { color: Colors.light.textDim, fontSize: FontSizes.xs, textAlign: 'center' },
});
