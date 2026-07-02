"use client";

import { useMemo, useState } from "react";
import type { LessonRef, LessonPartData } from "./types";
import { inputClass } from "@/components/staff/helpers";

type Props = {
  lessons: LessonRef[];
  selectedLessonId: string;
  onSelectLesson: (id: string) => void;
  parts: LessonPartData[];
  editingPartId: string | null;
  onLoadPart: (part: LessonPartData) => void;
  onDeletePart: (id: string) => void;
  partTitle: string;
  onPartTitleChange: (v: string) => void;
  partOrder: number;
  onPartOrderChange: (v: number) => void;
  learningObj: string;
  onLearningObjChange: (v: string) => void;
  estMinutes: number;
  onEstMinutesChange: (v: number) => void;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
};

export default function BuilderSidebar({
  lessons, selectedLessonId, onSelectLesson,
  parts, editingPartId, onLoadPart, onDeletePart,
  partTitle, onPartTitleChange, partOrder, onPartOrderChange,
  learningObj, onLearningObjChange, estMinutes, onEstMinutesChange,
  saving, onSave, onReset,
}: Props) {
  const [lessonSearch, setLessonSearch] = useState("");

  const groupedLessons = useMemo(() => {
    const s = lessonSearch.toLowerCase();
    const filtered = !s ? lessons : lessons.filter(l =>
      l.title.toLowerCase().includes(s) || l.chapter?.title.toLowerCase().includes(s));
    const groups: Record<number, LessonRef[]> = {};
    filtered.forEach(l => { const g = l.grade || l.chapter?.grade || 0; if (!groups[g]) groups[g] = []; groups[g].push(l); });
    return groups;
  }, [lessons, lessonSearch]);

  const selLesson = lessons.find(l => l._id === selectedLessonId);

  return (
    <aside className="w-72 bg-[#F7F3E9] border-r-2 border-amber-300 shadow-inner shrink-0 flex flex-col max-h-[calc(100vh-53px)]">
      <div className="p-4 space-y-4 overflow-y-auto flex-1">

        {/* Lesson Selector */}
        <div className="bg-white/80 border-2 border-amber-300 rounded-xl p-3 shadow-sm">
          <label className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-2">
            Chon bai hoc
          </label>
          <input type="text" value={lessonSearch} onChange={e => setLessonSearch(e.target.value)}
            className={inputClass + " text-xs mb-2"} placeholder="🔍 Tìm bài học..."/>
          <select value={selectedLessonId} onChange={e => onSelectLesson(e.target.value)}
            className={inputClass + " text-xs"} size={12}>
            <option value="">-- Chọn --</option>
            {Object.entries(groupedLessons).map(([grade, ls]) => (
              <optgroup key={grade} label={`Lop ${grade}`}>
                {ls.map(l => <option key={l._id} value={l._id}>{l.chapter ? `${l.chapter.title} > ` : ""}{l.title}</option>)}
              </optgroup>
            ))}
          </select>
          {selLesson && (
            <p className="text-[10px] text-amber-700 mt-1.5 font-semibold truncate">
              Da chon: {selLesson.chapter ? `[Lop ${selLesson.chapter.grade}] ${selLesson.chapter.title} > ` : ""}{selLesson.title}
            </p>
          )}
        </div>

        {/* Part Settings */}
        {selectedLessonId && (
          <div className="border-t border-amber-200 pt-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600">
              {editingPartId ? "Chinh sua Part" : "Tao Part moi"}
            </h3>
            <div>
              <label className="text-[10px] font-semibold text-amber-700 block mb-0.5">Tiêu đề Part</label>
              <input type="text" value={partTitle} onChange={e => onPartTitleChange(e.target.value)}
                className={inputClass + " text-xs"} placeholder="VD: Phần 1 - Khởi nghĩa Hai Bà Trưng"/>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-amber-700 block mb-0.5">Mục tiêu học tập</label>
              <textarea value={learningObj} onChange={e => onLearningObjChange(e.target.value)} rows={2}
                className={inputClass + " text-xs"} placeholder="Học sinh sẽ hiểu được nguyên nhân, diễn biến..."/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-amber-700 block mb-0.5">Thứ tự</label>
                <input type="number" value={partOrder} onChange={e => onPartOrderChange(+e.target.value)}
                  className={inputClass + " text-xs"} min="0"/>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-amber-700 block mb-0.5">Thời lượng (phút)</label>
                <input type="number" value={estMinutes} onChange={e => onEstMinutesChange(+e.target.value)}
                  className={inputClass + " text-xs"} min="1"/>
              </div>
            </div>
          </div>
        )}

        {/* Existing Parts */}
        {selectedLessonId && (
          <div className="border-t border-amber-200 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">
              Parts da tao ({parts.length})
            </h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {parts.map(p => (
                <div key={p._id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                    editingPartId === p._id
                      ? "bg-amber-200/80 border-2 border-amber-400 font-bold shadow-sm"
                      : "bg-white/70 border border-amber-200 hover:bg-amber-100/60 hover:border-amber-300"
                  }`}>
                  <button onClick={() => onLoadPart(p)} className="text-left flex-1 truncate text-[#3B2F1E]">
                    <span className="text-amber-500 mr-1.5 font-bold">#{p.order}</span> {p.title}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDeletePart(p._id!); }}
                    className="text-rose-400 hover:text-rose-600 ml-2 shrink-0 font-bold">✕</button>
                </div>
              ))}
              {!parts.length && (
                <p className="text-xs text-amber-400 italic text-center py-3">Chưa có Part nào. Tạo Part đầu tiên!</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="p-4 border-t-2 border-amber-300 bg-amber-100/70">
        {!selectedLessonId ? (
          <div className="text-center text-xs text-amber-500 italic py-2">Chon bai hoc truoc khi tao Part</div>
        ) : (
          <>
            <button onClick={onSave} disabled={saving}
              className="w-full bg-[#8B6914] hover:bg-[#6B4F10] text-white py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-40 shadow-md">
              {saving ? "Dang luu..." : editingPartId ? "Cap nhat Part" : "Tao Part moi"}
            </button>
            {editingPartId && (
              <button onClick={onReset}
                className="w-full mt-2 border-2 border-amber-400 text-amber-700 hover:bg-amber-100 py-2 rounded-xl text-xs font-bold transition">
                Tao Part moi (bo qua)
              </button>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
