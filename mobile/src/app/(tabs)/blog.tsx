import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, ScrollView, Alert, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
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

const CATEGORIES = ['Tất cả', 'Chủ đề chung', 'Lịch sử cổ đại', 'Lịch sử trung đại', 'Lịch sử cận đại', 'Lịch sử hiện đại', 'Nhân vật lịch sử', 'Di tích & Văn hóa', 'Tài liệu tham khảo'];

const formatDateTime = (d: string) => {
  try { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

export default function BlogFeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createCat, setCreateCat] = useState('Chủ đề chung');
  const [createTags, setCreateTags] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const fetchPosts = useCallback(async (pg: number, cat: string, s: string, reset = false) => {
    if (reset) setLoading(true);
    try {
      const res = await blogApi.getPublishedPosts(pg, 10, cat === 'Tất cả' ? undefined : cat, s.trim() || undefined);
      if (res.success) {
        setPosts(reset ? res.data : (prev) => [...prev, ...res.data]);
        setPage(res.pagination.page);
        setTotalPages(res.pagination.pages);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchPosts(1, category, search, true); }, [category, search]);

  const handleCreate = async () => {
    if (!createTitle.trim() || !createContent.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề và nội dung.'); return; }
    setCreateLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', createTitle.trim()); fd.append('content', createContent.trim());
      fd.append('category', createCat); fd.append('tags', createTags);
      await blogApi.createPost(fd);
      setShowCreate(false); setCreateTitle(''); setCreateContent(''); setCreateCat('Chủ đề chung'); setCreateTags('');
      Alert.alert('Thành công', 'Bài viết đã được gửi để duyệt!');
      fetchPosts(1, category, search, true);
    } catch { Alert.alert('Lỗi', 'Không thể tạo bài viết.'); }
    finally { setCreateLoading(false); }
  };

  const renderPost = ({ item }: { item: BlogPost }) => {
    const avatarUrl = resolveMediaUrl(item.author?.avatar);
    const imageUrl = item.images?.[0]?.url ? resolveMediaUrl(item.images[0].url) : undefined;

    return (
      <TouchableOpacity style={S.card} onPress={() => router.push(`/blog/${item._id}` as any)} activeOpacity={0.8}>
        {/* Author row */}
        <View style={S.authorRow}>
          {avatarUrl ? <Image source={{ uri: avatarUrl }} style={S.avatar} onError={() => {}} />
            : <View style={S.avatarPl}><Text style={S.avatarPlT}>{item.author?.name?.charAt(0)?.toUpperCase() || '?'}</Text></View>}
          <View style={S.authorInfo}>
            <Text style={S.authorName}>{item.author?.name || 'Ẩn danh'}</Text>
            <Text style={S.time}>{formatDateTime(item.createdAt)}</Text>
          </View>
          <View style={S.catBadge}><Text style={S.catBadgeT}>{item.category}</Text></View>
        </View>

        <Text style={S.title} numberOfLines={2}>{item.title}</Text>
        <Text style={S.excerpt} numberOfLines={3}>{item.content}</Text>

      {imageUrl && (
        <Image source={{ uri: imageUrl }} style={S.postImage} resizeMode="cover"
          onError={() => console.log('Blog image load error:', imageUrl)} />
      )}

        {/* Stats */}
        <View style={S.stats}>
          <View style={S.stat}><Ionicons name="heart-outline" size={14} color={Colors.light.textMuted} /><Text style={S.statT}>{item.likeCount} Thích</Text></View>
          <View style={S.stat}><Ionicons name="chatbubble-outline" size={14} color={Colors.light.textMuted} /><Text style={S.statT}>{item.commentCount} Bình luận</Text></View>
          <View style={S.stat}><Ionicons name="eye-outline" size={14} color={Colors.light.textMuted} /><Text style={S.statT}>{item.viewCount} Xem</Text></View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Header */}
      <View style={S.headerArea}>
        <Text style={S.mainTitle}>Diễn đàn sử việt</Text>
        <Text style={S.subtitle}>Nơi thảo luận, chia sẻ kiến thức lịch sử và trao đổi học tập</Text>
        {user && (
          <View style={S.headerBtns}>
            <TouchableOpacity style={S.btnOutline} onPress={() => router.push('/blog/my-posts' as any)}>
              <Text style={S.btnOutlineT}>Bài viết của tôi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.btnGold} onPress={() => setShowCreate(true)}>
              <Ionicons name="add" size={16} color={Colors.light.backgroundDark} />
              <Text style={S.btnGoldT}>Viết bài mới</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Search + Filter */}
      <View style={S.filterRow}>
        <View style={S.searchWrap}>
          <Ionicons name="search" size={16} color={Colors.light.textMuted} style={{ marginLeft: 10 }} />
          <TextInput style={S.searchInput} placeholder="Tìm kiếm bài viết..." placeholderTextColor={Colors.light.textDim}
            value={searchInput} onChangeText={setSearchInput} onSubmitEditing={() => setSearch(searchInput)} returnKeyType="search" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.catScroll} contentContainerStyle={S.catContent}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c} style={[S.catPill, category === c && S.catPillActive]} onPress={() => setCategory(c)}>
              <Text style={[S.catPillT, category === c && S.catPillTActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <PageBackground style={S.ct}>
      <HeaderBar title="Diễn Đàn" />
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(it) => it._id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={S.listContent}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); fetchPosts(1, category, search, true); }}
        onEndReached={() => { if (page < totalPages && !loading) fetchPosts(page + 1, category, search); }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={!loading ? <View style={S.empty}><Ionicons name="chatbubbles-outline" size={48} color={Colors.light.textMuted} /><Text style={S.emptyT}>Chưa có bài viết nào. Hãy viết bài đầu tiên!</Text></View> : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={S.mo}>
          <View style={S.mc}>
            <View style={S.mh}><Text style={S.mt}>Viết Bài Mới</Text><TouchableOpacity onPress={() => setShowCreate(false)}><Ionicons name="close" size={24} color={Colors.light.text} /></TouchableOpacity></View>
            <ScrollView style={S.mb} contentContainerStyle={{ gap: 12 }}>
              <AuthInput label="Tiêu đề" placeholder="Tiêu đề bài viết" value={createTitle} onChangeText={setCreateTitle} />
              <AuthInput label="Nội dung" placeholder="Nội dung bài viết" value={createContent} onChangeText={setCreateContent} multiline numberOfLines={6} style={{ height: 120, textAlignVertical: 'top' }} />
              <Text style={S.lbl}>Danh mục</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.filter((c) => c !== 'Tất cả').map((c) => (
                  <TouchableOpacity key={c} style={[S.catPill, createCat === c && S.catPillActive]} onPress={() => setCreateCat(c)}>
                    <Text style={[S.catPillT, createCat === c && S.catPillTActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <AuthInput label="Tags" placeholder="Tags (phân cách bằng dấu phẩy)" value={createTags} onChangeText={setCreateTags} />
              <GoldButton title="Đăng Bài" onPress={handleCreate} loading={createLoading} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </PageBackground>
  );
}

const S = StyleSheet.create({
  ct: { flex: 1 },
  listContent: { paddingBottom: 80 },
  empty: { alignItems: 'center', padding: 40 }, emptyT: { color: Colors.light.textMuted, fontSize: FontSizes.md, marginTop: 12, textAlign: 'center' },
  // Header
  headerArea: { padding: Spacing.lg, paddingTop: Spacing.sm },
  mainTitle: { fontFamily: 'Playfair Display', fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.dark.maroonDark },
  subtitle: { fontSize: FontSizes.sm, color: Colors.dark.maroonDark, marginTop: 4, marginBottom: 12 },
  headerBtns: { flexDirection: 'row', gap: 10 },
  btnOutline: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.light.gold },
  btnOutlineT: { color: Colors.dark.maroonDark, fontWeight: '700', fontSize: FontSizes.sm },
  btnGold: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.light.gold },
  btnGoldT: { color: Colors.light.backgroundDark, fontWeight: '700', fontSize: FontSizes.sm },
  // Filter
  filterRow: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder, marginBottom: 8 },
  searchInput: { flex: 1, color: Colors.light.authButtonBrown, fontSize: FontSizes.sm, paddingVertical: 10, paddingRight: 12 },
  catScroll: { maxHeight: 36 }, catContent: { gap: 8, paddingRight: Spacing.md },
  catPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: Colors.light.backgroundCard, borderWidth: 1, borderColor: Colors.light.panelBorder },
  catPillActive: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  catPillT: { color: Colors.light.textMuted, fontSize: FontSizes.xs }, catPillTActive: { color: Colors.light.backgroundDark, fontWeight: '700' },
  // Card
  card: { backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder, padding: Spacing.md, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarPl: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.light.gold + '33', alignItems: 'center', justifyContent: 'center' },
  avatarPlT: { color: Colors.light.gold, fontWeight: '700', fontSize: FontSizes.sm },
  authorInfo: { flex: 1 }, authorName: { color: Colors.light.textMain, fontSize: FontSizes.sm, fontWeight: '600' },
  time: { color: Colors.light.textDim, fontSize: FontSizes.xs, marginTop: 1 },
  catBadge: { backgroundColor: Colors.light.gold + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  catBadgeT: { color: Colors.light.gold, fontSize: FontSizes.xs, fontWeight: '600' },
  title: { color: Colors.light.textMain, fontSize: FontSizes.lg, fontWeight: '700', marginBottom: 4 },
  excerpt: { color: Colors.light.textMuted, fontSize: FontSizes.sm, lineHeight: 20, marginBottom: 8 },
  postImage: { width: '100%', height: 160, borderRadius: BorderRadius.md, marginBottom: 8 },
  stats: { flexDirection: 'row', gap: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 }, statT: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
  // Modal
  mo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  mc: { backgroundColor: Colors.light.backgroundCardAlt, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '80%' },
  mh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.light.panelBorder },
  mt: { color: Colors.light.textMain, fontSize: FontSizes.lg, fontWeight: '700' },
  mb: { padding: Spacing.lg },
  lbl: { color: Colors.light.textMuted, fontSize: FontSizes.sm, marginTop: 8 },
});
