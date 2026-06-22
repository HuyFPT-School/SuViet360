import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { podcastApi } from '@/services/podcastApi';
import type { Podcast } from '@/types/podcast';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { formatDuration, formatDate } from '@/utils/format';

export default function PodcastsScreen() {
  const router = useRouter();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  const fetchPodcasts = async () => {
    try {
      const data = await podcastApi.getAll();
      setPodcasts(data.podcasts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPodcasts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPodcasts();
  };

  const filtered = podcasts.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && p.category !== category) return false;
    return true;
  });

  const categories = [...new Set(podcasts.map((p) => p.category).filter(Boolean))];

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🎧 Podcast</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎧 Podcast</Text>
        <Text style={styles.headerSubtitle}>Những câu chuyện lịch sử</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm podcast..."
          placeholderTextColor={Colors.light.textDim}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Categories */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          style={styles.categoriesRow}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          <TouchableOpacity
            style={[styles.categoryChip, !category && styles.categoryChipActive]}
            onPress={() => setCategory('')}
          >
            <Text style={[styles.categoryChipText, !category && styles.categoryChipTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              onPress={() => setCategory(category === cat ? '' : cat)}
            >
              <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.gold} />
        }
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {filtered.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Không tìm thấy podcast</Text>
          </View>
        ) : (
          filtered.map((podcast) => (
            <TouchableOpacity
              key={podcast._id}
              style={styles.podcastCard}
              onPress={() => router.push(`/podcast/${podcast._id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.podcastThumb}>
                <Text style={styles.podcastThumbIcon}>🎧</Text>
              </View>
              <View style={styles.podcastInfo}>
                <Text style={styles.podcastTitle} numberOfLines={1}>
                  {podcast.title}
                </Text>
                <Text style={styles.podcastDesc} numberOfLines={2}>
                  {podcast.description || podcast.content || ''}
                </Text>
                <View style={styles.podcastMeta}>
                  {podcast.category ? (
                    <Text style={styles.podcastTag}>{podcast.category}</Text>
                  ) : null}
                  {podcast.level ? (
                    <Text style={styles.podcastLevel}>{podcast.level}</Text>
                  ) : null}
                  <Text style={styles.podcastDuration}>
                    {formatDuration(podcast.duration)}
                  </Text>
                  <Text style={styles.podcastDate}>{formatDate(podcast.createdAt)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    backgroundColor: Colors.light.backgroundDark,
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.goldDark,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: Spacing.md,
  },
  headerTitle: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.light.goldLight,
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.sm,
    color: Colors.light.goldMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  searchBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.panel,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.panelBorder,
  },
  searchInput: {
    backgroundColor: Colors.light.authInputBg,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: FontSizes.sm,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.authBorder,
    fontFamily: 'Cormorant Garamond',
  },
  categoriesRow: {
    maxHeight: 44,
    backgroundColor: Colors.light.panel,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.md,
    gap: 8,
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 6,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    backgroundColor: Colors.light.panel,
  },
  categoryChipActive: {
    backgroundColor: Colors.light.gold,
    borderColor: Colors.light.goldDark,
  },
  categoryChipText: {
    fontSize: FontSizes.xs,
    color: Colors.light.textMuted,
    fontFamily: 'Cinzel',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  categoryChipTextActive: {
    color: '#3a2312',
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: 12, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.lg,
    color: Colors.light.textMuted,
    fontStyle: 'italic',
  },
  errorBox: {
    padding: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.errorBg,
    borderWidth: 1,
    borderColor: 'rgba(175, 55, 55, 0.5)',
    marginBottom: 12,
  },
  errorText: { color: Colors.light.error, textAlign: 'center' },
  podcastCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.panel,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.md,
    gap: 12,
  },
  podcastThumb: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(201, 161, 90, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podcastThumbIcon: { fontSize: 28 },
  podcastInfo: { flex: 1, gap: 4 },
  podcastTitle: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.light.text,
  },
  podcastDesc: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.sm,
    color: Colors.light.textMuted,
    lineHeight: 18,
  },
  podcastMeta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  podcastTag: {
    fontSize: FontSizes.xs,
    color: Colors.light.gold,
    fontWeight: '600',
  },
  podcastLevel: {
    fontSize: FontSizes.xs,
    color: Colors.light.textDim,
    fontStyle: 'italic',
  },
  podcastDuration: {
    fontSize: FontSizes.xs,
    color: Colors.light.textMuted,
  },
  podcastDate: {
    fontSize: FontSizes.xs,
    color: Colors.light.textDim,
    fontStyle: 'italic',
  },
});
