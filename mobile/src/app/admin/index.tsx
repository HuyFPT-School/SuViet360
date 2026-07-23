import React, { useEffect, useMemo, useState } from 'react';
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
import AdminGiftCodesTab from '@/components/admin/AdminGiftCodesTab';
import AdminLessonRequestsTab from '@/components/admin/AdminLessonRequestsTab';

const TABS = ['Tổng quan', 'Người dùng', 'Gói VIP', 'Mã giảm giá', 'Mã quà tặng', 'Yêu cầu bài học'] as const;
type Tab = (typeof TABS)[number];

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('Tổng quan');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dashboard
  const [stats, setStats] = useState<AdminSubscriptionStats | null>(null);
  const [dashLessons, setDashLessons] = useState<any[]>([]);
  const [dashUserList, setDashUserList] = useState<any[]>([]);

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [rolePickerUser, setRolePickerUser] = useState<any>(null);

  // Gói VIP
  const [tiers, setTiers] = useState<any[]>([]);
  const [vipSubs, setVipSubs] = useState<any[]>([]);
  const [vipTransactions, setVipTransactions] = useState<any[]>([]);

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '', discountType: 'percentage' as 'percentage' | 'fixed', discountValue: '',
    maxUses: '', minPurchaseAmount: '', applicableTiers: [] as string[], endDate: '', description: '',
  });

  // Lessons
  const [lessons, setLessons] = useState<AdminLesson[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    loadData();
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'Tổng quan') {
        const [s, lessonsData, usersRes] = await Promise.all([
          adminApi.getSubscriptionDashboardStats(),
          adminApi.getLessons(),
          adminApi.getAvailableUsers(),
        ]);
        setStats(s);
        setDashLessons(lessonsData || []);
        setDashUserList((usersRes.users || usersRes.data || []) as any[]);
      } else if (activeTab === 'Người dùng') {
        const res = await adminApi.getAvailableUsers();
        setUsers(res.users || res.data || []);
      } else if (activeTab === 'Gói VIP') {
        const [s, tierList] = await Promise.all([
          adminApi.getSubscriptionDashboardStats(),
          subscriptionApi.getTiers(),
        ]);
        setStats(s);
        setTiers(Array.isArray(tierList) ? tierList : ((tierList as any).data || []));
        setVipTransactions((s as any).recentTransactions || []);
        setVipSubs((s as any).subscriptions || []);
      } else if (activeTab === 'Mã giảm giá') {
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
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể cập nhật vai trò.';
      Alert.alert('Lỗi', msg);
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
    setSelectedUser(users.find((u) => u.id === userId));
    setLoadingUserDetail(true);
    try {
      const res = await adminApi.getUserTransactions(userId);
      const data = res.data || res;
      setUserTransactions(data.transactions || []);
      setUserSubscriptions(data.subscriptions || []);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải giao dịch.');
    } finally {
      setLoadingUserDetail(false);
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
        maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : -1,
        minPurchaseAmount: Number(couponForm.minPurchaseAmount) || 0,
        applicableTiers: couponForm.applicableTiers,
        endDate: couponForm.endDate ? new Date(couponForm.endDate).toISOString() : undefined,
        description: couponForm.description,
      });
      Alert.alert('Thành công', 'Mã giảm giá đã được tạo.');
      setShowCreateCoupon(false);
      setCouponForm({ code: '', discountType: 'percentage', discountValue: '', maxUses: '', minPurchaseAmount: '', applicableTiers: [], endDate: '', description: '' });
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
  if (!user || user.role !== 'admin') {
    return (
      <PageBackground style={styles.container}>
        <HeaderBar title="Quản trị" showBack />
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={Colors.light.textMuted} />
          <Text style={styles.errorText}>Bạn không có quyền truy cập.</Text>
        </View>
      </PageBackground>
    );
  }

  const formatMoney = (n?: number | null) => (n ?? 0).toLocaleString('vi-VN') + '₫';  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

  const handleUpdateTierPrice = async (id: string, priceMonthly: number, priceYearly: number) => {
    try {
      await adminApi.updateTierPrice(id, priceMonthly, priceYearly);
      Alert.alert('Thành công', 'Đã cập nhật giá gói.');
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật giá.');
    }
  };  const dashboardStats = useMemo(() => {
    const lessons = dashLessons || [];
    const users = dashUserList || [];
    const base = [
      { label: 'Tổng bài học', value: lessons.length },
      { label: 'Staff hiện có', value: users.filter((u: any) => u.role === 'staff').length },
      { label: 'Teacher hiện có', value: users.filter((u: any) => u.role === 'teacher').length },
      { label: 'Admin hiện có', value: users.filter((u: any) => u.role === 'admin').length },
    ];
    if (stats) {
      return [
        ...base,
        { label: 'Tổng doanh thu', value: formatMoney(stats.stats.totalRevenue) },
        { label: 'Gói VIP đang chạy', value: stats.stats.totalActiveSubscriptions },
        { label: 'Số lượng giao dịch', value: stats.stats.totalTransactions },
        { label: 'Tổng số người dùng', value: stats.stats.totalUsers },
      ];
    }
    return base;
  }, [dashLessons, dashUserList, stats]);
  return (
    <PageBackground style={styles.container}>
      <HeaderBar title="Quản trị" showBack />

      {/* Tabs — scrollable */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
          {activeTab === 'Tổng quan' && (
            <View style={styles.dashboard}>
              {/* Stat cards grid — matches client admin-stat-grid */}
              <View style={styles.statGrid}>
                {dashboardStats.map((stat) => (
                  <View key={stat.label} style={styles.statCard}>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <Text style={styles.statValue}>{stat.value}</Text>
                  </View>
                ))}
              </View>

              {/* Revenue Bar Chart */}
              {stats?.monthlyRevenue && stats.monthlyRevenue.length > 0 && (
                <View style={styles.chartPanel}>
                  <View style={styles.chartHeader}>
                    <Text style={styles.chartTitle}>Doanh thu đăng ký thành viên (6 tháng qua)</Text>
                    <Text style={styles.chartTotal}>Tổng cộng: {formatMoney(stats.stats.totalRevenue)}</Text>
                  </View>
                  <View style={styles.chartContainer}>
                    {stats.monthlyRevenue.map((m: any, i: number) => {
                      const maxRev = Math.max(...stats.monthlyRevenue!.map((x: any) => x.revenue || 0), 1);
                      const pct = Math.round(((m.revenue || 0) / maxRev) * 100);
                      return (
                        <View key={i} style={styles.barCol}>
                          <Text style={styles.barTooltip}>{m.revenue > 0 ? formatMoney(m.revenue) : ''}</Text>
                          <View style={[styles.bar, { height: Math.max(2, pct * 0.7) + '%' as any, opacity: m.revenue > 0 ? 1 : 0.15 }]} />
                          <Text style={styles.barMonth}>{m.month}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Users Tab */}
          {activeTab === 'Người dùng' && (
            <>
              {/* Search */}
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color="#6b4f14" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm user..."
                  placeholderTextColor="#6b4f14"
                  value={userQuery}
                  onChangeText={setUserQuery}
                />
                <Text style={styles.searchCount}>{users.length} mục</Text>
              </View>

              {/* User Detail Modal */}
              {selectedUser && (
                <Modal visible animationType="slide" transparent>
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <View>
                          <Text style={styles.modalTitle}>{selectedUser.name}</Text>
                          <Text style={styles.modalSubtitle}>{selectedUser.email}</Text>
                        </View>
                        <TouchableOpacity onPress={() => { setSelectedUser(null); setUserTransactions([]); setUserSubscriptions([]); }}>
                          <Ionicons name="close" size={24} color="#8c6a34" />
                        </TouchableOpacity>
                      </View>
                      {loadingUserDetail ? (
                        <ActivityIndicator size="large" color={Colors.light.gold} style={{ padding: 24 }} />
                      ) : (
                        <ScrollView style={{ maxHeight: 400 }}>
                          {/* Subscriptions */}
                          <Text style={styles.detailSectionTitle}>Gói VIP đã kích hoạt</Text>
                          {userSubscriptions.length === 0 ? (
                            <Text style={styles.emptyText}>Chưa kích hoạt gói VIP nào.</Text>
                          ) : userSubscriptions.map((sub: any) => (
                            <View key={sub._id} style={styles.detailRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.detailLabel}>{sub.tierId?.name || 'VIP'} · {sub.billingCycle === 'monthly' ? 'Hàng tháng' : 'Hàng năm'}</Text>
                                <Text style={styles.detailValue}>{formatDate(sub.startDate)} → {formatDate(sub.endDate)}</Text>
                              </View>
                              <View style={[styles.statusBadge, { backgroundColor: sub.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                                <Text style={{ color: sub.status === 'Active' ? '#34d399' : '#f87171', fontSize: 10, fontWeight: '700' }}>
                                  {sub.status === 'Active' ? 'Hoạt động' : 'Hết hạn'}
                                </Text>
                              </View>
                            </View>
                          ))}
                          {/* Transactions */}
                          <Text style={[styles.detailSectionTitle, { marginTop: 16 }]}>Lịch sử giao dịch</Text>
                          {userTransactions.length === 0 ? (
                            <Text style={styles.emptyText}>Chưa có giao dịch nào.</Text>
                          ) : userTransactions.map((tx: any) => (
                            <View key={tx._id} style={styles.detailRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.detailLabel}>{tx.tierId?.name || 'VIP'} · {formatMoney(tx.amount)}</Text>
                                <Text style={styles.detailValue}>{tx.paymentMethod || 'N/A'} · {new Date(tx.createdAt).toLocaleDateString('vi-VN')}</Text>
                              </View>
                            </View>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  </View>
                </Modal>
              )}

              {/* User list */}
              {users.filter((u: any) => !userQuery || u.name?.toLowerCase().includes(userQuery.toLowerCase()) || u.email?.toLowerCase().includes(userQuery.toLowerCase())).map((u: any) => (
                <TouchableOpacity key={u.id} style={styles.userCard} onPress={() => handleViewTransactions(u.id)} activeOpacity={0.7}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{u.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{u.name}</Text>
                    <Text style={styles.userEmail}>{u.email}</Text>
                  </View>
                  {/* Role — tappable dropdown */}
                  <TouchableOpacity
                    style={styles.userRoleBadge}
                    onPress={() => setRolePickerUser(u)}
                  >
                    <Text style={styles.userRoleText}>{u.role} ▾</Text>
                  </TouchableOpacity>
                  <View style={[styles.statusDot, { backgroundColor: u.isLocked ? '#f87171' : '#34d399' }]} />
                  <TouchableOpacity onPress={() => handleToggleLock(u.id)} style={styles.smallBtn}>
                    <Ionicons name={u.isLocked ? 'lock-closed' : 'lock-open-outline'} size={16} color={u.isLocked ? '#f87171' : '#34d399'} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Role Picker Modal */}
          <Modal visible={!!rolePickerUser} transparent animationType="fade">
            <TouchableOpacity style={styles.roleOverlay} activeOpacity={1} onPress={() => setRolePickerUser(null)}>
              <View style={styles.rolePicker}>
                <Text style={styles.rolePickerTitle}>{rolePickerUser?.name}</Text>
                <Text style={styles.rolePickerSub}>Vai trò hiện tại: {rolePickerUser?.role}</Text>
                {['admin', 'staff', 'teacher', 'student'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleOption, rolePickerUser?.role === role && styles.roleOptionActive]}
                    onPress={() => {
                      if (rolePickerUser) handleUpdateRole(rolePickerUser.id, role);
                      setRolePickerUser(null);
                    }}
                  >
                    <Text style={[styles.roleOptionText, rolePickerUser?.role === role && styles.roleOptionTextActive]}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Text>
                    {rolePickerUser?.role === role && <Ionicons name="checkmark" size={16} color="#f0ddb7" />}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.roleCloseBtn} onPress={() => setRolePickerUser(null)}>
                  <Text style={styles.roleCloseText}>✕ Đóng</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Gói VIP Tab */}
          {activeTab === 'Gói VIP' && (
            <>
              {/* Tier Price Management */}
              <View style={styles.sectionPanel}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderTitle}>Định cấu hình giá gói VIP</Text>
                  <Text style={styles.sectionCount}>{tiers.filter((t: any) => t.slug !== 'free').length} gói</Text>
                </View>
                {tiers.filter((t: any) => t.slug !== 'free').map((tier: any) => (
                  <View key={tier._id} style={styles.tierCard}>
                    <Text style={styles.tierCardName}>{tier.name}</Text>
                    <View style={styles.tierPriceRow}>
                      <View style={styles.tierPriceCol}>
                        <Text style={styles.tierPriceLabel}>Hàng tháng</Text>
                        <View style={styles.tierPriceInput}>
                          <TextInput
                            style={styles.priceInput}
                            value={String(tier.priceMonthly || 0)}
                            keyboardType="numeric"
                            onChangeText={(val) => {
                              const newTiers = tiers.map((t: any) =>
                                t._id === tier._id ? { ...t, priceMonthly: Number(val) || 0 } : t
                              );
                              setTiers(newTiers);
                            }}
                          />
                          <Text style={styles.priceUnit}>đ</Text>
                        </View>
                      </View>
                      <View style={styles.tierPriceCol}>
                        <Text style={styles.tierPriceLabel}>Hàng năm</Text>
                        <View style={styles.tierPriceInput}>
                          <TextInput
                            style={styles.priceInput}
                            value={String(tier.priceYearly || 0)}
                            keyboardType="numeric"
                            onChangeText={(val) => {
                              const newTiers = tiers.map((t: any) =>
                                t._id === tier._id ? { ...t, priceYearly: Number(val) || 0 } : t
                              );
                              setTiers(newTiers);
                            }}
                          />
                          <Text style={styles.priceUnit}>đ</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={() => handleUpdateTierPrice(tier._id, tier.priceMonthly, tier.priceYearly)}
                      >
                        <Ionicons name="checkmark" size={16} color="#f0ddb7" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* Active VIP List */}
              <View style={styles.sectionPanel}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderTitle}>Danh sách kích hoạt VIP</Text>
                  <Text style={styles.sectionCount}>{vipSubs.length} tài khoản</Text>
                </View>
                {vipSubs.length === 0 ? (
                  <Text style={styles.emptyText}>Không có dữ liệu đăng ký VIP.</Text>
                ) : vipSubs.map((sub: any) => {
                  const isExpired = sub.status === 'Expired' || new Date(sub.endDate) < new Date();
                  return (
                    <View key={sub._id} style={styles.vipCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vipName}>{sub.userId?.name || 'Người dùng'}</Text>
                        <Text style={styles.vipEmail}>{sub.userId?.email}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vipTier}>{sub.tierId?.name || 'VIP'}</Text>
                        <Text style={styles.vipCycle}>{sub.billingCycle === 'monthly' ? 'Hàng tháng' : 'Hàng năm'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vipDate}>{formatDate(sub.startDate)}</Text>
                        <Text style={[styles.vipDate, isExpired && { color: '#f87171' }]}>{formatDate(sub.endDate)}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: isExpired ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)' }]}>
                        <Text style={{ color: isExpired ? '#f87171' : '#34d399', fontSize: 10, fontWeight: '700' }}>
                          {isExpired ? 'Hết hạn' : 'Hoạt động'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Recent Transactions */}
              <View style={styles.sectionPanel}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderTitle}>Lịch sử giao dịch gần đây</Text>
                  <Text style={styles.sectionCount}>{vipTransactions.length} mục</Text>
                </View>
                {vipTransactions.length === 0 ? (
                  <Text style={styles.emptyText}>Chưa có giao dịch nào.</Text>
                ) : vipTransactions.map((tx: any) => (
                  <View key={tx._id} style={styles.vipCard}>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.txId} numberOfLines={1}>{tx.transactionId}</Text>
                      <Text style={styles.vipEmail}>Mua bởi: {tx.buyerId?.name || 'N/A'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vipTier}>{tx.tierId?.name || 'VIP'}</Text>
                      {tx.couponCode ? <Text style={styles.vipCycle}>Coupon: {tx.couponCode}</Text> : null}
                    </View>
                    <Text style={styles.txAmount}>{formatMoney(tx.amount)}</Text>
                    <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString('vi-VN')}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Coupons Tab */}
          {activeTab === 'Mã giảm giá' && (
            <>
              <GoldButton title="Tạo Mã Giảm Giá" onPress={async () => {
                if (tiers.length === 0) {
                  try {
                    const tierList = await subscriptionApi.getTiers();
                    setTiers(Array.isArray(tierList) ? tierList : ((tierList as any).data || []));
                  } catch { /* ignore */ }
                }
                setShowCreateCoupon(true);
              }} style={{ marginBottom: 12 }} />

              <Modal visible={showCreateCoupon} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Tạo Mã Giảm Giá</Text>
                      <TouchableOpacity onPress={() => setShowCreateCoupon(false)}>
                        <Ionicons name="close" size={24} color={Colors.light.text} />
                      </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                    <AuthInput label="Mã coupon" placeholder="VD: SALE20" value={couponForm.code} onChangeText={(t: string) => setCouponForm((p) => ({ ...p, code: t }))} autoCapitalize="characters" />
                    <View style={styles.couponTypeRow}>
                      <TouchableOpacity style={[styles.couponTypeBtn, couponForm.discountType === 'percentage' && styles.couponTypeBtnActive]} onPress={() => setCouponForm((p) => ({ ...p, discountType: 'percentage' }))}>
                        <Text style={styles.couponTypeText}>%</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.couponTypeBtn, couponForm.discountType === 'fixed' && styles.couponTypeBtnActive]} onPress={() => setCouponForm((p) => ({ ...p, discountType: 'fixed' }))}>
                        <Text style={styles.couponTypeText}>₫</Text>
                      </TouchableOpacity>
                    </View>
                    <AuthInput label="Giá trị giảm" placeholder="Giá trị giảm" value={couponForm.discountValue} onChangeText={(t: string) => setCouponForm((p) => ({ ...p, discountValue: t }))} keyboardType="numeric" />
                    <AuthInput label="Lượt dùng tối đa" placeholder="-1 nếu không giới hạn" value={couponForm.maxUses} onChangeText={(t: string) => setCouponForm((p) => ({ ...p, maxUses: t }))} keyboardType="numeric" />
                    <AuthInput label="Chi tiêu tối thiểu (đ)" placeholder="0 nếu không yêu cầu" value={couponForm.minPurchaseAmount} onChangeText={(t: string) => setCouponForm((p) => ({ ...p, minPurchaseAmount: t }))} keyboardType="numeric" />
                    <AuthInput label="Ngày hết hạn" placeholder="YYYY-MM-DD" value={couponForm.endDate} onChangeText={(t: string) => setCouponForm((p) => ({ ...p, endDate: t }))} />
                    <Text style={styles.couponSectionLabel}>Áp dụng cho gói VIP (bỏ trống = tất cả)</Text>
                    <View style={styles.tierCheckGrid}>
                      {tiers.filter((t: any) => t.slug !== 'free').map((tier: any) => (
                        <TouchableOpacity
                          key={tier._id}
                          style={[styles.tierCheckItem, couponForm.applicableTiers.includes(tier._id) && styles.tierCheckItemActive]}
                          onPress={() => setCouponForm((p) => ({
                            ...p,
                            applicableTiers: p.applicableTiers.includes(tier._id)
                              ? p.applicableTiers.filter((id) => id !== tier._id)
                              : [...p.applicableTiers, tier._id],
                          }))}
                        >
                          <Ionicons name={couponForm.applicableTiers.includes(tier._id) ? 'checkbox' : 'square-outline'} size={16} color={couponForm.applicableTiers.includes(tier._id) ? '#e5b869' : '#6b4f14'} />
                          <Text style={[styles.tierCheckText, couponForm.applicableTiers.includes(tier._id) && { color: '#e5b869' }]}>{tier.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <AuthInput label="Mô tả" placeholder="VD: Giảm giá hè 10%" value={couponForm.description} onChangeText={(t: string) => setCouponForm((p) => ({ ...p, description: t }))} />
                    <GoldButton title="Tạo" onPress={handleCreateCoupon} />
                    </ScrollView>
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

          {/* Gift Codes Tab */}
          {activeTab === 'Mã quà tặng' && (
            <AdminGiftCodesTab tiers={tiers} />
          )}

          {/* Lesson Requests Tab */}
          {activeTab === 'Yêu cầu bài học' && (
            <AdminLessonRequestsTab />
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
  tabScroll: { maxHeight: 44, backgroundColor: '#0d0805', borderBottomWidth: 1, borderBottomColor: 'rgba(201, 161, 90, 0.2)' },
  tabScrollContent: { flexDirection: 'row', paddingHorizontal: 8, gap: 4, alignItems: 'center' },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    backgroundColor: '#1e1508',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.2)',
  },
  tabActive: { backgroundColor: '#4a2c1a', borderColor: '#c9a15a' },
  tabText: { color: '#6b4f14', fontSize: FontSizes.xs, fontWeight: '600' },
  tabTextActive: { color: '#f0ddb7', fontWeight: '700' },
  dashboard: { gap: 14 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: {
    width: '48%',
    backgroundColor: '#1e1508',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.3)',
    padding: 18,
    gap: 8,
  },
  statLabel: { color: '#a08040', fontSize: FontSizes.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { color: '#f0ddb7', fontSize: 22, fontWeight: '700' },
  // Chart
  chartPanel: {
    backgroundColor: '#1e1508',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.3)',
    padding: 18,
    marginTop: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 161, 90, 0.15)',
    paddingBottom: 10,
  },
  chartTitle: { color: '#f0ddb7', fontSize: FontSizes.sm, fontWeight: '700', flex: 1 },
  chartTotal: { color: '#a08040', fontSize: FontSizes.xs, fontWeight: '600' },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 180,
    paddingHorizontal: 4,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', backgroundColor: '#5c3d2e', borderRadius: 4 },
  barTooltip: { color: '#f0ddb7', fontSize: 8, marginBottom: 4, fontWeight: '600' },
  barMonth: { color: '#6b4f14', fontSize: 9, marginTop: 8 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1e1508',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.2)',
    padding: 12,
    marginBottom: 6,
  },
  userAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#4a2c1a',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(201, 161, 90, 0.3)',
  },
  userAvatarText: { color: '#f0ddb7', fontSize: FontSizes.sm, fontWeight: '700' },
  userName: { color: '#f0ddb7', fontSize: FontSizes.sm, fontWeight: '600' },
  userEmail: { color: '#8c6a34', fontSize: FontSizes.xs },
  userRoleBadge: {
    backgroundColor: 'rgba(201, 161, 90, 0.15)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: 'rgba(201, 161, 90, 0.3)',
  },
  userRoleText: { color: '#c9a15a', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  // Role Picker Modal
  roleOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  rolePicker: {
    backgroundColor: '#1e1508', borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: 'rgba(201, 161, 90, 0.3)',
    padding: 20, width: 260,
  },
  rolePickerTitle: { color: '#f0ddb7', fontSize: FontSizes.sm, fontWeight: '700', textAlign: 'center' },
  rolePickerSub: { color: '#6b4f14', fontSize: FontSizes.xs, textAlign: 'center', marginBottom: 16, marginTop: 4 },
  roleOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: 'transparent', marginBottom: 4,
  },
  roleOptionActive: { backgroundColor: 'rgba(201, 161, 90, 0.1)', borderColor: 'rgba(201, 161, 90, 0.3)' },
  roleOptionText: { color: '#8c6a34', fontSize: FontSizes.sm, fontWeight: '600', textTransform: 'uppercase' },
  roleOptionTextActive: { color: '#f0ddb7' },
  roleCloseBtn: { marginTop: 12, paddingVertical: 8, alignItems: 'center' },
  roleCloseText: { color: '#6b4f14', fontSize: FontSizes.xs, fontWeight: '600' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  userActions: { flexDirection: 'row', gap: 4 },
  smallBtn: { padding: 4 },
  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1e1508', borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: 'rgba(201, 161, 90, 0.2)',
    paddingHorizontal: 12, marginBottom: 10,
  },
  searchInput: { flex: 1, color: '#f0ddb7', fontSize: FontSizes.sm, paddingVertical: 10 },
  searchCount: { color: '#6b4f14', fontSize: FontSizes.xs },
  // Section Panel
  sectionPanel: {
    backgroundColor: '#1e1508',
    borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: 'rgba(201, 161, 90, 0.2)',
    padding: 16, marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(201, 161, 90, 0.1)',
  },
  sectionHeaderTitle: { color: '#f0ddb7', fontSize: FontSizes.sm, fontWeight: '700' },
  sectionCount: { color: '#6b4f14', fontSize: FontSizes.xs, fontWeight: '600' },
  // Tier
  tierCard: {
    borderBottomWidth: 1, borderBottomColor: 'rgba(201, 161, 90, 0.1)',
    paddingVertical: 10,
  },
  tierCardName: { color: '#e5b869', fontSize: FontSizes.sm, fontWeight: '700', marginBottom: 6 },
  tierPriceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  tierPriceCol: { flex: 1 },
  tierPriceLabel: { color: '#6b4f14', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 },
  tierPriceInput: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceInput: {
    flex: 1, backgroundColor: '#0d0805', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: 'rgba(201, 161, 90, 0.2)',
    color: '#f0ddb7', fontSize: FontSizes.sm, paddingHorizontal: 10, paddingVertical: 6,
    fontFamily: 'monospace',
  },
  priceUnit: { color: '#6b4f14', fontSize: FontSizes.xs },
  saveBtn: {
    backgroundColor: '#4a2c1a', borderRadius: BorderRadius.md, padding: 8,
    borderWidth: 1, borderColor: 'rgba(201, 161, 90, 0.3)',
  },
  // VIP Cards
  vipCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 161, 90, 0.08)',
  },
  vipName: { color: '#f0ddb7', fontSize: FontSizes.xs, fontWeight: '600' },
  vipEmail: { color: '#6b4f14', fontSize: 10 },
  vipTier: { color: '#e5b869', fontSize: FontSizes.xs, fontWeight: '600' },
  vipCycle: { color: '#8c6a34', fontSize: 9, textTransform: 'uppercase' },
  vipDate: { color: '#8c6a34', fontSize: 10, fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  txId: { color: '#e5b869', fontSize: 10, fontFamily: 'monospace' },
  txAmount: { color: '#34d399', fontSize: FontSizes.xs, fontWeight: '700', fontFamily: 'monospace' },
  txDate: { color: '#6b4f14', fontSize: 10 },
  // Detail Modal
  detailSectionTitle: { color: '#e5b869', fontSize: FontSizes.xs, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 161, 90, 0.08)',
  },
  detailLabel: { color: '#f0ddb7', fontSize: FontSizes.xs, fontWeight: '600' },
  detailValue: { color: '#6b4f14', fontSize: 10 },
  emptyText: { color: '#6b4f14', fontSize: FontSizes.xs, textAlign: 'center', padding: 16, fontStyle: 'italic' },
  lessonCard: {
    backgroundColor: '#1e1508',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.2)',
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  lessonTitle: { color: '#f0ddb7', fontSize: FontSizes.sm, fontWeight: '600' },
  lessonDate: { color: '#6b4f14', fontSize: FontSizes.xs },
  couponCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e1508',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.2)',
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  couponCode: { color: '#e5b869', fontSize: FontSizes.sm, fontWeight: '700', fontFamily: 'monospace' },
  couponDetail: { color: '#8c6a34', fontSize: FontSizes.xs },
  couponTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  couponTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: '#1e1508',
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.2)',
  },
  couponTypeBtnActive: { backgroundColor: '#4a2c1a', borderColor: '#c9a15a' },
  couponTypeText: { color: '#8c6a34', fontWeight: '700', fontSize: FontSizes.md },
  couponSectionLabel: { color: '#8c6a34', fontSize: 10, textTransform: 'uppercase', fontWeight: '600', marginBottom: 6, marginTop: 4 },
  tierCheckGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tierCheckItem: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1e1508', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: 'rgba(201, 161, 90, 0.2)',
    paddingHorizontal: 10, paddingVertical: 6,
  },
  tierCheckItemActive: { borderColor: '#c9a15a', backgroundColor: 'rgba(201, 161, 90, 0.1)' },
  tierCheckText: { color: '#8c6a34', fontSize: FontSizes.xs },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a0f0a', borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '80%', borderWidth: 1, borderColor: 'rgba(201, 161, 90, 0.2)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  modalTitle: { color: '#f0ddb7', fontSize: FontSizes.md, fontWeight: '700' },
  modalSubtitle: { color: '#6b4f14', fontSize: FontSizes.xs, marginTop: 2 },
  txItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(201, 161, 90, 0.1)' },
  txText: { color: '#f0ddb7', fontSize: FontSizes.sm },
});

