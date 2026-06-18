"use client";

import Link from "next/link";
import { useAppSelector } from "@/store";
import { useAuth } from "@/hooks/useAuth";

export default function ChatNavBadge() {
  const { user } = useAuth();
  const totalUnread = useAppSelector((state) => state.chat.totalUnread);

  if (!user || user.role === "admin" || user.role === "staff") {
    return null;
  }

  return (
    <Link
      href="/chat"
      className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
      title="Tin nhắn"
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
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      {totalUnread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-gradient-to-br from-[#c9a15a] to-[#8b6914] text-[10px] font-bold text-[#0d0805] px-1 shadow-lg shadow-[#c9a15a]/30">
          {totalUnread > 9 ? "9+" : totalUnread}
        </span>
      )}
    </Link>
  );
}
