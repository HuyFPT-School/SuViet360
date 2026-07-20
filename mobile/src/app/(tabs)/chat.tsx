import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { PageBackground } from '@/components/PageBackground';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useChat } from '@/hooks/useChat';
import { useAppDispatch, useAppSelector } from '@/store';
import { setActiveConversation } from '@/store/features/chatSlice';
import { useAuth } from '@/hooks/useAuth';
import { chatApi } from '@/services/chatApi';
import type { ChatParticipant, Conversation, Message } from '@/types/chat';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { getTimeAgo } from '@/utils/format';
import { resolveMediaUrl } from '@/utils/media';
import UnreadBadge from '@/components/ui/UnreadBadge';

// ─── Helpers ───
const fmt = (d: string) => { try { return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
const roleLbl = (r: string) => ({ teacher: 'Giáo viên', admin: 'Quản trị', staff: 'Nhân viên', user: 'Học viên', student: 'Học viên' } as Record<string, string>)[r] || 'Học viên';
const init = (n?: string) => n?.charAt(0)?.toUpperCase() || '?';

// ─── Avatar ───
function Av({ uri, name, s = 40, online }: { uri?: string; name?: string; s?: number; online?: boolean }) {
  const u = resolveMediaUrl(uri);
  return (
    <View style={{ position: 'relative' }}>
      {u ? <Image source={{ uri: u }} style={{ width: s, height: s, borderRadius: s / 2, borderWidth: 2, borderColor: Colors.light.gold + '33' }} />
        : <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: Colors.light.gold + '33', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: Colors.light.gold, fontWeight: '700', fontSize: s * 0.42 }}>{init(name)}</Text>
          </View>}
      {online && <View style={[A.dot, { width: s * 0.3, height: s * 0.3, borderRadius: s * 0.15 }]} />}
    </View>
  );
}
const A = StyleSheet.create({ dot: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.light.online, borderWidth: 1.5, borderColor: '#0d0805' } });

