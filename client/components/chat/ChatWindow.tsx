"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Message, ChatParticipant } from "@/types/chat";
import ChatBubble from "./ChatBubble";

interface ChatWindowProps {
  messages: Message[];
  recipient: ChatParticipant | null;
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  currentUserId: string;
  isOnline: boolean;
  onBack?: () => void;
  showBackButton?: boolean;
}

function getRoleBadge(role: string): string {
  switch (role) {
    case "teacher":
      return "Giáo viên";
    case "admin":
      return "Quản trị";
    case "staff":
      return "Nhân viên";
    default:
      return "Học viên";
  }
}

export default function ChatWindow({
  messages,
  recipient,
  isTyping,
  onSendMessage,
  onTyping,
  onStopTyping,
  onLoadMore,
  hasMore,
  isLoading,
  currentUserId,
  isOnline,
  onBack,
  showBackButton,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const prevScrollHeightRef = useRef(0);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (shouldAutoScrollRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "instant" });
    }
  }, [recipient?._id]);

  // Restore scroll position after loading older messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && prevScrollHeightRef.current > 0) {
      const newScrollHeight = container.scrollHeight;
      const diff = newScrollHeight - prevScrollHeightRef.current;
      if (diff > 0) {
        container.scrollTop = diff;
      }
      prevScrollHeightRef.current = 0;
    }
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if user scrolled near bottom
    const threshold = 100;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < threshold;

    // Load more messages when scrolling to top
    if (container.scrollTop < 50 && hasMore && !isLoading) {
      prevScrollHeightRef.current = container.scrollHeight;
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
    shouldAutoScrollRef.current = true;

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    onTyping();

    // Auto-resize textarea
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleBlur = () => {
    onStopTyping();
  };

  // Empty state
  if (!recipient) {
    return (
      <div className="chat-window-empty">
        <div className="chat-empty-state">
          <svg
            className="w-20 h-20 mx-auto mb-6 text-[#c9a15a]/20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-[#f0ddb7]/60 mb-2">
            Chọn một cuộc trò chuyện
          </h3>
          <p className="text-sm text-[#a37636]/50">
            Chọn cuộc trò chuyện từ danh sách bên trái để bắt đầu
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-window-header">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg hover:bg-[#c9a15a]/10 transition-colors mr-1 cursor-pointer"
            >
              <svg
                className="w-5 h-5 text-[#c9a15a]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <div className="relative flex-shrink-0">
            {recipient.avatar ? (
              <img
                src={recipient.avatar}
                alt={recipient.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-[#c9a15a]/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c9a15a] to-[#8b6914] flex items-center justify-center text-[#2a120b] font-bold text-sm">
                {recipient.name.charAt(0).toUpperCase()}
              </div>
            )}
            {isOnline && <span className="online-dot" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#f0ddb7]">
              {recipient.name}
            </h3>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] ${
                  isOnline ? "text-emerald-400" : "text-[#a37636]/60"
                }`}
              >
                {isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
              </span>
              <span className="chat-role-badge">
                {getRoleBadge(recipient.role)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        className="chat-messages"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {/* Load more indicator */}
        {isLoading && messages.length > 0 && (
          <div className="flex justify-center py-3">
            <div className="inline-flex items-center gap-2 text-[#a37636] text-xs">
              <svg
                className="w-4 h-4 animate-spin"
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
              Đang tải tin nhắn cũ...
            </div>
          </div>
        )}

        {/* Loading initial messages */}
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg
                className="w-8 h-8 mx-auto mb-2 animate-spin text-[#c9a15a]"
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
              <p className="text-sm text-[#a37636]">Đang tải tin nhắn...</p>
            </div>
          </div>
        )}

        {/* No messages yet */}
        {!isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#c9a15a]/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[#c9a15a]/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
              </div>
              <p className="text-sm text-[#a37636]/60">
                Gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện
              </p>
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, index) => {
          const senderId =
            typeof msg.sender === "string" ? msg.sender : msg.sender._id;
          const isOwn = senderId === currentUserId;

          // Show avatar for first message or when sender changes
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const prevSenderId = prevMsg
            ? typeof prevMsg.sender === "string"
              ? prevMsg.sender
              : prevMsg.sender._id
            : null;
          const showAvatar = !isOwn && senderId !== prevSenderId;

          return (
            <ChatBubble
              key={msg._id}
              message={msg}
              isOwn={isOwn}
              showAvatar={showAvatar}
            />
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="chat-bubble-row other">
            <div className="w-8" />
            <div className="chat-typing-indicator">
              <div className="typing-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="text-xs text-[#a37636] ml-2">đang nhập...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Nhập tin nhắn..."
            rows={1}
            className="chat-textarea"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="chat-send-btn"
            title="Gửi tin nhắn"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
