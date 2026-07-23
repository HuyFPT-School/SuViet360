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

function GamepadIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "18px", height: "18px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="1" fill="currentColor" />
      <path d="M17.3 5H6.7C3.6 5 2 7.4 2 11c0 4.1 2.3 8 5 8 1.1 0 2.2-.6 2.8-1.5L11 16h2l1.2 1.5c.6.9 1.7 1.5 2.8 1.5 2.7 0 5-3.9 5-8 0-3.6-1.6-6-4.7-6z" />
    </svg>
  );
}

function PodcastIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "18px", height: "18px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "18px", height: "18px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function BookIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "18px", height: "18px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function ChartIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "18px", height: "18px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function SettingsIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "18px", height: "18px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LogoutIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "18px", height: "18px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "18px", height: "18px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export default function StaffPage() {
  const { user, isLoading: authLoading, refreshUser, logout } = useAuth();
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
      <section className="px-6 py-12 text-center font-sans">
        <p className="text-amber-800 text-lg">Đang tải tài khoản Staff...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="px-6 py-12 text-center space-y-3 font-sans">
        <h1 className="text-2xl font-semibold text-amber-900">Cần đăng nhập</h1>
        <p className="text-amber-700">Vui lòng đăng nhập để truy cập khu vực Staff Workspace.</p>
        <Link href="/login" className="text-amber-900 font-semibold underline">
          Đến trang đăng nhập
        </Link>
      </section>
    );
  }

  if (!canAccess) {
    return (
      <section className="px-6 py-12 text-center space-y-3 font-sans">
        <h1 className="text-2xl font-semibold text-amber-900">Không có quyền truy cập</h1>
        <p className="text-amber-700">Tài khoản của bạn không có quyền quản lý khu vực Staff.</p>
        <Link href="/" className="text-amber-900 font-semibold underline">
          Quay về trang chủ
        </Link>
      </section>
    );
  }

  return (
    <div className="staff-dash-layout flex min-h-screen bg-[#FDFBF7] text-[#2A1407] font-sans w-full">
      {/* LEFT SIDEBAR PANEL */}
      <aside className="staff-dash-sidebar w-[260px] shrink-0 bg-[#FAF4E8] border-r border-[#E6D8BC] p-6 flex flex-col fixed left-0 top-[80px] bottom-0 h-[calc(100vh-80px)] overflow-y-auto z-40">
        {/* Profile Card */}
        <div className="staff-profile-card flex flex-col items-center text-center pb-6 mb-5 border-b border-[#E6D8BC]">
          <div className="staff-avatar-wrapper w-[76px] h-[76px] rounded-full border-4 border-[#E6D8BC] p-0.5 bg-[#FFFDF8] shadow-sm mb-3 overflow-hidden">
            <img
              src={user.avatar || "/images/login_background.png"}
              alt={user.name || "Staff Avatar"}
              className="staff-avatar-img w-full h-full rounded-full object-cover"
            />
          </div>
          <div className="staff-profile-name font-bold text-base text-[#2A1407] mb-1">{user.name || "Khu Vực Biên Tập"}</div>
          <div className="staff-role-badge inline-block px-3 py-0.5 bg-[#F3E6CE] border border-[#D8C49A] rounded-full text-[11px] font-bold text-[#8C6A34] tracking-wide">NHÂN VIÊN</div>
        </div>

        {/* Navigation Menu */}
        <nav className="staff-nav-menu flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => { setActiveTab("lessons"); setMessage(null); }}
            className={`staff-nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
              activeTab === "lessons"
                ? "staff-nav-item--active bg-[#53270D] text-white shadow-md"
                : "text-[#53351C] hover:bg-[#D8C49A]/30 hover:text-[#2A1407]"
            }`}
          >
            <GamepadIcon className="staff-nav-icon shrink-0" />
            <span>Quản lý trò chơi</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("podcasts"); setMessage(null); }}
            className={`staff-nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
              activeTab === "podcasts"
                ? "staff-nav-item--active bg-[#53270D] text-white shadow-md"
                : "text-[#53351C] hover:bg-[#D8C49A]/30 hover:text-[#2A1407]"
            }`}
          >
            <PodcastIcon className="staff-nav-icon shrink-0" />
            <span>Quản lý podcast</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("blog"); setMessage(null); }}
            className={`staff-nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
              activeTab === "blog"
                ? "staff-nav-item--active bg-[#53270D] text-white shadow-md"
                : "text-[#53351C] hover:bg-[#D8C49A]/30 hover:text-[#2A1407]"
            }`}
          >
            <ShieldIcon className="staff-nav-icon shrink-0" />
            <span>Kiểm duyệt diễn đàn</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("lesson-requests"); setMessage(null); }}
            className={`staff-nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
              activeTab === "lesson-requests"
                ? "staff-nav-item--active bg-[#53270D] text-white shadow-md"
                : "text-[#53351C] hover:bg-[#D8C49A]/30 hover:text-[#2A1407]"
            }`}
          >
            <BookIcon className="staff-nav-icon shrink-0" />
            <span>Yêu cầu bài học</span>
          </button>

          <div className="staff-nav-divider h-px bg-[#E6D8BC] my-3" />

          <button
            type="button"
            onClick={() => { setActiveTab("lessons"); setMessage(null); }}
            className="staff-nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left text-[#53351C] hover:bg-[#D8C49A]/30 hover:text-[#2A1407]"
          >
            <ChartIcon className="staff-nav-icon shrink-0" />
            <span>Thống kê tổng quan</span>
          </button>

          <button
            type="button"
            onClick={() => logout()}
            className="staff-nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left text-red-800 hover:bg-rose-100/60 mt-6"
          >
            <LogoutIcon className="staff-nav-icon text-red-800 shrink-0" />
            <span>Đăng xuất</span>
          </button>
        </nav>
      </aside>

      {/* RIGHT MAIN PANEL */}
      <main className="staff-dash-main flex-1 ml-[260px] p-8 min-w-0 font-sans">
        {/* Header Bar */}
        <div className="staff-header-bar flex items-center justify-between gap-5 mb-6 flex-wrap">
          <div>
            <div className="staff-main-kicker text-xs font-bold tracking-widest text-[#8C6A34] uppercase mb-1">KHU VỰC BIÊN TẬP</div>
            <h1 className="staff-main-title text-2xl font-extrabold text-[#2A1407] font-sans">
              {activeTab === "lessons"
                ? "Bảng điều phối trò chơi"
                : activeTab === "podcasts"
                ? "Quản lý podcast audio"
                : activeTab === "blog"
                ? "Kiểm duyệt bài viết diễn đàn"
                : "Yêu cầu bài học từ học viên VIP"}
            </h1>
            <p className="staff-main-subtitle text-sm text-[#6C532B] mt-1">
              Quản lý & tạo nội dung trò chơi, podcast và bài học
            </p>
          </div>

          {/* Top-Right Summary Stat Cards */}
          <div className="staff-stats-row flex items-center gap-4 flex-wrap">
            <div className="staff-stat-card-v2 bg-[#FFFDF8] border border-[#E6D8BC] rounded-2xl px-5 py-3 flex items-center gap-3.5 shadow-sm">
              <div className="staff-stat-icon-square w-10 h-10 rounded-xl bg-[#FAF4E8] border border-[#E6D8BC] flex items-center justify-center text-[#53270D] shrink-0">
                {activeTab === "lessons" ? (
                  <GamepadIcon />
                ) : activeTab === "podcasts" ? (
                  <PodcastIcon />
                ) : (
                  <BookIcon />
                )}
              </div>
              <div>
                <div className="staff-stat-label text-[10.5px] font-bold tracking-wider text-[#8C6A34] uppercase">
                  {activeTab === "lessons"
                    ? "TỔNG TRÒ CHƠI"
                    : activeTab === "podcasts"
                    ? "TỔNG PODCAST"
                    : activeTab === "lesson-requests"
                    ? "TỔNG YÊU CẦU"
                    : "CHỜ DUYỆT / BÁO CÁO"}
                </div>
                <div className="staff-stat-value text-lg font-extrabold text-[#2A1407] leading-tight">
                  {activeTab === "lessons"
                    ? stats.total
                    : activeTab === "podcasts"
                    ? podcasts.length
                    : activeTab === "lesson-requests"
                    ? requestsCount
                    : `${blogCounts.pending} / ${blogCounts.reports}`}
                </div>
                <div className="staff-stat-subtext text-[11px] text-[#8C6A34]">
                  {activeTab === "lessons" ? "Trò chơi đang có" : "Nội dung hiện tại"}
                </div>
              </div>
            </div>

            <div className="staff-stat-card-v2 bg-[#FFFDF8] border border-[#E6D8BC] rounded-2xl px-5 py-3 flex items-center gap-3.5 shadow-sm">
              <div className="staff-stat-icon-square w-10 h-10 rounded-xl bg-[#FAF4E8] border border-[#E6D8BC] flex items-center justify-center text-[#53270D] shrink-0">
                <CalendarIcon />
              </div>
              <div>
                <div className="staff-stat-label text-[10.5px] font-bold tracking-wider text-[#8C6A34] uppercase">CẬP NHẬT GẦN NHẤT</div>
                <div className="staff-stat-value text-lg font-extrabold text-[#2A1407] leading-tight">
                  {activeTab === "lessons"
                    ? stats.latest ? new Date(stats.latest).toLocaleDateString("vi-VN") : "-"
                    : activeTab === "podcasts"
                    ? podcasts[0]?.updatedAt || podcasts[0]?.createdAt
                      ? new Date(podcasts[0]?.updatedAt || podcasts[0]?.createdAt).toLocaleDateString("vi-VN")
                      : "-"
                    : "-"}
                </div>
                <div className="staff-stat-subtext text-[11px] text-[#8C6A34]">Hôm nay</div>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Quick Switcher Tabs */}
        <div className="staff-horizontal-tabs flex items-center gap-3 pb-3.5 border-b border-[#E6D8BC] mb-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveTab("lessons"); setMessage(null); }}
            className={`staff-tab-pill inline-flex items-center gap-2 px-4.5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "lessons"
                ? "staff-tab-pill--active bg-[#FFFDF8] border border-[#E6D8BC] text-[#2A1407] font-bold shadow-sm"
                : "text-[#53351C] hover:bg-[#FAF4E8] hover:text-[#2A1407] border border-transparent"
            }`}
          >
            <GamepadIcon />
            <span>Quản lý trò chơi</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("podcasts"); setMessage(null); }}
            className={`staff-tab-pill inline-flex items-center gap-2 px-4.5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "podcasts"
                ? "staff-tab-pill--active bg-[#FFFDF8] border border-[#E6D8BC] text-[#2A1407] font-bold shadow-sm"
                : "text-[#53351C] hover:bg-[#FAF4E8] hover:text-[#2A1407] border border-transparent"
            }`}
          >
            <PodcastIcon />
            <span>Quản lý podcast</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("blog"); setMessage(null); }}
            className={`staff-tab-pill inline-flex items-center gap-2 px-4.5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "blog"
                ? "staff-tab-pill--active bg-[#FFFDF8] border border-[#E6D8BC] text-[#2A1407] font-bold shadow-sm"
                : "text-[#53351C] hover:bg-[#FAF4E8] hover:text-[#2A1407] border border-transparent"
            }`}
          >
            <ShieldIcon />
            <span>Kiểm duyệt diễn đàn</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("lesson-requests"); setMessage(null); }}
            className={`staff-tab-pill inline-flex items-center gap-2 px-4.5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "lesson-requests"
                ? "staff-tab-pill--active bg-[#FFFDF8] border border-[#E6D8BC] text-[#2A1407] font-bold shadow-sm"
                : "text-[#53351C] hover:bg-[#FAF4E8] hover:text-[#2A1407] border border-transparent"
            }`}
          >
            <BookIcon />
            <span>Yêu cầu bài học</span>
          </button>
        </div>

        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm mb-6 flex items-center justify-between font-sans ${
              message.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-rose-300 bg-rose-50 text-rose-900"
            }`}
          >
            <span>{message.text}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/10 transition-colors shrink-0 ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB PANELS */}
        <div>
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
      </main>
    </div>
  );
}