"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lesson, LessonFormValues } from "@/lib/adminApi";

function getAnimationCount(lesson: Lesson) {
  return Object.values(lesson.game.character.animations).reduce((total, frames) => total + (frames?.length ?? 0), 0);
}

function getLessonTilesetNames(lesson: Lesson) {
  return lesson.game.tilesets.map((tileset) => tileset.name).join(", ");
}

function formatDate(value?: string) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function FileInput({ label, accept, multiple, onChange }: {
  label: string; accept: string; multiple?: boolean; onChange: (files: FileList | null) => void;
}) {
  const [fileLabel, setFileLabel] = useState("Chưa chọn tệp");
  return (
    <label className="admin-file-input" style={{ cursor: "pointer" }}>
      <span>{label}</span>
      <input type="file" accept={accept} multiple={multiple} style={{ display: "none" }}
        onChange={(event) => { const files = event.target.files; onChange(files); setFileLabel(files?.length ? (multiple ? `Đã chọn ${files.length} tệp` : files[0].name) : "Chưa chọn tệp"); }}/>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "linear-gradient(180deg, #d2a85b, #9b6b2f)", color: "#2b1a0d", fontSize: "12px", fontWeight: "600", borderRadius: "6px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          <svg style={{ width: "14px", height: "14px" }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          Chọn tệp
        </div>
        <small style={{ color: "rgba(58,43,27,0.7)", fontSize: "12px", fontWeight: "500", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "180px" }}>{fileLabel}</small>
      </div>
    </label>
  );
}

type Props = {
  form: LessonFormValues;
  setForm: React.Dispatch<React.SetStateAction<LessonFormValues>>;
  editingLesson: Lesson | null;
  saving: boolean;
  filteredLessons: Lesson[];
  query: string;
  setQuery: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
};

export default function AdminLessons({ form, setForm, editingLesson, saving, filteredLessons, query, setQuery, onSubmit, onReset, onEdit, onDelete }: Props) {
  return (
    <div className="admin-stack">
      <div className="admin-heading">
        <div><p className="admin-kicker">Nội dung</p><h2>Quản lý lesson</h2></div>
        <input className="admin-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm lesson..."/>
      </div>
      <div className="admin-grid-2 admin-grid-2--wide">
        <form className="admin-panel admin-form" onSubmit={onSubmit}>
          <div className="admin-panel-heading"><h3>{editingLesson ? "Sửa lesson" : "Tạo lesson mới"}</h3>{editingLesson && <span>{editingLesson._id}</span>}</div>
          <label><span>Tiêu đề</span><input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Ví dụ: Khởi nghĩa Lam Sơn"/></label>
          <label><span>Nội dung</span><textarea value={form.content} onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))} rows={6} placeholder="Tóm tắt nội dung bài học..."/></label>
          <div className="admin-form-row" style={{ display: "none" }}>
            <label><span>Spawn X</span><input type="number" min="0" value={form.spawnX} onChange={(e) => setForm((prev) => ({ ...prev, spawnX: e.target.value }))}/></label>
            <label><span>Spawn Y</span><input type="number" min="0" value={form.spawnY} onChange={(e) => setForm((prev) => ({ ...prev, spawnY: e.target.value }))}/></label>
          </div>
          <label style={{ display: "none" }}><span>Tên tileset</span><input value={form.tilesetNames} onChange={(e) => setForm((prev) => ({ ...prev, tilesetNames: e.target.value }))} placeholder="terrain, buildings, props"/></label>
          <div className="admin-file-grid">
            <FileInput label="Tilemap JSON" accept="application/json,.json" onChange={(files) => setForm((prev) => ({ ...prev, tilemapJson: files?.[0] ?? null }))}/>
            <FileInput label="Tilesets" accept="image/*" multiple onChange={(files) => setForm((prev) => {
              let derivedNames = prev.tilesetNames;
              if (files && files.length > 0) { derivedNames = Array.from(files).map((file) => { const parts = file.name.split("."); parts.pop(); return parts.join("."); }).join(", "); }
              return { ...prev, tilesets: files, tilesetNames: derivedNames };
            })}/>
          </div>
          <details className="admin-details" style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden", marginTop: "1rem" }}>
            <summary style={{ padding: "0.75rem 1rem", background: "#f9fafb", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600", color: "#374151" }}>Thay đổi nhân vật (Tuỳ chọn)</summary>
            <div className="admin-file-grid" style={{ padding: "1rem", background: "#fff", display: "grid", gap: "1rem" }}>
              <FileInput label="Idle sprites" accept="image/*" multiple onChange={(files) => setForm((prev) => ({ ...prev, idleSprites: files }))}/>
              <FileInput label="Run sprites" accept="image/*" multiple onChange={(files) => setForm((prev) => ({ ...prev, runSprites: files }))}/>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Khi upload sprite mới, hệ thống sẽ thay toàn bộ animation hiện tại.</div>
            </div>
          </details>
          <div className="admin-form-actions">
            <button type="submit" disabled={saving}>{saving ? "Đang lưu..." : editingLesson ? "Cập nhật" : "Tạo mới"}</button>
            <button type="button" onClick={onReset}>Làm mới</button>
          </div>
        </form>
        <div className="admin-panel">
          <div className="admin-panel-heading"><h3>Danh sách lesson</h3><span>{filteredLessons.length} mục</span></div>
          <div className="admin-table admin-lesson-table">
            <div className="admin-table-head"><span>Lesson</span><span>Tài nguyên</span><span>Ngày tạo</span><span>Thao tác</span></div>
            {filteredLessons.map((lesson) => (
              <div key={lesson._id} className="admin-table-row">
                <div><strong>{lesson.title}</strong><small>{lesson.content}</small></div>
                <div><span>{lesson.game.tilesets.length} tileset</span><small>{getAnimationCount(lesson)} sprite frame</small></div>
                <span>{formatDate(lesson.createdAt)}</span>
                <div className="admin-row-actions">
                  <Link href={`/game?id=${lesson._id}`}>Chơi</Link>
                  <button type="button" onClick={() => onEdit(lesson)}>Sửa</button>
                  <button type="button" onClick={() => onDelete(lesson)}>Xóa</button>
                </div>
              </div>
            ))}
            {filteredLessons.length === 0 && <p className="admin-empty">Không tìm thấy lesson phù hợp.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
