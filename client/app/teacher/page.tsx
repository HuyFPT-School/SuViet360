"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  rejectionSuggestions,
  teacherReviewApi,
  type LessonGame,
  type ReviewStatus,
  type TeacherReviewItem,
} from "@/lib/teacherReviewApi";
import dynamic from "next/dynamic";
import { subscriptionApi } from "@/lib/subscriptionApi";
import type { LessonRequest } from "@/types/subscription";
import { api } from "@/lib/api";

const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => (
    <p className="text-center p-6 text-amber-800 font-medium">
      Đang tải game...
    </p>
  ),
});

// SVG Icons matching the vintage SuViet360 theme (NO EMOJIS)
function HelmIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-9 h-9 shrink-0 ${className}`} style={{ width: "36px", height: "36px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function DashboardIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function GamepadIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="1" fill="currentColor" />
      <path d="M17.3 5H6.7C3.6 5 2 7.4 2 11c0 4.1 2.3 8 5 8 1.1 0 2.2-.6 2.8-1.5L11 16h2l1.2 1.5c.6.9 1.7 1.5 2.8 1.5 2.7 0 5-3.9 5-8 0-3.6-1.6-6-4.7-6z" />
    </svg>
  );
}

function BookIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function HelpIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function MessageIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function LogoutIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function HourglassIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 shrink-0 ${className}`} style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </svg>
  );
}

function CheckCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 shrink-0 ${className}`} style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 shrink-0 ${className}`} style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function FileTextIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 shrink-0 ${className}`} style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CategoryGridIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function FilterLinesIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}

function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function EyeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function BarChartIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function MicIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-3 h-3 shrink-0 ${className}`} style={{ width: "12px", height: "12px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

const statusOptions: Array<{ value: ReviewStatus | "All"; label: string }> = [
  { value: "All", label: "Tất cả trạng thái" },
  { value: "Pending_Review", label: "Chờ duyệt" },
  { value: "Published", label: "Đã xuất bản" },
  { value: "Rejected", label: "Bị từ chối" },
];

function formatDate(value?: string) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusLabel(status: ReviewStatus) {
  if (status === "Pending_Review") return "Chờ duyệt";
  if (status === "Published") return "Đã xuất bản";
  return "Bị từ chối";
}

function formatCreatorDisplay(createdByStr: string) {
  if (!createdByStr) return { name: "Staff", email: "" };
  const parts = createdByStr.split(" (");
  if (parts.length === 2) {
    return {
      name: parts[0],
      email: parts[1].replace(")", ""),
    };
  }
  return { name: createdByStr, email: "" };
}

export default function TeacherPage() {
  const { user, isLoading, refreshUser, logout } = useAuth();
  const [items, setItems] = useState<TeacherReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "All">("Pending_Review");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [timeFilter, setTimeFilter] = useState<string>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectingItem, setRejectingItem] = useState<TeacherReviewItem | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  // New LessonRequest states
  const [activeDashboardTab, setActiveDashboardTab] = useState<"dashboard" | "reviews" | "requests" | "guide" | "audit" | "notes">("reviews");
  const [requests, setRequests] = useState<LessonRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [completingRequestId, setCompletingRequestId] = useState<string | null>(null);
  const [selectedPodcastId, setSelectedPodcastId] = useState("");
  const [availablePodcasts, setAvailablePodcasts] = useState<any[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);

  // Refined Request parameters
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null);
  const [needsGameCreation, setNeedsGameCreation] = useState(false);
  const [pedagogicalNotes, setPedagogicalNotes] = useState("");
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState("");

  // Podcast CRUD states (used for accept and edit modals)
  const [editingPodcastId, setEditingPodcastId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [podcasts, setPodcasts] = useState<any[]>([]);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const emptyPodcastForm = {
    title: "",
    description: "",
    content: "",
    level: "Medium",
    category: "",
    lessonId: "",
    thumbnailFile: null as File | null,
    audioFile: null as File | null,
    existingThumbnail: "",
    existingAudioUrl: "",
  };
  const [podcastForm, setPodcastForm] = useState(emptyPodcastForm);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  const loadItems = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await teacherReviewApi.getReviewItems();
      setItems(response.data.filter((item: any) => item.type !== "StudyUnit" && item.type !== "Quiz"));
    } catch {
      setError("Không thể tải danh sách bài học cần duyệt.");
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    setLoadingRequests(true);
    setError("");
    try {
      const data = await subscriptionApi.getTeacherLessonRequests();
      setRequests(data);
      
      const podcastsRes = await api.get<{ success: boolean; data: any[] }>("/podcasts");
      setAvailablePodcasts(podcastsRes.data.data || []);
    } catch {
      setError("Không thể tải danh sách yêu cầu bài học.");
    } finally {
      setLoadingRequests(false);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (activeDashboardTab === "requests") {
      await loadRequests();
    } else {
      await loadItems();
      if (activeDashboardTab === "reviews") {
        setStatusFilter("Pending_Review");
      }
    }
  };

  // Sync tab from URL query params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "requests") {
        setActiveDashboardTab("requests");
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      setLoading(true);
      const currentUser = await refreshUser();
      if (!mounted) return;

      if (!currentUser || !["teacher", "admin"].includes(currentUser.role)) {
        setLoading(false);
        return;
      }

      if (activeDashboardTab === "reviews") {
        await loadItems();
        loadLessonsList();
        loadPodcasts();
        loadQuizzes();
      } else {
        await loadRequests();
        await loadLessonsList();
        await loadPodcasts();
        await loadQuizzes();
      }
    };

    boot();
    return () => {
      mounted = false;
    };
  }, [refreshUser, activeDashboardTab]);

  const handleAcceptRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError("");

    if (!podcastForm.title.trim()) {
      setFeedbackError("Vui lòng nhập tiêu đề podcast.");
      return;
    }
    if (!podcastForm.thumbnailFile || !podcastForm.audioFile) {
      setFeedbackError("Vui lòng tải lên đầy đủ tệp ảnh và âm thanh cho podcast.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("title", podcastForm.title.trim());
      formData.append("description", podcastForm.description.trim());
      formData.append("content", podcastForm.content.trim());
      formData.append("level", podcastForm.level);
      formData.append("category", podcastForm.category.trim() || "Yêu cầu VIP");
      formData.append("thumbnail", podcastForm.thumbnailFile);
      formData.append("audio", podcastForm.audioFile);

      const csrfRes = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
      const csrfToken = csrfRes.data.data.csrfToken;

      const uploadRes = await api.post<{ success: boolean; data: { _id: string } }>(
        "/staff/podcasts",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
          onUploadProgress: (progressEvent: any) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          }
        }
      );

      const newPodcastId = uploadRes.data.data._id;

      await subscriptionApi.acceptLessonRequest(acceptingRequestId!, {
        needsGameCreation,
        pedagogicalNotes: pedagogicalNotes.trim(),
        estimatedCompletionDate: estimatedCompletionDate || undefined,
        resultPodcastId: newPodcastId,
      });

      setMessage("Đã nhận yêu cầu soạn bài và tạo podcast thành công!");
      setAcceptingRequestId(null);
      resetPodcastForm();
      await loadRequests();
    } catch (err: any) {
      setFeedbackError(err.response?.data?.message || "Lỗi khi nhận yêu cầu và tải lên podcast.");
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleStartRequest = async (requestId: string) => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await subscriptionApi.startLessonRequest(requestId);
      setMessage("Đã bắt đầu soạn thảo bài học!");
      await loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi cập nhật trạng thái.");
    } finally {
      setSaving(false);
    }
  };

  const handleRejectRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setFeedbackError("Vui lòng nhập lý do từ chối.");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await subscriptionApi.rejectLessonRequest(rejectingRequestId!, rejectReason.trim());
      setMessage("Đã từ chối yêu cầu.");
      setRejectingRequestId(null);
      setRejectReason("");
      await loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi từ chối yêu cầu.");
    } finally {
      setSaving(false);
    }
  };

  const triggerCompleteRequest = async (requestId: string, podcastId: string | null, podcastTitle: string) => {
    if (podcastId) {
      if (window.confirm(`Bạn có chắc chắn muốn hoàn thành bài soạn và xuất bản podcast "${podcastTitle}"?`)) {
        setSaving(true);
        setError("");
        setMessage("");
        try {
          await subscriptionApi.completeLessonRequest(requestId, podcastId);
          setMessage("Đã hoàn thành yêu cầu soạn bài và xuất bản podcast!");
          await loadRequests();
        } catch (err: any) {
          setError(err.response?.data?.message || "Lỗi khi hoàn thành yêu cầu.");
        } finally {
          setSaving(false);
        }
      }
    } else {
      setCompletingRequestId(requestId);
      setSelectedPodcastId("");
      setFeedbackError("");
    }
  };

  const handleCompleteRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError("");

    if (!selectedPodcastId) {
      setFeedbackError("Vui lòng chọn podcast liên kết.");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await subscriptionApi.completeLessonRequest(completingRequestId!, selectedPodcastId);
      setMessage("Đã hoàn thành yêu cầu soạn bài!");
      setCompletingRequestId(null);
      setSelectedPodcastId("");
      await loadRequests();
    } catch (err: any) {
      setFeedbackError(err.response?.data?.message || "Lỗi khi hoàn thành yêu cầu.");
    } finally {
      setSaving(false);
    }
  };

  const loadPodcasts = async () => {
    try {
      const res = await api.get<{ success: boolean; data: any[] }>("/podcasts");
      setPodcasts(res.data.data || []);
    } catch {
      // Ignore
    }
  };

  const loadLessonsList = async () => {
    try {
      const res = await api.get<{ success: boolean; lessons: any[] }>("/lessons");
      setLessons(res.data.lessons || []);
    } catch {
      // Ignore
    }
  };

  const loadQuizzes = async () => {
    try {
      const res = await api.get<{ success: boolean; data: { quizzes: any[] } }>("/curriculum/quizzes");
      setAvailableQuizzes(res.data.data.quizzes || []);
    } catch {
      // Ignore
    }
  };

  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    podcasts.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [podcasts]);

  const handleRenameCategoryPrompt = async () => {
    const oldCat = podcastForm.category;
    if (!oldCat) return;

    const newCat = window.prompt(`Nhập tên mới cho chủ đề "${oldCat}":`, oldCat);
    if (!newCat || newCat.trim() === "" || newCat.trim() === oldCat) return;

    if (window.confirm(`Bạn có chắc chắn muốn đổi tên chủ đề từ "${oldCat}" thành "${newCat.trim()}" cho TẤT CẢ các podcast liên quan?`)) {
      setSaving(true);
      setFeedbackError("");
      try {
        const csrfRes = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
        const csrfToken = csrfRes.data.data.csrfToken;

        await api.put(
          "/staff/categories/rename",
          { oldCategory: oldCat, newCategory: newCat.trim() },
          { headers: { "x-csrf-token": csrfToken } }
        );

        setPodcastFormField("category", newCat.trim());
        await loadPodcasts();
      } catch (err: any) {
        setFeedbackError("Lỗi đổi tên chủ đề: " + (err.response?.data?.message || err.message));
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
      setFeedbackError("");
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

        setPodcastFormField("category", "");
        await loadPodcasts();
      } catch (err: any) {
        setFeedbackError("Không thể xóa chủ đề: " + (err.response?.data?.message || err.message));
      } finally {
        setSaving(false);
      }
    }
  };

  const setPodcastFormField = (field: string, value: any) => {
    setPodcastForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetPodcastForm = () => {
    setPodcastForm(emptyPodcastForm);
    setUploadProgress(null);
    setIsAddingNewCategory(false);
    setNewCategoryName("");
  };

  const openEditPodcastModal = async (podcastId: string) => {
    setSaving(true);
    setFeedbackError("");
    try {
      const res = await api.get<{ success: boolean; data: any }>(`/staff/podcasts/${podcastId}`);
      const podcast = res.data.data;
      if (podcast) {
        setEditingPodcastId(podcastId);
        const draft = podcast.pendingDraft;
        setPodcastForm({
          title: draft?.title ?? podcast.title,
          description: draft?.description ?? podcast.description ?? "",
          content: draft?.content ?? podcast.content ?? "",
          level: draft?.level ?? podcast.level ?? "Medium",
          category: draft?.category ?? podcast.category ?? "",
          lessonId: draft?.lessonId
            ? (typeof draft.lessonId === "object" ? draft.lessonId._id : draft.lessonId)
            : (typeof podcast.lessonId === "object" && podcast.lessonId !== null
              ? (podcast.lessonId as any)._id || ""
              : (podcast.lessonId as string) || ""),
          thumbnailFile: null,
          audioFile: null,
          existingThumbnail: draft?.thumbnail ?? podcast.thumbnail ?? "",
          existingAudioUrl: draft?.audioUrl ?? podcast.audioUrl ?? "",
        });
        await loadLessonsList();
      }
    } catch {
      setError("Không thể tải thông tin podcast để chỉnh sửa.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditPodcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError("");

    if (!podcastForm.title.trim()) {
      setFeedbackError("Vui lòng nhập tiêu đề podcast.");
      return;
    }

    setSaving(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("title", podcastForm.title.trim());
      formData.append("description", podcastForm.description.trim());
      formData.append("content", podcastForm.content.trim());
      formData.append("level", podcastForm.level);
      formData.append("category", podcastForm.category.trim() || "Yêu cầu VIP");
      if (podcastForm.lessonId) {
        formData.append("lessonId", podcastForm.lessonId);
      }
      if (podcastForm.thumbnailFile) {
        formData.append("thumbnail", podcastForm.thumbnailFile);
      }
      if (podcastForm.audioFile) {
        formData.append("audio", podcastForm.audioFile);
      }

      const csrfRes = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
      const csrfToken = csrfRes.data.data.csrfToken;

      await api.put(`/staff/podcasts/${editingPodcastId}`, formData, {
        headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      });

      setMessage("Cập nhật podcast thành công!");
      setEditingPodcastId(null);
      resetPodcastForm();
      await loadRequests();
    } catch (err: any) {
      setFeedbackError(err.response?.data?.message || "Lỗi khi cập nhật podcast.");
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const isSameDay = (d1?: string) => {
    if (!d1) return false;
    const date = new Date(d1);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;
      const matchesType =
        typeFilter === "All" ||
        (typeFilter === "Game" && item.type === "Lesson") ||
        (typeFilter === "Podcast" && item.type === "Podcast");
      
      let matchesTime = true;
      if (timeFilter !== "All" && item.submittedAt) {
        const itemDate = new Date(item.submittedAt).getTime();
        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000;
        if (timeFilter === "Today") {
          matchesTime = isSameDay(item.submittedAt);
        } else if (timeFilter === "Week") {
          matchesTime = now - itemDate <= 7 * oneDay;
        } else if (timeFilter === "Month") {
          matchesTime = now - itemDate <= 30 * oneDay;
        }
      }

      const matchesQuery =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.summary.toLowerCase().includes(term) ||
        item.createdBy.toLowerCase().includes(term);

      return matchesStatus && matchesType && matchesTime && matchesQuery;
    });
  }, [items, query, statusFilter, typeFilter, timeFilter]);

  const stats = useMemo(() => {
    if (activeDashboardTab === "requests") {
      const pending = requests.filter((r) => r.status === "Pending").length;
      const published = requests.filter((r) => r.status === "Completed" || r.status === "InProgress" || r.status === "Accepted").length;
      const rejected = requests.filter((r) => r.status === "Rejected").length;
      const total = requests.length;
      const pendingToday = requests.filter((r) => r.status === "Pending" && isSameDay((r as any).createdAt || (r as any).submittedAt)).length;
      return {
        pending,
        published,
        rejected,
        total,
        pendingToday,
        publishedToday: 0,
        rejectedToday: 0,
      };
    }

    if (activeDashboardTab === "reviews") {
      const pending = items.filter((item) => item.status === "Pending_Review").length;
      const published = items.filter((item) => item.status === "Published").length;
      const rejected = items.filter((item) => item.status === "Rejected").length;
      const total = items.length;

      const pendingToday = items.filter(
        (item) => item.status === "Pending_Review" && isSameDay(item.submittedAt)
      ).length;

      const publishedToday = items.filter(
        (item) => item.status === "Published" && isSameDay(item.submittedAt)
      ).length;

      const rejectedToday = items.filter(
        (item) => item.status === "Rejected" && isSameDay(item.submittedAt)
      ).length;

      return {
        pending,
        published,
        rejected,
        total,
        pendingToday,
        publishedToday,
        rejectedToday,
      };
    }

    // Default "dashboard", "audit", "notes", "guide": Combined Stats across both Game/Podcast items & Pro Requests
    const itemsPending = items.filter((item) => item.status === "Pending_Review").length;
    const requestsPending = requests.filter((r) => r.status === "Pending").length;

    const itemsPublished = items.filter((item) => item.status === "Published").length;
    const requestsPublished = requests.filter((r) => r.status === "Completed" || r.status === "InProgress" || r.status === "Accepted").length;

    const itemsRejected = items.filter((item) => item.status === "Rejected").length;
    const requestsRejected = requests.filter((r) => r.status === "Rejected").length;

    const pendingToday =
      items.filter((item) => item.status === "Pending_Review" && isSameDay(item.submittedAt)).length +
      requests.filter((r) => r.status === "Pending" && isSameDay((r as any).createdAt || (r as any).submittedAt)).length;

    const publishedToday = items.filter(
      (item) => item.status === "Published" && isSameDay(item.submittedAt)
    ).length;

    const rejectedToday =
      items.filter((item) => item.status === "Rejected" && isSameDay(item.submittedAt)).length +
      requests.filter((r) => r.status === "Rejected" && isSameDay((r as any).createdAt || (r as any).submittedAt)).length;

    return {
      pending: itemsPending + requestsPending,
      published: itemsPublished + requestsPublished,
      rejected: itemsRejected + requestsRejected,
      total: items.length + requests.length,
      pendingToday,
      publishedToday,
      rejectedToday,
    };
  }, [items, requests, activeDashboardTab]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;

  const handleApprove = async (item: TeacherReviewItem) => {
    const typeLabel = item.type === "Lesson" ? "game" : item.type === "Podcast" ? "podcast" : "bài học";
    const ok = window.confirm(
      `Duyệt ${typeLabel} "${item.title}" và cho phép hiển thị với học sinh?`
    );
    if (!ok) return;

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await teacherReviewApi.approveContent(item.id, item.type);
      await loadItems();
      setMessage(`Đã phê duyệt thành công ${typeLabel} "${item.title}" và xuất bản công khai.`);
    } catch {
      setError(`Không thể duyệt ${typeLabel} này.`);
    } finally {
      setSaving(false);
    }
  };

  const openRejectForm = (item: TeacherReviewItem) => {
    setRejectingItem(item);
    setFeedback("");
    setFeedbackError("");
  };

  const handleReject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rejectingItem) return;

    const trimmedFeedback = feedback.trim();
    if (!trimmedFeedback) {
      setFeedbackError("Vui lòng nhập lý do từ chối trước khi gửi.");
      return;
    }

    const typeLabel = rejectingItem.type === "Lesson" ? "game" : rejectingItem.type === "Podcast" ? "podcast" : "bài học";

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await teacherReviewApi.rejectContent(rejectingItem.id, rejectingItem.type, trimmedFeedback);
      await loadItems();
      setRejectingItem(null);
      setFeedback("");
      setMessage(`Đã từ chối ${typeLabel} "${rejectingItem.title}" và gửi nhận xét phản hồi cho Staff.`);
    } catch {
      setError(`Không thể từ chối ${typeLabel} này.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <section className="admin-page admin-page--center">
        <div className="admin-loading">Đang tải Teacher Review Dashboard...</div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="admin-page admin-page--center">
        <div className="admin-access-card">
          <h1>Teacher Review</h1>
          <p>Bạn cần đăng nhập bằng tài khoản Teacher để duyệt bài học.</p>
          <Link href="/login" className="admin-primary-link">
            Đăng nhập
          </Link>
        </div>
      </section>
    );
  }

  if (!["teacher", "admin"].includes(user.role)) {
    return (
      <section className="admin-page admin-page--center">
        <div className="admin-access-card">
          <h1>Không có quyền truy cập</h1>
          <p>Trang này chỉ dành cho Teacher duyệt game & podcast Staff gửi lên.</p>
          <Link href="/" className="admin-primary-link">
            Về trang chủ
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="teacher-page">
      <div className="teacher-dash-layout">
        {/* LEFT SIDEBAR PANEL */}
        <aside className="teacher-dash-sidebar">
          {/* Header Logo */}
          <div className="teacher-logo-header">
            <HelmIcon className="teacher-helm-icon" />
            <h1 className="teacher-logo-title">DUYỆT GAME</h1>
            <div className="teacher-logo-subtitle">& PODCAST</div>
          </div>

          {/* Teacher Profile Card */}
          <div className="teacher-profile-card-v2">
            <div className="teacher-avatar-wrapper">
              <img
                src={user.avatar || "/images/login_background.png"}
                alt={user.name || "Teacher Avatar"}
                className="teacher-avatar-img"
              />
            </div>
            <div className="teacher-profile-name">{user.name || "Vu Van Duc"}</div>
            <div className="teacher-role-badge">TEACHER</div>
            <div className="teacher-star-rating">★ ★ ★ ★ ★</div>
            <div className="teacher-email-text">{user.email || "vuvanduc3012004@gmail.com"}</div>
          </div>

          {/* Navigation Menu */}
          <nav className="teacher-nav-menu">
            <button
              type="button"
              onClick={() => {
                setActiveDashboardTab("dashboard");
                setSelectedId(null);
                setStatusFilter("All");
              }}
              className={`teacher-nav-item ${activeDashboardTab === "dashboard" ? "teacher-nav-item--active" : ""}`}
            >
              <DashboardIcon className="teacher-nav-icon" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveDashboardTab("reviews");
                setSelectedId(null);
                setStatusFilter("Pending_Review");
              }}
              className={`teacher-nav-item ${activeDashboardTab === "reviews" ? "teacher-nav-item--active" : ""}`}
            >
              <GamepadIcon className="teacher-nav-icon" />
              <span>Duyệt Game & Podcast</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveDashboardTab("requests");
                setSelectedId(null);
              }}
              className={`teacher-nav-item ${activeDashboardTab === "requests" ? "teacher-nav-item--active" : ""}`}
            >
              <BookIcon className="teacher-nav-icon" />
              <span>Yêu cầu bài học (Pro)</span>
            </button>

            <div className="teacher-nav-divider">
              <span>◇</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveDashboardTab("guide");
                setSelectedId(null);
              }}
              className={`teacher-nav-item ${activeDashboardTab === "guide" ? "teacher-nav-item--active" : ""}`}
            >
              <HelpIcon className="teacher-nav-icon" />
              <span>Hướng dẫn sử dụng</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveDashboardTab("notes");
                setSelectedId(null);
                setStatusFilter("Rejected");
              }}
              className={`teacher-nav-item ${activeDashboardTab === "notes" ? "teacher-nav-item--active" : ""}`}
            >
              <MessageIcon className="teacher-nav-icon" />
              <span>Duyệt hoặc Từ chối kèm nhận xét</span>
            </button>

            <div className="teacher-nav-divider">
              <span>◇</span>
            </div>

            <button
              type="button"
              onClick={() => logout()}
              className="teacher-nav-item text-red-800 hover:bg-rose-100/60 w-full text-left"
            >
              <LogoutIcon className="teacher-nav-icon text-red-800" />
              <span>Đăng xuất</span>
            </button>
          </nav>
        </aside>

        {/* RIGHT MAIN CONTENT PANEL */}
        <main className="teacher-dash-main">
          {selectedItem ? (
            <TeacherItemDetailFullView
              item={selectedItem}
              saving={saving}
              lessons={lessons}
              podcasts={podcasts}
              quizzes={availableQuizzes}
              onBack={() => setSelectedId(null)}
              onApprove={handleApprove}
              onReject={openRejectForm}
            />
          ) : (
            <>
              {/* Header Bar */}
              <div className="teacher-header-bar">
                <div>
                  <h1 className="teacher-main-title font-sans">Bảng Duyệt Bài Giáo Viên</h1>
                  <p className="teacher-main-subtitle">
                    Duyệt game, podcast và yêu cầu bài học từ cộng đồng
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="teacher-top-refresh"
                >
                  <RefreshIcon className="w-4 h-4" />
                  <span>Làm mới</span>
                </button>
              </div>

              {(message || error) && (
                <div
                  className={`admin-alert ${
                    error ? "admin-alert--error" : "admin-alert--success"
                  } flex items-center justify-between font-sans`}
                >
                  <span>{error || message}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMessage("");
                      setError("");
                    }}
                    className="ml-4 text-xs font-bold px-2 py-0.5 rounded hover:bg-black/10 transition-colors shrink-0"
                    title="Đóng thông báo"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Stat Summary Cards Row */}
              <div className="teacher-stats-grid-v2">
                {/* Card 1: Chờ duyệt */}
                <div className="teacher-stat-card-v2 teacher-stat-card-v2--pending">
                  <div className="teacher-stat-icon-circle teacher-stat-icon-circle--pending">
                    <HourglassIcon />
                  </div>
                  <div className="teacher-stat-info">
                    <span className="teacher-stat-label">CHỜ DUYỆT</span>
                    <span className="teacher-stat-number">{stats.pending}</span>
                    <span className="teacher-stat-pill teacher-stat-pill--pending">
                      {stats.pendingToday > 0 ? `↑ ${stats.pendingToday} mới hôm nay` : "Chờ xử lý"}
                    </span>
                  </div>
                </div>

                {/* Card 2: Đã xuất bản */}
                <div className="teacher-stat-card-v2 teacher-stat-card-v2--published">
                  <div className="teacher-stat-icon-circle teacher-stat-icon-circle--published">
                    <CheckCircleIcon />
                  </div>
                  <div className="teacher-stat-info">
                    <span className="teacher-stat-label">ĐÃ XUẤT BẢN</span>
                    <span className="teacher-stat-number">{stats.published}</span>
                    <span className="teacher-stat-pill teacher-stat-pill--published">
                      {stats.publishedToday > 0 ? `↑ ${stats.publishedToday} hôm nay` : "Đã xuất bản"}
                    </span>
                  </div>
                </div>

                {/* Card 3: Bị từ chối */}
                <div className="teacher-stat-card-v2 teacher-stat-card-v2--rejected">
                  <div className="teacher-stat-icon-circle teacher-stat-icon-circle--rejected">
                    <XCircleIcon />
                  </div>
                  <div className="teacher-stat-info">
                    <span className="teacher-stat-label">BỊ TỪ CHỐI</span>
                    <span className="teacher-stat-number">{stats.rejected}</span>
                    <span className="teacher-stat-pill teacher-stat-pill--rejected">
                      {stats.rejectedToday > 0 ? `↓ ${stats.rejectedToday} hôm nay` : "Đã từ chối"}
                    </span>
                  </div>
                </div>

                {/* Card 4: Tổng cộng */}
                <div className="teacher-stat-card-v2 teacher-stat-card-v2--total">
                  <div className="teacher-stat-icon-circle teacher-stat-icon-circle--total">
                    <FileTextIcon />
                  </div>
                  <div className="teacher-stat-info">
                    <span className="teacher-stat-label">TỔNG CỘNG</span>
                    <span className="teacher-stat-number">{stats.total}</span>
                    <span className="teacher-stat-pill teacher-stat-pill--total">
                      Tất cả nội dung
                    </span>
                  </div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="teacher-filter-card-v2">
                <div className="teacher-search-input-wrapper">
                  <SearchIcon className="text-amber-800" />
                  <input
                    type="text"
                    className="teacher-search-input-field"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Tìm theo tiêu đề, người tạo..."
                  />
                </div>

                <div className="teacher-select-box-v2">
                  <CategoryGridIcon className="text-amber-800" />
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="All">Chọn loại</option>
                    <option value="Game">Game</option>
                    <option value="Podcast">Podcast</option>
                  </select>
                </div>

                <div className="teacher-select-box-v2">
                  <FilterLinesIcon className="text-amber-800" />
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as ReviewStatus | "All");
                      setCurrentPage(1);
                    }}
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="teacher-select-box-v2">
                  <CalendarIcon className="text-amber-800" />
                  <select
                    value={timeFilter}
                    onChange={(e) => {
                      setTimeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="All">Thời gian</option>
                    <option value="Today">Hôm nay</option>
                    <option value="Week">Tuần này</option>
                    <option value="Month">Tháng này</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleRefresh}
                  className="teacher-btn-refresh-v2"
                >
                  <RefreshIcon className="w-4 h-4" />
                  <span>Làm mới</span>
                </button>
              </div>

              {/* Main Content Area */}
              {activeDashboardTab === "guide" ? (
                <TeacherGuideView />
              ) : (
                <div className="teacher-table-card-v2">
                  {activeDashboardTab !== "requests" ? (
                  <>
                    <table className="teacher-table-v2">
                      <colgroup>
                        <col style={{ width: "36%" }} />
                        <col style={{ width: "11%" }} />
                        <col style={{ width: "18%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "11%" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>TIÊU ĐỀ</th>
                          <th>LOẠI</th>
                          <th>NGƯỜI TẠO</th>
                          <th>NGÀY GỬI</th>
                          <th>TRẠNG THÁI</th>
                          <th>THAO TÁC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedItems.map((item) => {
                          const creator = formatCreatorDisplay(item.createdBy);

                          const itemThumb =
                            item.type === "Podcast" && item.podcastDetails?.thumbnail
                              ? item.podcastDetails.thumbnail
                              : item.game?.tilesets && item.game.tilesets.length > 0 && item.game.tilesets[0]?.imageUrl
                              ? item.game.tilesets[0].imageUrl
                              : item.type === "Podcast"
                              ? "/textures/paper.jpg"
                              : "/images/HeroSection.png";

                          const creatorAvatarSrc = item.creatorAvatar
                            ? item.creatorAvatar
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name)}&background=8C4210&color=fff`;

                          return (
                            <tr key={item.id}>
                              <td>
                                <div className="teacher-item-cell">
                                  <img
                                    src={itemThumb}
                                    alt={item.title}
                                    className="teacher-item-thumb"
                                  />
                                  <div className="teacher-item-title-box">
                                    <span className="teacher-item-title">{item.title}</span>
                                    <span className="teacher-item-subtitle">{item.summary}</span>
                                  </div>
                                </div>
                              </td>

                              <td>
                                <span
                                  className={`teacher-badge-type ${
                                    item.type === "Podcast"
                                      ? "teacher-badge-type--podcast"
                                      : "teacher-badge-type--game"
                                  }`}
                                >
                                  {item.type === "Podcast" ? (
                                    <>
                                      <MicIcon /> PODCAST
                                    </>
                                  ) : (
                                    <>
                                      <GamepadIcon className="w-3 h-3" /> GAME
                                    </>
                                  )}
                                </span>
                              </td>

                              <td>
                                <div className="teacher-author-cell">
                                  <img
                                    src={creatorAvatarSrc}
                                    alt={creator.name}
                                    className="teacher-author-avatar"
                                  />
                                  <div className="teacher-author-info">
                                    <span className="teacher-author-name">{creator.name}</span>
                                    <span className="teacher-author-handle">
                                      {creator.email ? `@${creator.email.split("@")[0]}` : "@staff"}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td>
                                <div className="teacher-date-cell">
                                  <span>{formatDate(item.submittedAt).split(" ")[0]}</span>
                                  <span className="text-xs text-stone-500">
                                    {formatDate(item.submittedAt).split(" ")[1] || ""}
                                  </span>
                                </div>
                              </td>

                              <td>
                                <span
                                  className={`teacher-status-pill-v2 ${
                                    item.status === "Pending_Review"
                                      ? "teacher-status-pill-v2--pending"
                                      : item.status === "Published"
                                      ? "teacher-status-pill-v2--published"
                                      : "teacher-status-pill-v2--rejected"
                                  }`}
                                >
                                  {item.status === "Pending_Review" && <HourglassIcon className="w-3.5 h-3.5" />}
                                  {item.status === "Published" && <CheckCircleIcon className="w-3.5 h-3.5" />}
                                  {item.status === "Rejected" && <XCircleIcon className="w-3.5 h-3.5" />}
                                  <span>{getStatusLabel(item.status)}</span>
                                </span>
                              </td>

                              <td>
                                <div className="teacher-action-group">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedId(item.id)}
                                    title="Xem chi tiết"
                                    className="teacher-btn-icon-v2"
                                  >
                                    <EyeIcon />
                                  </button>

                                  {item.status === "Pending_Review" ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleApprove(item)}
                                        title="Duyệt xuất bản"
                                        className="teacher-btn-icon-v2 teacher-btn-icon-v2--approve"
                                      >
                                        <CheckCircleIcon className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openRejectForm(item)}
                                        title="Từ chối"
                                        className="teacher-btn-icon-v2 teacher-btn-icon-v2--reject"
                                      >
                                        <XCircleIcon className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : item.status === "Published" ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedId(item.id)}
                                      title="Thống kê"
                                      className="teacher-btn-icon-v2 text-blue-700"
                                    >
                                      <BarChartIcon />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedId(item.id)}
                                      title="Xem nhận xét"
                                      className="teacher-btn-icon-v2 text-rose-700"
                                    >
                                      <MessageIcon />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredItems.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-stone-600 font-medium">
                              Không tìm thấy game hoặc podcast nào phù hợp với bộ lọc hiện tại.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Pagination Footer */}
                    <div className="teacher-pagination-footer">
                      <div>
                        Hiển thị {filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredItems.length)} trong {filteredItems.length} nội dung
                      </div>
                      <div className="teacher-pagination-controls">
                        <button
                          type="button"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="teacher-page-btn disabled:opacity-40"
                        >
                          &lt;
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`teacher-page-btn ${currentPage === pageNum ? "teacher-page-btn--active" : ""}`}
                          >
                            {pageNum}
                          </button>
                        ))}

                        <button
                          type="button"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="teacher-page-btn disabled:opacity-40"
                        >
                          &gt;
                        </button>
                      </div>
                      <div>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="border border-amber-200 rounded px-2 py-1 bg-white text-xs text-stone-700"
                        >
                          <option value={5}>5 / trang</option>
                          <option value={10}>10 / trang</option>
                          <option value={20}>20 / trang</option>
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  /* PRO LESSON REQUESTS TAB CONTENT */
                  <div className="admin-stack">
                    <div className="admin-panel-heading teacher-list-heading">
                      <h3>Danh sách yêu cầu soạn bài từ học viên Pro</h3>
                      <span>{requests.length} yêu cầu</span>
                    </div>

                    <div className="admin-table teacher-review-table">
                      <div className="admin-table-head">
                        <span>Tiêu đề & Nội dung</span>
                        <span>Thời kỳ</span>
                        <span>Học sinh</span>
                        <span>Trạng thái</span>
                        <span>Thao tác</span>
                      </div>
                      {requests.map((req) => {
                        const assignedTeacherId = req.assignedTeacherId && (typeof req.assignedTeacherId === "object" ? req.assignedTeacherId._id : req.assignedTeacherId);
                        const isMyAssignment = assignedTeacherId === user.id;

                        return (
                          <div key={req._id} className="admin-table-row">
                            <div>
                              <strong>{req.title}</strong>
                              <small className="line-clamp-3 mt-1 block text-stone-600">{req.description}</small>
                              {req.teacherResponse && (
                                <div className="mt-2 text-rose-700 bg-rose-50 p-2 rounded border border-rose-200 text-xs">
                                  <strong>Lý do từ chối:</strong> {req.teacherResponse}
                                </div>
                              )}
                              {req.pedagogicalNotes && (
                                <div className="mt-2 text-sky-700 bg-sky-50 p-2 rounded border border-sky-200 text-xs">
                                  <strong>Nhận định sư phạm:</strong> {req.pedagogicalNotes}
                                </div>
                              )}
                              {req.needsGameCreation && (
                                <div className="mt-2 text-purple-700 bg-purple-50 p-2 rounded border border-purple-200 text-xs">
                                  <strong>Yêu cầu thiết kế Game:</strong>{" "}
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    req.gameCreationStatus === "Completed" ? "bg-emerald-100 text-emerald-800" : "bg-purple-100 text-purple-800"
                                  }`}>
                                    {req.gameCreationStatus === "Completed" ? "Đã hoàn thành" : "Đang yêu cầu Staff"}
                                  </span>
                                </div>
                              )}
                              {req.estimatedCompletionDate && (
                                <div className="mt-1.5 text-stone-600 text-xs">
                                  Dự kiến hoàn thành: <strong>{new Date(req.estimatedCompletionDate).toLocaleDateString("vi-VN")}</strong>
                                </div>
                              )}
                              {req.resultPodcastId && (
                                <div className="mt-2 text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200 text-xs">
                                  <strong>Podcast xuất bản:</strong> {typeof req.resultPodcastId === "object" ? req.resultPodcastId.title : req.resultPodcastId}
                                </div>
                              )}
                            </div>
                            <span>{req.historicalPeriod || "Chưa phân loại"}</span>
                            <span>
                              {req.requesterId && typeof req.requesterId === "object" ? (req.requesterId.name || req.requesterId.email) : "Học viên Pro"}
                            </span>
                            <span>
                              <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${
                                req.status === "Pending" ? "bg-amber-100 text-amber-800" :
                                req.status === "Accepted" ? "bg-blue-100 text-blue-800" :
                                req.status === "InProgress" ? "bg-purple-100 text-purple-800" :
                                req.status === "Completed" ? "bg-emerald-100 text-emerald-800" :
                                "bg-rose-100 text-rose-800"
                              }`}>
                                {req.status === "Pending" ? "Chờ duyệt" :
                                 req.status === "Accepted" ? "Đã nhận" :
                                 req.status === "InProgress" ? "Đang soạn" :
                                 req.status === "Completed" ? "Hoàn thành" :
                                 "Từ chối"}
                              </span>
                              {req.status !== "Pending" && (
                                <small className="block mt-1 text-[10px] text-stone-500">
                                  GV: {req.assignedTeacherId && typeof req.assignedTeacherId === "object" ? req.assignedTeacherId.name : "N/A"}
                                </small>
                              )}
                            </span>
                            <div className="admin-row-actions teacher-row-actions flex flex-col gap-1.5 justify-center">
                              {req.status === "Pending" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAcceptingRequestId(req._id);
                                      setNeedsGameCreation(false);
                                      setPedagogicalNotes("");
                                      setEstimatedCompletionDate("");
                                    }}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                                  >
                                    Nhận soạn
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingRequestId(req._id);
                                      setRejectReason("");
                                      setFeedbackError("");
                                    }}
                                    className="px-2 py-1 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700"
                                  >
                                    Từ chối
                                  </button>
                                </>
                              )}
                              {req.status === "Accepted" && isMyAssignment && (
                                <button
                                  type="button"
                                  onClick={() => handleStartRequest(req._id)}
                                  className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-semibold hover:bg-purple-700"
                                >
                                  Bắt đầu soạn
                                </button>
                              )}
                              {req.status === "InProgress" && isMyAssignment && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const pId = typeof req.resultPodcastId === "object" ? req.resultPodcastId?._id : req.resultPodcastId;
                                    const pTitle = typeof req.resultPodcastId === "object" ? req.resultPodcastId?.title : "bài soạn";
                                    triggerCompleteRequest(req._id, pId || null, pTitle || "bài soạn");
                                  }}
                                  className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                                >
                                  Hoàn thành
                                </button>
                              )}
                              {isMyAssignment && req.resultPodcastId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const podcastId = typeof req.resultPodcastId === "object" ? req.resultPodcastId?._id : req.resultPodcastId;
                                    if (podcastId) {
                                      openEditPodcastModal(podcastId);
                                    }
                                  }}
                                  className="px-2 py-1 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700"
                                >
                                  Chỉnh sửa Podcast
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {requests.length === 0 && (
                        <p className="admin-empty">
                          Không có yêu cầu bài học nào cần xử lý.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            </>
          )}
        </main>
      </div>

      {/* ALL MODALS (KEEP ORIGINAL LOGIC) */}

      {rejectingItem && (
        <RejectModal
          item={rejectingItem}
          feedback={feedback}
          feedbackError={feedbackError}
          saving={saving}
          onFeedbackChange={(value) => {
            setFeedback(value);
            setFeedbackError("");
          }}
          onClose={() => setRejectingItem(null)}
          onSubmit={handleReject}
        />
      )}

      {rejectingRequestId && (
        <div className="teacher-modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 100 }}>
          <div className="teacher-modal teacher-modal--compact" style={{ width: "450px" }}>
            <div className="teacher-modal-header" style={{ borderBottom: "1px solid #c9a15a", paddingBottom: "10px", marginBottom: "15px" }}>
              <h3>Từ chối yêu cầu bài học</h3>
              <button type="button" onClick={() => setRejectingRequestId(null)} className="teacher-close-button">✕</button>
            </div>
            <form onSubmit={handleRejectRequestSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Lý do từ chối *</span>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do từ chối để gửi cho học viên..."
                  rows={4}
                  required
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1c2a5", borderRadius: "4px", outline: "none", resize: "none" }}
                />
              </div>
              {feedbackError && <p style={{ fontSize: "11px", color: "#e11d48", margin: 0 }}>{feedbackError}</p>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setRejectingRequestId(null)}
                  style={{ padding: "6px 12px", fontSize: "12px", background: "#f5f5f4", border: "1px solid #e7e5e4", borderRadius: "4px", cursor: "pointer" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: "6px 12px", fontSize: "12px", background: "#be123c", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                >
                  {saving ? "Đang xử lý..." : "Xác nhận từ chối"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {acceptingRequestId && (
        <div className="teacher-modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 100 }}>
          <div className="teacher-modal teacher-modal--compact" style={{ width: "520px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="teacher-modal-header" style={{ borderBottom: "1px solid #c9a15a", paddingBottom: "10px", marginBottom: "15px" }}>
              <h3>Đồng ý nhận soạn & Tạo Podcast</h3>
              <button type="button" onClick={() => setAcceptingRequestId(null)} className="teacher-close-button">✕</button>
            </div>
            <form onSubmit={handleAcceptRequestSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Nhận định sư phạm của bạn</span>
                <textarea
                  value={pedagogicalNotes}
                  onChange={(e) => setPedagogicalNotes(e.target.value)}
                  placeholder="Ghi chú về nội dung, hướng tiếp cận bài học..."
                  rows={2}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1c2a5", borderRadius: "4px", outline: "none", resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Ngày dự kiến hoàn thành</span>
                <input
                  type="date"
                  value={estimatedCompletionDate}
                  onChange={(e) => setEstimatedCompletionDate(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1c2a5", borderRadius: "4px", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <input
                  type="checkbox"
                  id="needsGameCreation"
                  checked={needsGameCreation}
                  onChange={(e) => setNeedsGameCreation(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="needsGameCreation" style={{ fontSize: "12px", fontWeight: "600", color: "#78350f", cursor: "pointer" }}>
                  Yêu cầu Staff thiết kế Game (Lesson) đi kèm
                </label>
              </div>

              <hr style={{ border: "none", borderTop: "1px dashed #d1c2a5", margin: "10px 0" }} />
              <h4 style={{ margin: "0 0 5px", color: "#78350f", fontSize: "13px" }}>Thông tin chi tiết Podcast</h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Tiêu đề Podcast *</span>
                <input
                  type="text"
                  placeholder="Tiêu đề bài học/podcast..."
                  value={podcastForm.title}
                  onChange={(e) => setPodcastFormField("title", e.target.value)}
                  required
                  style={{ padding: "8px", border: "1px solid #d1c2a5", borderRadius: "4px", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Mô tả ngắn *</span>
                <textarea
                  placeholder="Tóm tắt nội dung..."
                  value={podcastForm.description}
                  onChange={(e) => setPodcastFormField("description", e.target.value)}
                  required
                  rows={2}
                  style={{ padding: "8px", border: "1px solid #d1c2a5", borderRadius: "4px", outline: "none", resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Nội dung chi tiết</span>
                <textarea
                  placeholder="Kịch bản / nội dung bài học..."
                  value={podcastForm.content}
                  onChange={(e) => setPodcastFormField("content", e.target.value)}
                  rows={3}
                  style={{ padding: "8px", border: "1px solid #d1c2a5", borderRadius: "4px", outline: "none", resize: "none" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", minWidth: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Độ khó</span>
                  <select
                    value={podcastForm.level}
                    onChange={(e) => setPodcastFormField("level", e.target.value)}
                    style={{ width: "100%", padding: "8px", border: "1px solid #d1c2a5", borderRadius: "4px", outline: "none", background: "white" }}
                  >
                    <option value="Easy">Dễ</option>
                    <option value="Medium">Trung bình</option>
                    <option value="Hard">Khó</option>
                  </select>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Thể loại/Chủ đề *</span>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      {podcastForm.category && !isAddingNewCategory && (
                        <>
                          <button
                            type="button"
                            onClick={handleRenameCategoryPrompt}
                            style={{ fontSize: "10px", color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                          >
                            Đổi tên
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteCategoryPrompt}
                            style={{ fontSize: "10px", color: "#dc2626", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
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
                        style={{ fontSize: "10px", color: "#b45309", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                      >
                        {isAddingNewCategory ? "Hủy" : "Tạo mới"}
                      </button>
                    </div>
                  </div>
                  {isAddingNewCategory ? (
                    <input
                      type="text"
                      placeholder="Tên chủ đề mới..."
                      value={newCategoryName}
                      onChange={(e) => {
                        setNewCategoryName(e.target.value);
                        setPodcastFormField("category", e.target.value);
                      }}
                      required
                      style={{ width: "100%", padding: "8px", border: "1px solid #d1c2a5", borderRadius: "4px", outline: "none" }}
                    />
                  ) : (
                    <select
                      value={podcastForm.category}
                      onChange={(e) => setPodcastFormField("category", e.target.value)}
                      required
                      style={{ width: "100%", padding: "8px", border: "1px solid #d1c2a5", borderRadius: "4px", outline: "none", background: "white" }}
                    >
                      <option value="">-- Chọn chủ đề --</option>
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>
                  Hình ảnh đại diện (Thumbnail) *
                </span>
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "12px",
                    border: "2px dashed #d1c2a5",
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: "#fffdf9",
                    textAlign: "center"
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#78350f" }}>
                    {podcastForm.thumbnailFile ? (podcastForm.thumbnailFile as File).name : "Chọn hoặc kéo thả ảnh vào đây"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPodcastFormField("thumbnailFile", e.target.files?.[0] || null)}
                    required
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>
                  Tệp âm thanh (Audio) *
                </span>
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "12px",
                    border: "2px dashed #d1c2a5",
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: "#fffdf9",
                    textAlign: "center"
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#78350f" }}>
                    {podcastForm.audioFile ? (podcastForm.audioFile as File).name : "Chọn hoặc kéo thả tệp âm thanh vào đây"}
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setPodcastFormField("audioFile", e.target.files?.[0] || null)}
                    required
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {uploadProgress !== null && (
                <div style={{ width: "100%", background: "#f3f4f6", borderRadius: "4px", height: "8px", overflow: "hidden", marginTop: "4px" }}>
                  <div style={{ width: `${uploadProgress}%`, background: "#b45309", height: "100%", transition: "width 0.2s" }} />
                </div>
              )}

              {feedbackError && <p style={{ fontSize: "11px", color: "#e11d48", margin: 0 }}>{feedbackError}</p>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setAcceptingRequestId(null)}
                  style={{ padding: "6px 12px", fontSize: "12px", background: "#f5f5f4", border: "1px solid #e7e5e4", borderRadius: "4px", cursor: "pointer" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: "6px 12px", fontSize: "12px", background: "#15803d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                >
                  {saving ? "Đang tải lên..." : "Nhận soạn & Tạo Podcast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {completingRequestId && (
        <div className="teacher-modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 100 }}>
          <div className="teacher-modal teacher-modal--compact" style={{ width: "450px" }}>
            <div className="teacher-modal-header" style={{ borderBottom: "1px solid #c9a15a", paddingBottom: "10px", marginBottom: "15px" }}>
              <h3>Hoàn thành bài soạn</h3>
              <button type="button" onClick={() => setCompletingRequestId(null)} className="teacher-close-button">✕</button>
            </div>
            <form onSubmit={handleCompleteRequestSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Chọn podcast liên kết *</span>
                <select
                  value={selectedPodcastId}
                  onChange={(e) => setSelectedPodcastId(e.target.value)}
                  required
                  style={{ width: "100%", padding: "8px", border: "1px solid #d1c2a5", borderRadius: "4px", outline: "none", background: "white" }}
                >
                  <option value="">-- Chọn podcast liên kết --</option>
                  {availablePodcasts
                    .filter((p) => p.createdBy === user?.id || p.createdBy?._id === user?.id)
                    .map((podcast) => (
                      <option key={podcast._id} value={podcast._id}>
                        [Của tôi] {podcast.title}
                      </option>
                    ))}
                  {availablePodcasts
                    .filter((p) => p.createdBy !== user?.id && p.createdBy?._id !== user?.id)
                    .map((podcast) => (
                      <option key={podcast._id} value={podcast._id}>
                        {podcast.title} ({podcast.createdBy && typeof podcast.createdBy === "object" ? podcast.createdBy.name : "Hệ thống"})
                      </option>
                    ))}
                </select>
              </div>

              {feedbackError && <p style={{ fontSize: "11px", color: "#e11d48", margin: 0 }}>{feedbackError}</p>}
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setCompletingRequestId(null)}
                  style={{ padding: "6px 12px", fontSize: "12px", background: "#f5f5f4", border: "1px solid #e7e5e4", borderRadius: "4px", cursor: "pointer" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: "6px 12px", fontSize: "12px", background: "#15803d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                >
                  {saving ? "Đang xử lý..." : "Hoàn thành & Liên kết"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPodcastId && (
        <div className="teacher-modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 100 }}>
          <div className="teacher-modal teacher-modal--compact" style={{ width: "520px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="teacher-modal-header" style={{ borderBottom: "1px solid #c9a15a", paddingBottom: "10px", marginBottom: "15px" }}>
              <h3>Chỉnh sửa Podcast</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingPodcastId(null);
                  resetPodcastForm();
                }}
                className="teacher-close-button"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditPodcastSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Tiêu đề Podcast *</span>
                <input
                  type="text"
                  value={podcastForm.title}
                  onChange={(e) => setPodcastFormField("title", e.target.value)}
                  required
                  style={{ padding: "8px", border: "1px solid #d1c2a5", borderRadius: "4px", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Mô tả ngắn *</span>
                <textarea
                  value={podcastForm.description}
                  onChange={(e) => setPodcastFormField("description", e.target.value)}
                  required
                  rows={2}
                  style={{ padding: "8px", border: "1px solid #d1c2a5", borderRadius: "4px", outline: "none", resize: "none" }}
                />
              </div>

              {feedbackError && <p style={{ fontSize: "11px", color: "#e11d48", margin: 0 }}>{feedbackError}</p>}
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPodcastId(null);
                    resetPodcastForm();
                  }}
                  style={{ padding: "6px 12px", fontSize: "12px", background: "#f5f5f4", border: "1px solid #e7e5e4", borderRadius: "4px", cursor: "pointer" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: "6px 12px", fontSize: "12px", background: "#b45309", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                >
                  {saving ? "Đang lưu..." : "Cập nhật Podcast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className={`teacher-status-pill-v2 teacher-status-pill-v2--${status === "Pending_Review" ? "pending" : status === "Published" ? "published" : "rejected"}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function PodcastPreview({
  podcastDetails,
  title,
}: {
  podcastDetails: any;
  title: string;
}) {
  return (
    <div className="teacher-preview">
      <div className="teacher-preview-header">
        <h3>Tài nguyên Podcast</h3>
        <span>File âm thanh & ảnh đại diện</span>
      </div>

      <div className="teacher-section">
        <h3>Ảnh giao diện</h3>
        <div className="teacher-podcast-thumb-wrapper" style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden", borderRadius: "8px", border: "1px solid #d1c2a5" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={podcastDetails.thumbnail}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>

      <div className="teacher-section">
        <h3>Trình phát Audio</h3>
        <audio
          src={podcastDetails.audioUrl}
          controls
          style={{ width: "100%" }}
        />
        <div className="mt-2 text-xs text-amber-800 font-medium">
          Thời lượng: {formatDuration(podcastDetails.duration)}
        </div>
      </div>

      <div className="teacher-section teacher-section--tight">
        <h3>Thông tin chi tiết</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "14px", marginTop: "4px" }}>
          <div>
            <span style={{ color: "#92400e", display: "block", fontSize: "12px", fontWeight: "600" }}>Chủ đề:</span>
            <span style={{ fontWeight: "500" }}>{podcastDetails.category}</span>
          </div>
          <div>
            <span style={{ color: "#92400e", display: "block", fontSize: "12px", fontWeight: "600" }}>Trình độ:</span>
            <span style={{ fontWeight: "500" }}>{podcastDetails.level}</span>
          </div>
        </div>
      </div>

      {podcastDetails.lessonId && (
        <div className="teacher-section teacher-section--tight">
          <h3>Game liên kết</h3>
          <p style={{ fontWeight: "600", color: "#451a03" }}>
            {typeof podcastDetails.lessonId === "object"
              ? podcastDetails.lessonId.title
              : "Đã liên kết với Game"}
          </p>
        </div>
      )}
    </div>
  );
}

function QuizPreview({
  quizDetails,
  title,
}: {
  quizDetails: any;
  title: string;
}) {
  const questions = quizDetails?.questions || [];
  return (
    <div className="teacher-preview max-w-full space-y-6">
      <div className="border-b border-amber-200 pb-3">
        <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          Ngân hàng Quiz
        </span>
        <h3 className="font-display text-lg font-bold text-amber-950 mt-1">{title}</h3>
      </div>

      <div className="space-y-4">
        {questions.map((q: any, idx: number) => (
          <div key={idx} className="bg-amber-50/40 border border-amber-200 rounded-xl p-4 space-y-2.5">
            <div className="flex gap-1.5 items-start">
              <span className="text-xs font-bold text-amber-850 bg-amber-200/50 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <p className="font-semibold text-amber-950 text-sm">{q.question}</p>
            </div>

            {q.image && (
              <img
                src={q.image}
                alt={`Minh họa câu ${idx + 1}`}
                className="max-h-40 rounded-lg border border-amber-200 object-cover"
              />
            )}
          </div>
        ))}

        {questions.length === 0 && (
          <p className="text-xs text-amber-600 italic">Quiz này chưa có câu hỏi nào.</p>
        )}
      </div>
    </div>
  );
}

function StudyUnitPreview({
  studyUnitDetails,
  lessons = [],
  podcasts = [],
  quizzes = [],
}: {
  studyUnitDetails: any;
  title: string;
  lessons?: any[];
  podcasts?: any[];
  quizzes?: any[];
}) {
  const blocks = studyUnitDetails?.contentBlocks || [];

  const getGameTitle = (id: string) => {
    const game = lessons.find((g: any) => g._id === id);
    return game ? game.title : `Trò chơi (${id})`;
  };

  const getPodcastTitle = (id: string) => {
    const pod = podcasts.find((p: any) => p._id === id);
    return pod ? pod.title : `Podcast (${id})`;
  };

  const getQuizTitle = (id: string) => {
    const q = quizzes.find((qz: any) => qz._id === id);
    return q ? q.title : `Quiz (${id})`;
  };

  return (
    <div className="teacher-preview overflow-y-auto max-h-[70vh]">
      <div className="teacher-preview-header">
        <h3>Bài viết lý thuyết</h3>
        <span>Danh sách các khối nội dung ({blocks.length} khối)</span>
      </div>

      <div className="space-y-4 mt-4" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {blocks.map((block: any, idx: number) => {
          const data = block.data || {};
          return (
            <div key={idx} style={{ padding: "12px", border: "1px solid #d1c2a5", borderRadius: "8px", background: "rgba(255,255,255,0.6)", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "between", fontWeight: "bold", color: "#78350f", borderBottom: "1px solid #e2d1b6", paddingBottom: "4px", marginBottom: "6px", textTransform: "uppercase" }}>
                <span>Khối {idx + 1}: {block.type}</span>
              </div>

              {block.type === "text" && (
                <p style={{ whiteSpace: "pre-wrap", color: "#451a03" }}>{data.text}</p>
              )}

              {block.type === "podcast" && (
                <p>Podcast liên kết: <strong>{getPodcastTitle(data.podcastId)}</strong></p>
              )}

              {block.type === "game" && (
                <p>Trò chơi 2D: <strong>{getGameTitle(data.gameId)}</strong></p>
              )}

              {block.type === "quiz" && (
                <p>Quiz trắc nghiệm: <strong>{getQuizTitle(data.quizId)}</strong></p>
              )}
            </div>
          );
        })}

        {blocks.length === 0 && (
          <p style={{ textAlign: "center", fontStyle: "italic", color: "#78716c" }}>Bài viết lý thuyết này không chứa khối nội dung nào.</p>
        )}
      </div>
    </div>
  );
}

function TeacherItemDetailFullView({
  item,
  saving,
  lessons = [],
  podcasts = [],
  quizzes = [],
  onBack,
  onApprove,
  onReject,
}: {
  item: TeacherReviewItem;
  saving: boolean;
  lessons?: any[];
  podcasts?: any[];
  quizzes?: any[];
  onBack: () => void;
  onApprove: (item: TeacherReviewItem) => void;
  onReject: (item: TeacherReviewItem) => void;
}) {
  const canReview = item.status === "Pending_Review";
  const creator = formatCreatorDisplay(item.createdBy);
  const creatorAvatarSrc = item.creatorAvatar
    ? item.creatorAvatar
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name)}&background=8C4210&color=fff`;

  return (
    <div className="teacher-full-detail-view space-y-6">
      {/* Top Header Navigation Bar */}
      <div className="teacher-detail-header-bar flex flex-wrap items-center justify-between bg-[#FFFDF8] p-4 rounded-xl border border-[#E6D8BC] shadow-xs gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-[#53270D] font-bold hover:text-[#3C1E0A] transition-colors bg-[#FDF8ED] px-3.5 py-2 rounded-lg border border-[#D8C49A] hover:bg-[#F5EBD4] cursor-pointer font-sans"
          >
            <span className="text-base font-bold">←</span>
            <span className="text-sm font-semibold">Quay lại danh sách</span>
          </button>
          <div>
            <div className="text-[11px] font-bold text-[#8C6A34] uppercase font-sans">
              Chi tiết {item.type === "Lesson" ? "Game 2D" : item.type === "Podcast" ? "Podcast Audio" : "Bài học"}
            </div>
            <h2 className="text-xl font-bold text-[#2A1407] font-sans leading-snug">{item.title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canReview ? (
            <>
              <button
                type="button"
                className="teacher-btn-reject-v2"
                onClick={() => onReject(item)}
                disabled={saving}
              >
                <XCircleIcon className="w-4 h-4" />
                <span>Từ chối</span>
              </button>
              <button
                type="button"
                className="teacher-btn-approve-v2"
                onClick={() => onApprove(item)}
                disabled={saving}
              >
                <CheckCircleIcon className="w-4 h-4" />
                <span>{saving ? "Đang xử lý..." : "Duyệt xuất bản"}</span>
              </button>
            </>
          ) : (
            <span className="teacher-status-pill-v2 teacher-status-pill-v2--published">
              {item.status === "Published" ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
              <span>{getStatusLabel(item.status)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main 2-Column Full Page Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        {/* Left Column (1/3): Metadata & Summary */}
        <div className="space-y-4">
          <div className="teacher-summary-card">
            <h4>Thông tin chung</h4>
            <div className="space-y-3 mt-3">
              <div className="flex justify-between items-center py-2 border-b border-[#E6D8BC]">
                <span className="text-xs font-bold text-[#8C6A34] uppercase font-sans">Loại nội dung</span>
                <span className="text-sm font-semibold text-[#2A1407]">
                  {item.type === "Lesson" ? "Game 2D" : item.type === "Podcast" ? "Podcast Audio" : "Lý thuyết"}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-[#E6D8BC]">
                <span className="text-xs font-bold text-[#8C6A34] uppercase font-sans">Người tạo</span>
                <div className="flex items-center gap-2">
                  <img
                    src={creatorAvatarSrc}
                    alt={creator.name}
                    className="w-7 h-7 rounded-full object-cover border border-[#D8C49A]"
                  />
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#2A1407]">{creator.name}</div>
                    {creator.email && <div className="text-[10px] text-[#8C6A34]">{creator.email}</div>}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-[#E6D8BC]">
                <span className="text-xs font-bold text-[#8C6A34] uppercase font-sans">Ngày gửi duyệt</span>
                <span className="text-xs font-semibold text-stone-700">{formatDate(item.submittedAt)}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-xs font-bold text-[#8C6A34] uppercase font-sans">Trạng thái</span>
                <StatusBadge status={item.status} />
              </div>
            </div>
          </div>

          <div className="teacher-summary-card">
            <h4>Nội dung tóm tắt</h4>
            <p className="mt-2 text-[#3C2415] text-sm leading-relaxed">{item.summary || "Chưa có tóm tắt cho nội dung này."}</p>
          </div>

          {item.reviewFeedback && (
            <div className="teacher-summary-card border-l-4 border-rose-600 bg-rose-50/60">
              <h4 className="text-rose-700">Lý do từ chối trước đó</h4>
              <p className="mt-2 text-rose-950 text-sm">{item.reviewFeedback}</p>
            </div>
          )}
        </div>

        {/* Right Column (2/3): Full Interactive Preview Screen */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#FFFDF8] p-5 rounded-xl border border-[#E6D8BC] shadow-xs">
            {item.type === "Lesson" && item.game ? (
              <LessonGamePreview game={item.game} lessonTitle={item.title} />
            ) : item.type === "Podcast" && item.podcastDetails ? (
              <PodcastPreview podcastDetails={item.podcastDetails} title={item.title} />
            ) : item.type === "StudyUnit" && item.studyUnitDetails ? (
              <StudyUnitPreview
                studyUnitDetails={item.studyUnitDetails}
                title={item.title}
                lessons={lessons}
                podcasts={podcasts}
                quizzes={quizzes}
              />
            ) : item.type === "Quiz" && item.quizDetails ? (
              <QuizPreview quizDetails={item.quizDetails} title={item.title} />
            ) : (
              <div className="text-center py-16 text-stone-500 italic">
                Không có xem trước cho mục này.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherGuideView() {
  return (
    <div className="teacher-guide-view space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-[#FFFDF8] p-6 rounded-2xl border border-[#E6D8BC] shadow-xs space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-900 font-bold text-xl border border-amber-300">
            📖
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#2A1407]">Hướng Dẫn Sử Dụng Dành Cho Giáo Viên (Teacher Guide)</h2>
            <p className="text-sm text-[#8C6A34]">
              Tài liệu hướng dẫn chi tiết quy trình duyệt bài, tiếp nhận yêu cầu từ Học viên Pro và kiểm định chất lượng nội dung trên SuViet360.
            </p>
          </div>
        </div>
      </div>

      {/* Guide Content Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Duyệt Game & Podcast */}
        <div className="bg-[#FFFDF8] p-5 rounded-2xl border border-[#E6D8BC] shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 border-b border-[#E6D8BC] pb-3">
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-base">🎮</span>
            <h3 className="text-lg font-bold text-[#2A1407]">1. Quy Trình Duyệt Game & Podcast</h3>
          </div>
          <ul className="space-y-2.5 text-sm text-[#3C2415] leading-relaxed list-disc list-inside">
            <li>
              <strong>Xem danh sách bài gửi:</strong> Vào tab <em>Duyệt Game & Podcast</em> để xem tất cả nội dung do Staff biên soạn gửi lên.
            </li>
            <li>
              <strong>Trải nghiệm thực tế:</strong> Nhấn vào biểu tượng mắt <span className="inline-block px-1.5 py-0.5 bg-amber-100 rounded text-xs">👁️</span> để chuyển sang trang chi tiết toàn màn hình. Bạn có thể chơi thử Game 2D, nghe file Podcast audio, xem thông tin người tạo và tóm tắt bài học.
            </li>
            <li>
              <strong>Duyệt xuất bản:</strong> Nhấn nút <strong>Duyệt xuất bản</strong> (Màu xanh) để cho phép hiển thị nội dung trên ứng dụng học sinh.
            </li>
            <li>
              <strong>Từ chối bài lỗi:</strong> Nhấn nút <strong>Từ chối</strong> (Màu đỏ) và nhập lý do/gợi ý sửa đổi chi tiết để Staff biên soạn lại.
            </li>
          </ul>
        </div>

        {/* Section 2: Yêu cầu bài học từ học viên Pro */}
        <div className="bg-[#FFFDF8] p-5 rounded-2xl border border-[#E6D8BC] shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 border-b border-[#E6D8BC] pb-3">
            <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-900 font-bold flex items-center justify-center text-base">📜</span>
            <h3 className="text-lg font-bold text-[#2A1407]">2. Tiếp Nhận Yêu Cầu Từ Học Viên Pro</h3>
          </div>
          <ul className="space-y-2.5 text-sm text-[#3C2415] leading-relaxed list-disc list-inside">
            <li>
              <strong>Danh sách yêu cầu:</strong> Vào tab <em>Yêu cầu bài học (Pro)</em> để xem các đề xuất chủ đề lịch sử từ học viên gói VIP/Pro.
            </li>
            <li>
              <strong>Nhận soạn bài:</strong> Nhấn nút <strong>Nhận soạn</strong>, nhập nhận định sư phạm, dự kiến ngày hoàn thành và tích chọn nếu muốn chuyển Staff thiết kế Game 2D đi kèm.
            </li>
            <li>
              <strong>Bắt đầu & Hoàn thành:</strong> Chuyển trạng thái sang <em>Bắt đầu soạn</em>, sau đó liên kết bài Podcast/Quiz đã soạn để hoàn thành yêu cầu cho học sinh.
            </li>
          </ul>
        </div>

        {/* Section 3: Kiểm tra nội dung & Tiêu chuẩn sư phạm */}
        <div className="bg-[#FFFDF8] p-5 rounded-2xl border border-[#E6D8BC] shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 border-b border-[#E6D8BC] pb-3">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center text-base">🔍</span>
            <h3 className="text-lg font-bold text-[#2A1407]">3. Kiểm Tra Nội Dung & Tiêu Chuẩn</h3>
          </div>
          <ul className="space-y-2.5 text-sm text-[#3C2415] leading-relaxed list-disc list-inside">
            <li>
              <strong>Độ chính xác lịch sử:</strong> Đảm bảo mốc thời gian, nhân vật, sự kiện và tư liệu lịch sử đúng với chương trình giáo dục phổ thông & tài liệu chính thống.
            </li>
            <li>
              <strong>Tính sư phạm & thẩm mỹ:</strong> Hình ảnh minh họa phù hợp, âm thanh Podcast rõ ràng, không chứa thông tin sai lệch hay vi phạm thuần phong mỹ tục.
            </li>
            <li>
              <strong>Lọc nhanh nội dung:</strong> Sử dụng tab <em>Kiểm tra nội dung</em> để lọc trực tiếp các mục đang ở trạng thái <strong>Chờ duyệt</strong>.
            </li>
          </ul>
        </div>

        {/* Section 4: Lịch sử phản hồi & Quản lý tài khoản */}
        <div className="bg-[#FFFDF8] p-5 rounded-2xl border border-[#E6D8BC] shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 border-b border-[#E6D8BC] pb-3">
            <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-900 font-bold flex items-center justify-center text-base">💬</span>
            <h3 className="text-lg font-bold text-[#2A1407]">4. Phản Hồi & Đăng Xuất</h3>
          </div>
          <ul className="space-y-2.5 text-sm text-[#3C2415] leading-relaxed list-disc list-inside">
            <li>
              <strong>Xem nhận xét:</strong> Nhấp vào tab <em>Duyệt hoặc Từ chối kèm nhận xét</em> để xem lịch sử ghi chú nhận xét đã gửi cho Staff.
            </li>
            <li>
              <strong>Bảo mật tài khoản:</strong> Luôn nhấn nút <strong>Đăng xuất</strong> ở cuối menu bên trái sau khi hoàn thành công việc để bảo vệ tài khoản Giáo viên.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="teacher-info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LessonGamePreview({
  game,
  lessonTitle,
}: {
  game: LessonGame;
  lessonTitle: string;
}) {
  const [isZoomed, setIsZoomed] = useState(false);
  const animationEntries = Object.entries(game.character.animations || {});

  return (
    <div className="teacher-preview">
      <div className="teacher-preview-header">
        <h3>Game trong lesson</h3>
        <span>Tilemap + assets</span>
      </div>

      <div className="teacher-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h3 style={{ margin: 0 }}>Màn hình chơi thử</h3>
          <button
            type="button"
            onClick={() => setIsZoomed(true)}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              fontFamily: "Cinzel, serif",
              background: "rgba(244, 231, 201, 0.6)",
              border: "1px solid #c9a15a",
              borderRadius: "4px",
              cursor: "pointer",
              color: "#5c3300",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <span>Phóng to ⛶</span>
          </button>
        </div>
        <div className="teacher-game-wrapper" style={{ width: "100%", aspectRatio: "4/3", position: "relative", borderRadius: "8px", overflow: "hidden", border: "1px solid #d1c2a5", backgroundColor: "#000" }}>
          {!isZoomed ? (
            <PhaserGame lessonGame={game} />
          ) : (
            <div style={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center", color: "#bba476", fontWeight: "600", fontSize: "11px", fontFamily: "Cinzel, serif" }}>
              Đang chơi ở chế độ phóng to...
            </div>
          )}
        </div>
      </div>

      {isZoomed && (
        <div className="teacher-modal-backdrop" style={{ zIndex: 1000 }}>
          <div className="teacher-modal" style={{ width: "min(900px, 95vw)", maxHeight: "95vh", display: "flex", flexDirection: "column", padding: "20px" }}>
            <div className="teacher-modal-header" style={{ borderBottom: "1px solid #c9a15a", paddingBottom: "10px", marginBottom: "15px" }}>
              <div>
                <p className="admin-kicker">Chế độ phóng to</p>
                <h2 style={{ fontSize: "20px", color: "#5c3300", fontFamily: "Cinzel, serif", margin: 0 }}>{lessonTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="teacher-close-button"
                style={{ padding: "6px 12px" }}
              >
                Thu nhỏ ⛶
              </button>
            </div>
            
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#000", borderRadius: "8px", overflow: "hidden", aspectRatio: "4/3", border: "2px solid #8B6914", padding: "10px" }}>
              <PhaserGame lessonGame={game} />
            </div>
          </div>
        </div>
      )}

      <div className="teacher-section teacher-section--tight">
        <h3>Spawn point</h3>
        <p>
          X: {game.spawnPoint.x}, Y: {game.spawnPoint.y}
        </p>
      </div>

      <div className="teacher-section teacher-section--tight">
        <h3>Tilesets</h3>
        {game.tilesets.length > 0 ? (
          <div className="teacher-asset-grid">
            {game.tilesets.map((tileset) => (
              <div key={tileset.name} className="teacher-asset-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tileset.imageUrl} alt={`${lessonTitle} ${tileset.name}`} />
                <span>{tileset.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-note">Lesson chưa có tileset.</p>
        )}
      </div>

      <div className="teacher-section teacher-section--tight">
        <h3>Animations</h3>
        {animationEntries.length > 0 ? (
          <div className="teacher-animation-list">
            {animationEntries.map(([name, frames]) => (
              <div key={name}>
                <strong>{name}</strong>
                <div className="teacher-asset-grid">
                  {frames.slice(0, 6).map((frame) => (
                    <div key={frame.key} className="teacher-asset-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={frame.imageUrl} alt={frame.key} />
                      <span>{frame.key}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-note">Lesson chưa có animation nhân vật.</p>
        )}
      </div>
    </div>
  );
}

function RejectModal({
  item,
  feedback,
  feedbackError,
  saving,
  onFeedbackChange,
  onClose,
  onSubmit,
}: {
  item: TeacherReviewItem;
  feedback: string;
  feedbackError: string;
  saving: boolean;
  onFeedbackChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="teacher-modal-backdrop" role="dialog" aria-modal="true">
      <form className="teacher-modal teacher-reject-modal" onSubmit={onSubmit}>
        <div className="teacher-modal-header">
          <div>
            <p className="admin-kicker">Từ chối {item.type === "Lesson" ? "game" : item.type === "Podcast" ? "podcast" : "bài học"}</p>
            <h2>{item.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="teacher-close-button">
            Đóng
          </button>
        </div>

        <label className="teacher-feedback-field">
          <span>Lý do từ chối *</span>
          <textarea
            value={feedback}
            onChange={(event) => onFeedbackChange(event.target.value)}
            rows={5}
            placeholder={`Nhập nhận xét cụ thể để Staff chỉnh sửa ${item.type === "Lesson" ? "game" : item.type === "Podcast" ? "podcast" : "bài học"}...`}
          />
        </label>
        {feedbackError && <p className="teacher-field-error">{feedbackError}</p>}

        <div className="teacher-suggestion-list">
          {rejectionSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() =>
                onFeedbackChange(
                  feedback.trim()
                    ? `${feedback.trim()}; ${suggestion}`
                    : suggestion
                )
              }
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="teacher-modal-actions">
          <button type="submit" className="teacher-reject-button" disabled={saving}>
            {saving ? "Đang gửi..." : "Gửi feedback từ chối"}
          </button>
          <button type="button" className="teacher-secondary-button" onClick={onClose}>
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
}
