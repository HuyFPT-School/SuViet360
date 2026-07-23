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

// High quality SVG icons matching the SuViet360 theme (NO EMOJIS)
function FeatherIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-8 h-8 shrink-0 ${className}`} style={{ width: "32px", height: "32px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L3 13Simplifyv5h5l9.24-9.26z" />
      <path d="M16 8L2 22" />
      <path d="M17.5 15H9" />
    </svg>
  );
}

function GamepadIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 shrink-0 ${className}`} style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <circle cx="15" cy="13" r="1" />
      <circle cx="18" cy="11" r="1" />
      <rect x="2" y="6" width="20" height="12" rx="6" />
    </svg>
  );
}

function MicIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 shrink-0 ${className}`} style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function MessageSquareIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 shrink-0 ${className}`} style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function BookIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 shrink-0 ${className}`} style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-10 h-10 shrink-0 ${className}`} style={{ width: "40px", height: "40px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

  if (authLoading || isHydrating) {
    return (
      <section className="min-h-screen bg-cover bg-center bg-fixed flex items-center justify-center p-6" style={{ backgroundImage: 'url("/textures/paper.jpg")', fontFamily: '"Playfair Display", "Cinzel", "Cormorant Garamond", serif' }}>
        <div className="bg-[#FFFDF8] border border-[#D8C49A] p-8 rounded-2xl shadow-lg text-center space-y-4 max-w-md">
          <FeatherIcon className="w-12 h-12 text-[#8C6A34] mx-auto animate-spin" />
          <p className="text-lg font-bold text-[#2A1407]">
            Đang tải dữ liệu Biên Tập Viên...
          </p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="min-h-screen bg-cover bg-center bg-fixed flex items-center justify-center p-6" style={{ backgroundImage: 'url("/textures/paper.jpg")', fontFamily: '"Playfair Display", "Cinzel", "Cormorant Garamond", serif' }}>
        <div className="bg-[#FFFDF8] border border-[#D8C49A] p-8 rounded-2xl shadow-lg text-center space-y-4 max-w-md">
          <LockIcon className="w-12 h-12 text-[#8C6A34] mx-auto" />
          <h1 className="text-xl font-bold text-[#2A1407]">Khu Vực Biên Tập Viên</h1>
          <p className="text-sm text-stone-600">Vui lòng đăng nhập bằng tài khoản Staff để truy cập giao diện quản trị.</p>
          <Link href="/login" className="inline-block px-6 py-2.5 bg-[#53270D] hover:bg-[#3C1E0A] text-white font-bold text-sm rounded-xl transition-all shadow-md">
            Đăng nhập ngay
          </Link>
        </div>
      </section>
    );
  }

  if (!canAccess) {
    return (
      <section className="min-h-screen bg-cover bg-center bg-fixed flex items-center justify-center p-6" style={{ backgroundImage: 'url("/textures/paper.jpg")', fontFamily: '"Playfair Display", "Cinzel", "Cormorant Garamond", serif' }}>
        <div className="bg-[#FFFDF8] border border-[#D8C49A] p-8 rounded-2xl shadow-lg text-center space-y-4 max-w-md">
          <LockIcon className="w-12 h-12 text-rose-700 mx-auto" />
          <h1 className="text-xl font-bold text-[#2A1407]">Không Có Quyền Truy Cập</h1>
          <p className="text-sm text-stone-600">Tài khoản của bạn không có quyền quản lý khu vực Staff Biên tập.</p>
          <Link href="/" className="inline-block px-6 py-2.5 bg-[#53270D] hover:bg-[#3C1E0A] text-white font-bold text-sm rounded-xl transition-all shadow-md">
            Quay về trang chủ
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-cover bg-center bg-fixed p-4 md:p-6 lg:p-8" style={{ backgroundImage: 'url("/textures/paper.jpg")', fontFamily: '"Playfair Display", "Cinzel", "Cormorant Garamond", serif' }}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT SIDEBAR NAVIGATION CARD */}
        <aside className="lg:col-span-3 space-y-5">
          <div className="bg-[#FFFDF8] border border-[#D8C49A] p-5 rounded-2xl shadow-sm space-y-5">
            {/* Header Brand */}
            <div className="flex items-center gap-3 border-b border-[#E6D8BC] pb-4">
              <div className="w-12 h-12 rounded-xl bg-[#F5EBD4] border border-[#D8C49A] flex items-center justify-center text-[#53270D] shrink-0">
                <FeatherIcon />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#8C6A34] tracking-widest uppercase">SUVIET360</p>
                <h2 className="text-base font-bold text-[#2A1407]">Bàn Biên Tập Viên</h2>
              </div>
            </div>

            {/* Staff Account Info */}
            <div className="bg-[#FDF8ED] border border-[#E6D8BC] p-3.5 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-[#8C6A34] tracking-wider uppercase block">TÀI KHOẢN STAFF</span>
              <strong className="text-sm font-bold text-[#2A1407] block truncate" title={user.name}>{user.name}</strong>
              <small className="text-xs text-stone-500 block truncate" title={user.email}>{user.email}</small>
            </div>

            {/* Navigation Tabs */}
            <nav className="space-y-2">
              <button
                type="button"
                onClick={() => { setActiveTab("lessons"); setMessage(null); }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === "lessons"
                    ? "bg-[#53270D] text-white shadow-md"
                    : "bg-[#FDF8ED] text-[#53270D] hover:bg-[#F5EBD4] border border-[#E6D8BC]"
                }`}
              >
                <GamepadIcon />
                <span>Quản lý trò chơi (Game)</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("podcasts"); setMessage(null); }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === "podcasts"
                    ? "bg-[#53270D] text-white shadow-md"
                    : "bg-[#FDF8ED] text-[#53270D] hover:bg-[#F5EBD4] border border-[#E6D8BC]"
                }`}
              >
                <MicIcon />
                <span>Quản lý Podcast</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("blog"); setMessage(null); }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === "blog"
                    ? "bg-[#53270D] text-white shadow-md"
                    : "bg-[#FDF8ED] text-[#53270D] hover:bg-[#F5EBD4] border border-[#E6D8BC]"
                }`}
              >
                <MessageSquareIcon />
                <span>Kiểm duyệt diễn đàn</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("lesson-requests"); setMessage(null); }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === "lesson-requests"
                    ? "bg-[#53270D] text-white shadow-md"
                    : "bg-[#FDF8ED] text-[#53270D] hover:bg-[#F5EBD4] border border-[#E6D8BC]"
                }`}
              >
                <BookIcon />
                <span>Yêu cầu bài học</span>
              </button>
            </nav>

            {/* Staff Role Info */}
            <div className="bg-[#FDF8ED] border border-[#E6D8BC] p-3.5 rounded-xl space-y-2 text-xs text-[#53270D]">
              <strong className="font-bold uppercase tracking-wider block text-[11px]">NHIỆM VỤ BIÊN TẬP</strong>
              <div className="space-y-1.5 leading-relaxed text-stone-700">
                <p className="flex items-center gap-1.5">• Soạn thảo & tải bản đồ Game 2D</p>
                <p className="flex items-center gap-1.5">• Upload Audio & kịch bản Podcast</p>
                <p className="flex items-center gap-1.5">• Kiểm duyệt bài viết & báo cáo Blog</p>
                <p className="flex items-center gap-1.5">• Thiết kế Game liên kết từ VIP Pro</p>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT PANEL */}
        <main className="lg:col-span-9 space-y-6">

          {/* Header Bar */}
          <div className="bg-[#FFFDF8] border border-[#D8C49A] p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#2A1407]">
                {activeTab === "lessons"
                  ? "Bảng Điều Phối Trò Chơi 2D"
                  : activeTab === "podcasts"
                  ? "Quản Lý Podcast Âm Thanh"
                  : activeTab === "blog"
                  ? "Kiểm Duyệt Bài Viết Diễn Đàn"
                  : "Yêu Cầu Bài Học Từ VIP Pro"}
              </h1>
              <p className="text-xs text-[#8C6A34] mt-0.5">
                Khu vực biên tập nội dung, upload tài nguyên và thiết kế bài học Lịch sử Sử Việt
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-[#FDF8ED] border border-[#D8C49A] px-3.5 py-2 rounded-xl text-center shadow-xs">
                <span className="text-[10px] font-bold text-[#8C6A34] uppercase tracking-wider block">
                  {activeTab === "lessons"
                    ? "TỔNG TRÒ CHƠI"
                    : activeTab === "podcasts"
                    ? "TỔNG PODCAST"
                    : activeTab === "lesson-requests"
                    ? "TỔNG YÊU CẦU"
                    : "CHỜ DUYỆT / BÁO CÁO"}
                </span>
                <strong className="text-sm font-bold text-[#2A1407] block">
                  {activeTab === "lessons"
                    ? stats.total
                    : activeTab === "podcasts"
                    ? podcasts.length
                    : activeTab === "lesson-requests"
                    ? requestsCount
                    : `${blogCounts.pending} / ${blogCounts.reports}`}
                </strong>
              </div>

              <div className="bg-[#FDF8ED] border border-[#D8C49A] px-3.5 py-2 rounded-xl text-center shadow-xs hidden sm:block">
                <span className="text-[10px] font-bold text-[#8C6A34] uppercase tracking-wider block">GẦN NHẤT</span>
                <strong className="text-sm font-bold text-[#2A1407] block">
                  {activeTab === "lessons"
                    ? stats.latest ? new Date(stats.latest).toLocaleDateString("vi-VN") : "-"
                    : activeTab === "podcasts"
                    ? podcasts[0]?.updatedAt || podcasts[0]?.createdAt
                      ? new Date(podcasts[0]?.updatedAt || podcasts[0]?.createdAt).toLocaleDateString("vi-VN")
                      : "-"
                    : "-"}
                </strong>
              </div>

              <button
                type="button"
                onClick={() => {
                  loadLessons();
                  loadPodcasts();
                }}
                className="p-2.5 bg-[#FDF8ED] hover:bg-[#F5EBD4] text-[#53270D] border border-[#D8C49A] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="Tải lại dữ liệu"
              >
                <RefreshIcon />
              </button>
            </div>
          </div>

          {/* Alert Message */}
          {message && (
            <div
              className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between shadow-sm ${
                message.type === "success"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-rose-50 border-rose-300 text-rose-800"
              }`}
            >
              <span>{message.text}</span>
              <button
                type="button"
                onClick={() => setMessage(null)}
                className="ml-4 text-xs font-bold px-2 py-0.5 rounded hover:bg-black/10 transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* MAIN TAB CONTENT WORKSPACE */}
          <div className="bg-[#FFFDF8] border border-[#D8C49A] p-5 md:p-6 rounded-2xl shadow-sm">
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
    </section>
  );
}