"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

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
  status?: "Pending_Review" | "Published" | "Rejected";
  reviewFeedback?: string;
  game: LessonGame;
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

const emptyFormState: LessonFormState = {
  title: "",
  content: "",
  spawnX: "100",
  spawnY: "100",
  tilesetNames: [],
  tilemapFile: null,
  tilesetFiles: [],
  idleSprites: [],
  runSprites: [],
};

type Podcast = {
  _id: string;
  title: string;
  description: string;
  content: string;
  thumbnail: string;
  audioUrl: string;
  level: string;
  category: string;
  status: "Draft" | "Pending_Review" | "Published" | "Rejected";
  reviewFeedback?: string;
  viewCount: number;
  lessonId?: string | Lesson | null;
  createdAt: string;
  updatedAt: string;
};

type PodcastFormState = {
  title: string;
  description: string;
  content: string;
  level: string;
  category: string;
  lessonId: string;
  thumbnailFile: File | null;
  audioFile: File | null;
};

const emptyPodcastForm: PodcastFormState = {
  title: "",
  description: "",
  content: "",
  level: "Medium",
  category: "",
  lessonId: "",
  thumbnailFile: null,
  audioFile: null,
};

function CustomFileInput({
  accept,
  multiple,
  onChange,
  fileCount,
  singleFileName,
}: {
  accept?: string;
  multiple?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileCount: number;
  singleFileName?: string;
}) {
  return (
    <div className="mt-2 flex items-center gap-3">
      <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition-colors duration-150 select-none">
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        <span>Chọn tệp</span>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onChange}
          className="hidden"
        />
      </label>
      <span className="text-xs text-amber-800 truncate max-w-xs font-medium">
        {fileCount > 0
          ? multiple
            ? `Đã chọn ${fileCount} tệp`
            : singleFileName || "Đã chọn tệp"
          : "Chưa chọn tệp"}
      </span>
    </div>
  );
}

function renderStaffStatusBadge(status?: string | boolean) {
  if (status === true || status === "Published") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        Đã duyệt
      </span>
    );
  }
  if (status === "Pending_Review") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
        Chờ duyệt
      </span>
    );
  }
  if (status === "Rejected") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        Từ chối
      </span>
    );
  }
  if (status === false || status === "Draft") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-800 border border-gray-200">
        Nháp
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
      Chờ duyệt
    </span>
  );
}

