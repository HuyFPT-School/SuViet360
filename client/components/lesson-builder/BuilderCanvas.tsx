"use client";

import { useRef, useState } from "react";
import type { ContentBlock, ContentBlockType, PodcastRef, GameRef, LessonRef } from "./types";
import { BLOCK_TYPES, emptyBlock } from "./types";
import BlockEditor from "./BlockEditor";
import BlockPreview from "./BlockPreview";

type Props = {
  blocks: ContentBlock[];
  podcasts: PodcastRef[];
  games: GameRef[];
  lessons: LessonRef[];
  partTitle: string;
  learningObj: string;
  estMinutes: number;
  onBlocksChange: (blocks: ContentBlock[]) => void;
};

export default function BuilderCanvas({ blocks, podcasts, games, lessons, partTitle, learningObj, estMinutes, onBlocksChange }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addBlock = (type: ContentBlockType) => { onBlocksChange([...blocks, emptyBlock(type, blocks.length)]); setShowAdd(false); };
  const removeBlock = (idx: number) => onBlocksChange(blocks.filter((_, i) => i !== idx).map((b, i) => ({ ...b, order: i })));
  const updateData = (idx: number, data: Record<string, any>) => onBlocksChange(blocks.map((b, i) => i === idx ? { ...b, data: { ...b.data, ...data } } : b));

  const moveBlock = (from: number, to: number) => {
    if (from === to) return;
    const next = [...blocks]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved);
    onBlocksChange(next.map((b, i) => ({ ...b, order: i })));
  };

  return (
    <main className="flex-1 overflow-y-auto p-6 max-h-[calc(100vh-53px)]" style={{ background: "linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), url('/textures/paper.jpg')", backgroundSize: "cover" }}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-[#3B2F1E]">{partTitle || "Bài học chưa có tiêu đề"}</h2>
          {learningObj && <p className="text-sm text-amber-600 mt-0.5">🎯 {learningObj}</p>}
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-white/80 px-3 py-1.5 rounded-full border border-amber-200">
          <span>{blocks.length} block</span><span>•</span><span>~{estMinutes} phút</span>
        </div>
      </div>

      {/* Blocks */}
      <div ref={canvasRef} className="space-y-3 mb-8">
        {blocks.map((block, idx) => (
          <div key={idx} draggable onDragStart={() => setDragIdx(idx)} onDragOver={e => { e.preventDefault(); if (dragIdx !== null && dragIdx !== idx) moveBlock(dragIdx, idx); setDragIdx(idx); }} onDragEnd={() => setDragIdx(null)}
            className={`group relative bg-white rounded-xl border-2 shadow-sm transition-all ${dragIdx === idx ? "border-amber-500 shadow-lg scale-[1.02]" : "border-amber-200 hover:border-amber-400"}`}
            style={{ borderLeftWidth: "6px", borderLeftColor: BLOCK_TYPES.find(t => t.type === block.type)?.color || "#8B6914" }}>
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50/60 border-b border-amber-100 rounded-tr-xl">
              <span className="cursor-grab text-amber-400 select-none">⋮⋮</span>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: BLOCK_TYPES.find(t => t.type === block.type)?.color }}>{BLOCK_TYPES.find(t => t.type === block.type)?.label}</span>
              <div className="flex-1"/>
              <button onClick={() => setPreviewIdx(previewIdx === idx ? null : idx)} className="text-[10px] text-amber-500 hover:text-amber-700 font-semibold">{previewIdx === idx ? "Ẩn" : "Preview"}</button>
              <button onClick={() => removeBlock(idx)} className="text-rose-400 hover:text-rose-600 font-bold text-sm ml-1">✕</button>
            </div>
            <div className="p-4">
              <BlockEditor block={block} idx={idx} updateData={(d) => updateData(idx, d)} podcasts={podcasts} games={games} lessons={lessons}/>
            </div>
            {previewIdx === idx && (
              <div className="border-t-2 border-dashed border-amber-300 bg-amber-50/30 p-4 rounded-b-xl">
                <p className="text-[10px] font-bold uppercase text-amber-500 mb-2">👁️ Xem trước</p>
                <BlockPreview block={block} podcasts={podcasts} games={games}/>
              </div>
            )}
          </div>
        ))}
        {!blocks.length && (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-amber-300 rounded-2xl bg-amber-50/40">
            <p className="text-amber-700 font-display font-bold text-lg">Khung bai hoc trong</p>
            <p className="text-amber-500 text-sm mt-1 mb-4">Nhan nut ben duoi de them block dau tien</p>
          </div>
        )}
      </div>

      {/* Add Block */}
      <div className="relative">
        {showAdd ? (
          <div className="bg-white border-2 border-amber-300 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#3B2F1E] text-sm">Chọn loại block</h3>
              <button onClick={() => setShowAdd(false)} className="text-amber-500 hover:text-amber-700 font-bold">✕</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type} onClick={() => addBlock(bt.type)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition text-center"
                  style={{ borderBottomWidth: "3px", borderBottomColor: bt.color }}>
                  <span className="text-xs font-bold text-[#3B2F1E]">{bt.label}</span>
                  <span className="text-[9px] text-amber-500 leading-tight">{bt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)}
            className="w-full border-2 border-dashed border-amber-400 rounded-2xl py-5 text-amber-600 hover:bg-amber-50/80 hover:text-amber-800 transition font-bold text-sm flex items-center justify-center gap-2">
            + Them block noi dung
          </button>
        )}
      </div>
    </main>
  );
}
