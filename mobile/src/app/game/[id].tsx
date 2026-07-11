import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import Ionicons from '@expo/vector-icons/Ionicons';
import { lessonApi } from '@/services/lessonApi';
import { generateGameHtml } from '@/utils/gameHtml';
import { Colors, FontSizes } from '@/constants/theme';

export default function GameScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    lockLandscape();
    return () => { unlockOrientation(); };
  }, []);

  useEffect(() => {
    if (!id) return;
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
      />
      <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
        <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
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
});
