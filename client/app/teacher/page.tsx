"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  rejectionSuggestions,
  teacherReviewApi,
  type LessonGame,
  type ReviewStatus,
  type TeacherReviewItem,
  type ReviewContentType,
} from "@/lib/teacherReviewApi";
import dynamic from "next/dynamic";
import { subscriptionApi } from "@/lib/subscriptionApi";
import type { LessonRequest } from "@/types/subscription";
import { api } from "@/lib/api";

const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => (
    <p className="text-center p-6 text-amber-800 font-medium">
      Đang tải game...
    </p>
  ),
});

const statusOptions: Array<{ value: ReviewStatus | "All"; label: string }> = [
  { value: "Pending_Review", label: "Chờ duyệt" },
  { value: "Published", label: "Đã xuất bản" },
  { value: "Rejected", label: "Bị từ chối" },
  { value: "All", label: "Tất cả trạng thái" },
];

function formatDate(value?: string) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusLabel(status: ReviewStatus) {
  if (status === "Pending_Review") return "Chờ duyệt";
  if (status === "Published") return "Đã xuất bản";
  return "Bị từ chối";
}

function formatCreatorDisplay(createdByStr: string) {
  if (!createdByStr) return { name: "Staff", email: "" };
  const parts = createdByStr.split(" (");
  if (parts.length === 2) {
    return {
      name: parts[0],
      email: parts[1].replace(")", ""),
    };
  }
  return { name: createdByStr, email: "" };
}

