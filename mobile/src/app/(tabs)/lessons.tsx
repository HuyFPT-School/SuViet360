import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PageBackground } from '@/components/PageBackground';
import Ionicons from '@expo/vector-icons/Ionicons';
import { lessonApi } from '@/services/lessonApi';
import type { Lesson } from '@/types/lesson';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';

export default function LessonsScreen() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchLessons = async () => {
    try {
      const data = await lessonApi.getAll();
      setLessons(data.lessons);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLessons();
  };

  if (loading) {
    return (
      <PageBackground style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="book-outline" size={22} color={Colors.light.goldLight} />
            <Text style={styles.headerTitle}>Bài Học</Text>
          </View>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      </PageBackground>
    );
  }

  return (
    <PageBackground style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="book-outline" size={22} color={Colors.light.goldLight} />
          <Text style={styles.headerTitle}>Bài Học</Text>
        </View>
        <Text style={styles.headerSubtitle}>Khám phá lịch sử Việt Nam</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.gold}
          />
        }
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Lỗi: {error}</Text>
          </View>
        ) : null}

        {lessons.length === 0 && !error ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Chưa có bài học nào</Text>
          </View>
        ) : (
          lessons.map((lesson) => (
            <TouchableOpacity
              key={lesson._id}
              style={styles.lessonCard}
              onPress={() => router.push(`/lesson/${lesson._id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.lessonHeader}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                {lesson.status && (
                  <View style={[
                    styles.statusBadge,
                    lesson.status === 'Published' && styles.statusPublished,
                    lesson.status === 'Pending_Review' && styles.statusPending,
                    lesson.status === 'Rejected' && styles.statusRejected,
                  ]}>
                    <Text style={styles.statusText}>
                      {lesson.status === 'Published' ? 'Đã XB' :
                       lesson.status === 'Pending_Review' ? 'Chờ Duyệt' : 'Từ Chối'}
                    </Text>
                  </View>
                )}
              </View>
              {lesson.content ? (
                <Text style={styles.lessonDesc} numberOfLines={2}>
                  {lesson.content}
                </Text>
              ) : null}
              <Text style={styles.lessonDate}>
                {new Date(lesson.createdAt).toLocaleDateString('vi-VN')}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.light.backgroundDark,
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.goldDark,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: Spacing.md,
  },
  headerTitle: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.light.goldLight,
    letterSpacing: 1.5,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSubtitle: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.sm,
    color: Colors.light.goldMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: 12,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.lg,
    color: Colors.light.textMuted,
    fontStyle: 'italic',
  },
  errorBox: {
    padding: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.errorBg,
    borderWidth: 1,
    borderColor: 'rgba(175, 55, 55, 0.5)',
    marginBottom: 12,
  },
  errorText: {
    color: Colors.light.error,
    textAlign: 'center',
  },
  lessonCard: {
    backgroundColor: Colors.light.panel,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.md,
    gap: 8,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lessonTitle: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusPublished: {
    backgroundColor: 'rgba(43, 106, 43, 0.15)',
  },
  statusPending: {
    backgroundColor: 'rgba(201, 161, 90, 0.15)',
  },
  statusRejected: {
    backgroundColor: 'rgba(176, 48, 42, 0.15)',
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.light.textMuted,
  },
  lessonDesc: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.md,
    color: Colors.light.textMuted,
    lineHeight: 20,
  },
  lessonDate: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.xs,
    color: Colors.light.textDim,
    fontStyle: 'italic',
  },
});
