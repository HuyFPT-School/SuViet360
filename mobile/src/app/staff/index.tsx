import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { PageBackground } from '@/components/PageBackground';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import HeaderBar from '@/components/ui/HeaderBar';
import GoldButton from '@/components/ui/GoldButton';
import AuthInput from '@/components/ui/AuthInput';
import { blogApi } from '@/services/blogApi';
import { adminApi } from '@/services/adminApi';
import type { BlogPost, BlogReport } from '@/types/blog';
import ChapterTab from '@/components/staff/ChapterTab';
import QuizTab from '@/components/staff/QuizTab';

const TABS = ['Bài Học', 'Podcast', 'Diễn Đàn', 'Báo Cáo', 'Chương Học', 'Ngân Hàng Quiz', 'Yêu cầu bài học'] as const;
type Tab = (typeof TABS)[number];

// ─── Helpers ──────────────────────────────────────────
const renderStatusBadge = (status?: string) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    Published: { label: 'Đã duyệt', color: '#065f46', bg: '#d1fae5' },
    Pending_Review: { label: 'Chờ duyệt', color: '#92400e', bg: '#fef3c7' },
    Rejected: { label: 'Từ chối', color: '#9b1c1c', bg: '#fee2e2' },
    Draft: { label: 'Nháp', color: '#374151', bg: '#f3f4f6' },
  };
  const s = map[status || ''] || map.Pending_Review;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.color }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
};

const LEVEL_OPTIONS = [
  { label: 'Dễ (Easy)', value: 'Easy' },
  { label: 'Trung bình (Medium)', value: 'Medium' },
  { label: 'Khó (Hard)', value: 'Hard' },
];

