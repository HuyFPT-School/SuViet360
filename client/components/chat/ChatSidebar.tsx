"use client";

import { useState, useMemo, useEffect } from "react";
import type { Conversation, ChatParticipant } from "@/types/chat";
import type { User } from "@/types/auth";
import { chatApi } from "@/lib/chatApi";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (conversationId: string) => void;
  onNewConversation: (participant: ChatParticipant) => void;
  onlineUsers: string[];
  user: User;
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
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

export default function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNewConversation,
  onlineUsers,
  user,
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");
  const [allParticipants, setAllParticipants] = useState<ChatParticipant[]>([]);
  const [searchResults, setSearchResults] = useState<ChatParticipant[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load available participants on mount
  useEffect(() => {
    const loadParticipants = async () => {
      setIsSearching(true);
      try {
        const results =
          user.role === "user"
            ? await chatApi.getTeachers()
            : await chatApi.getChatUsers();
        setAllParticipants(results);
      } catch {
        setAllParticipants([]);
      } finally {
        setIsSearching(false);
      }
    };
    loadParticipants();
  }, [user.role]);

  // Filter participants when search query changes
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(allParticipants);
      return;
    }

    const filtered = allParticipants.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
    setSearchResults(filtered);
  }, [search, allParticipants]);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    return conversations.filter((conv) => {
      const other = conv.participants.find((p) => p._id !== user.id);
      return other?.name.toLowerCase().includes(search.toLowerCase());
    });
  }, [conversations, search, user.id]);

  const getOtherParticipant = (conv: Conversation): ChatParticipant => {
    return (
      conv.participants.find((p) => p._id !== user.id) || conv.participants[0]
    );
  };

  return (
    <div className="chat-sidebar">
      {/* Header */}
      <div className="chat-sidebar-header">
        <h2 className="text-lg font-bold text-[#f0ddb7] tracking-wide flex items-center gap-2">
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Tin nhắn
        </h2>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a37636]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              user.role === "user"
                ? "Tìm giáo viên..."
                : "Tìm học viên..."
            }
            className="w-full bg-[#1a0f0a]/60 border border-[#c9a15a]/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#f0ddb7] placeholder-[#a37636]/50 focus:outline-none focus:border-[#c9a15a]/50 focus:ring-1 focus:ring-[#c9a15a]/30 transition-all"
          />
        </div>
      </div>

      {/* Available participants - show when searching OR when no conversations exist */}
      {(() => {
        const newParticipants = searchResults.filter(
          (p) => !conversations.some((c) => c.participants.some((cp) => cp._id === p._id))
        );
        const shouldShow = newParticipants.length > 0 && (search.trim() || conversations.length === 0);
        if (!shouldShow) return null;
        return (
          <div className="px-3 pb-2">
            <p className="text-xs text-[#a37636] px-2 pb-2 font-medium uppercase tracking-wider">
              {user.role === "user" ? "Giáo viên" : "Học viên"} có thể trò chuyện
            </p>
            {newParticipants.map((participant) => (
              <button
                key={participant._id}
                onClick={() => {
                  onNewConversation(participant);
                  setSearch("");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#c9a15a]/10 transition-all cursor-pointer group"
              >
                <div className="relative flex-shrink-0">
                  {participant.avatar ? (
                    <img
                      src={participant.avatar}
                      alt={participant.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#c9a15a]/30"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c9a15a] to-[#8b6914] flex items-center justify-center text-[#2a120b] font-bold text-sm">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {onlineUsers.includes(participant._id) && (
                    <span className="online-dot" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-[#f0ddb7] group-hover:text-[#c9a15a] transition-colors">
                    {participant.name}
                  </p>
                  <span className="text-xs text-[#a37636]">
                    {getRoleBadge(participant.role)}
                  </span>
                </div>
                <svg
                  className="w-4 h-4 text-[#c9a15a] opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            ))}
          </div>
        );
      })()}

      {isSearching && (
        <div className="px-4 py-3 text-center">
          <div className="inline-flex items-center gap-2 text-[#a37636] text-sm">
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
            Đang tìm kiếm...
          </div>
        </div>
      )}

      {/* Conversations list */}
      <div className="chat-sidebar-list">
        {filteredConversations.length === 0 && !search.trim() && allParticipants.length === 0 && (
          <div className="px-4 py-8 text-center">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-[#a37636]/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm text-[#a37636]/60">
              Chưa có {user.role === "user" ? "giáo viên" : "học viên"} nào
            </p>
          </div>
        )}

        {filteredConversations.map((conv) => {
          const other = getOtherParticipant(conv);
          const isActive = conv._id === activeId;
          const unread = conv.unreadCount[user.id] || 0;
          const isOnline = onlineUsers.includes(other._id);

          return (
            <button
              key={conv._id}
              onClick={() => onSelect(conv._id)}
              className={`chat-conversation-item ${isActive ? "active" : ""}`}
            >
              <div className="relative flex-shrink-0">
                {other.avatar ? (
                  <img
                    src={other.avatar}
                    alt={other.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#c9a15a]/20"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c9a15a] to-[#8b6914] flex items-center justify-center text-[#2a120b] font-bold">
                    {other.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {isOnline && <span className="online-dot" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={`text-sm font-semibold truncate ${
                      isActive ? "text-[#c9a15a]" : "text-[#f0ddb7]"
                    }`}
                  >
                    {other.name}
                  </span>
                  {conv.lastMessage && (
                    <span className="text-[10px] text-[#a37636] flex-shrink-0 ml-2">
                      {getTimeAgo(conv.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#a37636] truncate max-w-[180px]">
                    {conv.lastMessage
                      ? conv.lastMessage.sender === user.id
                        ? `Bạn: ${conv.lastMessage.content}`
                        : conv.lastMessage.content
                      : "Bắt đầu trò chuyện..."}
                  </p>
                  {unread > 0 && (
                    <span className="unread-badge">{unread > 9 ? "9+" : unread}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
