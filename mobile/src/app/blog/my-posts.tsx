import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Alert, Modal, ScrollView, Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { PageBackground } from '@/components/PageBackground';
import GoldButton from '@/components/ui/GoldButton';
import AuthInput from '@/components/ui/AuthInput';
import HeaderBar from '@/components/ui/HeaderBar';
import { useAuth } from '@/hooks/useAuth';
import { blogApi } from '@/services/blogApi';
import { resolveMediaUrl } from '@/utils/media';
import type { BlogPost } from '@/types/blog';

const CATEGORIES = ['Chủ đề chung', 'Lịch sử cổ đại', 'Lịch sử trung đại', 'Lịch sử cận đại', 'Lịch sử hiện đại', 'Nhân vật lịch sử', 'Di tích & Văn hóa', 'Tài liệu tham khảo'];

const STATUS: Record<string, { l: string; c: string }> = { Published: { l: 'Đã xuất bản', c: Colors.light.success }, Pending_Review: { l: 'Chờ duyệt', c: Colors.light.gold }, Rejected: { l: 'Bị từ chối', c: Colors.light.error } };

const fmt = (d: string) => { try { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; } };

export default function MyPostsScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eContent, setEContent] = useState('');
  const [eCat, setECat] = useState('');
  const [eTags, setETags] = useState('');
  const [eLoading, setELoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await blogApi.getMyPosts(); if (r.success) setPosts(r.data); }
    catch { Alert.alert('Lỗi', 'Không thể tải bài viết.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { if (user) fetch(); }, [user]);

  const handleEdit = async () => {
    if (!editing || !eTitle.trim() || !eContent.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ.'); return; }
    setELoading(true);
    try { const fd = new FormData(); fd.append('title', eTitle.trim()); fd.append('content', eContent.trim()); fd.append('category', eCat); fd.append('tags', eTags); await blogApi.updatePost(editing._id, fd); setEditing(null); Alert.alert('Thành công', 'Đã cập nhật.'); fetch(); }
    catch { Alert.alert('Lỗi', 'Không thể cập nhật.'); }
    finally { setELoading(false); }
  };

  const handleDelete = (pid: string) => {
    Alert.alert('Xác nhận', 'Xóa bài viết này?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: async () => { try { await blogApi.deletePost(pid); fetch(); } catch { Alert.alert('Lỗi', 'Không thể xóa.'); } } }]);
  };

  const renderItem = ({ item }: { item: BlogPost }) => {
    const s = STATUS[item.status] || { l: item.status, c: Colors.light.textMuted };
    const img = item.images?.[0]?.url ? resolveMediaUrl(item.images[0].url) : undefined;
    return (
      <View style={S.card}>
        <View style={S.cardH}><Text style={S.cardCat}>{item.category}</Text><View style={[S.sBadge, { backgroundColor: s.c + '22' }]}><Text style={[S.sBadgeT, { color: s.c }]}>{s.l}</Text></View></View>
        <Text style={S.cardT} numberOfLines={2}>{item.title}</Text>
        <Text style={S.cardD} numberOfLines={2}>{item.content}</Text>
        {img && <Image source={{ uri: img }} style={S.cardImg} resizeMode="cover" onError={() => {}} />}
        {item.reviewFeedback ? <View style={S.fb}><Ionicons name="information-circle-outline" size={14} color={Colors.light.textMuted} /><Text style={S.fbT}>{item.reviewFeedback}</Text></View> : null}
        <View style={S.cardF}>
          <Text style={S.cardDate}>{fmt(item.createdAt)}</Text>
          <View style={S.cardS}><Ionicons name="heart-outline" size={12} color={Colors.light.textMuted} /><Text style={S.cardST}>{item.likeCount}</Text><Ionicons name="chatbubble-outline" size={12} color={Colors.light.textMuted} /><Text style={S.cardST}>{item.commentCount}</Text></View>
          <View style={S.cardAct}>
            <TouchableOpacity onPress={() => { setEditing(item); setETitle(item.title); setEContent(item.content); setECat(item.category); setETags(item.tags?.join(', ') || ''); }}><Ionicons name="pencil" size={16} color={Colors.light.gold} /></TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item._id)}><Ionicons name="trash" size={16} color={Colors.light.error} /></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (!user) return <PageBackground style={S.ct}><HeaderBar title="Bài Viết Của Tôi" showBack /><View style={S.cent}><Ionicons name="lock-closed-outline" size={48} color={Colors.light.textMuted} /><Text style={S.err}>Vui lòng đăng nhập.</Text></View></PageBackground>;

  return (
    <PageBackground style={S.ct}>
      <HeaderBar title="Bài Viết Của Tôi" showBack />
      {loading && posts.length === 0 ? <View style={S.cent}><ActivityIndicator size="large" color={Colors.light.gold} /></View>
        : posts.length === 0 ? <View style={S.cent}><Ionicons name="document-text-outline" size={48} color={Colors.light.textMuted} /><Text style={S.err}>Bạn chưa có bài viết nào.</Text></View>
          : <FlatList data={posts} renderItem={renderItem} keyExtractor={(it) => it._id} refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} contentContainerStyle={S.list} showsVerticalScrollIndicator={false} />}
      <Modal visible={!!editing} animationType="slide" transparent>
        <View style={S.mo}><View style={S.mc}>
          <View style={S.mh}><Text style={S.mt}>Sửa Bài Viết</Text><TouchableOpacity onPress={() => setEditing(null)}><Ionicons name="close" size={24} color={Colors.light.text} /></TouchableOpacity></View>
          <ScrollView style={S.mb} contentContainerStyle={{ gap: 12 }}>
            <AuthInput label="Tiêu đề" value={eTitle} onChangeText={setETitle} />
            <AuthInput label="Nội dung" value={eContent} onChangeText={setEContent} multiline numberOfLines={6} style={{ height: 120, textAlignVertical: 'top' }} />
            <Text style={S.lbl}>Danh mục</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c} style={[S.cPill, eCat === c && S.cPillA]} onPress={() => setECat(c)}>
                  <Text style={[S.cPillT, eCat === c && S.cPillTA]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <AuthInput label="Tags" value={eTags} onChangeText={setETags} />
            <GoldButton title="Cập Nhật" onPress={handleEdit} loading={eLoading} />
          </ScrollView>
        </View></View>
      </Modal>
    </PageBackground>
  );
}

const S = StyleSheet.create({
  ct: { flex: 1 }, cent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  err: { color: Colors.light.textMuted, fontSize: FontSizes.md, marginTop: 12, textAlign: 'center' },
  list: { padding: Spacing.md, paddingBottom: 40 },
  card: { backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder, padding: Spacing.md, marginBottom: Spacing.sm },
  cardH: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardCat: { color: Colors.light.gold, fontSize: FontSizes.xs, fontWeight: '600' },
  sBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }, sBadgeT: { fontSize: FontSizes.xs, fontWeight: '600' },
  cardT: { color: Colors.light.textMain, fontSize: FontSizes.md, fontWeight: '700', marginBottom: 4 },
  cardD: { color: Colors.light.textMuted, fontSize: FontSizes.sm, marginBottom: 8 },
  cardImg: { width: '100%', height: 120, borderRadius: BorderRadius.md, marginBottom: 8 },
  fb: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.light.backgroundCardAlt, borderRadius: BorderRadius.sm, padding: 8, marginBottom: 8 },
  fbT: { color: Colors.light.textMuted, fontSize: FontSizes.xs, flex: 1 },
  cardF: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardDate: { color: Colors.light.textDim, fontSize: FontSizes.xs },
  cardS: { flexDirection: 'row', alignItems: 'center', gap: 2 }, cardST: { color: Colors.light.textMuted, fontSize: FontSizes.xs, marginLeft: 2, marginRight: 8 },
  cardAct: { flexDirection: 'row', gap: 8 },
  mo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  mc: { backgroundColor: Colors.light.backgroundCardAlt, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '80%' },
  mh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.light.panelBorder },
  mt: { color: Colors.light.textMain, fontSize: FontSizes.lg, fontWeight: '700' }, mb: { padding: Spacing.lg },
  lbl: { color: Colors.light.textMuted, fontSize: FontSizes.sm, marginTop: 8 },
  cPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: Colors.light.backgroundCard, borderWidth: 1, borderColor: Colors.light.panelBorder, marginRight: 8 },
  cPillA: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  cPillT: { color: Colors.light.textMuted, fontSize: FontSizes.xs }, cPillTA: { color: Colors.light.backgroundDark, fontWeight: '700' },
});
