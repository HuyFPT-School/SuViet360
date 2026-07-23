import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PageBackground } from '@/components/PageBackground';
import Ionicons from '@expo/vector-icons/Ionicons';
import { podcastApi } from '@/services/podcastApi';
import { notificationApi } from '@/services/notificationApi';
import type { Podcast } from '@/types/podcast';
import { useAuth } from '@/hooks/useAuth';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { formatDuration, formatDate } from '@/utils/format';

type JourneyItem = {
  _id: string;
  title: string;
  description: string;
  type: 'podcast';
  category: string;
  level: string;
  duration: number;
  createdAt: string;
  audioUrl?: string;
};

const tl = (l: string) => ({ Easy: 'Dễ', Medium: 'Trung cấp', Hard: 'Nâng cao' } as Record<string, string>)[l] || l;

export default function HanhTrinhScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<JourneyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [followed, setFollowed] = useState<string[]>([]);
  const [flMap, setFlMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const pd = await podcastApi.getAll();
        const pItems: JourneyItem[] = (pd.podcasts || []).map((p: Podcast) => ({
          _id: p._id, title: p.title, description: p.description || p.content || '',
          type: 'podcast' as const, category: p.category || 'Khác', level: p.level || '',
          duration: p.duration || 0, createdAt: p.createdAt, audioUrl: p.audioUrl,
        }));
        setItems(pItems);
      } catch (err: any) { setError(err.message); }
      finally { setLoading(false); setRefreshing(false); }
    })();
  }, []);

  useEffect(() => {
    if (user) { notificationApi.getFollowedCategories().then((c: string[]) => setFollowed(c.map((x: string) => x.trim()))).catch(() => {}); }
    else setFollowed([]);
  }, [user]);

  const handleFollow = async (cat: string) => {
    if (!user) return;
    const clean = cat.trim();
    setFlMap((p) => ({ ...p, [cat]: true }));
    try {
      if (followed.includes(clean)) { await notificationApi.unfollowCategory(clean); setFollowed((p) => p.filter((c) => c !== clean)); }
      else { await notificationApi.followCategory(clean); setFollowed((p) => [...p, clean]); }
    } catch { /* ignore */ }
    finally { setFlMap((p) => ({ ...p, [cat]: false })); }
  };

  const filtered = items.filter((i) => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const groups = [...new Set(filtered.map((i) => i.category))].filter((g) => g !== 'Yêu cầu VIP');
  const grouped: Record<string, JourneyItem[]> = {};
  groups.forEach((g) => { grouped[g] = filtered.filter((i) => i.category === g); });

  if (loading) return <PageBackground style={S.ct}><View style={S.ce}><ActivityIndicator size="large" color={Colors.light.gold} /></View></PageBackground>;

  return (
    <PageBackground style={S.ct}>
      <ScrollView style={S.sc} contentContainerStyle={S.scc}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setRefreshing(false); }} tintColor={Colors.light.gold} />}>

        {/* ─── Hero Section ─── */}
        <View style={S.hero}>
          <View style={S.heroContent}>
            <Text style={S.heroKicker}>Podcast lịch sử</Text>
            <Text style={S.heroTitle}>
              Khám phá lịch sử Việt Nam{'\n'}qua những câu chuyện
            </Text>
            <Text style={S.heroDesc}>
              Lắng nghe những câu chuyện lịch sử hào hùng được tái hiện sống động qua giọng kể. Mỗi tập podcast là một hành trình trở về quá khứ, giúp bạn hiểu hơn về dân tộc, đất nước và con người Việt Nam.
            </Text>
          </View>
          <View style={S.heroImageWrap}>
            <Image source={{ uri: 'https://www.suviet.io.vn/images/podcast_banner.png' }} style={S.heroImage} resizeMode="contain" />
          </View>
        </View>

        {/* Search */}
        <View style={S.sb}><TextInput style={S.si} placeholder="Tìm kiếm hành trình..." placeholderTextColor={Colors.light.textDim} value={search} onChangeText={setSearch} /></View>
        {error ? <View style={S.eb}><Text style={S.et}>{error}</Text></View> : null}

        {/* Stats */}
        <View style={S.sr}>
          <View style={S.si2}><Text style={S.sv}>{groups.length}</Text><Text style={S.sl}>Chủ đề</Text></View>
          <View style={S.si2}><Text style={S.sv}>{filtered.length}</Text><Text style={S.sl}>Bài học</Text></View>
          <View style={S.si2}><Text style={S.sv}>{filtered.filter((i) => i.type === 'podcast').length}</Text><Text style={S.sl}>Podcast</Text></View>
        </View>

        {groups.length === 0 ? <View style={S.empty}><Text style={S.emp}>Không tìm thấy hành trình nào</Text></View> : groups.map((g) => {
          const isOpen = expanded[g] === true;
          const eps = grouped[g];
          return (
            <View key={g} style={S.gc}>
              <TouchableOpacity style={S.tc} onPress={() => setExpanded((p) => ({ ...p, [g]: !p[g] }))} activeOpacity={0.85}>
                <View style={S.tic}><Ionicons name="book-outline" size={22} color={Colors.light.goldDark} /></View>
                <View style={S.tb}><Text style={S.tn}>{g}</Text><Text style={S.tm}>{eps.length} bài học</Text></View>
                <View style={S.ta}>
                  {user && <TouchableOpacity onPress={() => handleFollow(g)} disabled={flMap[g]} style={S.fb}><Ionicons name={followed.includes(g.trim()) ? 'notifications' : 'notifications-outline'} size={16} color={followed.includes(g.trim()) ? Colors.light.gold : Colors.light.textMuted} /></TouchableOpacity>}
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.light.textMuted} />
                </View>
              </TouchableOpacity>
              {isOpen && <View style={S.el}>{eps.map((ep) => (
                <TouchableOpacity key={ep._id} style={S.ec} onPress={() => router.push(`/podcast/${ep._id}` as any)}>
                  <View style={S.eic}><Ionicons name="headset-outline" size={18} color={Colors.light.goldDark} /></View>
                  <View style={S.ebd}>
                    <View style={S.eto}><Text style={S.etn} numberOfLines={2}>{ep.title}</Text><View style={[S.etb, S.etbp]}><Text style={S.etbt}>Podcast</Text></View></View>
                    {!!ep.description && <Text style={S.edsc} numberOfLines={2}>{ep.description}</Text>}
                    <View style={S.em}><Text style={S.eml}>{ep.level ? tl(ep.level) : ''}</Text>{ep.duration > 0 && <Text style={S.emd}>{formatDuration(ep.duration)}</Text>}<Text style={S.emdt}>{formatDate(ep.createdAt)}</Text></View>
                  </View>
                  <TouchableOpacity style={S.epl}><Ionicons name="play-circle" size={24} color={Colors.light.gold} /></TouchableOpacity>
                </TouchableOpacity>
              ))}</View>}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </PageBackground>
  );
}

const S = StyleSheet.create({
  ct: { flex: 1 }, ce: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  // ─── Hero Header ──────────────────────────────────
  hero: {
    flexDirection: 'row',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 50,
    paddingBottom: 20,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'transparent',
    gap: 16,
  },
  heroContent: { flex: 1, justifyContent: 'center' },
  heroKicker: { color: '#a84d28', fontSize: FontSizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 },
  heroTitle: { color: '#3a2312', fontSize: 24, fontWeight: '700', lineHeight: 32, marginBottom: 10 },
  heroDesc: { color: '#5c4a3d', fontSize: FontSizes.sm, lineHeight: 22 },
  heroImageWrap: {
    width: 130, height: 130, borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,251,242,0.7)', borderWidth: 1, borderColor: '#e8d5b5',
    padding: 6, alignItems: 'center', justifyContent: 'center',
  },
  heroImage: { width: 110, height: 110 },
  // ─── Search ─────────────────────────────────────
  sb: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.light.panel, borderBottomWidth: 1, borderBottomColor: Colors.light.panelBorder },
  si: { backgroundColor: Colors.light.authInputBg, borderRadius: BorderRadius.full, paddingHorizontal: 16, paddingVertical: 10, fontSize: FontSizes.sm, color: Colors.light.text, borderWidth: 1, borderColor: Colors.light.authBorder },
  eb: { margin: Spacing.md, padding: Spacing.sm, backgroundColor: Colors.light.errorBg, borderRadius: BorderRadius.md },
  et: { color: Colors.light.error, fontSize: FontSizes.sm, textAlign: 'center' },
  sc: { flex: 1 }, scc: { padding: Spacing.md, paddingBottom: 40 },
  sr: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  si2: { flex: 1, backgroundColor: Colors.light.panel, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder, padding: Spacing.sm, alignItems: 'center' },
  sv: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.light.gold },
  sl: { fontSize: FontSizes.xs, color: Colors.light.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', padding: 40 }, emp: { fontSize: FontSizes.md, color: Colors.light.textMuted },
  gc: { marginBottom: Spacing.sm },
  tc: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.panel, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder, padding: Spacing.md, gap: 12 },
  tic: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(201,161,90,0.12)', alignItems: 'center', justifyContent: 'center' },
  tb: { flex: 1 }, tn: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.light.text },
  tm: { fontSize: FontSizes.xs, color: Colors.light.textMuted, marginTop: 2 },
  ta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fb: { padding: 4 },
  el: { marginTop: 4 },
  ec: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.panel, marginHorizontal: 8, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.light.panelBorder, borderTopWidth: 0, padding: Spacing.sm, gap: 10 },
  eic: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(201,161,90,0.08)', alignItems: 'center', justifyContent: 'center' },
  ebd: { flex: 1 },
  eto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  etn: { flex: 1, fontSize: FontSizes.sm, fontWeight: '600', color: Colors.light.text, marginRight: 8 },
  etb: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  etbp: { backgroundColor: Colors.light.gold + '22' }, etbl: { backgroundColor: '#4a7fb522' },
  etbt: { fontSize: 9, fontWeight: '700', color: Colors.light.gold },
  edsc: { fontSize: FontSizes.xs, color: Colors.light.textMuted, marginTop: 2, lineHeight: 16 },
  em: { flexDirection: 'row', gap: 8, marginTop: 4 },
  eml: { fontSize: FontSizes.xs, color: Colors.light.goldDark }, emd: { fontSize: FontSizes.xs, color: Colors.light.textDim },
  emdt: { fontSize: FontSizes.xs, color: Colors.light.textDim },
  epl: { padding: 4 },
});
