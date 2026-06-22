import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { chatApi } from '@/services/chatApi';
import type { ChatParticipant } from '@/types/chat';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { getTimeAgo, getRoleBadge } from '@/utils/format';
import OnlineDot from '@/components/ui/OnlineDot';
import UnreadBadge from '@/components/ui/UnreadBadge';

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const chat = useChat();
  const [searchText, setSearchText] = useState('');
  const [teacherResults, setTeacherResults] = useState<ChatParticipant[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (user) {
      chat.loadConversations();
    }
  }, [user]);

  const handleSearch = useCallback(async (text: string) => {
    setSearchText(text);
    if (text.length < 2) {
      setTeacherResults([]);
      setShowSearch(false);
      return;
    }
    setShowSearch(true);
    try {
      const teachers = await chatApi.getTeachers();
      setTeacherResults(
        teachers.filter((t) =>
          t.name.toLowerCase().includes(text.toLowerCase())
        )
      );
    } catch {
      // Silent fail
    }
  }, []);

  const startNewChat = useCallback(
    async (participant: ChatParticipant) => {
      try {
        const conversation = await chatApi.createConversation(participant._id);
        await chat.loadConversations();
        chat.selectConversation(conversation._id);
      } catch (err) {
        console.error('Failed to create conversation:', err);
      }
      setShowSearch(false);
      setSearchText('');
    },
    [chat]
  );

  const getRecipient = (conv: any): ChatParticipant | null => {
    if (!user) return null;
    return conv.participants?.find((p: any) => p._id !== user.id) || null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 Tin Nhắn</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm người dùng..."
          placeholderTextColor={Colors.light.textDim}
          value={searchText}
          onChangeText={handleSearch}
        />
      </View>

      {showSearch && teacherResults.length > 0 && (
        <View style={styles.searchResults}>
          {teacherResults.map((t) => (
            <TouchableOpacity
              key={t._id}
              style={styles.searchResultItem}
              onPress={() => startNewChat(t)}
            >
              <Text style={styles.searchResultName}>{t.name}</Text>
              <Text style={styles.searchResultRole}>{getRoleBadge(t.role)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={chat.conversations}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshing={chat.isLoadingConversations}
        onRefresh={chat.loadConversations}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Chưa có tin nhắn</Text>
            <Text style={styles.emptyDesc}>
              Tìm kiếm giáo viên để bắt đầu trò chuyện
            </Text>
          </View>
        }
        renderItem={({ item: conv }) => {
          const recipient = getRecipient(conv);
          if (!recipient) return null;
          const isOnline = chat.onlineUsers.includes(recipient._id);
          const unread = user ? conv.unreadCount[user.id] || 0 : 0;

          return (
            <TouchableOpacity
              style={[
                styles.convItem,
                conv._id === chat.activeConversationId && styles.convItemActive,
              ]}
              onPress={() => chat.selectConversation(conv._id)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {recipient.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <OnlineDot online={isOnline} />
              </View>
              <View style={styles.convInfo}>
                <View style={styles.convTop}>
                  <Text style={styles.convName} numberOfLines={1}>
                    {recipient.name}
                  </Text>
                  {conv.lastMessage && (
                    <Text style={styles.convTime}>
                      {getTimeAgo(conv.lastMessage.createdAt)}
                    </Text>
                  )}
                </View>
                <View style={styles.convBottom}>
                  <Text style={styles.convLastMsg} numberOfLines={1}>
                    {conv.lastMessage?.content || 'Chưa có tin nhắn'}
                  </Text>
                  <UnreadBadge count={unread} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.chatBg,
  },
  header: {
    backgroundColor: Colors.light.chatBgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.chatGlassBorder,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: Spacing.md,
    gap: 10,
  },
  headerTitle: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.light.chatGoldLight,
    letterSpacing: 1.5,
  },
  searchInput: {
    backgroundColor: 'rgba(13, 6, 7, 0.5)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.light.chatGlassBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: FontSizes.sm,
    color: Colors.light.chatGoldLight,
    fontFamily: 'Cormorant Garamond',
  },
  searchResults: {
    backgroundColor: Colors.light.chatBgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.chatGlassBorder,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
  },
  searchResultName: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.md,
    color: Colors.light.chatGoldLight,
    fontWeight: '600',
  },
  searchResultRole: {
    fontSize: FontSizes.xs,
    color: Colors.light.chatGold,
  },
  listContent: {
    paddingVertical: Spacing.sm,
    flexGrow: 1,
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginHorizontal: Spacing.sm,
    marginVertical: 2,
    borderRadius: BorderRadius.lg,
  },
  convItemActive: {
    backgroundColor: 'rgba(201, 161, 90, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.25)',
  },
  avatarContainer: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(201, 161, 90, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.light.chatGold,
  },
  convInfo: {
    flex: 1,
    gap: 4,
  },
  convTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convName: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.chatGoldLight,
    flex: 1,
  },
  convTime: {
    fontSize: FontSizes.xs,
    color: Colors.light.goldMuted,
  },
  convBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convLastMsg: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.sm,
    color: Colors.light.goldMuted,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.light.goldLight,
  },
  emptyDesc: {
    fontFamily: 'Cormorant Garamond',
    fontSize: FontSizes.md,
    color: Colors.light.goldMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
