import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { api, ensureCsrfToken } from '@/services/api';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import GoldButton from '@/components/ui/GoldButton';
import AuthInput from '@/components/ui/AuthInput';

interface Chapter { _id: string; title: string; description: string; grade: number; order: number; status: string; }

export default function ChapterTab() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Chapter | null>(null);
  const [form, setForm] = useState({ title: '', description: '', grade: 10, order: 0 });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: { chapters: Chapter[] } }>('/curriculum/chapters');
      setChapters(res.data.data.chapters || []);
    } catch { Alert.alert('Lỗi', 'Không thể tải danh sách chương.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tên chương.'); return; }
    setSaving(true);
    try {
      const token = await ensureCsrfToken();
      if (editing) {
        await api.put(`/curriculum/chapters/${editing._id}`, form, { headers: { 'x-csrf-token': token } });
      } else {
        await api.post('/curriculum/chapters', form, { headers: { 'x-csrf-token': token } });
      }
      setEditing(null); setForm({ title: '', description: '', grade: 10, order: 0 }); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu chương.'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Xác nhận', 'Xóa chương này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { try { await api.delete(`/curriculum/chapters/${id}`); load(); } catch { } } },
    ]);
  };

  if (loading) return <ActivityIndicator size="large" color={Colors.light.gold} style={{ padding: 40 }} />;

  return (
    <ScrollView style={{ padding: Spacing.md }}>
      {/* Form */}
      <View style={ST.card}>
        <Text style={ST.cardTitle}>{editing ? 'Sửa chương' : 'Tạo chương mới'}</Text>
        <AuthInput label="Tên chương" value={form.title} onChangeText={(t: string) => setForm({ ...form, title: t })} />
        <AuthInput label="Mô tả" value={form.description} onChangeText={(t: string) => setForm({ ...form, description: t })} multiline numberOfLines={2} style={{ height: 60, textAlignVertical: 'top' }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><AuthInput label="Lớp" value={String(form.grade)} onChangeText={(t: string) => setForm({ ...form, grade: Number(t) || 10 })} keyboardType="numeric" /></View>
          <View style={{ flex: 1 }}><AuthInput label="Thứ tự" value={String(form.order)} onChangeText={(t: string) => setForm({ ...form, order: Number(t) || 0 })} keyboardType="numeric" /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <View style={{ flex: 1 }}><GoldButton title={editing ? 'Cập nhật' : 'Tạo'} onPress={handleSave} loading={saving} /></View>
          {editing && <View style={{ flex: 1 }}><GoldButton title="Hủy" variant="secondary" onPress={() => { setEditing(null); setForm({ title: '', description: '', grade: 10, order: 0 }); }} /></View>}
        </View>
      </View>

      {/* List */}
      {chapters.map((ch) => (
        <View key={ch._id} style={ST.item}>
          <View style={{ flex: 1 }}>
            <Text style={ST.itemTitle}>{ch.title}</Text>
            <Text style={ST.itemSub}>Lớp {ch.grade} · Thứ tự {ch.order} · {ch.status}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => { setEditing(ch); setForm({ title: ch.title, description: ch.description || '', grade: ch.grade, order: ch.order }); }}>
              <Text style={ST.action}>Sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(ch._id)}>
              <Text style={[ST.action, { color: Colors.light.error }]}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const ST = {
  card: { backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.light.panelBorder, padding: Spacing.md, marginBottom: Spacing.md },
  cardTitle: { color: Colors.light.textMain, fontSize: FontSizes.md, fontWeight: '700', marginBottom: 8 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: 8 },
  itemTitle: { color: Colors.light.textMain, fontSize: FontSizes.sm, fontWeight: '600' },
  itemSub: { color: Colors.light.textDim, fontSize: FontSizes.xs, marginTop: 2 },
  action: { color: Colors.light.gold, fontSize: FontSizes.sm, fontWeight: '700' },
};
