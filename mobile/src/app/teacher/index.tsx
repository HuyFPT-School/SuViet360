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
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { PageBackground } from '@/components/PageBackground';
import GoldButton from '@/components/ui/GoldButton';
import HeaderBar from '@/components/ui/HeaderBar';
import { useAuth } from '@/hooks/useAuth';
import { teacherReviewApi, rejectionSuggestions, type TeacherReviewItem, type ReviewStatus } from '@/services/teacherReviewApi';
import { subscriptionApi } from '@/services/subscriptionApi';
import type { LessonRequest } from '@/types/subscription';
import { useRouter } from 'expo-router';
import { adminApi } from '@/services/adminApi';

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

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Rejection modal
  const [rejectingItem, setRejectingItem] = useState<TeacherReviewItem | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  // Details modal
  const [viewingItem, setViewingItem] = useState<TeacherReviewItem | null>(null);

  // ─── Dashboard tabs ──────────────────────────────────
  const [activeTab, setActiveTab] = useState<'reviews' | 'requests'>('reviews');

  // ─── Requests state ──────────────────────────────────
  const [requests, setRequests] = useState<LessonRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [completingRequestId, setCompletingRequestId] = useState<string | null>(null);
  const [selectedPodcastId, setSelectedPodcastId] = useState('');
  const [availablePodcasts, setAvailablePodcasts] = useState<any[]>([]);
  const [requestModalVisible, setRequestModalVisible] = useState(false);

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

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await subscriptionApi.getTeacherLessonRequests();
      setRequests(data);
      const podcastsRes = await adminApi.getPodcasts();
      setAvailablePodcasts(podcastsRes || []);
    } catch {
      Alert.alert('Lỗi', 'Không thể tải danh sách yêu cầu.');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (!user || !['teacher', 'admin'].includes(user.role)) return;
    if (activeTab === 'reviews') loadItems();
    else loadRequests();
  }, [user, activeTab]);

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

  const stats = useMemo(() => ({
    pending: items.filter(i => i.status === 'Pending_Review').length,
    published: items.filter(i => i.status === 'Published').length,
    rejected: items.filter(i => i.status === 'Rejected').length,
    total: items.length,
  }), [items]);

  // ─── Request handlers ─────────────────────────────
  const handleAcceptRequest = async (id: string) => {
    setSaving(true);
    try { await subscriptionApi.acceptLessonRequest(id); Alert.alert('OK', 'Đã nhận yêu cầu!'); loadRequests(); }
    catch { Alert.alert('Lỗi', 'Không thể nhận yêu cầu.'); }
    finally { setSaving(false); }
  };

  const handleStartRequest = async (id: string) => {
    setSaving(true);
    try { await subscriptionApi.startLessonRequest(id); Alert.alert('OK', 'Đã bắt đầu soạn thảo!'); loadRequests(); }
    catch { Alert.alert('Lỗi', 'Không thể bắt đầu.'); }
    finally { setSaving(false); }
  };

  const handleRejectRequestSubmit = async () => {
    if (!rejectReason.trim()) { setFeedbackError('Nhập lý do từ chối.'); return; }
    setSaving(true);
    try { await subscriptionApi.rejectLessonRequest(rejectingRequestId!, rejectReason.trim()); Alert.alert('OK', 'Đã từ chối.'); setRejectingRequestId(null); setRejectReason(''); loadRequests(); }
    catch { Alert.alert('Lỗi', 'Không thể từ chối.'); }
    finally { setSaving(false); }
  };

  const handleCompleteRequest = async () => {
    if (!selectedPodcastId) { setFeedbackError('Chọn podcast liên kết.'); return; }
    setSaving(true);
    try { await subscriptionApi.completeLessonRequest(completingRequestId!, selectedPodcastId); Alert.alert('OK', 'Đã hoàn thành!'); setCompletingRequestId(null); setSelectedPodcastId(''); loadRequests(); }
    catch { Alert.alert('Lỗi', 'Không thể hoàn thành.'); }
    finally { setSaving(false); }
  };

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

  if (user.role !== 'teacher' && user.role !== 'admin') {
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

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}><Text style={styles.statNum}>{stats.pending}</Text><Text style={styles.statLabel}>Chờ duyệt</Text></View>
        <View style={styles.statBox}><Text style={styles.statNum}>{stats.published}</Text><Text style={styles.statLabel}>Đã xuất bản</Text></View>
        <View style={styles.statBox}><Text style={styles.statNum}>{stats.rejected}</Text><Text style={styles.statLabel}>Từ chối</Text></View>
        <View style={styles.statBox}><Text style={styles.statNum}>{stats.total}</Text><Text style={styles.statLabel}>Tổng</Text></View>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'reviews' && styles.tabBtnActive]} onPress={() => setActiveTab('reviews')}>
          <Text style={[styles.tabBtnText, activeTab === 'reviews' && styles.tabBtnTextActive]}>Duyệt nội dung</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'requests' && styles.tabBtnActive]} onPress={() => setActiveTab('requests')}>
          <Text style={[styles.tabBtnText, activeTab === 'requests' && styles.tabBtnTextActive]}>Yêu cầu bài học</Text>
        </TouchableOpacity>
      </View>

      {/* Reviews tab */}
      {activeTab === 'reviews' && (
        <>
          {/* ── Smart filter bar ── */}
          <View style={styles.filterBar}>
            <View style={styles.filterSearchWrapper}>
              <Ionicons name="search" size={16} color={Colors.light.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.filterSearchInput}
                placeholder="Tìm kiếm..."
                placeholderTextColor={Colors.light.textMuted}
                value={query}
                onChangeText={setQuery}
              />
              {query !== '' && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={16} color={Colors.light.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.filterToggle, showFilterPanel && styles.filterToggleActive]}
              onPress={() => setShowFilterPanel(!showFilterPanel)}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={showFilterPanel ? Colors.light.backgroundDark : Colors.light.gold}
              />
              {(statusFilter !== 'All' || typeFilter !== 'All') && (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountText}>
                    {(statusFilter !== 'All' ? 1 : 0) + (typeFilter !== 'All' ? 1 : 0)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Expandable filter panel ── */}
          {showFilterPanel && (
            <View style={styles.filterPanel}>
              <View style={styles.filterPanelSection}>
                <Text style={styles.filterPanelLabel}>Trạng thái</Text>
                <View style={styles.filterChipRow}>
                  {STATUS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.filterChip, statusFilter === opt.value && styles.filterChipActive]}
                      onPress={() => setStatusFilter(opt.value)}
                    >
                      <Text style={[styles.filterChipText, statusFilter === opt.value && styles.filterChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterPanelSection}>
                <Text style={styles.filterPanelLabel}>Loại</Text>
                <View style={styles.filterChipRow}>
                  {TYPE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.filterChip, typeFilter === opt.value && styles.filterChipActive]}
                      onPress={() => setTypeFilter(opt.value as 'All' | 'Lesson' | 'Podcast')}
                    >
                      <Text style={[styles.filterChipText, typeFilter === opt.value && styles.filterChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {(statusFilter !== 'All' || typeFilter !== 'All') && (
                <TouchableOpacity
                  style={styles.filterClearBtn}
                  onPress={() => { setStatusFilter('All'); setTypeFilter('All'); }}
                >
                  <Ionicons name="close-circle-outline" size={14} color={Colors.light.error} />
                  <Text style={styles.filterClearText}>Xóa bộ lọc</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Active filter summary (collapsed) ── */}
          {!showFilterPanel && (statusFilter !== 'All' || typeFilter !== 'All') && (
            <View style={styles.filterActiveRow}>
              {statusFilter !== 'All' && (
                <View style={styles.filterActiveTag}>
                  <Text style={styles.filterActiveTagText}>
                    {STATUS_OPTIONS.find(o => o.value === statusFilter)?.label}
                  </Text>
                  <TouchableOpacity onPress={() => setStatusFilter('All')}>
                    <Ionicons name="close" size={12} color={Colors.light.backgroundDark} />
                  </TouchableOpacity>
                </View>
              )}
              {typeFilter !== 'All' && (
                <View style={styles.filterActiveTag}>
                  <Text style={styles.filterActiveTagText}>
                    {TYPE_OPTIONS.find(o => o.value === typeFilter)?.label}
                  </Text>
                  <TouchableOpacity onPress={() => setTypeFilter('All')}>
                    <Ionicons name="close" size={12} color={Colors.light.backgroundDark} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

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
        </>
      )}

      {/* Requests tab */}
      {activeTab === 'requests' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md }}>
          {loadingRequests ? (
            <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.gold} /></View>
          ) : requests.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="mail-outline" size={48} color={Colors.light.textMuted} />
              <Text style={styles.errorText}>Không có yêu cầu bài học nào.</Text>
            </View>
          ) : requests.map((req) => {
            const requesterName = typeof req.requesterId === 'object' && req.requesterId
              ? req.requesterId.name
              : typeof req.requesterId === 'string'
                ? req.requesterId
                : 'N/A';

            const statusColor = req.status === 'Pending' ? Colors.light.gold + '33'
              : req.status === 'InProgress' ? '#7bb3d933'
              : '#d1fae5';
            const statusTextColor = req.status === 'Pending' ? Colors.light.gold
              : req.status === 'InProgress' ? '#1e5a8b'
              : '#065f46';
            const statusLabel = req.status === 'Pending' ? 'Chờ nhận'
              : req.status === 'InProgress' ? 'Đang soạn'
              : req.status === 'Completed' ? 'Hoàn thành'
              : req.status === 'Rejected' ? 'Bị từ chối'
              : 'Đã nhận';

            return (
            <View key={req._id} style={styles.requestCard}>
              <Text style={styles.cardTitle}>{req.title}</Text>
              <Text style={styles.cardBody} numberOfLines={3}>{req.description}</Text>
              <Text style={styles.metaText}>Người yêu cầu: {requesterName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={[styles.statusText, { color: statusTextColor }]}>
                  {statusLabel}
                </Text>
              </View>
              <View style={styles.itemActions}>
                {req.status === 'Pending' && (
                  <>
                    <GoldButton title="Nhận" onPress={() => handleAcceptRequest(req._id)} loading={saving} style={{ flex: 1 }} />
                    <GoldButton title="Từ chối" variant="secondary" onPress={() => { setRejectingRequestId(req._id); setRejectReason(''); }} style={{ flex: 1 }} />
                  </>
                )}
                {req.status === 'InProgress' && (
                  <>
                    <GoldButton title="Bắt đầu" onPress={() => handleStartRequest(req._id)} loading={saving} style={{ flex: 1 }} />
                    <GoldButton title="Hoàn thành" variant="secondary" onPress={() => { setCompletingRequestId(req._id); setSelectedPodcastId(''); setRequestModalVisible(true); }} style={{ flex: 1 }} />
                  </>
                )}
              </View>
            </View>
            );
          })}
        </ScrollView>
      )}

      {/* View Details Modal */}
      <Modal visible={!!viewingItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailKicker}>
                  Chi tiết {viewingItem?.type === 'Lesson' ? 'game' : 'podcast'}
                </Text>
                <Text style={styles.modalTitle}>{viewingItem?.title}</Text>
              </View>
              <TouchableOpacity onPress={closeViewModal}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginBottom: 16 }} showsVerticalScrollIndicator={false}>
              {/* Info rows */}
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Loại nội dung</Text>
                <Text style={styles.detailInfoValue}>
                  {viewingItem?.type === 'Lesson' ? 'Game' : viewingItem?.type}
                </Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Người tạo</Text>
                <Text style={styles.detailInfoValue}>{viewingItem?.createdBy}</Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Ngày gửi duyệt</Text>
                <Text style={styles.detailInfoValue}>{formatDate(viewingItem?.submittedAt)}</Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Trạng thái hiện tại</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.statusBadge, { backgroundColor: viewingItem?.status === 'Pending_Review' ? Colors.light.gold + '33' : viewingItem?.status === 'Published' ? Colors.light.successBg : Colors.light.errorBg }]}>
                    <Text style={[styles.statusText, { color: viewingItem?.status === 'Pending_Review' ? Colors.light.gold : viewingItem?.status === 'Published' ? Colors.light.success : Colors.light.error }]}>
                      {viewingItem ? getStatusLabel(viewingItem.status) : ''}
                    </Text>
                  </View>
                  {viewingItem?.isDraftUpdate && (
                    <View style={styles.draftBadge}>
                      <Text style={styles.draftBadgeText}>Bản thảo chỉnh sửa</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Summary */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Nội dung tóm tắt</Text>
                <Text style={styles.detailText}>{viewingItem?.summary}</Text>
              </View>

              {/* Review feedback */}
              {!!viewingItem?.reviewFeedback && (
                <View style={styles.detailFeedbackBox}>
                  <Text style={styles.detailFeedbackLabel}>Phản hồi từ chối</Text>
                  <Text style={styles.detailFeedbackText}>{viewingItem.reviewFeedback}</Text>
                </View>
              )}

              {/* ─── Lesson / Game preview ─── */}
              {viewingItem?.type === 'Lesson' && viewingItem.game && (
                <View style={styles.detailGameSection}>
                  <View style={styles.detailGameHeader}>
                    <Text style={styles.detailSectionTitle}>Game trong lesson</Text>
                    <Text style={styles.detailGameSubtitle}>Tilemap + assets</Text>
                  </View>

                  {/* Điểm xuất hiện */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Điểm xuất hiện</Text>
                    <Text style={styles.detailText}>
                      X: {viewingItem.game.spawnPoint.x}, Y: {viewingItem.game.spawnPoint.y}
                    </Text>
                  </View>

                  {/* Tilemap JSON */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Bản đồ JSON</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(viewingItem.game!.tilemapJsonUrl)}>
                      <Text style={styles.detailLink} numberOfLines={2}>
                        {viewingItem.game.tilemapJsonUrl}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Tilesets */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Tilesets</Text>
                    {viewingItem.game.tilesets.length > 0 ? (
                      <View style={styles.detailAssetGrid}>
                        {viewingItem.game.tilesets.map((ts) => (
                          <View key={ts.name} style={styles.detailAssetCard}>
                            {/* eslint-disable-next-line jsx-a11y/alt-text */}
                            <Image
                              source={{ uri: ts.imageUrl }}
                              style={styles.detailAssetImage}
                              resizeMode="contain"
                            />
                            <Text style={styles.detailAssetName} numberOfLines={1}>{ts.name}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.detailNote}>Bài học chưa có tileset.</Text>
                    )}
                  </View>

                  {/* Hoạt ảnh */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Hoạt ảnh</Text>
                    {Object.keys(viewingItem.game.character.animations || {}).length > 0 ? (
                      Object.entries(viewingItem.game.character.animations).map(([name, frames]) => (
                        <View key={name} style={{ marginBottom: 12 }}>
                          <Text style={styles.detailAnimName}>{name}</Text>
                          <View style={styles.detailAssetGrid}>
                            {frames.slice(0, 6).map((frame: any) => (
                              <View key={frame.key} style={styles.detailAssetCard}>
                                <Image
                                  source={{ uri: frame.imageUrl }}
                                  style={styles.detailAssetImage}
                                  resizeMode="contain"
                                />
                                <Text style={styles.detailAssetName} numberOfLines={1}>{frame.key}</Text>
                              </View>
                            ))}
                          </View>
                          {frames.length > 6 && (
                            <Text style={styles.detailNote}>+{frames.length - 6} frame khác</Text>
                          )}
                        </View>
                      ))
                    ) : (
                      <Text style={styles.detailNote}>Bài học chưa có hoạt ảnh nhân vật.</Text>
                    )}
                  </View>
                </View>
              )}

              {/* ─── Podcast preview ─── */}
              {viewingItem?.type === 'Podcast' && viewingItem.podcastDetails && (
                <View style={styles.detailGameSection}>
                  <View style={styles.detailGameHeader}>
                    <Text style={styles.detailSectionTitle}>Tài nguyên Podcast</Text>
                    <Text style={styles.detailGameSubtitle}>Tệp âm thanh & ảnh đại diện</Text>
                  </View>

                  {/* Thumbnail */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Ảnh giao diện</Text>
                    <Image
                      source={{ uri: viewingItem.podcastDetails.thumbnail }}
                      style={styles.detailPodcastThumbnail}
                      resizeMode="cover"
                    />
                  </View>

                  {/* Audio */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Trình phát âm thanh</Text>
                    <TouchableOpacity style={styles.audioBtn} onPress={() => playPauseAudio(viewingItem.podcastDetails!.audioUrl)}>
                      <Ionicons name="play-circle" size={32} color={Colors.light.gold} />
                      <Text style={styles.audioBtnText}>Nghe thử (Mở trình duyệt)</Text>
                    </TouchableOpacity>
                    <Text style={styles.detailAudioDuration}>
                      Thời lượng: {formatDuration(viewingItem.podcastDetails.duration)}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Thông tin chi tiết</Text>
                    <View style={styles.detailPodcastInfoRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailInfoLabel}>Chủ đề:</Text>
                        <Text style={styles.detailInfoValue}>{viewingItem.podcastDetails.category}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailInfoLabel}>Trình độ:</Text>
                        <Text style={styles.detailInfoValue}>{viewingItem.podcastDetails.level}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Linked game */}
                  {viewingItem.podcastDetails.lessonId && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Game liên kết</Text>
                      <Text style={styles.detailText}>
                        {typeof viewingItem.podcastDetails.lessonId === 'object'
                          ? viewingItem.podcastDetails.lessonId.title
                          : 'Đã liên kết với Game'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
            
            {viewingItem?.status === 'Pending_Review' ? (
              <View style={styles.itemActions}>
                <GoldButton
                  title="Phê duyệt"
                  onPress={() => handleApprove(viewingItem!)}
                  loading={saving}
                  disabled={saving}
                  style={{ flex: 1 }}
                />
                <GoldButton
                  title="Từ chối"
                  variant="secondary"
                  onPress={() => { setRejectingItem(viewingItem); setFeedback(''); setFeedbackError(''); }}
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              <Text style={styles.detailNote}>
                Mục này đã {viewingItem?.status === 'Published' ? 'được duyệt' : 'bị từ chối'}, Giáo viên chỉ có quyền xem lại.
              </Text>
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

      {/* Rejection Request Modal */}
      <Modal visible={!!rejectingRequestId} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Từ chối yêu cầu</Text>
              <TouchableOpacity onPress={() => setRejectingRequestId(null)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <TextInput style={styles.feedbackInput} placeholder="Lý do từ chối..." placeholderTextColor={Colors.light.textMuted} value={rejectReason} onChangeText={setRejectReason} multiline />
            {feedbackError ? <Text style={styles.errorMsg}>{feedbackError}</Text> : null}
            <GoldButton title="Xác nhận từ chối" onPress={handleRejectRequestSubmit} loading={saving} />
          </View>
        </View>
      </Modal>

      {/* Complete Request Modal */}
      <Modal visible={requestModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hoàn thành yêu cầu</Text>
              <TouchableOpacity onPress={() => setRequestModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Chọn podcast liên kết:</Text>
            <ScrollView style={{ maxHeight: 200, marginBottom: 12 }}>
              {availablePodcasts.map((p: any) => (
                <TouchableOpacity key={p._id} style={[styles.podcastOption, selectedPodcastId === p._id && styles.podcastOptionActive]} onPress={() => setSelectedPodcastId(p._id)}>
                  <Text style={[styles.podcastOptionText, selectedPodcastId === p._id && styles.podcastOptionTextActive]}>{p.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {feedbackError ? <Text style={styles.errorMsg}>{feedbackError}</Text> : null}
            <GoldButton title="Xác nhận hoàn thành" onPress={handleCompleteRequest} loading={saving} />
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

  // ─── Smart filter bar ──────────────────────────────
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: 6,
    gap: 8,
  },
  filterSearchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterSearchInput: {
    flex: 1,
    color: Colors.light.textMain,
    fontSize: FontSizes.sm,
    paddingVertical: 2,
  },
  filterToggle: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    backgroundColor: Colors.light.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterToggleActive: {
    backgroundColor: Colors.light.gold,
    borderColor: Colors.light.goldDark,
  },
  filterCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.light.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  filterPanel: {
    marginHorizontal: Spacing.md,
    marginBottom: 8,
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.sm,
  },
  filterPanelSection: { marginBottom: 8 },
  filterPanelLabel: {
    color: Colors.light.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundCardAlt,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
  },
  filterChipActive: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  filterChipText: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
  filterChipTextActive: { color: Colors.light.backgroundDark, fontWeight: '700' },
  filterClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  filterClearText: { color: Colors.light.error, fontSize: FontSizes.xs, fontWeight: '600' },

  // Active filter tags (collapsed)
  filterActiveRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginHorizontal: Spacing.md,
    marginBottom: 8,
  },
  filterActiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  filterActiveTagText: { color: Colors.light.backgroundDark, fontSize: 11, fontWeight: '600' },
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

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 6, marginBottom: Spacing.sm },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.md, padding: 10, borderWidth: 1, borderColor: Colors.light.panelBorder },
  statNum: { color: Colors.light.gold, fontSize: FontSizes.xl, fontWeight: '700' },
  statLabel: { color: Colors.light.textMuted, fontSize: 10, marginTop: 2 },

  // Tabs
  tabRow: { flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.sm, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.light.panelBorder, backgroundColor: Colors.light.backgroundCard },
  tabBtnActive: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  tabBtnText: { color: Colors.light.textMuted, fontSize: FontSizes.xs, fontWeight: '600' },
  tabBtnTextActive: { color: Colors.light.backgroundDark },

  // Request cards
  requestCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardTitle: { color: Colors.light.textMain, fontSize: FontSizes.md, fontWeight: '700', marginBottom: 4 },
  cardBody: { color: Colors.light.textMuted, fontSize: FontSizes.sm, marginBottom: 8 },

  // Podcast options
  podcastOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.panelBorder },
  podcastOptionActive: { backgroundColor: '#fef3c7' },
  podcastOptionText: { color: Colors.light.textMain, fontSize: FontSizes.sm },
  podcastOptionTextActive: { color: Colors.light.goldDark, fontWeight: '700' },

  // ─── Detail modal enhanced ───────────────────────
  detailKicker: { color: Colors.light.gold, fontSize: FontSizes.xs, fontWeight: '600', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.panelBorder,
  },
  detailInfoLabel: { color: Colors.light.textMuted, fontSize: FontSizes.sm },
  detailInfoValue: { color: Colors.light.textMain, fontSize: FontSizes.sm, fontWeight: '600' },
  draftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  draftBadgeText: { color: '#92400e', fontSize: 10, fontWeight: '700' },
  detailSection: { marginTop: 16 },
  detailSectionTitle: { color: Colors.light.goldDark, fontSize: FontSizes.sm, fontWeight: '700', marginBottom: 6 },
  detailNote: { color: Colors.light.textMuted, fontSize: FontSizes.xs, fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
  detailFeedbackBox: {
    marginTop: 16,
    backgroundColor: '#fef2f2',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
  },
  detailFeedbackLabel: { color: '#be123c', fontSize: FontSizes.xs, fontWeight: '700', marginBottom: 4 },
  detailFeedbackText: { color: '#7f1d1d', fontSize: FontSizes.sm },
  detailLink: {
    color: '#2563eb',
    fontSize: FontSizes.xs,
    textDecorationLine: 'underline' as const,
    marginTop: 4,
  },
  detailGameSection: {
    marginTop: 16,
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.md,
  },
  detailGameHeader: { marginBottom: 4 },
  detailGameSubtitle: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
  detailAssetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  detailAssetCard: {
    width: 80,
    backgroundColor: Colors.light.backgroundCardAlt,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: 4,
    alignItems: 'center',
  },
  detailAssetImage: { width: 64, height: 48, borderRadius: 4 },
  detailAssetName: { color: Colors.light.textMuted, fontSize: 9, marginTop: 2, textAlign: 'center' },
  detailAnimName: { color: Colors.light.textMain, fontSize: FontSizes.sm, fontWeight: '600', marginBottom: 4, textTransform: 'capitalize' },
  detailPodcastThumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    marginTop: 4,
  },
  detailAudioDuration: { color: Colors.light.textMuted, fontSize: FontSizes.xs, marginTop: 4, fontStyle: 'italic' },
  detailPodcastInfoRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
});
