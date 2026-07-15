"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Lesson, Podcast, LessonFormState } from "@/components/staff/types";
import GameTab from "../../components/staff/GameTab";
import PodcastTab from "../../components/staff/PodcastTab";
import BlogTab from "../../components/staff/BlogTab";
import LessonRequestsTab from "../../components/staff/LessonRequestsTab";
import ChapterTab from "../../components/staff/ChapterTab";
import StudyUnitTab from "../../components/staff/StudyUnitTab";
import QuizTab from "../../components/staff/QuizTab";

export default function StaffPage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [isHydrating, setIsHydrating] = useState(true);
  
  // Shared data states
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [podcastsLoading, setPodcastsLoading] = useState(true);

  // Tab & Notification state
  const [activeTab, setActiveTab] = useState<"lessons" | "podcasts" | "chapters" | "study-units" | "quizzes" | "blog" | "lesson-requests">("lessons");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Cross-tab data flow
  const [prefilledGameForm, setPrefilledGameForm] = useState<LessonFormState | null>(null);

  // Stats cache updated by tabs
  const [blogCounts, setBlogCounts] = useState({ pending: 0, reports: 0 });
  const [requestsCount, setRequestsCount] = useState(0);
  const [chaptersCount, setChaptersCount] = useState(0);
  const [quizzesCount, setQuizzesCount] = useState(0);

  const canAccess = user?.role === "staff" || user?.role === "admin";

  const loadLessons = async () => {
    setLessonsLoading(true);
    try {
      const res = await api.get<{ success: boolean; lessons: Lesson[] }>("/lessons");
      setLessons(res.data.lessons);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Không thể tải danh sách trò chơi." });
    } finally {
      setLessonsLoading(false);
    }
  };

  const loadPodcasts = async () => {
    setPodcastsLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Podcast[] }>("/staff/podcasts");
      setPodcasts(res.data.data);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Không thể tải danh sách podcast." });
    } finally {
      setPodcastsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setIsHydrating(false));
  }, [refreshUser]);

  useEffect(() => {
    if (!user) return;
    loadLessons();
    loadPodcasts();
  }, [user]);

  const stats = useMemo(() => {
    const total = lessons.length;
    const latest = lessons[0]?.updatedAt || lessons[0]?.createdAt || "";
    return { total, latest };
  }, [lessons]);

  const handleDesignGame = (req: any) => {
    setPrefilledGameForm({
      title: `Game cho: ${req.title}`,
      content: `Thiết kế game đồng hành cùng podcast "${req.title}" thuộc thời kỳ ${req.historicalPeriod || "Yêu cầu VIP"}.`,
      spawnX: "400",
      spawnY: "300",
      tilesetNames: [],
      tilemapFile: null,
      tilesetFiles: [],
      idleSprites: [],
      runSprites: [],
    });
    setActiveTab("lessons");
    setMessage({ type: "success", text: `Đang tạo Game liên kết cho yêu cầu: "${req.title}"` });
  };

  if (authLoading || isHydrating) {
    return (
      <section className="px-6 py-12">
        <p className="text-center text-amber-800 text-lg">Đang tải tài khoản...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="px-6 py-12 text-center space-y-3">
        <h1 className="text-2xl font-semibold text-amber-900">Cần đăng nhập</h1>
        <p className="text-amber-700">Vui lòng đăng nhập để truy cập khu vực Staff.</p>
        <Link href="/login" className="text-amber-900 font-semibold underline">
          Đến trang đăng nhập
        </Link>
      </section>
    );
  }

  if (!canAccess) {
    return (
      <section className="px-6 py-12 text-center space-y-3">
        <h1 className="text-2xl font-semibold text-amber-900">Không có quyền truy cập</h1>
        <p className="text-amber-700">Tài khoản của bạn không có quyền quản lý khu vực này.</p>
        <Link href="/" className="text-amber-900 font-semibold underline">
          Quay về trang chủ
        </Link>
      </section>
    );
  }

  return (
    <div className="w-full min-h-screen" style={{ backgroundImage: "linear-gradient(rgba(247, 243, 233, 0.45), rgba(247, 243, 233, 0.45)), url('/textures/paper.jpg')", backgroundSize: "cover", backgroundAttachment: "fixed" }}>
      <section className="mx-auto w-full max-w-6xl px-6 py-10 space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-600">Staff workspace</p>
            <h1 className="text-3xl font-display font-semibold text-amber-950">
              Bảng điều phối trò chơi
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="rounded-xl border border-amber-200 bg-white/90 backdrop-blur-sm px-4 py-2 shadow-sm">
              <p className="text-amber-500 text-xs uppercase tracking-widest">
                {activeTab === "lessons"
                  ? "Tổng trò chơi"
                  : activeTab === "podcasts"
                    ? "Tổng podcast"
                    : activeTab === "lesson-requests"
                      ? "Tổng yêu cầu"
                      : activeTab === "chapters"
                        ? "Tổng chương"
                        : activeTab === "quizzes"
                          ? "Tổng Quiz"
                          : "Chờ duyệt / Báo cáo"}
              </p>
              <p className="text-amber-900 text-lg font-semibold">
                {activeTab === "lessons"
                  ? stats.total
                  : activeTab === "podcasts"
                    ? podcasts.length
                    : activeTab === "lesson-requests"
                      ? requestsCount
                      : activeTab === "chapters"
                        ? chaptersCount
                        : activeTab === "quizzes"
                          ? quizzesCount
                          : `${blogCounts.pending} / ${blogCounts.reports}`}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white/90 backdrop-blur-sm px-4 py-2 shadow-sm">
              <p className="text-amber-500 text-xs uppercase tracking-widest">Cập nhật gần nhất</p>
              <p className="text-amber-900 text-sm font-semibold">
                {activeTab === "lessons"
                  ? stats.latest ? new Date(stats.latest).toLocaleDateString("vi-VN") : "-"
                  : activeTab === "podcasts"
                    ? podcasts[0]?.updatedAt || podcasts[0]?.createdAt
                      ? new Date(podcasts[0]?.updatedAt || podcasts[0]?.createdAt).toLocaleDateString("vi-VN")
                      : "-"
                    : "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex border-b border-amber-200 flex-wrap gap-y-2">
          <button
            onClick={() => { setActiveTab("lessons"); setMessage(null); }}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${activeTab === "lessons"
                ? "border-amber-700 text-amber-950 font-bold"
                : "border-transparent text-amber-650 hover:text-amber-800"
              }`}
          >
            Quản lý trò chơi
          </button>
          <button
            onClick={() => { setActiveTab("podcasts"); setMessage(null); }}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${activeTab === "podcasts"
                ? "border-amber-700 text-amber-950 font-bold"
                : "border-transparent text-amber-650 hover:text-amber-800"
              }`}
          >
            Quản lý podcast
          </button>
          {/* <button
            onClick={() => { setActiveTab("chapters"); setMessage(null); }}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${activeTab === "chapters"
                ? "border-amber-700 text-amber-950 font-bold"
                : "border-transparent text-amber-650 hover:text-amber-800"
              }`}
          >
            Quản lý chương
          </button>
          <button
            onClick={() => { setActiveTab("study-units"); setMessage(null); }}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${activeTab === "study-units"
                ? "border-amber-700 text-amber-950 font-bold"
                : "border-transparent text-amber-650 hover:text-amber-800"
              }`}
          >
            Bài học lý thuyết
          </button>
          <button
            onClick={() => { setActiveTab("quizzes"); setMessage(null); }}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${activeTab === "quizzes"
                ? "border-amber-700 text-amber-950 font-bold"
                : "border-transparent text-amber-650 hover:text-amber-800"
              }`}
          >
            Ngân hàng Quiz
          </button> */}
          <button
            onClick={() => { setActiveTab("blog"); setMessage(null); }}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${activeTab === "blog"
                ? "border-amber-700 text-amber-950 font-bold"
                : "border-transparent text-amber-650 hover:text-amber-800"
              }`}
          >
            Kiểm duyệt diễn đàn
          </button>
          <button
            onClick={() => { setActiveTab("lesson-requests"); setMessage(null); }}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${activeTab === "lesson-requests"
                ? "border-amber-700 text-amber-950 font-bold"
                : "border-transparent text-amber-650 hover:text-amber-800"
              }`}
          >
            Yêu cầu bài học
          </button>
        </div>

        {message && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
              }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-6">
          {activeTab === "lessons" && (
            <GameTab
              user={user}
              lessons={lessons}
              lessonsLoading={lessonsLoading}
              onRefreshLessons={loadLessons}
              prefilledGameForm={prefilledGameForm}
              onClearPrefilledGameForm={() => setPrefilledGameForm(null)}
              setMessage={setMessage}
            />
          )}

          {activeTab === "podcasts" && (
            <PodcastTab
              user={user}
              lessons={lessons}
              podcasts={podcasts}
              podcastsLoading={podcastsLoading}
              onRefreshPodcasts={loadPodcasts}
              setMessage={setMessage}
            />
          )}

          {/* {activeTab === "chapters" && (
            <ChapterTab
              setMessage={setMessage}
              onUpdateCounts={setChaptersCount}
            />
          )}

          {activeTab === "study-units" && (
            <StudyUnitTab
              user={user}
              lessons={lessons}
              podcasts={podcasts}
              setMessage={setMessage}
            />
          )}

          {activeTab === "quizzes" && (
            <QuizTab
              user={user}
              setMessage={setMessage}
            />
          )} */}

          {activeTab === "blog" && (
            <BlogTab
              setMessage={setMessage}
              onUpdateCounts={(pending, reports) => setBlogCounts({ pending, reports })}
            />
          )}

          {activeTab === "lesson-requests" && (
            <LessonRequestsTab
              onDesignGame={handleDesignGame}
              setMessage={setMessage}
              onUpdateCounts={setRequestsCount}
            />
          )}
        </div>
      </section>
    </div>
  );
}