import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { api, ensureCsrfToken } from '@/services/api';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import GoldButton from '@/components/ui/GoldButton';
import AuthInput from '@/components/ui/AuthInput';

interface GiftCode { _id: string; code: string; status: string; createdAt: string; }

export default function AdminGiftCodesTab() {
  const [codes, setCodes] = useState<GiftCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState('5');
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: GiftCode[] }>('/admin/gift-codes');
      setCodes(res.data.data || []);
    } catch { Alert.alert('Lỗi', 'Không thể tải danh sách.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    const num = Number(count);
    if (!num || num < 1 || num > 100) { Alert.alert('Lỗi', 'Nhập số từ 1-100.'); return; }
    setGenerating(true);
    try {
      const token = await ensureCsrfToken();
      await api.post('/admin/gift-codes/generate', { count: num }, { headers: { 'x-csrf-token': token } });
      Alert.alert('OK', `Đã tạo ${num} mã quà tặng.`);
      load();
    } catch { Alert.alert('Lỗi', 'Không thể tạo mã.'); }
    finally { setGenerating(false); }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Xác nhận', 'Xóa mã này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { try { await api.delete(`/admin/gift-codes/${id}`); load(); } catch { } } },
    ]);
  };

  if (loading) return <ActivityIndicator size="large" color={Colors.light.gold} style={{ padding: 40 }} />;

  return (
    <ScrollView>
      <View style={S.card}>
        <Text style={S.title}>Tạo mã quà tặng hàng loạt</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><AuthInput label="Số lượng" value={count} onChangeText={setCount} keyboardType="numeric" /></View>
          <GoldButton title="Tạo" onPress={handleGenerate} loading={generating} style={{ marginBottom: 8 }} />
        </View>
      </View>

      <Text style={S.label}>Danh sách mã ({codes.length})</Text>
      {codes.map((c) => (
        <View key={c._id} style={S.item}>
          <View style={{ flex: 1 }}>
            <Text style={S.itemCode}>{c.code}</Text>
            <Text style={S.itemStatus}>{c.status} · {new Date(c.createdAt).toLocaleDateString('vi-VN')}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(c._id)}>
            <Text style={{ color: Colors.light.error, fontSize: FontSizes.sm, fontWeight: '700' }}>Xóa</Text>
          </TouchableOpacity>
        </View>
      ))}
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
};
