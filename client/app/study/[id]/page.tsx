"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { getCsrfToken } from "@/components/staff/helpers";

type StudyUnit = {
  _id: string;
  title: string;
  summary: string;
  chapterId: {
    _id: string;
    title: string;
  };
  duration: number;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  thumbnail: string;
  contentBlocks: any[];
};

type Quiz = {
  _id: string;
  title: string;
  description: string;
  questions: Array<{
    question: string;
    options: string[];
    explanation?: string;
  }>;
};

const getEmbedSrc = (inputUrl: string) => {
  if (!inputUrl) return "";
  if (inputUrl.includes("<iframe")) {
    const match = inputUrl.match(/src="([^"]+)"/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return inputUrl;
};

export default function StudyUnitDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [unit, setUnit] = useState<StudyUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Quiz interactive state
  const [quizzesData, setQuizzesData] = useState<Record<string, Quiz>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number[]>>({}); // quizId -> array of selected indices
  const [quizResults, setQuizResults] = useState<Record<string, { passed: boolean; xpGained: number; correctIndices: number[] }>>({});
  const [submittingQuizId, setSubmittingQuizId] = useState<string | null>(null);
  const [podcasts, setPodcasts] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    
    const loadUnitAndProgress = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ success: boolean; data: { unit: StudyUnit } }>(`/curriculum/units/${id}`);
        setUnit(res.data.data.unit);

        const podsRes = await api.get<{ success: boolean; data: any[] }>("/podcasts");
        setPodcasts(podsRes.data.data || []);

        // Fetch completed status & quiz performance
        if (user) {
          const progRes = await api.get<{ success: boolean; data: { completed: boolean; quizPerformance: any } }>(
            `/curriculum/progress/${id}`
          );
          setCompleted(progRes.data.data.completed);
          
          if (progRes.data.data.quizPerformance) {
            const perf = progRes.data.data.quizPerformance;
            // Pre-fill quiz results if already completed in the past
            if (perf.quizId) {
              setQuizResults((prev) => ({
                ...prev,
                [perf.quizId]: {
                  passed: perf.passed,
                  xpGained: 0,
                  correctIndices: [], // We don't have indices now, but it is marked as done
                },
              }));
            }
          }
        }

        // Preload any embedded quizzes
        const quizBlocks = res.data.data.unit.contentBlocks.filter((b) => b.type === "quiz");
        await Promise.all(
          quizBlocks.map(async (block) => {
            const qId = block.data?.quizId;
            if (qId) {
              const qRes = await api.get<{ success: boolean; data: { quiz: Quiz } }>(`/curriculum/quizzes/${qId}`);
              setQuizzesData((prev) => ({ ...prev, [qId]: qRes.data.data.quiz }));
              // Initialize empty answers array
              setQuizAnswers((prev) => ({
                ...prev,
                [qId]: new Array(qRes.data.data.quiz.questions.length).fill(-1),
              }));
            }
          })
        );

      } catch (err) {
        console.error("Error loading unit:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUnitAndProgress();
  }, [id, user]);

  const getPodcastForGame = (gameId: string): string | null => {
    const pod = podcasts.find((p: any) => {
      const lessonId = p.lessonId?._id || p.lessonId;
      return lessonId === gameId;
    });
    return pod?._id || null;
  };

  const handleCompleteUnit = async () => {
    if (completed || completing || !id) return;
    
    setCompleting(true);
    try {
      const csrfToken = await getCsrfToken();
      await api.post(`/curriculum/progress/${id}/complete`, {}, {
        headers: { "x-csrf-token": csrfToken },
      });
      setCompleted(true);
    } catch (err) {
      console.error("Error completing unit:", err);
    } finally {
      setCompleting(false);
    }
  };

  const handleSelectQuizOption = (quizId: string, qIdx: number, optIdx: number) => {
    if (quizResults[quizId]) return; // Cannot change answer after submission
    
    setQuizAnswers((prev) => {
      const current = [...(prev[quizId] || [])];
      current[qIdx] = optIdx;
      return { ...prev, [quizId]: current };
    });
  };

  const handleSubmitQuiz = async (quizId: string) => {
    const answers = quizAnswers[quizId] || [];
    if (answers.some((ans) => ans === -1)) {
      alert("Vui lòng trả lời toàn bộ câu hỏi trước khi nộp bài!");
      return;
    }

    setSubmittingQuizId(quizId);
    try {
      const quiz = quizzesData[quizId];
      // Simple frontend mock score matching. Wait, we verify backend, so we count locally and submit
      // Note: We don't have correctIndex for security. We submit answers, but since API takes score and total directly:
      // Let's prompt the user or grade in backend. The backend `submitCurriculumQuiz` takes: { quizId, score, total }.
      // Wait, how does frontend know the score if correctIndex was deleted?
      // Ah! We can either guess or compute. But since the correctIndex was stripped from quiz details for students,
      // how does the frontend calculate `score` to pass to the backend?
      // Wait! Let's check `curriculumController.js` logic:
      // ```javascript
      // exports.submitCurriculumQuiz = async (req, res, next) => {
      //   const { quizId, score, total } = req.body;
      // ```
      // Oh! The frontend must calculate the score, but it doesn't have the correct answers!
      // This means we should grade the quiz in the BACKEND by passing the `answers` array, OR we must check it.
      // Wait, let's look at `curriculumRoutes.js` and see if we can edit `submitCurriculumQuiz` to let it accept `answers` array in the request body, and let the backend calculate the score!
      // Yes! That is 100% secure and extremely robust!
      // Let's check: if `req.body` contains `answers` (array of selected option indices), then the controller can:
      // 1. Load the quiz from MongoDB (which has `correctIndex` for all questions).
      // 2. Map through `answers` and compare with `quiz.questions[idx].correctIndex`.
      // 3. Increment `score` if they match.
      // 4. Calculate total as `quiz.questions.length`.
      // This is a beautiful design improvement that makes the API completely secure and foolproof!
      // Let's modify `submitCurriculumQuiz` on the backend first!
      
    } catch (err) {
      console.error(err);
    }
  };

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return "";
    let videoId = "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-amber-800 font-semibold italic animate-pulse">Đang tải nội dung bài học...</p>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-red-700 font-bold">Bài học không tồn tại hoặc đã bị gỡ bỏ.</p>
      </div>
    );
  }

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
      <div className="mx-auto w-full max-w-3xl space-y-8">
        {/* Navigation & Status Header */}
        <div className="flex items-center justify-between shrink-0">
          <Link
            href="/study"
            className="flex items-center gap-1.5 text-xs text-amber-850 hover:text-amber-900 font-bold uppercase tracking-wider"
          >
            <span>&larr;</span> Quay lại danh sách
          </Link>
          <span className="text-xs text-amber-700 font-bold">
            Chương: {unit.chapterId?.title || "Chương chung"}
          </span>
        </div>

        {/* Study Unit Title Header Card */}
        <div className="rounded-2xl border border-amber-200 bg-white/95 p-6 md:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded inline-flex items-center gap-1">
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {unit.duration} phút học
            </span>
            <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded">
              Cấp độ: {unit.difficulty === "Easy" ? "Dễ" : unit.difficulty === "Medium" ? "Vừa" : "Khó"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-amber-950 leading-snug">
            {unit.title}
          </h1>
          {unit.summary && <p className="text-sm text-stone-600 italic font-medium">{unit.summary}</p>}
        </div>

        {/* SEQUENTIAL CONTENT BLOCKS RENDERING */}
        <div className="space-y-8">
          {unit.contentBlocks.map((block, idx) => {
            const blockData = block.data || {};
            
            return (
              <div
                key={idx}
                className="rounded-2xl border border-amber-150 bg-white/90 p-6 shadow-sm space-y-4"
              >
                {block.type === "text" && (
                  <p className="text-stone-800 leading-relaxed text-base whitespace-pre-line font-medium">
                    {blockData.text}
                  </p>
                )}

                {block.type === "image" && blockData.imageUrl && (
                  <div className="space-y-2">
                    <img
                      src={blockData.imageUrl}
                      alt={blockData.caption || "Content image"}
                      className="w-full max-h-[400px] object-cover rounded-xl border border-amber-100 bg-amber-50/20 shadow-sm"
                    />
                    {blockData.caption && (
                      <p className="text-center text-xs text-amber-800 italic font-semibold">
                        {blockData.caption}
                      </p>
                    )}
                  </div>
                )}

                {block.type === "audio" && blockData.audioUrl && (
                  <div className="space-y-2 p-3 bg-amber-50/30 rounded-xl border border-amber-200">
                    <p className="text-xs font-semibold text-amber-900 flex items-center gap-1"><svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg><span>{blockData.title || "Tệp âm thanh học tập"}</span></p>
                    <audio src={blockData.audioUrl} controls className="w-full" />
                  </div>
                )}

                {block.type === "video" && blockData.url && (
                  <div className="space-y-2">
                    <div className="relative pb-[56.25%] h-0 rounded-xl overflow-hidden shadow-inner border border-amber-200">
                      <iframe
                        src={getYoutubeEmbedUrl(blockData.url)}
                        title={blockData.title || "Youtube video player"}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full"
                      />
                    </div>
                    {blockData.title && (
                      <p className="text-xs text-amber-800 font-bold italic">{blockData.title}</p>
                    )}
                  </div>
                )}

                {block.type === "quote" && (
                  <div className="relative p-6 bg-amber-50/30 border-l-4 border-amber-700 rounded-r-xl italic space-y-2">
                    <span className="absolute top-2 left-2 text-4xl text-amber-200 select-none leading-none">“</span>
                    <p className="text-amber-950 font-medium relative z-10 pl-2 text-base leading-relaxed">
                      {blockData.text}
                    </p>
                    {blockData.author && (
                      <p className="text-right text-xs text-amber-800 font-bold">— {blockData.author}</p>
                    )}
                  </div>
                )}

                {block.type === "map" && blockData.embedUrl && (
                  <div className="space-y-2">
                    <div className="w-full h-80 rounded-xl overflow-hidden border border-amber-200 bg-amber-50/20">
                      <iframe
                        src={getEmbedSrc(blockData.embedUrl)}
                        title={blockData.title || "Interactive Map"}
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    </div>
                    {blockData.title && (
                      <p className="text-xs text-amber-800 font-bold italic">{blockData.title}</p>
                    )}
                  </div>
                )}

                {block.type === "podcast" && blockData.podcastId && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-amber-600 font-bold uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <span>Podcast gợi ý</span>
                      </p>
                      <h4 className="font-semibold text-amber-950 text-sm mt-1">Nghe bài Podcast liên quan</h4>
                    </div>
                    <Link
                      href={`/podcasts/${blockData.podcastId}`}
                      className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-sm shrink-0"
                    >
                      Nghe ngay
                    </Link>
                  </div>
                )}

                {block.type === "game" && blockData.gameId && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-amber-600 font-bold uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Trò chơi liên kết</span>
                      </p>
                      <h4 className="font-semibold text-amber-950 text-sm mt-1">Chơi game 2D ôn tập lịch sử</h4>
                    </div>
                    <Link
                      href={getPodcastForGame(blockData.gameId) ? `/podcasts/${getPodcastForGame(blockData.gameId)}?tab=game` : "/podcasts"}
                      className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-sm shrink-0"
                    >
                      Chơi ngay
                    </Link>
                  </div>
                )}

                {/* TIMELINE RENDERER */}
                {block.type === "timeline" && blockData.events && blockData.events.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-widest border-b border-amber-200 pb-1.5">
                      Dòng thời gian sự kiện
                    </h3>
                    <div className="relative pl-6 border-l-2 border-amber-700/40 space-y-6">
                      {blockData.events.map((ev: any, evIdx: number) => (
                        <div key={evIdx} className="relative">
                          {/* Timeline bullet pin */}
                          <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-amber-700 border-2 border-white shadow-sm" />
                          <div>
                            <span className="text-xs font-bold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded border border-amber-200 font-mono">
                              {ev.date}
                            </span>
                            <h4 className="font-semibold text-amber-950 text-sm mt-1.5">{ev.title}</h4>
                            <p className="text-stone-600 text-xs mt-1 leading-relaxed font-medium">{ev.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* DYNAMIC INTERACTIVE QUIZ BLOCK */}
                {block.type === "quiz" && blockData.quizId && quizzesData[blockData.quizId] && (
                  <QuizComponent
                    quiz={quizzesData[blockData.quizId]}
                    answers={quizAnswers[blockData.quizId] || []}
                    onSelectOption={(qIdx, optIdx) => handleSelectQuizOption(blockData.quizId, qIdx, optIdx)}
                    onSubmit={async () => {
                      const quizId = blockData.quizId;
                      const answers = quizAnswers[quizId] || [];
                      if (answers.some((ans) => ans === -1)) {
                        alert("Vui lòng trả lời toàn bộ câu hỏi trước khi nộp bài!");
                        return;
                      }
                      
                      setSubmittingQuizId(quizId);
                      try {
                        const csrfToken = await getCsrfToken();
                        
                        // Load full quiz to compare correct answers on client for immediate grading, 
                        // and submit details. We call API with computed score. 
                        // Wait, to calculate score securely, we fetch full quiz correctIndex? No, API doesn't return correctIndex.
                        // How does frontend grade?
                        // Let's submit the answers array in body, wait, the API submitCurriculumQuiz we updated takes:
                        // { quizId, score, total }. So we can pass answers to a updated backend that grades, or we can update backend to support answers array!
                        // Let's check: we will update the backend controller so it accepts EITHER score directly OR computes from answers!
                        // Let's implement this!
                        const res = await api.post<{ success: boolean; data: any }>(
                          `/curriculum/progress/${id}/quiz-submit`,
                          { quizId, answers },
                          { headers: { "x-csrf-token": csrfToken } }
                        );

                        setQuizResults((prev) => ({
                          ...prev,
                          [quizId]: {
                            passed: res.data.data.passed,
                            xpGained: res.data.data.xpGained,
                            correctIndices: res.data.data.correctIndices || [],
                          },
                        }));
                      } catch (err) {
                        console.error(err);
                        alert("Lỗi khi nộp bài trắc nghiệm.");
                      } finally {
                        setSubmittingQuizId(null);
                      }
                    }}
                    result={quizResults[blockData.quizId]}
                    submitting={submittingQuizId === blockData.quizId}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Completion Box */}
        <div className="rounded-2xl border border-amber-200 bg-white/95 p-6 md:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-amber-950 text-sm">
              Hoàn tất bài học lịch thuyết
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Đọc kỹ các khối kiến thức trên và bấm xác nhận để được cộng điểm tích lũy.
            </p>
          </div>
          {completed ? (
            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs py-2 px-5 rounded-lg shadow-sm text-center shrink-0">
              ✓ Đã hoàn thành (+100 XP)
            </span>
          ) : (
            <button
              onClick={handleCompleteUnit}
              disabled={completing}
              className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs py-2.5 px-6 rounded-lg shadow-sm transition disabled:opacity-50 text-center shrink-0"
            >
              {completing ? "Đang gửi..." : "Hoàn thành bài viết (+100 XP)"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Subcomponent: QuizComponent
type QuizComponentProps = {
  quiz: Quiz;
  answers: number[];
  onSelectOption: (qIdx: number, optIdx: number) => void;
  onSubmit: () => void;
  result?: { passed: boolean; xpGained: number; correctIndices: number[] };
  submitting: boolean;
};

function QuizComponent({
  quiz,
  answers,
  onSelectOption,
  onSubmit,
  result,
  submitting,
}: QuizComponentProps) {
  return (
    <div className="space-y-4">
      <div className="border-b border-amber-200 pb-2">
        <h3 className="font-semibold text-amber-950 text-base leading-snug flex items-center gap-1.5">
          <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          <span>Trắc nghiệm ôn tập: {quiz.title}</span>
        </h3>
        {quiz.description && <p className="text-xs text-stone-500 mt-1 font-medium">{quiz.description}</p>}
      </div>

      <div className="space-y-6">
        {quiz.questions.map((q, qIdx) => {
          const selected = answers[qIdx];
          const isSubmitted = !!result;
          const correctIdx = result?.correctIndices?.[qIdx];

          return (
            <div key={qIdx} className="space-y-2.5">
              <h4 className="text-sm font-semibold text-amber-900">
                Câu {qIdx + 1}: {q.question}
              </h4>
              <div className="grid gap-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = selected === optIdx;
                  
                  let optionClass = "bg-stone-50 hover:bg-amber-50/40 text-amber-950 border-amber-200";
                  
                  if (isSubmitted) {
                    const isCorrectOption = correctIdx === optIdx;
                    if (isCorrectOption) {
                      optionClass = "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold";
                    } else if (isSelected) {
                      optionClass = "bg-rose-50 text-rose-800 border-rose-300 font-semibold";
                    } else {
                      optionClass = "bg-stone-50/50 text-stone-400 border-stone-200";
                    }
                  } else if (isSelected) {
                    optionClass = "bg-amber-700 text-white border-amber-750 font-bold";
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => onSelectOption(qIdx, optIdx)}
                      className={`text-left text-xs px-4 py-2.5 rounded-lg border transition ${optionClass}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Explanations shown only after submission */}
              {isSubmitted && q.explanation && (
                <div className="mt-2 text-xs bg-amber-50/50 p-3 rounded-lg border border-amber-100 text-amber-800 font-medium">
                  <strong>💡 Giải thích:</strong> {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {result ? (
        <div className={`p-4 rounded-xl border text-center ${
          result.passed ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <h4 className="font-bold text-sm">
            {result.passed ? "🎉 Chúc mừng! Bạn đã vượt qua bài test!" : "😢 Rất tiếc, bạn chưa đạt điểm tối thiểu."}
          </h4>
          {result.xpGained > 0 && (
            <p className="text-xs font-semibold mt-1">Bạn nhận được +{result.xpGained} XP!</p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="w-full bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs py-2.5 rounded-lg shadow-sm transition disabled:opacity-50"
        >
          {submitting ? "Đang nộp bài..." : "Nộp bài trắc nghiệm"}
        </button>
      )}
    </div>
  );
}
