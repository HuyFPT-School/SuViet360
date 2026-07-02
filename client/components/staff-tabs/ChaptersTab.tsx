"use client";

import { useState } from "react";
import type { Chapter, ChapterFormState } from "@/components/staff/types";
import { Card, SectionHeader, FieldRow, inputClass, selectClass } from "@/components/staff/helpers";

type Props = {
  chapters: Chapter[];
  loading: boolean;
  saving: boolean;
  onSave: (form: ChapterFormState, editId: string | null) => Promise<void>;
  onDelete: (id: string) => void;
};

export default function ChaptersTab({ chapters, loading, saving, onSave, onDelete }: Props) {
  const [form, setForm] = useState<ChapterFormState>({ title: "", description: "", grade: "10", order: "0", status: "Draft" });
  const [editId, setEditId] = useState<string | null>(null);

  const reset = () => { setForm({ title: "", description: "", grade: "10", order: "0", status: "Draft" }); setEditId(null); };
  const edit = (ch: Chapter) => { setForm({ title: ch.title, description: ch.description || "", grade: String(ch.grade), order: String(ch.order), status: ch.status }); setEditId(ch._id); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await onSave(form, editId);
    reset();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card>
        <SectionHeader title="Danh sách chương" action={
          <button onClick={reset} className="text-xs font-bold uppercase tracking-wider bg-[#8B6914] text-white px-3 py-1.5 rounded-lg hover:bg-[#6B4F10] transition">+ Tạo mới</button>
        }/>
        {loading ? <div className="p-8 text-center text-amber-600">Đang tải...</div> : (
          <div>
            {[10, 11, 12].map(g => {
              const gCh = chapters.filter(c => c.grade === g);
              if (!gCh.length) return null;
              return (
                <div key={g}>
                  <div className="px-5 py-2 bg-amber-50/70 text-xs font-bold text-amber-700 uppercase tracking-wider border-y border-amber-100">Lop {g} — {gCh.length} chuong</div>
                  {gCh.map(ch => (
                    <div key={ch._id} className="px-5 py-3 hover:bg-amber-50/50 transition flex items-center justify-between border-b border-amber-50">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#3B2F1E]">{ch.title}</p>
                        <div className="flex gap-2 mt-1 items-center">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${ch.status === "Published" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>{ch.status === "Published" ? "Xuất bản" : "Nháp"}</span>
                          {ch.lessonCount !== undefined && <span className="text-[11px] text-amber-600">{ch.lessonCount} bài</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => edit(ch)} className="text-xs text-amber-700 hover:text-amber-900 underline font-medium">Sửa</button>
                        <button onClick={() => onDelete(ch._id)} className="text-xs text-rose-500 hover:text-rose-700 underline font-medium">Xóa</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {!chapters.length && <div className="p-8 text-center text-amber-500 italic">Chưa có chương nào.</div>}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader title={editId ? "Chinh sua" : "Tao chuong moi"}/>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <FieldRow label="Tiêu đề"><input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputClass} placeholder="VD: Việt Nam thời kỳ dựng nước"/></FieldRow>
          <FieldRow label="Mô tả"><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={inputClass} placeholder="Mô tả ngắn..."/></FieldRow>
          <div className="grid grid-cols-3 gap-3">
            <FieldRow label="Khối"><select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))} className={selectClass}><option value="10">Lớp 10</option><option value="11">Lớp 11</option><option value="12">Lớp 12</option></select></FieldRow>
            <FieldRow label="Thứ tự"><input type="number" value={form.order} onChange={e => setForm(p => ({ ...p, order: e.target.value }))} className={inputClass} min="0"/></FieldRow>
            <FieldRow label="TT"><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as "Draft" | "Published" }))} className={selectClass}><option value="Draft">Nháp</option><option value="Published">Xuất bản</option></select></FieldRow>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="bg-[#8B6914] hover:bg-[#6B4F10] text-white px-5 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50">{saving ? "Đang lưu..." : editId ? "💾 Lưu" : "✨ Tạo chương"}</button>
            {editId && <button type="button" onClick={reset} className="border border-amber-300 text-amber-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-50 transition">Hủy</button>}
          </div>
        </form>
      </Card>
    </div>
  );
}
