"use client";

import type { ContentBlock, PodcastRef, GameRef, LessonRef } from "./types";
import { inputClass, selectClass } from "@/components/staff/helpers";
import { FileField } from "@/components/staff/helpers";

type Props = {
  block: ContentBlock;
  idx: number;
  updateData: (data: Record<string, any>) => void;
  podcasts: PodcastRef[];
  games: GameRef[];
  lessons: LessonRef[];
};

export default function BlockEditor({ block, idx, updateData, podcasts, games, lessons }: Props) {
  switch (block.type) {
    case "text":
      return <textarea value={block.data.text || ""} onChange={e => updateData({ text: e.target.value })} rows={6} className={inputClass} placeholder="Nhập nội dung giảng dạy tại đây..."/>;

    case "image":
      return (
        <div className="space-y-3">
          {block.data.imageUrl && <img src={block._imageFile ? URL.createObjectURL(block._imageFile) : block.data.imageUrl} alt="" className="max-h-48 rounded-lg border border-amber-200 object-contain bg-amber-50/30"/>}
          <FileField label="Chọn ảnh" accept="image/*" fileCount={block._imageFile ? 1 : (block.data.imageUrl && block.data.imageUrl !== "pending-upload" ? 1 : 0)}
            fileName={block._imageFile?.name || (block.data.imageUrl && block.data.imageUrl !== "pending-upload" ? "Đã có ảnh" : undefined)}
            onChange={e => { const f = e.target.files?.[0]; if (f) { block._imageFile = f; updateData({ imageUrl: "pending-upload" }); } }}/>
          <input type="text" value={block.data.caption || ""} onChange={e => updateData({ caption: e.target.value })} className={inputClass} placeholder="Chú thích ảnh (tuỳ chọn)"/>
        </div>
      );

    case "podcast":
      return (
        <div className="space-y-2">
          <select value={block.data.podcastId || ""} onChange={e => updateData({ podcastId: e.target.value })} className={selectClass}>
            <option value="">-- Chọn podcast --</option>
            {podcasts.filter(p => p.status === "Published").map(p => <option key={p._id} value={p._id}>{p.title} ({p.level === "Easy" ? "Dễ" : p.level === "Hard" ? "Khó" : "TB"})</option>)}
          </select>
          {block.data.podcastId && (() => { const p = podcasts.find(pp => pp._id === block.data.podcastId); return p ? <audio src={p.audioUrl} controls className="w-full h-8"/> : null; })()}
        </div>
      );

    case "audio":
      return (
        <div className="space-y-2">
          {block.data.audioUrl && block.data.audioUrl !== "pending-upload" && <audio src={block.data.audioUrl} controls className="w-full h-8"/>}
          <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded cursor-pointer transition">
            🔊 Tải lên MP3
            <input type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { block._audioFile = f; updateData({ audioUrl: "pending-upload" }); } }}/>
          </label>
          <input type="text" value={block.data.title || ""} onChange={e => updateData({ title: e.target.value })} className={inputClass} placeholder="Tiêu đề audio"/>
        </div>
      );

    case "video":
      return <div className="space-y-2">
        <input type="text" value={block.data.url || ""} onChange={e => updateData({ url: e.target.value })} className={inputClass} placeholder="Link YouTube / Vimeo"/>
        <input type="text" value={block.data.title || ""} onChange={e => updateData({ title: e.target.value })} className={inputClass} placeholder="Tiêu đề video"/>
      </div>;

    case "game":
      return <select value={block.data.gameId || ""} onChange={e => updateData({ gameId: e.target.value })} className={selectClass}>
        <option value="">-- Chọn trò chơi --</option>
        {games.filter(g => g.status === "Published").map(g => <option key={g._id} value={g._id}>{g.title} ({g.gameType})</option>)}
      </select>;

    case "quiz":
      return <div className="space-y-2">
        <input type="text" value={block.data.quizId || ""} onChange={e => updateData({ quizId: e.target.value })} className={inputClass} placeholder="Quiz ID"/>
        <input type="text" value={block.data.label || ""} onChange={e => updateData({ label: e.target.value })} className={inputClass} placeholder="Nhãn hiển thị"/>
      </div>;

    case "timeline":
      return <div className="space-y-2">
        {(block.data.events || []).map((ev: any, ei: number) => (
          <div key={ei} className="flex gap-2 items-start bg-amber-50/40 rounded-lg p-2 border border-amber-100">
            <span className="text-[10px] font-bold text-amber-400 pt-2">{ei + 1}</span>
            <div className="flex-1 grid grid-cols-3 gap-2">
              <input type="text" value={ev.date || ""} onChange={e => { const evs = [...(block.data.events || [])]; evs[ei] = { ...evs[ei], date: e.target.value }; updateData({ events: evs }); }} className={inputClass + " text-xs"} placeholder="Năm"/>
              <input type="text" value={ev.title || ""} onChange={e => { const evs = [...(block.data.events || [])]; evs[ei] = { ...evs[ei], title: e.target.value }; updateData({ events: evs }); }} className={inputClass + " text-xs col-span-2"} placeholder="Sự kiện"/>
            </div>
            <button onClick={() => updateData({ events: (block.data.events || []).filter((_: any, i: number) => i !== ei) })} className="text-rose-400 hover:text-rose-600 text-xs">✕</button>
          </div>
        ))}
        <button onClick={() => updateData({ events: [...(block.data.events || []), { date: "", title: "", description: "" }] })} className="text-xs font-semibold text-cyan-600 hover:text-cyan-700">+ Thêm sự kiện</button>
      </div>;

    case "quote":
      return <div className="space-y-2">
        <textarea value={block.data.text || ""} onChange={e => updateData({ text: e.target.value })} rows={3} className={inputClass} placeholder="Lời trích dẫn..." style={{ fontStyle: "italic" }}/>
        <input type="text" value={block.data.author || ""} onChange={e => updateData({ author: e.target.value })} className={inputClass} placeholder="Tác giả / Nguồn"/>
      </div>;

    case "map":
      return <div className="space-y-2">
        <input type="text" value={block.data.embedUrl || ""} onChange={e => updateData({ embedUrl: e.target.value })} className={inputClass} placeholder="URL nhúng bản đồ (Google Maps iframe src)"/>
        <input type="text" value={block.data.title || ""} onChange={e => updateData({ title: e.target.value })} className={inputClass} placeholder="Tiêu đề bản đồ"/>
      </div>;

    case "document":
      return <div className="space-y-2">
        <input type="text" value={block.data.title || ""} onChange={e => updateData({ title: e.target.value })} className={inputClass} placeholder="Tên tài liệu"/>
        <input type="text" value={block.data.url || ""} onChange={e => updateData({ url: e.target.value })} className={inputClass} placeholder="Link PDF / tài liệu"/>
        <textarea value={block.data.description || ""} onChange={e => updateData({ description: e.target.value })} rows={2} className={inputClass} placeholder="Mô tả ngắn"/>
      </div>;

    default:
      return <p className="text-xs text-amber-500">Không hỗ trợ loại block này.</p>;
  }
}
