import { api, ensureCsrfToken } from './api';
import type { Conversation, Message, ChatParticipant } from '@/types/chat';

interface ApiResponse<T> {
  data: T;
}

export const chatApi = {
  async getConversations(): Promise<Conversation[]> {
    const res = await api.get<ApiResponse<{ conversations: Conversation[] }>>(
      '/chat/conversations'
    );
    return res.data.data.conversations;
  },

  async createConversation(participantId: string): Promise<Conversation> {
    const token = await ensureCsrfToken();
    const res = await api.post<ApiResponse<{ conversation: Conversation }>>(
      '/chat/conversations',
      { participantId },
      { headers: { 'x-csrf-token': token } }
    );
    return res.data.data.conversation;
  },

  async getMessages(
    conversationId: string,
    before?: string
  ): Promise<{ messages: Message[]; hasMore: boolean; nextCursor: string | null }> {
    const params = before ? { before } : {};
    const res = await api.get<ApiResponse<{ messages: Message[]; hasMore: boolean; nextCursor: string | null }>>(
      `/chat/conversations/${conversationId}/messages`,
      { params }
    );
    return res.data.data;
  },

  async getTeachers(): Promise<ChatParticipant[]> {
    const res = await api.get<ApiResponse<{ teachers: ChatParticipant[] }>>('/chat/teachers');
    return res.data.data.teachers;
  },

  async getChatUsers(): Promise<ChatParticipant[]> {
    const res = await api.get<ApiResponse<{ users: ChatParticipant[] }>>('/chat/users');
    return res.data.data.users;
  },

  async sendMessage(conversationId: string, content: string): Promise<Message> {
    const token = await ensureCsrfToken();
    const res = await api.post<ApiResponse<{ message: Message }>>(
      `/chat/conversations/${conversationId}/messages`,
      { content },
      { headers: { 'x-csrf-token': token } }
    );
    return res.data.data.message;
  },
};