// ─── ChatBubble for detail ───
function Bubble({ item, isMe, rec }: { item: Message; isMe: boolean; rec: ChatParticipant }) {
  return (
    <View style={[M.row, isMe && M.rowMe]}>
      {!isMe && <View style={{ width: 32, marginRight: 6 }}><Av uri={rec.avatar} name={rec.name} s={28} /></View>}
      <View style={[M.bub, isMe ? M.bubMe : M.bubO, isMe && { borderBottomLeftRadius: 16, borderBottomRightRadius: 4 }, !isMe && { borderBottomLeftRadius: 4 }]}>
        <Text style={[M.txt, isMe && M.txtMe]}>{item.content}</Text>
        <View style={[M.meta, isMe && M.metaMe]}>
          <Text style={M.time}>{fmt(item.createdAt)}</Text>
          {isMe && <Text style={[M.read, !!item.readAt && M.readOn]}>✓✓</Text>}
        </View>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { user } = useAuth();
  const chat = useChat();
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState('');
  const [msgInput, setMsgInput] = useState('');
  const [parts, setParts] = useState<ChatParticipant[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);

  const isStudent = (user?.role as string) === 'user' || (user?.role as string) === 'student';

  useEffect(() => {
    if (!user) return;
    chat.loadConversations();
    setLoadingParts(true);
    (async () => {
      try { const list = isStudent ? await chatApi.getTeachers() : await chatApi.getChatUsers(); setParts(list || []); } catch { }
      finally { setLoadingParts(false); }
    })();
  }, [user]);

  // Filter conversations by search
  const filteredConvs = search.trim()
    ? chat.conversations.filter((c) => {
        const o = c.participants?.find((p) => p._id !== user?.id);
        return o?.name?.toLowerCase().includes(search.toLowerCase());
      })
    : chat.conversations;

  // New participants (not yet in any conversation)
  const newParts = search.trim()
    ? parts.filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()))
    : parts.filter((p) => !chat.conversations.some((c) => c.participants.some((cp) => cp._id === p._id)));

  const handleStart = async (p: ChatParticipant) => {
    try { const c = await chatApi.createConversation(p._id); await chat.loadConversations(); chat.selectConversation(c._id); } catch { }
    setSearch('');
  };

  const getO = (c: Conversation) => c.participants?.find((p) => p._id !== user?.id) || null;

  // ─── Detail View ───
  const aId = chat.activeConversationId;
  const aConv = aId ? chat.conversations.find((c) => c._id === aId) : null;
  const rec = aConv ? getO(aConv) : null;
  const msgs = aId ? (chat.messages[aId] || []) : [];
  const online = rec ? chat.onlineUsers.includes(rec._id) : false;
  const typingUserId = useAppSelector((s) => aId ? s.chat.typingUsers[aId] : null);
  const isTyping = !!(typingUserId && rec && typingUserId === rec._id);

  if (aId && rec) {
    return (
      <PageBackground style={SS.ct}>
        <View style={D.hd}>
          <TouchableOpacity onPress={() => dispatch(setActiveConversation(null))} style={D.back}><Ionicons name="chevron-back" size={24} color={Colors.light.goldLight} /></TouchableOpacity>
          <Av uri={rec.avatar} name={rec.name} s={36} online={online} />
          <View style={{ flex: 1 }}><Text style={D.name} numberOfLines={1}>{rec.name || 'Unknown'}</Text>
            {isTyping ? (
              <Text style={D.typing}>Đang nhập...</Text>
            ) : (
              <Text style={D.role}>{roleLbl(rec.role)}</Text>
            )}
          </View>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
          <FlatList data={msgs} renderItem={({ item }) => <Bubble item={item} isMe={(typeof item.sender === 'string' ? item.sender : item.sender?._id) === user?.id} rec={rec} />}
            keyExtractor={(it) => it._id} contentContainerStyle={M.list}
            ListEmptyComponent={<View style={SS.emptyWrap}><Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.light.goldMuted} /><Text style={SS.emptyT}>Chưa có tin nhắn</Text></View>}
            refreshing={chat.isLoadingMessages} onRefresh={() => msgs.length > 0 && chat.loadMoreMessages(aId)} />
          <View style={I.wrap}>
            <TextInput style={I.inp} placeholder="Nhập tin nhắn..." placeholderTextColor={Colors.light.textDim} value={msgInput} onChangeText={setMsgInput} multiline />
            <TouchableOpacity onPress={async () => { if (!msgInput.trim()) return; await chat.sendMessage(aId, msgInput.trim()); setMsgInput(''); }} style={[I.send, !msgInput.trim() && I.sendDis]}>
              <Ionicons name="send" size={18} color={msgInput.trim() ? '#1a0a06' : Colors.light.textMuted} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </PageBackground>
    );
  }

  // ─── List View ───
  const searchPlaceholder = isStudent ? 'Tìm giáo viên...' : 'Tìm học viên...';

  return (
    <PageBackground style={SS.ct}>
      {/* Header */}
      <View style={L.hd}>
        <View style={L.iconWrap}><Ionicons name="chatbubble-ellipses" size={20} color={Colors.light.gold} /></View>
        <View><Text style={L.title}>Tin Nhắn</Text><Text style={L.sub}>Trao đổi cùng giáo viên và học viên</Text></View>
      </View>

      {/* Search */}
      <View style={L.srchWrap}>
        <View style={L.srchBox}>
          <Ionicons name="search" size={16} color={Colors.light.goldMuted} style={{ marginLeft: 12 }} />
          <TextInput style={L.srchInp} placeholder={searchPlaceholder} placeholderTextColor={Colors.light.goldMuted + '88'} value={search} onChangeText={setSearch} />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4, marginRight: 8 }}><Ionicons name="close-circle" size={16} color={Colors.light.goldMuted} /></TouchableOpacity>}
        </View>
      </View>

      <FlatList
        data={filteredConvs}
        keyExtractor={(it) => it._id}
        contentContainerStyle={L.list}
        refreshing={chat.isLoadingConversations}
        onRefresh={chat.loadConversations}
        ListHeaderComponent={
          <>
            {/* Participants / Search results */}
            {newParts.length > 0 && (search.trim() || chat.conversations.length === 0) && (
              <View style={P.wrap}>
                <Text style={P.title}>{search.trim() ? 'Kết quả tìm kiếm' : 'Có thể trò chuyện'}</Text>
                {newParts.map((p) => (
                  <TouchableOpacity key={p._id} style={P.item} onPress={() => handleStart(p)} activeOpacity={0.7}>
                    <Av uri={p.avatar} name={p.name} s={40} online={chat.onlineUsers.includes(p._id)} />
                    <View style={{ flex: 1 }}>
                      <Text style={P.name}>{p.name || 'Unknown'}</Text>
                      <Text style={P.role}>{roleLbl(p.role)}</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color={Colors.light.gold} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Loading indicator */}
            {loadingParts && <ActivityIndicator size="small" color={Colors.light.gold} style={{ padding: 16 }} />}

            {/* Section title for conversations */}
            {filteredConvs.length > 0 && !search.trim() && (
              <Text style={L.sectTitle}>Cuộc trò chuyện</Text>
            )}
          </>
        }
        ListEmptyComponent={
          !loadingParts && chat.conversations.length === 0 && parts.length === 0 ? (
            <View style={SS.emptyWrap}>
              <View style={SS.emptyIconWrap}><Ionicons name="chatbubble-ellipses-outline" size={36} color={Colors.light.goldMuted} /></View>
              <Text style={SS.emptyTitle}>Chưa có tin nhắn</Text>
              <Text style={SS.emptySub}>Tìm một người để bắt đầu cuộc trò chuyện đầu tiên.</Text>
            </View>
          ) : null
        }
        renderItem={({ item: c }) => {
          const o = getO(c);
          if (!o) return null;
          const unread = user ? c.unreadCount[user.id] || 0 : 0;
          const isOnline = chat.onlineUsers.includes(o._id);
          return (
            <TouchableOpacity style={[C.item, c._id === aId && C.itemA]} onPress={() => chat.selectConversation(c._id)} activeOpacity={0.7}>
              <Av uri={o.avatar} name={o.name} s={48} online={isOnline} />
              <View style={C.info}>
                <View style={C.top}>
                  <Text style={[C.name, c._id === aId && C.nameA]} numberOfLines={1}>{o.name || 'Unknown'}</Text>
                  {c.lastMessage && <Text style={C.time}>{getTimeAgo(c.lastMessage.createdAt)}</Text>}
                </View>
                <Text style={C.role}>{roleLbl(o.role)}{isOnline ? ' · Đang hoạt động' : ''}</Text>
                <View style={C.bot}>
                  <Text style={[C.msg, unread > 0 && C.msgUnread]} numberOfLines={1}>
                    {c.lastMessage
                      ? c.lastMessage.sender === user?.id ? `Bạn: ${c.lastMessage.content}` : c.lastMessage.content
                      : 'Bắt đầu trò chuyện...'}
                  </Text>
                  <UnreadBadge count={unread} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </PageBackground>
  );
}

// ─── Styles ───
const SS = StyleSheet.create({
  ct: { flex: 1 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.light.gold + '11', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: Colors.light.gold + '22' },
  emptyTitle: { color: Colors.light.goldMuted, fontSize: FontSizes.lg, fontWeight: '600', marginBottom: 6 },
  emptySub: { color: Colors.light.goldMuted + '99', fontSize: FontSizes.sm, textAlign: 'center' },
  emptyT: { color: Colors.light.goldMuted, fontSize: FontSizes.lg, marginTop: 12 },
});

// List header
const L = StyleSheet.create({
  hd: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: 16, backgroundColor: Colors.light.chatBgSecondary, borderBottomWidth: 1, borderBottomColor: Colors.light.chatGlassBorder },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.light.gold + '15', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Cinzel', fontSize: FontSizes.lg, fontWeight: '700', color: Colors.light.chatGoldLight, letterSpacing: 1 },
  sub: { fontSize: FontSizes.xs, color: Colors.light.goldMuted, marginTop: 1 },
  srchWrap: { paddingHorizontal: Spacing.md, paddingVertical: 12, backgroundColor: Colors.light.chatBgSecondary },
  srchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(13,8,5,0.6)', borderRadius: BorderRadius.xl, borderWidth: 1.5, borderColor: Colors.light.chatGlassBorder },
  srchInp: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: FontSizes.sm, color: Colors.light.chatGoldLight },
  list: { padding: Spacing.sm, paddingTop: 4, paddingBottom: 40 },
  sectTitle: { color: Colors.light.goldMuted, fontSize: FontSizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4, paddingTop: 8, paddingBottom: 6 },
});

// Participants
const P = StyleSheet.create({
  wrap: { backgroundColor: Colors.light.chatBgTertiary, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.chatGlassBorder, padding: Spacing.sm, marginBottom: Spacing.sm },
  title: { color: Colors.light.goldMuted, fontSize: FontSizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: BorderRadius.md },
  name: { color: Colors.light.chatGoldLight, fontSize: FontSizes.sm, fontWeight: '600' },
  role: { color: Colors.light.goldMuted, fontSize: FontSizes.xs, marginTop: 1 },
});

// Conversation items
const C = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.chatGlassBorder, backgroundColor: '#2a1610', marginBottom: 4 },
  itemA: { backgroundColor: Colors.light.gold + '15', borderColor: Colors.light.gold + '33' },
  info: { flex: 1 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 },
  name: { color: Colors.light.chatGoldLight, fontSize: FontSizes.md, fontWeight: '600', flex: 1 },
  nameA: { color: Colors.light.gold },
  time: { color: Colors.light.goldMuted, fontSize: FontSizes.xs },
  role: { color: Colors.light.goldMuted, fontSize: FontSizes.xs, marginBottom: 3 },
  bot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  msg: { color: Colors.light.goldMuted, fontSize: FontSizes.sm, flex: 1, marginRight: 8 },
  msgUnread: { color: Colors.light.chatGoldLight, fontWeight: '600' },
});

