import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { PageBackground } from '@/components/PageBackground';
import GoldButton from '@/components/ui/GoldButton';
import HeaderBar from '@/components/ui/HeaderBar';
import { useAuth } from '@/hooks/useAuth';
import { subscriptionApi } from '@/services/subscriptionApi';
import type { SubscriptionTier, LessonRequest } from '@/types/subscription';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'tiers' | 'redeem' | 'request'>('tiers');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [lessonRequests, setLessonRequests] = useState<LessonRequest[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [loadingSub, setLoadingSub] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Redeem
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemResult, setRedeemResult] = useState<any>(null);
  const [redeemError, setRedeemError] = useState('');

  // Lesson request
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqPeriod, setReqPeriod] = useState('');
  const [reqLoading, setReqLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingTiers(true);
        const t = await subscriptionApi.getTiers();
        setTiers(t.sort((a, b) => a.displayOrder - b.displayOrder));
      } catch { /* ignore */ } finally {
        setLoadingTiers(false);
      }
      try {
        setLoadingSub(true);
        const sub = await subscriptionApi.getMySubscription();
        setCurrentSub(sub);
      } catch { /* ignore */ } finally {
        setLoadingSub(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const isPro = currentSub?.tier?.toLowerCase?.()?.includes('student pro');
    if (activeTab === 'request' && isPro) {
      setLoadingRequests(true);
      subscriptionApi.getMyLessonRequests()
        .then(setLessonRequests)
        .catch(() => {})
        .finally(() => setLoadingRequests(false));
    }
  }, [activeTab, currentSub]);

  const handleRedeem = async () => {
    if (!redeemCode.trim()) { setRedeemError('Vui lòng nhập mã quà tặng.'); return; }
    setRedeemLoading(true);
    setRedeemError('');
    setRedeemResult(null);
    try {
      const res = await subscriptionApi.redeem(redeemCode.trim());
      setRedeemResult(res);
      setRedeemCode('');
    } catch (err: any) {
      setRedeemError(err?.response?.data?.message || 'Mã không hợp lệ hoặc đã hết hạn.');
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleRequest = async () => {
    if (!reqTitle.trim() || !reqDesc.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề và mô tả.');
      return;
    }
    setReqLoading(true);
    try {
      await subscriptionApi.createLessonRequest(reqTitle.trim(), reqDesc.trim(), reqPeriod || undefined);
      Alert.alert('Thành công', 'Yêu cầu bài học đã được gửi!');
      setReqTitle('');
      setReqDesc('');
      setReqPeriod('');
      const reqs = await subscriptionApi.getMyLessonRequests();
      setLessonRequests(reqs);
    } catch {
      Alert.alert('Lỗi', 'Không thể gửi yêu cầu.');
    } finally {
      setReqLoading(false);
    }
  };

  const getPrice = (tier: SubscriptionTier) =>
    billingCycle === 'monthly' ? tier.priceMonthly : tier.priceYearly;

  const formatPrice = (price: number) =>
    price.toLocaleString('vi-VN') + '₫';

  const renderTierCard = (tier: SubscriptionTier, index: number) => {
    const isPopular = index === 1;
    const isCurrent = currentSub?.tier === tier.name;
    return (
      <View key={tier._id} style={[styles.tierCard, isPopular && styles.tierCardPopular]}>
        {isPopular && <Text style={styles.popularBadge}>Phổ Biến</Text>}
        <Text style={styles.tierName}>{tier.name}</Text>
        <Text style={styles.tierDescription}>{tier.description}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.tierPrice}>{formatPrice(getPrice(tier))}</Text>
          <Text style={styles.priceUnit}>/{billingCycle === 'monthly' ? 'tháng' : 'năm'}</Text>
        </View>
        <View style={styles.featuresList}>
          {tier.features?.premiumLessons && (
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
              <Text style={styles.featureText}>Bài học cao cấp</Text>
            </View>
          )}
          {tier.features?.customLessonRequest && (
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
              <Text style={styles.featureText}>Yêu cầu bài học riêng</Text>
            </View>
          )}
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
            <Text style={styles.featureText}>XP x{tier.features?.bonusXPMultiplier || 1}</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
            <Text style={styles.featureText}>{tier.features?.dailyAIQueries || 0} truy vấn AI/ngày</Text>
          </View>
        </View>
        {isCurrent ? (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Gói Hiện Tại</Text>
          </View>
        ) : (
          <GoldButton
            title={user ? 'Chọn Gói' : 'Đăng Nhập'}
            onPress={() => {
              if (!user) router.push('/login');
              else router.push(`/subscription/checkout?tierId=${tier._id}&cycle=${billingCycle}` as any);
            }}
          />
        )}
      </View>
    );
  };

  return (
    <PageBackground style={styles.container}>
      <HeaderBar title="Gói VIP" showBack />

      {/* Tab Selector */}
      <View style={styles.tabRow}>
        {(['tiers', 'redeem', 'request'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'tiers' ? 'Gói VIP' : tab === 'redeem' ? 'Đổi Mã' : 'Yêu Cầu'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'tiers' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Billing cycle toggle */}
          <View style={styles.cycleRow}>
            <TouchableOpacity
              style={[styles.cycleBtn, billingCycle === 'monthly' && styles.cycleBtnActive]}
              onPress={() => setBillingCycle('monthly')}
            >
              <Text style={[styles.cycleText, billingCycle === 'monthly' && styles.cycleTextActive]}>Hàng Tháng</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cycleBtn, billingCycle === 'yearly' && styles.cycleBtnActive]}
              onPress={() => setBillingCycle('yearly')}
            >
              <Text style={[styles.cycleText, billingCycle === 'yearly' && styles.cycleTextActive]}>
                Hàng Năm <Text style={styles.saleText}>-17%</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {loadingTiers ? (
            <ActivityIndicator size="large" color={Colors.light.gold} style={{ marginTop: 40 }} />
          ) : (
            tiers.map((t, i) => renderTierCard(t, i))
          )}

          {currentSub && (
            <View style={styles.subInfo}>
              <Text style={styles.subInfoTitle}>Gói hiện tại của bạn</Text>
              <Text style={styles.subInfoText}>
                {currentSub.tier} — Hết hạn: {currentSub.expiry ? new Date(currentSub.expiry).toLocaleDateString('vi-VN') : 'N/A'}
              </Text>
            </View>
          )}

          <View style={styles.linkRow}>
            <TouchableOpacity onPress={() => router.push('/subscription/history')}>
              <Text style={styles.linkText}>Lịch sử giao dịch →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {activeTab === 'redeem' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.redeemCard}>
            <Text style={styles.sectionTitle}>Nhập Mã Quà Tặng</Text>
            <TextInput
              style={styles.redeemInput}
              placeholder="Nhập mã quà tặng..."
              placeholderTextColor={Colors.light.textMuted}
              value={redeemCode}
              onChangeText={setRedeemCode}
              autoCapitalize="characters"
            />
            {redeemError ? <Text style={styles.errorMsg}>{redeemError}</Text> : null}
            <GoldButton title="Đổi Mã" onPress={handleRedeem} loading={redeemLoading} />
            {!!redeemResult && (
              <View style={styles.redeemResult}>
                <Ionicons name="gift" size={32} color={Colors.light.gold} />
                <Text style={styles.redeemResultTitle}>Đổi mã thành công!</Text>
                <Text style={styles.redeemResultText}>
                  {redeemResult.data?.tier?.name || redeemResult.tier} — Gói {redeemResult.data?.billingCycle || redeemResult.billingCycle}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {activeTab === 'request' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {!currentSub?.tier?.toLowerCase?.()?.includes('student pro') ? (
            <View style={styles.center}>
              <Ionicons name="lock-closed-outline" size={48} color={Colors.light.textMuted} />
              <Text style={styles.emptyText}>Tính năng này dành cho gói Student Pro</Text>
            </View>
          ) : (
            <>
              <View style={styles.redeemCard}>
                <Text style={styles.sectionTitle}>Yêu Cầu Bài Học Mới</Text>
                <TextInput
                  style={styles.redeemInput}
                  placeholder="Tiêu đề bài học"
                  placeholderTextColor={Colors.light.textMuted}
                  value={reqTitle}
                  onChangeText={setReqTitle}
                />
                <TextInput
                  style={[styles.redeemInput, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Mô tả chi tiết"
                  placeholderTextColor={Colors.light.textMuted}
                  value={reqDesc}
                  onChangeText={setReqDesc}
                  multiline
                />
                <TextInput
                  style={styles.redeemInput}
                  placeholder="Giai đoạn lịch sử (không bắt buộc)"
                  placeholderTextColor={Colors.light.textMuted}
                  value={reqPeriod}
                  onChangeText={setReqPeriod}
                />
                <GoldButton title="Gửi Yêu Cầu" onPress={handleRequest} loading={reqLoading} />
              </View>

              {loadingRequests ? (
                <ActivityIndicator size="small" color={Colors.light.gold} style={{ marginTop: 20 }} />
              ) : lessonRequests.length > 0 ? (
                <View style={styles.requestsSection}>
                  <Text style={styles.sectionTitle}>Yêu Cầu Của Bạn</Text>
                  {lessonRequests.map((r) => (
                    <View key={r._id} style={styles.requestCard}>
                      <Text style={styles.requestTitle}>{r.title}</Text>
                      <Text style={styles.requestDesc} numberOfLines={2}>{r.description}</Text>
                      <View style={styles.requestStatus}>
                        <Text style={styles.requestStatusText}>{r.status}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 40 },
  tabRow: { flexDirection: 'row', marginHorizontal: Spacing.md, marginTop: Spacing.sm, gap: 4 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
  },
  tabActive: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  tabText: { color: Colors.light.textMuted, fontSize: FontSizes.sm, fontWeight: '600' },
  tabTextActive: { color: Colors.light.backgroundDark },
  center: { alignItems: 'center', padding: 40 },
  emptyText: { color: Colors.light.textMuted, fontSize: FontSizes.md, marginTop: 12, textAlign: 'center' },
  cycleRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg, marginTop: Spacing.sm },
  cycleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
  },
  cycleBtnActive: { backgroundColor: Colors.light.gold + '33', borderColor: Colors.light.gold },
  cycleText: { color: Colors.light.textMuted, fontSize: FontSizes.sm },
  cycleTextActive: { color: Colors.light.gold, fontWeight: '700' },
  saleText: { color: Colors.light.success, fontSize: FontSizes.xs },
  tierCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  tierCardPopular: { borderColor: Colors.light.gold, borderWidth: 2 },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: Colors.light.gold,
    color: Colors.light.backgroundDark,
    fontSize: FontSizes.xs,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tierName: { color: Colors.light.textMain, fontSize: FontSizes.lg, fontWeight: '700', marginBottom: 4 },
  tierDescription: { color: Colors.light.textMuted, fontSize: FontSizes.sm, marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  tierPrice: { color: Colors.light.gold, fontSize: 28, fontWeight: '700' },
  priceUnit: { color: Colors.light.textMuted, fontSize: FontSizes.sm },
  featuresList: { gap: 8, marginBottom: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { color: Colors.light.textMain, fontSize: FontSizes.sm },
  currentBadge: {
    backgroundColor: Colors.light.successBg,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  currentBadgeText: { color: Colors.light.success, fontWeight: '700', fontSize: FontSizes.sm },
  subInfo: {
    backgroundColor: Colors.light.backgroundCardAlt,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  subInfoTitle: { color: Colors.light.gold, fontSize: FontSizes.sm, fontWeight: '700', marginBottom: 4 },
  subInfoText: { color: Colors.light.textMuted, fontSize: FontSizes.sm },
  linkRow: { alignItems: 'center', marginTop: Spacing.sm },
  linkText: { color: Colors.light.gold, fontSize: FontSizes.sm },
  redeemCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.lg,
    gap: 12,
    marginBottom: Spacing.md,
  },
  sectionTitle: { color: Colors.light.textMain, fontSize: FontSizes.md, fontWeight: '700' },
  redeemInput: {
    backgroundColor: Colors.light.backgroundCardAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    color: Colors.light.textMain,
    fontSize: FontSizes.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorMsg: { color: Colors.light.error, fontSize: FontSizes.xs },
  redeemResult: { alignItems: 'center', gap: 8, paddingTop: 12 },
  redeemResultTitle: { color: Colors.light.gold, fontSize: FontSizes.md, fontWeight: '700' },
  redeemResultText: { color: Colors.light.textMain, fontSize: FontSizes.sm },
  requestsSection: { marginTop: Spacing.md },
  requestCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  requestTitle: { color: Colors.light.textMain, fontSize: FontSizes.sm, fontWeight: '600' },
  requestDesc: { color: Colors.light.textMuted, fontSize: FontSizes.xs, marginTop: 4 },
  requestStatus: { marginTop: 6 },
  requestStatusText: { color: Colors.light.gold, fontSize: FontSizes.xs, fontWeight: '600' },
});
