"use client";

import Link from "next/link";
import { useState } from "react";
import type { Lesson, LessonFormState, Chapter } from "@/components/staff/types";
import { Card, SectionHeader, statusBadge, FileField, FieldRow, inputClass, selectClass } from "@/components/staff/helpers";

type Props = {
  lessons: Lesson[];
  chapters: Chapter[];
  loading: boolean;
  saving: boolean;
  uploadPct: number | null;
  onSave: (form: LessonFormState, mode: "create" | "edit", lessonId: string | null) => Promise<void>;
  onDelete: (id: string) => void;
};

const emptyForm: LessonFormState = {
  title: "", content: "", chapterId: "", grade: "", order: "0",
  spawnX: "100", spawnY: "100",
  tilemapFile: null, tilesetFiles: [], tilesetNames: [],
  idleSprites: [], runSprites: [],
};

export default function LessonsTab({ lessons, chapters, loading, saving, uploadPct, onSave, onDelete }: Props) {
  const [selId, setSelId] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<LessonFormState>(emptyForm);

  const selLesson = lessons.find(l => l._id === selId);

  const reset = () => { setForm(emptyForm); setMode("create"); setSelId(null); };

  const select = (l: Lesson) => {
    setSelId(l._id); setMode("edit");
    setForm({
      title: l.title, content: l.content, chapterId: l.chapterId || l.chapter?._id || "",
      grade: l.grade ? String(l.grade) : l.chapter?.grade ? String(l.chapter.grade) : "",
      order: l.order !== undefined ? String(l.order) : "0",
      spawnX: String(l.game.spawnPoint.x), spawnY: String(l.game.spawnPoint.y),
      tilesetNames: l.game.tilesets.map(ts => ts.name),
      tilemapFile: null, tilesetFiles: [], idleSprites: [], runSprites: [],
    });
  };

  const handleSave = () => onSave(form, mode, selId).then(() => { reset(); });

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Lesson List */}
      <Card>
        <SectionHeader title="Bài học" action={
          <div className="flex gap-1">
            <Link href="/staff/lesson-builder" className="text-[10px] font-bold uppercase bg-[#8B6914] text-white px-2 py-1 rounded-lg hover:bg-[#6B4F10] transition">Builder</Link>
            <button onClick={reset} className="text-[10px] font-bold uppercase bg-[#8B6914] text-white px-2.5 py-1 rounded-lg hover:bg-[#6B4F10]">+ Tạo</button>
          </div>
        }/>
        {loading ? <div className="p-6 text-center text-amber-600 text-sm">Đang tải...</div> : (
          <div className="max-h-[70vh] overflow-y-auto">
            {lessons.map(l => (
              <button key={l._id} onClick={() => select(l)}
                className={`w-full text-left px-4 py-3 border-b border-amber-50 transition hover:bg-amber-50/60 ${selId === l._id ? "bg-amber-100/70 border-l-4 border-l-[#8B6914]" : ""}`}>
                <p className="font-semibold text-[#3B2F1E] text-sm truncate">{l.title}</p>
                <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                  {l.chapter && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">{l.chapter.title}</span>}
                  {statusBadge(l.status)}
                </div>
              </button>
            ))}
            {!lessons.length && <div className="p-6 text-center text-amber-500 text-sm italic">Chưa có bài học.</div>}
          </div>
        )}
      </Card>

      {/* Form + Parts */}
      <div className="space-y-6">
        <Card>
          <SectionHeader title={mode === "create" ? "✨ Tạo bài học" : "✏️ Chỉnh sửa"}
            action={selLesson?.status === "Rejected" && selLesson.reviewFeedback ? (
              <span className="text-xs bg-rose-100 text-rose-700 px-3 py-1 rounded-lg font-semibold border border-rose-200">Bị từ chối: {selLesson.reviewFeedback}</span>
            ) : undefined}
          />
          <div className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldRow label="Tiêu đề"><input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputClass} placeholder="Tên bài học"/></FieldRow>
              <FieldRow label="Tóm tắt"><input type="text" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} className={inputClass} placeholder="Mô tả ngắn"/></FieldRow>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <FieldRow label="Chương">
                <select value={form.chapterId} onChange={e => { setForm(p => ({ ...p, chapterId: e.target.value })); const ch = chapters.find(c => c._id === e.target.value); if (ch) setForm(p => ({ ...p, grade: String(ch.grade) })); }} className={selectClass}>
                  <option value="">Không</option>
                  {chapters.map(ch => <option key={ch._id} value={ch._id}>Lớp {ch.grade} - {ch.title}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Khối"><select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))} className={selectClass}><option value="">-</option><option value="10">10</option><option value="11">11</option><option value="12">12</option></select></FieldRow>
              <FieldRow label="Thứ tự"><input type="number" value={form.order} onChange={e => setForm(p => ({ ...p, order: e.target.value }))} className={inputClass} min="0"/></FieldRow>
            </div>

            {/* Game Setup */}
            <details className="group border border-amber-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between cursor-pointer px-4 py-3 bg-amber-50/70 text-sm font-bold text-amber-700 select-none hover:bg-amber-100/70 transition">
                <span>🎮 Thiết lập Game Phaser (1 game / bài)</span>
                <span className="transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="p-4 space-y-4 bg-white/80">
                <div className="grid sm:grid-cols-2 gap-3">
                  <FieldRow label="Spawn X"><input type="number" value={form.spawnX} onChange={e => setForm(p => ({ ...p, spawnX: e.target.value }))} className={inputClass}/></FieldRow>
                  <FieldRow label="Spawn Y"><input type="number" value={form.spawnY} onChange={e => setForm(p => ({ ...p, spawnY: e.target.value }))} className={inputClass}/></FieldRow>
                </div>
                <FileField label={`Tilemap JSON ${mode === "create" ? "(bắt buộc)" : ""}`} accept=".json" fileCount={form.tilemapFile ? 1 : 0} fileName={form.tilemapFile?.name} onChange={e => setForm(p => ({ ...p, tilemapFile: e.target.files?.[0] || null }))}/>
                {mode === "edit" && selLesson?.game?.tilemapJsonUrl && <p className="text-xs text-amber-600">Hiện tại: <a href={selLesson.game.tilemapJsonUrl} target="_blank" className="underline">mở file</a></p>}

                <div>
                  <p className="text-[11px] font-semibold text-amber-700 mb-1.5">Tilesets {mode === "create" ? "(bắt buộc)" : ""}</p>
                  {form.tilesetFiles.map((f, i) => (
                    <div key={i} className="flex gap-2 items-center bg-amber-50/50 border border-amber-200 rounded-lg px-3 py-1.5 mb-1.5">
                      <span className="text-xs text-amber-700 truncate max-w-[100px]">{f.name}</span>
                      <span className="text-amber-400">→</span>
                      <input type="text" value={form.tilesetNames[i] || ""} onChange={e => { const n = [...form.tilesetNames]; n[i] = e.target.value; setForm(p => ({ ...p, tilesetNames: n })); }} className="flex-1 min-w-0 text-xs border border-amber-300 rounded px-2 py-1 bg-white" placeholder="Tên tileset"/>
                      <button onClick={() => setForm(p => ({ ...p, tilesetNames: p.tilesetNames.filter((_, j) => j !== i), tilesetFiles: p.tilesetFiles.filter((_, j) => j !== i) }))} className="text-rose-400 hover:text-rose-600 font-bold text-sm">✕</button>
                    </div>
                  ))}
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#8B6914] hover:bg-[#6B4F10] text-white text-xs font-semibold rounded cursor-pointer transition">
                    + Thêm tileset
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      if (!files.length) return;
                      setForm(p => ({ ...p, tilesetFiles: [...p.tilesetFiles, ...files], tilesetNames: [...p.tilesetNames, ...files.map(f => f.name.split(".").slice(0, -1).join("."))] }));
                      e.target.value = "";
                    }}/>
                  </label>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <FileField label="Idle Sprites" accept="image/*" multiple fileCount={form.idleSprites.length} onChange={e => setForm(p => ({ ...p, idleSprites: e.target.files ? Array.from(e.target.files) : [] }))}/>
                  <FileField label="Run Sprites" accept="image/*" multiple fileCount={form.runSprites.length} onChange={e => setForm(p => ({ ...p, runSprites: e.target.files ? Array.from(e.target.files) : [] }))}/>
                </div>
              </div>
            </details>

            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className="bg-[#8B6914] hover:bg-[#6B4F10] text-white px-6 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 shadow-md">
                {saving ? "Dang luu..." : mode === "create" ? "Tao bai hoc" : "Luu thay doi"}
              </button>
              {mode === "edit" && (
                <Link href={`/staff/lesson-builder?lessonId=${selId}`}
                  className="flex items-center gap-2 bg-[#8B6914] hover:bg-[#6B4F10] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md">
                  Mo Builder - Them LessonPart
                </Link>
              )}
              {mode === "edit" && <button onClick={() => onDelete(selId!)} className="border-2 border-amber-300 text-amber-600 hover:bg-amber-50 px-5 py-2.5 rounded-xl text-sm font-bold transition">Xoa</button>}
              {mode === "edit" && <button onClick={reset} className="border border-amber-300 text-amber-700 hover:bg-amber-50 px-5 py-2.5 rounded-xl text-sm font-bold transition">Huy</button>}
            </div>
          </div>
        </Card>

        {mode === "edit" && selId && (
          <div className="bg-amber-50/80 border-2 border-dashed border-amber-300 rounded-2xl p-6 text-center">
            <p className="font-display font-bold text-amber-900 mb-1">Xay dung noi dung bai hoc</p>
            <p className="text-sm text-amber-600 mb-4">Dung Trinh Dung Bai Hoc de them text, hinh anh, podcast, game vao bai hoc nay</p>
            <Link href={`/staff/lesson-builder?lessonId=${selId}`}
              className="inline-flex items-center gap-2 bg-[#8B6914] hover:bg-[#6B4F10] text-white px-6 py-3 rounded-xl text-sm font-bold transition shadow-lg">
              Mo Trinh Dung Bai Hoc
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
