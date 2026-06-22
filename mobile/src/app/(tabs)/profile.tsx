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
import { useAuth } from '@/hooks/useAuth';
import { profileApi, type ProfileUpdatePayload } from '@/services/profileApi';
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
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loginPrompt}>Vui lòng đăng nhập</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Đăng Nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 Cá Nhân</Text>
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
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
