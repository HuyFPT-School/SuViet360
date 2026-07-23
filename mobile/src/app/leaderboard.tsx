import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { PageBackground } from '@/components/PageBackground';
import HeaderBar from '@/components/ui/HeaderBar';
import { useAppSelector } from '@/store';
import { api } from '@/services/api';
import { connectSocket } from '@/services/socketClient';

const REGIONS = ['Hà Nội', 'Huế', 'Đà Nẵng', 'TP. HCM', 'Hải Phòng', 'Cần Thơ', 'Nha Trang', 'Hạ Long'];
const PAGE_SIZE = 12;

type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  level: number;
  streak: number;
  region: string;
  initials: string;
  avatar?: string;
};

function getInitials(name: string): string {
  const parts = (name || '').trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (name || 'SV').slice(0, 2).toUpperCase();
}

const getHonorTitle = (rank: number, level: number): string => {
  if (rank === 1) return 'Trạng nguyên';
  if (rank === 2) return 'Bảng nhãn';
  if (rank === 3) return 'Thám hoa';
  if (level >= 5) return 'Đại sĩ SuViet';
  if (level >= 3) return 'Tân khoa';
  return 'Học sĩ';
};

const TOP3_COLORS = [
  { bg: '#d97706', ring: '#fde68a', text: '#fff3db' },
  { bg: '#6b7280', ring: '#a3b1c6', text: '#ffffff' },
  { bg: '#c2410c', ring: '#fdba74', text: '#ffffff' },
];

const TOP3_TITLES = ['TRẠNG NGUYÊN', 'BẢNG NHÃN', 'THÁM HOA'];
const TOP3_ICONS: Array<React.ComponentProps<typeof Ionicons>['name']> = ['star', 'ribbon', 'medal'];

