import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { PageBackground } from '@/components/PageBackground';
import HeaderBar from '@/components/ui/HeaderBar';
import GoldButton from '@/components/ui/GoldButton';
import { useAuth } from '@/hooks/useAuth';
import { groupApi, type Group, type GroupMember } from '@/services/groupApi';
import { blogApi } from '@/services/blogApi';
import type { BlogPost } from '@/types/blog';
import { resolveMediaUrl } from '@/utils/media';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isMember = group?.members?.some((m: any) => (m.user?._id || m.user) === (user as any)?._id);
  const isAdmin = group?.members?.some((m: any) => (m.user?._id || m.user) === (user as any)?._id && m.role === 'admin');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const gRes = await groupApi.getGroupById(id);
      if (gRes.success) setGroup(gRes.data);
    } catch { Alert.alert('Lỗi', 'Không thể tải nhóm.'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleJoin = async () => {
    if (!user) { Alert.alert('Lỗi', 'Vui lòng đăng nhập.'); return; }
    try { await groupApi.joinGroup(id!); load(); }
    catch { Alert.alert('Lỗi', 'Không thể tham gia.'); }
  };

  const handleLeave = () => {
    Alert.alert('Xác nhận', 'Rời khỏi nhóm này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Rời', style: 'destructive', onPress: async () => {
        setLeaving(true);
        try { await groupApi.leaveGroup(id!); load(); }
        catch { Alert.alert('Lỗi', 'Không thể rời nhóm.'); }
        finally { setLeaving(false); }
      }},
    ]);
  };

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) { Alert.alert('Lỗi', 'Nhập đầy đủ tiêu đề và nội dung.'); return; }
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append('title', newTitle.trim());
      fd.append('content', newContent.trim());
      fd.append('category', 'Chủ đề chung');
      fd.append('tags', '');
      fd.append('groupId', id!);
      await blogApi.createPost(fd);
      Alert.alert('OK', 'Bài viết đã được gửi.');
      setShowCreatePost(false);
      setNewTitle(''); setNewContent('');
      load();
    } catch { Alert.alert('Lỗi', 'Không thể đăng bài.'); }
    finally { setCreating(false); }
  };

  if (loading) {
    return <PageBackground style={S.ct}><HeaderBar title="Nhóm" showBack /><View style={S.cent}><ActivityIndicator size="large" color={Colors.light.gold} /></View></PageBackground>;
  }
  if (!group) {
    return <PageBackground style={S.ct}><HeaderBar title="Nhóm" showBack /><View style={S.cent}><Text style={S.err}>Không tìm thấy nhóm.</Text></View></PageBackground>;
  }

  return (
    <PageBackground style={S.ct}>
      <HeaderBar title={group.name} showBack />
      <FlatList
        data={[]}
        renderItem={() => null}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); load(); }}
        ListHeaderComponent={
          <View style={S.content}>
            {/* Group Info */}
            <View style={S.infoCard}>
              <View style={S.av}><Text style={S.avT}>{group.name?.charAt(0)?.toUpperCase()}</Text></View>
              <Text style={S.groupName}>{group.name}</Text>
              <Text style={S.groupDesc}>{group.description || 'Chưa có mô tả.'}</Text>
              <View style={S.metaRow}>
                <Ionicons name="people-outline" size={14} color={Colors.light.textMuted} />
                <Text style={S.metaText}>{group.memberCount} thành viên</Text>
                <Ionicons name="calendar-outline" size={14} color={Colors.light.textMuted} style={{ marginLeft: 12 }} />
                <Text style={S.metaText}>Tạo {new Date(group.createdAt).toLocaleDateString('vi-VN')}</Text>
              </View>

              {isMember ? (
                <GoldButton title="Rời nhóm" variant="secondary" onPress={handleLeave} loading={leaving} style={{ marginTop: 8 }} />
              ) : (
                <GoldButton title="Tham gia nhóm" onPress={handleJoin} style={{ marginTop: 8 }} />
              )}
            </View>

            {/* Members */}
            <View style={S.section}>
              <Text style={S.sectionTitle}>Thành viên ({group.members?.length || 0})</Text>
              <View style={S.memberRow}>
                {(group.members || []).slice(0, 10).map((m: GroupMember, idx: number) => (
                  <View key={idx} style={S.memberAv}>
                    <Text style={S.memberAvT}>{m.user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                    {m.role === 'admin' && <View style={S.adminStar}><Text style={S.adminStarT}>⭐</Text></View>}
                  </View>
                ))}
              </View>
            </View>

            {/* Create post button */}
            {isMember && (
              <GoldButton
                title="Viết bài mới trong nhóm"
                onPress={() => setShowCreatePost(true)}
                style={{ marginBottom: 12 }}
              />
            )}
          </View>
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Post Modal */}
      <Modal visible={showCreatePost} animationType="slide" transparent>
        <View style={S.mo}><View style={S.mc}>
          <View style={S.mh}>
            <Text style={S.mt}>Viết bài trong nhóm</Text>
            <TouchableOpacity onPress={() => setShowCreatePost(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          <View style={S.mb}>
            <TextInput style={S.input} placeholder="Tiêu đề" placeholderTextColor={Colors.light.textDim} value={newTitle} onChangeText={setNewTitle} />
            <TextInput style={[S.input, { height: 120, textAlignVertical: 'top' }]} placeholder="Nội dung" placeholderTextColor={Colors.light.textDim} value={newContent} onChangeText={setNewContent} multiline />
            <GoldButton title="Đăng bài" onPress={handleCreatePost} loading={creating} />
          </View>
        </View></View>
      </Modal>
    </PageBackground>
  );
}

const S = StyleSheet.create({
  ct: { flex: 1 },
  cent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  err: { color: Colors.light.textMuted, fontSize: FontSizes.md, marginTop: 12 },
  content: { padding: Spacing.md },
  infoCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  av: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(201,161,90,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.light.gold },
  avT: { color: Colors.light.gold, fontWeight: '700', fontSize: 28 },
  groupName: { fontFamily: 'Playfair Display', fontSize: FontSizes.xl, fontWeight: '700', color: Colors.light.textMain },
  groupDesc: { color: Colors.light.textMuted, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: Colors.light.textDim, fontSize: FontSizes.xs },
  section: { marginBottom: Spacing.md },
  sectionTitle: { color: Colors.light.textMain, fontSize: FontSizes.md, fontWeight: '700', marginBottom: 8 },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberAv: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(201,161,90,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.light.goldDark },
  memberAvT: { color: Colors.light.gold, fontWeight: '600', fontSize: FontSizes.sm },
  adminStar: { position: 'absolute', top: -4, right: -4 },
  adminStarT: { fontSize: 12 },
  // Modal
  mo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  mc: { backgroundColor: Colors.light.backgroundCardAlt, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '70%' },
  mh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.light.panelBorder },
  mt: { color: Colors.light.textMain, fontSize: FontSizes.lg, fontWeight: '700' },
  mb: { padding: Spacing.lg, gap: 12 },
  input: {
    backgroundColor: Colors.light.backgroundCardAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    color: Colors.light.textMain,
    fontSize: FontSizes.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
