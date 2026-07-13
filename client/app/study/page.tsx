"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

type Chapter = {
  _id: string;
  title: string;
  description: string;
  grade: number;
  order: number;
  coverImage: string;
  status: string;
};

type StudyUnit = {
  _id: string;
  title: string;
  summary: string;
  duration: number;
  difficulty: "Easy" | "Medium" | "Hard";
  thumbnail: string;
  status: string;
};

export default function StudyPage() {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [unitsMap, setUnitsMap] = useState<Record<string, StudyUnit[]>>({});
  const [completedUnits, setCompletedUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<"All" | 10 | 11 | 12>("All");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load user progress to check completed study units
        if (user) {
          const progRes = await api.get<{ success: boolean; data: any }>("/progress/dashboard");
          if (progRes.data.success && progRes.data.data.completedUnits) {
            setCompletedUnits(progRes.data.data.completedUnits);
          }
        }

        // Load published chapters
        const chRes = await api.get<{ success: boolean; data: { chapters: Chapter[] } }>("/curriculum/chapters");
        const publishedChapters = chRes.data.data.chapters.filter((c) => c.status === "Published");
        setChapters(publishedChapters);

        // Fetch units for each chapter concurrently
        const newMap: Record<string, StudyUnit[]> = {};
        await Promise.all(
          publishedChapters.map(async (ch) => {
            const uRes = await api.get<{ success: boolean; data: { units: StudyUnit[] } }>(
              `/curriculum/chapters/${ch._id}/units`
            );
            newMap[ch._id] = uRes.data.data.units;
          })
        );
        setUnitsMap(newMap);
      } catch (err) {
        console.error("Error loading curriculum data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const filteredChapters = chapters.filter((ch) => {
    if (gradeFilter === "All") return true;
    return ch.grade === gradeFilter;
  });

  return (
    <div
      className="w-full min-h-screen py-12 px-6"
      style={{
        backgroundImage:
          "linear-gradient(rgba(247, 243, 233, 0.45), rgba(247, 243, 233, 0.45)), url('/textures/paper.jpg')",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="mx-auto w-full max-w-5xl space-y-10">
        {/* Gorgeous Header */}
        <div className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-600 font-bold">Hệ thống bài học</p>
          <h1
            className="text-4xl font-display font-bold text-amber-950 tracking-wide uppercase"
            style={{ fontFamily: "Cinzel, serif" }}
          >
            Khám phá Sử Việt
          </h1>
          <div className="h-0.5 w-32 bg-amber-700 mx-auto rounded-full" />
          <p className="text-sm text-amber-800 max-w-xl mx-auto italic font-medium">
            Hành trình nghiên cứu và tìm hiểu sâu sắc về lịch sử hào hùng của dân tộc Việt Nam qua các chương mục lý thuyết sinh động.
          </p>
        </div>

        {/* Grade Navigation Tabs */}
        <div className="flex justify-center gap-3 border-b border-amber-250 pb-4">
          {(["All", 10, 11, 12] as const).map((grade) => (
            <button
              key={grade}
              onClick={() => setGradeFilter(grade)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg border transition ${
                gradeFilter === grade
                  ? "bg-amber-800 text-white border-amber-800 shadow-md font-bold"
                  : "bg-white/80 text-amber-900 border-amber-200 hover:bg-amber-50"
              }`}
            >
              {grade === "All" ? "Tất cả các lớp" : `Khối lớp ${grade}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-amber-900 font-semibold italic animate-pulse">
            Đang tải dữ liệu học tập lịch sử...
          </div>
        ) : (
          <div className="space-y-12">
            {filteredChapters.map((chapter) => {
              const units = unitsMap[chapter._id] || [];
              if (units.length === 0) return null; // Only show chapters with published units

              return (
                <div key={chapter._id} className="space-y-6">
                  {/* Chapter Banner */}
                  <div className="relative rounded-2xl overflow-hidden border border-amber-200 shadow-md bg-amber-900 text-white min-h-[140px] flex items-center">
                    {chapter.coverImage && (
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-30 transition-transform duration-700 hover:scale-105"
                        style={{ backgroundImage: `url('${chapter.coverImage}')` }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-950 via-amber-950/80 to-transparent" />
                    <div className="relative z-10 p-6 md:p-8 space-y-2">
                      <span className="bg-amber-100/20 text-amber-100 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border border-amber-100/30">
                        Chương học lớp {chapter.grade}
                      </span>
                      <h2 className="text-xl md:text-2xl font-display font-semibold tracking-wide">
                        {chapter.title}
                      </h2>
                      {chapter.description && (
                        <p className="text-xs text-amber-200 max-w-2xl line-clamp-2">
                          {chapter.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Study Units Grid */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {units.map((unit) => {
                      const isCompleted = completedUnits.includes(unit._id);
                      return (
                        <div
                          key={unit._id}
                          className="rounded-2xl border border-amber-200 bg-white/95 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:border-amber-300 transition-all"
                        >
                          <div className="flex gap-4 p-5 flex-1">
                            {unit.thumbnail ? (
                              <img
                                src={unit.thumbnail}
                                alt={unit.title}
                                className="w-20 h-20 object-cover rounded-xl border border-amber-100 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-20 h-20 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                              </div>
                            )}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-amber-950 text-sm leading-snug line-clamp-2">
                                  {unit.title}
                                </h3>
                                {isCompleted && (
                                  <span
                                    title="Đã hoàn thành"
                                    className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-250 shrink-0"
                                  >
                                    Đã học
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-stone-600 line-clamp-2">
                                {unit.summary}
                              </p>
                              <div className="flex items-center gap-2 pt-1 flex-wrap">
                                <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-0.5">
                                  <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  {unit.duration} phút
                                </span>
                                <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                                  Level: {unit.difficulty === "Easy" ? "Dễ" : unit.difficulty === "Medium" ? "Vừa" : "Khó"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="border-t border-amber-100 bg-amber-50/20 px-5 py-3 flex justify-end shrink-0">
                            <Link
                              href={`/study/${unit._id}`}
                              className="rounded-lg bg-amber-800 text-white font-semibold text-xs px-3.5 py-1.5 hover:bg-amber-900 transition shadow-sm"
                            >
                              Vào học bài
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {chapters.length === 0 && (
              <div className="text-center py-20 text-stone-500 italic">
                Hiện tại chưa có chương học nào được công bố. Vui lòng quay lại sau!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
