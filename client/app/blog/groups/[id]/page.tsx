"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { groupApi, type Group } from "@/lib/groupApi";
import { blogApi } from "@/lib/blogApi";
import type { BlogPost } from "@/types/blog";
import "../../blog.css";

// SVG Icons
const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [postLoading, setPostLoading] = useState(false);

  // Post form modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit group modal states
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDesc, setEditGroupDesc] = useState("");
  const [editGroupIsPublic, setEditGroupIsPublic] = useState(true);
  const [updatingGroup, setUpdatingGroup] = useState(false);

  // Moderation feedback state
  const [rejectFeedback, setRejectFeedback] = useState<Record<string, string>>({});
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  const isMember = group?.members.some((m) => m.user._id === user?.id);
  const isAdmin = group?.members.some((m) => m.user._id === user?.id && m.role === "admin");

  const loadGroupDetails = useCallback(async () => {
    try {
      const groupRes = await groupApi.getGroupById(id);
      if (groupRes.success) {
        setGroup(groupRes.data);
      }
      
      const postsRes = await groupApi.getGroupPosts(id);
      if (postsRes.success) {
        setPosts(postsRes.data);
      }
    } catch (err) {
      console.error(err);
      router.push("/blog");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadGroupDetails();
  }, [loadGroupDetails]);

  const handleJoinLeave = async () => {
    if (!user) {
      alert("Vui lòng đăng nhập để thực hiện thao tác.");
      return;
    }
    setJoinLoading(true);
    try {
      if (isMember) {
        if (group?.creator._id === user.id) {
          alert("Người tạo nhóm không thể rời nhóm.");
          setJoinLoading(false);
          return;
        }
        await groupApi.leaveGroup(id);
      } else {
        await groupApi.joinGroup(id);
      }
      loadGroupDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setPostLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      formData.append("category", "Chủ đề chung");
      formData.append("group", id);
      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      const res = await blogApi.createPost(formData);
      if (res.success) {
        setTitle("");
        setContent("");
        setSelectedFiles([]);
        setPreviews([]);
        setShowCreateModal(false);
        alert(
          isAdmin
            ? "Đã đăng bài viết thành công!"
            : "Bài viết đã được gửi cho Admin nhóm duyệt!"
        );
        loadGroupDetails();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Đã xảy ra lỗi.");
    } finally {
      setPostLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (selectedFiles.length + filesArray.length > 3) {
        alert("Bạn chỉ được đính kèm tối đa 3 ảnh!");
        return;
      }
      setSelectedFiles((prev) => [...prev, ...filesArray]);
      const newPreviews = filesArray.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleModerate = async (postId: string, action: "approve" | "reject") => {
    setModeratingId(postId);
    const feedback = rejectFeedback[postId] || "";
    try {
      await groupApi.moderatePost(id, postId, action, feedback);
      alert(action === "approve" ? "Đã duyệt bài viết!" : "Đã từ chối bài viết!");
      loadGroupDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setModeratingId(null);
    }
  };

  const openEditGroupModal = () => {
    if (!group) return;
    setEditGroupName(group.name);
    setEditGroupDesc(group.description || "");
    setEditGroupIsPublic(group.isPublic !== false);
    setShowEditGroupModal(true);
  };

  const handleUpdateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroupName.trim()) {
      alert("Tên nhóm không được để trống!");
      return;
    }

    setUpdatingGroup(true);
    try {
      const res = await groupApi.updateGroup(id, {
        name: editGroupName.trim(),
        description: editGroupDesc.trim(),
        isPublic: editGroupIsPublic,
      });

      if (res.success) {
        alert("Cập nhật thông tin nhóm thành công!");
        setShowEditGroupModal(false);
        loadGroupDetails();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Đã xảy ra lỗi khi cập nhật nhóm.");
    } finally {
      setUpdatingGroup(false);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 min-h-screen">
        <div className="text-center text-[#c9a15a]">Đang tải thông tin nhóm...</div>
      </div>
    );
  }

  if (!group) return null;

  const pendingPosts = posts.filter((p) => p.status === "Pending_Review");
  const publishedPosts = posts.filter((p) => p.status === "Published");

  return (
    <div className="blog-page">
      {/* Back to Blog */}
      <Link href="/blog" className="flex items-center gap-2 text-sm text-[#c9a15a] mb-6 hover:underline">
        <ArrowLeftIcon />
        Quay lại Diễn đàn
      </Link>

      {/* Group Hero Banner */}
      <div className="bg-[#fdf6e8] border-2 border-[#c7ab73] rounded-2xl p-6 md:p-8 mb-8 shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#8c6a34] font-semibold uppercase tracking-wider mb-2">
              {group.isPublic ? (
                <>
                  <GlobeIcon />
                  Nhóm Công khai
                </>
              ) : (
                <>
                  <LockIcon />
                  Nhóm Riêng tư
                </>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-display text-[#2a2016] mb-3">{group.name}</h1>
            <p className="text-sm text-[#5c4a3d] max-w-2xl mb-4">{group.description || "Chưa có mô tả cho nhóm này."}</p>
            <div className="flex items-center gap-4 text-xs text-[#8c6a34] font-semibold">
              <span className="flex items-center gap-1">
                <UsersIcon />
                {group.memberCount} thành viên
              </span>
              <span>•</span>
              <span>Người tạo: {group.creator.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {isAdmin && (
              <button
                onClick={openEditGroupModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-[#c9a15a] hover:bg-[#b08b47] text-[#1f0a0d] border border-[#a8823d] shadow-sm transition-all cursor-pointer"
              >
                <EditIcon />
                Chỉnh sửa thông tin nhóm
              </button>
            )}
            <button
              onClick={handleJoinLeave}
              disabled={joinLoading}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer ${
                isMember
                  ? "bg-transparent border-2 border-red-700/60 text-red-800 hover:bg-red-500/10"
                  : "bg-[#1f0a0d] text-[#f0ddb7] border-2 border-[#1f0a0d] hover:bg-[#3d1c21]"
              }`}
            >
              {joinLoading ? "Đang xử lý..." : isMember ? "Rời nhóm" : "Tham gia nhóm"}
            </button>
          </div>
        </div>
      </div>

      {/* Group Content */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Posts Area (Main Feed) */}
        <div className="flex-1 w-full space-y-6">
          {/* Create Post Header (Visible to members only) */}
          {isMember && (
            <div className="bg-[#fdf6e8] border-2 border-[#c7ab73] rounded-xl p-4 flex items-center justify-between shadow-sm">
              <span className="text-[#8c6a34] font-medium text-sm">Chia sẻ điều gì đó với nhóm của bạn...</span>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-[#c9a15a] hover:bg-[#b08b47] text-[#1f0a0d] font-bold text-sm px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                <EditIcon />
                Tạo bài viết
              </button>
            </div>
          )}

          {/* Pending Posts Section (Admin Moderation) */}
          {isAdmin && pendingPosts.length > 0 && (
            <div className="border-2 border-dashed border-[#c9a15a] bg-amber-50/20 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#4a1f24] border-b border-[#c9a15a]/30 pb-2">
                Bài viết đang chờ duyệt ({pendingPosts.length})
              </h2>
              <div className="space-y-4">
                {pendingPosts.map((post) => (
                  <div key={post._id} className="bg-white border border-[#e8d5b5] rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      {post.author.avatar ? (
                        <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full object-cover border border-[#c9a15a]" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-200 border border-[#c9a15a] flex items-center justify-center font-bold text-amber-800">
                          {post.author.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-[#2a2016] text-sm">{post.author.name}</div>
                        <div className="text-xs text-[#8c6a34]">{formatDate(post.createdAt)}</div>
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-[#2a2016] mb-2">{post.title}</h3>
                    <p className="text-sm text-[#5c4a3d] whitespace-pre-line mb-4">{post.content}</p>
                    {post.images && post.images.map((img, i) => (
                      <img key={i} src={img.url} alt="Post Attachment" className="max-h-60 rounded-lg object-cover mb-4" />
                    ))}

                    <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-amber-100">
                      <input
                        type="text"
                        placeholder="Nhập lý do nếu từ chối..."
                        value={rejectFeedback[post._id] || ""}
                        onChange={(e) => setRejectFeedback({ ...rejectFeedback, [post._id]: e.target.value })}
                        className="flex-1 bg-amber-50/50 border border-[#e8d5b5] rounded-lg px-3 py-1.5 text-xs text-[#2a2016] outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleModerate(post._id, "reject")}
                          disabled={moderatingId === post._id}
                          className="bg-transparent border border-red-700 text-red-800 font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-red-50"
                        >
                          Từ chối
                        </button>
                        <button
                          onClick={() => handleModerate(post._id, "approve")}
                          disabled={moderatingId === post._id}
                          className="bg-[#1f0a0d] text-[#f0ddb7] font-semibold text-xs px-4 py-1.5 rounded-lg hover:bg-[#3d1c21]"
                        >
                          Duyệt đăng
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Published Feed */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#2a2016] font-display">Thảo luận nhóm</h2>
            {!group.isPublic && !isMember ? (
              <div className="bg-[#fdf6e8] border border-[#c7ab73] rounded-xl p-8 text-center">
                <LockIcon />
                <p className="mt-3 text-[#5c4a3d] font-semibold text-sm">
                  Đây là nhóm riêng tư. Bạn cần tham gia nhóm để xem các bài viết thảo luận.
                </p>
              </div>
            ) : publishedPosts.length === 0 ? (
              <div className="bg-[#fdf6e8] border border-[#c7ab73] rounded-xl p-8 text-center text-[#8c6a34] text-sm">
                Nhóm chưa có bài viết nào được đăng. Hãy là người đầu tiên chia sẻ!
              </div>
            ) : (
              publishedPosts.map((post) => (
                <Link href={`/blog/${post._id}`} key={post._id} className="blog-post-card block hover:border-[#c9a15a] transition-all">
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
                  </div>

                  <h3 className="blog-card-title">{post.title}</h3>
                  <p className="blog-card-excerpt">{post.content}</p>

                  {post.images && post.images.length > 0 && (
                    <img src={post.images[0].url} alt={post.title} className="blog-card-media-preview" />
                  )}

                  <div className="blog-card-footer">
                    <span className="blog-meta-item">
                      <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                      {post.likeCount} Thích
                    </span>
                    <span className="blog-meta-item">
                      <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
                      {post.commentCount} Bình luận
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Group Info Sidebar */}
        <div className="w-full lg:w-80 bg-[#fdf6e8] border-2 border-[#c7ab73] rounded-xl p-5 space-y-6 shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-[#2a2016] uppercase tracking-wider mb-3">Thành viên ({group.memberCount})</h3>
            <div className="grid grid-cols-5 gap-2">
              {group.members.slice(0, 10).map((member) => (
                <div key={member.user._id} className="relative group cursor-pointer" title={`${member.user.name} (${member.role === "admin" ? "Trưởng nhóm" : "Thành viên"})`}>
                  {member.user.avatar ? (
                    <img src={member.user.avatar} alt={member.user.name} className="w-10 h-10 rounded-full object-cover border border-[#c9a15a]" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-200 border border-[#c9a15a] flex items-center justify-center font-bold text-[#8c6a34] text-sm">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {member.role === "admin" && (
                    <span className="absolute -bottom-1 -right-1 bg-[#1f0a0d] border border-[#c9a15a] text-[#c9a15a] text-[8px] font-bold px-1 rounded-full">★</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#2a2016] uppercase tracking-wider mb-2">Giới thiệu nhóm</h3>
            <p className="text-xs text-[#5c4a3d] leading-relaxed">
              Nhóm thảo luận thuộc chuyên mục giáo dục cộng đồng Hành Trình Sử Việt. 
              Các thành viên có thể tự do trao đổi, đăng tải tư liệu tham khảo, đặt câu hỏi ôn tập 
              và đóng góp nội dung học tập.
            </p>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="blog-modal-overlay">
          <div className="blog-modal-content">
            <div className="blog-modal-header">
              <h2 className="blog-modal-title">Đăng bài viết mới vào nhóm</h2>
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
                <label className="blog-form-label">Tiêu đề</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tiêu đề bài thảo luận..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="blog-form-input"
                />
              </div>

              <div className="blog-form-group">
                <label className="blog-form-label">Nội dung bài viết</label>
                <textarea
                  required
                  placeholder="Viết nội dung chi tiết..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="blog-form-textarea"
                />
              </div>

              <div className="blog-form-group">
                <label className="blog-form-label">Hình ảnh minh họa (tối đa 3 ảnh, ≤5MB)</label>
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
                        <button type="button" onClick={() => removeSelectedFile(idx)} className="blog-remove-preview-btn">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="blog-comment-submit-btn !bg-transparent !border !border-amber-700/40 !text-amber-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={postLoading}
                  className="blog-comment-submit-btn"
                >
                  {postLoading ? "Đang gửi..." : "Đăng bài"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Group Info Modal */}
      {showEditGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#fdf9f1] border-2 border-[#c9a15a] rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative text-[#2c1a0e]">
            <button
              onClick={() => setShowEditGroupModal(false)}
              className="absolute top-4 right-4 text-[#8c6a34] hover:text-[#4a1f24] font-bold text-base cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-xl font-extrabold text-[#4a1f24] uppercase mb-4 border-b border-[#e8d5b5] pb-3" style={{ fontFamily: '"Cinzel", serif' }}>
              CHỈNH SỬA THÔNG TIN NHÓM
            </h3>
            <form onSubmit={handleUpdateGroupSubmit}>
              <div className="blog-form-group mb-4">
                <label className="blog-form-label font-bold text-xs uppercase text-[#8c6a34] block mb-1">Tên nhóm</label>
                <input
                  type="text"
                  required
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="blog-form-input w-full p-2.5 rounded-xl border border-[#c7ab73] bg-white text-sm"
                />
              </div>
              <div className="blog-form-group mb-4">
                <label className="blog-form-label font-bold text-xs uppercase text-[#8c6a34] block mb-1">Mô tả nhóm</label>
                <textarea
                  rows={4}
                  value={editGroupDesc}
                  onChange={(e) => setEditGroupDesc(e.target.value)}
                  className="blog-form-textarea w-full p-2.5 rounded-xl border border-[#c7ab73] bg-white text-sm"
                  placeholder="Giới thiệu về mục đích và chủ đề thảo luận của nhóm..."
                />
              </div>
              <div className="blog-form-group mb-6">
                <label className="blog-form-label font-bold text-xs uppercase text-[#8c6a34] block mb-1">Quyền riêng tư</label>
                <select
                  value={editGroupIsPublic ? "public" : "private"}
                  onChange={(e) => setEditGroupIsPublic(e.target.value === "public")}
                  className="blog-form-select w-full p-2.5 rounded-xl border border-[#c7ab73] bg-white text-sm"
                >
                  <option value="public">Nhóm Công khai (Mọi người đều tìm thấy & tham gia)</option>
                  <option value="private">Nhóm Riêng tư (Chỉ thành viên xem bài viết)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-[#e8d5b5]">
                <button
                  type="button"
                  onClick={() => setShowEditGroupModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#c7ab73] text-[#8c6a34] font-semibold text-xs hover:bg-[#c9a15a]/10"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updatingGroup}
                  className="px-5 py-2 rounded-xl bg-[#2c1216] text-[#f6e1ba] border border-[#c9a15a]/50 font-bold text-xs uppercase tracking-wider hover:bg-[#4a1f24] transition cursor-pointer"
                  style={{ fontFamily: '"Cinzel", serif' }}
                >
                  {updatingGroup ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
