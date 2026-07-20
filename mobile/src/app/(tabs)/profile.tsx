import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PageBackground } from '@/components/PageBackground';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { profileApi, type ProfileUpdatePayload } from '@/services/profileApi';
import { subscriptionApi } from '@/services/subscriptionApi';
import { curriculumApi, type ProgressDashboard } from '@/services/curriculumApi';
import { setUser } from '@/store/features/authSlice';
import { useAppDispatch } from '@/store';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { GENDER_MAP } from '@/utils/format';

const ACHIEVEMENTS = [
  { title: 'Nhà Khám Phá', desc: 'Đã khám phá 10 di sản', color: '#D4AF37' },
  { title: 'Nhà Sưu Tầm', desc: 'Sưu tầm 50 hiện vật', color: '#C0A060' },
  { title: 'Học Giả Sử Việt', desc: 'Đọc 100 bài viết', color: '#B8963E' },
  { title: 'Lữ Hành Thời Gian', desc: 'Hoàn thành 5 hành trình', color: '#A07830' },
  { title: 'Bậc Thầy Bản Đồ', desc: 'Mở khóa 20 địa danh', color: '#C8A850' },
  { title: 'Dấu Ấn Lịch Sử', desc: 'Đăng nhập 30 ngày', color: '#D4AF37' },
];

