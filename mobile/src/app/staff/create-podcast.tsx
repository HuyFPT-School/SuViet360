import React, { useState } from 'react';
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

export default function CreatePodcastScreen() {
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  
  const [audioFile, setAudioFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAudioFile(result.assets[0]);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const pickThumbnail = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setThumbnailFile(result.assets[0]);
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
      if (level) formData.append('level', level.trim());
      if (category) formData.append('category', category.trim());
      
      if (audioFile) {
        formData.append('audioFile', {
          uri: audioFile.uri,
          name: audioFile.name || 'audio.mp3',
          type: audioFile.mimeType || 'audio/mpeg',
        } as any);
      }

      if (thumbnailFile) {
        formData.append('thumbnailFile', {
          uri: thumbnailFile.uri,
          name: thumbnailFile.name || 'thumbnail.png',
          type: thumbnailFile.mimeType || 'image/png',
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
          label="Mô tả"
          placeholder="Nhập mô tả..."
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <AuthInput
          label="Cấp độ (vd: Beginner)"
          placeholder="Nhập cấp độ..."
          value={level}
          onChangeText={setLevel}
        />
        <AuthInput
          label="Danh mục (vd: History)"
          placeholder="Nhập danh mục..."
          value={category}
          onChangeText={setCategory}
        />

        <Text style={styles.sectionTitle}>File đính kèm</Text>
        
        <TouchableOpacity style={styles.filePicker} onPress={pickAudio}>
          <Ionicons name="musical-notes-outline" size={24} color={Colors.light.gold} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.filePickerText}>File Audio</Text>
            {audioFile && <Text style={styles.fileName}>{audioFile.name}</Text>}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filePicker} onPress={pickThumbnail}>
          <Ionicons name="image-outline" size={24} color={Colors.light.gold} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.filePickerText}>Ảnh Thumbnail</Text>
            {thumbnailFile && <Text style={styles.fileName}>{thumbnailFile.name}</Text>}
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
