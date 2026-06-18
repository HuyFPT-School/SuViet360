import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ChatState, Conversation, Message } from "@/types/chat";

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  onlineUsers: [],
  typingUsers: {},
  totalUnread: 0,
  isLoadingConversations: false,
  isLoadingMessages: false,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setConversations(state, action: PayloadAction<Conversation[]>) {
      state.conversations = action.payload;
    },

    setActiveConversation(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload;
    },

    addMessage(
      state,
      action: PayloadAction<{ conversationId: string; message: Message }>
    ) {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      const exists = state.messages[conversationId].some(
        (m) => m._id === message._id
      );
      if (!exists) {
        state.messages[conversationId].push(message);
      }
    },

    setMessages(
      state,
      action: PayloadAction<{ conversationId: string; messages: Message[] }>
    ) {
      const { conversationId, messages } = action.payload;
      state.messages[conversationId] = messages;
    },

    prependMessages(
      state,
      action: PayloadAction<{ conversationId: string; messages: Message[] }>
    ) {
      const { conversationId, messages } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = messages;
      } else {
        const existingIds = new Set(
          state.messages[conversationId].map((m) => m._id)
        );
        const newMessages = messages.filter((m) => !existingIds.has(m._id));
        state.messages[conversationId] = [
          ...newMessages,
          ...state.messages[conversationId],
        ];
      }
    },

    setOnlineUsers(state, action: PayloadAction<string[]>) {
      state.onlineUsers = action.payload;
    },

    addOnlineUser(state, action: PayloadAction<string>) {
      if (!state.onlineUsers.includes(action.payload)) {
        state.onlineUsers.push(action.payload);
      }
    },

    removeOnlineUser(state, action: PayloadAction<string>) {
      state.onlineUsers = state.onlineUsers.filter(
        (id) => id !== action.payload
      );
    },

    setTypingUser(
      state,
      action: PayloadAction<{ conversationId: string; userId: string }>
    ) {
      state.typingUsers[action.payload.conversationId] =
        action.payload.userId;
    },

    clearTypingUser(state, action: PayloadAction<string>) {
      state.typingUsers[action.payload] = null;
    },

    updateConversationLastMessage(
      state,
      action: PayloadAction<{
        conversationId: string;
        message: Message;
        currentUserId?: string;
      }>
    ) {
      const { conversationId, message, currentUserId } = action.payload;
      const conv = state.conversations.find((c) => c._id === conversationId);
      if (conv) {
        const senderId =
          typeof message.sender === "string"
            ? message.sender
            : message.sender._id;

        conv.lastMessage = {
          content: message.content,
          sender: senderId,
          createdAt: message.createdAt,
        };
        conv.updatedAt = message.createdAt;

        // Increment unread for all participants except sender
        if (
          currentUserId &&
          senderId !== currentUserId &&
          state.activeConversationId !== conversationId
        ) {
          conv.unreadCount[currentUserId] =
            (conv.unreadCount[currentUserId] || 0) + 1;
        }

        // Move conversation to top
        const idx = state.conversations.indexOf(conv);
        if (idx > 0) {
          state.conversations.splice(idx, 1);
          state.conversations.unshift(conv);
        }
      }
    },

    markConversationRead(
      state,
      action: PayloadAction<{ conversationId: string; userId: string }>
    ) {
      const conv = state.conversations.find(
        (c) => c._id === action.payload.conversationId
      );
      if (conv) {
        conv.unreadCount[action.payload.userId] = 0;
      }
    },

    setLoadingConversations(state, action: PayloadAction<boolean>) {
      state.isLoadingConversations = action.payload;
    },

    setLoadingMessages(state, action: PayloadAction<boolean>) {
      state.isLoadingMessages = action.payload;
    },

    computeTotalUnread(state, action: PayloadAction<string>) {
      const userId = action.payload;
      state.totalUnread = state.conversations.reduce((sum, conv) => {
        return sum + (conv.unreadCount[userId] || 0);
      }, 0);
    },

    markMessagesRead(
      state,
      action: PayloadAction<{ conversationId: string; readAt: string }>
    ) {
      const { conversationId, readAt } = action.payload;
      const msgs = state.messages[conversationId];
      if (msgs) {
        msgs.forEach((msg) => {
          if (!msg.readAt) {
            msg.readAt = readAt;
          }
        });
      }
    },
  },
});

export const {
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
} = chatSlice.actions;

export default chatSlice.reducer;
