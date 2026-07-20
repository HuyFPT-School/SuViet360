import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import Ionicons from '@expo/vector-icons/Ionicons';
import { lessonApi } from '@/services/lessonApi';
import { curriculumApi } from '@/services/curriculumApi';
import { generateGameHtml } from '@/utils/gameHtml';
import { Colors, FontSizes } from '@/constants/theme';

export default function GameScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    lockLandscape();
    return () => { unlockOrientation(); };
  }, []);

  useEffect(() => {
    if (!id) return;
    submittedRef.current = false;
    loadLesson();
  }, [id]);

  const lockLandscape = async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } catch { /* ignore */ }
  };

  const unlockOrientation = async () => {
    try {
      await ScreenOrientation.unlockAsync();
    } catch { /* ignore */ }
  };

  const loadLesson = async () => {
    try {
      const res = await lessonApi.getById(id!);
      const lesson = res.lesson;
      if (!lesson?.game) {
        setError('Bài học này không có dữ liệu trò chơi.');
        setLoading(false);
        return;
      }
      const gameHtml = generateGameHtml(lesson as any);
      setHtml(gameHtml);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu trò chơi.');
    } finally {
      setLoading(false);
    }
  };

  /** Handle quiz completion message from WebView */
  const handleMessage = useCallback(
    async (event: any) => {
      if (submittedRef.current || submitting) return;
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type !== 'quiz_complete') return;

        const { score, total } = data;
        if (!id || score === undefined || total === undefined) return;

        submittedRef.current = true;
        setSubmitting(true);

        const result = await curriculumApi.submitLessonProgress(id, score, total);

        Alert.alert(
          '🎉 Chúc mừng!',
          `Bạn đã trả lời đúng ${score}/${total} câu hỏi.\n\n` +
            `+${result.quizXpGained} XP (quiz) + ${result.lessonXpGained} XP (hoàn thành)\n` +
            `Tổng: +${result.totalXpGained} XP`,
          [{ text: 'OK', onPress: handleClose }]
        );
      } catch {
        Alert.alert('Lỗi', 'Không thể lưu kết quả. Vui lòng thử lại.');
      } finally {
        setSubmitting(false);
      }
    },
    [id, submitting]
  );

  const handleClose = () => {
    unlockOrientation();
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.gold} />
        <Text style={styles.loadingText}>Đang tải trò chơi...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.light.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleClose}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        onMessage={handleMessage}
      />
      <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
        <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
      {submitting && (
        <View style={styles.submittingOverlay}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
          <Text style={styles.submittingText}>Đang lưu kết quả...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0a06' },
  webview: { flex: 1, backgroundColor: '#1a0a06' },
  center: {
    flex: 1, backgroundColor: '#1a0a06',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  loadingText: { color: Colors.light.gold, fontSize: FontSizes.md, marginTop: 12 },
  errorText: { color: Colors.light.textMuted, fontSize: FontSizes.md, textAlign: 'center', marginTop: 12 },
  closeBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 100,
    padding: 4,
  },
  backBtn: {
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.light.gold, borderRadius: 8,
  },
  backBtnText: { color: '#1a0a06', fontWeight: '700', fontSize: FontSizes.sm },
  submittingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 200,
  },
  submittingText: { color: Colors.light.gold, fontSize: FontSizes.md, marginTop: 12 },
});
