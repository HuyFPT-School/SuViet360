import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { lessonApi } from '@/services/lessonApi';
import type { Lesson } from '@/types/lesson';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import HeaderBar from '@/components/ui/HeaderBar';
import { PageBackground } from '@/components/PageBackground';

export default function LessonDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    lessonApi
      .getById(id)
      .then((data) => setLesson(data.lesson))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PageBackground style={styles.container}>
        <HeaderBar title="Bài Học" showBack />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      </PageBackground>
    );
  }

  if (error || !lesson) {
    return (
      <PageBackground style={styles.container}>
        <HeaderBar title="Bài Học" showBack />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Lỗi: {error || 'Không tìm thấy bài học'}</Text>
        </View>
      </PageBackground>
    );
  }

  return (
    <PageBackground style={styles.container}>
      <HeaderBar title={lesson.title} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentCard}>
          <Text style={styles.title}>{lesson.title}</Text>
          {lesson.content ? (
            <Text style={styles.content}>{lesson.content}</Text>
          ) : null}

          {/* Game Info */}
          {lesson.game && (
            <View style={styles.gameInfo}>
              <Text style={styles.gameTitle}>🎮 Thông tin game</Text>
              <Text style={styles.gameText}>
                Spawn: ({lesson.game.spawnPoint.x}, {lesson.game.spawnPoint.y})
              </Text>
              <Text style={styles.gameText}>
                Tilesets: {lesson.game.tilesets?.length || 0}
              </Text>
              <Text style={styles.gameText}>
                Animations:{' '}
                {Object.keys(lesson.game.character?.animations || {}).length}
              </Text>
              <Text style={styles.gameNote}>
                (Game Phaser chỉ khả dụng trên web)
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.md,
    color: Colors.light.error,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  contentCard: {
    backgroundColor: Colors.light.panel,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.lg,
    gap: 16,
  },
  title: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.light.text,
  },
  content: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.lg,
    color: Colors.light.textMuted,
    lineHeight: 26,
  },
  gameInfo: {
    backgroundColor: 'rgba(201, 161, 90, 0.08)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.2)',
    padding: Spacing.md,
    gap: 8,
  },
  gameTitle: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.light.gold,
    letterSpacing: 0.5,
  },
  gameText: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.md,
    color: Colors.light.textMuted,
  },
  gameNote: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.sm,
    color: Colors.light.textDim,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