// ─── Main Component ──────────────────────────────────
export default function StaffScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('Bài Học');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ─── Lessons state ──────────────────────────────────
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonFormMode, setLessonFormMode] = useState<'create' | 'edit'>('create');

  // Lesson form fields (mirrors client)
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [spawnX, setSpawnX] = useState('100');
  const [spawnY, setSpawnY] = useState('100');
  const [tilemapFile, setTilemapFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [tilesetFiles, setTilesetFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [tilesetNames, setTilesetNames] = useState<string[]>([]);
  const [idleSprites, setIdleSprites] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [runSprites, setRunSprites] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [lessonSaving, setLessonSaving] = useState(false);
  const [selectedLessonDetail, setSelectedLessonDetail] = useState<any>(null);
  const [loadingLessonDetail, setLoadingLessonDetail] = useState(false);

  // ─── Podcasts state ─────────────────────────────────
  const [podcasts, setPodcasts] = useState<any[]>([]);
  const [selectedPodcastId, setSelectedPodcastId] = useState<string | null>(null);
  const [podcastFormMode, setPodcastFormMode] = useState<'create' | 'edit'>('create');
  const [podcastTitle, setPodcastTitle] = useState('');
  const [podcastDescription, setPodcastDescription] = useState('');
  const [podcastContent, setPodcastContent] = useState('');
  const [podcastLevel, setPodcastLevel] = useState('Medium');
  const [podcastCategory, setPodcastCategory] = useState('');
  const [podcastLessonId, setPodcastLessonId] = useState('');
  const [podcastThumbnail, setPodcastThumbnail] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [podcastAudio, setPodcastAudio] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [podcastSaving, setPodcastSaving] = useState(false);
  const [selectedPodcastDetail, setSelectedPodcastDetail] = useState<any>(null);

  // ─── Blog moderation ────────────────────────────────
  const [pendingPosts, setPendingPosts] = useState<BlogPost[]>([]);
  const [pendingReports, setPendingReports] = useState<BlogReport[]>([]);

  // ─── Lesson Requests (admin view) ───────────────────
  const [lessonRequests, setLessonRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // ─── Categories management ──────────────────────────
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showLessonPicker, setShowLessonPicker] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const categoriesList = React.useMemo(() => {
    const set = new Set<string>();
    podcasts.forEach((p: any) => { if (p.category?.trim()) set.add(p.category.trim()); });
    return Array.from(set);
  }, [podcasts]);

  const selectedLesson = lessons.find((l: any) => l._id === selectedLessonId);
  const selectedPodcast = podcasts.find((p: any) => p._id === selectedPodcastId);

  // ─── Data loading ───────────────────────────────────
  const loadLessons = useCallback(async () => {
    try {
      const l = await adminApi.getLessons();
      setLessons(l);
    } catch { /* ignore */ }
  }, []);

  const loadPodcasts = useCallback(async () => {
    try {
      const p = await adminApi.getPodcasts();
      setPodcasts(p);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user || (user.role !== 'staff' && user.role !== 'admin')) return;
    setLoading(true);
    Promise.all([
      activeTab === 'Bài Học' || activeTab === 'Podcast' ? loadLessons() : Promise.resolve(),
      activeTab === 'Podcast' ? loadPodcasts() : Promise.resolve(),
      activeTab === 'Diễn Đàn' ? blogApi.getPendingPosts().then(r => setPendingPosts(r.data || [])).catch(() => { }) : Promise.resolve(),
      activeTab === 'Báo Cáo' ? blogApi.getPendingReports().then(r => setPendingReports(r.data || [])).catch(() => { }) : Promise.resolve(),
      activeTab === 'Yêu cầu bài học' ? loadLessonRequests() : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [user, activeTab]);

  // ─── Lesson requests load ───────────────────────────
  const loadLessonRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const { subscriptionApi: subApi } = await import('@/services/subscriptionApi');
      const data = await subApi.getAdminLessonRequests();
      setLessonRequests(data);
    } catch {
      setMessage({ type: 'error', text: 'Không thể tải yêu cầu bài học.' });
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  // ─── Design game from lesson request ────────────────
  const handleDesignGame = (req: any) => {
    setLessonTitle(`Game cho: ${req.title}`);
    setLessonContent(`Thiết kế game đồng hành cùng podcast "${req.title}" thuộc thời kỳ ${req.historicalPeriod || 'Yêu cầu VIP'}.`);
    setSpawnX('400');
    setSpawnY('300');
    setTilesetNames([]);
    setTilemapFile(null);
    setTilesetFiles([]);
    setIdleSprites([]);
    setRunSprites([]);
    setLessonFormMode('create');
    setSelectedLessonId(null);
    setSelectedLessonDetail(null);
    setActiveTab('Bài Học');
    setMessage({ type: 'success', text: `Đang tạo Game liên kết cho yêu cầu: "${req.title}"` });
  };

  // ─── Lesson actions ─────────────────────────────────
  const resetLessonForm = () => {
    setLessonTitle('');
    setLessonContent('');
    setSpawnX('100');
    setSpawnY('100');
    setTilemapFile(null);
    setTilesetFiles([]);
    setTilesetNames([]);
    setIdleSprites([]);
    setRunSprites([]);
    setLessonFormMode('create');
    setSelectedLessonId(null);
    setSelectedLessonDetail(null);
    setMessage(null);
  };

  const handleSelectLesson = async (lesson: any) => {
    setSelectedLessonId(lesson._id);
    setLessonFormMode('edit');
    // Apply list data immediately for basic fields
    const draft = lesson.pendingDraft;
    setLessonTitle(draft?.title ?? lesson.title);
    setLessonContent(draft?.content ?? lesson.content);
    setSpawnX(String(draft?.spawnPoint?.x ?? lesson.game?.spawnPoint?.x ?? 100));
    setSpawnY(String(draft?.spawnPoint?.y ?? lesson.game?.spawnPoint?.y ?? 100));
    setTilesetNames(draft?.tilesets ? draft.tilesets.map((ts: any) => ts.name) : (lesson.game?.tilesets || []).map((ts: any) => ts.name));
    setTilemapFile(null);
    setTilesetFiles([]);
    setIdleSprites([]);
    setRunSprites([]);
    // Fetch full detail for game assets display
    setLoadingLessonDetail(true);
    try {
      const detail = await adminApi.getLessonById(lesson._id);
      setSelectedLessonDetail(detail);
    } catch {
      setSelectedLessonDetail(lesson);
    } finally {
      setLoadingLessonDetail(false);
    }
  };

  const pickTilemap = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (!r.canceled && r.assets?.length) setTilemapFile(r.assets[0]);
  };

  const pickTilesets = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: true });
    if (!r.canceled && r.assets?.length) {
      const newNames = r.assets.map(f => { const p = f.name.split('.'); p.pop(); return p.join('.'); });
      setTilesetFiles([...tilesetFiles, ...r.assets]);
      setTilesetNames([...tilesetNames, ...newNames]);
    }
  };

  const handleLessonSubmit = async () => {
    setMessage(null);
    if (!lessonTitle.trim() || !lessonContent.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tiêu đề và nội dung.' });
      return;
    }
    if (lessonFormMode === 'create') {
      if (!tilemapFile) { setMessage({ type: 'error', text: 'Cần tải lên file Tilemap JSON.' }); return; }
      if (tilesetFiles.length === 0) { setMessage({ type: 'error', text: 'Cần ít nhất 1 ảnh tileset.' }); return; }
      if (tilesetNames.length !== tilesetFiles.length) { setMessage({ type: 'error', text: 'Số tileset name phải khớp với số ảnh tileset.' }); return; }
    }
    if (tilesetFiles.length > 0 && tilesetNames.length !== tilesetFiles.length) {
      setMessage({ type: 'error', text: 'Số tileset name phải khớp với số ảnh tileset.' }); return;
    }

    setLessonSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', lessonTitle.trim());
      fd.append('content', lessonContent.trim());
      fd.append('spawnPoint[x]', spawnX.trim());
      fd.append('spawnPoint[y]', spawnY.trim());

      if (tilemapFile) {
        fd.append('tilemapJson', { uri: tilemapFile.uri, name: tilemapFile.name || 'tilemap.json', type: tilemapFile.mimeType || 'application/json' } as any);
      }
      tilesetFiles.forEach((f, i) => {
        fd.append('tilesets', { uri: f.uri, name: f.name || `tileset_${i}.png`, type: f.mimeType || 'image/png' } as any);
      });
      if (tilesetFiles.length > 0) {
        fd.append('tilesetNames', JSON.stringify(tilesetNames));
      }
      idleSprites.forEach((f, i) => {
        fd.append('idleSprites', { uri: f.uri, name: f.name || `idle_${i}.png`, type: f.mimeType || 'image/png' } as any);
      });
      runSprites.forEach((f, i) => {
        fd.append('runSprites', { uri: f.uri, name: f.name || `run_${i}.png`, type: f.mimeType || 'image/png' } as any);
      });

      if (lessonFormMode === 'create') {
        await adminApi.createLesson(fd);
        setMessage({ type: 'success', text: 'Tạo bài học thành công.' });
      } else if (selectedLessonId) {
        await adminApi.updateLesson(selectedLessonId, fd);
        setMessage({ type: 'success', text: 'Cập nhật bài học thành công.' });
      }
      resetLessonForm();
      loadLessons();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Lỗi khi lưu bài học.' });
    } finally {
      setLessonSaving(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (!selectedLessonId) return;
    Alert.alert('Xác nhận', 'Xóa bài học này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          await adminApi.deleteLesson(selectedLessonId);
          resetLessonForm();
          loadLessons();
        }
      },
    ]);
  };

  // ─── Podcast actions ────────────────────────────────
  const resetPodcastForm = () => {
    setPodcastTitle('');
    setPodcastDescription('');
    setPodcastContent('');
    setPodcastLevel('Medium');
    setPodcastCategory('');
    setPodcastLessonId('');
    setPodcastThumbnail(null);
    setPodcastAudio(null);
    setPodcastFormMode('create');
    setSelectedPodcastId(null);
    setSelectedPodcastDetail(null);
    setMessage(null);
  };

  const handleSelectPodcast = async (podcast: any) => {
    setSelectedPodcastId(podcast._id);
    setPodcastFormMode('edit');
    const draft = podcast.pendingDraft;
    const rawLessonId = draft?.lessonId !== undefined ? draft.lessonId : podcast.lessonId;
    setPodcastTitle(draft?.title ?? podcast.title);
    setPodcastDescription(draft?.description ?? podcast.description ?? '');
    setPodcastContent(draft?.content ?? podcast.content ?? '');
    setPodcastLevel(draft?.level ?? podcast.level ?? 'Medium');
    setPodcastCategory(draft?.category ?? podcast.category ?? '');
    setPodcastLessonId(rawLessonId && typeof rawLessonId === 'object' ? rawLessonId._id || '' : (rawLessonId as string) || '');
    setPodcastThumbnail(null);
    setPodcastAudio(null);
    // Fetch full detail for thumbnail/audio preview
    try {
      const detail = await adminApi.getPodcastById(podcast._id);
      setSelectedPodcastDetail(detail);
    } catch {
      setSelectedPodcastDetail(podcast);
    }
  };

  const pickPodcastThumbnail = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
    if (!r.canceled && r.assets?.length) setPodcastThumbnail(r.assets[0]);
  };

  const pickPodcastAudio = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    if (!r.canceled && r.assets?.length) setPodcastAudio(r.assets[0]);
  };

  const handlePodcastSubmit = async () => {
    setMessage(null);
    if (!podcastTitle.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tiêu đề podcast.' });
      return;
    }
    if (podcastFormMode === 'create') {
      if (!podcastThumbnail) { setMessage({ type: 'error', text: 'Vui lòng tải lên ảnh giao diện.' }); return; }
      if (!podcastAudio) { setMessage({ type: 'error', text: 'Vui lòng tải lên file âm thanh.' }); return; }
    }

    setPodcastSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', podcastTitle.trim());
      fd.append('description', podcastDescription.trim());
      fd.append('content', podcastContent.trim());
      fd.append('level', podcastLevel);
      fd.append('category', podcastCategory.trim());
      fd.append('lessonId', podcastLessonId || '');

      if (podcastThumbnail) {
        fd.append('thumbnail', { uri: podcastThumbnail.uri, name: podcastThumbnail.name || 'thumb.png', type: podcastThumbnail.mimeType || 'image/png' } as any);
      }
      if (podcastAudio) {
        fd.append('audio', { uri: podcastAudio.uri, name: podcastAudio.name || 'audio.mp3', type: podcastAudio.mimeType || 'audio/mpeg' } as any);
      }

      if (podcastFormMode === 'create') {
        await adminApi.createPodcast(fd);
        setMessage({ type: 'success', text: 'Tạo podcast thành công.' });
      } else if (selectedPodcastId) {
        await adminApi.updatePodcast(selectedPodcastId, fd);
        setMessage({ type: 'success', text: 'Cập nhật podcast thành công.' });
      }
      resetPodcastForm();
      loadPodcasts();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Lỗi khi lưu podcast.' });
    } finally {
      setPodcastSaving(false);
    }
  };

  const handleDeletePodcast = async () => {
    if (!selectedPodcastId) return;
    Alert.alert('Xác nhận', 'Xóa podcast này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          await adminApi.deletePodcast(selectedPodcastId);
          resetPodcastForm();
          loadPodcasts();
        }
      },
    ]);
  };

  // ─── Blog actions ───────────────────────────────────
  const handleApprovePost = async (id: string) => {
    try { await blogApi.approvePost(id); setMessage({ type: 'success', text: 'Đã duyệt bài viết.' }); loadBlog(); }
    catch { setMessage({ type: 'error', text: 'Không thể duyệt bài viết.' }); }
  };

  const handleRejectPost = (id: string) => {
    Alert.alert('Từ chối', 'Lý do từ chối?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Từ chối', style: 'destructive', onPress: async () => {
          try { await blogApi.rejectPost(id, 'Bài viết không đạt yêu cầu.'); setMessage({ type: 'success', text: 'Đã từ chối.' }); loadBlog(); }
          catch { setMessage({ type: 'error', text: 'Lỗi.' }); }
        }
      },
    ]);
  };

  const handleRemovePost = async (id: string) => {
    Alert.alert('Xóa', 'Xóa bài viết này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { await blogApi.removePost(id); loadBlog(); } },
    ]);
  };

  const handleResolveReport = async (id: string, action: 'delete' | 'dismiss') => {
    await blogApi.resolveReport(id, action);
    loadBlog();
  };

  const loadBlog = async () => {
    try {
      const [posts, reports] = await Promise.all([blogApi.getPendingPosts(), blogApi.getPendingReports()]);
      setPendingPosts(posts.data || []);
      setPendingReports(reports.data || []);
    } catch { /* ignore */ }
  };

  // ─── Render ─────────────────────────────────────────
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
      <HeaderBar title="Bảng điều phối" showBack />

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => { setActiveTab(tab); setMessage(null); }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Message */}
      {message && (
        <View style={[styles.messageBox, message.type === 'success' ? styles.messageSuccess : styles.messageError]}>
          <Text style={[styles.messageText, message.type === 'success' ? styles.messageTextSuccess : styles.messageTextError]}>{message.text}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* ─── LESSONS TAB ─── */}
          {activeTab === 'Bài Học' && (
            <>
              {/* Lesson list */}
              <Text style={styles.sectionTitle}>Danh sách bài học ({lessons.length})</Text>       
              {lessons.map((l: any) => (
                <TouchableOpacity
                  key={l._id}
                  style={[styles.card, selectedLessonId === l._id && styles.cardSelected]}
                  onPress={() => handleSelectLesson(l)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{l.title}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>{renderStatusBadge(l.status)}</View>
                    <Text style={styles.cardDate}>{new Date(l.updatedAt || l.createdAt).toLocaleDateString('vi-VN')}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={resetLessonForm} style={styles.newBtnFull}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.light.backgroundDark} />
                <Text style={styles.newBtnText}>Tạo mới</Text>
              </TouchableOpacity>

              {/* Lesson form */}
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{lessonFormMode === 'create' ? 'Tạo bài học mới' : 'Chỉnh sửa bài học'}</Text>

                {lessonFormMode === 'edit' && selectedLesson?.status === 'Rejected' && selectedLesson?.reviewFeedback && (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningTitle}>⚠ Bài học bị từ chối duyệt</Text>
                    <Text style={styles.warningText}>{selectedLesson.reviewFeedback}</Text>
                  </View>
                )}
                {lessonFormMode === 'edit' && selectedLesson?.pendingDraft && (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>ℹ Có chỉnh sửa đang chờ duyệt</Text>
                    <Text style={styles.infoText}>Các thay đổi mới đang chờ Giáo viên/Admin duyệt.</Text>
                  </View>
                )}

                <AuthInput label="Tiêu đề" placeholder="Nhập tiêu đề..." value={lessonTitle} onChangeText={setLessonTitle} />
                <AuthInput label="Nội dung" placeholder="Mô tả nội dung..." value={lessonContent} onChangeText={setLessonContent} multiline />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <AuthInput label="Tọa độ X" placeholder="100" value={spawnX} onChangeText={setSpawnX} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AuthInput label="Tọa độ Y" placeholder="100" value={spawnY} onChangeText={setSpawnY} keyboardType="numeric" />
                  </View>
                </View>

                <Text style={styles.label}>Tilemap JSON {lessonFormMode === 'create' ? '(bắt buộc)' : ''}</Text>
                <TouchableOpacity style={styles.filePicker} onPress={pickTilemap}>
                  <Ionicons name="map-outline" size={20} color={Colors.light.gold} />
                  <Text style={styles.filePickerText}>{tilemapFile ? tilemapFile.name : 'Chọn file JSON...'}</Text>
                </TouchableOpacity>

                <Text style={styles.label}>Tileset images {lessonFormMode === 'create' ? '(bắt buộc)' : ''}</Text>
                {tilesetFiles.map((f, i) => (
                  <View key={i} style={styles.tilesetRow}>
                    <Text style={styles.tilesetFileName} numberOfLines={1}>{f.name}</Text>
                    <TextInput
                      style={styles.tilesetNameInput}
                      value={tilesetNames[i] || ''}
                      onChangeText={(v) => { const n = [...tilesetNames]; n[i] = v; setTilesetNames(n); }}
                      placeholder="Tên tileset"
                      placeholderTextColor={Colors.light.textDim}
                    />
                    <TouchableOpacity onPress={() => {
                      setTilesetFiles(tilesetFiles.filter((_, j) => j !== i));
                      setTilesetNames(tilesetNames.filter((_, j) => j !== i));
                    }}>
                      <Ionicons name="close-circle" size={20} color={Colors.light.error} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addFileBtn} onPress={pickTilesets}>
                  <Ionicons name="add-circle-outline" size={18} color={Colors.light.gold} />
                  <Text style={styles.addFileText}>Thêm tileset</Text>
                </TouchableOpacity>

                {/* Current game assets (edit mode) */}
                {lessonFormMode === 'edit' && selectedLessonDetail?.game && (
                  <View style={styles.assetsSection}>
                    <Text style={styles.assetsTitle}>📦 Assets hiện tại</Text>
                    {selectedLessonDetail.game.tilemapJsonUrl && (
                      <View style={styles.assetsRow}>
                        <Ionicons name="map-outline" size={16} color={Colors.light.gold} />
                        <Text style={styles.assetsLink} numberOfLines={1}>
                          {selectedLessonDetail.game.tilemapJsonUrl.split('/').pop()}
                        </Text>
                      </View>
                    )}
                    {selectedLessonDetail.game.tilesets?.length > 0 && (
                      <>
                        <Text style={styles.assetsSubLabel}>Tilesets ({selectedLessonDetail.game.tilesets.length})</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assetsThumbRow}>
                          {selectedLessonDetail.game.tilesets.map((ts: any, i: number) => (
                            <View key={i} style={styles.assetThumb}>
                              <Image source={{ uri: ts.imageUrl }} style={styles.assetThumbImg} />
                              <Text style={styles.assetThumbName}>{ts.name}</Text>
                            </View>
                          ))}
                        </ScrollView>
                      </>
                    )}
                    {selectedLessonDetail.game.character?.animations && (() => {
                      const anims = selectedLessonDetail.game.character.animations;
                      return (
                        <>
                          {['idle', 'run'].map((key) => {
                            const frames = anims[key];
                            if (!frames || frames.length === 0) return null;
                            return (
                              <View key={key}>
                                <Text style={styles.assetsSubLabel}>{key === 'idle' ? 'Idle' : 'Run'} ({frames.length} frames)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assetsThumbRow}>
                                  {frames.map((f: any, j: number) => (
                                    <View key={j} style={styles.assetThumb}>
                                      <Image source={{ uri: f.imageUrl }} style={styles.assetThumbImg} />
                                      <Text style={styles.assetThumbName}>{f.key}</Text>
                                    </View>
                                  ))}
                                </ScrollView>
                              </View>
                            );
                          })}
                        </>
                      );
                    })()}
                  </View>
                )}
                <Text style={styles.label}>Tùy chọn nhân vật (Mặc định nếu không có thay đổi!).</Text>
                <View style={styles.spriteRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Hình ảnh nhân vật đứng yên</Text>
                    <TouchableOpacity style={styles.filePicker} onPress={async () => {
                      const r = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: true });
                      if (!r.canceled && r.assets?.length) setIdleSprites(r.assets);
                    }}>
                      <Ionicons name="image-outline" size={20} color={Colors.light.gold} />
                      <Text style={styles.filePickerText}>{idleSprites.length > 0 ? `${idleSprites.length} files` : 'Chọn...'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Hình ảnh nhân vật đang chạy</Text>
                    <TouchableOpacity style={styles.filePicker} onPress={async () => {
                      const r = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: true });
                      if (!r.canceled && r.assets?.length) setRunSprites(r.assets);
                    }}>
                      <Ionicons name="image-outline" size={20} color={Colors.light.gold} />
                      <Text style={styles.filePickerText}>{runSprites.length > 0 ? `${runSprites.length} files` : 'Chọn...'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formActions}>
                  <GoldButton
                    title={lessonFormMode === 'create' ? 'Tạo bài học' : 'Lưu cập nhật'}
                    onPress={handleLessonSubmit}
                    loading={lessonSaving}
                    disabled={lessonSaving}
                    style={{ flex: 1 }}
                  />
                  {lessonFormMode === 'edit' && (
                    <GoldButton title="Xóa" variant="secondary" onPress={handleDeleteLesson} style={{ flex: 1 }} />
                  )}
                </View>
              </View>
            </>
          )}

          {/* ─── PODCAST TAB ─── */}
          {activeTab === 'Podcast' && (
            <>
              <Text style={styles.sectionTitle}>Danh sách podcast ({podcasts.length})</Text>
              {podcasts.map((p: any) => (
                <TouchableOpacity
                  key={p._id}
                  style={[styles.card, selectedPodcastId === p._id && styles.cardSelected]}
                  onPress={() => handleSelectPodcast(p)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{p.title}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <Text style={styles.levelBadge}>{p.level === 'Easy' ? 'Dễ' : p.level === 'Hard' ? 'Khó' : 'Trung cấp'}</Text>
                      {renderStatusBadge(p.status)}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={resetPodcastForm} style={styles.newBtnFull}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.light.backgroundDark} />
                <Text style={styles.newBtnText}>Tạo mới</Text>
              </TouchableOpacity>

              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{podcastFormMode === 'create' ? 'Tạo podcast mới' : 'Chỉnh sửa podcast'}</Text>

                {podcastFormMode === 'edit' && selectedPodcast?.status === 'Rejected' && selectedPodcast?.reviewFeedback && (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningTitle}>⚠ Podcast bị từ chối duyệt</Text>
                    <Text style={styles.warningText}>{selectedPodcast.reviewFeedback}</Text>
                  </View>
                )}

                <AuthInput label="Tiêu đề" placeholder="Nhập tiêu đề..." value={podcastTitle} onChangeText={setPodcastTitle} />
                <AuthInput label="Mô tả ngắn" placeholder="Tóm tắt..." value={podcastDescription} onChangeText={setPodcastDescription} multiline />
                <AuthInput label="Nội dung / Ghi chú" placeholder="Nội dung chính..." value={podcastContent} onChangeText={setPodcastContent} multiline />

                <Text style={styles.label}>Chủ đề (Category)</Text>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowCategoryPicker(true)}>
                  <Text style={{ color: podcastCategory ? Colors.light.textMain : Colors.light.textDim, fontSize: FontSizes.sm }}>
                    {podcastCategory || 'Chọn chủ đề...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.light.textMuted} />
                </TouchableOpacity>

                <Text style={styles.label}>Trình độ</Text>
                <View style={styles.levelRow}>
                  {LEVEL_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.levelChip, podcastLevel === opt.value && styles.levelChipActive]}
                      onPress={() => setPodcastLevel(opt.value)}
                    >
                      <Text style={[styles.levelChipText, podcastLevel === opt.value && styles.levelChipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Liên kết bài học (Game 2D)</Text>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowLessonPicker(true)}>
                  <Text style={{ color: podcastLessonId ? Colors.light.textMain : Colors.light.textDim, fontSize: FontSizes.sm }}>
                    {podcastLessonId ? lessons.find((l: any) => l._id === podcastLessonId)?.title || podcastLessonId : 'Không liên kết'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.light.textMuted} />
                </TouchableOpacity>

                <Text style={styles.label}>Ảnh giao diện {podcastFormMode === 'create' ? '(bắt buộc)' : ''}</Text>
                <TouchableOpacity style={styles.filePicker} onPress={pickPodcastThumbnail}>
                  <Ionicons name="image-outline" size={20} color={Colors.light.gold} />
                  <Text style={styles.filePickerText}>{podcastThumbnail ? podcastThumbnail.name : 'Chọn ảnh...'}</Text>
                </TouchableOpacity>

                <Text style={styles.label}>File âm thanh {podcastFormMode === 'create' ? '(bắt buộc)' : ''}</Text>
                <TouchableOpacity style={styles.filePicker} onPress={pickPodcastAudio}>
                  <Ionicons name="musical-notes-outline" size={20} color={Colors.light.gold} />
                  <Text style={styles.filePickerText}>{podcastAudio ? podcastAudio.name : 'Chọn file audio...'}</Text>
                </TouchableOpacity>

                {/* Current assets (edit mode) */}
                {podcastFormMode === 'edit' && selectedPodcastDetail && (
                  <View style={styles.assetsSection}>
                    <Text style={styles.assetsTitle}>📦 Assets hiện tại</Text>
                    {selectedPodcastDetail.thumbnail && (
                      <View style={styles.assetsRow}>
                        <Text style={styles.assetsSubLabel}>Ảnh giao diện:</Text>
                        <Image source={{ uri: selectedPodcastDetail.thumbnail }} style={styles.podcastThumbPreview} />
                      </View>
                    )}
                    {selectedPodcastDetail.audioUrl && (
                      <View style={styles.assetsRow}>
                        <Text style={styles.assetsSubLabel}>Audio:</Text>
                        <Text style={styles.assetsLink} numberOfLines={1}>
                          {selectedPodcastDetail.audioUrl.split('/').pop()}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.formActions}>
                  <GoldButton
                    title={podcastFormMode === 'create' ? 'Tạo podcast' : 'Lưu cập nhật'}
                    onPress={handlePodcastSubmit}
                    loading={podcastSaving}
                    disabled={podcastSaving}
                    style={{ flex: 1 }}
                  />
                  {podcastFormMode === 'edit' && (
                    <GoldButton title="Xóa" variant="secondary" onPress={handleDeletePodcast} style={{ flex: 1 }} />
                  )}
                </View>
              </View>

              {/* Category picker modal */}
              <Modal visible={showCategoryPicker} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Chọn chủ đề</Text>
                    {categoriesList.map(cat => (
                      <TouchableOpacity key={cat} style={styles.modalItem} onPress={() => { setPodcastCategory(cat); setShowCategoryPicker(false); }}>
                        <Text style={styles.modalItemText}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                    <View style={styles.modalDivider} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Nhập chủ đề mới..."
                      placeholderTextColor={Colors.light.textDim}
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                    />
                    <TouchableOpacity style={styles.modalItem} onPress={() => {
                      if (newCategoryName.trim()) { setPodcastCategory(newCategoryName.trim()); setNewCategoryName(''); }
                      setShowCategoryPicker(false);
                    }}>
                      <Text style={[styles.modalItemText, { color: Colors.light.gold }]}>+ Tạo "{newCategoryName || 'mới'}"</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCategoryPicker(false)}>
                      <Text style={styles.modalCancelText}>Hủy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              {/* Lesson picker modal */}
              <Modal visible={showLessonPicker} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Chọn bài học liên kết</Text>
                    <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
                      <TouchableOpacity
                        style={[styles.modalItem, !podcastLessonId && { backgroundColor: '#fef3c7' }]}
                        onPress={() => { setPodcastLessonId(''); setShowLessonPicker(false); }}
                      >
                        <Text style={[styles.modalItemText, !podcastLessonId && { fontWeight: '700', color: Colors.light.goldDark , textAlign: 'center' }]}>
                             Không liên kết
                        </Text>
                      </TouchableOpacity>
                      {lessons
                        .filter((l: any) => l.status === 'Published' || l._id === podcastLessonId)
                        .map((l: any) => (
                          <TouchableOpacity
                            key={l._id}
                            style={[styles.modalItem, podcastLessonId === l._id && { backgroundColor: '#fef3c7' }]}
                            onPress={() => { setPodcastLessonId(l._id); setShowLessonPicker(false); }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={[styles.modalItemText, podcastLessonId === l._id && { fontWeight: '700', color: Colors.light.goldDark }]}>
                                {l.title}
                              </Text>
                              {l.status !== 'Published' && (
                                <View style={styles.badge}><Text style={styles.badgeText}>{l.status}</Text></View>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TouchableOpacity style={styles.modalCancel} onPress={() => setShowLessonPicker(false)}>
                      <Text style={styles.modalCancelText}>Hủy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </>
          )}

          {/* ─── BLOG TAB ─── */}
          {activeTab === 'Diễn Đàn' && (
            <>
              <Text style={styles.sectionTitle}>Bài viết chờ duyệt ({pendingPosts.length})</Text>
              {pendingPosts.length === 0 ? (
                <Text style={styles.emptyText}>Không có bài viết nào cần duyệt.</Text>
              ) : pendingPosts.map((p: any) => (
                <View key={p._id} style={styles.card}>
                  <Text style={styles.cardTitle}>{p.title}</Text>
                  <Text style={styles.cardBody} numberOfLines={3}>{p.content}</Text>
                  <Text style={styles.cardAuthor}>{p.author?.name} — {p.category}</Text>
                  <View style={styles.actionRow}>
                    <GoldButton title="Duyệt" onPress={() => handleApprovePost(p._id)} style={{ flex: 1 }} />
                    <GoldButton title="Từ chối" variant="secondary" onPress={() => handleRejectPost(p._id)} style={{ flex: 1 }} />
                    <TouchableOpacity onPress={() => handleRemovePost(p._id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={20} color={Colors.light.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ─── REPORTS TAB ─── */}
          {activeTab === 'Báo Cáo' && (
            <>
              <Text style={styles.sectionTitle}>Báo cáo vi phạm ({pendingReports.length})</Text>
              {pendingReports.length === 0 ? (
                <Text style={styles.emptyText}>Không có báo cáo nào cần xử lý.</Text>
              ) : pendingReports.map((r: any) => (
                <View key={r._id} style={styles.card}>
                  <Text style={styles.cardTitle}>{r.targetType === 'Post' ? 'Bài viết' : 'Bình luận'}: {r.reason}</Text>
                  <Text style={styles.cardBody}>{r.description || 'Không có mô tả.'}</Text>
                  <Text style={styles.cardAuthor}>Báo cáo bởi: {r.reporter?.name}</Text>
                  <View style={styles.actionRow}>
                    <GoldButton title="Xóa ND" variant="secondary" onPress={() => handleResolveReport(r._id, 'delete')} style={{ flex: 1 }} />
                    <GoldButton title="Bỏ qua" variant="ghost" onPress={() => handleResolveReport(r._id, 'dismiss')} style={{ flex: 1 }} />
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ─── CHAPTER TAB ─── */}
          {activeTab === 'Chương Học' && <ChapterTab />}

          {/* ─── QUIZ TAB ─── */}
          {activeTab === 'Ngân Hàng Quiz' && <QuizTab />}

          {/* ─── LESSON REQUESTS TAB ─── */}
          {activeTab === 'Yêu cầu bài học' && (
            <View style={lrStyles.wrapper}>
              <View style={lrStyles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={lrStyles.heading}>Theo dõi Yêu cầu bài học (Pro)</Text>
                  <Text style={lrStyles.subheading}>Giám sát các yêu cầu soạn thảo bài học từ học viên Pro và trạng thái xử lý của Giáo viên</Text>
                </View>
                <View style={lrStyles.countBadge}>
                  <Text style={lrStyles.countText}>{lessonRequests.filter((req) => req.needsGameCreation).length} Yêu cầu</Text>
                </View>
              </View>

              {loadingRequests ? (
                <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.gold} /></View>
              ) : lessonRequests.filter((req) => req.needsGameCreation).length === 0 ? (
                <Text style={lrStyles.emptyMsg}>Chưa có yêu cầu bài học nào trên hệ thống.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    {/* Table header */}
                    <View style={lrStyles.thead}>
                      <Text style={[lrStyles.th, { width: 115 }]}>Học sinh</Text>
                      <Text style={[lrStyles.th, { width: 230 }]}>Chi tiết yêu cầu</Text>
                      <Text style={[lrStyles.th, { width: 85 }]}>Thời kỳ</Text>
                      <Text style={[lrStyles.th, { width: 115 }]}>Giáo viên</Text>
                      <Text style={[lrStyles.th, { width: 105 }]}>Y/c Game</Text>
                      <Text style={[lrStyles.th, { width: 90 }]}>Trạng thái</Text>
                      <Text style={[lrStyles.th, { width: 80 }]}>Ngày gửi</Text>
                    </View>

                    {/* Table body */}
                    {lessonRequests.filter((req) => req.needsGameCreation).map((req: any) => (
                      <View key={req._id} style={lrStyles.trow}>
                        {/* Học sinh */}
                        <View style={{ width: 115, paddingRight: 8 }}>
                          <Text style={lrStyles.studentName} numberOfLines={1}>{req.requesterId?.name || 'Học viên Pro'}</Text>
                          <Text style={lrStyles.studentEmail} numberOfLines={1}>{req.requesterId?.email || ''}</Text>
                        </View>

                        {/* Chi tiết */}
                        <View style={{ width: 230, paddingRight: 8 }}>
                          <Text style={lrStyles.reqTitle} numberOfLines={2}>{req.title}</Text>
                          <Text style={lrStyles.reqDesc} numberOfLines={2}>{req.description}</Text>
                          {req.pedagogicalNotes ? (
                            <View style={lrStyles.infoBlock}>
                              <Text style={lrStyles.infoLabel}>Nhận định sư phạm:</Text>
                              <Text style={lrStyles.infoValue} numberOfLines={3}>{req.pedagogicalNotes}</Text>
                            </View>
                          ) : null}
                          {req.estimatedCompletionDate ? (
                            <Text style={lrStyles.metaLine}>Dự kiến hoàn tất: <Text style={{ fontWeight: '700' }}>{new Date(req.estimatedCompletionDate).toLocaleDateString('vi-VN')}</Text></Text>
                          ) : null}
                          {req.resultPodcastId ? (
                            <View style={lrStyles.successBlock}>
                              <Text style={lrStyles.successText} numberOfLines={1}>
                                🎧 Podcast: {typeof req.resultPodcastId === 'object' ? (req.resultPodcastId as any).title : req.resultPodcastId}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Thời kỳ */}
                        <View style={{ width: 85, paddingRight: 4, justifyContent: 'center' }}>
                          <Text style={lrStyles.cell} numberOfLines={2}>{req.historicalPeriod || '—'}</Text>
                        </View>

                        {/* Giáo viên */}
                        <View style={{ width: 115, paddingRight: 8 }}>
                          <Text style={lrStyles.teacherName} numberOfLines={1}>{req.assignedTeacherId?.name || 'Chưa nhận'}</Text>
                          <Text style={lrStyles.teacherEmail} numberOfLines={1}>{req.assignedTeacherId?.email || ''}</Text>
                        </View>

                        {/* Yêu cầu Game */}
                        <View style={{ width: 105, paddingRight: 6, justifyContent: 'center' }}>
                          {req.needsGameCreation ? (
                            <>
                              <View style={[lrStyles.gameChip, req.gameCreationStatus === 'Completed' ? lrStyles.gameChipDone : lrStyles.gameChipPending]}>
                                <Text style={req.gameCreationStatus === 'Completed' ? lrStyles.gameChipDoneText : lrStyles.gameChipPendingText}>
                                  {req.gameCreationStatus === 'Completed' ? '✓ Đã thiết kế' : 'Cần thiết kế'}
                                </Text>
                              </View>
                              {req.gameCreationStatus !== 'Completed' && (
                                <TouchableOpacity style={lrStyles.designNowBtn} onPress={() => handleDesignGame(req)} activeOpacity={0.7}>
                                  <Text style={lrStyles.designNowText}>Thiết kế ngay</Text>
                                </TouchableOpacity>
                              )}
                            </>
                          ) : (
                            <Text style={lrStyles.muted}>Không</Text>
                          )}
                        </View>

                        {/* Trạng thái */}
                        <View style={{ width: 90, justifyContent: 'center' }}>
                          <View style={[
                            lrStyles.statusPill,
                            req.status === 'Pending' && lrStyles.statusPending,
                            req.status === 'Accepted' && lrStyles.statusAccepted,
                            req.status === 'InProgress' && lrStyles.statusInProgress,
                            req.status === 'Completed' && lrStyles.statusCompleted,
                            (req.status === 'Rejected' || (!['Pending','Accepted','InProgress','Completed'].includes(req.status))) && lrStyles.statusRejected,
                          ]}>
                            <Text style={[
                              lrStyles.statusPillText,
                              req.status === 'Pending' && lrStyles.statusPendingText,
                              req.status === 'Accepted' && lrStyles.statusAcceptedText,
                              req.status === 'InProgress' && lrStyles.statusInProgressText,
                              req.status === 'Completed' && lrStyles.statusCompletedText,
                              (req.status === 'Rejected' || (!['Pending','Accepted','InProgress','Completed'].includes(req.status))) && lrStyles.statusRejectedText,
                            ]}>
                              {req.status === 'Pending' ? 'Chờ duyệt' : req.status === 'Accepted' ? 'Đã nhận' : req.status === 'InProgress' ? 'Đang soạn' : req.status === 'Completed' ? 'Hoàn thành' : 'Từ chối'}
                            </Text>
                          </View>
                        </View>

                        {/* Ngày gửi */}
                        <View style={{ width: 80, justifyContent: 'center' }}>
                          <Text style={lrStyles.dateCell}>{new Date(req.createdAt).toLocaleDateString('vi-VN')}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: Colors.light.textMuted, fontSize: FontSizes.md, textAlign: 'center' },
  emptyText: { color: Colors.light.textMuted, fontSize: FontSizes.sm, textAlign: 'center', padding: 24, fontStyle: 'italic' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 60 },

  // Tabs
  tabScroll: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: Colors.light.panelBorder },
  tabScrollContent: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 4, alignItems: 'center' },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.light.goldDark },
  tabText: { color: Colors.light.textMuted, fontSize: FontSizes.sm, fontWeight: '600' },
  tabTextActive: { color: Colors.light.goldDark, fontWeight: '700' },

  // Message
  messageBox: { marginHorizontal: Spacing.md, marginTop: Spacing.sm, padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1 },
  messageSuccess: { backgroundColor: '#d1fae5', borderColor: '#6ee7b7' },
  messageError: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  messageText: { fontSize: FontSizes.sm },
  messageTextSuccess: { color: '#065f46' },
  messageTextError: { color: '#9b1c1c' },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.dark.authBorder, fontSize: FontSizes.md, fontWeight: '700', marginTop: Spacing.sm, marginBottom: Spacing.sm },
  sectionDesc: { color: Colors.light.textMuted, fontSize: FontSizes.xs, marginBottom: Spacing.sm },
  newBtn: { backgroundColor: Colors.light.gold, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.sm },
  newBtnFull: { backgroundColor: Colors.light.gold, paddingHorizontal: 16, paddingVertical: 10, borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: Spacing.sm },
  newBtnText: { color: Colors.light.backgroundDark, fontSize: FontSizes.xs, fontWeight: '700' },

  // Cards
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSelected: {
    borderColor: Colors.light.gold,
    borderWidth: 7,
    backgroundColor: Colors.light.backgroundCard,
    transform: [{ translateY: -5 }, { scale: 1.02 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 12,
  },
  cardTitle: { color: Colors.light.textMain, fontSize: FontSizes.md, fontWeight: '600' },
  cardBody: { color: Colors.light.textMuted, fontSize: FontSizes.sm, marginTop: 4 },
  cardDate: { color: Colors.light.textDim, fontSize: FontSizes.xs, marginTop: 4 },
  cardAuthor: { color: Colors.light.textDim, fontSize: FontSizes.xs, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  deleteBtn: { padding: 8 },

  // Badge
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  levelBadge: { fontSize: FontSizes.xs, color: Colors.light.goldDark, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', fontWeight: '600' },

  // Form
  formCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  formTitle: { color: Colors.light.textMain, fontSize: FontSizes.lg, fontWeight: '700', marginBottom: Spacing.md },
  label: { color: Colors.light.textMain, fontSize: FontSizes.sm, fontWeight: '600', marginTop: Spacing.sm, marginBottom: 4 },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.backgroundCardAlt || Colors.light.backgroundCard,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    marginBottom: Spacing.xs,
  },
  filePickerText: { color: Colors.light.textMuted, fontSize: FontSizes.sm, flex: 1 },
  addFileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addFileText: { color: Colors.light.gold, fontSize: FontSizes.sm, fontWeight: '600' },
  tilesetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.backgroundCardAlt || '#fef9e7',
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    marginBottom: 4,
  },
  tilesetFileName: { color: Colors.light.textMuted, fontSize: FontSizes.xs, maxWidth: 80 },
  tilesetNameInput: {
    flex: 1,
    color: Colors.light.textMain,
    fontSize: FontSizes.xs,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
  spriteRow: { flexDirection: 'row', gap: 12, marginTop: Spacing.sm },
  formActions: { flexDirection: 'row', gap: 12, marginTop: Spacing.lg },
  warningBox: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  warningTitle: { color: '#9b1c1c', fontWeight: '700', fontSize: FontSizes.sm },
  warningText: { color: '#9b1c1c', fontSize: FontSizes.sm, marginTop: 4 },
  infoBox: { backgroundColor: '#e0f2fe', borderWidth: 1, borderColor: '#7dd3fc', borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  infoTitle: { color: '#075985', fontWeight: '700', fontSize: FontSizes.sm },
  infoText: { color: '#075985', fontSize: FontSizes.sm, marginTop: 4 },

  // Podcast extras
  pickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundCardAlt || Colors.light.backgroundCard,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    marginBottom: Spacing.xs,
    minHeight: 40,
  },
  levelRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  levelChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    backgroundColor: Colors.light.backgroundCardAlt || Colors.light.backgroundCard,
  },
  levelChipActive: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  levelChipText: { color: Colors.light.textMuted, fontSize: FontSizes.xs, fontWeight: '600' },
  levelChipTextActive: { color: Colors.light.backgroundDark },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.lg, padding: Spacing.lg, width: '85%', maxHeight: '70%' },
  modalTitle: { color: Colors.light.textMain, fontSize: FontSizes.lg, fontWeight: '700', marginBottom: Spacing.md },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.panelBorder },
  modalItemText: { color: Colors.light.textMain, fontSize: FontSizes.sm },
  modalDivider: { height: 1, backgroundColor: Colors.light.panelBorder, marginVertical: Spacing.sm },
  modalInput: {
    borderWidth: 1, borderColor: Colors.light.panelBorder, borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    color: Colors.light.textMain, fontSize: FontSizes.sm,
  },
  modalCancel: { paddingVertical: 12, alignItems: 'center', marginTop: Spacing.sm },
  modalCancelText: { color: Colors.light.error, fontSize: FontSizes.sm, fontWeight: '600' },

  // ─── Assets preview ─────────────────────────────────
  assetsSection: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.light.backgroundCardAlt || '#1a1a2e',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
  },
  assetsTitle: { color: Colors.light.textMain, fontSize: FontSizes.sm, fontWeight: '700', marginBottom: Spacing.sm },
  assetsSubLabel: { color: Colors.light.textMuted, fontSize: FontSizes.xs, fontWeight: '600', marginTop: 6, marginBottom: 4 },
  assetsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  assetsLink: { color: Colors.light.gold, fontSize: FontSizes.xs, flex: 1 },
  assetsThumbRow: { flexDirection: 'row', marginBottom: 8, paddingBottom: 4 },
  assetThumb: { alignItems: 'center', marginRight: 8, width: 60 },
  assetThumbImg: { width: 48, height: 48, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.light.panelBorder, backgroundColor: '#fff' },
  assetThumbName: { color: Colors.light.textDim, fontSize: 9, marginTop: 2, textAlign: 'center' },
  podcastThumbPreview: { width: 80, height: 60, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.light.panelBorder, backgroundColor: '#fff' },
});

const lrStyles = StyleSheet.create({
  // Card wrapper
  wrapper: {
    backgroundColor: '#FFFBF2',
    borderWidth: 2,
    borderColor: '#92400e',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  heading: {
    color: '#78350f',
    fontSize: FontSizes.md,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subheading: {
    color: '#92400e',
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#d97706',
  },
  countText: {
    color: '#78350f',
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },

  // Table
  thead: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#92400e',
    paddingBottom: 10,
    marginBottom: 6,
  },
  th: {
    color: '#78350f',
    fontWeight: '800',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    paddingHorizontal: 4,
  },
  trow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    paddingVertical: 12,
  },

  // Student
  studentName: { color: '#78350f', fontWeight: '700', fontSize: 12 },
  studentEmail: { color: '#a8a29e', fontSize: 10, marginTop: 1 },

  // Request detail
  reqTitle: { color: '#78350f', fontWeight: '700', fontSize: 13, marginBottom: 3 },
  reqDesc: { color: '#78716c', fontSize: 11, lineHeight: 15, marginBottom: 4 },
  infoBlock: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 3,
    borderLeftColor: '#d97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  infoLabel: { color: '#92400e', fontSize: 10, fontWeight: '700' },
  infoValue: { color: '#78350f', fontSize: 10, marginTop: 1 },
  metaLine: { color: '#a8a29e', fontSize: 10, marginTop: 4 },
  successBlock: {
    backgroundColor: '#d1fae5',
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  successText: { color: '#065f46', fontSize: 10, fontWeight: '600' },

  // Cell
  cell: { color: '#57534e', fontSize: 11 },

  // Teacher
  teacherName: { color: '#78350f', fontWeight: '600', fontSize: 11 },
  teacherEmail: { color: '#a8a29e', fontSize: 10, marginTop: 1 },

  // Game
  gameChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  gameChipPending: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#d97706' },
  gameChipDone: { backgroundColor: '#d1fae5', borderWidth: 1, borderColor: '#10b981' },
  gameChipPendingText: { color: '#92400e', fontSize: 10, fontWeight: '700' },
  gameChipDoneText: { color: '#065f46', fontSize: 10, fontWeight: '700' },
  designNowBtn: {
    backgroundColor: '#b45309',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  designNowText: { color: '#fef3c7', fontSize: 10, fontWeight: '700' },
  muted: { color: '#d6d3d1', fontSize: 10, fontStyle: 'italic' },

  // Status
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusPending: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#d97706' },
  statusAccepted: { backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#3b82f6' },
  statusInProgress: { backgroundColor: '#ede9fe', borderWidth: 1, borderColor: '#8b5cf6' },
  statusCompleted: { backgroundColor: '#d1fae5', borderWidth: 1, borderColor: '#10b981' },
  statusRejected: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#ef4444' },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  statusPendingText: { color: '#92400e' },
  statusAcceptedText: { color: '#1e40af' },
  statusInProgressText: { color: '#6d28d9' },
  statusCompletedText: { color: '#065f46' },
  statusRejectedText: { color: '#9b1c1c' },

  // Date
  dateCell: { color: '#a8a29e', fontSize: 11 },

  // Empty
  emptyMsg: { color: '#a8a29e', fontSize: FontSizes.sm, textAlign: 'center', fontStyle: 'italic', paddingVertical: 24 },
});

