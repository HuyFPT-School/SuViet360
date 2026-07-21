"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { blogApi } from "@/lib/blogApi";
import type { BlogPost } from "@/types/blog";
import "../blog.css";

const CATEGORIES = [
  "Chủ đề chung",
  "Lịch sử cổ đại",
  "Lịch sử trung đại",
  "Lịch sử cận đại",
  "Lịch sử hiện đại",
  "Nhân vật lịch sử",
  "Di tích & Văn hóa",
  "Tài liệu tham khảo"
];

export default function MyBlogPostsPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyModalPost, setHistoryModalPost] = useState<BlogPost | null>(null);

  // Edit Modal States
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("Chủ đề chung");
  const [editTags, setEditTags] = useState("");
  const [keepImages, setKeepImages] = useState<string[]>([]); // publicIds of images to keep
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchMyPosts = async () => {
    setLoading(true);
    try {
      const res = await blogApi.getMyPosts();
      if (res.success) {
        setPosts(res.data);
      }
    } catch (err) {
      console.error("Failed to load my blog posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyPosts();
    }
  }, [user]);

  const handleDeletePost = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này? Tất cả bình luận liên quan cũng sẽ bị xóa.")) return;

    try {
      const res = await blogApi.deletePost(id);
      if (res.success) {
        alert("Đã xóa bài viết thành công.");
        fetchMyPosts();
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  // Open Edit Modal
  const openEditModal = (post: BlogPost) => {
    setEditingPost(post);
    setEditTitle(post.hasPendingDraft && post.pendingDraft?.title ? post.pendingDraft.title : post.title);
    setEditContent(post.hasPendingDraft && post.pendingDraft?.content ? post.pendingDraft.content : post.content);
    setEditCategory(post.category);
    setEditTags(post.tags.join(", "));
    setKeepImages(post.images.map(img => img.publicId));
    setSelectedFiles([]);
    setPreviews([]);
    setErrorMsg(null);
  };

  // Handle Edit file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (keepImages.length + selectedFiles.length + filesArray.length > 3) {
        alert("Bạn chỉ được đính kèm tối đa 3 ảnh!");
        return;
      }
      for (const file of filesArray) {
        if (file.size > 5 * 1024 * 1024) {
          alert(`File ${file.name} vượt quá dung lượng cho phép (5MB)!`);
          return;
        }
      }
      setSelectedFiles([...selectedFiles, ...filesArray]);
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPreviews([...previews, ...newPreviews]);
    }
  };

  const removeSelectedFile = (index: number) => {
    const updatedFiles = [...selectedFiles];
    updatedFiles.splice(index, 1);
    setSelectedFiles(updatedFiles);

    const updatedPreviews = [...previews];
    URL.revokeObjectURL(updatedPreviews[index]);
    updatedPreviews.splice(index, 1);
    setPreviews(updatedPreviews);
  };

  const toggleKeepImage = (publicId: string) => {
    if (keepImages.includes(publicId)) {
      setKeepImages(keepImages.filter(id => id !== publicId));
    } else {
      if (keepImages.length + selectedFiles.length >= 3) {
        alert("Tổng số ảnh (ảnh cũ giữ lại + ảnh mới) không được vượt quá 3!");
        return;
      }
      setKeepImages([...keepImages, publicId]);
    }
  };

  // Handle Update submit
  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    if (!editTitle.trim() || !editContent.trim()) {
      setErrorMsg("Vui lòng nhập đầy đủ tiêu đề và nội dung.");
      return;
    }

    setSubmittingEdit(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("title", editTitle.trim());
      formData.append("content", editContent.trim());
      formData.append("category", editCategory);
      formData.append("tags", editTags);
      formData.append("keepImages", JSON.stringify(keepImages));

      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      const res = await blogApi.updatePost(editingPost._id, formData);
      if (res.success) {
        alert("Đã cập nhật bài viết thành công và gửi phê duyệt lại.");
        setEditingPost(null);
        fetchMyPosts();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Đã xảy ra lỗi khi cập nhật.");
    } finally {
      setSubmittingEdit(false);
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Published": return "Đã duyệt (Published)";
      case "Pending_Review": return "Chờ duyệt (Pending)";
      case "Rejected": return "Bị từ chối (Rejected)";
      default: return status;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-40">
        <svg className="w-12 h-12 animate-spin text-[#c9a15a]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="blog-page">
      <div className="mb-6">
        <Link href="/blog" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#c9a15a] hover:text-[#f0ddb7] transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Quay lại diễn đàn
        </Link>
      </div>

      <div className="blog-header">
        <h1 className="blog-main-title">Bài viết của tôi</h1>
        <p className="blog-subtitle">Quản lý, chỉnh sửa hoặc kiểm tra trạng thái phê duyệt bài viết của bạn</p>
      </div>

      {posts.length === 0 ? (
        <div className="blog-empty-state">
          <p className="blog-empty-text">Bạn chưa tạo bài viết thảo luận nào.</p>
          <Link href="/blog" className="blog-btn-gold mt-6">Tới diễn đàn tạo bài viết</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post._id} className="blog-post-card !cursor-default space-y-4">
              {/* Header Info */}
              <div className="flex items-center justify-between border-b border-[#c7ab73]/20 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`blog-status-badge ${post.status.toLowerCase().replace("_", "")}`}>
                    {getStatusLabel(post.status)}
                  </span>
                  {post.hasPendingDraft && (
                    <span className="text-xs text-amber-900 bg-amber-200/80 font-bold px-2 py-0.5 rounded-md border border-amber-400">
                      Bản sửa đổi chờ duyệt
                    </span>
                  )}
                  <span className="text-xs text-[#a37636] font-semibold bg-[#c9a15a]/10 px-2 py-0.5 rounded-full">{post.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#a37636]/60">Đăng lúc {formatDate(post.createdAt)}</span>
                  {(post.isEdited || (post.editHistory && post.editHistory.length > 0)) && (
                    <button
                      type="button"
                      onClick={() => setHistoryModalPost(post)}
                      className="text-xs text-[#a84d28] font-bold underline hover:text-[#8a3c1e] transition-colors cursor-pointer"
                    >
                      (Đã chỉnh sửa)
                    </button>
                  )}
                </div>
              </div>

              {/* Content Area */}
              <div className="space-y-2">
                <h3 className="text-base font-bold text-[#4a1f24] hover:text-[#c9a15a] transition">
                  {post.status === "Published" ? (
                    <Link href={`/blog/${post._id}`} className="hover:underline">{post.title}</Link>
                  ) : (
                    post.title
                  )}
                </h3>

                <p className="text-sm text-[#5c4a3d] leading-relaxed whitespace-pre-wrap">{post.content}</p>

                {/* Post Images Preview */}
                {post.images && post.images.length > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {post.images.map((img, index) => (
                      <img 
                        key={img.publicId} 
                        src={img.url} 
                        alt={`${post.title} - ${index + 1}`} 
                        className="rounded-lg border border-[#c7ab73]/30 max-h-48 object-cover shadow-sm"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Rejection Feedback Alert Banner */}
              {post.status === "Rejected" && post.reviewFeedback && (
                <div className="p-3.5 bg-[#fdf2f2] border border-[#f5c2c2] text-[#8b1e22] text-xs rounded-lg flex items-start gap-2 shadow-sm">
                  <svg className="w-4.5 h-4.5 text-[#e05656] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <span className="font-bold text-[#b91c1c] block mb-0.5">Lý do từ chối kiểm duyệt:</span>
                    <span className="leading-relaxed">{post.reviewFeedback}</span>
                  </div>
                </div>
              )}

              {/* Bottom Buttons Action Row */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[#c7ab73]/10">
                <button
                  onClick={() => openEditModal(post)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-transparent border border-[#c7ab73] text-[#a37636] hover:bg-[#c9a15a]/10 transition-colors shadow-sm"
                >
                  Sửa bài
                </button>
                <button
                  onClick={() => handleDeletePost(post._id)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-transparent border border-rose-400 text-rose-600 hover:bg-rose-50/50 transition-colors shadow-sm"
                >
                  Xóa bài
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Post Modal */}
      {editingPost && (
        <div className="blog-modal-overlay">
          <div className="blog-modal-content">
            <div className="blog-modal-header">
              <h2 className="blog-modal-title">Chỉnh sửa bài viết</h2>
              <button onClick={() => setEditingPost(null)} className="blog-modal-close-btn">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdatePost}>
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
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="blog-form-input"
                />
              </div>

              <div className="blog-form-group">
                <label className="blog-form-label">Chủ đề thảo luận</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="blog-form-select"
                >
                  {CATEGORIES.map((cat) => (
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
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="blog-form-textarea"
                />
              </div>

              <div className="blog-form-group">
                <label className="blog-form-label">Thẻ gắn (tags)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="blog-form-input"
                />
              </div>

              {/* Single / Existing Image Lock Rule Notice */}
              {editingPost.images && editingPost.images.length > 0 ? (
                <div className="blog-form-group p-3 bg-[#fdf8ed] border border-[#c9a15a]/50 rounded-xl text-xs text-[#5c4a3d] leading-relaxed">
                  <div className="flex items-center gap-2 font-bold text-[#a84d28] mb-1">
                    <svg className="w-4 h-4 text-[#c9a15a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Bài viết đã có hình ảnh cố định
                  </div>
                  Theo quy định của diễn đàn, sau khi bài đã được đăng có đính kèm hình ảnh, bạn <strong>không thể thay bằng ảnh/video khác</strong>. Bạn chỉ có thể chỉnh sửa phần tiêu đề và nội dung bài viết (hoặc xóa hẳn bài viết nếu muốn thay đổi hình ảnh khác).
                </div>
              ) : (
                /* Upload new images if post originally had 0 images */
                <div className="blog-form-group">
                  <label className="blog-form-label">Tải thêm ảnh minh họa (Tối đa 3 ảnh, ≤5MB)</label>
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
                    <p className="text-xs text-amber-900/60 font-medium">Click để chọn ảnh mới tải lên</p>
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
              )}

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="blog-comment-submit-btn !bg-transparent !border !border-amber-700/40 !text-amber-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="blog-comment-submit-btn"
                >
                  {submittingEdit ? "Đang cập nhật..." : "Cập nhật bài viết"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit History Modal */}
      {historyModalPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#fdf9f1] border-2 border-[#c9a15a] rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative text-[#2c1a0e] max-h-[85vh] flex flex-col">
            <button
              onClick={() => setHistoryModalPost(null)}
              className="absolute top-4 right-4 text-[#8c6a34] hover:text-[#4a1f24] font-bold text-base cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-xl font-extrabold text-[#4a1f24] uppercase mb-4 border-b border-[#e8d5b5] pb-3" style={{ fontFamily: '"Cinzel", serif' }}>
              LỊCH SỬ CHỈNH SỬA BÀI VIẾT
            </h3>

            <div className="overflow-y-auto pr-2 space-y-4 flex-1">
              {historyModalPost.editHistory && historyModalPost.editHistory.length > 0 ? (
                historyModalPost.editHistory.map((item, idx) => (
                  <div key={idx} className="bg-white border border-[#e8d5b5] rounded-xl p-4 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-[#a84d28] font-bold">
                      <span>Phiên bản gốc #{idx + 1}</span>
                      <span>{formatDate(item.editedAt)}</span>
                    </div>
                    {item.title && (
                      <h4 className="font-bold text-sm text-[#3a2312] border-b border-amber-100 pb-1">
                        {item.title}
                      </h4>
                    )}
                    <p className="text-xs text-[#5c4a3d] leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#8c6a34] italic text-center py-6">
                  Bài viết chưa ghi nhận lần chỉnh sửa nào trước đó.
                </p>
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-[#e8d5b5] flex justify-end">
              <button
                onClick={() => setHistoryModalPost(null)}
                className="px-5 py-2 rounded-xl bg-[#2c1216] text-[#f6e1ba] border border-[#c9a15a]/50 font-bold text-xs uppercase tracking-wider hover:bg-[#4a1f24] transition cursor-pointer"
                style={{ fontFamily: '"Cinzel", serif' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
