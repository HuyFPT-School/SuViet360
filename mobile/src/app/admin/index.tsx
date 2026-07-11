import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PageBackground } from '@/components/PageBackground';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import HeaderBar from '@/components/ui/HeaderBar';
import GoldButton from '@/components/ui/GoldButton';
import AuthInput from '@/components/ui/AuthInput';
import { adminApi, type AdminSubscriptionStats, type Coupon, type AdminLesson } from '@/services/adminApi';
import { subscriptionApi } from '@/services/subscriptionApi';

const TABS = ['Dashboard', 'Users', 'Subscriptions', 'Coupons'] as const;
type Tab = (typeof TABS)[number];

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dashboard
  const [stats, setStats] = useState<AdminSubscriptionStats | null>(null);

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: '', discountType: 'percentage' as 'percentage' | 'fixed', discountValue: '', maxUses: '', description: '' });

  // Lessons
  const [lessons, setLessons] = useState<AdminLesson[]>([]);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) return;
    loadData();
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'Dashboard') {
        const s = await adminApi.getSubscriptionDashboardStats();
        setStats(s);
      } else if (activeTab === 'Users') {
        const res = await adminApi.getAvailableUsers();
        setUsers(res.users || res.data || []);
      } else if (activeTab === 'Subscriptions') {
        const l = await adminApi.getLessons();
        setLessons(l);
      } else if (activeTab === 'Coupons') {
        const c = await adminApi.getCoupons();
        setCoupons(c);
      }
    } catch {
      setError('Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await adminApi.updateUserRole(userId, role);
      Alert.alert('Thành công', 'Vai trò đã được cập nhật.');
      loadData();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật vai trò.');
    }
  };

  const handleToggleLock = async (userId: string) => {
    try {
      await adminApi.toggleUserLock(userId);
      Alert.alert('Thành công', 'Trạng thái khóa đã thay đổi.');
      loadData();
    } catch {
      Alert.alert('Lỗi', 'Không thể thay đổi trạng thái khóa.');
    }
  };

  const handleViewTransactions = async (userId: string) => {
    try {
      const res = await adminApi.getUserTransactions(userId);
      setUserTransactions(res.data || res.transactions || []);
      setSelectedUser(users.find((u) => u._id === userId));
    } catch {
      Alert.alert('Lỗi', 'Không thể tải giao dịch.');
    }
  };

  const handleCreateCoupon = async () => {
    if (!couponForm.code.trim() || !couponForm.discountValue) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã và giá trị giảm giá.');
      return;
    }
    try {
      await adminApi.createCoupon({
        code: couponForm.code.trim().toUpperCase(),
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : undefined,
        description: couponForm.description,
      });
      Alert.alert('Thành công', 'Mã giảm giá đã được tạo.');
      setShowCreateCoupon(false);
      setCouponForm({ code: '', discountType: 'percentage', discountValue: '', maxUses: '', description: '' });
      loadData();
    } catch {
      Alert.alert('Lỗi', 'Không thể tạo mã giảm giá.');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    Alert.alert('Xác nhận', 'Xóa mã giảm giá này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        await adminApi.deleteCoupon(id);
        loadData();
      }},
    ]);
  };

  const handleDeleteLesson = async (id: string) => {
    Alert.alert('Xác nhận', 'Xóa bài học này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        await adminApi.deleteLesson(id);
        loadData();
      }},
    ]);
  };

  // Role guard
  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    return (
      <PageBackground style={styles.container}>
        <HeaderBar title="Admin" showBack />
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={Colors.light.textMuted} />
          <Text style={styles.errorText}>Bạn không có quyền truy cập.</Text>
        </View>
      </PageBackground>
    );
  }

  const formatMoney = (n?: number | null) => (n ?? 0).toLocaleString('vi-VN') + '₫';

  return (
    <PageBackground style={styles.container}>
      <HeaderBar title="Quản Trị" showBack />

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <GoldButton title="Thử Lại" onPress={loadData} style={{ marginTop: 12 }} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Dashboard Tab */}
          {activeTab === 'Dashboard' && stats && (
            <View style={styles.dashboard}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.totalActive}</Text>
                <Text style={styles.statLabel}>Gói đang hoạt động</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatMoney(stats.totalRevenue)}</Text>
                <Text style={styles.statLabel}>Tổng doanh thu</Text>
              </View>
              {stats.byTier?.map((t: any) => (
                <View key={t.name} style={styles.tierStat}>
                  <Text style={styles.tierStatName}>{t.name}</Text>
                  <Text style={styles.tierStatValue}>{t.count} gói — {formatMoney(t.revenue)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Users Tab */}
          {activeTab === 'Users' && (
            <>
              {selectedUser && (
                <Modal visible animationType="slide" transparent>
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Giao dịch của {selectedUser.name}</Text>
                        <TouchableOpacity onPress={() => setSelectedUser(null)}>
                          <Ionicons name="close" size={24} color={Colors.light.text} />
                        </TouchableOpacity>
                      </View>
                      <FlatList
                        data={userTransactions}
                        keyExtractor={(item: any) => item._id}
                        renderItem={({ item }) => (
                          <View style={styles.txItem}>
                            <Text style={styles.txText}>{item.tierId?.name || 'N/A'} — {formatMoney(item.amount)}</Text>
                            <Text style={styles.txDate}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
                          </View>
                        )}
                        style={{ maxHeight: 300 }}
                      />
                    </View>
                  </View>
                </Modal>
              )}
              {users.map((u: any) => (
                <View key={u._id} style={styles.userCard}>
                  <View>
                    <Text style={styles.userName}>{u.name}</Text>
                    <Text style={styles.userEmail}>{u.email}</Text>
                    <Text style={styles.userRole}>Vai trò: {u.role}</Text>
                  </View>
                  <View style={styles.userActions}>
                    <TouchableOpacity onPress={() => handleViewTransactions(u._id)} style={styles.smallBtn}>
                      <Ionicons name="receipt-outline" size={16} color={Colors.light.gold} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleToggleLock(u._id)} style={styles.smallBtn}>
                      <Ionicons name={u.isLocked ? 'lock-closed' : 'lock-open-outline'} size={16} color={u.isLocked ? Colors.light.error : Colors.light.success} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      Alert.alert('Đổi vai trò', 'Chọn vai trò mới:', [
                        { text: 'Admin', onPress: () => handleUpdateRole(u._id, 'admin') },
                        { text: 'Staff', onPress: () => handleUpdateRole(u._id, 'staff') },
                        { text: 'Teacher', onPress: () => handleUpdateRole(u._id, 'teacher') },
                        { text: 'User', onPress: () => handleUpdateRole(u._id, 'user') },
                        { text: 'Hủy', style: 'cancel' },
                      ]);
                    }} style={styles.smallBtn}>
                      <Ionicons name="swap-horizontal-outline" size={16} color={Colors.light.gold} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'Subscriptions' && (
            <>
              {lessons.map((l) => (
                <View key={l._id} style={styles.lessonCard}>
                  <Text style={styles.lessonTitle}>{l.title}</Text>
                  <Text style={styles.lessonDate}>{new Date(l.createdAt).toLocaleDateString('vi-VN')}</Text>
                  <TouchableOpacity onPress={() => handleDeleteLesson(l._id)} style={{ alignSelf: 'flex-end' }}>
                    <Ionicons name="trash-outline" size={18} color={Colors.light.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {/* Coupons Tab */}
          {activeTab === 'Coupons' && (
            <>
              <GoldButton title="Tạo Mã Giảm Giá" onPress={() => setShowCreateCoupon(true)} style={{ marginBottom: 12 }} />

              <Modal visible={showCreateCoupon} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Tạo Mã Giảm Giá</Text>
                      <TouchableOpacity onPress={() => setShowCreateCoupon(false)}>
                        <Ionicons name="close" size={24} color={Colors.light.text} />
                      </TouchableOpacity>
                    </View>
                    <AuthInput label="Mã code" placeholder="Mã code (VD: SALE20)" value={couponForm.code} onChangeText={(t: string) => setCouponForm((p) => ({ ...p, code: t }))} />
                    <View style={styles.couponTypeRow}>
                      <TouchableOpacity style={[styles.couponTypeBtn, couponForm.discountType === 'percentage' && styles.couponTypeBtnActive]} onPress={() => setCouponForm((p) => ({ ...p, discountType: 'percentage' as const }))}>
                        <Text style={styles.couponTypeText}>%</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.couponTypeBtn, couponForm.discountType === 'fixed' && styles.couponTypeBtnActive]} onPress={() => setCouponForm((p) => ({ ...p, discountType: 'fixed' as const }))}>
                        <Text style={styles.couponTypeText}>₫</Text>
                      </TouchableOpacity>
                    </View>
                    <AuthInput label="Giá trị giảm" placeholder="Giá trị giảm" value={couponForm.discountValue} onChangeText={(t: string) => setCouponForm((p) => ({ ...p, discountValue: t }))} keyboardType="numeric" />
                    <AuthInput label="Số lần dùng" placeholder="Số lần dùng tối đa (bỏ trống = không giới hạn)" value={couponForm.maxUses} onChangeText={(t: string) => setCouponForm((p) => ({ ...p, maxUses: t }))} keyboardType="numeric" />
                    <AuthInput label="Mô tả" placeholder="Mô tả" value={couponForm.description} onChangeText={(t: string) => setCouponForm((p) => ({ ...p, description: t }))} />
                    <GoldButton title="Tạo" onPress={handleCreateCoupon} />
                  </View>
                </View>
              </Modal>

              {coupons.map((c) => (
                <View key={c._id} style={styles.couponCard}>
                  <View>
                    <Text style={styles.couponCode}>{c.code}</Text>
                    <Text style={styles.couponDetail}>
                      {c.discountType === 'percentage' ? `${c.discountValue}%` : formatMoney(c.discountValue)} — {c.currentUses}/{c.maxUses || '∞'} lượt dùng
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteCoupon(c._id)}>
                    <Ionicons name="trash-outline" size={18} color={Colors.light.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: Colors.light.textMuted, fontSize: FontSizes.md, marginTop: 12, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 40 },
  tabRow: { flexDirection: 'row', marginHorizontal: Spacing.md, marginVertical: Spacing.sm, gap: 4 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
  },
  tabActive: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  tabText: { color: Colors.light.textMuted, fontSize: FontSizes.xs, fontWeight: '600' },
  tabTextActive: { color: Colors.light.backgroundDark },
  dashboard: { gap: 12 },
  statCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statValue: { color: Colors.light.gold, fontSize: 28, fontWeight: '700' },
  statLabel: { color: Colors.light.textMuted, fontSize: FontSizes.sm, marginTop: 4 },
  tierStat: {
    backgroundColor: Colors.light.backgroundCardAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  tierStatName: { color: Colors.light.textMain, fontWeight: '600', fontSize: FontSizes.sm },
  tierStatValue: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  userName: { color: Colors.light.textMain, fontSize: FontSizes.sm, fontWeight: '600' },
  userEmail: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
  userRole: { color: Colors.light.textDim, fontSize: FontSizes.xs },
  userActions: { flexDirection: 'row', gap: 8 },
  smallBtn: { padding: 6 },
  lessonCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  lessonTitle: { color: Colors.light.textMain, fontSize: FontSizes.sm, fontWeight: '600' },
  lessonDate: { color: Colors.light.textDim, fontSize: FontSizes.xs },
  couponCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  couponCode: { color: Colors.light.gold, fontSize: FontSizes.sm, fontWeight: '700', fontFamily: 'monospace' },
  couponDetail: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
  couponTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  couponTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
  },
  couponTypeBtnActive: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  couponTypeText: { color: Colors.light.textMuted, fontWeight: '700', fontSize: FontSizes.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.light.backgroundCardAlt, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { color: Colors.light.textMain, fontSize: FontSizes.md, fontWeight: '700', flex: 1 },
  txItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.light.panelBorder },
  txText: { color: Colors.light.textMain, fontSize: FontSizes.sm },
  txDate: { color: Colors.light.textDim, fontSize: FontSizes.xs },
});

