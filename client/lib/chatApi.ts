import { api } from "@/lib/api";
import type { Conversation, Message, ChatParticipant } from "@/types/chat";

interface ApiResponse<T> {
  data: T;
}

export const chatApi = {
  async getConversations(): Promise<Conversation[]> {
    const res = await api.get<ApiResponse<{ conversations: Conversation[] }>>(
      "/chat/conversations"
    );
    return res.data.data.conversations;
  },

  async createConversation(participantId: string): Promise<Conversation> {
    const csrfRes = await api.get<{ data: { csrfToken: string } }>(
      "/csrf-token"
    );
    const csrfToken = csrfRes.data.data.csrfToken;

    const res = await api.post<ApiResponse<{ conversation: Conversation }>>(
      "/chat/conversations",
      { participantId },
      { headers: { "x-csrf-token": csrfToken } }
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
    const res = await api.get<ApiResponse<{ teachers: ChatParticipant[] }>>("/chat/teachers");
    return res.data.data.teachers;
  },

  async getChatUsers(): Promise<ChatParticipant[]> {
    const res = await api.get<ApiResponse<{ users: ChatParticipant[] }>>("/chat/users");
    return res.data.data.users;
  },

  async sendMessage(conversationId: string, content: string): Promise<Message> {
    const csrfRes = await api.get<{ data: { csrfToken: string } }>(
      "/csrf-token"
    );
    const csrfToken = csrfRes.data.data.csrfToken;

    const res = await api.post<ApiResponse<{ message: Message }>>(
      `/chat/conversations/${conversationId}/messages`,
      { content },
      { headers: { "x-csrf-token": csrfToken } }
    );
    return res.data.data.message;
  },
};

