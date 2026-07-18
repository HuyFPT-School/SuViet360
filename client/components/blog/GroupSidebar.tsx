"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { groupApi, type Group } from "@/lib/groupApi";

// SVG Icons
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const FriendsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const GroupIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
    <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
  </svg>
);

const SavedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
  </svg>
);

const CompassIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);

interface GroupSidebarProps {
  user: any;
  onCreateGroup: () => void;
}

export default function GroupSidebar({ user, onCreateGroup }: GroupSidebarProps) {
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMyGroups([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const res = await groupApi.getMyGroups();
        if (res.success) setMyGroups(res.data);
      } catch (err) {
        console.error("Failed to load groups:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <aside className="blog-sidebar blog-sidebar--left">
      <div className="blog-sidebar-section">
        {/* User profile (Facebook style) */}
        {user && (
          <Link href="/profile" className="fb-left-nav-item fb-left-nav-profile">
            <div className="fb-left-nav-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span>{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="fb-left-nav-text font-bold">{user.name}</span>
          </Link>
        )}

        {/* Main Navigation Links */}
        <div className="fb-left-nav-links">
          <Link href="/blog/friends" className="fb-left-nav-item">
            <div className="fb-left-nav-icon text-[#c9a15a]">
              <FriendsIcon />
            </div>
            <span className="fb-left-nav-text">Bạn bè</span>
          </Link>
          <Link href="/blog/groups" className="fb-left-nav-item">
            <div className="fb-left-nav-icon text-[#c9a15a]">
              <GroupIcon />
            </div>
            <span className="fb-left-nav-text">Nhóm</span>
          </Link>
          {user && (
            <Link href="/blog/my-posts" className="fb-left-nav-item">
              <div className="fb-left-nav-icon text-[#c9a15a]">
                <SavedIcon />
              </div>
              <span className="fb-left-nav-text">Đã lưu (Bài viết của tôi)</span>
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