export default function StaffPage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [isHydrating, setIsHydrating] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [form, setForm] = useState<LessonFormState>(emptyFormState);
  const [newTilesetName, setNewTilesetName] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [activeTab, setActiveTab] = useState<"lessons" | "podcasts">("lessons");

  // Podcast states
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [podcastsLoading, setPodcastsLoading] = useState(true);
  const [selectedPodcastId, setSelectedPodcastId] = useState<string | null>(null);
  const [podcastFormMode, setPodcastFormMode] = useState<"create" | "edit">("create");
  const [podcastForm, setPodcastForm] = useState<PodcastFormState>(emptyPodcastForm);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    podcasts.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [podcasts]);

  const selectedLesson = lessons.find((l) => l._id === selectedId);
  const selectedPodcast = podcasts.find((p) => p._id === selectedPodcastId);

  const setPodcastFormField = <K extends keyof PodcastFormState>(
    field: K,
    value: PodcastFormState[K]
  ) => {
    setPodcastForm((prev) => ({ ...prev, [field]: value }));
  };

  const loadPodcasts = () => {
    setPodcastsLoading(true);
    api
      .get<{ success: boolean; data: Podcast[] }>("/staff/podcasts")
      .then((res) => setPodcasts(res.data.data))
      .catch(() => setMessage({ type: "error", text: "Không thể tải danh sách podcast." }))
      .finally(() => setPodcastsLoading(false));
  };

  useEffect(() => {
    refreshUser().finally(() => setIsHydrating(false));
  }, [refreshUser]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === "podcasts") {
      loadPodcasts();
    }
  }, [user, activeTab]);

  const resetPodcastForm = () => {
    setPodcastForm(emptyPodcastForm);
    setPodcastFormMode("create");
    setSelectedPodcastId(null);
    setIsAddingNewCategory(false);
    setNewCategoryName("");
  };

  const handleSelectPodcast = (podcast: Podcast) => {
    setSelectedPodcastId(podcast._id);
    setPodcastFormMode("edit");
    setIsAddingNewCategory(false);
    setNewCategoryName("");
    setPodcastForm({
      title: podcast.title,
      description: podcast.description || "",
      content: podcast.content || "",
      level: podcast.level || "Medium",
      category: podcast.category || "",
      lessonId: typeof podcast.lessonId === "object" && podcast.lessonId !== null
        ? (podcast.lessonId as any)._id || ""
        : (podcast.lessonId as string) || "",
      thumbnailFile: null,
      audioFile: null,
    });
  };

  const handlePodcastSubmit = async () => {
    setMessage(null);
    if (!podcastForm.title.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập tiêu đề podcast." });
      return;
    }
    if (podcastFormMode === "create") {
      if (!podcastForm.thumbnailFile) {
        setMessage({ type: "error", text: "Vui lòng tải lên ảnh giao diện." });
        return;
      }
      if (!podcastForm.audioFile) {
        setMessage({ type: "error", text: "Vui lòng tải lên file âm thanh." });
        return;
      }
    }

    setSaving(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("title", podcastForm.title.trim());
      formData.append("description", podcastForm.description.trim());
      formData.append("content", podcastForm.content.trim());
      formData.append("level", podcastForm.level.trim());
      formData.append("category", podcastForm.category.trim());
      if (podcastForm.lessonId) {
        formData.append("lessonId", podcastForm.lessonId);
      }

      if (podcastForm.thumbnailFile) {
        formData.append("thumbnail", podcastForm.thumbnailFile);
      }
      if (podcastForm.audioFile) {
        formData.append("audio", podcastForm.audioFile);
      }

      const csrfToken = await getCsrfToken();
      const onProgress = (progressEvent: any) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      };

      if (podcastFormMode === "create") {
        await api.post("/staff/podcasts", formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
          onUploadProgress: onProgress,
        });
        setMessage({ type: "success", text: "Tạo podcast thành công." });
        resetPodcastForm();
      } else if (selectedPodcastId) {
        await api.put(`/staff/podcasts/${selectedPodcastId}`, formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
          onUploadProgress: onProgress,
        });
        setMessage({ type: "success", text: "Cập nhật podcast thành công." });
      }
      loadPodcasts();
    } catch (error) {
      const messageText =
        error instanceof AxiosError
          ? error.response?.data?.message || "Có lỗi xảy ra khi lưu podcast."
          : "Có lỗi xảy ra khi lưu podcast.";
      setMessage({ type: "error", text: messageText });
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handlePodcastDelete = async () => {
    if (!selectedPodcastId) return;
    const ok = window.confirm("Bạn có chắc muốn xóa podcast này?");
    if (!ok) return;

    try {
      const csrfToken = await getCsrfToken();
      await api.delete(`/staff/podcasts/${selectedPodcastId}`, {
        headers: { "x-csrf-token": csrfToken },
      });
      setMessage({ type: "success", text: "Xóa podcast thành công." });
      resetPodcastForm();
      loadPodcasts();
    } catch (error) {
      const messageText =
        error instanceof AxiosError
          ? error.response?.data?.message || "Không thể xóa podcast."
          : "Không thể xóa podcast.";
      setMessage({ type: "error", text: messageText });
    }
  };

  useEffect(() => {
    if (!user) return;
    setLessonsLoading(true);
    api
      .get<{ success: boolean; lessons: Lesson[] }>("/lessons")
      .then((res) => setLessons(res.data.lessons))
      .catch(() => setMessage({ type: "error", text: "Không thể tải danh sách bài học." }))
      .finally(() => setLessonsLoading(false));
  }, [user]);

  const canAccess = user?.role === "staff" || user?.role === "admin";

  const stats = useMemo(() => {
    const total = lessons.length;
    const latest = lessons[0]?.updatedAt || lessons[0]?.createdAt || "";
    return { total, latest };
  }, [lessons]);

  const setFormField = <K extends keyof LessonFormState>(
    field: K,
    value: LessonFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyFormState);
    setNewTilesetName("");
    setFormMode("create");
    setSelectedId(null);
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedId(lesson._id);
    setFormMode("edit");
    setForm({
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
    setForm((prev) => ({ ...prev, tilesetNames: [...prev.tilesetNames, trimmed] }));
    setNewTilesetName("");
  };

  const handleRemoveTilesetName = (index: number) => {
    setForm((prev) => ({
      ...prev,
      tilesetNames: prev.tilesetNames.filter((_, i) => i !== index),
    }));
  };

  const buildFormData = (mode: FormMode) => {
    const formData = new FormData();

    if (form.title.trim()) formData.append("title", form.title.trim());
    if (form.content.trim()) formData.append("content", form.content.trim());
    if (form.spawnX.trim()) formData.append("spawnPoint[x]", form.spawnX.trim());
    if (form.spawnY.trim()) formData.append("spawnPoint[y]", form.spawnY.trim());

    if (mode === "create" && form.tilemapFile) {
      formData.append("tilemapJson", form.tilemapFile);
    }

    if (mode === "edit" && form.tilemapFile) {
      formData.append("tilemapJson", form.tilemapFile);
    }

    if (form.tilesetFiles.length > 0) {
      for (const file of form.tilesetFiles) {
        formData.append("tilesets", file);
      }
      formData.append("tilesetNames", JSON.stringify(form.tilesetNames));
    } else if (mode === "create" && form.tilesetNames.length > 0) {
      formData.append("tilesetNames", JSON.stringify(form.tilesetNames));
    }

    for (const file of form.idleSprites) {
      formData.append("idleSprites", file);
    }

    for (const file of form.runSprites) {
      formData.append("runSprites", file);
    }

    return formData;
  };

  const getCsrfToken = async () => {
    const response = await api.get<{ data: { csrfToken: string } }>(
      "/csrf-token"
    );
    return response.data.data.csrfToken;
  };

  const validateForm = (mode: FormMode) => {
    const spawnX = Number(form.spawnX);
    const spawnY = Number(form.spawnY);

    if (!form.title.trim() || !form.content.trim()) {
      return "Vui lòng nhập đầy đủ tiêu đề và nội dung.";
    }

    if (Number.isNaN(spawnX) || Number.isNaN(spawnY)) {
      return "Spawn point cần là số hợp lệ.";
    }

    if (mode === "create") {
      if (!form.tilemapFile) return "Cần tải lên file Tilemap JSON.";
      if (form.tilesetFiles.length === 0) return "Cần ít nhất 1 ảnh tileset.";
      if (form.tilesetNames.length !== form.tilesetFiles.length) {
        return "Số tileset name phải khớp với số ảnh tileset.";
      }
    }

    if (form.tilesetFiles.length > 0 && form.tilesetNames.length !== form.tilesetFiles.length) {
      return "Số tileset name phải khớp với số ảnh tileset.";
    }

    return "";
  };

  const handleSubmit = async () => {
    setMessage(null);
    const error = validateForm(formMode);
    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }

    setSaving(true);
    setUploadProgress(0);
    try {
      const formData = buildFormData(formMode);
      const csrfToken = await getCsrfToken();
      const onProgress = (progressEvent: any) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      };

      if (formMode === "create") {
        await api.post("/lessons", formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
          onUploadProgress: onProgress,
        });
        setMessage({ type: "success", text: "Tạo bài học thành công." });
        resetForm();
      } else if (selectedId) {
        await api.put(`/lessons/${selectedId}`, formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
          onUploadProgress: onProgress,
        });
        setMessage({ type: "success", text: "Cập nhật bài học thành công." });
      }

      const res = await api.get<{ success: boolean; lessons: Lesson[] }>("/lessons");
      setLessons(res.data.lessons);
    } catch (error) {
      const messageText =
        error instanceof AxiosError
          ? error.response?.data?.message || "Có lỗi xảy ra khi lưu bài học."
          : "Có lỗi xảy ra khi lưu bài học.";
      setMessage({ type: "error", text: messageText });
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const ok = window.confirm("Bạn có chắc muốn xóa bài học này?");
    if (!ok) return;

    try {
      const csrfToken = await getCsrfToken();
      await api.delete(`/lessons/${selectedId}`, {
        headers: { "x-csrf-token": csrfToken },
      });
      setMessage({ type: "success", text: "Xóa bài học thành công." });
      resetForm();
      const res = await api.get<{ success: boolean; lessons: Lesson[] }>("/lessons");
      setLessons(res.data.lessons);
    } catch (error) {
      const messageText =
        error instanceof AxiosError
          ? error.response?.data?.message || "Không thể xóa bài học."
          : "Không thể xóa bài học.";
      setMessage({ type: "error", text: messageText });
    }
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
        <p className="text-amber-700">Tài khoản của bạn không có quyền quản lý bài học.</p>
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
              Bảng điều phối bài học
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="rounded-xl border border-amber-200 bg-white/90 backdrop-blur-sm px-4 py-2 shadow-sm">
              <p className="text-amber-500 text-xs uppercase tracking-widest">
                {activeTab === "lessons" ? "Tổng bài học" : "Tổng podcast"}
              </p>
              <p className="text-amber-900 text-lg font-semibold">
                {activeTab === "lessons" ? stats.total : podcasts.length}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white/90 backdrop-blur-sm px-4 py-2 shadow-sm">
              <p className="text-amber-500 text-xs uppercase tracking-widest">Cập nhật gần nhất</p>
              <p className="text-amber-900 text-sm font-semibold">
                {activeTab === "lessons"
                  ? stats.latest ? new Date(stats.latest).toLocaleDateString("vi-VN") : "-"
                  : podcasts[0]?.updatedAt || podcasts[0]?.createdAt
                    ? new Date(podcasts[0]?.updatedAt || podcasts[0]?.createdAt).toLocaleDateString("vi-VN")
                    : "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex border-b border-amber-200">
          <button
            onClick={() => { setActiveTab("lessons"); setMessage(null); }}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${activeTab === "lessons"
                ? "border-amber-700 text-amber-950 font-bold"
                : "border-transparent text-amber-650 hover:text-amber-800"
              }`}
          >
            Quản lý bài học
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

        {activeTab === "lessons" ? (
          <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
            <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm">
              <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4">
                <h2 className="font-display text-lg font-semibold text-amber-900">
                  Danh sách bài học
                </h2>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 hover:bg-amber-50"
                >
                  Tạo mới
                </button>
              </div>

              {lessonsLoading ? (
                <div className="p-6 text-center text-amber-600">Đang tải...</div>
              ) : (
                <div className="divide-y divide-amber-100">
                  {lessons.map((lesson) => (
                    <button
                      key={lesson._id}
                      type="button"
                      onClick={() => handleSelectLesson(lesson)}
                      className={`w-full text-left px-5 py-4 transition ${selectedId === lesson._id
                          ? "bg-amber-50"
                          : "hover:bg-amber-50/60"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-amber-900 truncate">{lesson.title}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {renderStaffStatusBadge(lesson.status)}
                          </div>
                          <p className="mt-2 text-xs text-amber-600 line-clamp-2">
                            {lesson.content}
                          </p>
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

            <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm">
              <div className="border-b border-amber-100 px-5 py-4">
                <h2 className="font-display text-lg font-semibold text-amber-900">
                  {formMode === "create" ? "Tạo bài học" : "Chỉnh sửa bài học"}
                </h2>
                <p className="text-xs text-amber-600 mt-1">
                  {formMode === "create"
                    ? "Điền đủ thông tin và upload assets để tạo bài học."
                    : "Có thể cập nhật nội dung và thay thế file khi cần."}
                </p>
              </div>

              <div className="space-y-5 p-5">
                {formMode === "edit" && selectedLesson?.status === "Rejected" && selectedLesson?.reviewFeedback && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                    <h3 className="font-semibold text-rose-950 mb-1 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Bài học bị từ chối duyệt
                    </h3>
                    <p className="font-medium text-rose-700">{selectedLesson.reviewFeedback}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Tiêu đề
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setFormField("title", e.target.value)}
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Nhập tiêu đề bài học"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Nội dung
                  </label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setFormField("content", e.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Mô tả nội dung bài học"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Tilemap JSON {formMode === "create" && "(bắt buộc)"}
                  </label>
                  <CustomFileInput
                    accept="application/json"
                    onChange={(e) => setFormField("tilemapFile", e.target.files?.[0] || null)}
                    fileCount={form.tilemapFile ? 1 : 0}
                    singleFileName={form.tilemapFile?.name}
                  />
                  {formMode === "edit" && selectedLesson?.game?.tilemapJsonUrl && (
                    <p className="mt-1 text-xs text-amber-600 font-medium">
                      Tệp hiện tại: <a href={selectedLesson.game.tilemapJsonUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-800 break-all">{selectedLesson.game.tilemapJsonUrl.split('/').pop()}</a>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Tileset images {formMode === "create" && "(bắt buộc)"}
                  </label>

                  {/* Danh sách tileset đã thêm — cho phép sửa tên và xóa từng cái */}
                  {form.tilesetFiles.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {form.tilesetFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2">
                          <span className="text-xs text-amber-600 font-medium shrink-0 truncate max-w-[120px]" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-amber-400 shrink-0">→</span>
                          <input
                            type="text"
                            value={form.tilesetNames[idx] ?? ""}
                            onChange={(e) => {
                              const updated = [...form.tilesetNames];
                              updated[idx] = e.target.value;
                              setFormField("tilesetNames", updated);
                            }}
                            className="flex-1 min-w-0 rounded border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                            placeholder="Tên tileset trong Tiled (vd: socauhoi)"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFormField("tilesetFiles", form.tilesetFiles.filter((_, i) => i !== idx));
                              setFormField("tilesetNames", form.tilesetNames.filter((_, i) => i !== idx));
                            }}
                            className="shrink-0 text-red-400 hover:text-red-600 text-sm font-bold leading-none"
                            title="Xóa tileset này"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Nút thêm tệp tileset mới (accumulate, không replace) */}
                  <div className="mt-2 flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition-colors duration-150 select-none">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Thêm tileset</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const newFiles = e.target.files ? Array.from(e.target.files) : [];
                          if (newFiles.length === 0) return;
                          // Tên mặc định = tên file (bỏ đuôi), người dùng có thể sửa sau
                          const newNames = newFiles.map((f) => {
                            const parts = f.name.split(".");
                            parts.pop();
                            return parts.join(".");
                          });
                          setFormField("tilesetFiles", [...form.tilesetFiles, ...newFiles]);
                          setFormField("tilesetNames", [...form.tilesetNames, ...newNames]);
                          // Reset input để có thể chọn lại cùng file
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <span className="text-xs text-amber-700 font-medium">
                      {form.tilesetFiles.length > 0
                        ? `${form.tilesetFiles.length} tileset — nhấn để thêm nữa`
                        : "Chưa có tileset nào"}
                    </span>
                  </div>

                  {formMode === "edit" && selectedLesson?.game?.tilesets && selectedLesson.game.tilesets.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-amber-600 font-semibold mb-1">Các tileset hiện tại (sẽ bị thay thế nếu upload mới):</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedLesson.game.tilesets.map((ts, idx) => (
                          <div key={idx} className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg text-xs text-amber-800 font-medium">
                            <img src={ts.imageUrl} alt={ts.name} className="w-6 h-6 object-contain rounded bg-white border border-amber-100" />
                            <span className="font-mono">{ts.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <details className="group border border-amber-200 bg-amber-50/20 rounded-xl overflow-hidden">
                  <summary className="flex items-center justify-between cursor-pointer px-4 py-3 bg-amber-50/50 text-xs font-semibold uppercase tracking-wider text-amber-700 select-none">
                    <span>Thay đổi nhân vật (Tuỳ chọn)</span>
                    <span className="transition-transform duration-200 group-open:rotate-180 text-amber-600">▼</span>
                  </summary>
                  <div className="p-4 space-y-4 border-t border-amber-100 bg-white/95">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-amber-800">
                          Idle sprites
                        </label>
                        <CustomFileInput
                          multiple
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={(e) =>
                            setFormField(
                              "idleSprites",
                              e.target.files ? Array.from(e.target.files) : []
                            )
                          }
                          fileCount={form.idleSprites.length}
                        />
                        {formMode === "edit" && (() => {
                          const idleKey = Object.keys(selectedLesson?.game?.character?.animations || {}).find(k => k.toLowerCase().includes("idle"));
                          const idleFrames = idleKey ? selectedLesson?.game?.character?.animations[idleKey] : null;
                          if (idleFrames && idleFrames.length > 0) {
                            return (
                              <div className="mt-2">
                                <p className="text-[11px] text-amber-600 font-semibold mb-1">Idle sprites hiện tại ({idleFrames.length} frames):</p>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-amber-50/50 rounded-lg border border-amber-100">
                                  {idleFrames.map((f, idx) => (
                                    <img key={idx} src={f.imageUrl} alt={f.key} className="w-8 h-8 object-contain rounded bg-white border border-amber-200" title={f.key} />
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-amber-800">
                          Run sprites
                        </label>
                        <CustomFileInput
                          multiple
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={(e) =>
                            setFormField(
                              "runSprites",
                              e.target.files ? Array.from(e.target.files) : []
                            )
                          }
                          fileCount={form.runSprites.length}
                        />
                        {formMode === "edit" && (() => {
                          const runKey = Object.keys(selectedLesson?.game?.character?.animations || {}).find(k => k.toLowerCase().includes("run"));
                          const runFrames = runKey ? selectedLesson?.game?.character?.animations[runKey] : null;
                          if (runFrames && runFrames.length > 0) {
                            return (
                              <div className="mt-2">
                                <p className="text-[11px] text-amber-600 font-semibold mb-1">Run sprites hiện tại ({runFrames.length} frames):</p>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-amber-50/50 rounded-lg border border-amber-100">
                                  {runFrames.map((f, idx) => (
                                    <img key={idx} src={f.imageUrl} alt={f.key} className="w-8 h-8 object-contain rounded bg-white border border-amber-200" title={f.key} />
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <div className="rounded-lg border border-amber-100 bg-amber-50/30 px-3 py-2 text-xs text-amber-700">
                      Khi upload sprite mới, hệ thống sẽ thay toàn bộ animation hiện tại.
                    </div>
                  </div>
                </details>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
                  >
                    {formMode === "create" ? "Tạo bài học" : "Lưu cập nhật"}
                  </button>
                  {formMode === "edit" && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                    >
                      Xóa bài học
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
            <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm">
              <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4">
                <h2 className="font-display text-lg font-semibold text-amber-900">
                  Danh sách podcast
                </h2>
                <button
                  type="button"
                  onClick={resetPodcastForm}
                  className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 hover:bg-amber-50"
                >
                  Tạo mới
                </button>
              </div>

              {podcastsLoading ? (
                <div className="p-6 text-center text-amber-600">Đang tải...</div>
              ) : (
                <div className="divide-y divide-amber-100">
                  {podcasts.map((podcast) => (
                    <button
                      key={podcast._id}
                      type="button"
                      onClick={() => handleSelectPodcast(podcast)}
                      className={`w-full text-left px-5 py-4 transition flex gap-4 items-start ${selectedPodcastId === podcast._id
                          ? "bg-amber-50"
                          : "hover:bg-amber-50/60"
                        }`}
                    >
                      {podcast.thumbnail && (
                        <img
                          src={podcast.thumbnail}
                          alt={podcast.title}
                          className="w-16 h-16 object-cover rounded-lg border border-amber-200 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-amber-900 truncate">{podcast.title}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 font-semibold">
                            {podcast.level}
                          </span>
                          {renderStaffStatusBadge(podcast.status)}
                        </div>
                        <p className="mt-2 text-xs text-amber-655 line-clamp-2">
                          {podcast.description}
                        </p>
                      </div>
                    </button>
                  ))}

                  {podcasts.length === 0 && (
                    <div className="p-6 text-center text-amber-655">Chưa có podcast nào.</div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm">
              <div className="border-b border-amber-100 px-5 py-4">
                <h2 className="font-display text-lg font-semibold text-amber-900">
                  {podcastFormMode === "create" ? "Tạo podcast" : "Chỉnh sửa podcast"}
                </h2>
                <p className="text-xs text-amber-600 mt-1">
                  {podcastFormMode === "create"
                    ? "Điền đầy đủ thông tin và tải lên tệp âm thanh/ảnh giao diện."
                    : "Có thể cập nhật thông tin hoặc upload file mới để thay thế."}
                </p>
              </div>

              <div className="space-y-5 p-5">
                {podcastFormMode === "edit" && selectedPodcast?.status === "Rejected" && selectedPodcast?.reviewFeedback && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                    <h3 className="font-semibold text-rose-950 mb-1 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Podcast bị từ chối duyệt
                    </h3>
                    <p className="font-medium text-rose-700">{selectedPodcast.reviewFeedback}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Tiêu đề
                  </label>
                  <input
                    type="text"
                    value={podcastForm.title}
                    onChange={(e) => setPodcastFormField("title", e.target.value)}
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Nhập tiêu đề podcast"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Mô tả ngắn
                  </label>
                  <textarea
                    value={podcastForm.description}
                    onChange={(e) => setPodcastFormField("description", e.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Tóm tắt ngắn về podcast này"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Nội dung chi tiết / Ghi chú
                  </label>
                  <textarea
                    value={podcastForm.content}
                    onChange={(e) => setPodcastFormField("content", e.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Nội dung chính hoặc transcript của podcast"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mt-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                      Chủ đề (Category)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewCategory(!isAddingNewCategory);
                        setNewCategoryName("");
                        setPodcastFormField("category", "");
                      }}
                      className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
                    >
                      {isAddingNewCategory ? "Hủy" : "Tạo mới"}
                    </button>
                  </div>
                  {isAddingNewCategory ? (
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => {
                        setNewCategoryName(e.target.value);
                        setPodcastFormField("category", e.target.value);
                      }}
                      className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="Nhập tên chủ đề mới (ví dụ: liên hợp quốc...)"
                    />
                  ) : (
                    <select
                      value={podcastForm.category}
                      onChange={(e) => setPodcastFormField("category", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="">Chọn chủ đề (Bắt buộc)</option>
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Trình độ (Level)
                  </label>
                  <select
                    value={podcastForm.level}
                    onChange={(e) => setPodcastFormField("level", e.target.value)}
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="Easy">Dễ (Easy)</option>
                    <option value="Medium">Trung bình (Medium)</option>
                    <option value="Hard">Khó (Hard)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Bài học liên kết (Chứa Game 2D)
                  </label>
                  <select
                    value={podcastForm.lessonId}
                    onChange={(e) => setPodcastFormField("lessonId", e.target.value)}
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">Không liên kết game</option>
                    {lessons.map((lesson) => (
                      <option key={lesson._id} value={lesson._id}>
                        {lesson.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Ảnh giao diện {podcastFormMode === "create" && "(bắt buộc)"}
                  </label>
                  <CustomFileInput
                    accept="image/*"
                    onChange={(e) => setPodcastFormField("thumbnailFile", e.target.files?.[0] || null)}
                    fileCount={podcastForm.thumbnailFile ? 1 : 0}
                    singleFileName={podcastForm.thumbnailFile?.name}
                  />
                  {podcastFormMode === "edit" && selectedPodcast?.thumbnail && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-[11px] text-amber-600 font-semibold">Ảnh giao diện hiện tại:</p>
                      <div className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                        <img
                          src={selectedPodcast.thumbnail}
                          alt="Ảnh giao diện hiện tại"
                          className="w-16 h-16 object-cover rounded-lg border border-amber-200 bg-white"
                        />
                        <a
                          href={selectedPodcast.thumbnail}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-800 underline hover:text-amber-900 break-all truncate block"
                        >
                          {selectedPodcast.thumbnail.split("/").pop()}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                    File âm thanh {podcastFormMode === "create" && "(bắt buộc)"}
                  </label>
                  <CustomFileInput
                    accept="audio/*"
                    onChange={(e) => setPodcastFormField("audioFile", e.target.files?.[0] || null)}
                    fileCount={podcastForm.audioFile ? 1 : 0}
                    singleFileName={podcastForm.audioFile?.name}
                  />
                  {podcastFormMode === "edit" && selectedPodcast?.audioUrl && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-[11px] text-amber-600 font-semibold">Tệp âm thanh hiện tại:</p>
                      <div className="flex flex-col gap-2 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                        <audio src={selectedPodcast.audioUrl} controls className="w-full h-8 max-w-md" />
                        <a
                          href={selectedPodcast.audioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-800 underline hover:text-amber-900 break-all truncate block"
                        >
                          {selectedPodcast.audioUrl.split("/").pop()}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handlePodcastSubmit}
                    className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
                  >
                    {podcastFormMode === "create" ? "Tạo podcast" : "Lưu cập nhật"}
                  </button>
                  {podcastFormMode === "edit" && (
                    <button
                      type="button"
                      onClick={handlePodcastDelete}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                    >
                      Xóa podcast
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {saving && uploadProgress !== null && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}>
            <div className="bg-[#FFFBF2] border-2 border-amber-700 rounded-xl p-6 w-[90%] max-w-[400px] shadow-2xl text-center">
              <h3 className="font-semibold text-lg text-amber-900 mb-4 tracking-wider uppercase" style={{ fontFamily: "Cinzel, serif" }}>
                {uploadProgress === 100
                  ? "ĐANG XỬ LÝ DỮ LIỆU..."
                  : activeTab === "lessons"
                    ? "ĐANG TẢI BÀI HỌC LÊN..."
                    : "ĐANG TẢI PODCAST LÊN..."}
              </h3>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-amber-600 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="text-xl font-bold text-amber-900 mb-2">
                {uploadProgress}%
              </div>
              <p className="text-xs text-amber-800/80">
                {uploadProgress === 100
                  ? "Đang lưu thông tin vào cơ sở dữ liệu, vui lòng đợi..."
                  : activeTab === "lessons"
                    ? "Đang tải tệp bản đồ và hình ảnh nhân vật lên máy chủ..."
                    : "Đang tải ảnh giao diện và tệp âm thanh lên máy chủ..."}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}