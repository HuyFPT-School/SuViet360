"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import dynamic from "next/dynamic";
import LessonContent from "@/components/lesson-builder/LessonContent";

const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => <p className="text-center py-10 text-black text-lg font-medium">Dang tai tro choi...</p>,
});

type LessonData = {
  _id: string; title: string; content: string;
  grade?: number; order?: number;
  chapter?: { _id: string; title: string; grade: number } | null;
  podcast?: { _id: string; title: string; thumbnail: string; audioUrl: string; level: string; category: string; duration: number } | null;
  game: {
    tilemapJsonUrl: string;
    tilesets: { name: string; imageUrl: string }[];
    character: { animations: Record<string, { key: string; frame: number; imageUrl: string }[]> };
    spawnPoint: { x: number; y: number };
  };
};

export default function LessonDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"content" | "game">("content");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api.get<{ success: boolean; lesson: LessonData }>(`/lessons/${id}`)
      .then((r) => { if (r.data.success) setLesson(r.data.lesson); else setError("Khong tim thay bai hoc."); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F3E9" }}>
      <p className="text-black text-xl animate-pulse">Dang tai bai hoc...</p>
    </div>
  );

  if (error || !lesson) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: "#F7F3E9" }}>
      <p className="text-black text-xl font-semibold">{error || "Khong tim thay bai hoc."}</p>
      <Link href="/lessons" className="text-black text-lg font-bold underline hover:text-black">Quay lại ành Trình</Link>
    </div>
  );

  return (
    <div className="min-h-screen pb-20" style={{ background: "linear-gradient(rgba(247,243,233,0.3), rgba(247,243,233,0.3)), url('/images/Background-lich-su.jpg')", backgroundSize: "cover", backgroundAttachment: "fixed" }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="text-sm font-medium text-black mb-6 flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-black transition">Trang chủ</Link>
          <span className="text-black">/</span>
          <Link href="/lessons" className="hover:text-black transition">Hành Trình</Link>
          {lesson.chapter && (<><span className="text-black">/</span><span className="text-black font-semibold">Lop {lesson.chapter.grade} - {lesson.chapter.title}</span></>)}
          <span className="text-black">/</span>
          <span className="text-black font-bold">{lesson.title}</span>
        </div>

        <div className="bg-white/85 backdrop-blur border-2 border-amber-200 rounded-2xl shadow-md p-6 sm:p-10">

        {/* Title & Meta */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {lesson.grade && <span className="text-sm font-bold uppercase bg-[#8B6914] text-white px-3 py-1 rounded-lg shadow-sm">Lop {lesson.grade}</span>}
          </div>
          {lesson.chapter && <h1 className="text-3xl sm:text-4xl font-display font-bold text-black leading-tight mb-3">{lesson.chapter.title}</h1>}
          <h2 className="text-xl sm:text-2xl font-display font-bold text-black/70 leading-tight mb-4">{lesson.title}</h2>
          {lesson.content && <p className="text-lg text-black leading-relaxed">{lesson.content}</p>}
          {lesson.podcast && (
            <Link href={`/audio/${lesson._id}`}
              className="mt-5 inline-flex items-center gap-3 bg-amber-100 border-2 border-amber-300 rounded-xl px-5 py-3 text-base font-semibold text-black hover:bg-amber-200 hover:border-amber-400 transition shadow-sm">
              <span className="text-xl">&#9654;</span> Nghe Podcast: {lesson.podcast.title}
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-amber-300 mb-8">
          {[
            { key: "content" as const, label: "Nội dung bài học" },
            { key: "game" as const, label: "Trò chơi tương tác" },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-3 text-base font-bold uppercase tracking-wider transition border-b-2 -mb-[2px] ${
                activeTab === tab.key ? "border-[#8B6914] text-black" : "border-transparent text-black hover:text-black"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Tab */}
        {activeTab === "content" && (
          <div className="pt-4">
            <LessonContent lessonId={id} />
          </div>
        )}

        {/* Game Tab */}
        {activeTab === "game" && (
          <div className="pt-4">
            {lesson.game ? (
              <div>
                <p className="text-base text-black mb-6 leading-relaxed">Sử dụng các phím mũi tên để di chuyển nhân vật. Khám phá bản đồ và hoàn thành thử thách!</p>
                <div className="border-2 border-amber-300 rounded-xl overflow-hidden bg-amber-50/30 p-4 flex items-center justify-center min-h-[500px]">
                  <PhaserGame lessonGame={lesson.game} />
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-6xl mb-5 text-black">&#127918;</p>
                <p className="text-xl font-display font-bold text-black mb-2">Chưa có trò chơi</p>
                <p className="text-base text-black">Trò chơi đang được phát triển, vui lòng thử lại sau.</p>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
