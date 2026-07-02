"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { useAppSelector } from "@/store";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

type LessonRef = {
  _id: string; title: string; content: string; order: number;
  grade?: number;
  podcast?: { _id: string; title: string; thumbnail: string; audioUrl: string; duration: number } | null;
  status?: string;
};

type ChapterWithLessons = {
  _id: string; title: string; description: string; grade: number; order: number;
  coverImage: string;
  lessonCount: number;
  lessons: LessonRef[];
};

/* ═══════════════════════════════════════════════════════════════
   Icons
   ═══════════════════════════════════════════════════════════════ */

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);
const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);
const BarChartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
);
const HeadphonesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>
);
const GameIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>
);
const ThemeBookIcon = () => (
  <div className="w-12 h-12 rounded-full border-2 border-[#e8d5b5] bg-[#fdf9f1] flex items-center justify-center text-[#c9a15a] flex-shrink-0 shadow-inner">
     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
     </svg>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════ */

export default function JourneyPage() {
  const [chapters, setChapters] = useState<ChapterWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api
      .get<{ success: boolean; chapters: ChapterWithLessons[] }>("/lessons/chapters/with-lessons")
      .then((r) => {
        if (r.data.success) {
          const chs = r.data.chapters.map((ch) => ({
            ...ch,
            lessons: (ch.lessons || []).filter((l) => l.status === "Published"),
          }));
          setChapters(chs);
          if (chs.length > 0) {
            setExpandedChapters({ [chs[0]._id]: true });
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <p className="text-[#8c6a34] text-lg animate-pulse">Dang tai hanh trinh hoc tap...</p>
      </div>
    );
  }

  const totalLessons = chapters.reduce((s, c) => s + c.lessons.length, 0);

  return (
    <div className="min-h-screen pb-16 bg-transparent">
      {/* Hero */}
      <div className="w-full bg-transparent relative overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 py-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <div className="text-sm font-medium text-[#8c6a34] mb-2 uppercase tracking-widest flex items-center gap-2">
               <Link href="/" className="hover:underline">Trang chủ</Link>
               <ChevronRightIcon />
               <span>Mục lục</span>
            </div>
            <h2 className="text-[#a84d28] font-bold tracking-widest text-sm mb-4 uppercase">Chương Trình Lịch Sử</h2>
            <h1 className="text-4xl md:text-5xl font-bold text-[#3a2312] leading-tight font-display mb-4 max-w-2xl">
              Hành Trình Lịch Sử<br/>Việt Nam
            </h1>
            <p className="text-[#5c4a3d] text-lg max-w-xl leading-relaxed">
              Khám phá lịch sử Việt Nam qua từng chương học được biên soạn công phu.
              Mỗi bài học đều có nội dung sinh động, podcast và trò chơi tương tác giúp bạn
              tiếp thu kiến thức một cách thú vị và hiệu quả.
            </p>
            <div className="flex items-center gap-4 mt-5">
              <span className="bg-[#fdf9f1] border border-[#e8d5b5] rounded-lg px-4 py-2 text-sm font-semibold text-[#3a2312]">
                {chapters.length} Chương
              </span>
              <span className="bg-[#fdf9f1] border border-[#e8d5b5] rounded-lg px-4 py-2 text-sm font-semibold text-[#3a2312]">
                {totalLessons} Bài học
              </span>
            </div>
          </div>
          <div className="w-full md:w-[320px] shrink-0 flex justify-center">
            <img 
              src="/images/viet_nam.png" 
              alt="Minh hoa lich su Viet Nam" 
              className="w-[260px] h-auto object-contain rounded-xl border border-[#e8d5b5] bg-[#fffbf2]/70 p-1.5 shadow-md hover:scale-[1.02] transition-transform duration-300"
            />
          </div>
        </div>
      </div>

      {/* Chapters */}
      <div className="max-w-[1200px] mx-auto px-6 mt-8">
        <div className="flex flex-col gap-4">
          {chapters.map((ch) => {
            const isExpanded = expandedChapters[ch._id];

            return (
              <div key={ch._id} className="bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl overflow-hidden shadow-sm transition-all">
                {/* Chapter Header */}
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#f3e9d8]/50"
                  onClick={() => toggleChapter(ch._id)}
                >
                   <div className="flex items-center gap-4">
                      <ThemeBookIcon />
                       <div>
                          <div className="text-[#a84d28] font-bold text-xs uppercase tracking-wider mb-1">
                            Chương trình Lớp {ch.grade}
                          </div>
                          <h3 className="text-[#3a2312] font-bold text-lg font-display">{ch.title}</h3>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-[#8c6a34] text-xs">{ch.lessons.length} bài học</span>
                          </div>
                       </div>
                   </div>
                   <div className="text-[#8c6a34] px-4">
                      {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                   </div>
                </div>

                {/* Lesson List */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-[#e8d5b5]/50 bg-[#f9f4e8]/50">
                     {ch.lessons.length === 0 ? (
                       <div className="text-center py-10">
                         <p className="text-4xl mb-3 text-[#d8c39d]">&#128218;</p>
                         <p className="text-sm text-[#8c6a34]">Chưa có bài học nào trong chương này.</p>
                       </div>
                     ) : (
                       <div className="flex flex-col gap-3 mt-4">
                         {ch.lessons
                           .sort((a, b) => a.order - b.order)
                           .map((lesson, i) => (
                             <Link 
                               key={lesson._id} 
                               href={`/lessons/${lesson._id}`}
                               className="bg-white border border-[#e8d5b5] rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:border-[#c9a15a] transition-all shadow-sm group cursor-pointer"
                             >
                                {/* Serial Number */}
                                <div className="w-8 text-center text-[#c9a15a] font-bold font-display text-lg opacity-60 flex-shrink-0 self-center">
                                   {(i+1).toString().padStart(2, '0')}
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                   <h4 className="text-[#3a2312] font-bold text-[15px] group-hover:text-[#a84d28] transition-colors line-clamp-2 leading-snug">
                                     {lesson.title}
                                   </h4>
                                   <div className="flex items-center gap-4 text-xs text-[#8c6a34] mt-1.5">
                                      <span className="flex items-center gap-1">
                                        <CalendarIcon /> Lop {ch.grade}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <BarChartIcon /> Bai {lesson.order || i + 1}
                                      </span>
                                   </div>
                                   {lesson.content && (
                                      <p className="text-[#5c4a3d] text-xs mt-2 line-clamp-2 leading-relaxed">
                                         {lesson.content}
                                      </p>
                                   )}
                                   {/* Badges */}
                                   <div className="flex items-center gap-2 mt-2">
                                      {lesson.podcast && (
                                        <span className="text-[10px] font-semibold bg-[#f5ebd3] text-[#a84d28] px-2 py-0.5 rounded-full border border-[#e8d5b5] flex items-center gap-1">
                                          <HeadphonesIcon /> Podcast
                                        </span>
                                      )}
                                      <span className="text-[10px] font-semibold bg-[#f5ebd3] text-[#a84d28] px-2 py-0.5 rounded-full border border-[#e8d5b5] flex items-center gap-1">
                                        <GameIcon /> Tương tác
                                      </span>
                                   </div>
                                </div>

                                {/* Arrow */}
                                <div className="text-[#c9a15a] text-sm group-hover:translate-x-1 transition-transform shrink-0 self-center">
                                   &#9654;
                                </div>
                             </Link>
                           ))}
                       </div>
                     )}
                  </div>
                )}
              </div>
            );
          })}

          {chapters.length === 0 && (
            <div className="text-center py-16 bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl">
              <p className="text-5xl mb-4 text-[#d8c39d]">&#128218;</p>
              <p className="text-lg font-display font-bold text-[#3a2312] mb-2">Chưa có chương học nào</p>
              <p className="text-sm text-[#8c6a34]">Nội dung đang được biên soạn, vui lòng quay lại sau.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
