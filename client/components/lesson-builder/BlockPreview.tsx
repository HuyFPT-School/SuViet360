"use client";

import type { ContentBlock, PodcastRef, GameRef } from "./types";

export default function BlockPreview({ block, podcasts, games }: {
  block: ContentBlock; podcasts: PodcastRef[]; games: GameRef[];
}) {
  switch (block.type) {
    case "text":
      return <div className="prose prose-sm max-w-none text-[#3B2F1E] whitespace-pre-wrap leading-relaxed">{block.data.text}</div>;

    case "image":
      return <div className="text-center">
        {block.data.imageUrl && block.data.imageUrl !== "pending-upload" && <img src={block._imageFile ? URL.createObjectURL(block._imageFile) : block.data.imageUrl} alt="" className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"/>}
        {block.data.caption && <p className="text-xs text-amber-600 mt-2 italic">{block.data.caption}</p>}
      </div>;

    case "podcast": {
      const p = podcasts.find(pp => pp._id === block.data.podcastId);
      return p ? <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <p className="font-bold text-purple-900">🎙️ {p.title}</p>
        {p.thumbnail && <img src={p.thumbnail} className="w-full max-w-sm h-32 object-cover rounded-lg mt-2"/>}
        <audio src={p.audioUrl} controls className="w-full mt-2"/>
      </div> : <span className="text-amber-500 italic">Chưa chọn podcast</span>;
    }

    case "audio":
      return block.data.audioUrl && block.data.audioUrl !== "pending-upload" ? <audio src={block.data.audioUrl} controls className="w-full"/> : <span className="text-amber-500 italic">Chưa có audio</span>;

    case "video":
      return block.data.url ? <div className="aspect-video rounded-xl overflow-hidden bg-black"><iframe src={block.data.url.replace("watch?v=", "embed/")} className="w-full h-full" allowFullScreen/></div> : <span className="text-amber-500 italic">Chưa có link</span>;

    case "game": {
      const g = games.find(gg => gg._id === block.data.gameId);
      return g ? <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center"><span className="text-2xl">🎮</span><p className="font-bold text-orange-800">{g.title}</p><p className="text-xs text-orange-500">{g.gameType}</p></div> : <span className="text-amber-500 italic">Chưa chọn game</span>;
    }

    case "quiz":
      return <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><p className="font-bold text-blue-800">❓ {block.data.label || "Câu đố"}</p></div>;

    case "timeline":
      return <div className="space-y-3 pl-4 border-l-2 border-cyan-300">
        {(block.data.events || []).map((ev: any, i: number) => (
          <div key={i} className="relative pl-6">
            <div className="absolute left-[-9px] top-1 w-4 h-4 bg-cyan-500 rounded-full border-2 border-white"/>
            <span className="text-xs font-bold text-cyan-600">{ev.date}</span>
            <p className="font-semibold text-[#3B2F1E]">{ev.title}</p>
          </div>
        ))}
      </div>;

    case "quote":
      return <blockquote className="border-l-4 border-amber-400 pl-4 py-2 bg-amber-50/50 rounded-r-lg italic text-[#3B2F1E]">
        <p>"{block.data.text}"</p>
        {block.data.author && <footer className="text-xs text-amber-600 mt-1 not-italic">— {block.data.author}</footer>}
      </blockquote>;

    case "map":
      return block.data.embedUrl ? <iframe src={block.data.embedUrl} className="w-full h-64 rounded-xl border" title={block.data.title || "Bản đồ"}/> : <span className="text-amber-500 italic">Chưa có URL</span>;

    case "document":
      return <a href={block.data.url} target="_blank" className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-gray-100 transition no-underline">
        <span className="text-2xl">📄</span><div><p className="font-bold text-[#3B2F1E] text-sm">{block.data.title || "Tài liệu"}</p>{block.data.description && <p className="text-xs text-amber-600">{block.data.description}</p>}</div>
      </a>;

    default:
      return null;
  }
}
