"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { blogApi } from "@/lib/blogApi";
import type { BlogPost, BlogReport } from "@/types/blog";

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
  pendingDraft?: any;
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
  pendingDraft?: any;
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

const translateLevel = (level?: string) => {
  if (!level) return "";
  const mapping: Record<string, string> = {
    Easy: "Dễ",
    Medium: "Trung cấp",
    Hard: "Nâng cao",
    "Dễ": "Dễ",
    "Trung cấp": "Trung cấp",
    "Nâng cao": "Nâng cao"
  };
  return mapping[level] || level;
};

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

  const [activeTab, setActiveTab] = useState<"lessons" | "podcasts" | "blog" | "lesson-requests">("lessons");

  // Lesson Requests states for staff
  const [lessonRequests, setLessonRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await api.get<{ success: boolean; data: any[] }>("/subscriptions/admin/lesson-requests");
      setLessonRequests(res.data.data);
    } catch (err) {
      console.error("Error loading requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Blog Moderation states
  const [pendingPosts, setPendingPosts] = useState<BlogPost[]>([]);
  const [pendingReports, setPendingReports] = useState<BlogReport[]>([]);
  const [blogLoading, setBlogLoading] = useState(false);
  const [rejectingPostId, setRejectingPostId] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");

  const fetchBlogModeration = async () => {
    setBlogLoading(true);
    try {
      const postsRes = await blogApi.getPendingPosts();
      const reportsRes = await blogApi.getPendingReports();
      if (postsRes.success) setPendingPosts(postsRes.data);
      if (reportsRes.success) setPendingReports(reportsRes.data);
    } catch (err) {
      console.error("Failed to load blog moderation data:", err);
    } finally {
      setBlogLoading(false);
    }
  };

  const handleApprovePost = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn duyệt bài viết này?")) return;
    try {
      const res = await blogApi.approvePost(id);
      if (res.success) {
        setMessage({ type: "success", text: "Đã duyệt bài viết thành công." });
        fetchBlogModeration();
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Không thể duyệt bài viết." });
    }
  };

  const handleRejectPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingPostId || !rejectFeedback.trim()) return;
    try {
      const res = await blogApi.rejectPost(rejectingPostId, rejectFeedback.trim());
      if (res.success) {
        setMessage({ type: "success", text: "Đã từ chối bài viết thành công." });
        setRejectingPostId(null);
        setRejectFeedback("");
        fetchBlogModeration();
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Không thể từ chối bài viết." });
    }
  };

  const handleResolveReport = async (id: string, action: "delete" | "dismiss") => {
    const actionText = action === "delete" ? "XÓA nội dung vi phạm" : "BỎ QUA báo cáo này";
    if (!confirm(`Bạn có chắc chắn muốn ${actionText}?`)) return;
    try {
      const res = await blogApi.resolveReport(id, action);
      if (res.success) {
        setMessage({ type: "success", text: `Đã xử lý báo cáo thành công: ${actionText}.` });
        fetchBlogModeration();
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Không thể xử lý báo cáo." });
    }
  };

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
    } else if (activeTab === "blog") {
      fetchBlogModeration();
    } else if (activeTab === "lesson-requests") {
      loadRequests();
    }
  }, [user, activeTab]);

  const resetPodcastForm = () => {
    setPodcastForm(emptyPodcastForm);
    setPodcastFormMode("create");
    setSelectedPodcastId(null);
    setIsAddingNewCategory(false);
    setNewCategoryName("");
  };

  const handleRenameCategoryPrompt = async () => {
    const oldCat = podcastForm.category;
    if (!oldCat) return;

    const newCat = window.prompt(`Nhập tên mới cho chủ đề "${oldCat}":`, oldCat);
    if (!newCat || newCat.trim() === "" || newCat.trim() === oldCat) return;

    if (window.confirm(`Bạn có chắc chắn muốn đổi tên chủ đề từ "${oldCat}" thành "${newCat.trim()}" cho TẤT CẢ các podcast liên quan?`)) {
      setSaving(true);
      setMessage(null);
      try {
        const csrfRes = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
        const csrfToken = csrfRes.data.data.csrfToken;

        await api.put(
          "/staff/categories/rename",
          { oldCategory: oldCat, newCategory: newCat.trim() },
          { headers: { "x-csrf-token": csrfToken } }
        );

        setMessage({ type: "success", text: `Đã đổi tên chủ đề "${oldCat}" thành "${newCat.trim()}" thành công.` });
        loadPodcasts();
        setPodcastFormField("category", newCat.trim());
      } catch (err: any) {
        console.error(err);
        setMessage({ type: "error", text: "Lỗi đổi tên chủ đề: " + (err.response?.data?.message || err.message) });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDeleteCategoryPrompt = async () => {
    const catToDelete = podcastForm.category;
    if (!catToDelete) return;

    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa chủ đề "${catToDelete}"? Tất cả các podcast thuộc chủ đề này sẽ được chuyển sang chủ đề mặc định "Chủ đề chung".`
      )
    ) {
      setSaving(true);
      setMessage(null);
      try {
        const csrfRes = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
        const csrfToken = csrfRes.data.data.csrfToken;

        await api.delete(
          "/staff/categories/delete",
          {
            headers: { "x-csrf-token": csrfToken },
            data: { category: catToDelete }
          }
        );

        setMessage({ type: "success", text: `Đã xóa chủ đề "${catToDelete}" thành công. Các podcast liên quan đã chuyển sang "Chủ đề chung".` });
        loadPodcasts();
        setPodcastFormField("category", "");
      } catch (err: any) {
        console.error(err);
        setMessage({ type: "error", text: "Lỗi xóa chủ đề: " + (err.response?.data?.message || err.message) });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSelectPodcast = (podcast: Podcast) => {
    setSelectedPodcastId(podcast._id);
    setPodcastFormMode("edit");
    setIsAddingNewCategory(false);
    setNewCategoryName("");
    const draft = podcast.pendingDraft;
    // Use pendingDraft values if available (for Published podcasts with pending edits)
    const rawLessonId = draft?.lessonId !== undefined ? draft.lessonId : podcast.lessonId;
    setPodcastForm({
      title: draft?.title ?? podcast.title,
      description: draft?.description ?? podcast.description ?? "",
      content: draft?.content ?? podcast.content ?? "",
      level: draft?.level ?? podcast.level ?? "Medium",
      category: draft?.category ?? podcast.category ?? "",
      lessonId: rawLessonId && typeof rawLessonId === "object"
        ? (rawLessonId as any)._id || ""
        : (rawLessonId as string) || "",
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
      formData.append("lessonId", podcastForm.lessonId || "");

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
      .catch(() => setMessage({ type: "error", text: "Không thể tải danh sách trò chơi." }))
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
    const draft = lesson.pendingDraft;
    setForm({
      title: draft?.title ?? lesson.title,
      content: draft?.content ?? lesson.content,
      spawnX: String(draft?.spawnPoint?.x ?? lesson.game.spawnPoint.x),
      spawnY: String(draft?.spawnPoint?.y ?? lesson.game.spawnPoint.y),
      tilesetNames: draft?.tilesets 
        ? draft.tilesets.map((ts: any) => ts.name)
        : lesson.game.tilesets.map((ts) => ts.name),
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
        setMessage({ type: "success", text: "Tạo trò chơi thành công." });
        resetForm();
      } else if (selectedId) {
        await api.put(`/lessons/${selectedId}`, formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
          onUploadProgress: onProgress,
        });
        setMessage({ type: "success", text: "Cập nhật trò chơi thành công." });
      }

      const res = await api.get<{ success: boolean; lessons: Lesson[] }>("/lessons");
      setLessons(res.data.lessons);
    } catch (error) {
      const messageText =
        error instanceof AxiosError
          ? error.response?.data?.message || "Có lỗi xảy ra khi lưu trò chơi."
          : "Có lỗi xảy ra khi lưu trò chơi.";
      setMessage({ type: "error", text: messageText });
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const ok = window.confirm("Bạn có chắc muốn xóa trò chơi này?");
    if (!ok) return;

    try {
      const csrfToken = await getCsrfToken();
      await api.delete(`/lessons/${selectedId}`, {
        headers: { "x-csrf-token": csrfToken },
      });
      setMessage({ type: "success", text: "Xóa trò chơi thành công." });
      resetForm();
      const res = await api.get<{ success: boolean; lessons: Lesson[] }>("/lessons");
      setLessons(res.data.lessons);
    } catch (error) {
      const messageText =
        error instanceof AxiosError
          ? error.response?.data?.message || "Không thể xóa trò chơi."
          : "Không thể xóa trò chơi.";
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
        <p className="text-amber-700">Tài khoản của bạn không có quyền quản lý trò chơi.</p>
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
                    : "Chờ duyệt / Báo cáo"}
              </p>
              <p className="text-amber-900 text-lg font-semibold">
                {activeTab === "lessons"
                  ? stats.total
                  : activeTab === "podcasts"
                    ? podcasts.length
                    : `${pendingPosts.length} / ${pendingReports.length}`}
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
                    : pendingPosts[0]?.createdAt
                      ? new Date(pendingPosts[0].createdAt).toLocaleDateString("vi-VN")
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

        {activeTab === "lessons" ? (
          <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
            <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm">
              <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4">
                <h2 className="font-display text-lg font-semibold text-amber-900">
                  Danh sách trò chơi
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
                    <div className="p-6 text-center text-amber-600">Chưa có trò chơi nào.</div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm">
              <div className="border-b border-amber-100 px-5 py-4">
                <h2 className="font-display text-lg font-semibold text-amber-900">
                  {formMode === "create" ? "Tạo trò chơi" : "Chỉnh sửa trò chơi"}
                </h2>
                <p className="text-xs text-amber-600 mt-1">
                  {formMode === "create"
                    ? "Điền đủ thông tin và upload assets để tạo trò chơi."
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
                      Trò chơi bị từ chối duyệt
                    </h3>
                    <p className="font-medium text-rose-700">{selectedLesson.reviewFeedback}</p>
                  </div>
                )}

                {formMode === "edit" && selectedLesson?.pendingDraft && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-850">
                    <h3 className="font-semibold text-sky-950 mb-1 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Có chỉnh sửa đang chờ duyệt
                    </h3>
                    <p className="font-medium text-sky-700">
                      Trò chơi này đã được xuất bản (Published). Các thay đổi mới nhất đang được lưu tạm chờ Giáo viên/Admin duyệt. Dưới đây là nội dung chỉnh sửa mới nhất của bạn.
                    </p>
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
                    placeholder="Nhập tiêu đề trò chơi"
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
                    placeholder="Mô tả nội dung trò chơi"
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
                    {formMode === "create" ? "Tạo trò chơi" : "Lưu cập nhật"}
                  </button>
                  {formMode === "edit" && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                    >
                      Xóa trò chơi
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "podcasts" ? (
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
                            {translateLevel(podcast.level)}
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
                    <div className="flex items-center gap-3">
                      {podcastForm.category && !isAddingNewCategory && (
                        <>
                          <button
                            type="button"
                            onClick={handleRenameCategoryPrompt}
                            className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                          >
                            Đổi tên
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteCategoryPrompt}
                            className="text-xs font-semibold text-red-700 hover:text-red-900 underline cursor-pointer"
                          >
                            Xóa
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewCategory(!isAddingNewCategory);
                          setNewCategoryName("");
                          setPodcastFormField("category", "");
                        }}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                      >
                        {isAddingNewCategory ? "Hủy" : "Tạo mới"}
                      </button>
                    </div>
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
                    Trò chơi liên kết (Chứa Game 2D)
                  </label>
                  <select
                    value={podcastForm.lessonId}
                    onChange={(e) => setPodcastFormField("lessonId", e.target.value)}
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">Không liên kết game</option>
                    {lessons
                      .filter(
                        (lesson) =>
                          lesson.status === "Published" ||
                          lesson._id === podcastForm.lessonId
                      )
                      .map((lesson) => (
                        <option key={lesson._id} value={lesson._id}>
                          {lesson.title} {lesson.status !== "Published" && `(${lesson.status})`}
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
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.15fr_1.15fr]">
            {/* Left side: Pending Posts */}
            <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm flex flex-col">
              <div className="border-b border-amber-100 px-5 py-4">
                <h2 className="font-display text-lg font-semibold text-amber-900">
                  Bài viết chờ duyệt ({pendingPosts.length})
                </h2>
              </div>
              
              {blogLoading && pendingPosts.length === 0 ? (
                <div className="p-8 text-center text-amber-800 font-medium">Đang tải danh sách bài viết...</div>
              ) : pendingPosts.length === 0 ? (
                <div className="p-8 text-center text-amber-850 italic">Không có bài viết nào đang chờ duyệt.</div>
              ) : (
                <div className="divide-y divide-amber-100 max-h-[700px] overflow-y-auto">
                  {pendingPosts.map((post) => (
                    <div key={post._id} className="p-5 hover:bg-amber-50/30 transition">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <span className="inline-block text-[10px] uppercase font-bold text-amber-700 bg-amber-150 px-2 py-0.5 rounded mb-2">
                            {post.category}
                          </span>
                          <h3 className="font-semibold text-amber-950 mb-1">{post.title}</h3>
                          <p className="text-[11px] text-amber-800/80 mb-2">
                            Người đăng: <strong>{post.author.name}</strong> • Lúc {new Date(post.createdAt).toLocaleString("vi-VN")}
                          </p>
                          <p className="text-xs text-gray-700 line-clamp-3 mb-3 whitespace-pre-wrap">{post.content}</p>
                          
                          {post.images && post.images.length > 0 && (
                            <div className="flex gap-2 mb-3">
                              {post.images.map((img) => (
                                <img key={img.publicId} src={img.url} className="w-14 h-14 object-cover rounded border border-amber-200" alt="thumbnail" />
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => handleApprovePost(post._id)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                          >
                            ✓ Duyệt
                          </button>
                          <button
                            onClick={() => setRejectingPostId(post._id)}
                            className="rounded-lg border border-red-250 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-650 hover:bg-red-100 transition"
                          >
                            ✕ Từ chối
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right side: Flagged Reports */}
            <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm flex flex-col">
              <div className="border-b border-amber-100 px-5 py-4">
                <h2 className="font-display text-lg font-semibold text-amber-900">
                  Báo cáo vi phạm ({pendingReports.length})
                </h2>
              </div>

              {blogLoading && pendingReports.length === 0 ? (
                <div className="p-8 text-center text-amber-800 font-medium">Đang tải danh sách báo cáo...</div>
              ) : pendingReports.length === 0 ? (
                <div className="p-8 text-center text-amber-850 italic">Không có báo cáo vi phạm nào chưa xử lý.</div>
              ) : (
                <div className="divide-y divide-amber-100 max-h-[700px] overflow-y-auto">
                  {pendingReports.map((report) => (
                    <div key={report._id} className="p-5 hover:bg-amber-50/30 transition">
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded uppercase">
                            {report.reason === "Spam" ? "Spam" :
                             report.reason === "Offensive_Language" ? "Từ ngữ thô tục" :
                             report.reason === "Historical_Inaccuracy" ? "Sai lệch lịch sử" :
                             report.reason === "Harassment" ? "Quấy rối" : "Lý do khác"}
                          </span>
                          <span className="text-xs text-amber-850">
                            Người báo cáo: <strong>{report.reporter.name}</strong>
                          </span>
                        </div>
                        {report.description && (
                          <p className="text-xs text-amber-800 italic bg-amber-50/50 p-2 rounded border border-amber-100">
                            "{report.description}"
                          </p>
                        )}
                      </div>

                      {/* Flagged Content Preview */}
                      {report.target ? (
                        <div className="border border-red-200 bg-rose-50/10 p-3 rounded-lg text-sm mb-3">
                          <p className="text-[10px] font-bold text-red-700 uppercase mb-1">
                            Nội dung bị báo cáo ({report.targetType === "Post" ? "Bài viết" : "Bình luận"})
                          </p>
                          {report.targetType === "Post" ? (
                            <>
                              <h4 className="font-semibold text-amber-950 mb-1">{report.target.title}</h4>
                              <p className="text-xs text-gray-600 line-clamp-2">{report.target.content}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-gray-700 mb-1">"{report.target.content}"</p>
                              {report.target.post && (
                                <p className="text-[10px] text-gray-500">
                                  Thuộc bài viết: <strong>{report.target.post.title}</strong>
                                </p>
                              )}
                            </>
                          )}
                          <p className="text-[11px] text-amber-800/80 mt-1">
                            Tác giả: <strong>{report.target.author?.name || "Không rõ"}</strong>
                          </p>
                        </div>
                      ) : (
                        <div className="p-2 bg-gray-50 text-xs text-gray-500 rounded mb-3 italic">
                          [Nội dung đã bị xóa trước đó]
                        </div>
                      )}

                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleResolveReport(report._id, "dismiss")}
                          className="rounded bg-amber-100 text-amber-850 px-3 py-1.5 text-xs font-semibold hover:bg-amber-250 transition"
                        >
                          Bỏ qua báo cáo
                        </button>
                        {report.target && (
                          <button
                            onClick={() => handleResolveReport(report._id, "delete")}
                            className="rounded bg-red-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-red-750 transition"
                          >
                            Xóa nội dung vi phạm
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Rejection Feedback Modal Overlay */}
            {rejectingPostId && (
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
                <div className="bg-[#FFFBF2] border-2 border-amber-700 rounded-xl p-6 w-[90%] max-w-[450px] shadow-2xl">
                  <h3 className="font-semibold text-lg text-amber-900 mb-4 tracking-wider uppercase" style={{ fontFamily: "Cinzel, serif" }}>
                    Từ chối bài viết
                  </h3>
                  <form onSubmit={handleRejectPostSubmit}>
                    <textarea
                      required
                      placeholder="Nhập lý do từ chối bài viết (gửi phản hồi cho người viết bài)..."
                      value={rejectFeedback}
                      onChange={(e) => setRejectFeedback(e.target.value)}
                      className="w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[100px] mb-4"
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => { setRejectingPostId(null); setRejectFeedback(""); }}
                        className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Gửi từ chối
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "lesson-requests" && (
          <div className="bg-[#FFFBF2] border-2 border-amber-700 rounded-xl p-6 shadow-md mt-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-semibold text-lg text-amber-900 tracking-wider uppercase" style={{ fontFamily: "Cinzel, serif" }}>
                  Theo dõi Yêu cầu bài học (Pro)
                </h3>
                <p className="text-xs text-amber-800">
                  Giám sát các yêu cầu soạn thảo bài học từ học viên Pro và trạng thái xử lý của Giáo viên
                </p>
              </div>
              <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded text-xs font-bold border border-amber-200">
                {lessonRequests.length} Yêu cầu
              </span>
            </div>

            {loadingRequests ? (
              <div className="text-center py-10 text-amber-800 font-semibold italic">
                Đang tải danh sách yêu cầu bài học...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" style={{ fontSize: "14px" }}>
                  <thead>
                    <tr className="border-b-2 border-amber-700 text-amber-900 font-bold uppercase" style={{ fontFamily: "Cinzel, serif", fontSize: "12px" }}>
                      <th className="py-2.5 px-3">Học sinh</th>
                      <th className="py-2.5 px-3">Chi tiết yêu cầu</th>
                      <th className="py-2.5 px-3">Thời kỳ</th>
                      <th className="py-2.5 px-3">Giáo viên phụ trách</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-3">Ngày gửi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessonRequests.map((req) => (
                      <tr key={req._id} className="border-b border-amber-200 hover:bg-amber-50/50">
                        <td className="py-3 px-3">
                          <strong className="text-amber-950 block">{req.requesterId?.name || "Học viên Pro"}</strong>
                          <span className="text-[10px] text-stone-500">{req.requesterId?.email || ""}</span>
                        </td>
                        <td className="py-3 px-3" style={{ maxWidth: "350px" }}>
                          <strong className="text-amber-900">{req.title}</strong>
                          <p className="text-stone-600 text-xs mt-1 line-clamp-3">{req.description}</p>
                          {req.teacherResponse && (
                            <div className="mt-2 text-rose-700 bg-rose-50 p-2 rounded border border-rose-200 text-xs">
                              <strong>Lý do từ chối:</strong> {req.teacherResponse}
                            </div>
                          )}
                          {req.resultPodcastId && (
                            <div className="mt-2 text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200 text-xs">
                              <strong>Podcast xuất bản:</strong> {typeof req.resultPodcastId === "object" ? req.resultPodcastId.title : req.resultPodcastId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-stone-700">{req.historicalPeriod || "Chưa rõ"}</td>
                        <td className="py-3 px-3">
                          <strong className="text-amber-950 block">{req.assignedTeacherId?.name || "Chưa nhận"}</strong>
                          <span className="text-[10px] text-stone-500">{req.assignedTeacherId?.email || ""}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.status === "Pending" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                            req.status === "Accepted" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                            req.status === "InProgress" ? "bg-purple-100 text-purple-800 border border-purple-200" :
                            req.status === "Completed" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                            "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}>
                            {req.status === "Pending" ? "Chờ duyệt" :
                             req.status === "Accepted" ? "Đã nhận" :
                             req.status === "InProgress" ? "Đang soạn" :
                             req.status === "Completed" ? "Hoàn thành" :
                             "Từ chối"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-stone-500 text-xs">
                          {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                      </tr>
                    ))}
                    {lessonRequests.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-stone-500 italic">
                          Chưa có yêu cầu bài học nào trên hệ thống.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
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
                    ? "ĐANG TẢI TRÒ CHƠI LÊN..."
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