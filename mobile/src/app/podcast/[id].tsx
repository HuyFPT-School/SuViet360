import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import Ionicons from '@expo/vector-icons/Ionicons';
import { podcastApi } from '@/services/podcastApi';
import type { Podcast, PodcastNote, PodcastComment } from '@/types/podcast';
import { useAuth } from '@/hooks/useAuth';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { formatDuration, formatDate } from '@/utils/format';
import HeaderBar from '@/components/ui/HeaderBar';

export default function PodcastDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<PodcastComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [audioReady, setAudioReady] = useState(false);

  const player = useAudioPlayer(
    podcast?.audioUrl ? { uri: podcast.audioUrl } : null,
    { updateInterval: 500 }
  );
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status?.duration && status.duration > 0) {
      setAudioReady(true);
    }
  }, [status?.duration]);

  useEffect(() => {
    if (!id) return;
    loadPodcast();
    loadComments();
    return () => {
      player?.pause();
    };
  }, [id]);

  const loadPodcast = async () => {
    try {
      const data = await podcastApi.getById(id!);
      setPodcast(data.podcast);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const data = await podcastApi.getComments(id!);
      setComments(data.data || []);
    } catch {
      // Silent
    }
  };

  const togglePlayPause = useCallback(() => {
    if (!podcast?.audioUrl) return;
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [podcast?.audioUrl, player]);

  const addComment = async () => {
    if (!commentText.trim() || !user) return;
    try {
      await podcastApi.createComment(id!, commentText.trim());
      setCommentText('');
      loadComments();
    } catch {
      Alert.alert('Lỗi', 'Không thể gửi bình luận');
    }
  };

  const addNote = async () => {
    if (!noteText.trim() || !user) return;
    try {
      await podcastApi.createNote(id!, noteText.trim(), Math.floor(status?.currentTime || 0));
      setNoteText('');
      Alert.alert('Thành công', 'Đã lưu ghi chú');
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu ghi chú');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <HeaderBar title="Podcast" showBack />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      </View>
    );
  }

  if (error || !podcast) {
    return (
      <View style={styles.container}>
        <HeaderBar title="Podcast" showBack />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Không tìm thấy'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderBar title={podcast.title} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Player */}
        <View style={styles.playerCard}>
          <View style={styles.podcastIconLarge}>
            <Ionicons name="headset-outline" size={40} color={Colors.light.goldLight} />
          </View>
          <Text style={styles.podcastTitle}>{podcast.title}</Text>
          {podcast.description ? (
            <Text style={styles.podcastDesc}>{podcast.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            {podcast.category ? (
              <Text style={styles.metaTag}>{podcast.category}</Text>
            ) : null}
            {podcast.level ? (
              <Text style={styles.metaLevel}>{podcast.level}</Text>
            ) : null}
            <Text style={styles.metaDuration}>{formatDuration(podcast.duration)}</Text>
          </View>

          {podcast.audioUrl ? (
            <>
              <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
                <Ionicons
                  name={player.playing ? 'pause' : 'play'}
                  size={18}
                  color="#1a0a06"
                />
                <Text style={styles.playButtonText}>
                  {player.playing ? 'Tạm dừng' : 'Phát'}
                </Text>
              </TouchableOpacity>
              {status?.duration && status.duration > 0 && (
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${((status.currentTime || 0) / status.duration) * 100}%` },
                    ]}
                  />
                </View>
              )}
              <Text style={styles.timeText}>
                {formatDuration(status?.currentTime || 0)} / {formatDuration(status?.duration || 0)}
              </Text>
            </>
          ) : null}
        </View>

        {/* Notes */}
        {user && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="create-outline" size={22} color={Colors.light.text} />
              <Text style={styles.sectionTitle}>Ghi chú</Text>
            </View>
            <View style={styles.noteInputRow}>
              <TextInput
                style={styles.noteInput}
                placeholder="Ghi chú tại thời điểm này..."
                placeholderTextColor={Colors.light.textDim}
                value={noteText}
                onChangeText={setNoteText}
                multiline
              />
              <TouchableOpacity style={styles.noteButton} onPress={addNote}>
                <Text style={styles.noteButtonText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Comments */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.light.text} />
            <Text style={styles.sectionTitle}>Bình luận</Text>
          </View>
          {user && (
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Viết bình luận..."
                placeholderTextColor={Colors.light.textDim}
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity style={styles.commentButton} onPress={addComment}>
                <Text style={styles.commentButtonText}>Gửi</Text>
              </TouchableOpacity>
            </View>
          )}
          {comments.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có bình luận</Text>
          ) : (
            comments.map((c) => (
              <View key={c._id} style={styles.commentItem}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {c.userId?.name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.commentContent}>
                  <Text style={styles.commentAuthor}>{c.userId?.name || 'Ẩn danh'}</Text>
                  <Text style={styles.commentBody}>{c.content}</Text>
                  <Text style={styles.commentDate}>{formatDate(c.createdAt)}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorText: { fontFamily: 'Cormorant Garamond', fontSize: FontSizes.md, color: Colors.light.error },
  scrollContent: { paddingBottom: 40 },
  playerCard: {
    backgroundColor: Colors.light.backgroundDark,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.goldDark,
  },
  podcastIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(201, 161, 90, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(201, 161, 90, 0.3)',
  },
  podcastTitle: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.light.goldLight,
    textAlign: 'center',
  },
  podcastDesc: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.md,
    color: 'rgba(240, 221, 183, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  metaRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  metaTag: { fontSize: FontSizes.xs, color: Colors.light.gold, fontWeight: '600' },
  metaLevel: { fontSize: FontSizes.xs, color: Colors.light.textDim, fontStyle: 'italic' },
  metaDuration: { fontSize: FontSizes.xs, color: Colors.light.goldMuted },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.gold,
  },
  playButtonText: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: '#1a0a06',
    letterSpacing: 1,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.gold,
    borderRadius: 2,
  },
  timeText: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.sm,
    color: Colors.light.goldMuted,
  },
  section: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.panelBorder,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.light.text,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteInputRow: { gap: 8 },
  noteInput: {
    backgroundColor: Colors.light.panel,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: FontSizes.sm,
    color: Colors.light.text,
    minHeight: 60,
    fontFamily: 'Cormorant Garamond',
  },
  noteButton: {
    backgroundColor: Colors.light.gold,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-end',
  },
  noteButtonText: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#3a2312',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.light.panel,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: FontSizes.sm,
    color: Colors.light.text,
    fontFamily: 'Cormorant Garamond',
  },
  commentButton: {
    backgroundColor: Colors.light.gold,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
  },
  commentButtonText: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#3a2312',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.md,
    color: Colors.light.textMuted,
    fontStyle: 'italic',
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.panelBorder,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201, 161, 90, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.light.gold,
  },
  commentContent: { flex: 1, gap: 4 },
  commentAuthor: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.light.textInk,
    letterSpacing: 0.5,
  },
  commentBody: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.md,
    color: Colors.light.textMuted,
    lineHeight: 20,
  },
  commentDate: {
    fontSize: FontSizes.xs,
    color: Colors.light.textDim,
    fontStyle: 'italic',
  },
});
