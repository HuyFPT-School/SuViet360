"use client";

import type { TeacherReviewItem, LessonGame } from "@/lib/teacherReviewApi";

function formatDate(value?: string) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function getStatusLabel(status: string) {
  if (status === "Pending_Review") return "Chờ duyệt";
  if (status === "Published") return "Đã xuất bản";
  return "Bị từ chối";
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`teacher-status teacher-status--${status.toLowerCase()}`}>{getStatusLabel(status)}</span>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="teacher-info-row"><span>{label}</span><strong>{value}</strong></div>;
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function LessonGamePreview({ game, lessonTitle }: { game: LessonGame; lessonTitle: string }) {
  const entries = Object.entries(game.character.animations || {});
  return (
    <div className="teacher-preview">
      <div className="teacher-preview-header"><h3>Game trong lesson</h3><span>Tilemap + assets</span></div>
      <div className="teacher-section teacher-section--tight"><h3>Spawn point</h3><p>X: {game.spawnPoint.x}, Y: {game.spawnPoint.y}</p></div>
      <div className="teacher-section teacher-section--tight"><h3>Tilemap JSON</h3><a href={game.tilemapJsonUrl} target="_blank" rel="noopener noreferrer" className="teacher-resource-link">{game.tilemapJsonUrl}</a></div>
      <div className="teacher-section teacher-section--tight">
        <h3>Tilesets</h3>
        {game.tilesets.length > 0 ? (
          <div className="teacher-asset-grid">{game.tilesets.map((t) => <div key={t.name} className="teacher-asset-card"><img src={t.imageUrl} alt={t.name}/><span>{t.name}</span></div>)}</div>
        ) : <p className="admin-note">Chưa có tileset.</p>}
      </div>
      <div className="teacher-section teacher-section--tight">
        <h3>Animations</h3>
        {entries.length > 0 ? (
          <div className="teacher-animation-list">{entries.map(([name, frames]) => (
            <div key={name}><strong>{name}</strong><div className="teacher-asset-grid">{frames.slice(0, 6).map((f) => <div key={f.key} className="teacher-asset-card"><img src={f.imageUrl} alt={f.key}/><span>{f.key}</span></div>)}</div>{frames.length > 6 && <p className="admin-note">+{frames.length - 6} frame khác</p>}</div>
          ))}</div>
        ) : <p className="admin-note">Chưa có animation.</p>}
      </div>
    </div>
  );
}

export function PodcastPreview({ podcastDetails, title }: { podcastDetails: any; title: string }) {
  return (
    <div className="teacher-preview">
      <div className="teacher-preview-header"><h3>Tài nguyên Podcast</h3><span>File âm thanh & ảnh</span></div>
      <div className="teacher-section"><h3>Ảnh giao diện</h3><div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden", borderRadius: "8px", border: "1px solid #d1c2a5" }}><img src={podcastDetails.thumbnail} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }}/></div></div>
      <div className="teacher-section"><h3>Audio</h3><audio src={podcastDetails.audioUrl} controls style={{ width: "100%" }}/><div className="mt-2 text-xs text-amber-800 font-medium">Thời lượng: {formatDuration(podcastDetails.duration)}</div></div>
      <div className="teacher-section teacher-section--tight"><h3>Thông tin</h3><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "14px", marginTop: "4px" }}><div><span style={{ color: "#92400e", display: "block", fontSize: "12px", fontWeight: "600" }}>Chủ đề:</span><span style={{ fontWeight: "500" }}>{podcastDetails.category}</span></div><div><span style={{ color: "#92400e", display: "block", fontSize: "12px", fontWeight: "600" }}>Trình độ:</span><span style={{ fontWeight: "500" }}>{podcastDetails.level}</span></div></div></div>
      {podcastDetails.lessonId && <div className="teacher-section teacher-section--tight"><h3>Bài học liên kết</h3><p style={{ fontWeight: "600", color: "#451a03" }}>{typeof podcastDetails.lessonId === "object" ? podcastDetails.lessonId.title : "Đã liên kết"}</p></div>}
    </div>
  );
}

