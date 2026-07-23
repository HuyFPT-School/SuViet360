import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput as RNTextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
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
  const [verifyingRecipient, setVerifyingRecipient] = useState(false);
  const [recipientError, setRecipientError] = useState('');

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<any>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Payment method & Sepay
  const [paymentMethod, setPaymentMethod] = useState<'sepay' | 'demo'>('demo');
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Checkout success
  const [checkoutSuccess, setCheckoutSuccess] = useState<any>(null);

  // Fallback tiers
  const FALLBACK_TIERS: SubscriptionTier[] = [
    { _id: 'free', name: 'Free', slug: 'free', priceMonthly: 0, priceYearly: 0, features: { dailyAIQueries: 3, premiumLessons: false, customLessonRequest: false, bonusXPMultiplier: 1.0 }, isActive: true, displayOrder: 0, description: 'Trải nghiệm cơ bản', badge: 'Free' },
    { _id: 'student-plus', name: 'Student Plus', slug: 'student-plus', priceMonthly: 49000, priceYearly: 490000, features: { dailyAIQueries: 20, premiumLessons: true, customLessonRequest: false, bonusXPMultiplier: 1.5 }, isActive: true, displayOrder: 1, description: 'Mở khóa bài học premium', badge: 'Plus' },
    { _id: 'student-pro', name: 'Student Pro', slug: 'student-pro', priceMonthly: 99000, priceYearly: 990000, features: { dailyAIQueries: -1, premiumLessons: true, customLessonRequest: true, bonusXPMultiplier: 2.0 }, isActive: true, displayOrder: 2, description: 'Trải nghiệm tối đa', badge: 'Pro' },
  ];

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Poll transaction status for Sepay
  useEffect(() => {
    if (!pendingPayment) return;

    let pollCount = 0;
    const maxPolls = 200; // 10 minutes (200 * 3s)

    const intervalId = setInterval(async () => {
      pollCount++;
      if (pollCount > maxPolls) {
        clearInterval(intervalId);
        pollIntervalRef.current = null;
        Alert.alert('Hết thời gian', 'Giao dịch chưa được ghi nhận sau 10 phút. Vui lòng liên hệ hỗ trợ.');
        return;
      }
      try {
        const res = await subscriptionApi.getTransactionStatus(pendingPayment.id);
        if (res.status === 'Completed') {
          clearInterval(intervalId);
          pollIntervalRef.current = null;
          setPendingPayment(null);
          Alert.alert('Thành công', 'Giao dịch đã được xử lý!', [
            { text: 'OK', onPress: () => router.replace('/subscription' as any) },
          ]);
        }
      } catch {
        // silent fail on poll
      }
    }, 3000);

    pollIntervalRef.current = intervalId;

    return () => {
      clearInterval(intervalId);
      pollIntervalRef.current = null;
    };
  }, [pendingPayment]);

  // Load tier info (with fallback)
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingTier(true);
        const tiers = await subscriptionApi.getTiers();
        const found = tiers.find((t) => t._id === tierId || t.slug === tierId);
        if (found) { setTier(found); }
        else {
          const fb = FALLBACK_TIERS.find((t) => t._id === tierId || t.slug === tierId);
          setTier(fb || null);
        }
      } catch {
        const fb = FALLBACK_TIERS.find((t) => t._id === tierId || t.slug === tierId);
        setTier(fb || null);
      } finally { setLoadingTier(false); }
    };
    load();
  }, [tierId]);

  const validateCoupon = async () => {
    if (!couponCode.trim() || !tier) return;
    setValidatingCoupon(true);
    setCouponResult(null);
    setCouponError('');
    try {
      const price = cycle === 'yearly' ? tier.priceYearly : tier.priceMonthly;
      const result = await subscriptionApi.validateCoupon(couponCode.trim().toUpperCase(), tier._id, price);
      setCouponResult(result);
    } catch (err: any) {
      setCouponError(err?.response?.data?.message || 'Mã giảm giá không hợp lệ.');
    } finally { setValidatingCoupon(false); }
  };

  const verifyRecipient = async () => {
    if (!recipient.trim()) return;
    setVerifyingRecipient(true);
    setRecipientError('');
    setRecipientVerified(null);
    try {
      const info = await subscriptionApi.verifyRecipient(recipient.trim());
      setRecipientVerified(info);
    } catch (err: any) {
      setRecipientError(err?.response?.data?.message || 'Không tìm thấy người dùng này.');
    } finally { setVerifyingRecipient(false); }
  };

  const handlePurchase = async () => {
    if (!tier) return;
    setBuying(true);
    try {
      if (mode === 'gift') {
        if (giftMode === 'instant' && !recipientVerified) {
          Alert.alert('Lỗi', 'Vui lòng nhập và xác nhận thông tin người nhận.');
          setBuying(false); return;
        }
        const recipientIdentifier = giftMode === 'instant'
          ? recipientVerified?.email || recipient.trim()
          : 'gift_code_generation';
        const result = await subscriptionApi.purchaseGift(
          recipientIdentifier, tier._id, cycle as 'monthly' | 'yearly',
          giftMessage.trim(), giftMode, couponCode.trim() || undefined,
          paymentMethod,
        );
        if (paymentMethod === 'demo' || finalPrice === 0) {
          setCheckoutSuccess({ mode: 'gift', delivery: giftMode, data: result.data || result });
        } else {
          setPendingPayment({
            id: result.data?.transaction?._id || result.transaction?._id,
            transactionId: result.data?.transaction?.transactionId || result.transaction?.transactionId,
            amount: result.data?.transaction?.amount || result.transaction?.amount,
            bankInfo: result.data?.bankInfo || result.bankInfo,
            mode: 'gift', delivery: giftMode,
          });
        }
      } else {
        const result = await subscriptionApi.purchase(
          tier._id, cycle as 'monthly' | 'yearly',
          couponCode.trim() || undefined, paymentMethod,
        );
        if (paymentMethod === 'demo' || finalPrice === 0) {
          setCheckoutSuccess({ mode: 'self', data: result.data || result });
        } else {
          setPendingPayment({
            id: result.data?.transaction?._id || result.transaction?._id,
            transactionId: result.data?.transaction?.transactionId || result.transaction?.transactionId,
            amount: result.data?.transaction?.amount || result.transaction?.amount,
            bankInfo: result.data?.bankInfo || result.bankInfo,
            mode: 'self',
          });
        }
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Giao dịch thất bại. Vui lòng thử lại.');
    } finally { setBuying(false); }
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

  // ─── Sepay QR Screen ─────────────────────────────────
  if (pendingPayment) {
    const vietqrUrl = `https://img.vietqr.io/image/${pendingPayment.bankInfo.bin}-${pendingPayment.bankInfo.accountNumber}-qr_only.png?amount=${pendingPayment.amount}&addInfo=${pendingPayment.transactionId}&accountName=${encodeURIComponent(pendingPayment.bankInfo.accountName)}`;

    return (
      <PageBackground style={styles.container}>
        <HeaderBar title="Chuyển Khoản" showBack />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.sepayContent}>
          <View style={styles.sepayCard}>
            <Text style={styles.sepayTitle}>Chuyển Khoản Ngân Hàng</Text>
            <Text style={styles.sepaySubtitle}>Quét mã VietQR hoặc chuyển khoản đúng thông tin</Text>

            {/* QR Image */}
            <View style={styles.qrContainer}>
              <Image
                source={{ uri: vietqrUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
              <Text style={styles.qrLabel}>Napas 247 VietQR</Text>
            </View>

            {/* Bank Details */}
            <View style={styles.bankDetails}>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Ngân hàng nhận</Text>
                <Text style={styles.bankValue}>VietQR (BIN {pendingPayment.bankInfo.bin})</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Số tài khoản</Text>
                <Text style={styles.bankValueAccent}>{pendingPayment.bankInfo.accountNumber}</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Chủ tài khoản</Text>
                <Text style={styles.bankValue}>{pendingPayment.bankInfo.accountName}</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Số tiền cần chuyển</Text>
                <Text style={styles.bankAmount}>{pendingPayment.amount.toLocaleString('vi-VN')}₫</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Nội dung CK (ghi chính xác)</Text>
                <Text style={styles.bankRef} selectable>{pendingPayment.transactionId}</Text>
              </View>
            </View>

            {/* Loading indicator */}
            <View style={styles.pollingRow}>
              <ActivityIndicator size="small" color={Colors.light.gold} />
              <Text style={styles.pollingText}>Đang đợi hệ thống ghi nhận thanh toán...</Text>
            </View>
            <Text style={styles.pollingHint}>
              Tài khoản sẽ được kích hoạt tự động sau khi chuyển khoản thành công. Vui lòng giữ nguyên trang này.
            </Text>

            <GoldButton
              title="Hủy & Quay lại"
              variant="secondary"
              onPress={() => {
                Alert.alert('Xác nhận', 'Hủy giao dịch hiện tại để quay về trang thanh toán?', [
                  { text: 'Không', style: 'cancel' },
                  { text: 'Có', style: 'destructive', onPress: () => setPendingPayment(null) },
                ]);
              }}
            />
          </View>
        </ScrollView>
      </PageBackground>
    );
  }

  // ─── Success Screen ─────────────────────────────────
  if (checkoutSuccess) {
    const codeToCopy = checkoutSuccess.data?.code || checkoutSuccess.data?.giftCode?.code || '';
    return (
      <PageBackground style={styles.container}>
        <HeaderBar title="Thanh Toán" showBack />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.sepayCard, { alignItems: 'center', gap: 16 }]}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.light.success} />
            </View>
            <Text style={styles.sepayTitle}>Giao Dịch Thành Công!</Text>
            <View style={{ width: 48, height: 2, backgroundColor: Colors.light.gold }} />
            {checkoutSuccess.mode === 'self' ? (
              <Text style={styles.successText}>
                Cảm ơn bạn! Tài khoản của bạn đã được nâng cấp thành công lên gói{' '}
                <Text style={{ color: Colors.light.gold, fontWeight: '700' }}>{tier?.name}</Text>.
              </Text>
            ) : checkoutSuccess.delivery === 'instant' ? (
              <Text style={styles.successText}>
                Cảm ơn bạn! Gói <Text style={{ color: Colors.light.gold, fontWeight: '700' }}>{tier?.name}</Text> đã được gửi tặng và kích hoạt trực tiếp.
              </Text>
            ) : (
              <View style={{ gap: 12, width: '100%' }}>
                <Text style={styles.successText}>
                  Bạn đã mua quà tặng thành công! Dưới đây là mã quà tặng để gửi cho bạn bè:
                </Text>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText} selectable>{codeToCopy}</Text>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => {
                      // Clipboard.setString is deprecated; using Alert fallback
                      Alert.alert('Mã quà tặng', codeToCopy, [
                        { text: 'Đã sao chép', onPress: () => {} },
                      ]);
                    }}
                  >
                    <Text style={styles.copyBtnText}>Sao chép</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <GoldButton title="Trở Lại Gói VIP" onPress={() => router.replace('/subscription' as any)} />
            </View>
          </View>
        </ScrollView>
      </PageBackground>
    );
  }

  // ─── Normal Checkout UI ──────────────────────────────
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
              <GoldButton title="Kiểm Tra" variant="secondary" onPress={verifyRecipient} loading={verifyingRecipient} disabled={verifyingRecipient || !recipient.trim()} />
            </View>
            {recipientVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
                <Text style={styles.verifiedText}>{recipientVerified.name} ({recipientVerified.email})</Text>
              </View>
            )}
            {recipientError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color={Colors.light.error} />
                <Text style={styles.errorMsg}>{recipientError}</Text>
              </View>
            ) : null}
            <Text style={styles.label}>Lời nhắn</Text>
            <RNTextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
              placeholder="Lời nhắn tặng kèm..."
              placeholderTextColor={Colors.light.textMuted}
              value={giftMessage}
              onChangeText={setGiftMessage}
              multiline
              maxLength={250}
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
          {couponError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={Colors.light.error} />
              <Text style={styles.errorMsg}>{couponError}</Text>
            </View>
          ) : null}
        </View>

        {/* Payment Method */}
        <View style={styles.couponCard}>
          <Text style={styles.label}>Phương thức thanh toán</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtnSmall, paymentMethod === 'demo' && styles.modeBtnActive]}
              onPress={() => setPaymentMethod('demo')}
            >
              <Text style={[styles.modeText, paymentMethod === 'demo' && styles.modeTextActive]}>Demo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtnSmall, paymentMethod === 'sepay' && styles.modeBtnActive]}
              onPress={() => setPaymentMethod('sepay')}
            >
              <Text style={[styles.modeText, paymentMethod === 'sepay' && styles.modeTextActive]}>Sepay QR</Text>
            </TouchableOpacity>
          </View>
          {paymentMethod === 'demo' && (
            <Text style={styles.demoNote}>* Thanh toán demo — không mất phí thực tế</Text>
          )}
        </View>

        {/* Payment */}
        <GoldButton
          title={`Thanh Toán ${finalPrice.toLocaleString('vi-VN')}₫`}
          onPress={handlePurchase}
          loading={buying}
          disabled={buying}
        />
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
  // ─── Sepay QR Styles ─────────────────────────────────
  sepayContent: { padding: Spacing.md, paddingBottom: 40 },
  sepayCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.gold,
    padding: Spacing.lg,
    gap: 16,
    alignItems: 'center',
  },
  sepayTitle: { color: Colors.light.gold, fontSize: FontSizes.xl, fontWeight: '700', textAlign: 'center' },
  sepaySubtitle: { color: Colors.light.textMuted, fontSize: FontSizes.sm, textAlign: 'center', fontStyle: 'italic' },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.goldDark,
    width: 240,
    alignSelf: 'center',
  },
  qrImage: { width: 200, height: 200 },
  qrLabel: { color: '#666', fontSize: 9, fontWeight: '700', marginTop: 8, letterSpacing: 2, textTransform: 'uppercase' },
  bankDetails: {
    width: '100%',
    backgroundColor: Colors.light.backgroundCardAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.md,
    gap: 10,
  },
  bankRow: { gap: 2 },
  bankLabel: { color: Colors.light.textDim, fontSize: FontSizes.xs, textTransform: 'uppercase', letterSpacing: 1 },
  bankValue: { color: Colors.light.textMain, fontSize: FontSizes.sm, fontWeight: '500' },
  bankValueAccent: { color: Colors.light.gold, fontSize: FontSizes.lg, fontWeight: '700', fontFamily: 'monospace' },
  bankAmount: { color: Colors.light.success, fontSize: FontSizes.xl, fontWeight: '700' },
  bankRef: {
    color: Colors.light.gold,
    fontSize: FontSizes.md,
    fontWeight: '700',
    fontFamily: 'monospace',
    backgroundColor: Colors.light.backgroundDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.goldDark,
    overflow: 'hidden',
  },
  pollingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pollingText: { color: Colors.light.gold, fontSize: FontSizes.sm, fontStyle: 'italic', fontWeight: '600' },
  pollingHint: { color: Colors.light.textDim, fontSize: FontSizes.xs, textAlign: 'center', lineHeight: 18 },
  // ─── Success Screen ──────────────────────────────────
  successIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  successText: { color: Colors.light.textMain, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 22 },
  codeBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.light.backgroundDark,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.light.gold,
    padding: 12, gap: 12,
  },
  codeText: { flex: 1, color: Colors.light.gold, fontSize: FontSizes.lg, fontWeight: '700', fontFamily: 'monospace' },
  copyBtn: { backgroundColor: Colors.light.gold, borderRadius: BorderRadius.sm, paddingHorizontal: 12, paddingVertical: 6 },
  copyBtnText: { color: Colors.light.backgroundDark, fontSize: FontSizes.xs, fontWeight: '700' },
  // ─── Inline Errors ───────────────────────────────────
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorMsg: { color: Colors.light.error, fontSize: FontSizes.xs, flex: 1 },
});
