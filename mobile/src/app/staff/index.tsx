import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PageBackground } from '@/components/PageBackground';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import HeaderBar from '@/components/ui/HeaderBar';
import GoldButton from '@/components/ui/GoldButton';
import { blogApi } from '@/services/blogApi';
import { adminApi } from '@/services/adminApi';
import type { BlogPost, BlogReport } from '@/types/blog';

const TABS = ['Bài Học', 'Diễn Đàn', 'Báo Cáo'] as const;
type Tab = (typeof TABS)[number];

export default function StaffScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('Bài Học');
  const [loading, setLoading] = useState(true);

  // Lessons
  const [lessons, setLessons] = useState<any[]>([]);

  // Blog moderation
  const [pendingPosts, setPendingPosts] = useState<BlogPost[]>([]);
  const [pendingReports, setPendingReports] = useState<BlogReport[]>([]);

  const [rejectFeedback, setRejectFeedback] = useState('');
  const [rejectingPostId, setRejectingPostId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || (user.role !== 'staff' && user.role !== 'admin')) return;
    loadData();
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'Bài Học') {
        const l = await adminApi.getLessons();
        setLessons(l);
      } else if (activeTab === 'Diễn Đàn') {
        const posts = await blogApi.getPendingPosts();
        setPendingPosts(posts.data || []);
      } else if (activeTab === 'Báo Cáo') {
        const reports = await blogApi.getPendingReports();
        setPendingReports(reports.data || []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const handleApprovePost = async (id: string) => {
    try {
      await blogApi.approvePost(id);
      Alert.alert('Đã duyệt', 'Bài viết đã được phê duyệt.');
      loadData();
    } catch { Alert.alert('Lỗi', 'Không thể duyệt bài viết.'); }
  };

  const handleRejectPost = (id: string) => {
    setRejectingPostId(id);
    Alert.alert(
      'Từ chối bài viết',
      'Bạn có chắc muốn từ chối bài viết này?',
      [
        { text: 'Hủy', style: 'cancel', onPress: () => setRejectingPostId(null) },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: async () => {
            try {
              await blogApi.rejectPost(id, 'Bài viết không đạt yêu cầu kiểm duyệt.');
              Alert.alert('Đã từ chối', 'Bài viết đã bị từ chối.');
              loadData();
            } catch { Alert.alert('Lỗi', 'Không thể từ chối bài viết.'); }
          },
        },
      ],
    );
  };

  const handleRemovePost = async (id: string) => {
    Alert.alert('Xác nhận', 'Xóa bài viết vi phạm?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { await blogApi.removePost(id); loadData(); } },
    ]);
  };

  const handleResolveReport = async (id: string, action: 'delete' | 'dismiss') => {
    await blogApi.resolveReport(id, action);
    loadData();
  };

  if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
    return (
      <PageBackground style={styles.container}>
        <HeaderBar title="Nhân Viên" showBack />
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={Colors.light.textMuted} />
          <Text style={styles.errorText}>Bạn không có quyền truy cập.</Text>
        </View>
      </PageBackground>
    );
  }

  return (
    <PageBackground style={styles.container}>
      <HeaderBar title="Nhân Viên" showBack />

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
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Lessons Tab */}
          {activeTab === 'Bài Học' && (
            <>
              <View style={styles.menuGrid}>
                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin')}>
                  <Ionicons name="add-circle-outline" size={32} color={Colors.light.goldDark} />
                  <Text style={styles.menuLabel}>Tạo Lesson</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin')}>
                  <Ionicons name="musical-notes-outline" size={32} color={Colors.light.goldDark} />
                  <Text style={styles.menuLabel}>Tạo Podcast</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionTitle}>Bài Học Hiện Có ({lessons.length})</Text>
              {lessons.map((l) => (
                <View key={l._id} style={styles.card}>
                  <Text style={styles.cardTitle}>{l.title}</Text>
                  <Text style={styles.cardDate}>{new Date(l.createdAt).toLocaleDateString('vi-VN')}</Text>
                </View>
              ))}
            </>
          )}

          {/* Blog Tab */}
          {activeTab === 'Diễn Đàn' && pendingPosts.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>Không có bài viết nào cần duyệt.</Text>
            </View>
          ) : activeTab === 'Diễn Đàn' && pendingPosts.map((p) => (
            <View key={p._id} style={styles.card}>
              <Text style={styles.cardTitle}>{p.title}</Text>
              <Text style={styles.cardBody} numberOfLines={3}>{p.content}</Text>
              <Text style={styles.cardAuthor}>{p.author?.name} — {p.category}</Text>
              <View style={styles.actionRow}>
                <GoldButton title="Duyệt" onPress={() => handleApprovePost(p._id)} style={{ flex: 1 }} />
                <GoldButton title="Từ Chối" variant="secondary" onPress={() => handleRejectPost(p._id)} style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => handleRemovePost(p._id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color={Colors.light.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Reports Tab */}
          {activeTab === 'Báo Cáo' && pendingReports.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>Không có báo cáo nào cần xử lý.</Text>
            </View>
          ) : activeTab === 'Báo Cáo' && pendingReports.map((r) => (
            <View key={r._id} style={styles.card}>
              <Text style={styles.cardTitle}>{r.targetType}: {r.reason}</Text>
              <Text style={styles.cardBody}>{r.description || 'Không có mô tả.'}</Text>
              <Text style={styles.cardAuthor}>Bởi: {r.reporter?.name}</Text>
              <View style={styles.actionRow}>
                <GoldButton title="Xóa ND" variant="secondary" onPress={() => handleResolveReport(r._id, 'delete')} style={{ flex: 1 }} />
                <GoldButton title="Bỏ Qua" variant="ghost" onPress={() => handleResolveReport(r._id, 'dismiss')} style={{ flex: 1 }} />
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: Colors.light.textMuted, fontSize: FontSizes.md, textAlign: 'center' },
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
  sectionTitle: { color: Colors.light.textMain, fontSize: FontSizes.md, fontWeight: '700', marginTop: Spacing.md, marginBottom: Spacing.sm },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: Spacing.md },
  menuItem: {
    width: '47%',
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  menuLabel: { color: Colors.light.textMuted, fontSize: FontSizes.sm, fontWeight: '600', textAlign: 'center' },
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardTitle: { color: Colors.light.textMain, fontSize: FontSizes.md, fontWeight: '600' },
  cardBody: { color: Colors.light.textMuted, fontSize: FontSizes.sm, marginTop: 4 },
  cardDate: { color: Colors.light.textDim, fontSize: FontSizes.xs, marginTop: 4 },
  cardAuthor: { color: Colors.light.textDim, fontSize: FontSizes.xs, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  deleteBtn: { padding: 8 },
});

