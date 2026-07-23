"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { blogApi } from "@/lib/blogApi";
import type { BlogPost, BlogComment } from "@/types/blog";
import "../blog.css";

const REPORT_REASONS = [
  { value: "Spam", label: "Tin rác / Spam" },
  { value: "Offensive_Language", label: "Ngôn từ thô tục, xúc phạm" },
  { value: "Historical_Inaccuracy", label: "Sai lệch thông tin lịch sử" },
  { value: "Harassment", label: "Quấy rối, công kích cá nhân" },
  { value: "Other", label: "Lý do khác" }
];

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const postId = params.id as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Like states
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Comment states
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");

  // History Modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Report Modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "Post" | "Comment"; id: string } | null>(null);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDesc, setReportDesc] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  // Fetch full details helper
  const loadData = useCallback(async () => {
    try {
      const postRes = await blogApi.getPostById(postId);
      if (postRes.success) {
        setPost(postRes.data);
        setLikeCount(postRes.data.likeCount);
      }

      const commentsRes = await blogApi.getCommentsByPost(postId);
      if (commentsRes.success) {
        setComments(commentsRes.data);
      }

      if (user) {
        const likeRes = await blogApi.getLikeStatus("Post", postId);
        setIsLiked(likeRes.liked);
      }
    } catch (err) {
      console.error("Failed to load blog details:", err);
      // Redirect or show error
    } finally {
      setLoading(false);
    }
  }, [postId, user]);

  useEffect(() => {
    if (postId) {
      loadData();
    }
  }, [postId, loadData]);

  // Handle Post Like Toggle
  const handleLikeToggle = async () => {
    if (!user) {
      alert("Vui lòng đăng nhập để thích bài viết.");
      return;
    }
    try {
      const res = await blogApi.toggleLike("Post", postId);
      if (res.success) {
        setIsLiked(res.liked);
        setLikeCount(res.likeCount);
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  // Handle Comment Like Toggle
  const handleCommentLikeToggle = async (commentId: string) => {
    if (!user) {
      alert("Vui lòng đăng nhập để thích bình luận.");
      return;
    }
    try {
      const res = await blogApi.toggleLike("Comment", commentId);
      if (res.success) {
        // Reload comments list to show updated counts
        const commentsRes = await blogApi.getCommentsByPost(postId);
        if (commentsRes.success) {
          setComments(commentsRes.data);
        }
      }
    } catch (err) {
      console.error("Failed to toggle comment like:", err);
    }
  };

  // Add root comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await blogApi.createComment(postId, commentInput.trim());
      if (res.success) {
        setCommentInput("");
        // Refresh comments list
        const commentsRes = await blogApi.getCommentsByPost(postId);
        if (commentsRes.success) {
          setComments(commentsRes.data);
        }
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Add reply
  const handleAddReply = async (parentCommentId: string) => {
    if (!replyInput.trim()) return;

    try {
      const res = await blogApi.createComment(postId, replyInput.trim(), parentCommentId);
      if (res.success) {
        setReplyInput("");
        setActiveReplyId(null);
        // Refresh comments
        const commentsRes = await blogApi.getCommentsByPost(postId);
        if (commentsRes.success) {
          setComments(commentsRes.data);
        }
      }
    } catch (err) {
      console.error("Failed to add reply:", err);
    }
  };

  // Delete comment/reply
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bình luận này?")) return;

    try {
      const res = await blogApi.deleteComment(commentId);
      if (res.success) {
        // Refresh comments
        const commentsRes = await blogApi.getCommentsByPost(postId);
        if (commentsRes.success) {
          setComments(commentsRes.data);
        }
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  // Delete Post
  const handleDeletePost = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này? Tất cả bình luận liên quan cũng sẽ bị xóa.")) return;

    try {
      const res = await blogApi.deletePost(postId);
      if (res.success) {
        alert("Đã xóa bài viết thành công.");
        router.push("/blog");
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  // Report submit handler
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;

    setSubmittingReport(true);
    try {
      const res = await blogApi.createReport({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        reason: reportReason,
        description: reportDesc.trim(),
      });
      if (res.success) {
        alert("Báo cáo của bạn đã được gửi thành công. Ban quản trị sẽ sớm xem xét và xử lý.");
        setShowReportModal(false);
        setReportDesc("");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Đã xảy ra lỗi khi gửi báo cáo.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const openReportModal = (type: "Post" | "Comment", id: string) => {
    if (!user) {
      alert("Vui lòng đăng nhập để báo cáo vi phạm.");
      return;
    }
    setReportTarget({ type, id });
    setReportReason("Spam");
    setReportDesc("");
    setShowReportModal(true);
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "teacher": return "Giáo viên";
      case "admin": return "Quản trị";
      case "staff": return "Biên tập viên";
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-40">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto animate-spin text-[#c9a15a]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-[#a37636] font-semibold">Đang tải nội dung thảo luận...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="blog-page text-center py-20">
        <h2 className="text-xl text-rose-500 font-bold">Không tìm thấy bài viết!</h2>
        <p className="text-[#a37636] mt-2">Bài viết có thể đã bị xóa hoặc đang chờ phê duyệt.</p>
        <Link href="/blog" className="blog-btn-gold mt-6">Quay lại diễn đàn</Link>
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

      {/* Main Post Container */}
      <div className="blog-detail-container">
        <div className="blog-detail-category">{post.category}</div>
        <h1 className="blog-detail-title">{post.title}</h1>

        {/* Author / Meta Block */}
        <div className="blog-detail-meta">
          {post.author.avatar ? (
            <img src={post.author.avatar} alt={post.author.name} className="blog-comment-avatar" />
          ) : (
            <div className="blog-comment-avatar-placeholder">
              {post.author.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="blog-author-name">{post.author.name}</span>
              {getRoleBadge(post.author.role) && (
                <span className="blog-comment-role-badge">{getRoleBadge(post.author.role)}</span>
              )}
            </div>
            <div className="blog-post-time flex items-center gap-1.5">
              <span>Đăng lúc {formatDate(post.createdAt)}</span>
              {(post.isEdited || (post.editHistory && post.editHistory.length > 0)) && (
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="text-xs text-[#a84d28] font-bold underline hover:text-[#8a3c1e] transition-colors cursor-pointer"
                >
                  (Đã chỉnh sửa)
                </button>
              )}
            </div>
          </div>

          {/* Delete options for owner / mod */}
          {(user?.id === post.author._id || ["admin", "staff"].includes(user?.role || "")) && (
            <div className="ml-auto flex gap-2">
              {user?.id === post.author._id && (
                <Link href={`/blog/my-posts`} className="blog-comment-action-btn !text-amber-600 hover:!text-amber-500">
                  Chỉnh sửa
                </Link>
              )}
              <button onClick={handleDeletePost} className="blog-comment-action-btn !text-rose-600 hover:!text-rose-500">
                Xóa bài viết
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="blog-detail-content">{post.content}</div>

        {/* Image Gallery */}
        {post.images && post.images.length > 0 && (
          <div className="blog-detail-gallery">
            {post.images.map((img, idx) => (
              <a href={img.url} target="_blank" rel="noopener noreferrer" key={img.publicId}>
                <img src={img.url} alt={`Minh họa ${idx + 1}`} className="blog-detail-image" />
              </a>
            ))}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="blog-action-bar">
          <div className="flex gap-4">
            <button
              onClick={handleLikeToggle}
              className={`blog-like-toggle-btn ${isLiked ? "liked" : ""}`}
            >
              <svg className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {likeCount} Thích
            </button>
            <span className="blog-like-toggle-btn !bg-transparent !cursor-default">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {post.viewCount} Xem
            </span>
          </div>
          <button onClick={() => openReportModal("Post", postId)} className="blog-report-trigger-btn">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Báo cáo bài viết
          </button>
        </div>
      </div>

      {/* Comments Block */}
      <div className="blog-comments-container">
        <h2 className="blog-comment-section-title">Thảo luận ({comments.length})</h2>

        {/* Comment input area */}
        {user ? (
          <form onSubmit={handleAddComment} className="blog-comment-input-area">
            <textarea
              required
              placeholder="Viết bình luận của bạn..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              className="blog-comment-textarea"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentInput.trim()}
              className="blog-comment-submit-btn"
            >
              {submittingComment ? "Đang gửi..." : "Gửi"}
            </button>
          </form>
        ) : (
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 text-[#a37636] text-sm text-center rounded-lg mb-8">
            Vui lòng <Link href="/login" className="underline font-bold hover:text-[#c9a15a]">Đăng nhập</Link> để tham gia thảo luận.
          </div>
        )}

        {/* Comments List */}
        <div className="blog-comment-list">
          {comments.map((comment) => (
            <div key={comment._id} className="blog-comment-node">
              {/* Root Comment */}
              <div className="blog-comment-item">
                {comment.author.avatar ? (
                  <img src={comment.author.avatar} alt={comment.author.name} className="blog-comment-avatar" />
                ) : (
                  <div className="blog-comment-avatar-placeholder">
                    {comment.author.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="blog-comment-body">
                  <div className="blog-comment-author-info">
                    <span className="blog-comment-author-name">{comment.author.name}</span>
                    {getRoleBadge(comment.author.role) && (
                      <span className="blog-comment-role-badge">{getRoleBadge(comment.author.role)}</span>
                    )}
                    <span className="blog-comment-time">{formatDate(comment.createdAt)}</span>
                  </div>

                  <div className="blog-comment-content">{comment.content}</div>

                  <div className="blog-comment-actions">
                    <button
                      onClick={() => handleCommentLikeToggle(comment._id)}
                      className="blog-comment-action-btn"
                    >
                      Thích ({comment.likeCount})
                    </button>
                    {user && (
                      <button
                        onClick={() => {
                          setActiveReplyId(activeReplyId === comment._id ? null : comment._id);
                          setReplyInput("");
                        }}
                        className="blog-comment-action-btn"
                      >
                        Trả lời
                      </button>
                    )}
                    <button
                      onClick={() => openReportModal("Comment", comment._id)}
                      className="blog-comment-action-btn"
                    >
                      Báo cáo
                    </button>
                    {(user?.id === comment.author._id || ["admin", "staff"].includes(user?.role || "")) && (
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        className="blog-comment-action-btn !text-rose-500 hover:!text-rose-400 ml-auto"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Nested Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="blog-comment-replies-list">
                  {comment.replies.map((reply) => (
                    <div key={reply._id} className="blog-comment-item">
                      {reply.author.avatar ? (
                        <img src={reply.author.avatar} alt={reply.author.name} className="blog-comment-avatar" />
                      ) : (
                        <div className="blog-comment-avatar-placeholder">
                          {reply.author.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="blog-comment-body">
                        <div className="blog-comment-author-info">
                          <span className="blog-comment-author-name">{reply.author.name}</span>
                          {getRoleBadge(reply.author.role) && (
                            <span className="blog-comment-role-badge">{getRoleBadge(reply.author.role)}</span>
                          )}
                          <span className="blog-comment-time">{formatDate(reply.createdAt)}</span>
                        </div>

                        <div className="blog-comment-content">{reply.content}</div>

                        <div className="blog-comment-actions">
                          <button
                            onClick={() => handleCommentLikeToggle(reply._id)}
                            className="blog-comment-action-btn"
                          >
                            Thích ({reply.likeCount})
                          </button>
                          <button
                            onClick={() => openReportModal("Comment", reply._id)}
                            className="blog-comment-action-btn"
                          >
                            Báo cáo
                          </button>
                          {(user?.id === reply.author._id || ["admin", "staff"].includes(user?.role || "")) && (
                            <button
                              onClick={() => handleDeleteComment(reply._id)}
                              className="blog-comment-action-btn !text-rose-500 hover:!text-rose-400 ml-auto"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Reply Input */}
              {activeReplyId === comment._id && (
                <div className="blog-reply-input-wrapper">
                  <input
                    type="text"
                    required
                    placeholder="Viết câu trả lời..."
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    className="blog-form-input !py-1.5 !text-sm"
                  />
                  <button
                    onClick={() => handleAddReply(comment._id)}
                    disabled={!replyInput.trim()}
                    className="blog-comment-submit-btn !py-1.5"
                  >
                    Gửi
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="blog-modal-overlay">
          <div className="blog-modal-content !max-w-md">
            <div className="blog-modal-header">
              <h2 className="blog-modal-title">Báo cáo nội dung vi phạm</h2>
              <button onClick={() => setShowReportModal(false)} className="blog-modal-close-btn">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleReportSubmit}>
              <div className="blog-form-group">
                <label className="blog-form-label">Lý do báo cáo</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="blog-form-select"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="blog-form-group">
                <label className="blog-form-label">Mô tả chi tiết (tùy chọn)</label>
                <textarea
                  placeholder="Vui lòng cung cấp thêm thông tin để ban quản trị xử lý chính xác..."
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  className="blog-form-textarea"
                />
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="blog-comment-submit-btn !bg-transparent !border !border-amber-700/40 !text-amber-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="blog-comment-submit-btn"
                >
                  {submittingReport ? "Đang gửi..." : "Gửi báo cáo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#fdf9f1] border-2 border-[#c9a15a] rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative text-[#2c1a0e] max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-4 right-4 text-[#8c6a34] hover:text-[#4a1f24] font-bold text-base cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-xl font-extrabold text-[#4a1f24] uppercase mb-4 border-b border-[#e8d5b5] pb-3" style={{ fontFamily: '"Cinzel", serif' }}>
              LỊCH SỬ CHỈNH SỬA BÀI VIẾT
            </h3>

            <div className="overflow-y-auto pr-2 space-y-4 flex-1">
              {post.editHistory && post.editHistory.length > 0 ? (
                post.editHistory.map((item, idx) => (
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
                onClick={() => setShowHistoryModal(false)}
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
