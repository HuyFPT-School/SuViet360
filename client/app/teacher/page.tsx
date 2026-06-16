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

      await loadItems();
    };

    boot();
    return () => {
      mounted = false;
    };
  }, [refreshUser]);

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
      `Duyệt ${item.type === "Lesson" ? "bài học" : "podcast"} "${item.title}" và cho phép hiển thị với học sinh?`
    );
    if (!ok) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await teacherReviewApi.approveContent(item.id, item.type);
      await loadItems();
      setMessage(`Đã duyệt ${item.type === "Lesson" ? "bài học" : "podcast"} và cập nhật trạng thái Published.`);
    } catch {
      setError(`Không thể duyệt ${item.type === "Lesson" ? "bài học" : "podcast"} này.`);
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
      setMessage(`Đã từ chối ${rejectingItem.type === "Lesson" ? "bài học" : "podcast"} và lưu feedback cho Staff.`);
    } catch {
      setError(`Không thể từ chối ${rejectingItem.type === "Lesson" ? "bài học" : "podcast"} này.`);
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
          <p>Trang này chỉ dành cho Teacher duyệt lesson Staff gửi lên.</p>
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
          <div className="teacher-review-rules">
            <strong>Quyền Teacher</strong>
            <span>Xem chi tiết lesson/podcast</span>
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

          <div className="admin-stack">
            <div className="admin-heading">
              <div>
                <p className="admin-kicker">Duyệt lesson & podcast</p>
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
                <h3>Danh sách bài học & podcast</h3>
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
                      {item.type}
                    </span>
                    <span>{item.createdBy}</span>
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
                    Không có lesson/podcast phù hợp với bộ lọc hiện tại.
                  </p>
                )}
              </div>
            </div>
          </div>
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
          <h3>Bài học liên kết</h3>
          <p style={{ fontWeight: "600", color: "#451a03" }}>
            {typeof podcastDetails.lessonId === "object"
              ? podcastDetails.lessonId.title
              : "Đã liên kết với Bài học"}
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
            <p className="admin-kicker">Chi tiết {item.type === "Lesson" ? "lesson" : "podcast"}</p>
            <h2>{item.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="teacher-close-button">
            Đóng
          </button>
        </div>

        <div className="teacher-detail-grid">
          <div className="teacher-detail-main">
            <InfoRow label="Loại nội dung" value={item.type} />
            <InfoRow label="Người tạo" value={item.createdBy} />
            <InfoRow label="Ngày gửi duyệt" value={formatDate(item.submittedAt)} />
            <div className="teacher-info-row">
              <span>Trạng thái hiện tại</span>
              <StatusBadge status={item.status} />
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
  const animationEntries = Object.entries(game.character.animations || {});

  return (
    <div className="teacher-preview">
      <div className="teacher-preview-header">
        <h3>Game trong lesson</h3>
        <span>Tilemap + assets</span>
      </div>

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
            <p className="admin-kicker">Reject {item.type === "Lesson" ? "lesson" : "podcast"}</p>
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
            placeholder={`Nhập feedback cụ thể để Staff chỉnh sửa ${item.type === "Lesson" ? "lesson" : "podcast"}...`}
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
