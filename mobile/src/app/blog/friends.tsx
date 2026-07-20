import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { PageBackground } from '@/components/PageBackground';
import HeaderBar from '@/components/ui/HeaderBar';
import GoldButton from '@/components/ui/GoldButton';
import { useAuth } from '@/hooks/useAuth';
import { friendApi, type FriendEntry, type FriendRequest, type FriendUser } from '@/services/friendApi';

type Tab = 'home' | 'requests' | 'suggestions' | 'all';

export default function FriendsScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [fRes, rRes, sRes] = await Promise.all([
        friendApi.getFriends(),
        friendApi.getRequests(),
        friendApi.getSuggestions(),
      ]);
      if (fRes.success) setFriends(fRes.data);
      if (rRes.success) setRequests(rRes.data);
      if (sRes.success) setSuggestions(sRes.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Search suggestions
  useEffect(() => {
    if (!user || activeTab !== 'suggestions') return;
    const t = setTimeout(async () => {
      try {
        const res = await friendApi.getSuggestions(search.trim() || undefined);
        if (res.success) setSuggestions(res.data);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [search, activeTab, user]);

  const handleAccept = async (id: string, name: string) => {
    setActionLoading((p) => ({ ...p, [id]: true }));
    try {
      await friendApi.acceptRequest(id);
      const acc = requests.find((r) => r._id === id);
      setRequests((p) => p.filter((r) => r._id !== id));
      if (acc) setFriends((p) => [...p, { friendshipId: acc._id, user: acc.requester }]);
      Alert.alert('OK', `Đã kết bạn với ${name}.`);
    } catch { Alert.alert('Lỗi', 'Không thể chấp nhận.'); }
    finally { setActionLoading((p) => ({ ...p, [id]: false })); }
  };

  const handleReject = async (id: string, name: string) => {
    setActionLoading((p) => ({ ...p, [id]: true }));
    try {
      await friendApi.rejectRequest(id);
      setRequests((p) => p.filter((r) => r._id !== id));
      Alert.alert('OK', `Đã từ chối ${name}.`);
    } catch { Alert.alert('Lỗi', 'Không thể từ chối.'); }
    finally { setActionLoading((p) => ({ ...p, [id]: false })); }
  };

  const handleSend = async (userId: string, name: string) => {
    setActionLoading((p) => ({ ...p, [userId]: true }));
    try {
      await friendApi.sendRequest(userId);
      setSuggestions((p) => p.filter((s) => s._id !== userId));
      Alert.alert('OK', `Đã gửi lời mời tới ${name}.`);
    } catch { Alert.alert('Lỗi', 'Không thể gửi lời mời.'); }
    finally { setActionLoading((p) => ({ ...p, [userId]: false })); }
  };

  const handleUnfriend = (id: string, name: string) => {
    Alert.alert('Xác nhận', `Hủy kết bạn với ${name}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try {
            await friendApi.removeFriend(id);
            setFriends((p) => p.filter((f) => f.friendshipId !== id));
          } catch { Alert.alert('Lỗi', 'Không thể hủy kết bạn.'); }
        },
      },
    ]);
  };

  if (!user) {
    return (
      <PageBackground style={S.ct}>
        <HeaderBar title="Bạn Bè" showBack />
        <View style={S.cent}><Text style={S.err}>Vui lòng đăng nhập.</Text></View>
      </PageBackground>
    );
  }

  const filterFriends = search.trim()
    ? friends.filter((f) => f.user.name.toLowerCase().includes(search.toLowerCase()))
    : friends;

  return (
    <PageBackground style={S.ct}>
      <HeaderBar title="Bạn Bè" showBack />

      {/* Tabs */}
      <View style={S.tabRow}>
        {([
          { key: 'home', label: 'Bạn bè' },
          { key: 'requests', label: `Lời mời${requests.length ? ` (${requests.length})` : ''}` },
          { key: 'suggestions', label: 'Gợi ý' },
          { key: 'all', label: 'Tất cả' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[S.tab, activeTab === t.key && S.tabA]}
            onPress={() => { setActiveTab(t.key); setSearch(''); }}
          >
            <Text style={[S.tabT, activeTab === t.key && S.tabTA]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      {(activeTab === 'all' || activeTab === 'suggestions') && (
        <View style={S.searchWrap}>
          <Ionicons name="search" size={16} color={Colors.light.textMuted} style={{ marginLeft: 10 }} />
          <TextInput
            style={S.searchInp}
            placeholder="Tìm kiếm..."
            placeholderTextColor={Colors.light.textDim}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      )}

      {loading ? (
        <View style={S.cent}><ActivityIndicator size="large" color={Colors.light.gold} /></View>
      ) : (
        <FlatList
          data={
            activeTab === 'home' ? friends.slice(0, 20) :
            activeTab === 'requests' ? requests :
            activeTab === 'suggestions' ? suggestions :
            filterFriends
          }
          keyExtractor={(item: any) => item.friendshipId || item._id}
          renderItem={({ item }) => {
            if (activeTab === 'requests') {
              const r = item as FriendRequest;
              return (
                <View style={S.card}>
                  <View style={S.cardL}>
                    <View style={S.av}><Text style={S.avT}>{r.requester.name?.charAt(0)?.toUpperCase() || '?'}</Text></View>
                    <View>
                      <Text style={S.name}>{r.requester.name}</Text>
                      <Text style={S.sub}>{r.requester.role === 'teacher' ? 'Giáo viên' : 'Học viên'}</Text>
                    </View>
                  </View>
                  <View style={S.cardR}>
                    <TouchableOpacity style={S.acceptBtn} onPress={() => handleAccept(r._id, r.requester.name)}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={S.rejectBtn} onPress={() => handleReject(r._id, r.requester.name)}>
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            if (activeTab === 'suggestions') {
              const s = item as FriendUser;
              return (
                <View style={S.card}>
                  <View style={S.cardL}>
                    <View style={S.av}><Text style={S.avT}>{s.name?.charAt(0)?.toUpperCase() || '?'}</Text></View>
                    <View>
                      <Text style={S.name}>{s.name}</Text>
                      <Text style={S.sub}>Cấp {s.level} · {s.xp} XP</Text>
                    </View>
                  </View>
                  <GoldButton
                    title="Kết bạn"
                    onPress={() => handleSend(s._id, s.name)}
                    loading={actionLoading[s._id]}
                    style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                  />
                </View>
              );
            }

            // friends / all
            const f = item as FriendEntry;
            return (
              <View style={S.card}>
                <View style={S.cardL}>
                  <View style={S.av}><Text style={S.avT}>{f.user.name?.charAt(0)?.toUpperCase() || '?'}</Text></View>
                  <View>
                    <Text style={S.name}>{f.user.name}</Text>
                    <Text style={S.sub}>{f.user.role === 'teacher' ? 'Giáo viên' : 'Học viên'}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleUnfriend(f.friendshipId, f.user.name)}>
                  <Ionicons name="person-remove-outline" size={20} color={Colors.light.error} />
                </TouchableOpacity>
              </View>
            );
          }}
          contentContainerStyle={S.list}
          ListEmptyComponent={<View style={S.cent}><Ionicons name="people-outline" size={48} color={Colors.light.textMuted} /><Text style={S.err}>Chưa có dữ liệu.</Text></View>}
        />
      )}
    </PageBackground>
  );
}

const S = StyleSheet.create({
  ct: { flex: 1 },
  cent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  err: { color: Colors.light.textMuted, fontSize: FontSizes.md, marginTop: 12 },
  list: { padding: Spacing.md, paddingBottom: 40 },
  // Tabs
  tabRow: { flexDirection: 'row', marginHorizontal: Spacing.md, marginVertical: Spacing.sm, gap: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.light.backgroundCard, borderWidth: 1, borderColor: Colors.light.panelBorder },
  tabA: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  tabT: { color: Colors.light.textMuted, fontSize: FontSizes.xs, fontWeight: '600' },
  tabTA: { color: Colors.light.backgroundDark },
  // Search
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.md, marginBottom: 8, backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder },
  searchInp: { flex: 1, color: Colors.light.textMain, fontSize: FontSizes.sm, paddingVertical: 8, paddingRight: 12 },
  // Card
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder, padding: Spacing.sm, marginBottom: Spacing.xs },
  cardL: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cardR: { flexDirection: 'row', gap: 8 },
  av: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(201,161,90,0.2)', alignItems: 'center', justifyContent: 'center' },
  avT: { color: Colors.light.gold, fontWeight: '700', fontSize: FontSizes.md },
  name: { color: Colors.light.textMain, fontSize: FontSizes.sm, fontWeight: '600' },
  sub: { color: Colors.light.textDim, fontSize: FontSizes.xs },
  acceptBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' },
});
