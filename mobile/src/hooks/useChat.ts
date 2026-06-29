import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { chatApi } from '@/services/chatApi';
import { connectSocket, disconnectSocket, getSocket } from '@/services/socketClient';
import type { Message } from '@/types/chat';
import {
  setConversations,
  setActiveConversation,
  addMessage,
  setMessages,
  prependMessages,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  setTypingUser,
  clearTypingUser,
  updateConversationLastMessage,
  markConversationRead,
  setLoadingConversations,
  setLoadingMessages,
  computeTotalUnread,
  markMessagesRead,
} from '@/store/features/chatSlice';

export const useChat = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const chatState = useAppSelector((state) => state.chat);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Initialize socket and register event listeners
  useEffect(() => {
    if (!user) return;

    const socket = connectSocket();

    socket.on('connect', () => {
      socket.emit('join', user.id);
    });

    socket.on('online_users', (data: { userIds: string[] }) => {
      dispatch(setOnlineUsers(data.userIds));
    });

    socket.on('user_online', (data: { userId: string }) => {
      dispatch(addOnlineUser(data.userId));
    });

    socket.on('user_offline', (data: { userId: string }) => {
      dispatch(removeOnlineUser(data.userId));
    });

    socket.on('new_message', (message: Message) => {
      const conversationId = message.conversation;
      dispatch(addMessage({ conversationId, message }));
      dispatch(
        updateConversationLastMessage({
          conversationId,
          message,
          currentUserId: user.id,
        })
      );
      dispatch(computeTotalUnread(user.id));
      dispatch(clearTypingUser(conversationId));
    });

    socket.on('user_typing', (data: { conversationId: string; userId: string }) => {
      if (data.userId !== user.id) {
        dispatch(setTypingUser({ conversationId: data.conversationId, userId: data.userId }));
      }
    });

    socket.on('user_stop_typing', (data: { conversationId: string; userId: string }) => {
      if (data.userId !== user.id) {
        dispatch(clearTypingUser(data.conversationId));
      }
    });

    socket.on('messages_read', (data: { conversationId: string; readAt: string }) => {
      dispatch(markConversationRead({ conversationId: data.conversationId, userId: user.id }));
    });

    return () => {
      disconnectSocket();
    };
  }, [user, dispatch]);

  const loadConversations = useCallback(async () => {
    dispatch(setLoadingConversations(true));
    try {
      const conversations = await chatApi.getConversations();
      dispatch(setConversations(conversations));
      if (user) {
        dispatch(computeTotalUnread(user.id));
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      dispatch(setLoadingConversations(false));
    }
  }, [dispatch, user]);

  const selectConversation = useCallback(
    async (conversationId: string) => {
      dispatch(setActiveConversation(conversationId));
      dispatch(setLoadingMessages(true));

      try {
        const data = await chatApi.getMessages(conversationId);
        dispatch(setMessages({ conversationId, messages: data.messages }));
        if (user) {
          dispatch(markConversationRead({ conversationId, userId: user.id }));
          dispatch(computeTotalUnread(user.id));

          // Mark messages as read via socket
          const unreadIds = data.messages
            .filter(
              (m) =>
                (typeof m.sender === 'string' ? m.sender : m.sender._id) !== user.id && !m.readAt
            )
            .map((m) => m._id);

          if (unreadIds.length > 0) {
            const socket = getSocket();
            if (socket) {
              socket.emit('mark_read', { conversationId, messageIds: unreadIds });
            }
          }
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        dispatch(setLoadingMessages(false));
      }
    },
    [dispatch, user]
  );

  const loadMoreMessages = useCallback(
    async (conversationId: string) => {
      const messages = chatState.messages[conversationId];
      if (!messages || messages.length === 0) return;

      const oldestMessage = messages[0];
      try {
        const data = await chatApi.getMessages(conversationId, oldestMessage.createdAt);
        if (data.messages.length > 0) {
          dispatch(prependMessages({ conversationId, messages: data.messages }));
        }
        return data.hasMore;
      } catch (error) {
        console.error('Failed to load more messages:', error);
        return false;
      }
    },
    [chatState.messages, dispatch]
  );

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (!content.trim()) return;

      try {
        const message = await chatApi.sendMessage(conversationId, content.trim());
        dispatch(addMessage({ conversationId, message }));
        dispatch(
          updateConversationLastMessage({
            conversationId,
            message,
            currentUserId: user?.id || '',
          })
        );

        // Emit via socket
        const socket = getSocket();
        if (socket) {
          socket.emit('send_message', { conversationId, message });
        }
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    [dispatch, user]
  );

  const handleTyping = useCallback(
    (conversationId: string) => {
      const socket = getSocket();
      if (!socket) return;

      if (!isTypingRef.current) {
        isTypingRef.current = true;
        socket.emit('typing', { conversationId });
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        socket.emit('stop_typing', { conversationId });
      }, 2000);
    },
    []
  );

  const handleStopTyping = useCallback((conversationId: string) => {
    const socket = getSocket();
    if (socket && isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit('stop_typing', { conversationId });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  return {
    ...chatState,
    loadConversations,
    selectConversation,
    loadMoreMessages,
    sendMessage,
    handleTyping,
    handleStopTyping,
  };
};
