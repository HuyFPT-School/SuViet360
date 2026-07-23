import React, { useState, useEffect } from "react";
import { blogApi } from "@/lib/blogApi";
import type { BlogPost, BlogReport } from "@/types/blog";

type BlogTabProps = {
  setMessage: (msg: { type: "error" | "success"; text: string } | null) => void;
  onUpdateCounts?: (pendingCount: number, reportsCount: number) => void;
};

export default function BlogTab({ setMessage, onUpdateCounts }: BlogTabProps) {
  const [pendingPosts, setPendingPosts] = useState<BlogPost[]>([]);
  const [pendingReports, setPendingReports] = useState<BlogReport[]>([]);
  const [blogLoading, setBlogLoading] = useState(false);
  const [rejectingPostId, setRejectingPostId] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");

  const fetchBlogModeration = async () => {
    setBlogLoading(true);
    try {
      const postsRes = await blogApi.getPendingPosts();
      const reportsRes = await blogApi.getPendingReports();
      if (postsRes.success) setPendingPosts(postsRes.data);
      if (reportsRes.success) setPendingReports(reportsRes.data);

      if (onUpdateCounts && postsRes.success && reportsRes.success) {
        onUpdateCounts(postsRes.data.length, reportsRes.data.length);
      }
    } catch (err) {
      console.error("Failed to load blog moderation data:", err);
      setMessage({ type: "error", text: "Không thể tải dữ liệu diễn đàn." });
    } finally {
      setBlogLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogModeration();
  }, []);

  const handleApprovePost = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn duyệt bài viết này?")) return;
    try {
      const res = await blogApi.approvePost(id);
      if (res.success) {
        setMessage({ type: "success", text: "Đã duyệt bài viết thành công." });
        fetchBlogModeration();
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Không thể duyệt bài viết." });
    }
  };

  const handleRejectPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingPostId || !rejectFeedback.trim()) return;
    try {
      const res = await blogApi.rejectPost(rejectingPostId, rejectFeedback.trim());
      if (res.success) {
        setMessage({ type: "success", text: "Đã từ chối bài viết thành công." });
        setRejectingPostId(null);
        setRejectFeedback("");
        fetchBlogModeration();
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Không thể từ chối bài viết." });
    }
  };

  const handleResolveReport = async (id: string, action: "delete" | "dismiss") => {
    const actionText = action === "delete" ? "XÓA nội dung vi phạm" : "BỎ QUA báo cáo này";
    if (!confirm(`Bạn có chắc chắn muốn ${actionText}?`)) return;
    try {
      const res = await blogApi.resolveReport(id, action);
      if (res.success) {
        setMessage({ type: "success", text: `Đã xử lý báo cáo thành công: ${actionText}.` });
        fetchBlogModeration();
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Không thể xử lý báo cáo." });
    }
  };

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1.15fr_1.15fr]">
        {/* Left side: Pending Posts */}
        <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm flex flex-col">
          <div className="border-b border-amber-100 px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-amber-900">
              Bài viết chờ duyệt ({pendingPosts.length})
            </h2>
          </div>
          
          {blogLoading && pendingPosts.length === 0 ? (
            <div className="p-8 text-center text-amber-800 font-medium">Đang tải danh sách bài viết...</div>
          ) : pendingPosts.length === 0 ? (
            <div className="p-8 text-center text-amber-850 italic">Không có bài viết nào đang chờ duyệt.</div>
          ) : (
            <div className="divide-y divide-amber-100 max-h-[700px] overflow-y-auto">
              {pendingPosts.map((post) => (
                <div key={post._id} className="p-5 hover:bg-amber-50/30 transition">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="inline-block text-[10px] uppercase font-bold text-amber-700 bg-amber-150 px-2 py-0.5 rounded">
                          {post.category}
                        </span>
                        {post.hasPendingDraft ? (
                          <span className="text-[10px] uppercase font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded border border-amber-400">
                            Bản chỉnh sửa chờ ghi đè
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            Bài mới tạo
                          </span>
                        )}
                      </div>

                      {post.hasPendingDraft && post.pendingDraft ? (
                        <div className="space-y-2 mb-3 bg-amber-50/70 p-3 rounded-lg border border-amber-200 text-xs">
                          <div>
                            <span className="font-bold text-amber-900 block mb-0.5">Tiêu đề & Nội dung mới (Chờ ghi đè):</span>
                            <h4 className="font-bold text-amber-950">{post.pendingDraft.title || post.title}</h4>
                            <p className="text-gray-800 line-clamp-4 whitespace-pre-wrap">{post.pendingDraft.content}</p>
                          </div>
                          <div className="pt-2 border-t border-amber-200/60 text-[11px] text-gray-500">
                            <span className="font-semibold text-gray-700">Nội dung đang hiển thị công khai trên web:</span>
                            <p className="line-clamp-2 italic">{post.content}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-semibold text-amber-950 mb-1">{post.title}</h3>
                          <p className="text-[11px] text-amber-800/80 mb-2">
                            Người đăng: <strong>{post.author.name}</strong> • Lúc {new Date(post.createdAt).toLocaleString("vi-VN")}
                          </p>
                          <p className="text-xs text-gray-700 line-clamp-3 mb-3 whitespace-pre-wrap">{post.content}</p>
                        </>
                      )}
                      
                      {post.images && post.images.length > 0 && (
                        <div className="flex gap-2 mb-3">
                          {post.images.map((img) => (
                            <img key={img.publicId} src={img.url} className="w-14 h-14 object-cover rounded border border-amber-200" alt="thumbnail" />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleApprovePost(post._id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                      >
                        ✓ Duyệt
                      </button>
                      <button
                        onClick={() => setRejectingPostId(post._id)}
                        className="rounded-lg border border-red-250 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-655 hover:bg-red-100 transition"
                      >
                        ✕ Từ chối
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right side: Flagged Reports */}
        <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm flex flex-col">
          <div className="border-b border-amber-100 px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-amber-900">
              Báo cáo vi phạm ({pendingReports.length})
            </h2>
          </div>

          {blogLoading && pendingReports.length === 0 ? (
            <div className="p-8 text-center text-amber-800 font-medium">Đang tải danh sách báo cáo...</div>
          ) : pendingReports.length === 0 ? (
            <div className="p-8 text-center text-amber-850 italic">Không có báo cáo vi phạm nào chưa xử lý.</div>
          ) : (
            <div className="divide-y divide-amber-100 max-h-[700px] overflow-y-auto">
              {pendingReports.map((report) => (
                <div key={report._id} className="p-5 hover:bg-amber-50/30 transition">
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded uppercase">
                        {report.reason === "Spam" ? "Spam" :
                         report.reason === "Offensive_Language" ? "Từ ngữ thô tục" :
                         report.reason === "Historical_Inaccuracy" ? "Sai lệch lịch sử" :
                         report.reason === "Harassment" ? "Quấy rối" : "Lý do khác"}
                      </span>
                      <span className="text-xs text-amber-855">
                        Người báo cáo: <strong>{report.reporter.name}</strong>
                      </span>
                    </div>
                    {report.description && (
                      <p className="text-xs text-amber-800 italic bg-amber-50/50 p-2 rounded border border-amber-100">
                        "{report.description}"
                      </p>
                    )}
                  </div>

                  {/* Flagged Content Preview */}
                  {report.target ? (
                    <div className="border border-red-200 bg-rose-50/10 p-3 rounded-lg text-sm mb-3">
                      <p className="text-[10px] font-bold text-red-700 uppercase mb-1">
                        Nội dung bị báo cáo ({report.targetType === "Post" ? "Bài viết" : "Bình luận"})
                      </p>
                      {report.targetType === "Post" ? (
                        <>
                          <h4 className="font-semibold text-amber-950 mb-1">{report.target.title}</h4>
                          <p className="text-xs text-gray-600 line-clamp-2">{report.target.content}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-700 mb-1">"{report.target.content}"</p>
                          {report.target.post && (
                            <p className="text-[10px] text-gray-500">
                              Thuộc bài viết: <strong>{report.target.post.title}</strong>
                            </p>
                          )}
                        </>
                      )}
                      <p className="text-[11px] text-amber-800/80 mt-1">
                        Tác giả: <strong>{report.target.author?.name || "Không rõ"}</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 bg-gray-50 text-xs text-gray-500 rounded mb-3 italic">
                      [Nội dung đã bị xóa trước đó]
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleResolveReport(report._id, "dismiss")}
                      className="rounded bg-amber-100 text-amber-850 px-3 py-1.5 text-xs font-semibold hover:bg-amber-250 transition"
                    >
                      Bỏ qua báo cáo
                    </button>
                    {report.target && (
                      <button
                        onClick={() => handleResolveReport(report._id, "delete")}
                        className="rounded bg-red-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-red-750 transition"
                      >
                        Xóa nội dung vi phạm
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Rejection Feedback Modal Overlay */}
      {rejectingPostId && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div className="bg-[#FFFBF2] border-2 border-amber-700 rounded-xl p-6 w-[90%] max-w-[450px] shadow-2xl">
            <h3 className="font-semibold text-lg text-amber-900 mb-4 tracking-wider uppercase" style={{ fontFamily: "Cinzel, serif" }}>
              Từ chối bài viết
            </h3>
            <form onSubmit={handleRejectPostSubmit}>
              <textarea
                required
                placeholder="Nhập lý do từ chối bài viết (gửi phản hồi cho người viết bài)..."
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                className="w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[100px] mb-4"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setRejectingPostId(null); setRejectFeedback(""); }}
                  className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Gửi từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
