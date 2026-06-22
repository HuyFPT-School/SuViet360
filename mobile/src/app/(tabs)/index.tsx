import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const { width } = Dimensions.get('window');

const ERAS = [
  { name: 'Hùng Vương', sub: '2879–258 TCN', color: '#c9a15a' },
  { name: 'Đinh · Lê · Lý · Trần', sub: '968–1400', color: '#d4543a' },
  { name: 'Lê · Nguyễn', sub: '1428–1945', color: '#6b8e6b' },
  { name: 'Hiện Đại', sub: '1945–Nay', color: '#4a7fb5' },
];

const STATS = [
  { value: '50+', label: 'Bài học' },
  { value: '120+', label: 'Bảng Vàng' },
  { value: '10+', label: 'Podcast' },
  { value: '2D', label: 'Game' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerBrand}>Hành Trình Sử Việt</Text>
        {user && (
          <Text style={styles.headerUser}>{user.name}</Text>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Khám Phá</Text>
          <Text style={styles.heroTitle}>
            Lịch Sử{' '}
            <Text style={styles.heroAccent}>Việt Nam</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Hành trình qua 4000 năm văn hiến, từ thời Hùng Vương đến hiện đại
          </Text>
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/(tabs)/lessons')}
            >
              <Text style={styles.primaryButtonText}>Bắt Đầu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/(tabs)/podcasts')}
            >
              <Text style={styles.secondaryButtonText}>Khám Phá</Text>
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

        {/* Eras Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dòng Lịch Sử</Text>
          <View style={styles.timeline}>
            {ERAS.map((era, i) => (
              <View key={i} style={styles.eraCard}>
                <View style={[styles.eraDot, { backgroundColor: era.color }]} />
                <View style={styles.eraContent}>
                  <Text style={styles.eraName}>{era.name}</Text>
                  <Text style={styles.eraSub}>{era.sub}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tính Năng</Text>
          <View style={styles.quickLinks}>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => router.push('/(tabs)/lessons')}
            >
              <Text style={styles.quickLinkIcon}>📚</Text>
              <Text style={styles.quickLinkText}>Bài Học</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => router.push('/(tabs)/podcasts')}
            >
              <Text style={styles.quickLinkIcon}>🎧</Text>
              <Text style={styles.quickLinkText}>Podcast</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => router.push('/(tabs)/chat')}
            >
              <Text style={styles.quickLinkIcon}>💬</Text>
              <Text style={styles.quickLinkText}>Hỏi Đáp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.quickLinkIcon}>🏆</Text>
              <Text style={styles.quickLinkText}>Thành Tựu</Text>
            </TouchableOpacity>
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
    fontSize: 32,
  },
  quickLinkText: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.light.textInk,
    letterSpacing: 0.5,
  },
});
