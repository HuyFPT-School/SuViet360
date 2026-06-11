"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

type Tileset = { name: string; imageUrl: string };
type SpriteFrame = { key: string; frame: number; imageUrl: string };

type LessonGame = {
  tilemapJsonUrl: string;
  tilesets: Tileset[];
  character: { animations: Record<string, SpriteFrame[]> };
  spawnPoint: { x: number; y: number };
};

type Lesson = {
  _id: string;
  title: string;
  content: string;
  game: LessonGame;
  createdAt: string;
  updatedAt: string;
};

type Podcast = {
  _id: string;
  title: string;
  description: string;
  content: string;
  thumbnail: string;
  thumbnailPublicId: string;
  audioUrl: string;
  audioPublicId: string;
  duration: number;
  category: string;
  level: string;
  viewCount: number;
  status: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type FormMode = "create" | "edit";

type LessonFormState = {
  title: string;
  content: string;
  spawnX: string;
  spawnY: string;
  tilesetNames: string[];
  tilemapFile: File | null;
  tilesetFiles: File[];
  idleSprites: File[];
  runSprites: File[];
};

type PodcastFormState = {
  title: string;
  description: string;
  content: string;
  category: string;
  level: string;
  duration: string;
  status: boolean;
  thumbnailFile: File | null;
  audioFile: File | null;
};

type ActiveTab = "game" | "podcast";

// ═══════════════════════════════════════════════════════════════════════
// Empty form states
// ═══════════════════════════════════════════════════════════════════════

const emptyLessonForm: LessonFormState = {
  title: "",
  content: "",
  spawnX: "",
  spawnY: "",
  tilesetNames: [],
  tilemapFile: null,
  tilesetFiles: [],
  idleSprites: [],
  runSprites: [],
};

const emptyPodcastForm: PodcastFormState = {
  title: "",
  description: "",
  content: "",
  category: "",
  level: "Trung cấp",
  duration: "",
  status: true,
  thumbnailFile: null,
  audioFile: null,
};

// ═══════════════════════════════════════════════════════════════════════
// SVG Icons
// ═══════════════════════════════════════════════════════════════════════

const GamepadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" x2="10" y1="12" y2="12" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="15" x2="15.01" y1="13" y2="13" /><line x1="18" x2="18.01" y1="11" y2="11" />
    <rect width="20" height="12" x="2" y="6" rx="2" />
  </svg>
);

const HeadphonesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
  </svg>
);

const ImageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

const MusicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════

