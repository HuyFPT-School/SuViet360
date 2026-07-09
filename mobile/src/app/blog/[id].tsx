import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { PageBackground } from '@/components/PageBackground';
import GoldButton from '@/components/ui/GoldButton';
import AuthInput from '@/components/ui/AuthInput';
import HeaderBar from '@/components/ui/HeaderBar';
import { useAuth } from '@/hooks/useAuth';
import { blogApi } from '@/services/blogApi';
import { resolveMediaUrl } from '@/utils/media';
import type { BlogPost, BlogComment } from '@/types/blog';

const REPORT_REASONS = [
  { value: 'Spam', label: 'Tin rác / Spam' },
  { value: 'Offensive_Language', label: 'Ngôn từ thô tục, xúc phạm' },
  { value: 'Historical_Inaccuracy', label: 'Sai lệch thông tin lịch sử' },
  { value: 'Harassment', label: 'Quấy rối, công kích cá nhân' },
  { value: 'Other', label: 'Lý do khác' },
];

const fmt = (d: string) => { try { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; } };
const roleBadge = (r: string) => r === 'teacher' ? 'Giáo viên' : r === 'admin' ? 'Quản trị' : r === 'staff' ? 'Nhân viên' : null;

export default function BlogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'Post' | 'Comment'; id: string } | null>(null);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDesc, setReportDesc] = useState('');
  const [reporting, setReporting] = useState(false);

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    try {
      const [pr, cr] = await Promise.all([blogApi.getPostById(id!), blogApi.getCommentsByPost(id!)]);
      if (pr.success) { setPost(pr.data); setLikeCount(pr.data.likeCount); }
      if (cr.success) setComments(cr.data);
      if (user) { try { const lr = await blogApi.getLikeStatus('Post', id!); setLiked(lr.liked); } catch { /* */ } }
    } catch { setError('Không thể tải bài viết.'); }
    finally { setLoading(false); }
  };

  const handleLike = async () => {
    if (!user) { Alert.alert('Thông báo', 'Vui lòng đăng nhập để thích bài viết.'); return; }
    try { const r = await blogApi.toggleLike('Post', id!); if (r.success) { setLiked(r.liked); setLikeCount(r.likeCount); } } catch { /* */ }
  };

  const handleLikeComment = async (cid: string) => {
    if (!user) return;
    try { await blogApi.toggleLike('Comment', cid); const cr = await blogApi.getCommentsByPost(id!); if (cr.success) setComments(cr.data); } catch { /* */ }
  };

  const submitComment = async (parentId: string | null) => {
    const txt = parentId ? replyText : commentText;
    if (!txt.trim()) return;
    setSubmitting(true);
    try { await blogApi.createComment(id!, txt.trim(), parentId); setCommentText(''); setReplyText(''); setActiveReplyId(null); const cr = await blogApi.getCommentsByPost(id!); if (cr.success) setComments(cr.data); }
    catch { Alert.alert('Lỗi', 'Không thể gửi bình luận.'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteComment = (cid: string) => {
    Alert.alert('Xác nhận', 'Xóa bình luận này?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: async () => { await blogApi.deleteComment(cid); const cr = await blogApi.getCommentsByPost(id!); if (cr.success) setComments(cr.data); } }]);
  };

  const handleDeletePost = () => {
    Alert.alert('Xác nhận', 'Xóa bài viết này?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: async () => { try { await blogApi.deletePost(id!); router.replace('/blog' as any); } catch { Alert.alert('Lỗi', 'Không thể xóa.'); } } }]);
  };

  const openReport = (type: 'Post' | 'Comment', tid: string) => {
    if (!user) { Alert.alert('Thông báo', 'Vui lòng đăng nhập để báo cáo.'); return; }
    setReportTarget({ type, id: tid }); setReportReason('Spam'); setReportDesc(''); setShowReport(true);
  };

  const handleReport = async () => {
    if (!reportTarget) return;
    setReporting(true);
    try { await blogApi.createReport({ targetType: reportTarget.type, targetId: reportTarget.id, reason: reportReason, description: reportDesc.trim() || undefined }); Alert.alert('Đã gửi', 'Báo cáo của bạn đã được gửi thành công. Ban quản trị sẽ sớm xem xét và xử lý.'); setShowReport(false); }
    catch { Alert.alert('Lỗi', 'Đã xảy ra lỗi khi gửi báo cáo.'); }
    finally { setReporting(false); }
  };

  if (loading) return <PageBackground style={S.ct}><HeaderBar title="Chi Tiết" showBack /><View style={S.c}><ActivityIndicator size="large" color={Colors.light.gold} /></View></PageBackground>;
  if (error || !post) return <PageBackground style={S.ct}><HeaderBar title="Chi Tiết" showBack /><View style={S.c}><Ionicons name="alert-circle-outline" size={48} color={Colors.light.textMuted} /><Text style={S.err}>{error || 'Không tìm thấy bài viết.'}</Text></View></PageBackground>;

  const avatarUrl = resolveMediaUrl(post.author?.avatar);
  const isOwner = user?.id === post.author?._id;
  const isMod = user && ['admin', 'staff'].includes(user.role);

  const renderComment = (c: BlogComment, depth = 0) => (
    <View key={c._id} style={[S.cmt, depth > 0 && S.cmtNested]}>
      <View style={S.cmtH}>
        {c.author?.avatar ? <Image source={{ uri: resolveMediaUrl(c.author.avatar) }} style={S.cmtAv} onError={() => {}} /> : <View style={S.cmtAvPl}><Text style={S.cmtAvPlT}>{c.author?.name?.charAt(0)?.toUpperCase() || '?'}</Text></View>}
        <View style={{ flex: 1 }}>
          <View style={S.cmtARow}>
            <Text style={S.cmtA}>{c.author?.name || 'Ẩn danh'}</Text>
            {roleBadge(c.author?.role) && <View style={S.rb}><Text style={S.rbT}>{roleBadge(c.author.role)}</Text></View>}
            <Text style={S.cmtD}>{fmt(c.createdAt)}</Text>
          </View>
          <Text style={S.cmtTx}>{c.content}</Text>
          <View style={S.cmtAct}>
            <TouchableOpacity onPress={() => handleLikeComment(c._id)}><Text style={S.cmtActT}>Thích ({c.likeCount})</Text></TouchableOpacity>
            {user && <TouchableOpacity onPress={() => { setActiveReplyId(activeReplyId === c._id ? null : c._id); setReplyText(''); }}><Text style={S.cmtActT}>Trả lời</Text></TouchableOpacity>}
            <TouchableOpacity onPress={() => openReport('Comment', c._id)}><Text style={S.cmtActT}>Báo cáo</Text></TouchableOpacity>
            {(user?.id === c.author?._id || isMod) && <TouchableOpacity onPress={() => handleDeleteComment(c._id)}><Text style={[S.cmtActT, { color: Colors.light.error }]}>Xóa</Text></TouchableOpacity>}
          </View>
        </View>
      </View>
      {activeReplyId === c._id && (
        <View style={S.rpRow}><TextInput style={S.rpIn} placeholder="Viết trả lời..." placeholderTextColor={Colors.light.textDim} value={replyText} onChangeText={setReplyText} /><TouchableOpacity onPress={() => submitComment(c._id)}><Ionicons name="send" size={16} color={Colors.light.gold} /></TouchableOpacity></View>
      )}
      {c.replies?.map((r) => renderComment(r, depth + 1))}
    </View>
  );

  return (
    <PageBackground style={S.ct}>
      <HeaderBar title="Chi Tiết" showBack />
      <ScrollView style={S.sc} contentContainerStyle={S.scc}>
        {/* Post */}
        <View style={S.pc}>
          <Text style={S.pCat}>{post.category}</Text>
          <Text style={S.pTtl}>{post.title}</Text>

          {/* Author */}
          <View style={S.pMeta}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={S.av} onError={() => {}} /> : <View style={S.avPl}><Text style={S.avPlT}>{post.author?.name?.charAt(0)?.toUpperCase() || '?'}</Text></View>}
            <View style={{ flex: 1 }}>
              <View style={S.pNameRow}>
                <Text style={S.pName}>{post.author?.name || 'Ẩn danh'}</Text>
                {roleBadge(post.author?.role) && <View style={S.rb}><Text style={S.rbT}>{roleBadge(post.author.role)}</Text></View>}
              </View>
              <Text style={S.pDate}>Đăng lúc {fmt(post.createdAt)}</Text>
            </View>
            {(isOwner || isMod) && (
              <View style={S.pOwnerAct}>
                {isOwner && <TouchableOpacity onPress={() => router.push('/blog/my-posts' as any)}><Text style={S.ownerEdit}>Chỉnh sửa</Text></TouchableOpacity>}
                <TouchableOpacity onPress={handleDeletePost}><Text style={S.ownerDel}>Xóa bài viết</Text></TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={S.pContent}>{post.content}</Text>

          {/* Image Gallery */}
          {post.images && post.images.length > 0 && (
            <View style={S.gal}>
              {post.images.map((img, idx) => {
                const resolvedUri = resolveMediaUrl(img?.url);
                if (!resolvedUri) return null;
                return (
                  <View key={img.publicId || idx} style={S.galItem}>
                    <Image source={{ uri: resolvedUri }} style={S.galImg} resizeMode="cover"
                      onError={(e) => console.log('Detail image load error:', resolvedUri, e.nativeEvent?.error)} />
                    <Text style={S.galLabel}>Minh họa {idx + 1}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Actions */}
          <View style={S.actBar}>
            <View style={S.actLeft}>
              <TouchableOpacity onPress={handleLike} style={[S.likeBtn, liked && S.likeBtnA]}>
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#e04040' : Colors.light.textMuted} />
                <Text style={[S.likeT, liked && S.likeTA]}>{likeCount} Thích</Text>
              </TouchableOpacity>
              <View style={S.viewWrap}><Ionicons name="eye-outline" size={14} color={Colors.light.textMuted} /><Text style={S.viewT}>{post.viewCount} Xem</Text></View>
            </View>
            <TouchableOpacity onPress={() => openReport('Post', post._id)} style={S.reportBtn}>
              <Ionicons name="warning-outline" size={14} color={Colors.light.textMuted} />
              <Text style={S.reportT}>Báo cáo bài viết</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments */}
        <View style={S.pc}>
          <Text style={S.secT}>Thảo luận ({comments.length})</Text>
          {user ? (
            <View style={S.inpRow}><TextInput style={S.inp} placeholder="Viết bình luận của bạn..." placeholderTextColor={Colors.light.textDim} value={commentText} onChangeText={setCommentText} multiline /><GoldButton title="Gửi" onPress={() => submitComment(null)} loading={submitting} /></View>
          ) : (
            <View style={S.loginNudge}><Text style={S.loginNudgeT}>Vui lòng <Text style={S.loginNudgeL} onPress={() => router.push('/login' as any)}>Đăng nhập</Text> để tham gia thảo luận.</Text></View>
          )}
          {comments.map((c) => renderComment(c))}
          {comments.length === 0 && <Text style={S.noCmt}>Chưa có bình luận nào.</Text>}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Report Modal */}
      <Modal visible={showReport} animationType="slide" transparent>
        <View style={S.mo}><View style={S.mc}>
          <View style={S.mh}><Text style={S.mt}>Báo cáo vi phạm</Text><TouchableOpacity onPress={() => setShowReport(false)}><Ionicons name="close" size={24} color={Colors.light.text} /></TouchableOpacity></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.rpPills} contentContainerStyle={{ gap: 8, paddingHorizontal: Spacing.lg }}>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity key={r.value} style={[S.rPill, reportReason === r.value && S.rPillA]} onPress={() => setReportReason(r.value)}>
                <Text style={[S.rPillT, reportReason === r.value && S.rPillTA]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ paddingHorizontal: Spacing.lg }}>
            <AuthInput label="Mô tả thêm" placeholder="Mô tả thêm (không bắt buộc)" value={reportDesc} onChangeText={setReportDesc} multiline />
            <GoldButton title="Gửi Báo Cáo" onPress={handleReport} loading={reporting} />
          </View>
        </View></View>
      </Modal>
    </PageBackground>
  );
}

const S = StyleSheet.create({
  ct: { flex: 1 }, c: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  err: { color: Colors.light.textMuted, fontSize: FontSizes.md, marginTop: 12, textAlign: 'center' },
  sc: { flex: 1 }, scc: { padding: Spacing.md, paddingBottom: 40 },
  // Post card
  pc: { backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder, padding: Spacing.lg, marginBottom: Spacing.md },
  pCat: { color: Colors.light.gold, fontSize: FontSizes.xs, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  pTtl: { fontFamily: 'Playfair Display', fontSize: FontSizes.xl, fontWeight: '700', color: Colors.light.textMain, marginBottom: 14 },
  pMeta: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  av: { width: 36, height: 36, borderRadius: 18 }, avPl: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.gold + '33', alignItems: 'center', justifyContent: 'center' },
  avPlT: { color: Colors.light.gold, fontWeight: '700', fontSize: FontSizes.md },
  pNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  pName: { color: Colors.light.textMain, fontWeight: '600', fontSize: FontSizes.sm },
  rb: { backgroundColor: Colors.light.gold + '22', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  rbT: { color: Colors.light.gold, fontSize: FontSizes.xs, fontWeight: '600' },
  pDate: { color: Colors.light.textDim, fontSize: FontSizes.xs },
  pOwnerAct: { flexDirection: 'row', gap: 8 },
  ownerEdit: { color: Colors.light.gold, fontSize: FontSizes.xs, fontWeight: '600' },
  ownerDel: { color: Colors.light.error, fontSize: FontSizes.xs, fontWeight: '600' },
  pContent: { color: Colors.light.textMain, fontSize: FontSizes.md, lineHeight: 24 },
  gal: { marginTop: 16, gap: 12 },
  galItem: { width: '100%' },
  galImg: { width: '100%', height: 200, borderRadius: BorderRadius.md, backgroundColor: Colors.light.backgroundCardAlt },
  galLabel: { color: Colors.light.textMuted, fontSize: FontSizes.xs, marginTop: 4, fontStyle: 'italic' },
  actBar: { borderTopWidth: 1, borderTopColor: Colors.light.panelBorder, marginTop: 16, paddingTop: 12, gap: 10 },
  actLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 14, borderRadius: BorderRadius.md, backgroundColor: Colors.light.backgroundCardAlt, borderWidth: 1, borderColor: Colors.light.panelBorder },
  likeBtnA: { borderColor: '#e04040' }, likeT: { color: Colors.light.textMuted, fontSize: FontSizes.sm }, likeTA: { color: '#e04040' },
  viewWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 }, viewT: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
  reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }, reportT: { color: Colors.light.textMuted, fontSize: FontSizes.xs },
  // Comments
  secT: { color: Colors.light.textMain, fontSize: FontSizes.lg, fontWeight: '700', marginBottom: 14 },
  inpRow: { gap: 8, marginBottom: 16 },
  inp: { backgroundColor: Colors.light.backgroundCardAlt, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.light.panelBorder, color: Colors.light.textMain, fontSize: FontSizes.sm, paddingHorizontal: 14, paddingVertical: 10, minHeight: 60, textAlignVertical: 'top' },
  loginNudge: { backgroundColor: Colors.light.gold + '11', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.light.gold + '33', padding: Spacing.md, marginBottom: 16 },
  loginNudgeT: { color: Colors.light.textMuted, fontSize: FontSizes.sm, textAlign: 'center' },
  loginNudgeL: { color: Colors.light.gold, fontWeight: '700', textDecorationLine: 'underline' },
  noCmt: { color: Colors.light.textMuted, fontSize: FontSizes.sm, textAlign: 'center', marginTop: 16 },
  cmt: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.panelBorder },
  cmtNested: { marginLeft: 20, borderLeftWidth: 2, borderLeftColor: Colors.light.panelBorder, paddingLeft: 12 },
  cmtH: { flexDirection: 'row', gap: 10 },
  cmtAv: { width: 28, height: 28, borderRadius: 14 }, cmtAvPl: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.light.gold + '33', alignItems: 'center', justifyContent: 'center' },
  cmtAvPlT: { color: Colors.light.gold, fontWeight: '700', fontSize: FontSizes.xs },
  cmtARow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  cmtA: { color: Colors.light.textMain, fontWeight: '600', fontSize: FontSizes.sm },
  cmtD: { color: Colors.light.textDim, fontSize: FontSizes.xs },
  cmtTx: { color: Colors.light.textMain, fontSize: FontSizes.sm, lineHeight: 20 },
  cmtAct: { flexDirection: 'row', gap: 14, marginTop: 8 },
  cmtActT: { color: Colors.light.textMuted, fontSize: FontSizes.xs, fontWeight: '600' },
  rpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  rpIn: { flex: 1, backgroundColor: Colors.light.backgroundCardAlt, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6, fontSize: FontSizes.xs, color: Colors.light.textMain, borderWidth: 1, borderColor: Colors.light.panelBorder },
  // Modal
  mo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  mc: { backgroundColor: Colors.light.backgroundCardAlt, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl },
  mh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  mt: { color: Colors.light.textMain, fontSize: FontSizes.lg, fontWeight: '700' },
  rpPills: { marginBottom: 12 }, rPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.light.backgroundCard, borderWidth: 1, borderColor: Colors.light.panelBorder },
  rPillA: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  rPillT: { color: Colors.light.textMuted, fontSize: FontSizes.xs }, rPillTA: { color: Colors.light.backgroundDark, fontWeight: '700' },
});
