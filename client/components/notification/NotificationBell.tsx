"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { notificationApi, NotificationItem } from "@/lib/notificationApi";
import { connectSocket, getSocket } from "@/lib/socketClient";

const BellIcon = () => (
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
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
);

const timeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return `${diffDays} ngày trước`;
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getNotifications(1, 5);
      if (res.success) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Setup real-time listener via Socket.io
    const socket = connectSocket();

    const handleNewNotification = () => {
      // Fetch latest notifications when notified of a new one
      fetchNotifications();
    };

    socket.on("new_notification", handleNewNotification);

    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await notificationApi.markAsRead(id);
      if (res.success) {
        // Update local list
        setNotifications((prev) =>
          prev.map((notif) => (notif._id === id ? { ...notif, isRead: true } : notif))
        );
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await notificationApi.markAllAsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-[#c9a15a] hover:bg-white/5 transition-colors focus:outline-none"
        title="Thông báo"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-gradient-to-br from-[#c9a15a] to-[#8b6914] text-[10px] font-bold text-[#0d0805] px-1 shadow-lg shadow-[#c9a15a]/30 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#fdfbf7] border border-[#e8d5b5] rounded-xl shadow-xl z-50 overflow-hidden backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8d5b5] bg-[#fcf8ef]">
            <h4 className="text-sm font-bold text-[#3a2312] tracking-wider uppercase font-display">Thông báo</h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#a84d28] hover:text-[#8f3f1e] font-semibold transition-colors"
              >
                Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#e8d5b5]/50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#8c6a34]">
                Không có thông báo mới nào.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`p-4 transition-colors hover:bg-[#f5e9d3]/40 ${
                    !notif.isRead ? "bg-[#f5e9d3]/20" : ""
                  }`}
                >
                  <Link
                    href={notif.link}
                    onClick={() => {
                      setIsOpen(false);
                      if (!notif.isRead) {
                        handleMarkAsRead(notif._id);
                      }
                    }}
                    className="block"
                  >
                    <div className="flex gap-2.5 items-start">
                      {/* Unread indicator */}
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#a84d28] mt-1.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold text-[#3a2312] truncate ${notif.isRead ? "" : "font-semibold"}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-[#5c4a3d] mt-1 leading-relaxed break-words font-medium">
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-[#8c6a34] block mt-1.5 font-medium">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="bg-[#fcf8ef] px-4 py-2.5 text-center border-t border-[#e8d5b5]">
            <Link
              href="/user/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-[#8c6a34] hover:text-[#a84d28] transition-colors"
            >
              Xem tất cả thông báo
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