export default function TeacherPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const [items, setItems] = useState<TeacherReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "All">(
    "Pending_Review"
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectingItem, setRejectingItem] = useState<TeacherReviewItem | null>(
    null
  );
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  // New LessonRequest states
  const [activeDashboardTab, setActiveDashboardTab] = useState<"reviews" | "requests">("reviews");
  const [requests, setRequests] = useState<LessonRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [completingRequestId, setCompletingRequestId] = useState<string | null>(null);
  const [selectedPodcastId, setSelectedPodcastId] = useState("");
  const [availablePodcasts, setAvailablePodcasts] = useState<any[]>([]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  const loadItems = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await teacherReviewApi.getReviewItems();
      setItems(response.data);
    } catch {
      setError("Không thể tải danh sách bài học cần duyệt.");
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    setLoadingRequests(true);
    setError("");
    try {
      const data = await subscriptionApi.getTeacherLessonRequests();
      setRequests(data);
      
      const podcastsRes = await api.get<{ success: boolean; data: any[] }>("/podcasts");
      setAvailablePodcasts(podcastsRes.data.data || []);
    } catch (err) {
      setError("Không thể tải danh sách yêu cầu bài học.");
    } finally {
      setLoadingRequests(false);
      setLoading(false); // Fix indefinite loading state
    }
  };

  // Sync tab from URL query params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "requests") {
        setActiveDashboardTab("requests");
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      setLoading(true);
      const currentUser = await refreshUser();
      if (!mounted) return;

      if (!currentUser || !["teacher", "admin"].includes(currentUser.role)) {
        setLoading(false);
        return;
      }

      if (activeDashboardTab === "reviews") {
        await loadItems();
      } else {
        await loadRequests();
      }
    };

    boot();
    return () => {
      mounted = false;
    };
  }, [refreshUser, activeDashboardTab]);

  const handleAcceptRequest = async (requestId: string) => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await subscriptionApi.acceptLessonRequest(requestId);
      setMessage("Đã nhận yêu cầu soạn bài thành công!");
      await loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi nhận yêu cầu.");
    } finally {
      setSaving(false);
    }
  };

  const handleStartRequest = async (requestId: string) => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await subscriptionApi.startLessonRequest(requestId);
      setMessage("Đã bắt đầu soạn thảo bài học!");
      await loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi cập nhật trạng thái.");
    } finally {
      setSaving(false);
    }
  };

  const handleRejectRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setFeedbackError("Vui lòng nhập lý do từ chối.");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await subscriptionApi.rejectLessonRequest(rejectingRequestId!, rejectReason.trim());
      setMessage("Đã từ chối yêu cầu.");
      setRejectingRequestId(null);
      setRejectReason("");
      await loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi từ chối yêu cầu.");
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPodcastId) {
      setFeedbackError("Vui lòng chọn podcast liên kết.");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await subscriptionApi.completeLessonRequest(completingRequestId!, selectedPodcastId);
      setMessage("Đã hoàn thành yêu cầu soạn bài!");
      setCompletingRequestId(null);
      setSelectedPodcastId("");
      await loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi hoàn thành yêu cầu.");
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;
      const matchesQuery =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.summary.toLowerCase().includes(term);

      return matchesStatus && matchesQuery;
    });
  }, [items, query, statusFilter]);

  const stats = useMemo(
    () => ({
      pending: items.filter((item) => item.status === "Pending_Review").length,
      published: items.filter((item) => item.status === "Published").length,
      rejected: items.filter((item) => item.status === "Rejected").length,
      total: items.length,
    }),
    [items]
  );

  const handleApprove = async (item: TeacherReviewItem) => {
    const ok = window.confirm(
      `Duyệt ${item.type === "Lesson" ? "game" : "podcast"} "${item.title}" và cho phép hiển thị với học sinh?`
    );
    if (!ok) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await teacherReviewApi.approveContent(item.id, item.type);
      await loadItems();
      setMessage(`Đã duyệt ${item.type === "Lesson" ? "game" : "podcast"} và cập nhật trạng thái Published.`);
    } catch {
      setError(`Không thể duyệt ${item.type === "Lesson" ? "game" : "podcast"} này.`);
    } finally {
      setSaving(false);
    }
  };

  const openRejectForm = (item: TeacherReviewItem) => {
    setRejectingItem(item);
    setFeedback("");
    setFeedbackError("");
  };

  const handleReject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rejectingItem) return;

    const trimmedFeedback = feedback.trim();
    if (!trimmedFeedback) {
      setFeedbackError("Vui lòng nhập lý do từ chối trước khi gửi.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await teacherReviewApi.rejectContent(rejectingItem.id, rejectingItem.type, trimmedFeedback);
      await loadItems();
      setRejectingItem(null);
      setFeedback("");
      setMessage(`Đã từ chối ${rejectingItem.type === "Lesson" ? "game" : "podcast"} và lưu feedback cho Staff.`);
    } catch {
      setError(`Không thể từ chối ${rejectingItem.type === "Lesson" ? "game" : "podcast"} này.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <section className="admin-page admin-page--center">
        <div className="admin-loading">Đang tải Teacher Review Dashboard...</div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="admin-page admin-page--center">
        <div className="admin-access-card">
          <h1>Teacher Review</h1>
          <p>Bạn cần đăng nhập bằng tài khoản Teacher để duyệt bài học.</p>
          <Link href="/login" className="admin-primary-link">
            Đăng nhập
          </Link>
        </div>
      </section>
    );
  }

  if (!["teacher", "admin"].includes(user.role)) {
    return (
      <section className="admin-page admin-page--center">
        <div className="admin-access-card">
          <h1>Không có quyền truy cập</h1>
          <p>Trang này chỉ dành cho Teacher duyệt game & podcast Staff gửi lên.</p>
          <Link href="/" className="admin-primary-link">
            Về trang chủ
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-page teacher-page">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div>
            <p className="admin-kicker">SuViet360</p>
            <h1>Teacher Review</h1>
          </div>
          <div className="teacher-sidebar-note">
            <span>Tài khoản</span>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "16px 0" }}>
            <button
              onClick={() => setActiveDashboardTab("reviews")}
              style={{
                textAlign: "left",
                padding: "8px 12px",
                borderRadius: "4px",
                fontWeight: "600",
                fontSize: "14px",
                border: "none",
                cursor: "pointer",
                background: activeDashboardTab === "reviews" ? "#f5e7c9" : "transparent",
                color: activeDashboardTab === "reviews" ? "#5c3300" : "#78716c",
              }}
            >
              Duyệt Game & Podcast
            </button>
            <button
              onClick={() => setActiveDashboardTab("requests")}
              style={{
                textAlign: "left",
                padding: "8px 12px",
                borderRadius: "4px",
                fontWeight: "600",
                fontSize: "14px",
                border: "none",
                cursor: "pointer",
                background: activeDashboardTab === "requests" ? "#f5e7c9" : "transparent",
                color: activeDashboardTab === "requests" ? "#5c3300" : "#78716c",
              }}
            >
              Yêu cầu bài học (Pro)
            </button>
          </div>

          <div className="teacher-review-rules">
            <strong>Quyền Teacher</strong>
            <span>Xem chi tiết game/podcast</span>
            <span>Kiểm tra nội dung, game & audio</span>
            <span>Approve hoặc Reject kèm feedback</span>
          </div>
        </aside>

        <div className="admin-content">
          {(message || error) && (
            <div
              className={`admin-alert ${
                error ? "admin-alert--error" : "admin-alert--success"
              }`}
            >
              {error || message}
            </div>
          )}

          {activeDashboardTab === "reviews" ? (
            <div className="admin-stack">
              <div className="admin-heading">
                <div>
                  <p className="admin-kicker">Duyệt game & podcast</p>
                  <h2>Teacher Review Dashboard</h2>
                </div>
              </div>

              <div className="admin-stat-grid teacher-stat-grid">
                <StatCard label="Chờ duyệt" value={stats.pending} />
                <StatCard label="Đã xuất bản" value={stats.published} />
                <StatCard label="Bị từ chối" value={stats.rejected} />
                <StatCard label="Tổng mục" value={stats.total} />
              </div>

              <div className="admin-panel">
                <div className="teacher-filter-bar teacher-filter-bar--compact">
                  <input
                    className="admin-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm theo tiêu đề..."
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as ReviewStatus | "All")
                    }
                    className="teacher-select"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-panel-heading teacher-list-heading">
                  <h3>Danh sách game & podcast</h3>
                  <span>{filteredItems.length} mục</span>
                </div>

                <div className="admin-table teacher-review-table teacher-review-table--lesson">
                  <div className="admin-table-head">
                    <span>Tiêu đề</span>
                    <span>Loại</span>
                    <span>Người tạo</span>
                    <span>Ngày gửi</span>
                    <span>Trạng thái</span>
                    <span>Thao tác</span>
                  </div>
                  {filteredItems.map((item) => (
                    <div key={item.id} className="admin-table-row">
                      <div>
                        <strong>{item.title}</strong>
                        <small className="line-clamp-2">{item.summary}</small>
                      </div>
                      <span className={`teacher-type-badge ${item.type === "Podcast" ? "teacher-type-badge--podcast" : ""}`}>
                        {item.type === "Lesson" ? "Game" : item.type}
                      </span>
                      <span className="flex flex-col min-w-0 justify-center">
                        <span className="font-semibold text-amber-900 truncate block text-sm" title={formatCreatorDisplay(item.createdBy).name}>
                          {formatCreatorDisplay(item.createdBy).name}
                        </span>
                        {formatCreatorDisplay(item.createdBy).email && (
                          <span className="text-[10px] text-amber-600 truncate block mt-0.5" title={formatCreatorDisplay(item.createdBy).email}>
                            {formatCreatorDisplay(item.createdBy).email}
                          </span>
                        )}
                      </span>
                      <span>{formatDate(item.submittedAt)}</span>
                      <StatusBadge status={item.status} />
                      <div className="admin-row-actions teacher-row-actions">
                        <button type="button" onClick={() => setSelectedId(item.id)}>
                          Chi tiết
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredItems.length === 0 && (
                    <p className="admin-empty">
                      Không có game/podcast phù hợp với bộ lọc hiện tại.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="admin-stack">
              <div className="admin-heading">
                <div>
                  <p className="admin-kicker">Quản lý bài soạn</p>
                  <h2>Yêu cầu bài học từ học viên Pro</h2>
                </div>
              </div>

              <div className="admin-panel">
                <div className="admin-panel-heading teacher-list-heading">
                  <h3>Danh sách yêu cầu soạn bài</h3>
                  <span>{requests.length} yêu cầu</span>
                </div>

                <div className="admin-table teacher-review-table">
                  <div className="admin-table-head">
                    <span>Tiêu đề & Nội dung</span>
                    <span>Thời kỳ</span>
                    <span>Học sinh</span>
                    <span>Trạng thái</span>
                    <span>Thao tác</span>
                  </div>
                  {requests.map((req) => {
                    const assignedTeacherId = req.assignedTeacherId && (typeof req.assignedTeacherId === "object" ? req.assignedTeacherId._id : req.assignedTeacherId);
                    const isMyAssignment = assignedTeacherId === user.id;

                    return (
                      <div key={req._id} className="admin-table-row">
                        <div>
                          <strong>{req.title}</strong>
                          <small className="line-clamp-3 mt-1 block text-stone-600">{req.description}</small>
                          {req.teacherResponse && (
                            <div className="mt-2 text-rose-700 bg-rose-50 p-2 rounded border border-rose-200 text-xs">
                              <strong>Lý do từ chối:</strong> {req.teacherResponse}
                            </div>
                          )}
                          {req.resultPodcastId && (
                            <div className="mt-2 text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200 text-xs">
                              <strong>Podcast xuất bản:</strong> {typeof req.resultPodcastId === "object" ? req.resultPodcastId.title : req.resultPodcastId}
                            </div>
                          )}
                        </div>
                        <span>{req.historicalPeriod || "Chưa phân loại"}</span>
                        <span>
                          {req.requesterId && typeof req.requesterId === "object" ? (req.requesterId.name || req.requesterId.email) : "Học viên Pro"}
                        </span>
                        <span>
                          <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${
                            req.status === "Pending" ? "bg-amber-100 text-amber-800" :
                            req.status === "Accepted" ? "bg-blue-100 text-blue-800" :
                            req.status === "InProgress" ? "bg-purple-100 text-purple-800" :
                            req.status === "Completed" ? "bg-emerald-100 text-emerald-800" :
                            "bg-rose-100 text-rose-800"
                          }`}>
                            {req.status === "Pending" ? "Chờ duyệt" :
                             req.status === "Accepted" ? "Đã nhận" :
                             req.status === "InProgress" ? "Đang soạn" :
                             req.status === "Completed" ? "Hoàn thành" :
                             "Từ chối"}
                          </span>
                          {req.status !== "Pending" && (
                            <small className="block mt-1 text-[10px] text-stone-500">
                              GV: {req.assignedTeacherId && typeof req.assignedTeacherId === "object" ? req.assignedTeacherId.name : "N/A"}
                            </small>
                          )}
                        </span>
                        <div className="admin-row-actions teacher-row-actions flex flex-col gap-1.5 justify-center">
                          {req.status === "Pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAcceptRequest(req._id)}
                                className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                              >
                                Nhận soạn
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingRequestId(req._id);
                                  setRejectReason("");
                                  setFeedbackError("");
                                }}
                                className="px-2 py-1 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700"
                              >
                                Từ chối
                              </button>
                            </>
                          )}
                          {req.status === "Accepted" && isMyAssignment && (
                            <button
                              type="button"
                              onClick={() => handleStartRequest(req._id)}
                              className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-semibold hover:bg-purple-700"
                            >
                              Bắt đầu soạn
                            </button>
                          )}
                          {req.status === "InProgress" && isMyAssignment && (
                            <button
                              type="button"
                              onClick={() => {
                                setCompletingRequestId(req._id);
                                setSelectedPodcastId("");
                                setFeedbackError("");
                              }}
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                            >
                              Hoàn thành
                            </button>
                          )}
                          {req.status !== "Pending" && !isMyAssignment && (
                            <span className="text-[10px] text-stone-400 italic">Không có thao tác</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {requests.length === 0 && (
                    <p className="admin-empty">
                      Không có yêu cầu bài học nào cần xử lý.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedItem && (
        <ContentDetailModal
          item={selectedItem}
          saving={saving}
          onClose={() => setSelectedId(null)}
          onApprove={handleApprove}
          onReject={openRejectForm}
        />
      )}

      {rejectingItem && (
        <RejectModal
          item={rejectingItem}
          feedback={feedback}
          feedbackError={feedbackError}
          saving={saving}
          onFeedbackChange={(value) => {
            setFeedback(value);
            setFeedbackError("");
          }}
          onClose={() => setRejectingItem(null)}
          onSubmit={handleReject}
        />
      )}

      {rejectingRequestId && (
        <div className="teacher-modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 100 }}>
          <div className="teacher-modal teacher-modal--compact" style={{ width: "450px" }}>
            <div className="teacher-modal-header" style={{ borderBottom: "1px solid #c9a15a", paddingBottom: "10px", marginBottom: "15px" }}>
              <h3>Từ chối yêu cầu bài học</h3>
              <button type="button" onClick={() => setRejectingRequestId(null)} className="teacher-close-button">✕</button>
            </div>
            <form onSubmit={handleRejectRequestSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Lý do từ chối *</span>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do từ chối để gửi cho học viên..."
                  rows={4}
                  required
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1c2a5", borderRadius: "4px", outline: "none", resize: "none" }}
                />
              </div>
              {feedbackError && <p style={{ fontSize: "11px", color: "#e11d48", margin: 0 }}>{feedbackError}</p>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setRejectingRequestId(null)}
                  style={{ padding: "6px 12px", fontSize: "12px", background: "#f5f5f4", border: "1px solid #e7e5e4", borderRadius: "4px", cursor: "pointer" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: "6px 12px", fontSize: "12px", background: "#be123c", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                >
                  {saving ? "Đang xử lý..." : "Xác nhận từ chối"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {completingRequestId && (
        <div className="teacher-modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 100 }}>
          <div className="teacher-modal teacher-modal--compact" style={{ width: "450px" }}>
            <div className="teacher-modal-header" style={{ borderBottom: "1px solid #c9a15a", paddingBottom: "10px", marginBottom: "15px" }}>
              <h3>Hoàn thành bài soạn</h3>
              <button type="button" onClick={() => setCompletingRequestId(null)} className="teacher-close-button">✕</button>
            </div>
            <form onSubmit={handleCompleteRequestSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Chọn podcast đã xuất bản *</span>
                <select
                  value={selectedPodcastId}
                  onChange={(e) => setSelectedPodcastId(e.target.value)}
                  required
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1c2a5", borderRadius: "4px", outline: "none", background: "white" }}
                >
                  <option value="">-- Chọn podcast liên kết --</option>
                  {availablePodcasts.map((podcast) => (
                    <option key={podcast._id} value={podcast._id}>
                      {podcast.title} ({podcast._id})
                    </option>
                  ))}
                </select>
              </div>
              {feedbackError && <p style={{ fontSize: "11px", color: "#e11d48", margin: 0 }}>{feedbackError}</p>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setCompletingRequestId(null)}
                  style={{ padding: "6px 12px", fontSize: "12px", background: "#f5f5f4", border: "1px solid #e7e5e4", borderRadius: "4px", cursor: "pointer" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: "6px 12px", fontSize: "12px", background: "#15803d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                >
                  {saving ? "Đang xử lý..." : "Hoàn thành & Liên kết"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className={`teacher-status teacher-status--${status.toLowerCase()}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function PodcastPreview({
  podcastDetails,
  title,
}: {
  podcastDetails: any;
  title: string;
}) {
  return (
    <div className="teacher-preview">
      <div className="teacher-preview-header">
        <h3>Tài nguyên Podcast</h3>
        <span>File âm thanh & ảnh đại diện</span>
      </div>

      <div className="teacher-section">
        <h3>Ảnh giao diện</h3>
        <div className="teacher-podcast-thumb-wrapper" style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden", borderRadius: "8px", border: "1px solid #d1c2a5" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={podcastDetails.thumbnail}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>

      <div className="teacher-section">
        <h3>Trình phát Audio</h3>
        <audio
          src={podcastDetails.audioUrl}
          controls
          style={{ width: "100%" }}
        />
        <div className="mt-2 text-xs text-amber-800 font-medium">
          Thời lượng: {formatDuration(podcastDetails.duration)}
        </div>
      </div>

      <div className="teacher-section teacher-section--tight">
        <h3>Thông tin chi tiết</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "14px", marginTop: "4px" }}>
          <div>
            <span style={{ color: "#92400e", display: "block", fontSize: "12px", fontWeight: "600" }}>Chủ đề:</span>
            <span style={{ fontWeight: "500" }}>{podcastDetails.category}</span>
          </div>
          <div>
            <span style={{ color: "#92400e", display: "block", fontSize: "12px", fontWeight: "600" }}>Trình độ:</span>
            <span style={{ fontWeight: "500" }}>{podcastDetails.level}</span>
          </div>
        </div>
      </div>

      {podcastDetails.lessonId && (
        <div className="teacher-section teacher-section--tight">
          <h3>Game liên kết</h3>
          <p style={{ fontWeight: "600", color: "#451a03" }}>
            {typeof podcastDetails.lessonId === "object"
              ? podcastDetails.lessonId.title
              : "Đã liên kết với Game"}
          </p>
        </div>
      )}
    </div>
  );
}

function ContentDetailModal({
  item,
  saving,
  onClose,
  onApprove,
  onReject,
}: {
  item: TeacherReviewItem;
  saving: boolean;
  onClose: () => void;
  onApprove: (item: TeacherReviewItem) => void;
  onReject: (item: TeacherReviewItem) => void;
}) {
  const canReview = item.status === "Pending_Review";

  return (
    <div className="teacher-modal-backdrop" role="dialog" aria-modal="true">
      <div className="teacher-modal teacher-detail-modal">
        <div className="teacher-modal-header">
          <div>
            <p className="admin-kicker">Chi tiết {item.type === "Lesson" ? "game" : "podcast"}</p>
            <h2>{item.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="teacher-close-button">
            Đóng
          </button>
        </div>

        <div className="teacher-detail-grid">
          <div className="teacher-detail-main">
            <InfoRow label="Loại nội dung" value={item.type === "Lesson" ? "Game" : item.type} />
            <InfoRow label="Người tạo" value={item.createdBy} />
            <InfoRow label="Ngày gửi duyệt" value={formatDate(item.submittedAt)} />
            <div className="teacher-info-row">
              <span>Trạng thái hiện tại</span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <StatusBadge status={item.status} />
                {item.isDraftUpdate && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    Bản thảo chỉnh sửa
                  </span>
                )}
              </div>
            </div>

            <div className="teacher-section">
              <h3>Nội dung tóm tắt</h3>
              <p style={{ whiteSpace: "pre-wrap" }}>{item.summary}</p>
            </div>

            {item.reviewFeedback && (
              <div className="teacher-feedback-box">
                <strong>Feedback từ chối</strong>
                <p>{item.reviewFeedback}</p>
              </div>
            )}
          </div>

          <div className="teacher-preview-column">
            {item.type === "Lesson" && item.game ? (
              <LessonGamePreview game={item.game} lessonTitle={item.title} />
            ) : item.type === "Podcast" && item.podcastDetails ? (
              <PodcastPreview podcastDetails={item.podcastDetails} title={item.title} />
            ) : (
              <div className="teacher-preview">
                <p className="admin-note">Không có xem trước cho mục này.</p>
              </div>
            )}
          </div>
        </div>

        <div className="teacher-modal-actions">
          {canReview ? (
            <>
              <button
                type="button"
                className="teacher-approve-button"
                onClick={() => onApprove(item)}
                disabled={saving}
              >
                {saving ? "Đang xử lý..." : "Approve"}
              </button>
              <button
                type="button"
                className="teacher-reject-button"
                onClick={() => onReject(item)}
                disabled={saving}
              >
                Reject
              </button>
            </>
          ) : (
            <span className="admin-note">
              Mục này đã {item.status === "Published" ? "được duyệt" : "bị từ chối"},
              Teacher chỉ có quyền xem lại.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="teacher-info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LessonGamePreview({
  game,
  lessonTitle,
}: {
  game: LessonGame;
  lessonTitle: string;
}) {
  const [isZoomed, setIsZoomed] = useState(false);
  const animationEntries = Object.entries(game.character.animations || {});

  return (
    <div className="teacher-preview">
      <div className="teacher-preview-header">
        <h3>Game trong lesson</h3>
        <span>Tilemap + assets</span>
      </div>

      <div className="teacher-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h3 style={{ margin: 0 }}>Màn hình chơi thử</h3>
          <button
            type="button"
            onClick={() => setIsZoomed(true)}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              fontFamily: "Cinzel, serif",
              background: "rgba(244, 231, 201, 0.6)",
              border: "1px solid #c9a15a",
              borderRadius: "4px",
              cursor: "pointer",
              color: "#5c3300",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <span>Phóng to ⛶</span>
          </button>
        </div>
        <div className="teacher-game-wrapper" style={{ width: "100%", aspectRatio: "4/3", position: "relative", borderRadius: "8px", overflow: "hidden", border: "1px solid #d1c2a5", backgroundColor: "#000" }}>
          <style>{`
            .teacher-game-wrapper > div {
              height: 100% !important;
              min-height: unset !important;
            }
            .teacher-game-wrapper canvas {
              max-width: 100% !important;
              max-height: 100% !important;
              object-fit: contain;
            }
            /* Thu nhỏ hộp thoại câu hỏi và chữ trên màn hình chơi thử của giáo viên */
            .teacher-game-wrapper > div > div {
              bottom: 8px !important;
              padding: 8px 10px !important;
              border-width: 1.5px !important;
              border-radius: 6px !important;
              max-width: 90% !important;
              width: 90% !important;
            }
            .teacher-game-wrapper > div > div div {
              font-size: 10px !important;
              line-height: 1.2 !important;
              margin-bottom: 4px !important;
              padding-bottom: 4px !important;
            }
            .teacher-game-wrapper > div > div div:nth-child(2) {
              font-size: 9px !important;
              margin-bottom: 4px !important;
            }
            .teacher-game-wrapper > div > div > div:last-child {
              gap: 3px !important;
              margin-top: 4px !important;
            }
            .teacher-game-wrapper .quiz-opt-btn {
              padding: 4px 6px !important;
              font-size: 9px !important;
              border-width: 1px !important;
              border-radius: 4px !important;
              line-height: 1.1 !important;
            }
          `}</style>
          {!isZoomed ? (
            <PhaserGame lessonGame={game} />
          ) : (
            <div style={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center", color: "#bba476", fontWeight: "600", fontSize: "11px", fontFamily: "Cinzel, serif" }}>
              Đang chơi ở chế độ phóng to...
            </div>
          )}
        </div>
      </div>

      {isZoomed && (
        <div className="teacher-modal-backdrop" style={{ zIndex: 1000 }}>
          <div className="teacher-modal" style={{ width: "min(900px, 95vw)", maxHeight: "95vh", display: "flex", flexDirection: "column", padding: "20px" }}>
            <div className="teacher-modal-header" style={{ borderBottom: "1px solid #c9a15a", paddingBottom: "10px", marginBottom: "15px" }}>
              <div>
                <p className="admin-kicker">Chế độ phóng to</p>
                <h2 style={{ fontSize: "20px", color: "#5c3300", fontFamily: "Cinzel, serif", margin: 0 }}>{lessonTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="teacher-close-button"
                style={{ padding: "6px 12px" }}
              >
                Thu nhỏ ⛶
              </button>
            </div>
            
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#000", borderRadius: "8px", overflow: "hidden", aspectRatio: "4/3", border: "2px solid #8B6914", padding: "10px" }}>
              <PhaserGame lessonGame={game} />
            </div>
            
            <div style={{ marginTop: "12px", fontSize: "12px", color: "#92400e", fontWeight: "500", textAlign: "center", fontFamily: "sans-serif" }}>
              * Sử dụng các phím mũi tên để di chuyển nhân vật. Đến gần dấu hỏi chấm để hiển thị câu hỏi trắc nghiệm đầy đủ.
            </div>
          </div>
        </div>
      )}

      <div className="teacher-section teacher-section--tight">
        <h3>Spawn point</h3>
        <p>
          X: {game.spawnPoint.x}, Y: {game.spawnPoint.y}
        </p>
      </div>

      <div className="teacher-section teacher-section--tight">
        <h3>Tilemap JSON</h3>
        <a
          href={game.tilemapJsonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="teacher-resource-link"
        >
          {game.tilemapJsonUrl}
        </a>
      </div>

      <div className="teacher-section teacher-section--tight">
        <h3>Tilesets</h3>
        {game.tilesets.length > 0 ? (
          <div className="teacher-asset-grid">
            {game.tilesets.map((tileset) => (
              <div key={tileset.name} className="teacher-asset-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tileset.imageUrl} alt={`${lessonTitle} ${tileset.name}`} />
                <span>{tileset.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-note">Lesson chưa có tileset.</p>
        )}
      </div>

      <div className="teacher-section teacher-section--tight">
        <h3>Animations</h3>
        {animationEntries.length > 0 ? (
          <div className="teacher-animation-list">
            {animationEntries.map(([name, frames]) => (
              <div key={name}>
                <strong>{name}</strong>
                <div className="teacher-asset-grid">
                  {frames.slice(0, 6).map((frame) => (
                    <div key={frame.key} className="teacher-asset-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={frame.imageUrl} alt={frame.key} />
                      <span>{frame.key}</span>
                    </div>
                  ))}
                </div>
                {frames.length > 6 && (
                  <p className="admin-note">+{frames.length - 6} frame khác</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-note">Lesson chưa có animation nhân vật.</p>
        )}
      </div>
    </div>
  );
}

function RejectModal({
  item,
  feedback,
  feedbackError,
  saving,
  onFeedbackChange,
  onClose,
  onSubmit,
}: {
  item: TeacherReviewItem;
  feedback: string;
  feedbackError: string;
  saving: boolean;
  onFeedbackChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="teacher-modal-backdrop" role="dialog" aria-modal="true">
      <form className="teacher-modal teacher-reject-modal" onSubmit={onSubmit}>
        <div className="teacher-modal-header">
          <div>
            <p className="admin-kicker">Reject {item.type === "Lesson" ? "game" : "podcast"}</p>
            <h2>{item.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="teacher-close-button">
            Đóng
          </button>
        </div>

        <label className="teacher-feedback-field">
          <span>Lý do từ chối *</span>
          <textarea
            value={feedback}
            onChange={(event) => onFeedbackChange(event.target.value)}
            rows={5}
            placeholder={`Nhập feedback cụ thể để Staff chỉnh sửa ${item.type === "Lesson" ? "game" : "podcast"}...`}
          />
        </label>
        {feedbackError && <p className="teacher-field-error">{feedbackError}</p>}

        <div className="teacher-suggestion-list">
          {rejectionSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() =>
                onFeedbackChange(
                  feedback.trim()
                    ? `${feedback.trim()}; ${suggestion}`
                    : suggestion
                )
              }
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="teacher-modal-actions">
          <button type="submit" className="teacher-reject-button" disabled={saving}>
            {saving ? "Đang gửi..." : "Gửi feedback từ chối"}
          </button>
          <button type="button" className="teacher-secondary-button" onClick={onClose}>
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
}
