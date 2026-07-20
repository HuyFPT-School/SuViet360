import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { api, ensureCsrfToken } from '@/services/api';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import GoldButton from '@/components/ui/GoldButton';
import AuthInput from '@/components/ui/AuthInput';

interface Quiz { _id: string; title: string; questions: any[]; passScore: number; }
interface Question { question: string; options: string[]; correctIndex: number; }

export default function QuizTab() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', passScore: '60' });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const res = await api.get<{ success: boolean; data: { quizzes: Quiz[] } }>('/curriculum/quizzes'); setQuizzes(res.data.data.quizzes || []); } catch { }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const addQuestion = () => setQuestions([...questions, { question: '', options: ['', '', '', ''], correctIndex: 0 }]);

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('Lỗi', 'Nhập tên quiz.'); return; }
    if (questions.length === 0) { Alert.alert('Lỗi', 'Thêm ít nhất 1 câu hỏi.'); return; }
    setSaving(true);
    try {
      const token = await ensureCsrfToken();
      await api.post('/curriculum/quizzes', { ...form, questions, passScore: Number(form.passScore) }, { headers: { 'x-csrf-token': token } });
      setShowForm(false); setForm({ title: '', passScore: '60' }); setQuestions([]); load();
    } catch { Alert.alert('Lỗi', 'Không thể tạo quiz.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Xác nhận', 'Xóa quiz này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { try { await api.delete(`/curriculum/quizzes/${id}`); load(); } catch { } } },
    ]);
  };

  if (loading) return <ActivityIndicator size="large" color={Colors.light.gold} style={{ padding: 40 }} />;

  return (
    <ScrollView style={{ padding: Spacing.md }}>
      <GoldButton title="Tạo Quiz Mới" onPress={() => setShowForm(true)} style={{ marginBottom: 12 }} />

      {showForm && (
        <View style={ST.card}>
          <Text style={ST.cardTitle}>Tạo Quiz</Text>
          <AuthInput label="Tên quiz" value={form.title} onChangeText={(t: string) => setForm({ ...form, title: t })} />
          <AuthInput label="Điểm đạt (%)" value={form.passScore} onChangeText={(t: string) => setForm({ ...form, passScore: t })} keyboardType="numeric" />

          {questions.map((q, qi) => (
            <View key={qi} style={{ backgroundColor: Colors.light.backgroundCardAlt, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: 8, gap: 4 }}>
              <Text style={{ color: Colors.light.gold, fontSize: FontSizes.sm, fontWeight: '700' }}>Câu {qi + 1}</Text>
              <TextInput style={ST.inp} placeholder="Câu hỏi" placeholderTextColor={Colors.light.textDim} value={q.question} onChangeText={(t) => { const n = [...questions]; n[qi].question = t; setQuestions(n); }} />
              {q.options.map((o, oi) => (
                <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity onPress={() => { const n = [...questions]; n[qi].correctIndex = oi; setQuestions(n); }}>
                    <Text style={{ color: q.correctIndex === oi ? Colors.light.gold : Colors.light.textDim, fontSize: FontSizes.sm, fontWeight: '700' }}>{q.correctIndex === oi ? '✓' : '○'}</Text>
                  </TouchableOpacity>
                  <TextInput style={[ST.inp, { flex: 1 }]} placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`} placeholderTextColor={Colors.light.textDim} value={o} onChangeText={(t) => { const n = [...questions]; n[qi].options[oi] = t; setQuestions(n); }} />
                </View>
              ))}
              <TouchableOpacity onPress={() => { setQuestions(questions.filter((_, i) => i !== qi)); }}>
                <Text style={{ color: Colors.light.error, fontSize: FontSizes.xs }}>Xóa câu hỏi</Text>
              </TouchableOpacity>
            </View>
          ))}

          <GoldButton title="+ Thêm câu hỏi" variant="secondary" onPress={addQuestion} style={{ marginBottom: 8 }} />
          <GoldButton title="Lưu Quiz" onPress={handleSave} loading={saving} />
        </View>
      )}

      {quizzes.map((q) => (
        <View key={q._id} style={ST.item}>
          <View style={{ flex: 1 }}><Text style={ST.itemTitle}>{q.title}</Text><Text style={ST.itemSub}>{q.questions?.length || 0} câu · Điểm đạt: {q.passScore}%</Text></View>
          <TouchableOpacity onPress={() => handleDelete(q._id)}><Text style={{ color: Colors.light.error, fontSize: FontSizes.sm, fontWeight: '700' }}>Xóa</Text></TouchableOpacity>
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
  inp: { backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.light.panelBorder, color: Colors.light.textMain, fontSize: FontSizes.sm, paddingHorizontal: 10, paddingVertical: 6 },
};
