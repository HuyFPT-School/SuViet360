"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { chatApi } from "@/lib/chatApi";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import type { ChatParticipant } from "@/types/chat";
import "./chat.css";

const MESSAGES_PER_PAGE = 30;

export default function ChatPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const chat = useChat();

  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // Responsive detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      chat.loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      setHasMoreMessages(true);
      await chat.selectConversation(conversationId);
      if (isMobile) {
        setShowSidebar(false);
      }
    },
    [chat, isMobile]
  );

  const handleNewConversation = useCallback(
    async (participant: ChatParticipant) => {
      try {
        const conversation = await chatApi.createConversation(participant._id);
        await chat.loadConversations();
        handleSelectConversation(conversation._id);
      } catch (err) {
        console.error("Failed to create conversation:", err);
      }
    },
    [chat, handleSelectConversation]
  );

  const handleSendMessage = useCallback(
    (content: string) => {
      if (chat.activeConversationId) {
        chat.sendMessage(chat.activeConversationId, content);
      }
    },
    [chat]
  );

  const handleTyping = useCallback(() => {
    if (chat.activeConversationId) {
      chat.startTyping(chat.activeConversationId);
    }
  }, [chat]);

  const handleStopTyping = useCallback(() => {
    if (chat.activeConversationId) {
      chat.stopTyping(chat.activeConversationId);
    }
  }, [chat]);

  const handleLoadMore = useCallback(async () => {
    if (!chat.activeConversationId) return;
    const msgs = chat.messages[chat.activeConversationId];
    if (!msgs || msgs.length === 0) return;

    const oldestMessage = msgs[0];
    const olderMessages = await chat.loadMessages(
      chat.activeConversationId,
      oldestMessage.createdAt
    );
    if (olderMessages.length < MESSAGES_PER_PAGE) {
      setHasMoreMessages(false);
    }
  }, [chat]);

  const handleBack = useCallback(() => {
    setShowSidebar(true);
    chat.setActiveConversation(null);
  }, [chat]);

  // Get active conversation data
  const activeConversation = chat.conversations.find(
    (c) => c._id === chat.activeConversationId
  );
  const recipient = activeConversation
    ? activeConversation.participants.find((p) => p._id !== user?.id) ||
      activeConversation.participants[0]
    : null;
  const activeMessages = chat.activeConversationId
    ? chat.messages[chat.activeConversationId] || []
    : [];
  const isRecipientTyping = chat.activeConversationId
    ? !!chat.typingUsers[chat.activeConversationId]
    : false;
  const isRecipientOnline = recipient
    ? chat.onlineUsers.includes(recipient._id)
    : false;

  // Loading state
  if (authLoading) {
    return (
      <div className="chat-page">
        <div className="flex items-center justify-center w-full">
          <div className="text-center">
            <svg
              className="w-10 h-10 mx-auto mb-3 animate-spin text-[#c9a15a]"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-sm text-[#a37636]">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <div
        className={`chat-sidebar ${
          isMobile && !showSidebar ? "hidden-mobile" : ""
        }`}
      >
        <ChatSidebar
          conversations={chat.conversations}
          activeId={chat.activeConversationId}
          onSelect={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onlineUsers={chat.onlineUsers}
          user={user}
        />
      </div>

      {/* Chat Window */}
      <div
        className={`chat-window ${
          isMobile && showSidebar ? "hidden-mobile" : ""
        }`}
      >
        <ChatWindow
          messages={activeMessages}
          recipient={recipient}
          isTyping={isRecipientTyping}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          onStopTyping={handleStopTyping}
          onLoadMore={handleLoadMore}
          hasMore={hasMoreMessages}
          isLoading={chat.isLoadingMessages}
          currentUserId={user.id}
          isOnline={isRecipientOnline}
          onBack={handleBack}
          showBackButton={isMobile}
        />
      </div>
    </div>
  );
}