const SIDEBAR_ITEMS = [
  'Thông tin cá nhân',
  'Thành tựu',
  'Hành trình của tôi',
  'Di sản đã mở khóa',
  'Nhật ký hành trình',
  'Cài đặt tài khoản',
];

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isLoading, refreshUser, logout } = useAuth();
  const [activeSection, setActiveSection] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileUpdatePayload>({});
  const [subInfo, setSubInfo] = useState<any>(null);
  const [progress, setProgress] = useState<ProgressDashboard | null>(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        phone: user.phone,
        birthDate: user.birthDate,
        gender: user.gender,
        address: user.address,
        bio: user.bio,
      });
      subscriptionApi.getMySubscription()
        .then(setSubInfo)
        .catch(() => {});
      // Fetch progress dashboard for XP/level display
      if (user.role === 'user') {
        curriculumApi.getProgressDashboard()
          .then(setProgress)
          .catch(() => {});
      }
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await profileApi.updateProfile(form);
      dispatch(setUser(res.data.user));
      setIsEditing(false);
      Alert.alert('Thành công', 'Thông tin đã được cập nhật');
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật thông tin');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      <PageBackground style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      </PageBackground>
    );
  }

  if (!user) {
    return (
      <PageBackground style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loginPrompt}>Vui lòng đăng nhập</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Đăng Nhập</Text>
          </TouchableOpacity>
        </View>
      </PageBackground>
    );
  }

  return (
    <PageBackground style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="person-outline" size={22} color={Colors.light.goldLight} />
          <Text style={styles.headerTitle}>Cá Nhân</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.profileName}>{user.name}</Text>
        <Text style={styles.profileEmail}>{user.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user.role === 'admin' ? 'Quản Trị Viên' :
             user.role === 'staff' ? 'Nhân Viên' :
             user.role === 'teacher' ? 'Giáo Viên' : 'Học Viên'}
          </Text>
        </View>
        {subInfo && (
          <View style={styles.subBadge}>
            <Ionicons name="diamond" size={14} color={Colors.light.gold} />
            <Text style={styles.subText}>
              {subInfo.tier || 'Chưa có gói'} {subInfo.expiry ? `— đến ${new Date(subInfo.expiry).toLocaleDateString('vi-VN')}` : ''}
            </Text>
          </View>
        )}
        {/* XP Progress Bar */}
        {progress && (
          <View style={styles.xpSection}>
            <View style={styles.xpHeaderRow}>
              <Text style={styles.xpLevel}>Cấp {progress.level}</Text>
              <Text style={styles.xpValue}>{progress.xp} XP</Text>
            </View>
            <View style={styles.xpBarTrack}>
              <View
                style={[
                  styles.xpBarFill,
                  { width: `${progress.xpToNextLevel > 0 ? Math.min(100, (progress.xp / (progress.xp + progress.xpToNextLevel)) * 100) : 100}%` },
                ]}
              />
            </View>
            <View style={styles.xpStatsRow}>
              <Text style={styles.xpStat}>
                🎯 {progress.completedLessons?.length || 0} bài học
              </Text>
              <Text style={styles.xpStat}>
                📖 {progress.completedUnits?.length || 0} bài lý thuyết
              </Text>
              <Text style={styles.xpStat}>
                🔥 {progress.streak || 0} ngày streak
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Edit Profile Button */}
      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => setIsEditing(!isEditing)}
      >
        <Ionicons name={isEditing ? 'close-outline' : 'create-outline'} size={16} color={Colors.light.backgroundDark} />
        <Text style={styles.editBtnText}>{isEditing ? 'Hủy' : 'Cập nhật thông tin'}</Text>
      </TouchableOpacity>

      {/* Quick Nav */}
      <View style={styles.quickNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/subscription' as any)}>
          <Ionicons name="diamond-outline" size={20} color={Colors.light.gold} />
          <Text style={styles.navText}>Gói VIP</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/blog/my-posts' as any)}>
          <Ionicons name="document-text-outline" size={20} color={Colors.light.gold} />
          <Text style={styles.navText}>Bài Viết Của Tôi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/subscription/history' as any)}>
          <Ionicons name="receipt-outline" size={20} color={Colors.light.gold} />
          <Text style={styles.navText}>Lịch Sử GD</Text>
        </TouchableOpacity>
        {user.role === 'admin' && (
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/admin' as any)}>
            <Ionicons name="settings-outline" size={20} color={Colors.light.gold} />
            <Text style={styles.navText}>Quản Trị</Text>
          </TouchableOpacity>
        )}
        {user.role === 'staff' && (
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/staff' as any)}>
            <Ionicons name="briefcase-outline" size={20} color={Colors.light.gold} />
            <Text style={styles.navText}>QL Nội Dung</Text>
          </TouchableOpacity>
        )}
        {user.role === 'teacher' && (
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/teacher' as any)}>
            <Ionicons name="checkmark-circle-outline" size={20} color={Colors.light.gold} />
            <Text style={styles.navText}>Kiểm Duyệt</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Họ tên</Text>
                <TextInput
                  style={styles.editInput}
                  value={form.name}
                  onChangeText={(t) => setForm({ ...form, name: t })}
                  placeholder="Nhập họ tên"
                  placeholderTextColor={Colors.light.textDim}
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Số điện thoại</Text>
                <TextInput
                  style={styles.editInput}
                  value={form.phone}
                  onChangeText={(t) => setForm({ ...form, phone: t })}
                  placeholder="Chưa cập nhật"
                  placeholderTextColor={Colors.light.textDim}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Ngày sinh</Text>
                <TextInput
                  style={styles.editInput}
                  value={form.birthDate ? String(form.birthDate).slice(0, 10) : ''}
                  onChangeText={(t) => setForm({ ...form, birthDate: t })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.light.textDim}
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Giới tính</Text>
                <View style={styles.genderRow}>
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderPill, form.gender === g && styles.genderPillActive]}
                      onPress={() => setForm({ ...form, gender: g })}
                    >
                      <Text style={[styles.genderPillT, form.gender === g && styles.genderPillTActive]}>
                        {g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Địa chỉ</Text>
                <TextInput
                  style={styles.editInput}
                  value={form.address}
                  onChangeText={(t) => setForm({ ...form, address: t })}
                  placeholder="Chưa cập nhật"
                  placeholderTextColor={Colors.light.textDim}
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Giới thiệu</Text>
                <TextInput
                  style={[styles.editInput, styles.editInputMultiline]}
                  value={form.bio}
                  onChangeText={(t) => setForm({ ...form, bio: t })}
                  placeholder="Giới thiệu về bản thân"
                  placeholderTextColor={Colors.light.textDim}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Số điện thoại</Text>
                <Text style={styles.infoValue}>{user.phone || 'Chưa cập nhật'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Ngày sinh</Text>
                <Text style={styles.infoValue}>
                  {user.birthDate ? new Date(user.birthDate).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Giới tính</Text>
                <Text style={styles.infoValue}>{GENDER_MAP[user.gender || ''] || 'Chưa cập nhật'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Địa chỉ</Text>
                <Text style={styles.infoValue}>{user.address || 'Chưa cập nhật'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thành tựu</Text>
          <View style={styles.achievementGrid}>
            {ACHIEVEMENTS.map((ach, i) => (
              <View key={i} style={styles.achievementItem}>
                <View style={[styles.achievementDot, { backgroundColor: ach.color }]} />
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementTitle}>{ach.title}</Text>
                  <Text style={styles.achievementDesc}>{ach.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  header: {
    backgroundColor: Colors.light.backgroundDark,
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.goldDark,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.light.goldLight,
    letterSpacing: 1.5,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: FontSizes.sm,
    color: Colors.light.goldMuted,
    textDecorationLine: 'underline',
  },
  profileCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.light.panel,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.panelBorder,
    gap: 8,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(201, 161, 90, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.light.gold,
  },
  avatarLargeText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.light.gold,
  },
  profileName: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.light.text,
  },
  profileEmail: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.md,
    color: Colors.light.textMuted,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(201, 161, 90, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.3)',
  },
  roleText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.light.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Cinzel',
  },
  subBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  subText: { color: Colors.light.text, fontSize: FontSizes.sm, fontWeight: '600' },
  // Edit button
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#5c3a21',
    marginHorizontal: Spacing.lg,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  editBtnText: { color: '#f0ddb7', fontSize: FontSizes.sm, fontWeight: '700' },
  // Edit form
  editForm: { gap: 16 },
  editField: { gap: 6 },
  editLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.light.textMuted,
    marginBottom: 2,
  },
  editInput: {
    width: '100%',
    backgroundColor: Colors.light.backgroundCardAlt,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    color: Colors.light.textMain,
    fontSize: FontSizes.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  editInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderPill: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.backgroundCardAlt,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
  },
  genderPillActive: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  genderPillT: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
  genderPillTActive: { color: Colors.light.backgroundDark, fontWeight: '700' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#5c3a21',
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
  },
  saveBtnText: { color: '#f0ddb7', fontSize: FontSizes.md, fontWeight: '700' },
  // XP Progress Bar
  xpSection: {
    width: '100%',
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
    gap: 6,
  },
  xpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpLevel: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.light.gold,
  },
  xpValue: {
    fontSize: FontSizes.xs,
    color: Colors.light.textMuted,
  },
  xpBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(201, 161, 90, 0.15)',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.light.gold,
  },
  xpStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 4,
  },
  xpStat: {
    fontSize: FontSizes.xs,
    color: Colors.light.textDim,
  },
  quickNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.light.backgroundDark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.panelBorder,
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm,
  },
  navItem: { alignItems: 'center', gap: 4 },
  navText: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  section: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.panelBorder,
  },
  sectionTitle: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.panelBorder,
  },
  infoLabel: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    color: Colors.light.textMuted,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.md,
    color: Colors.light.text,
  },
  achievementGrid: {
    gap: 10,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.light.panel,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
  },
  achievementDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
  },
  achievementDesc: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.sm,
    color: Colors.light.textMuted,
  },
  loginPrompt: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.lg,
    color: Colors.light.textMuted,
  },
  loginButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.gold,
  },
  loginButtonText: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: '#3a2312',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