export default function StaffPage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [isHydrating, setIsHydrating] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("game");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // ─── Lesson state ──────────────────────────────────────────────
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonFormMode, setLessonFormMode] = useState<FormMode>("create");
  const [lessonForm, setLessonForm] = useState<LessonFormState>(emptyLessonForm);
  const [newTilesetName, setNewTilesetName] = useState("");

  // ─── Podcast state ─────────────────────────────────────────────
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [podcastsLoading, setPodcastsLoading] = useState(true);
  const [selectedPodcastId, setSelectedPodcastId] = useState<string | null>(null);
  const [podcastFormMode, setPodcastFormMode] = useState<FormMode>("create");
  const [podcastForm, setPodcastForm] = useState<PodcastFormState>(emptyPodcastForm);

  // ─── Auth ──────────────────────────────────────────────────────
  useEffect(() => {
    refreshUser().finally(() => setIsHydrating(false));
  }, [refreshUser]);

  // ─── Fetch lessons ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLessonsLoading(true);
    api
      .get<{ success: boolean; lessons: Lesson[] }>("/lessons")
      .then((res) => setLessons(res.data.lessons))
      .catch(() => setMessage({ type: "error", text: "Không thể tải danh sách bài học." }))
      .finally(() => setLessonsLoading(false));
  }, [user]);

  // ─── Fetch podcasts ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setPodcastsLoading(true);
    api
      .get<{ success: boolean; count: number; data: Podcast[] }>("/staff/podcasts")
      .then((res) => setPodcasts(res.data.data))
      .catch(() => setMessage({ type: "error", text: "Không thể tải danh sách podcast." }))
      .finally(() => setPodcastsLoading(false));
  }, [user]);

  const canAccess = user?.role === "staff" || user?.role === "admin";

  // ─── Stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalLessons = lessons.length;
    const totalPodcasts = podcasts.length;
    const latestLesson = lessons[0]?.updatedAt || lessons[0]?.createdAt || "";
    const latestPodcast = podcasts[0]?.updatedAt || podcasts[0]?.createdAt || "";
    const activePodcasts = podcasts.filter((p) => p.status).length;
    return { totalLessons, totalPodcasts, latestLesson, latestPodcast, activePodcasts };
  }, [lessons, podcasts]);

  // ─── CSRF helper ───────────────────────────────────────────────
  const getCsrfToken = async () => {
    const response = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
    return response.data.data.csrfToken;
  };

  // ═══════════════════════════════════════════════════════════════
  // LESSON HANDLERS (giữ nguyên logic cũ)
  // ═══════════════════════════════════════════════════════════════

  const setLessonField = <K extends keyof LessonFormState>(field: K, value: LessonFormState[K]) => {
    setLessonForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetLessonForm = () => {
    setLessonForm(emptyLessonForm);
    setNewTilesetName("");
    setLessonFormMode("create");
    setSelectedLessonId(null);
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLessonId(lesson._id);
    setLessonFormMode("edit");
    setLessonForm({
      title: lesson.title,
      content: lesson.content,
      spawnX: String(lesson.game.spawnPoint.x),
      spawnY: String(lesson.game.spawnPoint.y),
      tilesetNames: lesson.game.tilesets.map((ts) => ts.name),
      tilemapFile: null,
      tilesetFiles: [],
      idleSprites: [],
      runSprites: [],
    });
    setNewTilesetName("");
  };

  const handleAddTilesetName = () => {
    const trimmed = newTilesetName.trim();
    if (!trimmed) return;
    setLessonForm((prev) => ({ ...prev, tilesetNames: [...prev.tilesetNames, trimmed] }));
    setNewTilesetName("");
  };

  const handleRemoveTilesetName = (index: number) => {
    setLessonForm((prev) => ({
      ...prev,
      tilesetNames: prev.tilesetNames.filter((_, i) => i !== index),
    }));
  };

  const buildLessonFormData = (mode: FormMode) => {
    const formData = new FormData();
    if (lessonForm.title.trim()) formData.append("title", lessonForm.title.trim());
    if (lessonForm.content.trim()) formData.append("content", lessonForm.content.trim());
    if (lessonForm.spawnX.trim()) formData.append("spawnPoint[x]", lessonForm.spawnX.trim());
    if (lessonForm.spawnY.trim()) formData.append("spawnPoint[y]", lessonForm.spawnY.trim());

    if (lessonForm.tilemapFile) {
      formData.append("tilemapJson", lessonForm.tilemapFile);
    }

    if (lessonForm.tilesetFiles.length > 0) {
      for (const file of lessonForm.tilesetFiles) {
        formData.append("tilesets", file);
      }
      formData.append("tilesetNames", JSON.stringify(lessonForm.tilesetNames));
    } else if (mode === "create" && lessonForm.tilesetNames.length > 0) {
      formData.append("tilesetNames", JSON.stringify(lessonForm.tilesetNames));
    }

    for (const file of lessonForm.idleSprites) formData.append("idleSprites", file);
    for (const file of lessonForm.runSprites) formData.append("runSprites", file);

    return formData;
  };

  const validateLessonForm = (mode: FormMode) => {
    const spawnX = Number(lessonForm.spawnX);
    const spawnY = Number(lessonForm.spawnY);
    if (!lessonForm.title.trim() || !lessonForm.content.trim()) return "Vui lòng nhập đầy đủ tiêu đề và nội dung.";
    if (Number.isNaN(spawnX) || Number.isNaN(spawnY)) return "Spawn point cần là số hợp lệ.";
    if (mode === "create") {
      if (!lessonForm.tilemapFile) return "Cần tải lên file Tilemap JSON.";
      if (lessonForm.tilesetFiles.length === 0) return "Cần ít nhất 1 ảnh tileset.";
      if (lessonForm.tilesetNames.length !== lessonForm.tilesetFiles.length)
        return "Số tileset name phải khớp với số ảnh tileset.";
    }
    if (lessonForm.tilesetFiles.length > 0 && lessonForm.tilesetNames.length !== lessonForm.tilesetFiles.length)
      return "Số tileset name phải khớp với số ảnh tileset.";
    return "";
  };

  const handleLessonSubmit = async () => {
    setMessage(null);
    const error = validateLessonForm(lessonFormMode);
    if (error) { setMessage({ type: "error", text: error }); return; }

    try {
      const formData = buildLessonFormData(lessonFormMode);
      const csrfToken = await getCsrfToken();
      if (lessonFormMode === "create") {
        await api.post("/lessons", formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
        });
        setMessage({ type: "success", text: "Tạo bài học thành công." });
        resetLessonForm();
      } else if (selectedLessonId) {
        await api.put(`/lessons/${selectedLessonId}`, formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
        });
        setMessage({ type: "success", text: "Cập nhật bài học thành công." });
      }
      const res = await api.get<{ success: boolean; lessons: Lesson[] }>("/lessons");
      setLessons(res.data.lessons);
    } catch (error) {
      const messageText = error instanceof AxiosError
        ? error.response?.data?.message || "Có lỗi xảy ra khi lưu bài học."
        : "Có lỗi xảy ra khi lưu bài học.";
      setMessage({ type: "error", text: messageText });
    }
  };

  const handleLessonDelete = async () => {
    if (!selectedLessonId) return;
    const ok = window.confirm("Bạn có chắc muốn xóa bài học này?");
    if (!ok) return;
    try {
      const csrfToken = await getCsrfToken();
      await api.delete(`/lessons/${selectedLessonId}`, { headers: { "x-csrf-token": csrfToken } });
      setMessage({ type: "success", text: "Xóa bài học thành công." });
      resetLessonForm();
      const res = await api.get<{ success: boolean; lessons: Lesson[] }>("/lessons");
      setLessons(res.data.lessons);
    } catch (error) {
      const messageText = error instanceof AxiosError
        ? error.response?.data?.message || "Không thể xóa bài học."
        : "Không thể xóa bài học.";
      setMessage({ type: "error", text: messageText });
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // PODCAST HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const setPodcastField = <K extends keyof PodcastFormState>(field: K, value: PodcastFormState[K]) => {
    setPodcastForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetPodcastForm = () => {
    setPodcastForm(emptyPodcastForm);
    setPodcastFormMode("create");
    setSelectedPodcastId(null);
  };

  const handleSelectPodcast = (podcast: Podcast) => {
    setSelectedPodcastId(podcast._id);
    setPodcastFormMode("edit");
    setPodcastForm({
      title: podcast.title,
      description: podcast.description || "",
      content: podcast.content || "",
      category: podcast.category || "",
      level: podcast.level || "Trung cấp",
      duration: String(podcast.duration || ""),
      status: podcast.status,
      thumbnailFile: null,
      audioFile: null,
    });
  };

  const validatePodcastForm = (mode: FormMode) => {
    if (!podcastForm.title.trim()) return "Vui lòng nhập tiêu đề podcast.";
    if (mode === "create") {
      if (!podcastForm.thumbnailFile) return "Cần tải lên ảnh thumbnail.";
      if (!podcastForm.audioFile) return "Cần tải lên file audio.";
    }
    return "";
  };

  const buildPodcastFormData = () => {
    const formData = new FormData();
    if (podcastForm.title.trim()) formData.append("title", podcastForm.title.trim());
    if (podcastForm.description.trim()) formData.append("description", podcastForm.description.trim());
    if (podcastForm.content.trim()) formData.append("content", podcastForm.content.trim());
    if (podcastForm.category.trim()) formData.append("category", podcastForm.category.trim());
    if (podcastForm.level.trim()) formData.append("level", podcastForm.level.trim());
    if (podcastForm.duration.trim()) formData.append("duration", podcastForm.duration.trim());
    formData.append("status", String(podcastForm.status));
    if (podcastForm.thumbnailFile) formData.append("thumbnail", podcastForm.thumbnailFile);
    if (podcastForm.audioFile) formData.append("audio", podcastForm.audioFile);
    return formData;
  };

  const refreshPodcasts = async () => {
    const res = await api.get<{ success: boolean; count: number; data: Podcast[] }>("/staff/podcasts");
    setPodcasts(res.data.data);
  };

  const handlePodcastSubmit = async () => {
    setMessage(null);
    const error = validatePodcastForm(podcastFormMode);
    if (error) { setMessage({ type: "error", text: error }); return; }

    try {
      const formData = buildPodcastFormData();
      const csrfToken = await getCsrfToken();
      if (podcastFormMode === "create") {
        await api.post("/staff/podcasts", formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
        });
        setMessage({ type: "success", text: "Tạo podcast thành công!" });
        resetPodcastForm();
      } else if (selectedPodcastId) {
        await api.put(`/staff/podcasts/${selectedPodcastId}`, formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
        });
        setMessage({ type: "success", text: "Cập nhật podcast thành công!" });
      }
      await refreshPodcasts();
    } catch (error) {
      const messageText = error instanceof AxiosError
        ? error.response?.data?.message || "Có lỗi xảy ra khi lưu podcast."
        : "Có lỗi xảy ra khi lưu podcast.";
      setMessage({ type: "error", text: messageText });
    }
  };

  const handlePodcastDelete = async () => {
    if (!selectedPodcastId) return;
    const ok = window.confirm("Bạn có chắc muốn xóa podcast này?");
    if (!ok) return;
    try {
      const csrfToken = await getCsrfToken();
      await api.delete(`/staff/podcasts/${selectedPodcastId}`, { headers: { "x-csrf-token": csrfToken } });
      setMessage({ type: "success", text: "Xóa podcast thành công!" });
      resetPodcastForm();
      await refreshPodcasts();
    } catch (error) {
      const messageText = error instanceof AxiosError
        ? error.response?.data?.message || "Không thể xóa podcast."
        : "Không thể xóa podcast.";
      setMessage({ type: "error", text: messageText });
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: Auth guards
  // ═══════════════════════════════════════════════════════════════

  if (authLoading || isHydrating) {
    return (
      <section className="min-h-screen flex items-center justify-center" style={{ backgroundImage: 'url("/textures/paper.jpg")', backgroundSize: "cover" }}>
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-amber-300 border-t-amber-700 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-800 text-lg font-medium">Đang tải tài khoản...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="min-h-screen flex items-center justify-center" style={{ backgroundImage: 'url("/textures/paper.jpg")', backgroundSize: "cover" }}>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-200 p-8 text-center shadow-lg max-w-md">
          <h1 className="text-2xl font-semibold text-amber-900 mb-2">Cần đăng nhập</h1>
          <p className="text-amber-700 mb-4">Vui lòng đăng nhập để truy cập khu vực Staff.</p>
          <Link href="/login" className="inline-block bg-amber-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-amber-800 transition-colors">
            Đến trang đăng nhập
          </Link>
        </div>
      </section>
    );
  }

  if (!canAccess) {
    return (
      <section className="min-h-screen flex items-center justify-center" style={{ backgroundImage: 'url("/textures/paper.jpg")', backgroundSize: "cover" }}>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-200 p-8 text-center shadow-lg max-w-md">
          <h1 className="text-2xl font-semibold text-amber-900 mb-2">Không có quyền truy cập</h1>
          <p className="text-amber-700 mb-4">Tài khoản của bạn không có quyền quản lý nội dung.</p>
          <Link href="/" className="inline-block bg-amber-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-amber-800 transition-colors">
            Quay về trang chủ
          </Link>
        </div>
      </section>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: Main dashboard
  // ═══════════════════════════════════════════════════════════════

  return (
    <section
      className="min-h-screen pb-12"
      style={{ backgroundImage: 'url("/textures/paper.jpg")', backgroundSize: "cover", backgroundAttachment: "fixed" }}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-10 space-y-6">

        {/* ─── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-600 font-medium">Staff workspace</p>
            <h1 className="text-3xl font-display font-bold text-[#3a2312]">
              Bảng điều phối nội dung
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="rounded-xl border border-amber-200 bg-white/80 backdrop-blur-sm px-4 py-2 shadow-sm">
              <p className="text-amber-500 text-xs uppercase tracking-widest">Bài học</p>
              <p className="text-amber-900 text-lg font-bold">{stats.totalLessons}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white/80 backdrop-blur-sm px-4 py-2 shadow-sm">
              <p className="text-amber-500 text-xs uppercase tracking-widest">Podcast</p>
              <p className="text-amber-900 text-lg font-bold">{stats.totalPodcasts}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white/80 backdrop-blur-sm px-4 py-2 shadow-sm">
              <p className="text-amber-500 text-xs uppercase tracking-widest">Đang phát</p>
              <p className="text-emerald-600 text-lg font-bold">{stats.activePodcasts}</p>
            </div>
          </div>
        </div>

        {/* ─── Tab bar ────────────────────────────────────────────── */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-amber-200 p-1.5 flex gap-1 shadow-sm">
          <button
            type="button"
            onClick={() => { setActiveTab("game"); setMessage(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
              activeTab === "game"
                ? "bg-[#3a2312] text-[#f0ddb7] shadow-md"
                : "text-amber-700 hover:bg-amber-100/60"
            }`}
          >
            <GamepadIcon /> Quản lý Game
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("podcast"); setMessage(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
              activeTab === "podcast"
                ? "bg-[#3a2312] text-[#f0ddb7] shadow-md"
                : "text-amber-700 hover:bg-amber-100/60"
            }`}
          >
            <HeadphonesIcon /> Quản lý Podcast
          </button>
        </div>

        {/* ─── Message banner ─────────────────────────────────────── */}
        {message && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm backdrop-blur-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50/80 text-emerald-700"
                : "border-red-200 bg-red-50/80 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 1: GAME (LESSON) MANAGEMENT                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "game" && (
          <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
            {/* List */}
            <div className="rounded-2xl border border-amber-200 bg-white/80 backdrop-blur-sm shadow-sm">
              <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4">
                <h2 className="font-display text-lg font-bold text-[#3a2312]">
                  Danh sách bài học
                </h2>
                <button
                  type="button"
                  onClick={resetLessonForm}
                  className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  + Tạo mới
                </button>
              </div>
              {lessonsLoading ? (
                <div className="p-6 text-center text-amber-600">
                  <div className="w-6 h-6 border-2 border-amber-300 border-t-amber-700 rounded-full animate-spin mx-auto mb-2" />
                  Đang tải...
                </div>
              ) : (
                <div className="divide-y divide-amber-100 max-h-[600px] overflow-y-auto">
                  {lessons.map((lesson) => (
                    <button
                      key={lesson._id}
                      type="button"
                      onClick={() => handleSelectLesson(lesson)}
                      className={`w-full text-left px-5 py-4 transition-all ${
                        selectedLessonId === lesson._id
                          ? "bg-amber-50/80 border-l-4 border-l-amber-600"
                          : "hover:bg-amber-50/60 border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#3a2312]">{lesson.title}</p>
                          <p className="mt-1 text-xs text-amber-600 line-clamp-2">{lesson.content}</p>
                        </div>
                        <span className="text-xs text-amber-500 whitespace-nowrap">
                          {new Date(lesson.updatedAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </button>
                  ))}
                  {lessons.length === 0 && (
                    <div className="p-6 text-center text-amber-600">Chưa có bài học nào.</div>
                  )}
                </div>
              )}
            </div>

            {/* Form */}
            <div className="rounded-2xl border border-amber-200 bg-white/80 backdrop-blur-sm shadow-sm">
              <div className="border-b border-amber-100 px-5 py-4">
                <h2 className="font-display text-lg font-bold text-[#3a2312]">
                  {lessonFormMode === "create" ? "Tạo bài học" : "Chỉnh sửa bài học"}
                </h2>
                <p className="text-xs text-amber-600 mt-1">
                  {lessonFormMode === "create"
                    ? "Điền đủ thông tin và upload assets để tạo bài học."
                    : "Có thể cập nhật nội dung và thay thế file khi cần."}
                </p>
              </div>

              <div className="space-y-5 p-5 max-h-[600px] overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">Tiêu đề</label>
                  <input
                    type="text"
                    value={lessonForm.title}
                    onChange={(e) => setLessonField("title", e.target.value)}
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Nhập tiêu đề bài học"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">Nội dung</label>
                  <textarea
                    value={lessonForm.content}
                    onChange={(e) => setLessonField("content", e.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Mô tả nội dung bài học"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">Spawn X</label>
                    <input
                      type="number"
                      value={lessonForm.spawnX}
                      onChange={(e) => setLessonField("spawnX", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">Spawn Y</label>
                    <input
                      type="number"
                      value={lessonForm.spawnY}
                      onChange={(e) => setLessonField("spawnY", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Tilemap JSON {lessonFormMode === "create" && "(bắt buộc)"}
                  </label>
                  <input
                    type="file"
                    accept="application/json"
                    onChange={(e) => setLessonField("tilemapFile", e.target.files?.[0] || null)}
                    className="mt-2 w-full text-sm text-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Tileset images {lessonFormMode === "create" && "(bắt buộc)"}
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    multiple
                    onChange={(e) => setLessonField("tilesetFiles", e.target.files ? Array.from(e.target.files) : [])}
                    className="mt-2 w-full text-sm text-amber-700"
                  />
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                    <p className="text-xs text-amber-700 mb-2">Tên tileset (theo đúng thứ tự file upload)</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTilesetName}
                        onChange={(e) => setNewTilesetName(e.target.value)}
                        className="flex-1 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm"
                        placeholder="VD: ground_tiles"
                      />
                      <button
                        type="button"
                        onClick={handleAddTilesetName}
                        className="rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-amber-700 transition-colors"
                      >
                        Thêm
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {lessonForm.tilesetNames.map((name, index) => (
                        <span
                          key={`${name}-${index}`}
                          className="flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs text-amber-700"
                        >
                          {name}
                          <button type="button" onClick={() => handleRemoveTilesetName(index)} className="text-amber-500 hover:text-amber-700">✕</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">Idle sprites (tuỳ chọn)</label>
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) => setLessonField("idleSprites", e.target.files ? Array.from(e.target.files) : [])}
                      className="mt-2 w-full text-sm text-amber-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">Run sprites (tuỳ chọn)</label>
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) => setLessonField("runSprites", e.target.files ? Array.from(e.target.files) : [])}
                      className="mt-2 w-full text-sm text-amber-700"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-xs text-amber-700">
                  Khi upload sprite mới, hệ thống sẽ thay toàn bộ animation hiện tại.
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleLessonSubmit}
                    className="rounded-lg bg-[#3a2312] px-5 py-2.5 text-sm font-bold text-[#f0ddb7] hover:bg-[#5c3a20] transition-colors shadow-md"
                  >
                    {lessonFormMode === "create" ? "Tạo bài học" : "Lưu cập nhật"}
                  </button>
                  {lessonFormMode === "edit" && (
                    <button
                      type="button"
                      onClick={handleLessonDelete}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1.5"
                    >
                      <TrashIcon /> Xóa bài học
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 2: PODCAST MANAGEMENT                                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "podcast" && (
          <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
            {/* Podcast List */}
            <div className="rounded-2xl border border-amber-200 bg-white/80 backdrop-blur-sm shadow-sm">
              <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4">
                <h2 className="font-display text-lg font-bold text-[#3a2312]">
                  Danh sách Podcast
                </h2>
                <button
                  type="button"
                  onClick={resetPodcastForm}
                  className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  + Tạo mới
                </button>
              </div>

              {podcastsLoading ? (
                <div className="p-6 text-center text-amber-600">
                  <div className="w-6 h-6 border-2 border-amber-300 border-t-amber-700 rounded-full animate-spin mx-auto mb-2" />
                  Đang tải...
                </div>
              ) : (
                <div className="divide-y divide-amber-100 max-h-[600px] overflow-y-auto">
                  {podcasts.map((podcast) => (
                    <button
                      key={podcast._id}
                      type="button"
                      onClick={() => handleSelectPodcast(podcast)}
                      className={`w-full text-left px-5 py-4 transition-all ${
                        selectedPodcastId === podcast._id
                          ? "bg-amber-50/80 border-l-4 border-l-amber-600"
                          : "hover:bg-amber-50/60 border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Thumbnail preview */}
                        <div className="w-14 h-14 rounded-lg overflow-hidden border border-amber-200 flex-shrink-0 bg-amber-100">
                          {podcast.thumbnail ? (
                            <img src={podcast.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-amber-400"><ImageIcon /></div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[#3a2312] truncate">{podcast.title}</p>
                            <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${podcast.status ? "bg-emerald-400" : "bg-gray-300"}`} title={podcast.status ? "Đang hiển thị" : "Đã ẩn"} />
                          </div>
                          <p className="mt-0.5 text-xs text-amber-600 line-clamp-1">{podcast.description || podcast.category}</p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-amber-500">
                            <span className="flex items-center gap-1"><EyeIcon /> {podcast.viewCount?.toLocaleString() || 0}</span>
                            <span>{podcast.category}</span>
                            <span>{new Date(podcast.updatedAt).toLocaleDateString("vi-VN")}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {podcasts.length === 0 && (
                    <div className="p-6 text-center text-amber-600">Chưa có podcast nào.</div>
                  )}
                </div>
              )}
            </div>

            {/* Podcast Form */}
            <div className="rounded-2xl border border-amber-200 bg-white/80 backdrop-blur-sm shadow-sm">
              <div className="border-b border-amber-100 px-5 py-4">
                <h2 className="font-display text-lg font-bold text-[#3a2312]">
                  {podcastFormMode === "create" ? "Tạo podcast mới" : "Chỉnh sửa podcast"}
                </h2>
                <p className="text-xs text-amber-600 mt-1">
                  {podcastFormMode === "create"
                    ? "Upload thumbnail và audio cùng thông tin podcast."
                    : "Cập nhật nội dung, có thể thay thế ảnh/audio."}
                </p>
              </div>

              <div className="space-y-5 p-5 max-h-[600px] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">Tiêu đề *</label>
                  <input
                    type="text"
                    value={podcastForm.title}
                    onChange={(e) => setPodcastField("title", e.target.value)}
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="VD: Bài 1: Liên hợp quốc"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">Mô tả ngắn</label>
                  <textarea
                    value={podcastForm.description}
                    onChange={(e) => setPodcastField("description", e.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Mô tả ngắn gọn về podcast"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">Nội dung chi tiết</label>
                  <textarea
                    value={podcastForm.content}
                    onChange={(e) => setPodcastField("content", e.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Nội dung bài giảng chi tiết..."
                  />
                </div>

                {/* Category + Level */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">Chủ đề</label>
                    <input
                      type="text"
                      value={podcastForm.category}
                      onChange={(e) => setPodcastField("category", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="VD: Chiến tranh lạnh"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">Cấp độ</label>
                    <select
                      value={podcastForm.level}
                      onChange={(e) => setPodcastField("level", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 appearance-none cursor-pointer"
                    >
                      <option value="Dễ">Dễ</option>
                      <option value="Trung cấp">Trung cấp</option>
                      <option value="Nâng cao">Nâng cao</option>
                    </select>
                  </div>
                </div>

                {/* Duration + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">Thời lượng (giây)</label>
                    <input
                      type="number"
                      value={podcastForm.duration}
                      onChange={(e) => setPodcastField("duration", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="VD: 1125"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">Trạng thái</label>
                    <div className="mt-2 flex items-center gap-3 h-[38px]">
                      <button
                        type="button"
                        onClick={() => setPodcastField("status", !podcastForm.status)}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                          podcastForm.status ? "bg-emerald-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                            podcastForm.status ? "translate-x-6" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className={`text-sm font-medium ${podcastForm.status ? "text-emerald-600" : "text-gray-500"}`}>
                        {podcastForm.status ? "Hiển thị" : "Ẩn"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thumbnail upload */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2">
                    <ImageIcon /> Ảnh thumbnail {podcastFormMode === "create" && "*"}
                  </label>

                  {/* Preview existing thumbnail when editing */}
                  {podcastFormMode === "edit" && selectedPodcastId && !podcastForm.thumbnailFile && (
                    (() => {
                      const selected = podcasts.find((p) => p._id === selectedPodcastId);
                      return selected?.thumbnail ? (
                        <div className="mb-3 w-full h-36 rounded-lg overflow-hidden border border-amber-200">
                          <img src={selected.thumbnail} alt="Current thumbnail" className="w-full h-full object-cover" />
                        </div>
                      ) : null;
                    })()
                  )}

                  {podcastForm.thumbnailFile && (
                    <div className="mb-3 w-full h-36 rounded-lg overflow-hidden border border-amber-200">
                      <img src={URL.createObjectURL(podcastForm.thumbnailFile)} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={(e) => setPodcastField("thumbnailFile", e.target.files?.[0] || null)}
                    className="w-full text-sm text-amber-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-600 file:text-white file:text-xs file:font-semibold file:uppercase file:tracking-wider file:cursor-pointer hover:file:bg-amber-700"
                  />
                  <p className="text-xs text-amber-500 mt-1">PNG, JPG, WEBP — khuyến nghị 16:9</p>
                </div>

                {/* Audio upload */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2">
                    <MusicIcon /> File audio {podcastFormMode === "create" && "*"}
                  </label>

                  {/* Show current audio URL when editing */}
                  {podcastFormMode === "edit" && selectedPodcastId && !podcastForm.audioFile && (
                    (() => {
                      const selected = podcasts.find((p) => p._id === selectedPodcastId);
                      return selected?.audioUrl ? (
                        <div className="mb-3 p-2 rounded-lg bg-white border border-amber-200">
                          <audio controls className="w-full h-8" src={selected.audioUrl}>
                            <track kind="captions" />
                          </audio>
                        </div>
                      ) : null;
                    })()
                  )}

                  {podcastForm.audioFile && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-white border border-amber-200 p-2.5 text-xs text-amber-700">
                      <MusicIcon />
                      <span className="truncate flex-1">{podcastForm.audioFile.name}</span>
                      <span className="text-amber-500">({(podcastForm.audioFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setPodcastField("audioFile", e.target.files?.[0] || null)}
                    className="w-full text-sm text-amber-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-600 file:text-white file:text-xs file:font-semibold file:uppercase file:tracking-wider file:cursor-pointer hover:file:bg-amber-700"
                  />
                  <p className="text-xs text-amber-500 mt-1">MP3, M4A, WAV — tối đa 100 MB</p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handlePodcastSubmit}
                    className="rounded-lg bg-[#3a2312] px-5 py-2.5 text-sm font-bold text-[#f0ddb7] hover:bg-[#5c3a20] transition-colors shadow-md"
                  >
                    {podcastFormMode === "create" ? "Tạo podcast" : "Lưu cập nhật"}
                  </button>
                  {podcastFormMode === "edit" && (
                    <>
                      <button
                        type="button"
                        onClick={resetPodcastForm}
                        className="rounded-lg border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handlePodcastDelete}
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1.5"
                      >
                        <TrashIcon /> Xóa podcast
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
