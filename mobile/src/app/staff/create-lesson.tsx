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

export default function CreateLessonScreen() {
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tilemapFile, setTilemapFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [tilesetFiles, setTilesetFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [loading, setLoading] = useState(false);

  const pickTilemap = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setTilemapFile(result.assets[0]);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const pickTilesets = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setTilesetFiles([...tilesetFiles, ...result.assets]);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const removeTileset = (index: number) => {
    setTilesetFiles(tilesetFiles.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề và nội dung.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      
      if (tilemapFile) {
        formData.append('tilemapFile', {
          uri: tilemapFile.uri,
          name: tilemapFile.name || 'tilemap.json',
          type: tilemapFile.mimeType || 'application/json',
        } as any);
      }

      tilesetFiles.forEach((file, index) => {
        formData.append('tilesetFiles', {
          uri: file.uri,
          name: file.name || `tileset_${index}.png`,
          type: file.mimeType || 'image/png',
        } as any);
      });

      await adminApi.createLesson(formData);
      Alert.alert('Thành công', 'Đã tạo bài học.');
      router.back();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể tạo bài học.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageBackground style={styles.container}>
      <HeaderBar title="Tạo Bài Học" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AuthInput
          label="Tiêu đề"
          placeholder="Nhập tiêu đề..."
          value={title}
          onChangeText={setTitle}
        />
        <AuthInput
          label="Nội dung"
          placeholder="Nhập nội dung bài học..."
          value={content}
          onChangeText={setContent}
          multiline
        />

        <Text style={styles.sectionTitle}>File Game (Tùy chọn)</Text>
        
        <TouchableOpacity style={styles.filePicker} onPress={pickTilemap}>
          <Ionicons name="map-outline" size={24} color={Colors.light.gold} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.filePickerText}>Tilemap JSON</Text>
            {tilemapFile && <Text style={styles.fileName}>{tilemapFile.name}</Text>}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filePicker} onPress={pickTilesets}>
          <Ionicons name="images-outline" size={24} color={Colors.light.gold} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.filePickerText}>Thêm Tileset (Hình ảnh)</Text>
          </View>
        </TouchableOpacity>

        {tilesetFiles.map((file, idx) => (
          <View key={idx.toString()} style={styles.fileItem}>
            <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
            <TouchableOpacity onPress={() => removeTileset(idx)}>
              <Ionicons name="close-circle" size={20} color={Colors.light.error} />
            </TouchableOpacity>
          </View>
        ))}

        <GoldButton 
          title="Lưu Bài Học" 
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
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundCardAlt,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
  },
});
