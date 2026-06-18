"use client";

import type { Message, ChatParticipant } from "@/types/chat";

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatBubble({
  message,
  isOwn,
  showAvatar,
}: ChatBubbleProps) {
  const sender =
    typeof message.sender === "object"
      ? (message.sender as ChatParticipant)
      : null;

  return (
    <div
      className={`chat-bubble-row ${isOwn ? "own" : "other"}`}
    >
      {/* Avatar for received messages */}
      {!isOwn && (
        <div className="flex-shrink-0 w-8">
          {showAvatar && sender ? (
            sender.avatar ? (
              <img
                src={sender.avatar}
                alt={sender.name}
                className="w-8 h-8 rounded-full object-cover border border-[#c9a15a]/20"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c9a15a]/60 to-[#8b6914]/60 flex items-center justify-center text-[#f0ddb7] text-xs font-bold">
                {sender.name.charAt(0).toUpperCase()}
              </div>
            )
          ) : (
            <div className="w-8" />
          )}
        </div>
      )}

      <div
        className={`chat-bubble ${isOwn ? "chat-bubble-own" : "chat-bubble-other"}`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <div
          className={`flex items-center gap-1.5 mt-1 ${
            isOwn ? "justify-end" : "justify-start"
          }`}
        >
          <span className="text-[10px] opacity-50">
            {formatTime(message.createdAt)}
          </span>
          {isOwn && (
            <span
              className={`text-[10px] ${
                message.readAt
                  ? "text-[#c9a15a]"
                  : "opacity-40"
              }`}
              title={message.readAt ? "Đã xem" : "Đã gửi"}
            >
              ✓✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
