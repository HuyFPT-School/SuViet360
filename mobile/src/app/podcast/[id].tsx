import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PageBackground } from '@/components/PageBackground';
import { podcastApi } from '@/services/podcastApi';
import { lessonApi } from '@/services/lessonApi';
import { notificationApi } from '@/services/notificationApi';
import type { Podcast, PodcastNote, PodcastComment } from '@/types/podcast';
import type { Lesson } from '@/types/lesson';
import { useAuth } from '@/hooks/useAuth';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { formatDate } from '@/utils/format';
import HeaderBar from '@/components/ui/HeaderBar';
import GoldButton from '@/components/ui/GoldButton';

const TABS = [
  { key: 'content', label: 'NỘI DUNG' },
  { key: 'docs', label: 'TÀI LIỆU LIÊN QUAN' },
  { key: 'game', label: 'TRÒ CHƠI' },
] as const;

const LVL: Record<string, string> = { Easy: 'Dễ', Medium: 'Trung cấp', Hard: 'Nâng cao', 'Dễ': 'Dễ', 'Trung cấp': 'Trung cấp', 'Nâng cao': 'Nâng cao' };
const tl = (l: string) => LVL[l] || l;
const fm = (s: number): string => {
  if (!s || isNaN(s)) return '00:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
};

export default function PodcastDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [linkedLesson, setLinkedLesson] = useState<Lesson | null>(null);
  const [notes, setNotes] = useState<PodcastNote[]>([]);
  const [comments, setComments] = useState<PodcastComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<string>('content');
  const cleanupRef = useRef(false);

  const player = useAudioPlayer(podcast?.audioUrl ? { uri: podcast.audioUrl } : null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  useEffect(() => {
    if (!id) return;
    loadAll();
    return () => { cleanupRef.current = true; try { player?.pause(); } catch { /* released */ } };
  }, [id]);

  useEffect(() => {
    if (user && podcast?.category) {
      notificationApi.getFollowedCategories()
        .then((cats: string[]) => setIsFollowing(cats.map((c: string) => c.trim()).includes(podcast.category!.trim())))
        .catch(() => {});
    }
  }, [user, podcast?.category]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const podRes = await podcastApi.getById(id!);
      const p = podRes.podcast;
      if (!p) { setError('Podcast not found'); setLoading(false); return; }
      setPodcast(p);
      const lessonId = typeof p.lessonId === 'object' ? (p.lessonId as any)._id : p.lessonId;
      if (lessonId) {
        try { const lRes = await lessonApi.getById(lessonId); setLinkedLesson(lRes.lesson); } catch { /* noop */ }
      }
      const [notesRes, commentsRes] = await Promise.all([
        podcastApi.getNotes(id!).catch(() => ({ data: [] })),
        podcastApi.getComments(id!).catch(() => ({ data: [] })),
      ]);
      setNotes(notesRes.data || []);
      setComments(commentsRes.data || []);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const togglePlayPause = useCallback(() => {
    if (cleanupRef.current) return;
    try { if (player.playing) player.pause(); else player.play(); } catch { /* released */ }
  }, [player]);

  const seekTo = (time: number) => {
    try { player.seekTo(time); if (!player.playing) player.play(); } catch { /* ignore */ }
  };

  const toggleFollow = async () => {
    if (!user) { Alert.alert('Thông báo', 'Vui lòng đăng nhập để theo dõi.'); return; }
    if (!podcast?.category) return;
    setFollowLoading(true);
    try {
      if (isFollowing) { await notificationApi.unfollowCategory(podcast.category); setIsFollowing(false); }
      else { await notificationApi.followCategory(podcast.category); setIsFollowing(true); }
    } catch { Alert.alert('Lỗi', 'Không thể thực hiện thao tác.'); }
    finally { setFollowLoading(false); }
  };

  const submitNote = async () => {
    if (!noteText.trim()) { setAddingNote(false); return; }
    try {
      const res = await podcastApi.createNote(id!, noteText.trim(), status?.currentTime ? Math.floor(status.currentTime) : 0);
      setNotes((prev) => [...prev, res.data || res].sort((a: any, b: any) => a.timestamp - b.timestamp));
      setNoteText(''); setAddingNote(false);
    } catch { Alert.alert('Lỗi', 'Cần đăng nhập để thêm ghi chú.'); }
  };
  const delNote = async (nid: string) => { try { await podcastApi.deleteNote(nid); setNotes((p) => p.filter((n) => n._id !== nid)); } catch { Alert.alert('Lỗi', 'Không thể xóa.'); } };
  const updateNote = async () => {
    if (!editingNoteText.trim()) return;
    try {
      await podcastApi.createNote(id!, editingNoteText.trim(), notes.find((n) => n._id === editingNoteId)?.timestamp || 0);
      setNotes((p) => p.map((n) => n._id === editingNoteId ? { ...n, content: editingNoteText } : n));
      setEditingNoteId(null);
    } catch { Alert.alert('Lỗi', 'Không thể cập nhật.'); }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    try { const res = await podcastApi.createComment(id!, commentText.trim()); setComments((p) => [res.data || res, ...p]); setCommentText(''); }
    catch { Alert.alert('Lỗi', 'Cần đăng nhập để bình luận.'); }
  };
  const delComment = async (cid: string) => { try { await podcastApi.deleteComment(cid); setComments((p) => p.filter((c) => c._id !== cid)); } catch { Alert.alert('Lỗi', 'Không thể xóa.'); } };
  const updateComment = async () => {
    if (!editingCommentText.trim()) return;
    try {
      await podcastApi.createComment(id!, editingCommentText.trim());
      setComments((p) => p.map((c) => c._id === editingCommentId ? { ...c, content: editingCommentText } : c));
      setEditingCommentId(null);
    } catch { Alert.alert('Lỗi', 'Không thể cập nhật.'); }
  };

  if (loading) return <PageBackground style={S.ct}><HeaderBar title="Hành Trình" showBack /><View style={S.center}><ActivityIndicator size="large" color={Colors.light.gold} /></View></PageBackground>;
  if (error || !podcast) return <PageBackground style={S.ct}><HeaderBar title="Hành Trình" showBack /><View style={S.center}><Ionicons name="alert-circle-outline" size={48} color={Colors.light.textMuted} /><Text style={S.err}>{error || 'Không tìm thấy nội dung.'}</Text></View></PageBackground>;

  const hasGame = !!linkedLesson?.game;
  const contentText = podcast.content || linkedLesson?.content || podcast.description || '';

  return (
    <PageBackground style={S.ct}>
      <HeaderBar title="Hành Trình" showBack rightElement={user ? <TouchableOpacity onPress={toggleFollow} disabled={followLoading}><Ionicons name={isFollowing ? 'notifications' : 'notifications-outline'} size={22} color={isFollowing ? Colors.light.gold : Colors.light.goldMuted} /></TouchableOpacity> : undefined} />
      <ScrollView style={S.scroll} contentContainerStyle={S.scc}>

        {/* PLAYER CARD */}
        <View style={S.pc}>
          <Text style={S.lbl}>PODCAST LỊCH SỬ</Text>
          <Text style={S.ttl}>{podcast.title}</Text>
          {!!podcast.description && <Text style={S.dsc}>{podcast.description}</Text>}
          {podcast.thumbnail ? <Image source={{ uri: podcast.thumbnail }} style={S.thumb} resizeMode="cover" /> : null}
          <View style={S.metaR}>
            <View style={S.mi}><Ionicons name="time-outline" size={14} color={Colors.light.textMuted} /><Text style={S.mt}>Thời lượng: {fm(podcast.duration || 0)}</Text></View>
            <View style={S.mi}><Ionicons name="school-outline" size={14} color={Colors.light.textMuted} /><Text style={S.mt}>Cấp độ: {tl(podcast.level || '')}</Text></View>
            <View style={S.mi}><Ionicons name="calendar-outline" size={14} color={Colors.light.textMuted} /><Text style={S.mt}>Ngày đăng: {formatDate(podcast.createdAt)}</Text></View>
          </View>

          {podcast.audioUrl ? (
            <View style={S.as}>
              <View style={S.ac}>
                <TouchableOpacity onPress={togglePlayPause} style={S.pb}><Ionicons name={player.playing ? 'pause' : 'play'} size={24} color="#1a0a06" /></TouchableOpacity>
                <Text style={S.tm}>{fm(status?.currentTime || 0)}</Text>
                <View style={S.pw}>
                  <View style={S.pbg} />
                  <View style={[S.pfg, { width: `${status?.duration > 0 ? ((status?.currentTime || 0) / status.duration) * 100 : 0}%` }]} />
                  {notes.map((note) => (
                    <TouchableOpacity key={note._id} style={[S.nm, { left: `${status?.duration > 0 ? (note.timestamp / status.duration) * 100 : 0}%` }]} onPress={() => seekTo(note.timestamp)}>
                      <View style={S.nd} />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={S.tm}>{fm(status?.duration || 0)}</Text>
              </View>
              <View style={S.ar}>
                <TouchableOpacity onPress={() => { setAddingNote(true); setNoteText(''); }} style={S.ab}><Ionicons name="create-outline" size={16} color={Colors.light.textMuted} /><Text style={S.at}>Ghi chú</Text></TouchableOpacity>
                <TouchableOpacity style={S.ab}><Ionicons name="download-outline" size={16} color={Colors.light.textMuted} /><Text style={S.at}>Tải xuống</Text></TouchableOpacity>
              </View>
              {addingNote && (
                <View style={S.nf}>
                  <TextInput style={S.ni} placeholder="Ghi chú..." placeholderTextColor={Colors.light.textDim} value={noteText} onChangeText={setNoteText} multiline />
                  <View style={S.nfb}><GoldButton title="Hủy" variant="ghost" onPress={() => setAddingNote(false)} /><GoldButton title="Lưu" onPress={submitNote} /></View>
                </View>
              )}
            </View>
          ) : (
            <View style={S.na}><Ionicons name="volume-mute-outline" size={24} color={Colors.light.textMuted} /><Text style={S.nat}>Không có audio cho hành trình này</Text></View>
          )}
        </View>

        {/* TABS */}
        <View style={S.tc}>
          <View style={S.tr}>
            {TABS.map((t) => (
              <TouchableOpacity key={t.key} style={[S.tb, activeTab === t.key && S.tba]} onPress={() => setActiveTab(t.key)}>
                <Text style={[S.tl, activeTab === t.key && S.tla]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={S.tx}>
            {activeTab === 'content' && (
              contentText ? <Text style={S.ctx}>{contentText.replace(/<[^>]*>/g, '')}</Text>
                : <View style={S.et}><Ionicons name="document-text-outline" size={32} color={Colors.light.textMuted} /><Text style={S.ett}>Chưa có nội dung cho hành trình này.</Text></View>
            )}
            {activeTab === 'docs' && <View style={S.et}><Ionicons name="folder-open-outline" size={32} color={Colors.light.textMuted} /><Text style={S.ett}>Chưa có tài liệu liên quan.</Text></View>}
            {activeTab === 'game' && (hasGame ? (
              <View style={S.gs}>
                <Text style={S.gd}>Trò chơi 2D tương tác đi kèm bài học. Di chuyển nhân vật để vượt qua thử thách.</Text>
                <View style={S.gp}><Ionicons name="game-controller" size={48} color={Colors.light.gold} /><Text style={S.gpt}>{linkedLesson?.title || 'Trò chơi'}</Text>
                  {linkedLesson?.game?.tilemapJsonUrl ? (
                    <>
                      <Text style={S.gi}>Bản đồ: {linkedLesson.game.tilemapJsonUrl.split('/').pop()}</Text>
                      <Text style={S.gi}>Tilesets: {linkedLesson.game.tilesets?.length || 0}</Text>
                      <Text style={S.gn}>Tính năng trò chơi đang được tối ưu cho mobile. Vui lòng sử dụng web để trải nghiệm đầy đủ.</Text>
                    </>
                  ) : <Text style={S.gn}>Dữ liệu trò chơi chưa sẵn sàng.</Text>}
                </View>
              </View>
            ) : <View style={S.et}><Ionicons name="game-controller-outline" size={32} color={Colors.light.textMuted} /><Text style={S.ett}>Trò chơi chưa sẵn sàng.</Text></View>)}
          </View>
        </View>

        {/* NOTES */}
        <View style={S.sc}>
          <Text style={S.st}>Ghi chú của bạn ({notes.length})</Text>
          {notes.map((n) => (
            <View key={n._id} style={S.nti}>
              <TouchableOpacity onPress={() => seekTo(n.timestamp)} style={S.nts}><Ionicons name="play" size={12} color={Colors.light.gold} /><Text style={S.nst}>{fm(n.timestamp)}</Text></TouchableOpacity>
              <Text style={S.nct} numberOfLines={3}>{n.content}</Text>
              {user && <View style={S.nta}><TouchableOpacity onPress={() => { setEditingNoteId(n._id); setEditingNoteText(n.content); }}><Ionicons name="pencil-outline" size={14} color={Colors.light.textMuted} /></TouchableOpacity><TouchableOpacity onPress={() => delNote(n._id)}><Ionicons name="trash-outline" size={14} color={Colors.light.error} /></TouchableOpacity></View>}
            </View>
          ))}
          {notes.length === 0 && <Text style={S.em}>Chưa có ghi chú nào.</Text>}
        </View>

        {/* COMMENTS */}
        <View style={S.sc}>
          <Text style={S.st}>Bình luận ({comments.length})</Text>
          {user && (
            <View style={S.cf}>
              <TextInput style={S.ci} placeholder="Viết bình luận..." placeholderTextColor={Colors.light.textDim} value={commentText} onChangeText={setCommentText} />
              <TouchableOpacity onPress={submitComment} style={S.cs}><Ionicons name="send" size={18} color={commentText.trim() ? Colors.light.gold : Colors.light.textMuted} /></TouchableOpacity>
            </View>
          )}
          {comments.map((c) => (
            <View key={c._id} style={S.cmi}>
              <Ionicons name="person-circle-outline" size={20} color={Colors.light.textMuted} />
              <View style={S.cmb}><View style={S.cmh}><Text style={S.cma}>{c.userId?.name || 'Ẩn danh'}</Text><Text style={S.cmd}>{formatDate(c.createdAt)}</Text></View><Text style={S.cmc}>{c.content}</Text>
                {user && <View style={S.cmac}><TouchableOpacity onPress={() => { setEditingCommentId(c._id); setEditingCommentText(c.content); }}><Ionicons name="pencil-outline" size={12} color={Colors.light.textMuted} /></TouchableOpacity><TouchableOpacity onPress={() => delComment(c._id)}><Ionicons name="trash-outline" size={12} color={Colors.light.error} /></TouchableOpacity></View>}
              </View>
            </View>
          ))}
          {comments.length === 0 && <Text style={S.em}>Chưa có bình luận nào.</Text>}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={!!editingNoteId} animationType="fade" transparent>
        <View style={S.mo}><View style={S.mb}><Text style={S.mtl}>Sửa ghi chú</Text><TextInput style={S.mii} value={editingNoteText} onChangeText={setEditingNoteText} multiline placeholderTextColor={Colors.light.textDim} /><View style={S.ma}><GoldButton title="Hủy" variant="ghost" onPress={() => setEditingNoteId(null)} /><GoldButton title="Lưu" onPress={updateNote} /></View></View></View>
      </Modal>
      <Modal visible={!!editingCommentId} animationType="fade" transparent>
        <View style={S.mo}><View style={S.mb}><Text style={S.mtl}>Sửa bình luận</Text><TextInput style={S.mii} value={editingCommentText} onChangeText={setEditingCommentText} multiline placeholderTextColor={Colors.light.textDim} /><View style={S.ma}><GoldButton title="Hủy" variant="ghost" onPress={() => setEditingCommentId(null)} /><GoldButton title="Lưu" onPress={updateComment} /></View></View></View>
      </Modal>
    </PageBackground>
  );
}

const S = StyleSheet.create({
  ct: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  err: { color: Colors.light.textMuted, fontSize: FontSizes.md, marginTop: 12, textAlign: 'center' },
  scroll: { flex: 1 }, scc: { padding: Spacing.md, paddingBottom: 40 },
  pc: { backgroundColor: Colors.light.panel, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder, padding: Spacing.lg, marginBottom: Spacing.md },
  lbl: { color: '#a84d28', fontSize: FontSizes.xs, fontWeight: '700', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' },
  ttl: { fontFamily: 'Playfair Display', fontSize: FontSizes.xl, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  dsc: { fontSize: FontSizes.sm, color: Colors.light.textMuted, lineHeight: 20, marginBottom: 12 },
  thumb: { width: '100%', height: 160, borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.light.panelBorder, marginBottom: 12 },
  metaR: { gap: 8, marginBottom: 16 }, mi: { flexDirection: 'row', alignItems: 'center', gap: 6 }, mt: { fontSize: FontSizes.xs, color: Colors.light.textMuted },
  as: { backgroundColor: Colors.light.backgroundCardAlt, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.light.panelBorder },
  ac: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pb: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3a2312', alignItems: 'center', justifyContent: 'center' },
  tm: { fontSize: FontSizes.xs, color: Colors.light.textMuted, width: 40, textAlign: 'center' },
  pw: { flex: 1, height: 20, justifyContent: 'center', position: 'relative' },
  pbg: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: Colors.light.panelBorder, borderRadius: 2 },
  pfg: { position: 'absolute', left: 0, height: 3, backgroundColor: '#a84d28', borderRadius: 2 },
  nm: { position: 'absolute', zIndex: 10, marginLeft: -5 }, nd: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.light.gold, borderWidth: 1.5, borderColor: '#a84d28' },
  ar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.light.panelBorder, marginTop: 10, paddingTop: 10 },
  ab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  at: { fontSize: FontSizes.xs, color: Colors.light.textMuted, fontWeight: '600' },
  nf: { marginTop: 12, gap: 8 }, ni: { backgroundColor: Colors.light.authInputBg, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.light.panelBorder, color: Colors.light.text, fontSize: FontSizes.sm, paddingHorizontal: 14, paddingVertical: 10, minHeight: 60, textAlignVertical: 'top' },
  nfb: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }, na: { alignItems: 'center', padding: 20, gap: 8 }, nat: { color: Colors.light.textMuted, fontSize: FontSizes.sm },
  tc: { backgroundColor: Colors.light.panel, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder, marginBottom: Spacing.md, overflow: 'hidden' },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.light.panelBorder },
  tb: { flex: 1, paddingVertical: 12, alignItems: 'center' }, tba: { borderBottomWidth: 2, borderBottomColor: '#a84d28' },
  tl: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.light.textMuted, letterSpacing: 1 }, tla: { color: '#a84d28' },
  tx: { padding: Spacing.lg }, ctx: { fontSize: FontSizes.sm, color: Colors.light.text, lineHeight: 22 },
  et: { alignItems: 'center', padding: 24, gap: 8 }, ett: { color: Colors.light.textMuted, fontSize: FontSizes.sm, textAlign: 'center' },
  gs: { gap: 12 }, gd: { fontSize: FontSizes.sm, color: Colors.light.textMuted },
  gp: { alignItems: 'center', backgroundColor: Colors.light.backgroundCardAlt, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder, padding: 24, gap: 12 },
  gpt: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.light.gold }, gi: { fontSize: FontSizes.xs, color: Colors.light.textMuted },
  gn: { fontSize: FontSizes.xs, color: Colors.light.textDim, fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
  sc: { backgroundColor: Colors.light.panel, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder, padding: Spacing.lg, marginBottom: Spacing.md },
  st: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.light.text, marginBottom: Spacing.md },
  em: { color: Colors.light.textMuted, fontSize: FontSizes.sm, textAlign: 'center', marginTop: 8 },
  nti: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.light.panelBorder },
  nts: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2 }, nst: { fontSize: FontSizes.xs, color: Colors.light.gold, fontWeight: '600' },
  nct: { flex: 1, fontSize: FontSizes.sm, color: Colors.light.text, lineHeight: 20 }, nta: { flexDirection: 'row', gap: 8, paddingTop: 2 },
  cf: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  ci: { flex: 1, backgroundColor: Colors.light.authInputBg, borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 8, fontSize: FontSizes.sm, color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.panelBorder },
  cs: { padding: 8 }, cmi: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.light.panelBorder },
  cmb: { flex: 1 }, cmh: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cma: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.light.gold }, cmd: { fontSize: FontSizes.xs, color: Colors.light.textDim },
  cmc: { fontSize: FontSizes.sm, color: Colors.light.text, lineHeight: 20 }, cmac: { flexDirection: 'row', gap: 10, marginTop: 4 },
  mo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  mb: { backgroundColor: Colors.light.backgroundCardAlt, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: 12 },
  mtl: { color: Colors.light.textMain, fontSize: FontSizes.lg, fontWeight: '700' },
  mii: { backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.light.panelBorder, color: Colors.light.text, fontSize: FontSizes.sm, paddingHorizontal: 14, paddingVertical: 10, minHeight: 80, textAlignVertical: 'top' },
  ma: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
