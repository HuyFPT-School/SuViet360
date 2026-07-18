"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { friendApi, type FriendEntry, type FriendRequest, type FriendUser } from "@/lib/friendApi";
import "../blog.css";

// SVG Icons
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const CogIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const UserPlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const UserCheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <polyline points="17 11 19 13 23 9" />
  </svg>
);

type ActiveTab = "home" | "requests" | "suggestions" | "all";

export default function FacebookFriendsPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const loadInitialData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [friendsRes, requestsRes, suggestionsRes] = await Promise.all([
        friendApi.getFriends(),
        friendApi.getRequests(),
        friendApi.getSuggestions(),
      ]);
      if (friendsRes.success) setFriends(friendsRes.data);
      if (requestsRes.success) setRequests(requestsRes.data);
      if (suggestionsRes.success) setSuggestions(suggestionsRes.data);
    } catch (err) {
      console.error("Failed to load friends page data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  // Debounced search for suggestions (only runs in suggestions tab)
  useEffect(() => {
    if (!user || activeTab !== "suggestions") return;
    
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
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, user, activeTab]);

  const handleAccept = async (friendshipId: string, name: string) => {
    setActionLoading((prev) => ({ ...prev, [friendshipId]: true }));
    try {
      const res = await friendApi.acceptRequest(friendshipId);
      if (res.success) {
        const accepted = requests.find((r) => r._id === friendshipId);
        setRequests((prev) => prev.filter((r) => r._id !== friendshipId));
        if (accepted) {
          setFriends((prev) => [
            ...prev,
            { friendshipId: accepted._id, user: accepted.requester },
          ]);
        }
        alert(`Đã đồng ý kết bạn với ${name}.`);
      }
    } catch (err) {
      console.error("Failed to accept request:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [friendshipId]: false }));
    }
  };

  const handleReject = async (friendshipId: string, name: string) => {
    setActionLoading((prev) => ({ ...prev, [friendshipId]: true }));
    try {
      const res = await friendApi.rejectRequest(friendshipId);
      if (res.success) {
        setRequests((prev) => prev.filter((r) => r._id !== friendshipId));
        alert(`Đã xóa lời mời kết bạn của ${name}.`);
      }
    } catch (err) {
      console.error("Failed to reject request:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [friendshipId]: false }));
    }
  };

  const handleSendRequest = async (userId: string, name: string) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await friendApi.sendRequest(userId);
      if (res.success) {
        setSuggestions((prev) => prev.filter((s) => s._id !== userId));
        alert(`Đã gửi lời mời kết bạn tới ${name}.`);
      }
    } catch (err) {
      console.error("Failed to send request:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleUnfriend = async (friendshipId: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn hủy kết bạn với ${name}?`)) return;
    
    setActionLoading((prev) => ({ ...prev, [friendshipId]: true }));
    try {
      const res = await friendApi.removeFriend(friendshipId);
      if (res.success) {
        setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
        alert(`Đã hủy kết bạn với ${name}.`);
      }
    } catch (err) {
      console.error("Failed to unfriend:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [friendshipId]: false }));
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-40">
        <svg className="w-12 h-12 animate-spin text-[#c9a15a]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-20 p-6 bg-[#fdf6e8]/95 border border-[#c7ab73] rounded-xl text-center shadow-lg">
        <h2 className="text-xl font-bold text-[#4a1f24] mb-3">Yêu cầu đăng nhập</h2>
        <p className="text-sm text-[#5c4a3d] mb-6">Vui lòng đăng nhập tài khoản để quản lý danh sách bạn bè.</p>
        <Link href="/login" className="blog-btn-gold">Đăng nhập ngay</Link>
      </div>
    );
  }

  // Filter friends list by name search if query exists (only in all friends tab)
  const filteredFriends = searchQuery.trim() && activeTab === "all"
    ? friends.filter(f => f.user.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : friends;

  return (
    <div className="blog-page">
      {/* Back Link */}
      <div className="mb-6">
        <Link href="/blog" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#c9a15a] hover:text-[#f0ddb7] transition">
          <BackIcon />
          Quay lại diễn đàn
        </Link>
      </div>

      <div className="blog-three-col-layout">
        {/* LEFT COLUMN: Facebook style Friends Sidebar */}
        <aside className="blog-sidebar blog-sidebar--left">
          <div className="blog-sidebar-section !p-0 overflow-hidden">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-[#c7ab73]/30 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[#4a1f24] tracking-tight">Bạn bè</h2>
              <button className="p-1.5 rounded-full hover:bg-[#c9a15a]/15 text-[#a37636] transition-colors" title="Cài đặt">
                <CogIcon />
              </button>
            </div>

            {/* Sidebar Navigation Menu */}
            <div className="p-2 space-y-1">
              <button
                onClick={() => { setActiveTab("home"); setSearchQuery(""); }}
                className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "home"
                    ? "bg-[#c9a15a]/20 text-[#4a1f24]"
                    : "text-[#5c4a3d] hover:bg-[#c9a15a]/8"
                }`}
              >
                <div className={`p-1.5 rounded-full ${activeTab === "home" ? "bg-[#c9a15a]/25 text-[#4a1f24]" : "bg-[#f5ebd3] text-[#a37636]"}`}>
                  <HomeIcon />
                </div>
                <span>Trang chủ bạn bè</span>
              </button>

              <button
                onClick={() => { setActiveTab("requests"); setSearchQuery(""); }}
                className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-lg text-sm font-bold transition-all justify-between ${
                  activeTab === "requests"
                    ? "bg-[#c9a15a]/20 text-[#4a1f24]"
                    : "text-[#5c4a3d] hover:bg-[#c9a15a]/8"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-1.5 rounded-full ${activeTab === "requests" ? "bg-[#c9a15a]/25 text-[#4a1f24]" : "bg-[#f5ebd3] text-[#a37636]"}`}>
                    <UserPlusIcon />
                  </div>
                  <span>Lời mời kết bạn</span>
                </div>
                {requests.length > 0 && (
                  <span className="bg-red-600 text-white text-xxs font-extrabold px-2 py-0.5 rounded-full">{requests.length}</span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab("suggestions"); setSearchQuery(""); }}
                className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "suggestions"
                    ? "bg-[#c9a15a]/20 text-[#4a1f24]"
                    : "text-[#5c4a3d] hover:bg-[#c9a15a]/8"
                }`}
              >
                <div className={`p-1.5 rounded-full ${activeTab === "suggestions" ? "bg-[#c9a15a]/25 text-[#4a1f24]" : "bg-[#f5ebd3] text-[#a37636]"}`}>
                  <SparklesIcon />
                </div>
                <span>Gợi ý kết bạn</span>
              </button>

              <button
                onClick={() => { setActiveTab("all"); setSearchQuery(""); }}
                className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "all"
                    ? "bg-[#c9a15a]/20 text-[#4a1f24]"
                    : "text-[#5c4a3d] hover:bg-[#c9a15a]/8"
                }`}
              >
                <div className={`p-1.5 rounded-full ${activeTab === "all" ? "bg-[#c9a15a]/25 text-[#4a1f24]" : "bg-[#f5ebd3] text-[#a37636]"}`}>
                  <UsersIcon />
                </div>
                <span>Tất cả bạn bè</span>
              </button>
            </div>
          </div>
        </aside>

        {/* RIGHT/CENTER CONTENT AREA: Grid lists based on active tab */}
        <main className="blog-main-feed">
          {loading ? (
            <div className="flex justify-center py-40">
              <svg className="w-10 h-10 animate-spin text-[#c9a15a]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* 1. HOME TAB: Shows Requests (first) and Suggestions (second) */}
              {activeTab === "home" && (
                <>
                  {/* Received Requests Grid */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold text-[#4a1f24]">Lời mời kết bạn</h3>
                      {requests.length > 0 && (
                        <button onClick={() => setActiveTab("requests")} className="text-xs font-bold text-[#c9a15a] hover:underline">
                          Xem tất cả ({requests.length})
                        </button>
                      )}
                    </div>
                    {requests.length === 0 ? (
                      <div className="p-6 text-center bg-[#fdf6e8]/90 border border-[#c7ab73]/30 rounded-xl">
                        <p className="text-xs text-[#5c4a3d]/70 font-medium">Không có lời mời kết bạn mới.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {requests.slice(0, 8).map((req) => (
                          <div key={req._id} className="bg-[#fdf6e8]/95 border border-[#c7ab73]/40 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
                            {/* Card Avatar Cover */}
                            <div className="w-full aspect-square bg-[#f5ebd3] relative flex items-center justify-center border-b border-[#c7ab73]/15">
                              {req.requester.avatar ? (
                                <img src={req.requester.avatar} alt={req.requester.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-3xl font-extrabold text-[#c7ab73]/60">{req.requester.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            {/* Card Body */}
                            <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
                              <div>
                                <h4 className="text-xs font-bold text-[#4a1f24] line-clamp-1" title={req.requester.name}>{req.requester.name}</h4>
                                <p className="text-xxs text-[#a37636] font-semibold mt-0.5">Cấp {req.requester.level} • {req.requester.role}</p>
                              </div>
                              <div className="space-y-1.5">
                                <button
                                  onClick={() => handleAccept(req._id, req.requester.name)}
                                  disabled={actionLoading[req._id]}
                                  className="w-full py-1.5 bg-[#c9a15a] text-[#fdf6e8] hover:bg-[#b9914a] rounded-lg text-xxs font-extrabold shadow-sm transition-colors"
                                >
                                  Xác nhận
                                </button>
                                <button
                                  onClick={() => handleReject(req._id, req.requester.name)}
                                  disabled={actionLoading[req._id]}
                                  className="w-full py-1.5 bg-[#f5ebd3] border border-[#c7ab73]/60 text-[#a37636] hover:bg-[#ebdcb9] rounded-lg text-xxs font-extrabold transition-colors"
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Suggestions Grid */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-[#4a1f24]">Những người bạn có thể biết</h3>
                    {suggestions.length === 0 ? (
                      <div className="p-6 text-center bg-[#fdf6e8]/90 border border-[#c7ab73]/30 rounded-xl">
                        <p className="text-xs text-[#5c4a3d]/70 font-medium">Hiện không có gợi ý kết bạn mới nào.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {suggestions.slice(0, 8).map((s) => (
                          <div key={s._id} className="bg-[#fdf6e8]/95 border border-[#c7ab73]/40 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
                            {/* Card Avatar Cover */}
                            <div className="w-full aspect-square bg-[#f5ebd3] relative flex items-center justify-center border-b border-[#c7ab73]/15">
                              {s.avatar ? (
                                <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-3xl font-extrabold text-[#c7ab73]/60">{s.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            {/* Card Body */}
                            <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
                              <div>
                                <h4 className="text-xs font-bold text-[#4a1f24] line-clamp-1" title={s.name}>{s.name}</h4>
                                <p className="text-xxs text-[#a37636] font-semibold mt-0.5">Cấp {s.level} • {s.role}</p>
                              </div>
                              <button
                                onClick={() => handleSendRequest(s._id, s.name)}
                                disabled={actionLoading[s._id]}
                                className="w-full py-1.5 bg-[#c9a15a] text-[#fdf6e8] hover:bg-[#b9914a] rounded-lg text-xxs font-extrabold shadow-sm transition-colors flex items-center justify-center gap-1"
                              >
                                <UserCheckIcon />
                                Thêm bạn bè
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* 2. REQUESTS TAB: Full list of received pending requests */}
              {activeTab === "requests" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-[#4a1f24]">Lời mời kết bạn ({requests.length})</h3>
                  {requests.length === 0 ? (
                    <div className="p-8 text-center bg-[#fdf6e8]/95 border border-[#c7ab73]/40 rounded-xl">
                      <p className="text-sm text-[#5c4a3d]/70 font-semibold">Bạn không có lời mời kết bạn nào đang chờ duyệt.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {requests.map((req) => (
                        <div key={req._id} className="bg-[#fdf6e8]/95 border border-[#c7ab73]/40 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
                          <div className="w-full aspect-square bg-[#f5ebd3] relative flex items-center justify-center border-b border-[#c7ab73]/15">
                            {req.requester.avatar ? (
                              <img src={req.requester.avatar} alt={req.requester.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-3xl font-extrabold text-[#c7ab73]/60">{req.requester.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-[#4a1f24] line-clamp-1">{req.requester.name}</h4>
                              <p className="text-xxs text-[#a37636] font-semibold mt-0.5">Cấp {req.requester.level} • {req.requester.role}</p>
                            </div>
                            <div className="space-y-1.5">
                              <button
                                onClick={() => handleAccept(req._id, req.requester.name)}
                                disabled={actionLoading[req._id]}
                                className="w-full py-1.5 bg-[#c9a15a] text-[#fdf6e8] hover:bg-[#b9914a] rounded-lg text-xxs font-extrabold shadow-sm transition-colors"
                              >
                                Xác nhận
                              </button>
                              <button
                                onClick={() => handleReject(req._id, req.requester.name)}
                                disabled={actionLoading[req._id]}
                                className="w-full py-1.5 bg-[#f5ebd3] border border-[#c7ab73]/60 text-[#a37636] hover:bg-[#ebdcb9] rounded-lg text-xxs font-extrabold transition-colors"
                              >
                                Xóa
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. SUGGESTIONS TAB: Full list of suggestions with search box */}
              {activeTab === "suggestions" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <h3 className="text-lg font-bold text-[#4a1f24]">Gợi ý kết bạn</h3>
                    {/* Search bar */}
                    <div className="relative w-64">
                      <input
                        type="text"
                        placeholder="Tìm kiếm người dùng..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#fdf6e8] border border-[#c7ab73] rounded-lg px-3 py-1.5 pl-8 text-xs text-[#2a2016] outline-none focus:border-[#c9a15a]"
                      />
                      <svg className="w-4 h-4 text-[#a37636] absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {loadingSuggestions ? (
                    <div className="flex justify-center py-20">
                      <svg className="w-8 h-8 animate-spin text-[#c9a15a]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="p-8 text-center bg-[#fdf6e8]/95 border border-[#c7ab73]/40 rounded-xl">
                      <p className="text-sm text-[#5c4a3d]/70 font-semibold">Không tìm thấy người dùng phù hợp.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {suggestions.map((s) => (
                        <div key={s._id} className="bg-[#fdf6e8]/95 border border-[#c7ab73]/40 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
                          <div className="w-full aspect-square bg-[#f5ebd3] relative flex items-center justify-center border-b border-[#c7ab73]/15">
                            {s.avatar ? (
                              <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-3xl font-extrabold text-[#c7ab73]/60">{s.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-[#4a1f24] line-clamp-1">{s.name}</h4>
                              <p className="text-xxs text-[#a37636] font-semibold mt-0.5">Cấp {s.level} • {s.role}</p>
                            </div>
                            <button
                              onClick={() => handleSendRequest(s._id, s.name)}
                              disabled={actionLoading[s._id]}
                              className="w-full py-1.5 bg-[#c9a15a] text-[#fdf6e8] hover:bg-[#b9914a] rounded-lg text-xxs font-extrabold shadow-sm transition-colors flex items-center justify-center gap-1"
                            >
                              <UserCheckIcon />
                              Thêm bạn bè
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. ALL FRIENDS TAB: Full list of current friends with search filter */}
              {activeTab === "all" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <h3 className="text-lg font-bold text-[#4a1f24]">Tất cả bạn bè ({friends.length})</h3>
                    {/* Search bar */}
                    <div className="relative w-64">
                      <input
                        type="text"
                        placeholder="Tìm bạn bè..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#fdf6e8] border border-[#c7ab73] rounded-lg px-3 py-1.5 pl-8 text-xs text-[#2a2016] outline-none focus:border-[#c9a15a]"
                      />
                      <svg className="w-4 h-4 text-[#a37636] absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {filteredFriends.length === 0 ? (
                    <div className="p-8 text-center bg-[#fdf6e8]/95 border border-[#c7ab73]/40 rounded-xl">
                      <p className="text-sm text-[#5c4a3d]/70 font-semibold">Không tìm thấy bạn bè nào phù hợp.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {filteredFriends.map((f) => (
                        <div key={f.friendshipId} className="bg-[#fdf6e8]/95 border border-[#c7ab73]/40 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
                          <div className="w-full aspect-square bg-[#f5ebd3] relative flex items-center justify-center border-b border-[#c7ab73]/15">
                            {f.user.avatar ? (
                              <img src={f.user.avatar} alt={f.user.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-3xl font-extrabold text-[#c7ab73]/60">{f.user.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-[#4a1f24] line-clamp-1">{f.user.name}</h4>
                              <p className="text-xxs text-[#a37636] font-semibold mt-0.5">Cấp {f.user.level} • {f.user.role}</p>
                            </div>
                            <button
                              onClick={() => handleUnfriend(f.friendshipId, f.user.name)}
                              disabled={actionLoading[f.friendshipId]}
                              className="w-full py-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100/50 rounded-lg text-xxs font-extrabold transition-colors shadow-sm"
                            >
                              Hủy kết bạn
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
