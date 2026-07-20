import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { PageBackground } from '@/components/PageBackground';
import HeaderBar from '@/components/ui/HeaderBar';
import GoldButton from '@/components/ui/GoldButton';
import AuthInput from '@/components/ui/AuthInput';
import { useAuth } from '@/hooks/useAuth';
import { groupApi, type Group } from '@/services/groupApi';

export default function GroupsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const load = async (keyword?: string) => {
    setLoading(true);
    try {
      const res = await groupApi.getPublicGroups(keyword);
      if (res.success) setGroups(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(search); }, [search]);

  const handleSearch = () => setSearch(searchInput);

  const handleJoin = async (id: string) => {
    if (!user) { Alert.alert('Lỗi', 'Vui lòng đăng nhập.'); return; }
    setActionLoading((p) => ({ ...p, [id]: true }));
    try {
      await groupApi.joinGroup(id);
      Alert.alert('OK', 'Đã tham gia nhóm!');
      load(search);
    } catch { Alert.alert('Lỗi', 'Không thể tham gia nhóm.'); }
    finally { setActionLoading((p) => ({ ...p, [id]: false })); }
  };

  const handleCreate = async () => {
    if (!newName.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm.'); return; }
    setCreating(true);
    try {
      await groupApi.createGroup({ name: newName.trim(), description: newDesc.trim() });
      Alert.alert('OK', 'Đã tạo nhóm!');
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      load(search);
    } catch { Alert.alert('Lỗi', 'Không thể tạo nhóm.'); }
    finally { setCreating(false); }
  };

  return (
    <PageBackground style={S.ct}>
      <HeaderBar title="Nhóm" showBack />

      {/* Search + create */}
      <View style={S.topRow}>
        <View style={S.searchWrap}>
          <Ionicons name="search" size={16} color={Colors.light.textMuted} style={{ marginLeft: 10 }} />
          <TextInput
            style={S.searchInp}
            placeholder="Tìm nhóm..."
            placeholderTextColor={Colors.light.textDim}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
        {user && (
          <TouchableOpacity style={S.createBtn} onPress={() => setShowCreate(true)}>
            <Ionicons name="add" size={20} color={Colors.light.backgroundDark} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={S.cent}><ActivityIndicator size="large" color={Colors.light.gold} /></View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g._id}
          renderItem={({ item: g }) => {
            const isMember = g.members?.some((m: any) => (m.user?._id || m.user) === (user as any)?._id);
            return (
              <TouchableOpacity
                style={S.card}
                onPress={() => router.push(`/blog/groups/${g._id}` as any)}
                activeOpacity={0.8}
              >
                <View style={S.cardTop}>
                  <View style={S.av}>
                    <Text style={S.avT}>{g.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={S.cardInfo}>
                    <Text style={S.name} numberOfLines={1}>{g.name}</Text>
                    <Text style={S.desc} numberOfLines={2}>{g.description || 'Chưa có mô tả.'}</Text>
                    <View style={S.metaRow}>
                      <Ionicons name="people-outline" size={12} color={Colors.light.textMuted} />
                      <Text style={S.metaT}>{g.memberCount} thành viên</Text>
                    </View>
                  </View>
                </View>
                {isMember ? (
                  <View style={S.joinedBadge}><Text style={S.joinedT}>✓ Đã tham gia</Text></View>
                ) : (
                  <GoldButton
                    title="Tham gia"
                    onPress={() => handleJoin(g._id)}
                    loading={actionLoading[g._id]}
                    style={{ paddingHorizontal: 16, paddingVertical: 6 }}
                  />
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={S.list}
          ListEmptyComponent={<View style={S.cent}><Ionicons name="people-circle-outline" size={48} color={Colors.light.textMuted} /><Text style={S.err}>Chưa có nhóm nào.</Text></View>}
        />
      )}

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={S.mo}>
          <View style={S.mc}>
            <View style={S.mh}>
              <Text style={S.mt}>Tạo Nhóm Mới</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <View style={S.mb}>
              <AuthInput label="Tên nhóm" placeholder="Nhập tên nhóm" value={newName} onChangeText={setNewName} />
              <AuthInput label="Mô tả" placeholder="Mô tả nhóm (không bắt buộc)" value={newDesc} onChangeText={setNewDesc} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
              <GoldButton title="Tạo Nhóm" onPress={handleCreate} loading={creating} />
            </View>
          </View>
        </View>
      </Modal>
    </PageBackground>
  );
}

const S = StyleSheet.create({
  ct: { flex: 1 },
  cent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  err: { color: Colors.light.textMuted, fontSize: FontSizes.md, marginTop: 12 },
  list: { padding: Spacing.md, paddingBottom: 40 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.md, marginVertical: Spacing.sm, gap: 8 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder },
  searchInp: { flex: 1, color: Colors.light.textMain, fontSize: FontSizes.sm, paddingVertical: 8, paddingRight: 12 },
  createBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.light.gold, alignItems: 'center', justifyContent: 'center' },
  // Card
  card: { backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder, padding: Spacing.sm, marginBottom: Spacing.sm },
  cardTop: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  av: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(201,161,90,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.light.gold },
  avT: { color: Colors.light.gold, fontWeight: '700', fontSize: FontSizes.lg },
  cardInfo: { flex: 1, gap: 2 },
  name: { color: Colors.light.textMain, fontSize: FontSizes.md, fontWeight: '700' },
  desc: { color: Colors.light.textMuted, fontSize: FontSizes.xs, lineHeight: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaT: { color: Colors.light.textMuted, fontSize: 11 },
  joinedBadge: { alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(34,139,34,0.1)' },
  joinedT: { color: '#16a34a', fontSize: FontSizes.xs, fontWeight: '700' },
  // Modal
  mo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  mc: { backgroundColor: Colors.light.backgroundCardAlt, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '80%' },
  mh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.light.panelBorder },
  mt: { color: Colors.light.textMain, fontSize: FontSizes.lg, fontWeight: '700' },
  mb: { padding: Spacing.lg, gap: 12 },
});
