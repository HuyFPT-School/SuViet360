"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { chatApi } from "@/lib/chatApi";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socketClient";
import type { Message } from "@/types/chat";
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
} from "@/store/features/chatSlice";

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

    socket.on("connect", () => {
      socket.emit("join", user.id);
    });

    socket.on("online_users", (data: { userIds: string[] }) => {
      dispatch(setOnlineUsers(data.userIds));
    });

    socket.on("user_online", (data: { userId: string }) => {
      dispatch(addOnlineUser(data.userId));
    });

    socket.on("user_offline", (data: { userId: string }) => {
      dispatch(removeOnlineUser(data.userId));
    });

    socket.on("new_message", (message: Message) => {
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

      // Clear typing indicator when message arrives
      dispatch(clearTypingUser(conversationId));
    });

    socket.on(
      "user_typing",
      (data: { conversationId: string; userId: string }) => {
        if (data.userId !== user.id) {
          dispatch(
            setTypingUser({
              conversationId: data.conversationId,
              userId: data.userId,
            })
          );
        }
      }
    );

    socket.on(
      "user_stop_typing",
      (data: { conversationId: string; userId: string }) => {
        if (data.userId !== user.id) {
          dispatch(clearTypingUser(data.conversationId));
        }
      }
    );

    socket.on(
      "messages_read",
      (data: { conversationId: string; readAt: string }) => {
        dispatch(
          markMessagesRead({
            conversationId: data.conversationId,
            readAt: data.readAt,
          })
        );
      }
    );

    return () => {
      socket.off("connect");
      socket.off("online_users");
      socket.off("user_online");
      socket.off("user_offline");
      socket.off("new_message");
      socket.off("user_typing");
      socket.off("user_stop_typing");
      socket.off("messages_read");
      disconnectSocket();
    };
  }, [user, dispatch]);

  // Auto mark as read when active conversation changes
  useEffect(() => {
    if (chatState.activeConversationId && user) {
      markAsRead(chatState.activeConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatState.activeConversationId]);

  const loadConversations = useCallback(async () => {
    dispatch(setLoadingConversations(true));
    try {
      const conversations = await chatApi.getConversations();
      dispatch(setConversations(conversations));
      if (user) {
        dispatch(computeTotalUnread(user.id));
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      dispatch(setLoadingConversations(false));
    }
  }, [dispatch, user]);

  const loadMessages = useCallback(
    async (conversationId: string, before?: string) => {
      dispatch(setLoadingMessages(true));
      try {
        const response = await chatApi.getMessages(conversationId, before);
        const { messages } = response;
        if (before) {
          dispatch(prependMessages({ conversationId, messages }));
        } else {
          dispatch(setMessages({ conversationId, messages }));
        }
        return messages;
      } catch (err) {
        console.error("Failed to load messages:", err);
        return [];
      } finally {
        dispatch(setLoadingMessages(false));
      }
    },
    [dispatch]
  );

  const sendMessage = useCallback(
    (conversationId: string, content: string) => {
      const socket = getSocket();
      if (!socket || !content.trim()) return;

      socket.emit("send_message", {
        conversationId,
        content: content.trim(),
      });

      // Stop typing when sending
      if (isTypingRef.current) {
        socket.emit("stop_typing", { conversationId });
        isTypingRef.current = false;
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    },
    []
  );

  const startTyping = useCallback((conversationId: string) => {
    const socket = getSocket();
    if (!socket) return;

    if (!isTypingRef.current) {
      socket.emit("typing", { conversationId });
      isTypingRef.current = true;
    }

    // Reset the timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(conversationId);
    }, 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    const socket = getSocket();
    if (!socket) return;

    if (isTypingRef.current) {
      socket.emit("stop_typing", { conversationId });
      isTypingRef.current = false;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  const markAsRead = useCallback(
    (conversationId: string) => {
      const socket = getSocket();
      if (!socket || !user) return;

      socket.emit("mark_read", { conversationId });
      dispatch(
        markConversationRead({ conversationId, userId: user.id })
      );
      dispatch(computeTotalUnread(user.id));
    },
    [dispatch, user]
  );

  const selectConversation = useCallback(
    async (conversationId: string) => {
      dispatch(setActiveConversation(conversationId));
      if (!chatState.messages[conversationId]) {
        await loadMessages(conversationId);
      }
      markAsRead(conversationId);
    },
    [dispatch, chatState.messages, loadMessages, markAsRead]
  );

  return {
    ...chatState,
    user,
    loadConversations,
    loadMessages,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    selectConversation,
    setActiveConversation: (id: string | null) =>
      dispatch(setActiveConversation(id)),
  };
};
