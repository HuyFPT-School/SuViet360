import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput } from 'react-native';
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
  const [spawnX, setSpawnX] = useState('100');
  const [spawnY, setSpawnY] = useState('100');
  const [tilemapFile, setTilemapFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [tilesetFiles, setTilesetFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [tilesetNames, setTilesetNames] = useState<string[]>([]);
  const [idleSprites, setIdleSprites] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [runSprites, setRunSprites] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
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
        const newNames = result.assets.map(f => {
          const parts = f.name.split('.');
          parts.pop();
          return parts.join('.');
        });
        setTilesetFiles([...tilesetFiles, ...result.assets]);
        setTilesetNames([...tilesetNames, ...newNames]);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const removeTileset = (index: number) => {
    setTilesetFiles(tilesetFiles.filter((_, i) => i !== index));
    setTilesetNames(tilesetNames.filter((_, i) => i !== index));
  };

  const pickIdleSprites = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIdleSprites(result.assets);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const pickRunSprites = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setRunSprites(result.assets);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề và nội dung.');
      return;
    }
    if (!tilemapFile) {
      Alert.alert('Lỗi', 'Cần tải lên file Tilemap JSON.');
      return;
    }
    if (tilesetFiles.length === 0) {
      Alert.alert('Lỗi', 'Cần ít nhất 1 ảnh tileset.');
      return;
    }
    if (tilesetNames.length !== tilesetFiles.length) {
      Alert.alert('Lỗi', 'Số tileset name phải khớp với số ảnh tileset.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      formData.append('spawnPoint[x]', spawnX.trim());
      formData.append('spawnPoint[y]', spawnY.trim());

      formData.append('tilemapJson', {
        uri: tilemapFile.uri,
        name: tilemapFile.name || 'tilemap.json',
        type: tilemapFile.mimeType || 'application/json',
      } as any);

      tilesetFiles.forEach((file, index) => {
        formData.append('tilesets', {
          uri: file.uri,
          name: file.name || `tileset_${index}.png`,
          type: file.mimeType || 'image/png',
        } as any);
      });
      formData.append('tilesetNames', JSON.stringify(tilesetNames));

      idleSprites.forEach((file, index) => {
        formData.append('idleSprites', {
          uri: file.uri,
          name: file.name || `idle_${index}.png`,
          type: file.mimeType || 'image/png',
        } as any);
      });

      runSprites.forEach((file, index) => {
        formData.append('runSprites', {
          uri: file.uri,
          name: file.name || `run_${index}.png`,
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <AuthInput label="Spawn X" placeholder="100" value={spawnX} onChangeText={setSpawnX} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <AuthInput label="Spawn Y" placeholder="100" value={spawnY} onChangeText={setSpawnY} keyboardType="numeric" />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Tilemap JSON (bắt buộc)</Text>
        <TouchableOpacity style={styles.filePicker} onPress={pickTilemap}>
          <Ionicons name="map-outline" size={24} color={Colors.light.gold} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.filePickerText}>Chọn file JSON</Text>
            {tilemapFile && <Text style={styles.fileName}>{tilemapFile.name}</Text>}
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Tileset Images (bắt buộc)</Text>
        {tilesetFiles.map((file, idx) => (
          <View key={idx.toString()} style={styles.tilesetRow}>
            <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
            <TextInput
              style={styles.tilesetNameInput}
              value={tilesetNames[idx] || ''}
              onChangeText={(v) => {
                const n = [...tilesetNames];
                n[idx] = v;
                setTilesetNames(n);
              }}
              placeholder="Tên tileset"
              placeholderTextColor={Colors.light.textDim}
            />
            <TouchableOpacity onPress={() => removeTileset(idx)}>
              <Ionicons name="close-circle" size={20} color={Colors.light.error} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={pickTilesets}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.light.gold} />
          <Text style={styles.addBtnText}>Thêm tileset</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Nhân vật (Tùy chọn)</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.subLabel}>Idle Sprites</Text>
            <TouchableOpacity style={styles.filePicker} onPress={pickIdleSprites}>
              <Ionicons name="image-outline" size={20} color={Colors.light.gold} />
              <Text style={styles.filePickerText}>{idleSprites.length > 0 ? `${idleSprites.length} files` : 'Chọn...'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.subLabel}>Run Sprites</Text>
            <TouchableOpacity style={styles.filePicker} onPress={pickRunSprites}>
              <Ionicons name="image-outline" size={20} color={Colors.light.gold} />
              <Text style={styles.filePickerText}>{runSprites.length > 0 ? `${runSprites.length} files` : 'Chọn...'}</Text>
            </TouchableOpacity>
          </View>
        </View>

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
  row: { flexDirection: 'row', gap: 12 },
  sectionTitle: {
    color: Colors.light.textMain,
    fontSize: FontSizes.md,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  subLabel: {
    color: Colors.light.textMain,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginBottom: 4,
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
    color: Colors.light.textMuted,
    fontSize: FontSizes.sm,
  },
  fileName: {
    color: Colors.light.textMuted,
    fontSize: FontSizes.xs,
    marginTop: 2,
    flex: 1,
  },
  tilesetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.backgroundCardAlt || '#fef9e7',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
  },
  tilesetNameInput: {
    flex: 1,
    color: Colors.light.textMain,
    fontSize: FontSizes.xs,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: Spacing.sm,
  },
  addBtnText: {
    color: Colors.light.gold,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
});
