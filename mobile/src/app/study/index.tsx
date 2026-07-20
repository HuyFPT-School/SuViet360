import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { PageBackground } from '@/components/PageBackground';
import HeaderBar from '@/components/ui/HeaderBar';
import { curriculumApi, type Chapter, type StudyUnit, type ProgressDashboard } from '@/services/curriculumApi';

const GRADES = ['All', 10, 11, 12] as const;

export default function StudyOverviewScreen() {
  const router = useRouter();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [unitsMap, setUnitsMap] = useState<Record<string, StudyUnit[]>>({});
  const [completedUnits, setCompletedUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<typeof GRADES[number]>('All');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Load progress to get completed units
        try {
          const prog: ProgressDashboard = await curriculumApi.getProgressDashboard();
          setCompletedUnits(prog.completedUnits || []);
        } catch { /* ignore */ }

        // Load chapters
        const chs = await curriculumApi.getChapters();
        setChapters(chs);

        // Load units for each chapter
        const map: Record<string, StudyUnit[]> = {};
        await Promise.all(
          chs.map(async (ch) => {
            try {
              const units = await curriculumApi.getUnits(ch._id);
              if (units.length > 0) map[ch._id] = units;
            } catch { /* skip */ }
          })
        );
        setUnitsMap(map);
      } catch { /* ignore */ }
      finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = chapters.filter((ch) => {
    if (gradeFilter === 'All') return true;
    return ch.grade === gradeFilter;
  });

  return (
    <PageBackground style={styles.container}>
      <HeaderBar title="Học Tập" showBack />

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Khám phá Sử Việt</Text>
        <View style={styles.heroDivider} />
        <Text style={styles.heroSub}>
          Hành trình nghiên cứu lịch sử hào hùng của dân tộc Việt Nam qua các chương mục lý thuyết sinh động.
        </Text>
      </View>

      {/* Grade filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {GRADES.map((grade) => (
          <TouchableOpacity
            key={String(grade)}
            style={[styles.filterPill, gradeFilter === grade && styles.filterPillActive]}
            onPress={() => setGradeFilter(grade)}
          >
            <Text style={[styles.filterPillT, gradeFilter === grade && styles.filterPillTActive]}>
              {grade === 'All' ? 'Tất cả các lớp' : `Khối lớp ${grade}`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {filtered.map((chapter) => {
            const units = unitsMap[chapter._id] || [];
            if (units.length === 0) return null;

            return (
              <View key={chapter._id} style={styles.chapterSection}>
                {/* Chapter Banner */}
                <View style={styles.chapterBanner}>
                  {chapter.coverImage ? (
                    <Image source={{ uri: chapter.coverImage }} style={styles.chapterBg} />
                  ) : null}
                  <View style={styles.chapterOverlay} />
                  <View style={styles.chapterInfo}>
                    <View style={styles.gradeBadge}>
                      <Text style={styles.gradeBadgeT}>Chương học lớp {chapter.grade}</Text>
                    </View>
                    <Text style={styles.chapterTitle}>{chapter.title}</Text>
                    {chapter.description ? (
                      <Text style={styles.chapterDesc} numberOfLines={2}>{chapter.description}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Units Grid */}
                <View style={styles.unitsGrid}>
                  {units.map((unit) => {
                    const isCompleted = completedUnits.includes(unit._id);
                    return (
                      <TouchableOpacity
                        key={unit._id}
                        style={styles.unitCard}
                        onPress={() => router.push(`/study/${unit._id}` as any)}
                        activeOpacity={0.8}
                      >
                        {unit.thumbnail ? (
                          <Image source={{ uri: unit.thumbnail }} style={styles.unitThumb} />
                        ) : (
                          <View style={styles.unitThumbPlaceholder}>
                            <Ionicons name="book-outline" size={28} color={Colors.light.gold} />
                          </View>
                        )}
                        <View style={styles.unitBody}>
                          <View style={styles.unitTitleRow}>
                            <Text style={styles.unitTitle} numberOfLines={2}>{unit.title}</Text>
                            {isCompleted && (
                              <View style={styles.completedBadge}>
                                <Text style={styles.completedBadgeT}>Đã học</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.unitSummary} numberOfLines={2}>{unit.summary}</Text>
                          <View style={styles.unitMeta}>
                            <View style={styles.metaChip}>
                              <Ionicons name="time-outline" size={10} color={Colors.light.gold} />
                              <Text style={styles.metaChipT}>{unit.duration} phút</Text>
                            </View>
                            <View style={styles.metaChip}>
                              <Text style={styles.metaChipT}>
                                {unit.difficulty === 'Easy' ? 'Dễ' : unit.difficulty === 'Medium' ? 'Vừa' : 'Khó'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.unitArrow}>
                          <Ionicons name="chevron-forward" size={18} color={Colors.light.gold} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
          {chapters.length === 0 && (
            <View style={styles.center}>
              <Ionicons name="book-outline" size={48} color={Colors.light.textMuted} />
              <Text style={styles.emptyText}>Hiện tại chưa có chương học nào được công bố.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: Colors.light.textMuted, fontSize: FontSizes.md, marginTop: 12, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  // Hero
  hero: { alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 16, paddingBottom: 12 },
  heroTitle: { fontFamily: 'Playfair Display', fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.dark.maroonDark, letterSpacing: 1 },
  heroDivider: { width: 80, height: 2, backgroundColor: Colors.light.gold, marginVertical: 8, borderRadius: 1 },
  heroSub: { fontSize: FontSizes.sm, color: Colors.light.textMuted, textAlign: 'center', lineHeight: 20, fontStyle: 'italic' },
  // Filter
  filterRow: { maxHeight: 42, marginBottom: 8 },
  filterContent: { gap: 8, paddingHorizontal: Spacing.md },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.light.backgroundCard, borderWidth: 1, borderColor: Colors.light.panelBorder },
  filterPillActive: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  filterPillT: { color: Colors.light.textMuted, fontSize: FontSizes.xs, fontWeight: '600' },
  filterPillTActive: { color: Colors.light.backgroundDark, fontWeight: '700' },
  // Chapter banner
  chapterSection: { marginBottom: Spacing.lg },
  chapterBanner: { marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden', minHeight: 100, justifyContent: 'center', backgroundColor: Colors.light.goldDark },
  chapterBg: { ...StyleSheet.absoluteFillObject, opacity: 0.25 },
  chapterOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,10,6,0.55)' },
  chapterInfo: { padding: Spacing.md, gap: 4 },
  gradeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  gradeBadgeT: { color: Colors.light.goldLight, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  chapterTitle: { fontFamily: 'Playfair Display', fontSize: FontSizes.xl, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  chapterDesc: { fontSize: FontSizes.xs, color: Colors.light.goldLight, lineHeight: 18 },
  // Unit cards
  unitsGrid: { gap: 8, paddingHorizontal: Spacing.md, marginTop: 8 },
  unitCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  unitThumb: { width: 60, height: 60, borderRadius: BorderRadius.md },
  unitThumbPlaceholder: {
    width: 60, height: 60, borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(201, 161, 90, 0.1)', alignItems: 'center', justifyContent: 'center',
  },
  unitBody: { flex: 1, marginLeft: 10, gap: 2 },
  unitTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 },
  unitTitle: { color: Colors.light.textMain, fontSize: FontSizes.sm, fontWeight: '700', flex: 1 },
  completedBadge: { backgroundColor: 'rgba(34,139,34,0.15)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(34,139,34,0.3)' },
  completedBadgeT: { color: '#16a34a', fontSize: 10, fontWeight: '700' },
  unitSummary: { color: Colors.light.textMuted, fontSize: FontSizes.xs, lineHeight: 16 },
  unitMeta: { flexDirection: 'row', gap: 6, marginTop: 2 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(201,161,90,0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  metaChipT: { color: Colors.light.gold, fontSize: 10, fontWeight: '600' },
  unitArrow: { marginLeft: 4 },
});
