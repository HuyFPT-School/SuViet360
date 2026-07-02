"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

type ContentBlock = {
  type: string;
  data: Record<string, any>;
  order: number;
};

type LessonPart = {
  _id: string;
  title: string;
  learningObjective: string;
  contentBlocks: ContentBlock[];
  order: number;
};

/* ═══════════════════════════════════════════════════════════════
   Textbook-style block renderer (no borders, flowing layout)
   ═══════════════════════════════════════════════════════════════ */

function TextbookBlock({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "text":
      return (
        <div className="text-[#3a2312] leading-relaxed text-[15px] whitespace-pre-wrap mb-4">
          {block.data.text}
        </div>
      );

    case "image":
      return (
        <figure className="my-6 text-center">
          {block.data.imageUrl && block.data.imageUrl !== "pending-upload" && (
            <img
              src={block.data.imageUrl}
              alt={block.data.caption || ""}
              className="max-w-full max-h-96 mx-auto rounded-lg shadow-md object-contain"
            />
          )}
          {block.data.caption && (
            <figcaption className="text-sm text-[#8c6a34] italic mt-2">
              {block.data.caption}
            </figcaption>
          )}
        </figure>
      );

    case "podcast":
      return block.data.podcastId ? (
        <div className="my-6 bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl p-5">
          <PodcastInlinePlayer podcastId={block.data.podcastId} />
        </div>
      ) : null;

    case "audio":
      return block.data.audioUrl && block.data.audioUrl !== "pending-upload" ? (
        <div className="my-4">
          {block.data.title && (
            <p className="text-sm font-semibold text-[#8c6a34] mb-2">{block.data.title}</p>
          )}
          <audio src={block.data.audioUrl} controls className="w-full" />
        </div>
      ) : null;

    case "video":
      return block.data.url ? (
        <figure className="my-6">
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            <iframe
              src={block.data.url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
              className="w-full h-full"
              allowFullScreen
            />
          </div>
          {block.data.title && (
            <figcaption className="text-sm text-[#8c6a34] italic mt-2">{block.data.title}</figcaption>
          )}
        </figure>
      ) : null;

    case "game":
      return (
        <div className="my-6 bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl p-5 text-center">
          <p className="text-sm font-bold text-[#a84d28] mb-1">Tro choi tuong tac</p>
          <p className="text-xs text-[#8c6a34]">
            {block.data.label || "Hay mo tab Tro Choi de trai nghiem day du!"}
          </p>
        </div>
      );

    case "quiz":
      return (
        <div className="my-6 bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl p-5 text-center">
          <p className="text-sm font-bold text-[#a84d28] mb-1">Cau do kiem tra</p>
          <p className="text-xs text-[#8c6a34]">{block.data.label || "Tra loi cau hoi de kiem tra kien thuc"}</p>
        </div>
      );

    case "timeline":
      return (
        <div className="my-6 pl-4 border-l-2 border-[#c9a15a]">
          {(block.data.events || []).map((ev: any, i: number) => (
            <div key={i} className="relative pl-6 pb-4 last:pb-0">
              <div className="absolute left-[-9px] top-1.5 w-3.5 h-3.5 bg-[#c9a15a] rounded-full border-2 border-[#fcf8ef]" />
              <span className="text-xs font-bold text-[#a84d28]">{ev.date}</span>
              <p className="font-semibold text-[#3a2312] mt-0.5">{ev.title}</p>
              {ev.description && <p className="text-sm text-[#5c4a3d] mt-0.5">{ev.description}</p>}
            </div>
          ))}
        </div>
      );

    case "quote":
      return (
        <blockquote className="my-6 border-l-4 border-[#c9a15a] pl-5 py-3 bg-[#fdf9f1] rounded-r-lg italic text-[#3a2312] text-[15px]">
          <p>"{block.data.text}"</p>
          {block.data.author && (
            <footer className="text-sm text-[#8c6a34] mt-2 not-italic">— {block.data.author}</footer>
          )}
        </blockquote>
      );

    case "map":
      return block.data.embedUrl ? (
        <figure className="my-6">
          <iframe
            src={block.data.embedUrl}
            className="w-full h-64 rounded-xl border border-[#e8d5b5]"
            title={block.data.title || "Ban do"}
          />
          {block.data.title && (
            <figcaption className="text-sm text-[#8c6a34] italic mt-2">{block.data.title}</figcaption>
          )}
        </figure>
      ) : null;

    case "document":
      return block.data.url ? (
        <a
          href={block.data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 my-4 bg-[#fdf9f1] border border-[#e8d5b5] rounded-xl p-4 hover:bg-[#f5e9d3] transition no-underline group"
        >
          <span className="text-2xl text-[#c9a15a]">&#128196;</span>
          <div>
            <p className="font-bold text-[#3a2312] text-sm group-hover:text-[#a84d28] transition">
              {block.data.title || "Tai lieu tham khao"}
            </p>
            {block.data.description && (
              <p className="text-xs text-[#8c6a34] mt-0.5">{block.data.description}</p>
            )}
          </div>
        </a>
      ) : null;

    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   Inline podcast player (fetches podcast data)
   ═══════════════════════════════════════════════════════════════ */

function PodcastInlinePlayer({ podcastId }: { podcastId: string }) {
  const [podcast, setPodcast] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    api.get(`/podcasts/${podcastId}`).then(r => setPodcast(r.data.data)).catch(() => {});
  }, [podcastId]);

  if (!podcast) return <p className="text-sm text-[#8c6a34] italic">Dang tai podcast...</p>;

  return (
    <div>
      <p className="font-bold text-[#3a2312] mb-2">{podcast.title}</p>
      {podcast.thumbnail && (
        <img src={podcast.thumbnail} alt={podcast.title} className="w-full max-w-sm h-36 object-cover rounded-lg mb-3 border border-[#e8d5b5]" />
      )}
      <audio src={podcast.audioUrl} controls className="w-full" />
      <p className="text-xs text-[#8c6a34] mt-2">{podcast.description}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */

type Props = {
  lessonId: string;
};

export default function LessonContent({ lessonId }: Props) {
  const [parts, setParts] = useState<LessonPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!lessonId) { setLoading(false); return; }
    api
      .get<{ success: boolean; parts: LessonPart[] }>(`/lessons/${lessonId}/parts`)
      .then((r) => setParts(r.data.parts || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [lessonId]);

  if (loading) return <p className="text-[#8c6a34] text-center py-8">Dang tai noi dung bai hoc...</p>;
  if (error) return <p className="text-red-600 text-center py-8">Loi: {error}</p>;

  if (!parts.length) {
    return (
      <div className="text-center py-12">
        <p className="text-[#8c6a34] text-lg font-semibold mb-2">Chua co noi dung bai hoc</p>
        <p className="text-sm text-[#8c6a34]/70">Noi dung dang duoc bien soan, vui long quay lai sau.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {parts
        .sort((a, b) => a.order - b.order)
        .map((part) => (
          <section key={part._id} className="mb-10">
            {/* Part title */}
            <h2 className="font-display text-xl font-bold text-[#3a2312] mb-2 border-b-2 border-[#e8d5b5] pb-2">
              {part.title}
            </h2>
            {part.learningObjective && (
              <p className="text-sm text-[#8c6a34] italic mb-6 bg-[#fdf9f1] px-4 py-2 rounded-lg border-l-4 border-[#c9a15a]">
                {part.learningObjective}
              </p>
            )}

            {/* Content blocks — seamless flow */}
            <div className="space-y-1">
              {part.contentBlocks
                .sort((a, b) => a.order - b.order)
                .map((block, idx) => (
                  <TextbookBlock key={idx} block={block} />
                ))}
            </div>
          </section>
        ))}
    </div>
  );
}
