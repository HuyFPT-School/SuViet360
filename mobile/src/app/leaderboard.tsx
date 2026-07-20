import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
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
  rankChange: number;
  avatar?: string;
};

function getInitials(name: string): string {
  const parts = (name || '').trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (name || 'SV').slice(0, 2).toUpperCase();
}

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
          rankChange: 0,
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

  // ─── Real-time leaderboard updates via socket ─────
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

  const getRankColor = (index: number) => {
    if (index === 0) return '#FFD700';
    if (index === 1) return '#C0C0C0';
    if (index === 2) return '#CD7F32';
    return Colors.light.textMuted;
  };

  const renderEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrentUser = user && item.id === (user as any)._id;
    return (
      <View style={[styles.entryCard, isCurrentUser && styles.entryCardHighlight]}>
        <View style={[styles.rankBadge, { backgroundColor: getRankColor(index) + '22' }]}>
          {index < 3 ? (
            <Ionicons name="trophy" size={18} color={getRankColor(index)} />
          ) : (
            <Text style={[styles.rankText, { color: getRankColor(index) }]}>{index + 1}</Text>
          )}
        </View>
        <View style={[styles.avatar, { backgroundColor: getRankColor(index) + '44' }]}>
          <Text style={[styles.initials, { color: getRankColor(index) }]}>{item.initials}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name} {isCurrentUser && <Text style={styles.youBadge}>(Bạn)</Text>}
          </Text>
          <View style={styles.meta}>
            <Ionicons name="star" size={12} color={Colors.light.gold} />
            <Text style={styles.metaText}>{item.score} XP</Text>
            <Text style={styles.metaText}>·</Text>
            <Text style={styles.metaText}>Cấp {item.level}</Text>
          </View>
        </View>
        <View style={styles.scoreCol}>
          <Text style={styles.score}>{item.score.toLocaleString()}</Text>
          <Text style={styles.levelText}>XP</Text>
        </View>
      </View>
    );
  };

  return (
    <PageBackground style={styles.container}>
      <HeaderBar title="Bảng Vàng" showBack />

      {loading && entries.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchLeaderboard(1, true); }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.headerTitle}>Bảng Xếp Hạng</Text>
          }
        />
      )}
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: Spacing.md, paddingBottom: 40 },
  headerTitle: { color: Colors.light.textMain, fontSize: FontSizes.lg, fontWeight: '700', marginBottom: Spacing.sm, textAlign: 'center' },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    gap: 10,
  },
  entryCardHighlight: { borderColor: Colors.light.gold, borderWidth: 2 },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: FontSizes.sm, fontWeight: '700' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: FontSizes.sm, fontWeight: '700' },
  info: { flex: 1 },
  name: { color: Colors.light.textMain, fontSize: FontSizes.sm, fontWeight: '600' },
  youBadge: { color: Colors.light.gold, fontSize: FontSizes.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
  scoreCol: { alignItems: 'flex-end' },
  score: { color: Colors.light.gold, fontSize: FontSizes.md, fontWeight: '700' },
  levelText: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
});
