import { api } from "@/lib/api";
import type { Conversation, Message, ChatParticipant } from "@/types/chat";

interface ApiResponse<T> {
  data: T;
}

export const chatApi = {
  async getConversations(): Promise<Conversation[]> {
    const res = await api.get<ApiResponse<Conversation[]>>(
      "/chat/conversations"
    );
    return res.data.data;
  },

  async createConversation(participantId: string): Promise<Conversation> {
    const csrfRes = await api.get<{ data: { csrfToken: string } }>(
      "/csrf-token"
    );
    const csrfToken = csrfRes.data.data.csrfToken;

    const res = await api.post<ApiResponse<Conversation>>(
      "/chat/conversations",
      { participantId },
      { headers: { "x-csrf-token": csrfToken } }
    );
    return res.data.data;
  },

  async getMessages(
    conversationId: string,
    before?: string
  ): Promise<Message[]> {
    const params = before ? { before } : {};
    const res = await api.get<ApiResponse<Message[]>>(
      `/chat/conversations/${conversationId}/messages`,
      { params }
    );
    return res.data.data;
  },

  async getTeachers(): Promise<ChatParticipant[]> {
    const res = await api.get<ApiResponse<ChatParticipant[]>>("/chat/teachers");
    return res.data.data;
  },

  async getChatUsers(): Promise<ChatParticipant[]> {
    const res = await api.get<ApiResponse<ChatParticipant[]>>("/chat/users");
    return res.data.data;
  },
};
