"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { teacherReviewApi, type ReviewStatus, type TeacherReviewItem } from "@/lib/teacherReviewApi";
import { ContentDetailModal, RejectModal, StatCard } from "@/components/teacher/TeacherModals";

const statusOptions: Array<{ value: ReviewStatus | "All"; label: string }> = [
  { value: "Pending_Review", label: "Chờ duyệt" }, { value: "Published", label: "Đã xuất bản" },
  { value: "Rejected", label: "Bị từ chối" }, { value: "All", label: "Tất cả" },
];

function formatDate(value?: string) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function getStatusLabel(status: ReviewStatus) {
  if (status === "Pending_Review") return "Chờ duyệt"; if (status === "Published") return "Đã xuất bản"; return "Bị từ chối";
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  return <span className={`teacher-status teacher-status--${status.toLowerCase()}`}>{getStatusLabel(status)}</span>;
}

function formatCreatorDisplay(s: string) {
  if (!s) return { name: "Staff", email: "" };
  const parts = s.split(" (");
  return parts.length === 2 ? { name: parts[0], email: parts[1].replace(")", "") } : { name: s, email: "" };
}

export default function TeacherPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const [items, setItems] = useState<TeacherReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "All">("Pending_Review");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectingItem, setRejectingItem] = useState<TeacherReviewItem | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  const selectedItem = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId]);

  const loadItems = async () => { setLoading(true); setError(""); try { const r = await teacherReviewApi.getReviewItems(); setItems(r.data); } catch { setError("Không tải được."); } finally { setLoading(false); } };

  useEffect(() => { let m = true; const boot = async () => { setLoading(true); const u = await refreshUser(); if (!m) return; if (!u || !["teacher","admin"].includes(u.role)) { setLoading(false); return; } await loadItems(); }; boot(); return () => { m = false; }; }, [refreshUser]);

  const filtered = useMemo(() => items.filter((i) => {
    const t = query.trim().toLowerCase();
    return (statusFilter === "All" || i.status === statusFilter) && (!t || i.title.toLowerCase().includes(t) || i.summary.toLowerCase().includes(t));
  }), [items, query, statusFilter]);

  const stats = useMemo(() => ({ pending: items.filter(i => i.status === "Pending_Review").length, published: items.filter(i => i.status === "Published").length, rejected: items.filter(i => i.status === "Rejected").length, total: items.length }), [items]);

  const handleApprove = async (item: TeacherReviewItem) => {
    if (!confirm(`Duyệt "${item.title}"?`)) return;
    setSaving(true); setMessage(""); setError("");
    try { await teacherReviewApi.approveContent(item.id, item.type); await loadItems(); setMessage("Đã duyệt."); } catch { setError("Lỗi."); } finally { setSaving(false); }
  };

  const handleReject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rejectingItem || !feedback.trim()) { setFeedbackError("Nhập lý do."); return; }
    setSaving(true); setMessage(""); setError("");
    try { await teacherReviewApi.rejectContent(rejectingItem.id, rejectingItem.type, feedback.trim()); await loadItems(); setRejectingItem(null); setFeedback(""); setMessage("Đã từ chối."); } catch { setError("Lỗi."); } finally { setSaving(false); }
  };

  if (loading || isLoading) return <section className="admin-page admin-page--center"><div className="admin-loading">Đang tải...</div></section>;
  if (!user) return <section className="admin-page admin-page--center"><div className="admin-access-card"><h1>Teacher Review</h1><p>Cần đăng nhập.</p><Link href="/login" className="admin-primary-link">Đăng nhập</Link></div></section>;
  if (!["teacher","admin"].includes(user.role)) return <section className="admin-page admin-page--center"><div className="admin-access-card"><h1>Không có quyền</h1><p>Trang này chỉ dành cho Teacher.</p><Link href="/" className="admin-primary-link">Về trang chủ</Link></div></section>;

  return (
    <section className="admin-page teacher-page">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div><p className="admin-kicker">SuViet360</p><h1>Teacher Review</h1></div>
          <div className="teacher-sidebar-note"><span>Tài khoản</span><strong>{user.name}</strong><small>{user.email}</small></div>
          <div className="teacher-review-rules"><strong>Quyền Teacher</strong><span>Xem chi tiết lesson/podcast</span><span>Kiểm tra nội dung, game & audio</span><span>Approve hoặc Reject kèm feedback</span></div>
        </aside>
        <div className="admin-content">
          {(message || error) && <div className={`admin-alert ${error ? "admin-alert--error" : "admin-alert--success"}`}>{error || message}</div>}
          <div className="admin-stack">
            <div className="admin-heading"><div><p className="admin-kicker">Duyệt lesson & podcast</p><h2>Teacher Review Dashboard</h2></div></div>
            <div className="admin-stat-grid teacher-stat-grid"><StatCard label="Chờ duyệt" value={stats.pending}/><StatCard label="Đã xuất bản" value={stats.published}/><StatCard label="Bị từ chối" value={stats.rejected}/><StatCard label="Tổng" value={stats.total}/></div>
            <div className="admin-panel">
              <div className="teacher-filter-bar teacher-filter-bar--compact"><input className="admin-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tiêu đề..."/><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ReviewStatus | "All")} className="teacher-select">{statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div className="admin-panel-heading teacher-list-heading"><h3>Danh sách</h3><span>{filtered.length} mục</span></div>
              <div className="admin-table teacher-review-table teacher-review-table--lesson">
                <div className="admin-table-head"><span>Tiêu đề</span><span>Loại</span><span>Người tạo</span><span>Ngày gửi</span><span>Trạng thái</span><span>Thao tác</span></div>
                {filtered.map((item) => (
                  <div key={item.id} className="admin-table-row">
                    <div><strong>{item.title}</strong>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {item.chapter && <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">📖 {item.chapter.title}</span>}
                        {item.grade && <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Lớp {item.grade}</span>}
                        {item.type === "Lesson" && item.podcast && <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">🎙️ Podcast</span>}
                      </div>
                      <small className="line-clamp-2">{item.summary}</small>
                    </div>
                    <span className={`teacher-type-badge ${item.type === "Podcast" ? "teacher-type-badge--podcast" : ""}`}>{item.type}</span>
                    <span className="flex flex-col min-w-0 justify-center"><span className="font-semibold text-amber-900 truncate block text-sm">{formatCreatorDisplay(item.createdBy).name}</span>{formatCreatorDisplay(item.createdBy).email && <span className="text-[10px] text-amber-600 truncate block mt-0.5">{formatCreatorDisplay(item.createdBy).email}</span>}</span>
                    <span>{formatDate(item.submittedAt)}</span>
                    <StatusBadge status={item.status}/>
                    <div className="admin-row-actions teacher-row-actions"><button type="button" onClick={() => setSelectedId(item.id)}>Chi tiết</button></div>
                  </div>
                ))}
                {!filtered.length && <p className="admin-empty">Không có mục phù hợp.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
      {selectedItem && <ContentDetailModal item={selectedItem} saving={saving} onClose={() => setSelectedId(null)} onApprove={handleApprove} onReject={(item) => { setRejectingItem(item); setFeedback(""); setFeedbackError(""); }}/>}
      {rejectingItem && <RejectModal item={rejectingItem} feedback={feedback} feedbackError={feedbackError} saving={saving} onFeedbackChange={(v) => { setFeedback(v); setFeedbackError(""); }} onClose={() => setRejectingItem(null)} onSubmit={handleReject}/>}
    </section>
  );
}
