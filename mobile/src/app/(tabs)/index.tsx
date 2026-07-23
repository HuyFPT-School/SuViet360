import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ImageStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { PageBackground } from '@/components/PageBackground';
import NotificationBell from '@/components/NotificationBell';
import { podcastApi } from '@/services/podcastApi';
import { api } from '@/services/api';

const { width } = Dimensions.get('window');

/** Image wrapper that shows a colored fallback instead of crashing on load failure */
function SafeImage({ uri, style }: { uri?: string | null; style: ImageStyle }) {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);

  if (failed || !uri) {
    return (
      <View style={[style, { backgroundColor: '#2c1216', alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="image-outline" size={24} color="#6b4f14" />
      </View>
    );
  }
  return <Image source={{ uri }} style={style} onError={onError} />;
}

const STATS = [
  { value: '3.600+', label: 'Vectors RAG Lịch sử 12' },
  { value: '100%', label: 'Bám sát SGK & Ôn thi' },
  { value: '2D', label: 'Mô phỏng sự kiện' },
];

const GRADE_12_PILLARS = [
  {
    id: 'g12-pillar-1',
    title: 'LỊCH SỬ THẾ GIỚI HIỆN ĐẠI',
    subtitle: 'Giai đoạn 1945 – 2000',
    desc: 'Trật tự hai cực I-an-ta, Liên Xô, Mỹ, Tây Âu, Nhật Bản và xu thế toàn cầu hóa kinh tế.',
    tag: 'Lịch Sử Thế Giới',
    img: 'https://www.suviet.io.vn/images/chi_lang.png',
    color: '#4a7fb5',
  },
  {
    id: 'g12-pillar-2',
    title: 'VIỆT NAM TỪ 1919 ĐẾN 1945',
    subtitle: 'Giai đoạn 1919 – 1945',
    desc: 'Phong trào dân tộc dân chủ, Đảng Cộng sản Việt Nam ra đời 1930 và Cách mạng Tháng Tám 1945.',
    tag: 'Cách Mạng',
    img: 'https://www.suviet.io.vn/images/thang_long.png',
    color: '#c9a15a',
  },
  {
    id: 'g12-pillar-3',
    title: 'KHÁNG CHIẾN CHỐNG PHÁP & MỸ',
    subtitle: 'Giai đoạn 1945 – 1975',
    desc: 'Đại thắng Điện Biên Phủ 1954 và Chiến dịch Hồ Chí Minh 1975 giải phóng hoàn toàn Miền Nam.',
    tag: 'Kháng Chiến',
    img: 'https://www.suviet.io.vn/images/dien_bien_phu.png',
    color: '#d4543a',
  },
  {
    id: 'g12-pillar-4',
    title: 'ĐỔI MỚI & HỘI NHẬP QUỐC TẾ',
    subtitle: 'Giai đoạn 1975 – 2000',
    desc: 'Đường lối Đổi mới Đại hội VI (1986), xây dựng đất nước và hội nhập quốc tế toàn diện.',
    tag: 'Hội Nhập',
    img: 'https://www.suviet.io.vn/images/hue_citadel.png',
    color: '#6b8e6b',
  },
];

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const QUICK_LINKS: Array<{
  label: string;
  route: string;
  icon: IoniconName;
}> = [
  { label: 'Hành trình', route: '/(tabs)/podcasts', icon: 'compass-outline' },
  { label: 'Diễn đàn', route: '/(tabs)/blog', icon: 'newspaper-outline' },
  { label: 'Hỏi đáp', route: '/(tabs)/chat', icon: 'chatbubble-ellipses-outline' },
  { label: 'Bảng vàng', route: '/leaderboard', icon: 'trophy-outline' },
];

const SECONDARY_LINKS: Array<{
  label: string;
  route: string;
  icon: IoniconName;
}> = [
  { label: 'Gói VIP', route: '/subscription', icon: 'diamond-outline' },
  { label: 'Thông báo', route: '/notifications', icon: 'notifications-outline' },
  { label: 'Thành tựu', route: '/(tabs)/profile', icon: 'person-outline' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [podcasts, setPodcasts] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    podcastApi.getAll().then((res) => setPodcasts((res?.podcasts || []).slice(0, 3))).catch(() => {});
    api.get<{ success: boolean; data: { leaderboard: any[] } }>('/progress/leaderboard')
      .then((res) => setLeaderboard((res.data.data?.leaderboard || []).slice(0, 5)))
      .catch(() => {});
  }, []);

  const ADMIN_LINKS: Array<{
    label: string;
    route: string;
    icon: IoniconName;
    roles: string[];
  }> = [
    { label: 'Quản trị', route: '/admin', icon: 'settings-outline', roles: ['admin'] },
    { label: 'Kiểm duyệt', route: '/teacher', icon: 'shield-checkmark-outline', roles: ['teacher'] },
    { label: 'Quản lý', route: '/staff', icon: 'briefcase-outline', roles: ['staff'] },
  ];

  const visibleAdminLinks = ADMIN_LINKS.filter(
    (link) => user && link.roles.includes(user.role)
  );

  return (
    <PageBackground style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerBrand}>Hành trình Sử Việt</Text>
        <View style={styles.headerRight}>
          {user && <NotificationBell />}
          {user && (
            <Text style={styles.headerUser}>{user.name}</Text>
          )}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Khám phá</Text>
          <Text style={styles.heroTitle}>
            Lịch sử{' '}
            <Text style={styles.heroAccent}>Việt Nam</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Hành trình qua 4000 năm văn hiến, từ thời Hùng Vương đến hiện đại
          </Text>
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/(tabs)/podcasts')}
            >
              <Text style={styles.primaryButtonText}>Bắt đầu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/(tabs)/podcasts')}
            >
              <Text style={styles.secondaryButtonText}>Khám phá</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {STATS.map((stat, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Chương trình trọng tâm — 4 Pillars */}
        <View style={styles.pillarsSection}>
          <View style={styles.pillarsHeader}>
            <Text style={styles.pillarsEyebrow}>CHƯƠNG TRÌNH CHUẨN LỚP 12</Text>
            <Text style={styles.pillarsTitle}>4 MẢNG KIẾN THỨC TRỌNG TÂM LỊCH SỬ 12</Text>
            <View style={styles.pillarsDivider} />
          </View>
          {GRADE_12_PILLARS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.pillarCard}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/podcasts')}
            >
              <Image source={{ uri: p.img }} style={styles.pillarImg} />
              <View style={styles.pillarTag}>
                <Text style={styles.pillarTagText}>{p.tag}</Text>
              </View>
              <View style={styles.pillarBody}>
                <Text style={styles.pillarSubtitle}>{p.subtitle}</Text>
                <Text style={styles.pillarTitle}>{p.title}</Text>
                <Text style={styles.pillarDesc}>{p.desc}</Text>
                <View style={styles.pillarLink}>
                  <Text style={styles.pillarLinkText}>Nghe Podcast 12  ➔</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Leaderboard Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.lbTitleRow}>
              <Text style={styles.sectionTitle}>Bảng vinh danh</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/leaderboard' as any)}>
              <Text style={styles.seeAll}>Xem tất cả ➔</Text>
            </TouchableOpacity>
          </View>
          {leaderboard.length === 0 ? (
            <Text style={styles.emptyText}>Đang tải bảng xếp hạng...</Text>
          ) : (
            leaderboard.map((player, i) => (
              <View key={player.userId || i} style={styles.lbRow}>
                <View style={[styles.lbRankBadge, { backgroundColor: ['#d97706', '#6b7280', '#c2410c'][i] || '#8c6a34' }]}>
                  <Text style={styles.lbRankBadgeText}>#{i + 1}</Text>
                </View>
                <View style={styles.lbInfo}>
                  <Text style={styles.lbName} numberOfLines={1}>{player.name || 'Ẩn danh'}</Text>
                  <Text style={styles.lbLevel}>Học sinh xuất sắc</Text>
                </View>
                <View style={styles.lbXpBadge}>
                  <Text style={styles.lbXp}>{player.xp?.toLocaleString('vi-VN') || 0} XP</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Featured Podcasts */}
        {podcasts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Podcast mới nhất</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/podcasts' as any)}>
                <Text style={styles.seeAll}>Xem tất cả →</Text>
              </TouchableOpacity>
            </View>
            {podcasts.map((p) => (
              <TouchableOpacity
                key={p._id}
                style={styles.podcastCard}
                onPress={() => router.push(`/podcast/${p._id}` as any)}
              >
                <SafeImage uri={p.thumbnail} style={styles.podcastThumb} />
                <View style={styles.podcastInfo}>
                  <Text style={styles.podcastTitle} numberOfLines={2}>{p.title}</Text>
                  <Text style={styles.podcastMeta}>{p.category} · {p.level}</Text>
                </View>
                <Ionicons name="play-circle" size={24} color={Colors.light.gold} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tính năng</Text>
          <View style={styles.quickLinks}>
            {QUICK_LINKS.map((link) => (
              <TouchableOpacity
                key={link.route}
                style={styles.quickLink}
                onPress={() => router.push(link.route as any)}
              >
                <View style={styles.quickLinkIcon}>
                  <Ionicons name={link.icon} size={32} color={Colors.light.goldDark} />
                </View>
                <Text style={styles.quickLinkText}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Secondary Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Khám phá thêm</Text>
          <View style={styles.quickLinks}>
            {SECONDARY_LINKS.map((link) => (
              <TouchableOpacity
                key={link.route}
                style={styles.quickLink}
                onPress={() => router.push(link.route as any)}
              >
                <View style={styles.quickLinkIcon}>
                  <Ionicons name={link.icon} size={32} color={Colors.light.goldDark} />
                </View>
                <Text style={styles.quickLinkText}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Admin Links (role-based) */}
        {visibleAdminLinks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quản trị</Text>
            <View style={styles.quickLinks}>
              {visibleAdminLinks.map((link) => (
                <TouchableOpacity
                  key={link.route}
                  style={styles.quickLink}
                  onPress={() => router.push(link.route as any)}
                >
                  <View style={[styles.quickLinkIcon, styles.adminQuickLinkIcon]}>
                    <Ionicons name={link.icon} size={32} color={Colors.light.goldDark} />
                  </View>
                  <Text style={styles.quickLinkText}>{link.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.light.backgroundDark,
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.goldDark,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  headerBrand: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.light.goldLight,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerUser: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.sm,
    color: Colors.light.goldMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  hero: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    backgroundColor: '#1f0a0d',
    borderBottomWidth: 6,
    borderBottomColor: '#4f2c2f',
  },
  heroEyebrow: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.xs,
    color: 'rgba(201, 161, 90, 0.7)',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.hero,
    fontWeight: '700',
    color: Colors.light.goldLight,
    lineHeight: 40,
  },
  heroAccent: {
    color: Colors.light.gold,
    textShadowColor: 'rgba(201, 161, 90, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  heroSubtitle: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.lg,
    color: 'rgba(240, 221, 183, 0.7)',
    marginTop: 12,
    lineHeight: 24,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.gold,
    shadowColor: Colors.light.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#1a0a06',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.35)',
  },
  secondaryButtonText: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(240, 221, 183, 0.85)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.light.panel,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.panelBorder,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.light.gold,
  },
  statLabel: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.sm,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.light.textInk,
    marginBottom: Spacing.md,
  },
  timeline: {
    gap: 12,
  },
  eraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: Spacing.md,
    backgroundColor: Colors.light.panel,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
  },
  eraDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  eraContent: {
    flex: 1,
  },
  eraName: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
  },
  eraSub: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.sm,
    color: Colors.light.textMuted,
    fontStyle: 'italic',
  },
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickLink: {
    width: (width - 60) / 2,
    padding: Spacing.lg,
    backgroundColor: Colors.light.panel,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    alignItems: 'center',
    gap: 8,
  },
  quickLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201, 161, 90, 0.14)',
  },
  adminQuickLinkIcon: {
    backgroundColor: 'rgba(139, 105, 20, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.3)',
  },
  quickLinkText: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.light.textInk,
    letterSpacing: 0.5,
  },
  // ─── Leaderboard ──────────────────────────────────
  lbTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: '#e5d8bf',
    marginBottom: 10,
  },
  lbRankBadge: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  lbRankBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'Cinzel',
  },
  lbInfo: { flex: 1, gap: 2 },
  lbName: { color: '#2c1a0e', fontSize: FontSizes.sm, fontWeight: '600', fontFamily: 'Cinzel' },
  lbLevel: { color: '#8c653a', fontSize: FontSizes.xs, fontFamily: 'Cormorant Garamond' },
  lbXpBadge: {
    backgroundColor: '#f4ebd9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.3)',
  },
  lbXp: { color: '#b45309', fontSize: FontSizes.xs, fontWeight: '800', fontFamily: 'Cinzel' },
  emptyText: { color: Colors.light.textMuted, fontSize: FontSizes.sm, textAlign: 'center', paddingVertical: 16, fontStyle: 'italic' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  seeAll: { color: Colors.light.gold, fontSize: FontSizes.xs, fontWeight: '600' },
  // ─── Featured Podcasts ────────────────────────────
  podcastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.light.panel,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    marginBottom: 8,
  },
  podcastThumb: { width: 56, height: 56, borderRadius: BorderRadius.md, backgroundColor: Colors.light.backgroundCardAlt },
  podcastInfo: { flex: 1, gap: 2 },
  podcastTitle: { color: Colors.light.text, fontSize: FontSizes.sm, fontWeight: '600' },
  podcastMeta: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
  // ─── 4 Pillars ────────────────────────────────────
  pillarsSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  pillarsHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pillarsEyebrow: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    color: Colors.light.goldDark,
    textTransform: 'uppercase',
  },
  pillarsTitle: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.light.maroon,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 24,
  },
  pillarsDivider: {
    width: 60,
    height: 3,
    backgroundColor: Colors.light.gold,
    marginTop: 8,
    borderRadius: 2,
  },
  pillarCard: {
    backgroundColor: '#fcf9f2',
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 161, 90, 0.4)',
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  pillarImg: {
    width: '100%',
    height: 160,
  },
  pillarTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#2c1216',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.4)',
  },
  pillarTagText: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    fontWeight: '700',
    color: '#f6e1ba',
    textTransform: 'uppercase',
  },
  pillarBody: {
    padding: 16,
  },
  pillarSubtitle: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillarTitle: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.light.maroon,
    marginTop: 4,
    lineHeight: 20,
  },
  pillarDesc: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.sm,
    color: '#6b4a2b',
    marginTop: 6,
    lineHeight: 20,
  },
  pillarLink: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5d8bf',
  },
  pillarLinkText: {
    fontFamily: 'Cinzel',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.maroon,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