export function ContentDetailModal({ item, saving, onClose, onApprove, onReject }: {
  item: TeacherReviewItem; saving: boolean; onClose: () => void;
  onApprove: (item: TeacherReviewItem) => void; onReject: (item: TeacherReviewItem) => void;
}) {
  const canReview = item.status === "Pending_Review";
  return (
    <div className="teacher-modal-backdrop" role="dialog" aria-modal="true">
      <div className="teacher-modal teacher-detail-modal">
        <div className="teacher-modal-header"><div><p className="admin-kicker">Chi tiết {item.type === "Lesson" ? "lesson" : "podcast"}</p><h2>{item.title}</h2></div><button type="button" onClick={onClose} className="teacher-close-button">Đóng</button></div>
        <div className="teacher-detail-grid">
          <div className="teacher-detail-main">
            <InfoRow label="Loại nội dung" value={item.type}/>
            <InfoRow label="Người tạo" value={item.createdBy}/>
            <InfoRow label="Ngày gửi duyệt" value={formatDate(item.submittedAt)}/>
            {item.chapter && <InfoRow label="Chương" value={`${item.chapter.title} (Lớp ${item.chapter.grade})`}/>}
            {item.grade && !item.chapter && <InfoRow label="Khối lớp" value={`Lớp ${item.grade}`}/>}
            {item.type === "Lesson" && item.podcast && <div className="teacher-info-row"><span>Podcast liên kết</span><strong className="text-purple-700">🎙️ {item.podcast.title}</strong></div>}
            <div className="teacher-info-row"><span>Trạng thái</span><StatusBadge status={item.status}/></div>
            <div className="teacher-section"><h3>Nội dung tóm tắt</h3><p style={{ whiteSpace: "pre-wrap" }}>{item.summary}</p></div>
            {item.reviewFeedback && <div className="teacher-feedback-box"><strong>Feedback từ chối</strong><p>{item.reviewFeedback}</p></div>}
          </div>
          <div className="teacher-preview-column">
            {item.type === "Lesson" && item.game ? <LessonGamePreview game={item.game} lessonTitle={item.title}/> : item.type === "Podcast" && item.podcastDetails ? <PodcastPreview podcastDetails={item.podcastDetails} title={item.title}/> : <div className="teacher-preview"><p className="admin-note">Không có xem trước.</p></div>}
          </div>
        </div>
        <div className="teacher-modal-actions">
          {canReview ? (<><button type="button" className="teacher-approve-button" onClick={() => onApprove(item)} disabled={saving}>{saving ? "Đang xử lý..." : "Approve"}</button><button type="button" className="teacher-reject-button" onClick={() => onReject(item)} disabled={saving}>Reject</button></>) : <span className="admin-note">Mục này đã {item.status === "Published" ? "được duyệt" : "bị từ chối"}, Teacher chỉ có quyền xem lại.</span>}
        </div>
      </div>
    </div>
  );
}

export function RejectModal({ item, feedback, feedbackError, saving, onFeedbackChange, onClose, onSubmit }: {
  item: TeacherReviewItem; feedback: string; feedbackError: string; saving: boolean;
  onFeedbackChange: (v: string) => void; onClose: () => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="teacher-modal-backdrop" role="dialog" aria-modal="true">
      <div className="teacher-modal teacher-reject-modal">
        <div className="teacher-modal-header"><div><p className="admin-kicker">Từ chối</p><h2>{item.title}</h2></div><button type="button" onClick={onClose} className="teacher-close-button">Đóng</button></div>
        <form onSubmit={onSubmit}>
          <div className="teacher-section"><h3>Lý do từ chối</h3><textarea value={feedback} onChange={(e) => onFeedbackChange(e.target.value)} rows={4} className="w-full rounded border border-gray-300 p-2 text-sm" placeholder="Nhập lý do từ chối..."/>{feedbackError && <p className="text-red-600 text-xs mt-1">{feedbackError}</p>}</div>
          <div className="teacher-section"><h3>Gợi ý lý do</h3><div className="flex flex-wrap gap-2">{["Sai kiến thức lịch sử","Nội dung chưa đầy đủ","Audio không khớp","Game bị lỗi","Ảnh/tài nguyên bị lỗi","Tilemap JSON không tải được","Cần chỉnh sửa nội dung"].map((s) => <button key={s} type="button" onClick={() => onFeedbackChange(s)} className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded border border-amber-300">{s}</button>)}</div></div>
          <div className="teacher-modal-actions"><button type="submit" className="teacher-reject-button" disabled={saving}>{saving ? "Đang gửi..." : "Xác nhận từ chối"}</button><button type="button" onClick={onClose} className="teacher-approve-button" style={{ background: "#e5e7eb", color: "#374151" }}>Huỷ</button></div>
        </form>
      </div>
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: number }) {
  return <div className="admin-stat-card"><span>{label}</span><strong>{value}</strong></div>;
}
