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
    setEditTitle(post.title);
    setEditContent(post.content);
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
            <div key={post._id} className="blog-post-card !cursor-default !flex-row flex-wrap gap-6 justify-between items-start">
              <div className="flex-1 min-w-[280px]">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className={`blog-status-badge ${post.status.toLowerCase().replace("_", "")}`}>
                    {getStatusLabel(post.status)}
                  </span>
                  <span className="text-xs text-[#a37636] font-semibold">{post.category}</span>
                  <span className="text-xs text-[#a37636]/60">Đăng lúc {formatDate(post.createdAt)}</span>
                </div>

                <h3 className="blog-card-title !mb-2">
                  {post.status === "Published" ? (
                    <Link href={`/blog/${post._id}`} className="hover:underline">{post.title}</Link>
                  ) : (
                    post.title
                  )}
                </h3>

                <p className="blog-card-excerpt !line-clamp-2">{post.content}</p>

                {/* Show moderator rejection feedback */}
                {post.status === "Rejected" && post.reviewFeedback && (
                  <div className="mt-3 p-3 bg-red-950/20 border border-red-500/20 text-red-200 text-xs rounded-lg">
                    <span className="font-bold text-red-400">Lý do từ chối:</span> {post.reviewFeedback}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 self-center">
                <button
                  onClick={() => openEditModal(post)}
                  className="blog-comment-submit-btn !bg-transparent !border !border-[#c9a15a] !text-[#c9a15a] hover:!bg-[#c9a15a]/10"
                >
                  Sửa bài
                </button>
                <button
                  onClick={() => handleDeletePost(post._id)}
                  className="blog-comment-submit-btn !bg-transparent !border !border-rose-600 !text-rose-500 hover:!bg-rose-600/10"
                >
                  Xóa
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

              {/* Manage Existing Images */}
              {editingPost.images && editingPost.images.length > 0 && (
                <div className="blog-form-group">
                  <label className="blog-form-label">Quản lý ảnh hiện tại (Nhấn vào ảnh để giữ lại/gỡ bỏ)</label>
                  <div className="flex gap-3 flex-wrap">
                    {editingPost.images.map((img) => {
                      const isKept = keepImages.includes(img.publicId);
                      return (
                        <div
                          key={img.publicId}
                          onClick={() => toggleKeepImage(img.publicId)}
                          className={`relative width-20 height-20 border-2 rounded-lg cursor-pointer transition ${isKept ? "border-[#c9a15a] opacity-100" : "border-rose-900 opacity-40"}`}
                        >
                          <img src={img.url} alt="current image" className="w-20 h-20 object-cover rounded-md" />
                          <div className={`absolute inset-0 flex items-center justify-center font-bold text-xs ${isKept ? "bg-[#c9a15a]/20 text-[#f0ddb7]" : "bg-black/75 text-rose-500"}`}>
                            {isKept ? "GIỮ LẠI" : "GỠ BỎ"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upload new images */}
              <div className="blog-form-group">
                <label className="blog-form-label">Tải thêm ảnh mới (Tối đa 3 ảnh bao gồm ảnh cũ giữ lại)</label>
                <div className="blog-image-upload-area relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={keepImages.length + selectedFiles.length >= 3}
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
    </div>
  );
}
