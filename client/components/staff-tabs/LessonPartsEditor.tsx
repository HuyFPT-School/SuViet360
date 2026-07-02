"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { LessonPart, Podcast as PodType } from "@/components/staff/types";
import { Card, SectionHeader, statusBadge, translateLevel, FileField, FieldRow, inputClass, selectClass } from "@/components/staff/helpers";

type Props = {
  lessonId: string;
  podcasts: PodType[];
  saving: boolean;
  setSaving: (v: boolean) => void;
};

export default function LessonPartsEditor({ lessonId, podcasts, saving, setSaving }: Props) {
  const [parts, setParts] = useState<(LessonPart & { _dirty?: boolean })[]>([]);
  const [loading, setLoading] = useState(false);

  const getCsrf = async () => (await api.get<{ data: { csrfToken: string } }>("/csrf-token")).data.data.csrfToken;

  const fetchParts = async () => {
    setLoading(true);
    try { const r = await api.get<{ success: boolean; parts: LessonPart[] }>(`/lessons/${lessonId}/parts`); setParts(r.data.parts); }
    catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchParts(); }, [lessonId]);

  const addPart = () => setParts(prev => [...prev, {
    title: `Phần ${prev.length + 1}`, order: prev.length, learningObjective: "", estimatedMinutes: 5,
    contentBlocks: [{ type: "text", data: { text: "" }, order: 0 }], podcastId: "", _dirty: true,
  }]);

  const removePart = (idx: number) => setParts(prev => prev.filter((_, i) => i !== idx));
  const updatePart = (idx: number, field: string, value: any) => setParts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value, _dirty: true } : p));

  const addBlock = (pIdx: number, type: "text" | "image") => setParts(prev => prev.map((p, i) => i !== pIdx ? p : {
    ...p, _dirty: true, contentBlocks: [...p.contentBlocks, { type, data: type === "text" ? { text: "" } : { imageUrl: "", caption: "" }, order: p.contentBlocks.length }]
  }));
  const removeBlock = (pIdx: number, bIdx: number) => setParts(prev => prev.map((p, i) => i !== pIdx ? p : {
    ...p, _dirty: true, contentBlocks: p.contentBlocks.filter((_, bi) => bi !== bIdx)
  }));
  const updateBlock = (pIdx: number, bIdx: number, data: any) => setParts(prev => prev.map((p, i) => i !== pIdx ? p : {
    ...p, _dirty: true, contentBlocks: p.contentBlocks.map((b, bi) => bi !== bIdx ? b : { ...b, data: { ...b.data, ...data } })
  }));
  const setBlockImage = (pIdx: number, bIdx: number, file: File | null) => setParts(prev => prev.map((p, i) => i !== pIdx ? p : {
    ...p, _dirty: true, contentBlocks: p.contentBlocks.map((b, bi) => bi !== bIdx ? b : { ...b, _imageFile: file as any })
  }));

  const savePart = async (pIdx: number) => {
    const part = parts[pIdx];
    if (!part.title.trim()) return;
    setSaving(true);
    try {
      const csrf = await getCsrf();
      const blocks = part.contentBlocks.map(b => {
        const { _imageFile, ...rest } = b as any;
        return { type: b.type, data: b.data, order: b.order };
      });
      const fd = new FormData();
      fd.append("title", part.title); fd.append("order", String(pIdx));
      fd.append("learningObjective", part.learningObjective || ""); fd.append("estimatedMinutes", String(part.estimatedMinutes || 5));
      fd.append("contentBlocks", JSON.stringify(blocks));
      if (part.podcastId) fd.append("podcastId", part.podcastId);
      part.contentBlocks.forEach(b => { if (b.type === "image" && (b as any)._imageFile) fd.append("images", (b as any)._imageFile); });

      if (part._id) await api.put(`/lessons/parts/${part._id}`, fd, { headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrf } });
      else await api.post(`/lessons/${lessonId}/parts`, fd, { headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrf } });
      fetchParts();
    } catch {}
    finally { setSaving(false); }
  };

  const delPart = async (id: string) => {
    if (!confirm("Xóa phần này?")) return;
    try { await api.delete(`/lessons/parts/${id}`, { headers: { "x-csrf-token": await getCsrf() } }); fetchParts(); } catch {}
  };

  return (
    <Card>
      <SectionHeader title="📑 Lesson Parts" action={
        <button onClick={addPart} className="text-xs font-bold bg-[#8B6914] text-white px-3 py-1.5 rounded-lg hover:bg-[#6B4F10] transition">+ Thêm phần</button>
      }/>
      <div className="p-4 space-y-4 max-h-[55vh] overflow-y-auto">
        {loading && <div className="text-center text-amber-600 text-sm py-4">Đang tải parts...</div>}
        {parts.map((part, pIdx) => (
          <div key={pIdx} className="border-2 border-amber-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50/60 border-b border-amber-100">
              <span className="text-xs font-bold text-amber-500 bg-amber-100 px-2 py-1 rounded">#{pIdx + 1}</span>
              <input type="text" value={part.title} onChange={e => updatePart(pIdx, "title", e.target.value)}
                className="flex-1 text-sm font-semibold bg-transparent border-b border-dashed border-amber-300 focus:border-amber-500 outline-none text-[#3B2F1E]" placeholder="Tiêu đề phần"/>
              <button onClick={() => removePart(pIdx)} className="text-rose-400 hover:text-rose-600 font-bold text-sm">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <FieldRow label="Mục tiêu"><input type="text" value={part.learningObjective} onChange={e => updatePart(pIdx, "learningObjective", e.target.value)} className={inputClass} placeholder="Học sinh sẽ hiểu..."/></FieldRow>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Nội dung</span>
                  <div className="flex gap-1">
                    <button onClick={() => addBlock(pIdx, "text")} className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-0.5 rounded font-semibold">+ Text</button>
                    <button onClick={() => addBlock(pIdx, "image")} className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-0.5 rounded font-semibold">+ Ảnh</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {part.contentBlocks.map((block, bIdx) => (
                    <div key={bIdx} className="flex gap-2 items-start bg-amber-50/40 border border-amber-100 rounded-lg p-3">
                      <span className="text-[10px] font-bold text-amber-400 mt-1.5">{bIdx + 1}</span>
                      <div className="flex-1 space-y-2">
                        {block.type === "text" ? (
                          <textarea value={block.data.text || ""} onChange={e => updateBlock(pIdx, bIdx, { text: e.target.value })} rows={3} className={inputClass} placeholder="Nội dung text..."/>
                        ) : (
                          <div className="space-y-2">
                            {(block.data.imageUrl || (block as any)._imageFile) && (
                              <img src={(block as any)._imageFile ? URL.createObjectURL((block as any)._imageFile) : block.data.imageUrl} alt="" className="max-h-32 rounded-lg border border-amber-200 object-contain"/>
                            )}
                            <FileField label="Chọn ảnh" accept="image/*" fileCount={(block as any)._imageFile ? 1 : (block.data.imageUrl ? 1 : 0)} fileName={(block as any)._imageFile?.name || (block.data.imageUrl ? "Đã có ảnh" : undefined)} onChange={e => setBlockImage(pIdx, bIdx, e.target.files?.[0] || null)}/>
                            <input type="text" value={block.data.caption || ""} onChange={e => updateBlock(pIdx, bIdx, { caption: e.target.value })} className={inputClass} placeholder="Chú thích (tuỳ chọn)"/>
                          </div>
                        )}
                        <button onClick={() => removeBlock(pIdx, bIdx)} className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold">Xóa block</button>
                      </div>
                    </div>
                  ))}
                  {!part.contentBlocks.length && <p className="text-xs text-amber-400 italic">Chưa có block.</p>}
                </div>
              </div>
              <FieldRow label="🎙️ Podcast">
                <select value={part.podcastId || ""} onChange={e => updatePart(pIdx, "podcastId", e.target.value)} className={selectClass}>
                  <option value="">Không gắn</option>
                  {podcasts.filter(p => p.status === "Published").map(p => <option key={p._id} value={p._id}>{p.title} ({translateLevel(p.level)})</option>)}
                </select>
              </FieldRow>
              <div className="flex gap-2 pt-1">
                <button onClick={() => savePart(pIdx)} disabled={saving} className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50">💾 Lưu phần</button>
                {part._id && <button onClick={() => delPart(part._id!)} className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1.5">🗑 Xóa</button>}
              </div>
            </div>
          </div>
        ))}
        {!parts.length && !loading && <div className="text-center py-8 text-amber-500"><p className="text-3xl mb-2">📑</p><p className="text-sm italic">Chưa có LessonPart nào.</p></div>}
      </div>
    </Card>
  );
}
