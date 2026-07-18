"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { blogApi } from "@/lib/blogApi";
import type { BlogPost } from "@/types/blog";
import GroupSidebar from "@/components/blog/GroupSidebar";
import FriendSidebar from "@/components/blog/FriendSidebar";
import CreateGroupModal from "@/components/blog/CreateGroupModal";
import "./blog.css";

const CATEGORIES = [
  "Tất cả",
  "Chủ đề chung",
  "Lịch sử cổ đại",
  "Lịch sử trung đại",
  "Lịch sử cận đại",
  "Lịch sử hiện đại",
  "Nhân vật lịch sử",
  "Di tích & Văn hóa",
  "Tài liệu tham khảo"
];

export default function BlogFeedPage() {
  const { user } = useAuth();
  
  // Feed states
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Chủ đề chung");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Group modal
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupRefreshKey, setGroupRefreshKey] = useState(0);

  // Fetch posts helper
  const fetchPosts = useCallback(async (pageNum: number, cat: string, searchVal: string) => {
    setLoading(true);
    try {
      const activeCat = cat === "Tất cả" ? undefined : cat;
      const activeSearch = searchVal.trim() || undefined;
      const res = await blogApi.getPublishedPosts(pageNum, 10, activeCat, activeSearch);
      if (res.success) {
        setPosts(res.data);
        setPage(res.pagination.page);
        setTotalPages(res.pagination.pages);
      }
    } catch (err) {
      console.error("Failed to fetch blog posts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on filters change
  useEffect(() => {
    fetchPosts(1, category, search);
  }, [category, search, fetchPosts]);

  // Search handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  // Image select helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (selectedFiles.length + filesArray.length > 3) {
        alert("Bạn chỉ được đính kèm tối đa 3 ảnh!");
        return;
      }

      // Check size limit: 5MB
      for (const file of filesArray) {
        if (file.size > 5 * 1024 * 1024) {
          alert(`File ${file.name} vượt quá dung lượng cho phép (5MB)!`);
          return;
        }
      }

      const updatedFiles = [...selectedFiles, ...filesArray];
      setSelectedFiles(updatedFiles);

      // Create previews
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPreviews([...previews, ...newPreviews]);
    }
  };

  const removeSelectedFile = (index: number) => {
    const updatedFiles = [...selectedFiles];
    updatedFiles.splice(index, 1);
    setSelectedFiles(updatedFiles);

    const updatedPreviews = [...previews];
    // Revoke URL to prevent memory leaks
    URL.revokeObjectURL(updatedPreviews[index]);
    updatedPreviews.splice(index, 1);
    setPreviews(updatedPreviews);
  };

  // Create post handler
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMsg("Vui lòng nhập đầy đủ tiêu đề và nội dung bài viết.");
      return;
    }

    setCreateLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      formData.append("category", selectedCategory);
      formData.append("tags", tagsInput);
      
      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      const res = await blogApi.createPost(formData);
      if (res.success) {
        // Reset form
        setTitle("");
        setContent("");
        setSelectedCategory("Chủ đề chung");
        setTagsInput("");
        setSelectedFiles([]);
        setPreviews([]);
        setShowCreateModal(false);
        alert("Bài viết đã được gửi để duyệt! Bài viết sẽ xuất hiện sau khi được giáo viên phê duyệt.");
        // Reload feed
        fetchPosts(1, category, search);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Đã xảy ra lỗi khi tạo bài viết.");
    } finally {
      setCreateLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="blog-page">
      {/* Header Area */}
      <div className="blog-header">
        <div className="blog-title-section">
          <div>
            <h1 className="blog-main-title">Diễn đàn Sử Việt</h1>
            <p className="blog-subtitle">Nơi thảo luận, chia sẻ kiến thức lịch sử và trao đổi học tập</p>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="blog-three-col-layout">
        {/* Left Sidebar - Groups */}
        <GroupSidebar user={user} onCreateGroup={() => setShowCreateGroupModal(true)} key={groupRefreshKey} />

        {/* Main Feed */}
        <div className="blog-main-feed">
          {/* Facebook style Create Post trigger card */}
          {user && (
            <div className="fb-create-post-card">
              <div className="fb-create-post-upper">
                <div className="fb-create-post-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} />
                  ) : (
                    <span>{user.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <button onClick={() => setShowCreateModal(true)} className="fb-create-post-input-btn">
                  {user.name} ơi, bạn đang chia sẻ kiến thức gì thế?
                </button>
              </div>
            </div>
          )}

          {/* Main Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto animate-spin text-[#c9a15a]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="mt-4 text-[#a37636] font-semibold">Đang tải các cuộc thảo luận...</p>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="blog-empty-state">
          <svg className="w-16 h-16 mx-auto mb-4 text-[#c9a15a]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="blog-empty-text">Chưa có bài viết nào trong chủ đề này. Hãy viết bài viết đầu tiên!</p>
        </div>
      ) : (
        <>
          <div className="blog-post-grid">
            {posts.map((post) => (
              <Link href={`/blog/${post._id}`} key={post._id} className="blog-post-card">
                <div>
                  <div className="blog-card-header">
                    {post.author.avatar ? (
                      <img src={post.author.avatar} alt={post.author.name} className="blog-comment-avatar" />
                    ) : (
                      <div className="blog-comment-avatar-placeholder">
                        {post.author.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="blog-author-name">{post.author.name}</div>
                      <div className="blog-post-time">{formatDate(post.createdAt)}</div>
                    </div>
                    <span className="blog-card-category-badge">{post.category}</span>
                  </div>

                  <h3 className="blog-card-title">{post.title}</h3>
                  <p className="blog-card-excerpt">{post.content}</p>

                  {post.images && post.images.length > 0 && (
                    <img src={post.images[0].url} alt={post.title} className="blog-card-media-preview" />
                  )}
                </div>

                <div className="blog-card-footer">
                  <span className="blog-meta-item">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    {post.likeCount} Thích
                  </span>
                  <span className="blog-meta-item">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    {post.commentCount} Bình luận
                  </span>
                  <span className="blog-meta-item">
                    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {post.viewCount} Xem
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-12">
              <button
                disabled={page <= 1}
                onClick={() => fetchPosts(page - 1, category, search)}
                className="blog-comment-submit-btn !bg-transparent !border !border-[#c9a15a] !text-[#c9a15a] hover:!bg-[#c9a15a]/10 disabled:!opacity-30 disabled:hover:!bg-transparent"
              >
                Trước
              </button>
              <span className="text-sm text-[#a37636] font-semibold">
                Trang {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchPosts(page + 1, category, search)}
                className="blog-comment-submit-btn !bg-transparent !border !border-[#c9a15a] !text-[#c9a15a] hover:!bg-[#c9a15a]/10 disabled:!opacity-30 disabled:hover:!bg-transparent"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="blog-modal-overlay">
          <div className="blog-modal-content">
            <div className="blog-modal-header">
              <h2 className="blog-modal-title">Tạo bài viết thảo luận mới</h2>
              <button onClick={() => setShowCreateModal(false)} className="blog-modal-close-btn">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreatePost}>
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 text-red-200 rounded-lg text-sm">
                  {errorMsg}
                </div>
              )}

              <div className="blog-form-group">
                <label className="blog-form-label">Tiêu đề bài viết</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tiêu đề cô đọng, rõ nghĩa..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="blog-form-input"
                />
              </div>

              <div className="blog-form-group">
                <label className="blog-form-label">Chủ đề thảo luận</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="blog-form-select"
                >
                  {CATEGORIES.slice(1).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="blog-form-group">
                <label className="blog-form-label">Nội dung chi tiết</label>
                <textarea
                  required
                  placeholder="Chia sẻ thông tin, tài liệu lịch sử hoặc câu hỏi học tập của bạn tại đây..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="blog-form-textarea"
                />
              </div>

              <div className="blog-form-group">
                <label className="blog-form-label">Thẻ gắn (tags)</label>
                <input
                  type="text"
                  placeholder="Các từ khóa cách nhau bởi dấu phẩy (vd: Trận Bạch Đằng, Ngô Quyền...)"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="blog-form-input"
                />
              </div>

              <div className="blog-form-group">
                <label className="blog-form-label">Ảnh minh họa (tối đa 3 ảnh, ≤5MB)</label>
                <div className="blog-image-upload-area relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={selectedFiles.length >= 3}
                  />
                  <svg className="w-8 h-8 mx-auto mb-2 text-[#c9a15a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-amber-900/60 font-medium">Click để chọn ảnh tải lên</p>
                </div>

                {previews.length > 0 && (
                  <div className="blog-preview-thumbnails">
                    {previews.map((url, idx) => (
                      <div key={url} className="blog-preview-thumbnail-wrapper">
                        <img src={url} alt="upload preview" className="blog-preview-thumbnail" />
                        <button type="button" onClick={() => removeSelectedFile(idx)} className="blog-remove-preview-btn">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="blog-comment-submit-btn !bg-transparent !border !border-amber-700/40 !text-amber-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="blog-comment-submit-btn"
                >
                  {createLoading ? "Đang gửi..." : "Gửi phê duyệt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <CreateGroupModal
          onClose={() => setShowCreateGroupModal(false)}
          onCreated={() => setGroupRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