export default function LeaderboardScreen() {
  const { user } = useAppSelector((state) => state.auth);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async (pageNum: number, reset = false) => {
    if (reset) setLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        data: { leaderboard: Array<{ _id: string; name: string; xp: number; level: number; avatar?: string }>; pagination: { pages: number } };
      }>(`/progress/leaderboard?page=${pageNum}&limit=${PAGE_SIZE}`);

      const list = res.data.data.leaderboard || [];
      const mapped: LeaderboardEntry[] = list.map((item, idx) => {
        const globalIdx = (pageNum - 1) * PAGE_SIZE + idx;
        return {
          id: item._id,
          name: item.name,
          score: item.xp || 0,
          level: item.level || 1,
          streak: 3 + ((item.xp || 0) % 14),
          region: REGIONS[globalIdx % REGIONS.length],
          initials: getInitials(item.name),
          avatar: item.avatar,
        };
      });

      if (reset) {
        setEntries(mapped);
        setPage(1);
      } else {
        setEntries((prev) => {
          const next = [...prev];
          mapped.forEach((item) => {
            if (!next.some((x) => x.id === item.id)) next.push(item);
          });
          return next;
        });
      }
      setHasMore(pageNum < res.data.data.pagination.pages);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchLeaderboard(1, true); }, []);

  useEffect(() => {
    let socket: ReturnType<typeof connectSocket> | null = null;
    try {
      socket = connectSocket();
      socket.on('leaderboard_updated', () => {
        fetchLeaderboard(1, true);
      });
    } catch { /* socket not available */ }
    return () => {
      if (socket) {
        socket.off('leaderboard_updated');
      }
    };
  }, [fetchLeaderboard]);

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchLeaderboard(nextPage);
    }
  };

  const displayEntries = useMemo(
    () => entries.map((entry, index) => ({ ...entry, rank: index + 1 })),
    [entries]
  );

  const top3 = useMemo(() => displayEntries.slice(0, 3), [displayEntries]);

  const currentUserEntry = useMemo(
    () => user?.name ? displayEntries.find((e) => e.name.toLowerCase() === user.name.toLowerCase()) : null,
    [displayEntries, user]
  );

  // ── Render top-3 podium card (vertical stack, horizontal internal layout) ──
  const renderTop3Card = (entry: (typeof top3)[0], rankIndex: number) => {
    const c = TOP3_COLORS[rankIndex];
    const isGold = rankIndex === 0;
    return (
      <View
        key={entry.id}
        style={[
          styles.top3Card,
          { borderColor: isGold ? c.ring : c.bg, backgroundColor: isGold ? '#fffbeb' : '#fcf9f2' },
          isGold && styles.top3CardGold,
        ]}
      >
        {/* Rank + Avatar */}
        <View style={[styles.top3Avatar, { backgroundColor: c.bg, borderColor: c.ring }]}>
          <Text style={[styles.top3Initials, { color: c.text }]}>{entry.initials}</Text>
        </View>

        {/* Badge */}
        <View style={[styles.top3Badge, { backgroundColor: c.bg }]}>
          <Ionicons name={TOP3_ICONS[rankIndex]} size={10} color={c.text} />
          <Text style={[styles.top3BadgeText, { color: c.text }]}>#{rankIndex + 1} {TOP3_TITLES[rankIndex]}</Text>
        </View>

        {/* Info */}
        <View style={styles.top3Info}>
          <Text style={styles.top3Name} numberOfLines={1}>{entry.name}</Text>
          <Text style={styles.top3Region}>{entry.region} · Cấp {entry.level}</Text>
        </View>

        {/* Stats */}
        <View style={styles.top3Stats}>
          <View style={styles.top3StatBox}>
            <Ionicons name="star" size={14} color={isGold ? '#b45309' : '#6b7280'} />
            <Text style={[styles.top3StatValue, isGold && styles.top3StatValueGold]}>{entry.score.toLocaleString()} XP</Text>
          </View>
          <View style={styles.top3StatBox}>
            <Ionicons name="flame" size={14} color="#ea580c" />
            <Text style={[styles.top3StatValue, { color: '#ea580c' }]}>{entry.streak} ngày</Text>
          </View>
        </View>
      </View>
    );
  };

  // ── Render a single ranking row ──
  const renderEntry = ({ item: entry }: { item: LeaderboardEntry & { rank: number } }) => {
    const isCurrentUser =
      user?.name && entry.name.toLowerCase() === user.name.toLowerCase();
    const honorTitle = getHonorTitle(entry.rank, entry.level);
    const isTop3 = entry.rank <= 3;

    return (
      <View style={[styles.entryCard, isCurrentUser && styles.entryCardHighlight, isTop3 && !isCurrentUser && styles.entryCardTop3]}>
        {/* Rank */}
        <View style={[
          styles.entryRank,
          { backgroundColor: entry.rank === 1 ? '#d97706' : entry.rank === 2 ? '#6b7280' : entry.rank === 3 ? '#c2410c' : '#efe3cd' },
        ]}>
          <Text style={[styles.entryRankText, { color: isTop3 ? '#ffffff' : '#4a1f24' }]}>{entry.rank}</Text>
        </View>

        {/* Avatar */}
        <View style={[styles.entryAvatar, { backgroundColor: '#4a1f24' }]}>
          <Text style={styles.entryInitials}>{entry.initials}</Text>
        </View>

        {/* Info */}
        <View style={styles.entryInfo}>
          <View style={styles.entryNameRow}>
            <Text style={styles.entryName} numberOfLines={1}>{entry.name}</Text>
            {isCurrentUser && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>BẠN</Text>
              </View>
            )}
          </View>
          <View style={styles.entryMetaRow}>
            <Text style={styles.entryHonor}>{honorTitle}</Text>
            <Text style={styles.entryMetaDot}>·</Text>
            <Ionicons name="flame" size={12} color="#d97706" />
            <Text style={styles.entryMeta}>{entry.streak} ngày</Text>
          </View>
        </View>

        {/* XP */}
        <View style={styles.entryXpCol}>
          <Text style={styles.entryXp}>{entry.score.toLocaleString()}</Text>
          <Text style={styles.entryXpLabel}>XP</Text>
        </View>
      </View>
    );
  };

  // ── Header components ──
  const ListHeader = (
    <View>
      {/* Banner Header */}
      <View style={styles.banner}>
        <View style={styles.bannerContent}>
          <View style={styles.bannerChip}>
            <Ionicons name="trophy" size={14} color="#e5b869" />
            <Text style={styles.bannerChipText}>BẢNG VÀNG ANH HÙNG</Text>
          </View>
          <Text style={styles.bannerTitle}>Bảng xếp hạng</Text>
          <Text style={styles.bannerSubtitle}>Cập nhật trực tiếp điểm XP và chuỗi học tập của các nhà khám phá Lịch sử Việt Nam.</Text>
        </View>
        <View style={styles.bannerStats}>
          <View style={styles.bannerStatBox}>
            <Text style={styles.bannerStatLabel}>THÀNH VIÊN</Text>
            <Text style={styles.bannerStatValue}>{entries.length}</Text>
          </View>
          <View style={styles.bannerStatBox}>
            <Text style={styles.bannerStatLabel}>HẠNG CỦA BẠN</Text>
            <Text style={[styles.bannerStatValue, { color: '#f8b76e' }]}>
              {currentUserEntry ? `#${currentUserEntry.rank}` : 'Khách'}
            </Text>
          </View>
        </View>
      </View>

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <View style={styles.podiumSection}>
          <View style={styles.podiumHeader}>
            <Ionicons name="trophy" size={18} color="#d97706" />
            <Text style={styles.podiumTitle}>TOP 3 DẪN ĐẦU</Text>
          </View>
          <View style={styles.podiumDivider} />

          <View style={styles.top3List}>
            {top3.map((entry, idx) => renderTop3Card(entry, idx))}
          </View>
        </View>
      )}

      {/* Ranking Table Header */}
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderTitle}>DANH SÁCH TOÀN BỘ XẾP HẠNG</Text>
      </View>
    </View>
  );

  return (
    <PageBackground style={styles.container}>
      <HeaderBar title="Bảng vàng" showBack />

      {loading && entries.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      ) : (
        <FlatList
          data={displayEntries.slice(3)}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchLeaderboard(1, true); }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={loading && entries.length > 0 ? (
            <ActivityIndicator style={{ padding: 20 }} color={Colors.light.gold} />
          ) : null}
        />
      )}
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: Spacing.md, paddingBottom: 40 },
  // ── Banner Header ──
  banner: {
    backgroundColor: '#2c1216',
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: 'rgba(201, 161, 90, 0.5)',
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  bannerContent: { marginBottom: 16 },
  bannerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(201, 161, 90, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  bannerChipText: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    fontWeight: '700',
    color: '#f3ddb3',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bannerTitle: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: '#fff3db',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.sm,
    color: 'rgba(246, 225, 186, 0.8)',
    lineHeight: 20,
  },
  bannerStats: { flexDirection: 'row', gap: 10 },
  bannerStatBox: {
    flex: 1,
    backgroundColor: 'rgba(24, 9, 11, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.3)',
    borderRadius: BorderRadius.lg,
    padding: 12,
    alignItems: 'center',
  },
  bannerStatLabel: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    fontWeight: '700',
    color: Colors.light.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerStatValue: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  // ── Top 3 Podium ──
  podiumSection: {
    marginBottom: Spacing.lg,
    backgroundColor: '#fcf9f2',
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: 'rgba(201, 161, 90, 0.4)',
    padding: Spacing.lg,
  },
  podiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  podiumTitle: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.light.maroon,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  podiumDivider: {
    width: 48,
    height: 3,
    backgroundColor: Colors.light.gold,
    alignSelf: 'center',
    marginBottom: 16,
    borderRadius: 2,
  },
  top3List: {
    gap: 10,
  },
  top3Card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    padding: 12,
  },
  top3CardGold: {
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2.5,
  },
  top3Badge: {
    position: 'absolute',
    top: -10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  top3BadgeText: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  top3Avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    flexShrink: 0,
  },
  top3Initials: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '800',
  },
  top3Info: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  top3Name: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: '#2c1a0e',
  },
  top3Region: {
    fontFamily: 'Cormorant Garamond',
    fontSize: 11,
    color: '#6b4a2b',
  },
  top3Stats: {
    flexDirection: 'row',
    gap: 12,
    flexShrink: 0,
  },
  top3StatBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  top3StatValue: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: '#2c1a0e',
  },
  top3StatValueGold: {
    color: '#b45309',
    fontSize: FontSizes.sm,
  },
  // ── Table Header ──
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(201, 161, 90, 0.3)',
    marginBottom: 10,
  },
  tableHeaderTitle: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.light.maroon,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // ── Entry Row ──
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: '#e8dfcf',
    padding: 12,
    marginBottom: 8,
  },
  entryCardHighlight: {
    borderColor: Colors.light.gold,
    borderWidth: 2,
    backgroundColor: '#fff3db',
  },
  entryCardTop3: {
    borderColor: 'rgba(201, 161, 90, 0.6)',
    backgroundColor: '#fffdf9',
  },
  entryRank: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryRankText: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  entryAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.4)',
  },
  entryInitials: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#f6e1ba',
  },
  entryInfo: { flex: 1 },
  entryNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  entryName: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: '#2c1a0e',
    flexShrink: 1,
  },
  youBadge: {
    backgroundColor: '#4a1f24',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  youBadgeText: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    fontWeight: '700',
    color: '#f6e1ba',
  },
  entryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  entryHonor: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.xs,
    color: '#8c653a',
  },
  entryMetaDot: { color: '#8c653a', fontSize: FontSizes.xs },
  entryMeta: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.xs,
    color: '#8c653a',
  },
  entryXpCol: { alignItems: 'flex-end' },
  entryXp: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: '#b45309',
  },
  entryXpLabel: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    color: '#8c653a',
  },
});
