"use client";

import { useState, useEffect } from "react";
import { friendApi, type FriendEntry, type FriendRequest, type FriendUser } from "@/lib/friendApi";

// SVG Icons
const UserPlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/>
    <line x1="23" y1="11" x2="17" y2="11"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

interface FriendSidebarProps {
  user: any;
}

export default function FriendSidebar({ user }: FriendSidebarProps) {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (!user) {
      setFriends([]);
      setRequests([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const [friendsRes, requestsRes] = await Promise.all([
          friendApi.getFriends(),
          friendApi.getRequests(),
        ]);
        if (friendsRes.success) setFriends(friendsRes.data);
        if (requestsRes.success) setRequests(requestsRes.data);
      } catch (err) {
        console.error("Failed to load friend data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Debounced search for suggestions
  useEffect(() => {
    if (!user) return;
    
    const delayDebounce = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await friendApi.getSuggestions(searchQuery.trim());
        if (res.success) {
          setSuggestions(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, user]);

  const handleAccept = async (friendshipId: string) => {
    setActionLoading((prev) => ({ ...prev, [friendshipId]: true }));
    try {
      await friendApi.acceptRequest(friendshipId);
      // Move from requests to friends
      const accepted = requests.find((r) => r._id === friendshipId);
      setRequests((prev) => prev.filter((r) => r._id !== friendshipId));
      if (accepted) {
        setFriends((prev) => [
          ...prev,
          { friendshipId: accepted._id, user: accepted.requester },
        ]);
      }
    } catch (err) {
      console.error("Failed to accept request:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [friendshipId]: false }));
    }
  };

  const handleReject = async (friendshipId: string) => {
    setActionLoading((prev) => ({ ...prev, [friendshipId]: true }));
    try {
      await friendApi.rejectRequest(friendshipId);
      setRequests((prev) => prev.filter((r) => r._id !== friendshipId));
    } catch (err) {
      console.error("Failed to reject request:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [friendshipId]: false }));
    }
  };

  const handleSendRequest = async (userId: string) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      await friendApi.sendRequest(userId);
      setSuggestions((prev) => prev.filter((s) => s._id !== userId));
    } catch (err) {
      console.error("Failed to send request:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (!user) return null;

  return (
    <aside className="blog-sidebar blog-sidebar--right">
      {/* Friend Requests */}
      {requests.length > 0 && (
        <div className="blog-sidebar-section">
          <div className="blog-sidebar-header">
            <UserPlusIcon />
            <h3 className="blog-sidebar-title">Lời mời kết bạn</h3>
            <span className="blog-sidebar-badge">{requests.length}</span>
          </div>
          <div className="blog-sidebar-list">
            {requests.map((req) => (
              <div key={req._id} className="blog-sidebar-item blog-sidebar-item--request">
                <div className="blog-sidebar-item-avatar">
                  {req.requester.avatar ? (
                    <img src={req.requester.avatar} alt={req.requester.name} />
                  ) : (
                    <span>{req.requester.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="blog-sidebar-item-info">
                  <span className="blog-sidebar-item-name">{req.requester.name}</span>
                  <div className="blog-sidebar-request-actions">
                    <button
                      onClick={() => handleAccept(req._id)}
                      disabled={actionLoading[req._id]}
                      className="blog-sidebar-btn blog-sidebar-btn--accept"
                      title="Chấp nhận"
                    >
                      <CheckIcon />
                    </button>
                    <button
                      onClick={() => handleReject(req._id)}
                      disabled={actionLoading[req._id]}
                      className="blog-sidebar-btn blog-sidebar-btn--reject"
                      title="Từ chối"
                    >
                      <XIcon />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="blog-sidebar-section">
        <div className="blog-sidebar-header">
          <UsersIcon />
          <h3 className="blog-sidebar-title">Bạn bè</h3>
          {friends.length > 0 && (
            <span className="blog-sidebar-count">{friends.length}</span>
          )}
        </div>
        {loading ? (
          <p className="blog-sidebar-empty">Đang tải...</p>
        ) : friends.length === 0 ? (
          <p className="blog-sidebar-empty">Chưa có bạn bè nào.</p>
        ) : (
          <div className="blog-sidebar-list">
            {friends.slice(0, 8).map((f) => (
              <div key={f.friendshipId} className="blog-sidebar-item">
                <div className="blog-sidebar-item-avatar">
                  {f.user.avatar ? (
                    <img src={f.user.avatar} alt={f.user.name} />
                  ) : (
                    <span>{f.user.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="blog-sidebar-item-info">
                  <span className="blog-sidebar-item-name">{f.user.name}</span>
                  <span className="blog-sidebar-item-meta">Cấp {f.user.level}</span>
                </div>
              </div>
            ))}
            {friends.length > 8 && (
              <p className="blog-sidebar-more">+{friends.length - 8} bạn bè khác</p>
            )}
          </div>
        )}
      </div>

      {/* Suggestions and User Search */}
      <div className="blog-sidebar-section">
        <div className="blog-sidebar-header">
          <UserPlusIcon />
          <h3 className="blog-sidebar-title">Gợi ý & Tìm kiếm</h3>
        </div>

        {/* User Search Input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Tìm người dùng để kết bạn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f5ebd3]/60 border border-[#c7ab73]/50 rounded-lg px-3 py-1.5 text-xs text-[#2a2016] outline-none focus:border-[#c9a15a] placeholder:text-[#5c4a3d]/50"
          />
        </div>

        {loadingSuggestions ? (
          <p className="blog-sidebar-empty">Đang tìm kiếm...</p>
        ) : suggestions.length === 0 ? (
          <p className="blog-sidebar-empty">Không tìm thấy người dùng mới.</p>
        ) : (
          <div className="blog-sidebar-list">
            {suggestions.slice(0, 6).map((s) => (
              <div key={s._id} className="blog-sidebar-item blog-sidebar-item--suggestion">
                <div className="blog-sidebar-item-avatar">
                  {s.avatar ? (
                    <img src={s.avatar} alt={s.name} />
                  ) : (
                    <span>{s.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="blog-sidebar-item-info">
                  <span className="blog-sidebar-item-name">{s.name}</span>
                  <button
                    onClick={() => handleSendRequest(s._id)}
                    disabled={actionLoading[s._id]}
                    className="blog-sidebar-add-btn"
                  >
                    {actionLoading[s._id] ? "..." : "Kết bạn"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
