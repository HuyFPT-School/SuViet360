"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { groupApi, type Group } from "@/lib/groupApi";
import CreateGroupModal from "@/components/blog/CreateGroupModal";
import "../blog.css";

// SVG Icons
const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
  </svg>
);
const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

export default function GroupDiscoveryPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const loadGroups = async (keyword?: string) => {
    setLoading(true);
    try {
      const res = await groupApi.getPublicGroups(keyword);
      if (res.success) {
        setGroups(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups(search);
  }, [search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleJoin = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert("Vui lòng đăng nhập để tham gia nhóm.");
      return;
    }
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await groupApi.joinGroup(id);
      alert("Đã tham gia nhóm thành công!");
      loadGroups(search);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="blog-page">
      {/* Back to Blog */}
      <Link href="/blog" className="flex items-center gap-2 text-sm text-[#c9a15a] mb-6 hover:underline">
        <ArrowLeftIcon />
        Quay lại Diễn đàn
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-[#c7ab73]/30 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-[#2a2016] mb-2">Khám phá các nhóm thảo luận</h1>
          <p className="text-sm text-[#5c4a3d]">Tham gia cùng cộng đồng thảo luận lịch sử chuyên sâu.</p>
        </div>

        {user && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-[#1f0a0d] text-[#f0ddb7] border border-[#1f0a0d] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#3d1c21] transition-all cursor-pointer"
          >
            <PlusIcon />
            Tạo nhóm mới
          </button>
        )}
      </div>

      {/* Search Filter */}
      <div className="mb-8">
        <form onSubmit={handleSearchSubmit} className="blog-search-wrapper max-w-lg">
          <span className="blog-search-icon">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm nhóm..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="blog-search-input"
          />
        </form>
      </div>

      {/* Group Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="text-center text-[#c9a15a]">Đang tải danh sách nhóm...</div>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-[#fdf6e8] border border-[#c7ab73] rounded-xl p-12 text-center text-[#8c6a34] text-sm shadow-sm">
          Chưa tìm thấy nhóm thảo luận nào phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => {
            const isMember = group.members.some((m: any) => (m.user?._id || m.user) === user?.id);
            return (
              <Link
                key={group._id}
                href={`/blog/groups/${group._id}`}
                className="bg-[#fdf6e8] border-2 border-[#c7ab73] rounded-xl p-5 flex flex-col justify-between hover:border-[#c9a15a] hover:scale-[1.01] transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-amber-250 border border-[#c9a15a] flex items-center justify-center font-bold text-[#8c6a34] text-lg flex-shrink-0">
                      {group.avatar ? (
                        <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
                      ) : (
                        group.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[#8c6a34] font-bold uppercase tracking-wider">
                      <GlobeIcon />
                      Công khai
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#2a2016] mb-2 line-clamp-1">{group.name}</h3>
                  <p className="text-xs text-[#5c4a3d] line-clamp-3 mb-4 leading-relaxed">
                    {group.description || "Chưa có mô tả chi tiết về nhóm thảo luận này."}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-amber-100 mt-auto">
                  <span className="flex items-center gap-1 text-xs text-[#8c6a34] font-semibold">
                    <UsersIcon />
                    {group.memberCount} thành viên
                  </span>

                  {isMember ? (
                    <span className="text-xs text-[#16a34a] font-bold">✓ Đã tham gia</span>
                  ) : (
                    <button
                      onClick={(e) => handleJoin(e, group._id)}
                      disabled={actionLoading[group._id]}
                      className="bg-[#1f0a0d] hover:bg-[#3d1c21] text-[#f0ddb7] font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      {actionLoading[group._id] ? "..." : "Tham gia"}
                    </button>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => loadGroups(search)}
        />
      )}
    </div>
  );
}
