import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { PageBackground } from '@/components/PageBackground';
import HeaderBar from '@/components/ui/HeaderBar';
import AuthInput from '@/components/ui/AuthInput';
import GoldButton from '@/components/ui/GoldButton';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { adminApi } from '@/services/adminApi';
import Ionicons from '@expo/vector-icons/Ionicons';

const LEVEL_OPTIONS = [
  { label: 'Dễ', value: 'Easy' },
  { label: 'Trung bình', value: 'Medium' },
  { label: 'Khó', value: 'Hard' },
];

export default function CreatePodcastScreen() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [level, setLevel] = useState('Medium');
  const [category, setCategory] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [lessons, setLessons] = useState<any[]>([]);

  const [thumbnail, setThumbnail] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [audio, setAudio] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminApi.getLessons().then(setLessons).catch(() => {});
  }, []);

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAudio(result.assets[0]);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const pickThumbnail = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setThumbnail(result.assets[0]);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề và mô tả.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('content', content.trim());
      formData.append('level', level);
      if (category) formData.append('category', category.trim());
      if (lessonId) formData.append('lessonId', lessonId);

      if (thumbnail) {
        formData.append('thumbnail', {
          uri: thumbnail.uri,
          name: thumbnail.name || 'thumbnail.png',
          type: thumbnail.mimeType || 'image/png',
        } as any);
      }

      if (audio) {
        formData.append('audio', {
          uri: audio.uri,
          name: audio.name || 'audio.mp3',
          type: audio.mimeType || 'audio/mpeg',
        } as any);
      }

      await adminApi.createPodcast(formData);
      Alert.alert('Thành công', 'Đã tạo podcast.');
      router.back();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể tạo podcast.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageBackground style={styles.container}>
      <HeaderBar title="Tạo Podcast" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AuthInput
          label="Tiêu đề"
          placeholder="Nhập tiêu đề..."
          value={title}
          onChangeText={setTitle}
        />
        <AuthInput
          label="Mô tả ngắn"
          placeholder="Tóm tắt về podcast..."
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <AuthInput
          label="Nội dung / Ghi chú"
          placeholder="Nội dung chính hoặc transcript..."
          value={content}
          onChangeText={setContent}
          multiline
        />

        <Text style={styles.sectionTitle}>Trình độ</Text>
        <View style={styles.levelRow}>
          {LEVEL_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.levelChip, level === opt.value && styles.levelChipActive]}
              onPress={() => setLevel(opt.value)}
            >
              <Text style={[styles.levelChipText, level === opt.value && styles.levelChipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <AuthInput
          label="Chủ đề (Category)"
          placeholder="vd: Lịch sử, Văn hóa..."
          value={category}
          onChangeText={setCategory}
        />

        <Text style={styles.sectionTitle}>Liên kết bài học (Game 2D)</Text>
        <View style={styles.lessonSelector}>
          <TouchableOpacity
            style={[styles.lessonChip, !lessonId && styles.lessonChipActive]}
            onPress={() => setLessonId('')}
          >
            <Text style={[styles.lessonChipText, !lessonId && styles.lessonChipTextActive]}>Không</Text>
          </TouchableOpacity>
          {lessons.filter((l: any) => l.status === 'Published').map((l: any) => (
            <TouchableOpacity
              key={l._id}
              style={[styles.lessonChip, lessonId === l._id && styles.lessonChipActive]}
              onPress={() => setLessonId(l._id)}
            >
              <Text style={[styles.lessonChipText, lessonId === l._id && styles.lessonChipTextActive]} numberOfLines={1}>{l.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>File đính kèm</Text>

        <TouchableOpacity style={styles.filePicker} onPress={pickThumbnail}>
          <Ionicons name="image-outline" size={24} color={Colors.light.gold} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.filePickerText}>Ảnh giao diện (bắt buộc)</Text>
            {thumbnail && <Text style={styles.fileName}>{thumbnail.name}</Text>}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filePicker} onPress={pickAudio}>
          <Ionicons name="musical-notes-outline" size={24} color={Colors.light.gold} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.filePickerText}>File Audio (bắt buộc)</Text>
            {audio && <Text style={styles.fileName}>{audio.name}</Text>}
          </View>
        </TouchableOpacity>

        <GoldButton
          title="Lưu Podcast"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: 60 },
  sectionTitle: {
    color: Colors.light.textMain,
    fontSize: FontSizes.md,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  levelRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  levelChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    backgroundColor: Colors.light.backgroundCard,
  },
  levelChipActive: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  levelChipText: { color: Colors.light.textMuted, fontSize: FontSizes.sm, fontWeight: '600' },
  levelChipTextActive: { color: Colors.light.backgroundDark },
  lessonSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  lessonChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    backgroundColor: Colors.light.backgroundCard,
    maxWidth: '47%',
  },
  lessonChipActive: { backgroundColor: Colors.light.gold, borderColor: Colors.light.goldDark },
  lessonChipText: { color: Colors.light.textMuted, fontSize: FontSizes.xs, fontWeight: '600' },
  lessonChipTextActive: { color: Colors.light.backgroundDark },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundCard,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    marginBottom: Spacing.sm,
  },
  filePickerText: {
    color: Colors.light.textMain,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  fileName: {
    color: Colors.light.textMuted,
    fontSize: FontSizes.xs,
    marginTop: 2,
    flex: 1,
  },
});
