"use client";

import { useMemo, useState } from "react";
import type { Podcast, PodcastFormState, Lesson } from "@/components/staff/types";
import { Card, SectionHeader, statusBadge, translateLevel, FileField, FieldRow, inputClass, selectClass } from "@/components/staff/helpers";

type Props = {
  podcasts: Podcast[];
  lessons: Lesson[];
  loading: boolean;
  saving: boolean;
  uploadPct: number | null;
  onSave: (form: PodcastFormState, mode: "create" | "edit", podcastId: string | null) => Promise<void>;
  onDelete: (id: string) => void;
};

const emptyForm: PodcastFormState = { title: "", description: "", content: "", level: "Medium", category: "", lessonId: "", thumbnailFile: null, audioFile: null };

export default function PodcastsTab({ podcasts, lessons, loading, saving, uploadPct, onSave, onDelete }: Props) {
  const [selId, setSelId] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<PodcastFormState>(emptyForm);
  const [newCat, setNewCat] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  const selPodcast = podcasts.find(p => p._id === selId);
  const cats = useMemo(() => [...new Set(podcasts.map(p => p.category).filter(Boolean))], [podcasts]);

  const reset = () => { setForm(emptyForm); setMode("create"); setSelId(null); setAddingCat(false); setNewCat(""); };

  const select = (p: Podcast) => {
    setSelId(p._id); setMode("edit"); setAddingCat(false); setNewCat("");
    setForm({
      title: p.title, description: p.description || "", content: p.content || "", level: p.level || "Medium", category: p.category || "",
      lessonId: typeof p.lessonId === "object" && p.lessonId ? (p.lessonId as any)._id || "" : (p.lessonId as string) || "",
      thumbnailFile: null, audioFile: null,
    });
  };

  const handleSave = () => onSave(form, mode, selId).then(() => reset());

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <Card>
        <SectionHeader title="Podcast" action={
            <button onClick={reset} className="text-[10px] font-bold uppercase bg-[#8B6914] text-white px-2.5 py-1 rounded-lg hover:bg-[#6B4F10]">+ Tao</button>
        }/>
        {loading ? <div className="p-6 text-center text-amber-600 text-sm">Đang tải...</div> : (
          <div className="max-h-[70vh] overflow-y-auto">
            {podcasts.map(p => (
              <button key={p._id} onClick={() => select(p)}
                className={`w-full text-left px-4 py-3 border-b border-amber-50 transition hover:bg-amber-50/60 flex gap-3 items-start ${selId === p._id ? "bg-purple-50/70 border-l-4 border-l-purple-600" : ""}`}>
                {p.thumbnail && <img src={p.thumbnail} className="w-12 h-12 object-cover rounded-lg border border-amber-200 shrink-0"/>}
                <div className="min-w-0"><p className="font-semibold text-[#3B2F1E] text-sm truncate">{p.title}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">{statusBadge(p.status)}<span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{translateLevel(p.level)}</span></div>
                </div>
              </button>
            ))}
            {!podcasts.length && <div className="p-6 text-center text-amber-500 text-sm italic">Chưa có podcast.</div>}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader title={mode === "create" ? "Tao podcast" : "Chinh sua"}/>
        <div className="p-5 space-y-4">
          {mode === "edit" && selPodcast?.status === "Rejected" && selPodcast.reviewFeedback && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-800"><strong>Bị từ chối:</strong> {selPodcast.reviewFeedback}</div>
          )}
          <FieldRow label="Tiêu đề"><input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputClass}/></FieldRow>
          <FieldRow label="Mô tả"><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={inputClass}/></FieldRow>
          <FieldRow label="Transcript"><textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={3} className={inputClass}/></FieldRow>
          <div className="grid sm:grid-cols-2 gap-3">
            <FieldRow label="Trình độ"><select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} className={selectClass}><option value="Easy">Dễ</option><option value="Medium">TB</option><option value="Hard">Khó</option></select></FieldRow>
            <FieldRow label="Chủ đề">
              {addingCat ? (
                <div className="flex gap-2"><input type="text" value={newCat} onChange={e => { setNewCat(e.target.value); setForm(p => ({ ...p, category: e.target.value })); }} className={inputClass} placeholder="Chủ đề mới"/><button onClick={() => { setAddingCat(false); setNewCat(""); }} className="text-xs text-amber-600 underline">Xong</button></div>
              ) : (
                <div className="flex gap-2"><select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={selectClass}><option value="">Chọn</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select><button onClick={() => setAddingCat(true)} className="text-xs text-purple-600 underline shrink-0">+Mới</button></div>
              )}
            </FieldRow>
          </div>
          <FieldRow label="Bài học liên kết (Game)"><select value={form.lessonId} onChange={e => setForm(p => ({ ...p, lessonId: e.target.value }))} className={selectClass}><option value="">Không</option>{lessons.filter(l => l.status === "Published" || l._id === form.lessonId).map(l => <option key={l._id} value={l._id}>{l.title}</option>)}</select></FieldRow>
          <FileField label={`Ảnh ${mode === "create" ? "(bắt buộc)" : ""}`} accept="image/*" fileCount={form.thumbnailFile ? 1 : 0} fileName={form.thumbnailFile?.name} onChange={e => setForm(p => ({ ...p, thumbnailFile: e.target.files?.[0] || null }))}/>
          {mode === "edit" && selPodcast?.thumbnail && <img src={selPodcast.thumbnail} className="w-32 h-20 object-cover rounded-lg border"/>}
          {mode === "edit" && selPodcast?.audioUrl && <audio src={selPodcast.audioUrl} controls className="w-full max-w-sm h-8"/>}
          <FileField label={`Audio ${mode === "create" ? "(bắt buộc)" : ""}`} accept="audio/*" fileCount={form.audioFile ? 1 : 0} fileName={form.audioFile?.name} onChange={e => setForm(p => ({ ...p, audioFile: e.target.files?.[0] || null }))}/>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="bg-[#8B6914] hover:bg-[#6B4F10] text-white px-5 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50">{saving ? "Dang luu..." : mode === "create" ? "Tao" : "Luu"}</button>
            {mode === "edit" && <button onClick={() => onDelete(selId!)} className="border-2 border-amber-300 text-amber-600 hover:bg-amber-50 px-4 py-2 rounded-lg text-sm font-bold">Xoa</button>}
            {mode === "edit" && <button onClick={reset} className="border border-amber-300 text-amber-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-50">Hủy</button>}
          </div>
        </div>
      </Card>
    </div>
  );
}
