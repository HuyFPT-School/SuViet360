"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import type { LessonGameData } from "@/components/PhaserGame";

const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => (
    <p style={{ textAlign: "center", padding: 40, color: "#8B6914" }}>
      Đang tải game...
    </p>
  ),
});

function GameContent() {
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("id");

  const [gameData, setGameData] = useState<LessonGameData | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    total: number;
    passed: boolean;
    xpGained: number;
  } | null>(null);

  useEffect(() => {
    if (!lessonId) {
      // No ID: fetch first lesson
      api
        .get<{ success: boolean; lessons: { _id: string; title: string; game: LessonGameData }[] }>("/lessons")
        .then((res) => {
          if (res.data.lessons.length > 0) {
            const first = res.data.lessons[0];
            setTitle(first.title);
            setGameData(first.game);
          } else {
            setError("Chưa có bài học nào.");
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
      return;
    }

    api
      .get<{ success: boolean; lesson: { title: string; game: LessonGameData } }>(
        `/lessons/${lessonId}`
      )
      .then((res) => {
        setTitle(res.data.lesson.title);
        setGameData(res.data.lesson.game);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [lessonId]);

  const handleQuizComplete = async (score: number, total: number) => {
    if (!lessonId) return;
    setSubmitting(true);
    try {
      // 1. Submit quiz score
      const quizRes = await api.post<{ success: boolean; data: { xpGained: number; passed: boolean } }>(
        `/progress/quiz/${lessonId}/submit`,
        { score, total }
      );

      // 2. Mark lesson as completed
      const lessonRes = await api.post<{ success: boolean; data: { xpGained: number } }>(
        `/progress/lesson/${lessonId}/complete`
      );

      const totalXPGained = quizRes.data.data.xpGained + (lessonRes.data.data.xpGained || 0);

      setQuizResult({
        score,
        total,
        passed: quizRes.data.data.passed,
        xpGained: totalXPGained,
      });
      setShowResultModal(true);
    } catch (err: any) {
      console.error(err);
      alert("Lỗi lưu tiến độ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <p style={{ textAlign: "center", padding: 40, color: "#8B6914" }}>
        Đang tải dữ liệu bài học...
      </p>
    );
  }

  if (error) {
    return (
      <p style={{ textAlign: "center", padding: 40, color: "#cc3333" }}>
        Lỗi: {error}
      </p>
    );
  }

  if (!gameData) {
    return (
      <p style={{ textAlign: "center", padding: 40, color: "#8B6914" }}>
        Không có dữ liệu game.
      </p>
    );
  }

  return (
    <section style={{ padding: "24px 16px" }} className="relative">
      <h1 className="font-display text-2xl md:text-3xl font-bold text-amber-900 mb-1">{title}</h1>
      <p style={{ fontSize: 13, color: "#8B6914", marginBottom: 16 }}>
        Sử dụng phím ↑↓←→ để di chuyển nhân vật và khám phá
      </p>
      
      {submitting && (
        <div className="absolute inset-0 bg-[#fbf7ee]/60 backdrop-blur-xs flex items-center justify-center z-40">
          <p className="text-amber-800 font-semibold animate-pulse">Đang nạp kết quả và lưu tiến độ của bạn...</p>
        </div>
      )}

      <PhaserGame lessonGame={gameData} onQuizComplete={handleQuizComplete} />

      {/* ── Beautiful Result Overlay Modal ── */}
      {showResultModal && quizResult && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#fdfbf7] border-4 border-amber-600/40 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden border-t-8 border-t-amber-700">
            {/* Shiny gold details */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-amber-200/20 rounded-full blur-xl" />
            <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-amber-400/20 rounded-full blur-xl" />

            <span className="text-6xl block mb-4">
              {quizResult.passed ? "🏆" : "✊"}
            </span>

            <h2 className="font-display text-2xl font-bold text-amber-900 mb-2">
              {quizResult.passed ? "Kiểm Tra Hoàn Thành!" : "Cố Gắng Lên!"}
            </h2>

            <p className="text-sm text-amber-800 mb-4">
              Bạn đã giải đáp hết các câu hỏi lịch sử trên bản đồ bài học này.
            </p>

            {/* Score box */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 inline-block mx-auto min-w-[200px]">
              <div className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">
                Kết Quả Trả Lời
              </div>
              <div className="text-3xl font-extrabold text-amber-950">
                {quizResult.score} / {quizResult.total}
              </div>
              <div className={`text-xs font-bold mt-1.5 px-2 py-0.5 rounded-full inline-block ${
                quizResult.passed 
                  ? "bg-emerald-100 text-emerald-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {quizResult.passed ? "ĐẠT YÊU CẦU" : "CHƯA ĐẠT"}
              </div>
            </div>

            {/* XP Gained display */}
            {quizResult.xpGained > 0 ? (
              <div className="mb-6 flex justify-center items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 font-bold px-5 py-2.5 rounded-full shadow-md max-w-xs mx-auto animate-bounce">
                <span>⭐</span>
                <span>Nhận +{quizResult.xpGained} XP Tích Lũy!</span>
              </div>
            ) : (
              <div className="mb-6 text-xs text-amber-600 italic">
                Bạn đã nhận đủ XP của bài học này từ trước.
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/lessons"
                className="flex-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-sm text-sm"
              >
                Danh sách bài học
              </a>
              <button
                onClick={() => {
                  setShowResultModal(false);
                  // Reload stage
                  window.location.reload();
                }}
                className="flex-1 border border-amber-400 text-amber-800 hover:bg-amber-50 font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm"
              >
                Chơi lại
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <p style={{ textAlign: "center", padding: 40, color: "#8B6914" }}>
          Đang tải...
        </p>
      }
    >
      <GameContent />
    </Suspense>
  );
}