// Detail
const D = StyleSheet.create({
  hd: { backgroundColor: Colors.light.chatBgSecondary, borderBottomWidth: 1, borderBottomColor: Colors.light.chatGlassBorder, paddingTop: 50, paddingBottom: 10, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { padding: 4 }, name: { color: Colors.light.chatGoldLight, fontSize: FontSizes.md, fontWeight: '600' },
  role: { color: Colors.light.goldMuted, fontSize: FontSizes.xs },
  typing: { color: Colors.light.gold, fontSize: FontSizes.xs, fontStyle: 'italic' },
});

// Messages
const M = StyleSheet.create({
  list: { padding: Spacing.md, paddingBottom: 8 },
  row: { flexDirection: 'row', marginBottom: 8, maxWidth: '82%', alignSelf: 'flex-start', alignItems: 'flex-end' },
  rowMe: { alignSelf: 'flex-end' },
  bub: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  bubO: { backgroundColor: Colors.light.chatBgTertiary, borderWidth: 1, borderColor: Colors.light.chatGlassBorder },
  bubMe: { backgroundColor: Colors.light.gold },
  txt: { color: Colors.light.chatGoldLight, fontSize: FontSizes.sm, lineHeight: 20 },
  txtMe: { color: '#1a0a06' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaMe: { justifyContent: 'flex-end' },
  time: { fontSize: 10, color: Colors.light.goldMuted },
  read: { fontSize: 10, color: Colors.light.goldMuted, opacity: 0.4 }, readOn: { color: Colors.light.gold, opacity: 1 },
});

// Input
const I = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: Spacing.sm, backgroundColor: Colors.light.chatBgSecondary, borderTopWidth: 1, borderTopColor: Colors.light.chatGlassBorder },
  inp: { flex: 1, backgroundColor: Colors.light.chatBgTertiary, borderRadius: BorderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: FontSizes.md, color: Colors.light.chatGoldLight, borderWidth: 1, borderColor: Colors.light.chatGlassBorder, maxHeight: 100 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.light.gold, alignItems: 'center', justifyContent: 'center' },
  sendDis: { opacity: 0.4 },
});
