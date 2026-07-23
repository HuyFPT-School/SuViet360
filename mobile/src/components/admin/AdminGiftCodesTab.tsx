import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { api, ensureCsrfToken } from '@/services/api';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import GoldButton from '@/components/ui/GoldButton';
import AuthInput from '@/components/ui/AuthInput';

const BASE = '/subscriptions/admin/gift-codes';

interface GiftCode { _id: string; code: string; status: string; tierId?: any; billingCycle?: string; expiresAt?: string; giftMessage?: string; }

export default function AdminGiftCodesTab({ tiers }: { tiers?: any[] }) {
  const [codes, setCodes] = useState<GiftCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [giftMessage, setGiftMessage] = useState('Quà tặng SuViet360');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedTierId, setSelectedTierId] = useState('');
  const [generating, setGenerating] = useState(false);

  const paidTiers = useMemo(() => (tiers || []).filter((t: any) => t.slug !== 'free'), [tiers]);

  useEffect(() => {
    if (paidTiers.length > 0 && !selectedTierId) {
      setSelectedTierId(paidTiers[0]._id);
    }
  }, [paidTiers]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ success: boolean; data: GiftCode[] }>(`${BASE}?limit=100`);
      setCodes(res.data.data || []);
    } catch {
      setCodes([]);
      setError('Không thể tải danh sách mã quà tặng.');
    }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    const num = Number(quantity);
    if (!num || num < 1 || num > 1000) { Alert.alert('Lỗi', 'Nhập số lượng từ 1-1000.'); return; }
    if (!selectedTierId && paidTiers.length > 0) { Alert.alert('Lỗi', 'Vui lòng chọn gói VIP.'); return; }
    setGenerating(true);
    try {
      const token = await ensureCsrfToken();
      await api.post(`${BASE}/bulk`, {
        tierId: selectedTierId,
        billingCycle,
        quantity: num,
        expiresInDays: Number(expiresInDays) || 30,
        giftMessage: giftMessage.trim() || 'Quà tặng SuViet360',
      }, { headers: { 'x-csrf-token': token } });
      Alert.alert('OK', `Đã tạo ${num} mã quà tặng.`);
      load();
    } catch { Alert.alert('Lỗi', 'Không thể tạo mã.'); }
    finally { setGenerating(false); }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Xác nhận', 'Xóa mã này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { try { await api.delete(`${BASE}/${id}`); load(); } catch { } } },
    ]);
  };

  if (loading) return <ActivityIndicator size="large" color={Colors.light.gold} style={{ padding: 40 }} />;

  return (
    <ScrollView>
      {/* Create Form */}
      <View style={S.card}>
        <Text style={S.title}>Tạo mã quà tặng hàng loạt</Text>

        {/* Tier selector */}
        <Text style={S.fieldLabel}>Gói VIP</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {paidTiers.map((t: any) => (
              <TouchableOpacity
                key={t._id}
                style={[S.chipBtn, selectedTierId === t._id && S.chipBtnActive]}
                onPress={() => setSelectedTierId(t._id)}
              >
                <Text style={[S.chipText, selectedTierId === t._id && S.chipTextActive]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Cycle toggle */}
        <Text style={S.fieldLabel}>Chu kỳ</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <TouchableOpacity style={[S.cycleBtn, billingCycle === 'monthly' && S.cycleBtnActive]} onPress={() => setBillingCycle('monthly')}>
            <Text style={[S.cycleText, billingCycle === 'monthly' && S.cycleTextActive]}>Hàng tháng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.cycleBtn, billingCycle === 'yearly' && S.cycleBtnActive]} onPress={() => setBillingCycle('yearly')}>
            <Text style={[S.cycleText, billingCycle === 'yearly' && S.cycleTextActive]}>Hàng năm</Text>
          </TouchableOpacity>
        </View>

        <AuthInput label="Số lượng" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
        <AuthInput label="Hết hạn sau (ngày)" value={expiresInDays} onChangeText={setExpiresInDays} keyboardType="numeric" />
        <AuthInput label="Lời nhắn" value={giftMessage} onChangeText={setGiftMessage} />

        <GoldButton title="Tạo mã quà tặng" onPress={handleGenerate} loading={generating} />
      </View>

      {error ? (
        <View style={S.emptyBox}>
          <Ionicons name="gift-outline" size={40} color={Colors.light.textMuted} />
          <Text style={S.emptyText}>{error}</Text>
        </View>
      ) : (
        <>
          <Text style={S.label}>Danh sách mã ({codes.length})</Text>
          {codes.length === 0 ? (
            <View style={S.emptyBox}>
              <Ionicons name="gift-outline" size={40} color={Colors.light.textMuted} />
              <Text style={S.emptyText}>Chưa có mã quà tặng nào.</Text>
            </View>
          ) : codes.map((c) => (
            <View key={c._id} style={S.item}>
              <View style={{ flex: 1 }}>
                <Text style={S.itemCode}>{c.code}</Text>
                <Text style={S.itemStatus}>
                  {c.tierId?.name || 'VIP'} · {c.billingCycle === 'monthly' ? 'Tháng' : 'Năm'} · {c.status}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(c._id)}>
                <Text style={{ color: Colors.light.error, fontSize: FontSizes.sm, fontWeight: '700' as const }}>Xóa</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const S = {
  card: { backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder, padding: Spacing.md, marginBottom: Spacing.md },
  title: { color: Colors.light.textMain, fontSize: FontSizes.md, fontWeight: '700', marginBottom: 8 },
  label: { color: Colors.light.textMuted, fontSize: FontSizes.sm, fontWeight: '600', marginBottom: 8 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: 6 },
  itemCode: { color: Colors.light.gold, fontSize: FontSizes.sm, fontWeight: '700', fontFamily: 'monospace' },
  itemStatus: { color: Colors.light.textDim, fontSize: FontSizes.xs, marginTop: 2 },
  emptyBox: { alignItems: 'center', padding: 32, gap: 8 },
  emptyText: { color: Colors.light.textMuted, fontSize: FontSizes.sm, textAlign: 'center', fontStyle: 'italic' },
  fieldLabel: { color: '#8c6a34', fontSize: 10, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  chipBtn: {
    backgroundColor: '#1e1508', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: 'rgba(201, 161, 90, 0.2)',
    paddingHorizontal: 14, paddingVertical: 8,
  },
  chipBtnActive: { backgroundColor: '#4a2c1a', borderColor: '#c9a15a' },
  chipText: { color: '#8c6a34', fontSize: FontSizes.xs, fontWeight: '600' },
  chipTextActive: { color: '#f0ddb7' },
  cycleBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: '#1e1508', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: 'rgba(201, 161, 90, 0.2)',
  },
  cycleBtnActive: { backgroundColor: '#4a2c1a', borderColor: '#c9a15a' },
  cycleText: { color: '#8c6a34', fontSize: FontSizes.xs, fontWeight: '600' },
  cycleTextActive: { color: '#f0ddb7' },
};
