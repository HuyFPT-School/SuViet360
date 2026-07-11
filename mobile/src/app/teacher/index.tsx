import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { PageBackground } from '@/components/PageBackground';
import GoldButton from '@/components/ui/GoldButton';
import HeaderBar from '@/components/ui/HeaderBar';
import { useAuth } from '@/hooks/useAuth';
import { teacherReviewApi, rejectionSuggestions, type TeacherReviewItem, type ReviewStatus } from '@/services/teacherReviewApi';
import { useRouter } from 'expo-router';

const STATUS_OPTIONS: Array<{ value: ReviewStatus | 'All'; label: string }> = [
  { value: 'Pending_Review', label: 'Chờ duyệt' },
  { value: 'Published', label: 'Đã xuất bản' },
  { value: 'Rejected', label: 'Bị từ chối' },
  { value: 'All', label: 'Tất cả' },
];

const TYPE_OPTIONS = [
  { value: 'All', label: 'Tất cả' },
  { value: 'Lesson', label: 'Bài học' },
  { value: 'Podcast', label: 'Podcast' },
];

function formatDate(value?: string) {
  if (!value) return 'Chưa có';
  return new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStatusLabel(s: ReviewStatus) {
  if (s === 'Pending_Review') return 'Chờ duyệt';
  if (s === 'Published') return 'Đã xuất bản';
  return 'Bị từ chối';
}

export default function TeacherScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [items, setItems] = useState<TeacherReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'All'>('Pending_Review');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Lesson' | 'Podcast'>('All');
  const [query, setQuery] = useState('');

  // Rejection modal
  const [rejectingItem, setRejectingItem] = useState<TeacherReviewItem | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  // Details modal
  const [viewingItem, setViewingItem] = useState<TeacherReviewItem | null>(null);

  const playPauseAudio = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Lỗi', 'Không thể mở link audio.');
    }
  };

  const closeViewModal = () => {
    setViewingItem(null);
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await teacherReviewApi.getReviewItems();
      setItems(res.data);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách bài học cần duyệt.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'teacher') return;
    loadItems();
  }, [user]);

  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter !== 'All') list = list.filter((i) => i.status === statusFilter);
    if (typeFilter !== 'All') list = list.filter((i) => i.type === typeFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((i) => i.title.toLowerCase().includes(q));
    }
    return list;
  }, [items, statusFilter, typeFilter, query]);

  const handleApprove = async (item: TeacherReviewItem) => {
    setSaving(true);
    try {
      await teacherReviewApi.approveContent(item.id, item.type);
      Alert.alert('Thành công', 'Nội dung đã được phê duyệt.');
      closeViewModal();
      await loadItems();
    } catch {
      Alert.alert('Lỗi', 'Không thể phê duyệt.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingItem || !feedback.trim()) {
      setFeedbackError('Vui lòng nhập lý do từ chối.');
      return;
    }
    setSaving(true);
    try {
      await teacherReviewApi.rejectContent(rejectingItem.id, rejectingItem.type, feedback.trim());
      Alert.alert('Đã từ chối', 'Nội dung đã bị từ chối.');
      setRejectingItem(null);
      setFeedback('');
      setFeedbackError('');
      closeViewModal();
      await loadItems();
    } catch {
      Alert.alert('Lỗi', 'Không thể từ chối nội dung.');
    } finally {
      setSaving(false);
    }
  };

  // Role guard
  if (isLoading || !user) {
    return (
      <PageBackground style={styles.container}>
        <HeaderBar title="Kiểm Duyệt" showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      </PageBackground>
    );
  }

  if (user.role !== 'teacher') {
    return (
      <PageBackground style={styles.container}>
        <HeaderBar title="Kiểm Duyệt" showBack />
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={Colors.light.textMuted} />
          <Text style={styles.errorText}>Bạn không có quyền truy cập trang này.</Text>
        </View>
      </PageBackground>
    );
  }

  const renderItem = ({ item }: { item: TeacherReviewItem }) => (
    <TouchableOpacity style={styles.itemCard} onPress={() => setViewingItem(item)}>
      <View style={styles.itemHeader}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.itemType}>{item.type === 'Lesson' ? 'Bài Học' : 'Podcast'}</Text>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'Pending_Review' ? Colors.light.gold + '33' : item.status === 'Published' ? Colors.light.successBg : Colors.light.errorBg }]}>
          <Text style={[styles.statusText, { color: item.status === 'Pending_Review' ? Colors.light.gold : item.status === 'Published' ? Colors.light.success : Colors.light.error }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>
      <Text style={styles.itemSummary} numberOfLines={3}>{item.summary}</Text>
      <View style={styles.itemMeta}>
        <Text style={styles.metaText}>Tạo bởi: {item.createdBy}</Text>
        <Text style={styles.metaText}>{formatDate(item.submittedAt)}</Text>
      </View>
      {!!item.reviewFeedback && (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackText}>📝 {item.reviewFeedback}</Text>
        </View>
      )}
        <View style={styles.itemActions}>
          <GoldButton
            title="Xem chi tiết"
            onPress={() => setViewingItem(item)}
            style={{ flex: 1 }}
          />
        </View>
    </TouchableOpacity>
  );

  return (
    <PageBackground style={styles.container}>
      <HeaderBar title="Kiểm Duyệt" showBack />

      {/* Filters */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {STATUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.filterPill, statusFilter === opt.value && styles.filterPillActive]}
              onPress={() => setStatusFilter(opt.value)}
            >
              <Text style={[styles.filterText, statusFilter === opt.value && styles.filterTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.filterPill, typeFilter === opt.value && styles.filterPillActive]}
              onPress={() => setTypeFilter(opt.value as 'All' | 'Lesson' | 'Podcast')}
            >
              <Text style={[styles.filterText, typeFilter === opt.value && styles.filterTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Tìm kiếm..."
        placeholderTextColor={Colors.light.textMuted}
        value={query}
        onChangeText={setQuery}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={48} color={Colors.light.textMuted} />
          <Text style={styles.errorText}>Không có nội dung nào cần duyệt.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* View Details Modal */}
      <Modal visible={!!viewingItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết: {viewingItem?.title}</Text>
              <TouchableOpacity onPress={closeViewModal}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Tóm tắt / Nội dung:</Text>
              <Text style={styles.detailText}>{viewingItem?.summary}</Text>
              
              {viewingItem?.type === 'Lesson' && viewingItem.game && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.label}>Cấu hình Game (JSON):</Text>
                  <View style={styles.jsonBox}>
                    <Text style={styles.jsonText}>{JSON.stringify(viewingItem.game, null, 2)}</Text>
                  </View>
                </View>
              )}

              {viewingItem?.type === 'Podcast' && viewingItem.podcastDetails && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.label}>Audio:</Text>
                  <TouchableOpacity style={styles.audioBtn} onPress={() => playPauseAudio(viewingItem.podcastDetails!.audioUrl)}>
                    <Ionicons name="play-circle" size={32} color={Colors.light.gold} />
                    <Text style={styles.audioBtnText}>Nghe thử (Mở trình duyệt)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
            
            {viewingItem?.status === 'Pending_Review' && (
              <View style={styles.itemActions}>
                <GoldButton
                  title="Phê Duyệt"
                  onPress={() => handleApprove(viewingItem)}
                  loading={saving}
                  disabled={saving}
                  style={{ flex: 1 }}
                />
                <GoldButton
                  title="Từ Chối"
                  variant="secondary"
                  onPress={() => { setRejectingItem(viewingItem); setFeedback(''); setFeedbackError(''); }}
                  style={{ flex: 1 }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Rejection Modal */}
      <Modal visible={!!rejectingItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Từ chối: {rejectingItem?.title}</Text>
              <TouchableOpacity onPress={() => setRejectingItem(null)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Chọn lý do</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {rejectionSuggestions.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestionPill, feedback === s && styles.suggestionPillActive]}
                  onPress={() => { setFeedback(s); setFeedbackError(''); }}
                >
                  <Text style={[styles.suggestionText, feedback === s && styles.suggestionTextActive]} numberOfLines={2}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Hoặc nhập phản hồi khác..."
              placeholderTextColor={Colors.light.textMuted}
              value={feedback}
              onChangeText={(t) => { setFeedback(t); setFeedbackError(''); }}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {feedbackError ? <Text style={styles.errorMsg}>{feedbackError}</Text> : null}
            <GoldButton title="Xác Nhận Từ Chối" onPress={handleReject} loading={saving} disabled={saving} />
          </View>
        </View>
      </Modal>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: Colors.light.textMuted, fontSize: FontSizes.md, marginTop: 12, textAlign: 'center' },
  filterRow: { paddingHorizontal: Spacing.md, marginBottom: 6 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
  },
  filterPillActive: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  filterText: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
  filterTextActive: { color: Colors.light.backgroundDark, fontWeight: '700' },
  searchInput: {
    margin: Spacing.md,
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    color: Colors.light.textMain,
    fontSize: FontSizes.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  listContent: { padding: Spacing.md, paddingTop: 0 },
  itemCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemType: { color: Colors.light.gold, fontSize: FontSizes.xs, fontWeight: '600' },
  itemTitle: { color: Colors.light.textMain, fontSize: FontSizes.md, fontWeight: '700', maxWidth: '80%' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  itemSummary: { color: Colors.light.textMuted, fontSize: FontSizes.sm, marginBottom: 8 },
  itemMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metaText: { color: Colors.light.textDim, fontSize: FontSizes.xs },
  feedbackBox: { backgroundColor: Colors.light.backgroundCardAlt, borderRadius: BorderRadius.sm, padding: 8, marginBottom: 8 },
  feedbackText: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
  itemActions: { flexDirection: 'row', gap: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.light.backgroundCardAlt,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: { color: Colors.light.textMain, fontSize: FontSizes.md, fontWeight: '700', flex: 1 },
  label: { color: Colors.light.textMuted, fontSize: FontSizes.sm, marginBottom: 8 },
  suggestionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    marginRight: 8,
    maxWidth: 200,
  },
  suggestionPillActive: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  suggestionText: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
  suggestionTextActive: { color: Colors.light.backgroundDark, fontWeight: '600' },
  feedbackInput: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    color: Colors.light.textMain,
    fontSize: FontSizes.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 80,
    marginBottom: 12,
  },
  errorMsg: { color: Colors.light.error, fontSize: FontSizes.xs, marginBottom: 8 },
  detailText: { color: Colors.light.textMain, fontSize: FontSizes.sm, lineHeight: 20 },
  jsonBox: {
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: BorderRadius.md,
    marginTop: 8,
  },
  jsonText: { color: '#D4D4D4', fontSize: FontSizes.xs, fontFamily: 'monospace' },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundCard,
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    marginTop: 8,
  },
  audioBtnText: { color: Colors.light.textMain, fontSize: FontSizes.sm, marginLeft: 8, fontWeight: '600' },
});
