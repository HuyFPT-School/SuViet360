export interface ChatParticipant {
  _id: string;
  name: string;
  avatar?: string;
  role: string;
}

export interface LastMessage {
  content: string;
  sender: string;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: ChatParticipant[];
  lastMessage: LastMessage | null;
  unreadCount: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: ChatParticipant | string;
  content: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  onlineUsers: string[];
  typingUsers: Record<string, string | null>;
  totalUnread: number;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
}
