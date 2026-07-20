import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { PageBackground } from '@/components/PageBackground';
import HeaderBar from '@/components/ui/HeaderBar';
import GoldButton from '@/components/ui/GoldButton';
import { curriculumApi, type StudyUnit, type Quiz, type QuizQuestion } from '@/services/curriculumApi';

export default function StudyUnitDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [unit, setUnit] = useState<StudyUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Quiz state
  const [quizzes, setQuizzes] = useState<Record<string, Quiz>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number[]>>({});
  const [quizResults, setQuizResults] = useState<Record<string, { passed: boolean; xpGained: number }>>({});
  const [submittingQuizId, setSubmittingQuizId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadUnit();
  }, [id]);

  const loadUnit = async () => {
    setLoading(true);
    try {
      const detail = await curriculumApi.getUnitDetail(id!);
      setUnit(detail);

      // Load progress
      try {
        const prog = await curriculumApi.getUnitProgress(id!);
        setCompleted(prog.completed);
      } catch { /* ignore */ }

      // Load quizzes
      const quizBlocks = (detail.contentBlocks || []).filter((b) => b.type === 'quiz');
      const qMap: Record<string, Quiz> = {};
      const aMap: Record<string, number[]> = {};

      await Promise.all(
        quizBlocks.map(async (block) => {
          const quizId = block.data?.quizId;
          if (!quizId) return;
          try {
            const qRes = await curriculumApi.getQuiz(quizId);
            qMap[quizId] = qRes;
            aMap[quizId] = new Array(qRes.questions.length).fill(-1);
          } catch { /* skip */ }
        })
      );
      setQuizzes(qMap);
      setQuizAnswers(aMap);
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể tải bài học.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (completed || completing || !id) return;
    setCompleting(true);
    try {
      const res = await curriculumApi.completeUnit(id);
      setCompleted(true);
      if (res.xpGained > 0) {
        Alert.alert('🎉 Hoàn thành!', `Bạn nhận được +${res.xpGained} XP.`);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể đánh dấu hoàn thành.');
    } finally {
      setCompleting(false);
    }
  };

  const handleSelectOption = (quizId: string, qIdx: number, optIdx: number) => {
    if (quizResults[quizId]) return;
    setQuizAnswers((prev) => {
      const current = [...(prev[quizId] || [])];
      current[qIdx] = optIdx;
      return { ...prev, [quizId]: current };
    });
  };

  const handleSubmitQuiz = async (quizId: string) => {
    const answers = quizAnswers[quizId] || [];
    if (answers.some((a) => a === -1)) {
      Alert.alert('Chưa xong', 'Vui lòng trả lời tất cả câu hỏi.');
      return;
    }

    const quiz = quizzes[quizId];
    if (!quiz) return;

    // Calculate score locally from correctIndex
    let correct = 0;
    quiz.questions.forEach((q, idx) => {
      if (q.correctIndex !== undefined && answers[idx] === q.correctIndex) correct++;
    });

    setSubmittingQuizId(quizId);
    try {
      const res = await curriculumApi.submitQuiz(quizId, correct, quiz.questions.length);
      setQuizResults((prev) => ({
        ...prev,
        [quizId]: { passed: res.passed, xpGained: res.xpGained },
      }));
      if (!completed) setCompleted(true); // Auto-complete unit if quiz passed
    } catch {
      Alert.alert('Lỗi', 'Không thể nộp bài quiz.');
    } finally {
      setSubmittingQuizId(null);
    }
  };

  if (loading) {
    return (
      <PageBackground style={styles.container}>
        <HeaderBar title="Bài Học" showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      </PageBackground>
    );
  }

  if (!unit) {
    return (
      <PageBackground style={styles.container}>
        <HeaderBar title="Bài Học" showBack />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.light.textMuted} />
          <Text style={styles.errorText}>Không tìm thấy bài học.</Text>
        </View>
      </PageBackground>
    );
  }

  return (
    <PageBackground style={styles.container}>
      <HeaderBar title={unit.title} showBack />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.unitTitle}>{unit.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={12} color={Colors.light.gold} />
              <Text style={styles.metaChipT}>{unit.duration} phút</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipT}>
                {unit.difficulty === 'Easy' ? 'Dễ' : unit.difficulty === 'Medium' ? 'Vừa' : 'Khó'}
              </Text>
            </View>
          </View>
          <Text style={styles.unitSummary}>{unit.summary}</Text>
        </View>

        {/* Content Blocks */}
        {(unit.contentBlocks || []).map((block, idx) => {
          if (block.type === 'text') {
            return (
              <View key={idx} style={styles.textBlock}>
                <Text style={styles.textContent}>{block.data?.text || block.data?.content || ''}</Text>
              </View>
            );
          }

          if (block.type === 'image' && block.data?.url) {
            return (
              <View key={idx} style={styles.imageBlock}>
                <Ionicons name="image-outline" size={48} color={Colors.light.textMuted} />
                <Text style={styles.imagePlaceholder}>Ảnh minh họa</Text>
              </View>
            );
          }

          if (block.type === 'quiz') {
            const quizId = block.data?.quizId;
            const quiz = quizId ? quizzes[quizId] : null;
            const result = quizId ? quizResults[quizId] : null;

            if (!quiz) return null;

            return (
              <View key={idx} style={styles.quizBlock}>
                <Text style={styles.quizTitle}>📝 {quiz.title || 'Câu hỏi kiểm tra'}</Text>

                {quiz.questions.map((q: QuizQuestion, qIdx: number) => {
                  const selected = quizId ? (quizAnswers[quizId]?.[qIdx] ?? -1) : -1;
                  const isCorrect = quizId && result
                    ? (q.correctIndex !== undefined && selected === q.correctIndex)
                    : null;

                  return (
                    <View key={qIdx} style={styles.questionCard}>
                      <Text style={styles.questionText}>
                        {qIdx + 1}. {q.question}
                      </Text>
                      {q.options.map((opt: string, optIdx: number) => {
                        const isSelected = selected === optIdx;
                        let bgColor = Colors.light.backgroundCard;
                        if (result) {
                          if (q.correctIndex === optIdx) bgColor = 'rgba(34,139,34,0.15)';
                          else if (isSelected) bgColor = 'rgba(220,38,38,0.1)';
                        } else if (isSelected) {
                          bgColor = 'rgba(201,161,90,0.2)';
                        }

                        return (
                          <TouchableOpacity
                            key={optIdx}
                            style={[styles.optionBtn, { backgroundColor: bgColor, borderColor: isSelected ? Colors.light.gold : Colors.light.panelBorder }]}
                            onPress={() => handleSelectOption(quizId!, qIdx, optIdx)}
                            disabled={!!result}
                          >
                            <Text style={styles.optionText}>{opt}</Text>
                            {result && q.correctIndex === optIdx && (
                              <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                            )}
                            {result && isSelected && q.correctIndex !== optIdx && (
                              <Ionicons name="close-circle" size={16} color="#dc2626" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}

                {!result ? (
                  <GoldButton
                    title={submittingQuizId === quizId ? 'Đang nộp...' : 'Nộp bài'}
                    onPress={() => handleSubmitQuiz(quizId!)}
                    loading={submittingQuizId === quizId}
                    disabled={!!submittingQuizId}
                  />
                ) : (
                  <View style={styles.quizResult}>
                    <Ionicons
                      name={result.passed ? 'checkmark-circle' : 'close-circle'}
                      size={24}
                      color={result.passed ? '#16a34a' : '#dc2626'}
                    />
                    <Text style={[styles.quizResultText, { color: result.passed ? '#16a34a' : '#dc2626' }]}>
                      {result.passed ? 'Đạt!' : 'Chưa đạt'} — +{result.xpGained} XP
                    </Text>
                  </View>
                )}
              </View>
            );
          }

          return null;
        })}

        {/* Complete Button */}
        <View style={styles.completeSection}>
          {completed ? (
            <View style={styles.completedBanner}>
              <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
              <Text style={styles.completedBannerText}>Bạn đã hoàn thành bài học này</Text>
            </View>
          ) : (
            <GoldButton
              title="Hoàn thành bài học"
              onPress={handleComplete}
              loading={completing}
            />
          )}
        </View>
      </ScrollView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: Colors.light.textMuted, fontSize: FontSizes.md, marginTop: 12 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 40 },
  // Header
  headerCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 8,
  },
  unitTitle: { fontFamily: 'Playfair Display', fontSize: FontSizes.xl, fontWeight: '700', color: Colors.light.textMain },
  metaRow: { flexDirection: 'row', gap: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(201,161,90,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  metaChipT: { color: Colors.light.gold, fontSize: FontSizes.xs, fontWeight: '600' },
  unitSummary: { color: Colors.light.textMuted, fontSize: FontSizes.sm, lineHeight: 20 },
  // Text block
  textBlock: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  textContent: { color: Colors.light.textMain, fontSize: FontSizes.sm, lineHeight: 22 },
  // Image block
  imageBlock: {
    backgroundColor: Colors.light.backgroundCardAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: 40,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  imagePlaceholder: { color: Colors.light.textMuted, fontSize: FontSizes.xs, marginTop: 8 },
  // Quiz block
  quizBlock: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 12,
  },
  quizTitle: { color: Colors.light.textMain, fontSize: FontSizes.md, fontWeight: '700', marginBottom: 4 },
  questionCard: { gap: 6, marginBottom: 8 },
  questionText: { color: Colors.light.textMain, fontSize: FontSizes.sm, fontWeight: '600', marginBottom: 4 },
  optionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  optionText: { color: Colors.light.textMain, fontSize: FontSizes.sm, flex: 1 },
  quizResult: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
  quizResultText: { fontSize: FontSizes.sm, fontWeight: '700' },
  // Complete
  completeSection: { marginTop: 8, marginBottom: 24 },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(34,139,34,0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(34,139,34,0.25)',
    padding: Spacing.md,
  },
  completedBannerText: { color: '#16a34a', fontSize: FontSizes.sm, fontWeight: '700' },
});
