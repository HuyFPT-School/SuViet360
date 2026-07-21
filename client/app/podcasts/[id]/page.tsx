"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import dynamic from "next/dynamic";
import { notificationApi } from "@/lib/notificationApi";

const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => <p className="text-center py-6 text-amber-700 font-semibold">Đang tải game...</p>,
});

// --- Icons ---
const HomeIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const ClockIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const BookOpenIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
const CalendarIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
const PlayIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const PauseIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
const VolumeIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>;
const SettingsIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const EditIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const DownloadIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
const ShareIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>;
const SmallPlayIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const MoreVerticalIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>;
const ChevronDownIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;

// Format time
const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const translateLevel = (level: string) => {
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
const MOCK_PODCAST = {
  _id: "mock-bai-1",
  title: "Bài 1: Liên hợp quốc",
  description: "Podcast tái hiện lại sự hình thành, vai trò và những đóng góp quan trọng của Liên hợp quốc đối với nền hòa bình thế giới từ năm 1945 đến nay.",
  content: "Liên hợp quốc là tổ chức quốc tế lớn nhất thế giới, được thành lập với mục tiêu duy trì hòa bình và an ninh quốc tế, phát triển mối quan hệ hữu nghị giữa các quốc gia và thúc đẩy tiến bộ xã hội, nâng cao mức sống và quyền con người.",
  category: "Chủ đề 1. THẾ GIỚI TRONG VÀ SAU CHIẾN TRANH LẠNH",
  level: "Trung cấp",
  createdAt: new Date().toISOString(),
  viewCount: 1250,
  thumbnail: "/images/HeroSection.png", // Generic fallback image
  audioUrl: "/audios/Bai_01.m4a",
  duration: 1125 // 18:45
};



const MOCK_NOTES: any[] = [];

const MOCK_COMMENTS: any[] = [];

export default function PodcastDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user && id) {
      router.push(`/login?redirect=${encodeURIComponent(`/podcasts/${id}`)}`);
    }
  }, [user, authLoading, id, router]);
  const [podcast, setPodcast] = useState<Record<string, any> | null>(null);
  const [notes, setNotes] = useState<Record<string, any>[]>([]);
  const [comments, setComments] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowingCategory, setIsFollowingCategory] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    total: number;
    passed: boolean;
    xpGained: number;
    details?: {
      title: string;
      question: string;
      isCorrect: boolean;
      selectedAnswer: string;
      correctAnswer: string;
    }[];
  } | null>(null);

  const handleQuizComplete = async (
    score: number,
    total: number,
    details?: {
      title: string;
      question: string;
      isCorrect: boolean;
      selectedAnswer: string;
      correctAnswer: string;
    }[]
  ) => {
    const linkedLessonId = typeof podcast?.lessonId === "object" ? podcast.lessonId._id : podcast?.lessonId;
    if (!linkedLessonId) return;
    setSubmitting(true);
    try {
      // Fetch CSRF token
      const csrfRes = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
      const csrfToken = csrfRes.data.data.csrfToken;

      // 1. Submit quiz score
      const quizRes = await api.post<{ success: boolean; data: { xpGained: number; passed: boolean } }>(
        `/progress/quiz/${linkedLessonId}/submit`,
        { score, total },
        { headers: { "x-csrf-token": csrfToken } }
      );

      // 2. Mark lesson as completed
      const lessonRes = await api.post<{ success: boolean; data: { xpGained: number } }>(
        `/progress/lesson/${linkedLessonId}/complete`,
        {},
        { headers: { "x-csrf-token": csrfToken } }
      );

      const totalXPGained = quizRes.data.data.xpGained + (lessonRes.data.data.xpGained || 0);

      setQuizResult({
        score,
        total,
        passed: quizRes.data.data.passed,
        xpGained: totalXPGained,
        details,
      });
      setShowResultModal(true);
    } catch (err: any) {
      console.error(err);
      alert("Lỗi lưu tiến độ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (user && podcast?.category) {
        try {
          const followed = await notificationApi.getFollowedCategories();
          setIsFollowingCategory(followed.map((c: string) => c.trim()).includes(podcast.category.trim()));
        } catch (err) {
          console.error("Error fetching followed categories:", err);
        }
      }
    };
    checkFollowStatus();
  }, [user, podcast?.category]);

  const handleToggleFollowCategory = async () => {
    if (!user) {
      alert("Vui lòng đăng nhập để theo dõi chủ đề này!");
      return;
    }
    if (!podcast?.category) return;

    setFollowingLoading(true);
    try {
      if (isFollowingCategory) {
        await notificationApi.unfollowCategory(podcast.category);
        setIsFollowingCategory(false);
      } else {
        await notificationApi.followCategory(podcast.category);
        setIsFollowingCategory(true);
      }
    } catch (err) {
      console.error("Error toggling follow category:", err);
      alert("Có lỗi xảy ra khi thực hiện thao tác. Vui lòng thử lại!");
    } finally {
      setFollowingLoading(false);
    }
  };

  // Edit & Delete menu states
  const [activeNoteMenuId, setActiveNoteMenuId] = useState<string | null>(null);
  const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const handlePlaybackRateChange = (rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
    setShowSpeedMenu(false);
  };

  // Tabs
  const [activeTab, setActiveTab] = useState("noidung");
  
  // Forms
  const [commentText, setCommentText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteTimestamp, setNoteTimestamp] = useState(0);

  // Completion states
  const [isCompleted, setIsCompleted] = useState(false);
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [showCompletionToast, setShowCompletionToast] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (id === "mock-bai-1") {
          setPodcast(MOCK_PODCAST);
          setDuration(MOCK_PODCAST.duration);
          setLoading(false);
          return;
        }


        const [podRes, notesRes, commentsRes] = await Promise.all([
          api.get(`/podcasts/${id}`),
          api.get(`/podcast-notes/${id}`).catch(() => ({ data: { data: [] } })),
          api.get(`/podcast-comments/${id}`).catch(() => ({ data: { data: [] } }))
        ]);
        
        setPodcast(podRes.data.data);
        setNotes(notesRes.data.data || []);
        setComments(commentsRes.data.data || []);
        setDuration(podRes.data.data.duration || 0);

        if (user) {
          try {
            const progRes = await api.get("/progress/dashboard");
            const completedPodcasts = progRes.data.data.completedPodcasts || [];
            setIsCompleted(completedPodcasts.includes(id));
          } catch (progErr) {
            console.error("Error fetching progress dashboard:", progErr);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching podcast details:", err);
        setPodcast(MOCK_PODCAST);
        setDuration(MOCK_PODCAST.duration);
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("playGame") === "true" || params.get("tab") === "game") {
        setActiveTab("game");
      }
    }
  }, [id]);

  // Scroll to top and reset collapse state when podcast ID changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
    setIsContentExpanded(false);
  }, [id]);

  // Audio Controls
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioEnded = async () => {
    setIsPlaying(false);
    if (!user) return;
    try {
      const csrfRes = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
      const csrfToken = csrfRes.data.data.csrfToken;
      const res = await api.post<{ success: boolean; data?: { xpGained: number } }>(
        `/progress/podcast/${id}/complete`,
        {},
        { headers: { "x-csrf-token": csrfToken } }
      );
      if (res.data.success) {
        setIsCompleted(true);
        if (res.data.data && res.data.data.xpGained > 0) {
          setXpGained(res.data.data.xpGained);
          setShowCompletionToast(true);
          setTimeout(() => {
            setShowCompletionToast(false);
          }, 5000);
        }
      }
    } catch (err) {
      console.error("Error completing podcast:", err);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolume(vol);
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const downloadAudio = async () => {
    if (!podcast?.audioUrl) return;
    try {
      const response = await fetch(podcast.audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const extension = podcast.audioUrl.split(".").pop() || "mp3";
      link.setAttribute("download", `${podcast.title}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(podcast.audioUrl, "_blank");
    }
  };

  // Submissions
  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      if (id !== "mock-bai-1") {
        const csrfRes = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
        const csrfToken = csrfRes.data.data.csrfToken;
        const res = await api.post(
          "/podcast-comments",
          { podcastId: id, content: commentText },
          { headers: { "x-csrf-token": csrfToken } }
        );
        setComments([res.data.data, ...comments]);
      } else {
        setComments([{ _id: Date.now().toString(), content: commentText, createdAt: new Date().toISOString(), userId: { name: "Bạn" } }, ...comments]);
      }
      setCommentText("");
    } catch (err) {
      console.error(err);
      alert("Cần đăng nhập để bình luận");
    }
  };

  const startAddingNote = () => {
    setNoteTimestamp(currentTime);
    setIsAddingNote(true);
  };

  const submitNote = async () => {
    if (!noteText.trim()) {
      setIsAddingNote(false);
      return;
    }
    try {
      if (id !== "mock-bai-1") {
        const csrfRes = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
        const csrfToken = csrfRes.data.data.csrfToken;
        const res = await api.post(
          "/podcast-notes",
          { podcastId: id, content: noteText, timestamp: noteTimestamp },
          { headers: { "x-csrf-token": csrfToken } }
        );
        setNotes([...notes, res.data.data].sort((a,b) => a.timestamp - b.timestamp));
      } else {
        setNotes([...notes, { _id: Date.now().toString(), content: noteText, timestamp: noteTimestamp }].sort((a,b) => a.timestamp - b.timestamp));
      }
      setNoteText("");
      setIsAddingNote(false);
    } catch (err) {
      console.error(err);
      alert("Cần đăng nhập để thêm ghi chú");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (id === "mock-bai-1") {
      setNotes(notes.filter(n => n._id !== noteId));
      return;
    }
    const confirmed = window.confirm("Bạn có chắc chắn muốn xóa ghi chú này?");
    if (!confirmed) return;
    try {
      const csrfRes = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
      const csrfToken = csrfRes.data.data.csrfToken;
      await api.delete(`/podcast-notes/${noteId}`, { headers: { "x-csrf-token": csrfToken } });
      setNotes(notes.filter(n => n._id !== noteId));
    } catch (err) {
      console.error(err);
      alert("Không thể xóa ghi chú");
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingNoteText.trim()) return;
    if (id === "mock-bai-1") {
      setNotes(notes.map(n => n._id === noteId ? { ...n, content: editingNoteText } : n));
      setEditingNoteId(null);
      return;
    }
    try {
      const csrfRes = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
      const csrfToken = csrfRes.data.data.csrfToken;
      const res = await api.put(
        `/podcast-notes/${noteId}`,
        { content: editingNoteText },
        { headers: { "x-csrf-token": csrfToken } }
      );
      setNotes(notes.map(n => n._id === noteId ? { ...n, content: res.data.data.content } : n));
      setEditingNoteId(null);
    } catch (err) {
      console.error(err);
      alert("Không thể cập nhật ghi chú");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (id === "mock-bai-1") {
      setComments(comments.filter(c => c._id !== commentId));
      return;
    }
    const confirmed = window.confirm("Bạn có chắc chắn muốn xóa bình luận này?");
    if (!confirmed) return;
    try {
      const csrfRes = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
      const csrfToken = csrfRes.data.data.csrfToken;
      await api.delete(`/podcast-comments/${commentId}`, { headers: { "x-csrf-token": csrfToken } });
      setComments(comments.filter(c => c._id !== commentId));
    } catch (err) {
      console.error(err);
      alert("Không thể xóa bình luận");
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    if (id === "mock-bai-1") {
      setComments(comments.map(c => c._id === commentId ? { ...c, content: editingCommentText } : c));
      setEditingCommentId(null);
      return;
    }
    try {
      const csrfRes = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
      const csrfToken = csrfRes.data.data.csrfToken;
      const res = await api.put(
        `/podcast-comments/${commentId}`,
        { content: editingCommentText },
        { headers: { "x-csrf-token": csrfToken } }
      );
      setComments(comments.map(c => c._id === commentId ? { ...c, content: res.data.data.content } : c));
      setEditingCommentId(null);
    } catch (err) {
      console.error(err);
      alert("Không thể cập nhật bình luận");
    }
  };

  if (loading) return <div className="min-h-screen bg-transparent flex items-center justify-center text-[#8c6a34]">Đang tải...</div>;
  if (!podcast) return <div className="min-h-screen bg-transparent flex items-center justify-center text-[#8c6a34]">Không tìm thấy nội dung.</div>;

  return (
    <div className="min-h-screen pb-16 bg-transparent relative">
      
      {/* Audio Element */}
      <audio 
        ref={audioRef}
        src={podcast.audioUrl || "/audios/Bai_01.m4a"}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      <div className="max-w-[1200px] mx-auto px-6 py-6">
        
        {/* Breadcrumb */}
        <div className="text-xs font-medium text-[#8c6a34] mb-6 flex items-center gap-2">
           <Link href="/" className="hover:text-[#a84d28] transition-colors"><HomeIcon /></Link>
           <span>/</span>
           <Link href="/podcasts" className="hover:underline">Mục lục</Link>
           <span>/</span>
           <span className="text-[#a84d28]">{podcast.title}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT COLUMN */}
          <div className="flex-[2] flex flex-col gap-6">
            
            {/* Player Card */}
            <div className="bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl p-6 shadow-sm">
              <h2 className="text-[#a84d28] font-bold tracking-widest text-xs mb-2 uppercase">PODCAST LỊCH SỬ</h2>
              
              <div className="flex gap-6 mb-6">
                 <div className="flex-1">
                     <h1 className="text-3xl font-bold text-[#3a2312] font-display mb-4 leading-tight flex items-center gap-3">
                        {podcast.title}
                        {isCompleted && (
                           <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-emerald-200">
                              <svg className="w-3 h-3 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                 <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Đã hoàn thành
                           </span>
                        )}
                     </h1>
                    <p className="text-[#5c4a3d] text-sm leading-relaxed mb-6">{podcast.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-6 text-xs text-[#8c6a34] font-medium">
                       <span className="flex items-center gap-2"><ClockIcon /> Thời lượng: {formatTime(duration)}</span>
                       <span className="flex items-center gap-2"><BookOpenIcon /> Cấp độ: {translateLevel(podcast.level)}</span>
                       <span className="flex items-center gap-2"><CalendarIcon /> Ngày đăng: {formatDate(podcast.createdAt)}</span>
                    </div>
                 </div>
                 
                 <div className="w-[280px] h-[160px] rounded-lg overflow-hidden border-2 border-[#e8d5b5] flex-shrink-0 shadow-inner">
                    <img src={podcast.thumbnail || "/images/HeroSection.png"} alt="Thumbnail" className="w-full h-full object-cover" />
                 </div>
              </div>

              {/* Controls Wrapper */}
              <div className="bg-[#f5e9d3] rounded-xl p-4 border border-[#e8d5b5] shadow-inner mb-4">
                 <div className="flex items-center gap-4">
                    <button 
                      onClick={togglePlay}
                      className="w-12 h-12 rounded-full bg-[#3a2312] text-[#f0ddb7] flex items-center justify-center hover:bg-[#a84d28] hover:scale-105 transition-all shadow-md flex-shrink-0"
                    >
                       {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    
                    <span className="text-xs font-medium text-[#5c4a3d] w-10">{formatTime(currentTime)}</span>
                    
                    {/* Progress Bar Container */}
                    <div className="relative flex-1 flex items-center h-8">
                       {/* Background Track */}
                       <div className="absolute w-full h-[3px] bg-[#d8c39d] rounded-full"></div>
                       {/* Fill Track */}
                       <div className="absolute h-[3px] bg-[#a84d28] rounded-full" style={{ width: `${(currentTime/duration)*100 || 0}%` }}></div>
                       
                       {/* Note Markers */}
                       {notes.map(note => {
                          const left = `${(note.timestamp / duration) * 100}%`;
                          return (
                             <div 
                               key={note._id} 
                               className="absolute w-2.5 h-2.5 bg-[#eac988] border-[1.5px] border-[#a84d28] rounded-full top-1/2 -translate-y-1/2 cursor-pointer hover:scale-150 transition-transform z-10"
                               style={{ left }}
                               title={note.content}
                               onClick={() => seekTo(note.timestamp)}
                             ></div>
                          );
                       })}
                       
                       {/* Range Input */}
                       <input 
                         type="range" 
                         min="0" max={duration || 100} 
                         value={currentTime} 
                         onChange={handleSeek}
                         className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                       />
                    </div>
                    
                    <span className="text-xs font-medium text-[#5c4a3d] w-10 text-right">{formatTime(duration)}</span>
                    
                    <div className="w-px h-6 bg-[#d8c39d] mx-2"></div>
                    
                    <div className="flex items-center gap-2 text-[#5c4a3d]">
                       <VolumeIcon />
                       <input 
                         type="range" min="0" max="1" step="0.05"
                         value={volume} onChange={handleVolume}
                         className="w-16 h-[3px] appearance-none rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0"
                         style={{ background: `linear-gradient(to right, #a84d28 0%, #a84d28 ${volume * 100}%, #d8c39d ${volume * 100}%, #d8c39d 100%)` }}
                       />
                    </div>
                    
                    <div className="relative flex items-center">
                      <button 
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="text-[#5c4a3d] hover:text-[#a84d28] ml-2 flex items-center justify-center p-1 rounded hover:bg-[#ebd8b7] transition-all"
                        title="Tốc độ phát"
                      >
                        <SettingsIcon />
                      </button>
                      {showSpeedMenu && (
                        <div className="absolute bottom-full right-0 mb-2 bg-[#fcf8ef] border border-[#e8d5b5] rounded-lg shadow-lg py-1.5 z-30 min-w-[130px] text-xs font-semibold">
                          <p className="px-3 py-1 font-bold text-[#8c6a34] border-b border-[#e8d5b5] mb-1">Tốc độ phát</p>
                          {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => handlePlaybackRateChange(rate)}
                              className={`w-full text-left px-3 py-1.5 hover:bg-[#f3e9d8] transition-colors flex justify-between items-center ${playbackRate === rate ? 'text-[#a84d28]' : 'text-[#5c4a3d]'}`}
                            >
                              <span>{rate === 1 ? 'Bình thường' : `${rate}x`}</span>
                              {playbackRate === rate && <span className="w-1.5 h-1.5 rounded-full bg-[#a84d28]"></span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                 </div>
              </div>

              {/* Action Buttons */}
              <div className="flex border border-[#e8d5b5] rounded-lg overflow-hidden bg-white">
                 <button onClick={startAddingNote} className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-[#5c4a3d] hover:bg-[#f3e9d8] transition-colors border-r border-[#e8d5b5]">
                    <EditIcon /> Thêm ghi chú tại {formatTime(currentTime)}
                 </button>
                 <button onClick={downloadAudio} className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-[#5c4a3d] hover:bg-[#f3e9d8] transition-colors">
                    <DownloadIcon /> Tải âm thanh (Download)
                 </button>
              </div>

            </div>

            {/* Content Tabs */}
            <div className="bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl overflow-hidden shadow-sm">
               <div className="flex border-b border-[#e8d5b5] px-6">
                  <button 
                     onClick={() => setActiveTab("noidung")}
                     className={`py-4 font-bold text-sm tracking-wider uppercase border-b-2 transition-colors mr-8 ${activeTab === 'noidung' ? 'border-[#a84d28] text-[#a84d28]' : 'border-transparent text-[#8c6a34] hover:text-[#5c4a3d]'}`}
                  >NỘI DUNG</button>
                  <button 
                     onClick={() => setActiveTab("tailieu")}
                     className={`py-4 font-bold text-sm tracking-wider uppercase border-b-2 transition-colors ${activeTab === 'tailieu' ? 'border-[#a84d28] text-[#a84d28]' : 'border-transparent text-[#8c6a34] hover:text-[#5c4a3d]'}`}
                  >TÀI LIỆU LIÊN QUAN</button>
                  {podcast?.lessonId && (
                     <button 
                        onClick={() => setActiveTab("game")}
                        className={`py-4 font-bold text-sm tracking-wider uppercase border-b-2 transition-colors ml-8 ${activeTab === 'game' ? 'border-[#a84d28] text-[#a84d28]' : 'border-transparent text-[#8c6a34] hover:text-[#5c4a3d]'}`}
                     >TRÒ CHƠI</button>
                  )}
               </div>
               
               <div className="p-6 text-sm text-[#5c4a3d] leading-relaxed bg-[#fdfbf7]">
                   {activeTab === "noidung" && (() => {
                      const rawContent = podcast?.content || podcast?.description || "";
                      const needsTruncation = rawContent.length > 800;
                      const displayContent = (!isContentExpanded && needsTruncation)
                        ? rawContent.slice(0, 800) + "..."
                        : rawContent;
                      
                      return (
                        <div className="space-y-4">
                          <div dangerouslySetInnerHTML={{ __html: displayContent.replace(/\n/g, '<br/>') }} />
                          {needsTruncation && (
                            <button
                              type="button"
                              onClick={() => setIsContentExpanded(!isContentExpanded)}
                              className="text-xs font-bold text-[#a84d28] hover:text-[#8a3c1e] flex items-center gap-1 mt-2 focus:outline-none transition-colors"
                            >
                              {isContentExpanded ? (
                                <>
                                  <span>Thu gọn</span>
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                  </svg>
                                </>
                              ) : (
                                <>
                                  <span>Xem thêm</span>
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                   })()}
                  {activeTab === "tailieu" && (
                     <p>Chưa có tài liệu liên quan cho bài học này.</p>
                  )}
                  {activeTab === "game" && podcast?.lessonId && (
                     <div className="space-y-4 relative">
                        {submitting && (
                           <div className="absolute inset-0 bg-[#fbf7ee]/60 backdrop-blur-xs flex items-center justify-center z-40">
                              <p className="text-amber-800 font-semibold animate-pulse">Đang nạp kết quả và lưu tiến độ của bạn...</p>
                           </div>
                        )}
                        <p className="text-sm text-[#8c6a34] font-medium">
                           Trò chơi 2D tương tác đi kèm bài học. Sử dụng các phím mũi tên di chuyển nhân vật để vượt qua thử thách.
                        </p>
                        <div className="border border-[#e8d5b5] rounded-xl overflow-hidden bg-white shadow-inner p-4 flex flex-col items-center justify-center min-h-[450px]">
                           {typeof podcast.lessonId === "object" && (podcast.lessonId as any).game ? (
                              <PhaserGame 
                                 lessonGame={(podcast.lessonId as any).game} 
                                 onQuizComplete={handleQuizComplete}
                              />
                           ) : (
                              <p className="text-amber-800">Không tìm thấy dữ liệu game cho bài học này.</p>
                           )}
                        </div>
                     </div>
                  )}
               </div>
            </div>



          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Notes Section */}
            <div className="bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl p-5 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#3a2312] font-bold text-[15px] tracking-wider font-display uppercase">Ghi chú của bạn</h3>
                  <button onClick={() => setIsAddingNote(true)} className="bg-[#3a2312] hover:bg-[#a84d28] text-[#f0ddb7] text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm">
                     + Thêm ghi chú mới
                  </button>
               </div>
               
               {isAddingNote && (
                  <div className="mb-4 bg-white p-3 rounded-lg border border-[#c9a15a] shadow-inner">
                     <p className="text-xs text-[#8c6a34] mb-2 font-medium">Ghi chú tại: {formatTime(noteTimestamp)}</p>
                     <textarea 
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="Nhập nội dung..."
                        className="w-full text-sm outline-none resize-none bg-transparent mb-2 text-[#3a2312]"
                        rows={2}
                        autoFocus
                     />
                     <div className="flex justify-end gap-2">
                        <button onClick={() => setIsAddingNote(false)} className="text-xs text-[#8c6a34] px-2 py-1">Hủy</button>
                        <button onClick={submitNote} className="bg-[#c9a15a] text-white text-xs px-3 py-1 rounded">Lưu</button>
                     </div>
                  </div>
               )}

               <div className="flex flex-col gap-3">
                  {notes.length === 0 && !isAddingNote ? (
                     <p className="text-sm text-[#8c6a34] text-center py-4">Chưa có ghi chú nào.</p>
                  ) : notes.map((note) => (
                     <div key={note._id} className="bg-white border border-[#e8d5b5] rounded-lg p-3 group hover:border-[#c9a15a] transition-colors">
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-xs font-bold text-[#a84d28] bg-[#f5e9d3] px-2 py-0.5 rounded">{formatTime(note.timestamp)}</span>
                           <div className="flex gap-1 text-[#8c6a34]">
                              <button onClick={() => seekTo(note.timestamp)} className="w-6 h-6 flex items-center justify-center hover:bg-[#f3e9d8] rounded-full transition-colors" title="Phát từ đây">
                                 <SmallPlayIcon />
                              </button>
                              <div className="relative">
                                 <button 
                                    onClick={() => setActiveNoteMenuId(activeNoteMenuId === note._id ? null : note._id)}
                                    className="w-6 h-6 flex items-center justify-center hover:bg-[#f3e9d8] rounded-full transition-colors"
                                 >
                                    <MoreVerticalIcon />
                                 </button>
                                 {activeNoteMenuId === note._id && (
                                    <div className="absolute right-0 mt-1 bg-white border border-[#e8d5b5] rounded-md shadow-lg py-1 z-30 w-20 text-left">
                                       <button 
                                          onClick={() => {
                                             setEditingNoteId(note._id);
                                             setEditingNoteText(note.content);
                                             setActiveNoteMenuId(null);
                                          }}
                                          className="w-full px-3 py-1.5 text-xs text-[#5c4a3d] hover:bg-[#f3e9d8] flex items-center gap-1.5"
                                       >
                                          Sửa
                                       </button>
                                       <button 
                                          onClick={() => {
                                             handleDeleteNote(note._id);
                                             setActiveNoteMenuId(null);
                                          }}
                                          className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-[#f3e9d8] flex items-center gap-1.5 font-medium"
                                       >
                                          Xóa
                                       </button>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                        {editingNoteId === note._id ? (
                           <div className="mt-2 bg-[#fcf8ef] p-2 rounded border border-[#c9a15a] shadow-inner">
                              <textarea 
                                 value={editingNoteText}
                                 onChange={e => setEditingNoteText(e.target.value)}
                                 className="w-full text-sm outline-none resize-none bg-transparent mb-2 text-[#3a2312] border-b border-[#e8d5b5]/50 pb-1"
                                 rows={2}
                                 autoFocus
                              />
                              <div className="flex justify-end gap-2">
                                 <button onClick={() => setEditingNoteId(null)} className="text-xs text-[#8c6a34] px-2 py-1">Hủy</button>
                                 <button onClick={() => handleUpdateNote(note._id)} className="bg-[#c9a15a] text-white text-xs px-3 py-1 rounded">Lưu</button>
                              </div>
                           </div>
                        ) : (
                           <p className="text-sm text-[#5c4a3d] cursor-pointer" onClick={() => seekTo(note.timestamp)}>
                              {note.content}
                           </p>
                        )}
                     </div>
                  ))}
               </div>
               
               {notes.length > 0 && (
                  <button className="w-full mt-4 py-2 bg-[#f5e9d3] text-[#8c6a34] text-xs font-bold uppercase rounded-lg hover:bg-[#e8d5b5] transition-colors">
                     Xem tất cả ghi chú
                  </button>
               )}
            </div>

            {/* Info Section */}
            <div className="bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl p-5 shadow-sm">
               <h3 className="text-[#3a2312] font-bold text-[15px] tracking-wider mb-4 font-display">GIỚI THIỆU BÀI HỌC</h3>
               <div className="flex flex-col gap-3 text-sm">
                  <div className="flex flex-col gap-1.5">
                     <div className="flex">
                        <span className="w-24 text-[#8c6a34] flex-shrink-0">Chủ đề:</span>
                        <span className="flex-1 text-[#3a2312] font-medium">{podcast.category}</span>
                     </div>
                     {podcast.category && (
                        <div className="pl-24">
                           <button
                             type="button"
                             onClick={handleToggleFollowCategory}
                             disabled={followingLoading}
                             className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                               isFollowingCategory
                                 ? "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                                 : "bg-[#a84d28] text-white hover:bg-[#8f3f1e] shadow-sm"
                             } disabled:opacity-50 disabled:cursor-not-allowed`}
                           >
                             {followingLoading ? (
                               <span className="inline-block animate-spin mr-1">⏳</span>
                             ) : isFollowingCategory ? (
                               <span>✓ Đang theo dõi</span>
                             ) : (
                               <span>+ Theo dõi chủ đề</span>
                             )}
                           </button>
                        </div>
                     )}
                  </div>
                  <div className="flex">
                     <span className="w-24 text-[#8c6a34]">Cấp độ:</span>
                     <span className="flex-1 text-[#3a2312] font-medium">{translateLevel(podcast.level)}</span>
                  </div>
                  <div className="flex">
                     <span className="w-24 text-[#8c6a34]">Thời lượng:</span>
                     <span className="flex-1 text-[#3a2312] font-medium">{formatTime(duration)}</span>
                  </div>
                  <div className="flex">
                     <span className="w-24 text-[#8c6a34]">Lượt nghe:</span>
                     <span className="flex-1 text-[#3a2312] font-medium">{podcast.viewCount?.toLocaleString() || 0} lượt</span>
                  </div>
                  <div className="flex">
                     <span className="w-24 text-[#8c6a34]">Ngày đăng:</span>
                     <span className="flex-1 text-[#3a2312] font-medium">{formatDate(podcast.createdAt)}</span>
                  </div>
               </div>
            </div>

            {/* Comments */}
            <div className="bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl p-6 shadow-sm">
               <h3 className="text-[#3a2312] font-bold text-[15px] tracking-wider mb-6 font-display">BÌNH LUẬN</h3>
               
               {/* Input */}
               <form onSubmit={submitComment} className="flex gap-4 mb-8">
                  <div className="w-10 h-10 rounded-full bg-[#e8d5b5] flex items-center justify-center text-[#5c4a3d] font-bold flex-shrink-0">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Viết bình luận của bạn..." 
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    className="flex-1 bg-white border border-[#e8d5b5] rounded-lg px-4 py-2 text-sm text-[#3a2312] outline-none focus:border-[#c9a15a] shadow-inner"
                  />
                  <button type="submit" className="bg-[#c9a15a] hover:bg-[#b58b4c] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-md">
                     Gửi
                  </button>
               </form>

               {/* Comment List */}
               <div className="flex flex-col gap-6">
                  {comments.length === 0 ? (
                     <p className="text-sm text-[#8c6a34] text-center">Chưa có bình luận nào.</p>
                  ) : comments.map(c => (
                     <div key={c._id} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#d8c39d] flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                           {c.userId?.avatar ? <img src={c.userId.avatar} alt="avt" className="w-full h-full object-cover"/> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                        </div>
                        <div className="flex-1 border-b border-[#e8d5b5]/50 pb-4">
                           <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-sm text-[#3a2312]">{c.userId?.name || "Người dùng ẩn danh"}</h4>
                              <div className="flex items-center gap-2 text-xs text-[#8c6a34]">
                                 {formatDate(c.createdAt)}
                                 {user && (c.userId?._id === user.id || ["staff", "admin"].includes(user.role)) && (
                                    <div className="relative">
                                       <button 
                                          onClick={() => setActiveCommentMenuId(activeCommentMenuId === c._id ? null : c._id)}
                                          className="w-6 h-6 flex items-center justify-center hover:bg-[#f3e9d8] rounded-full transition-colors"
                                       >
                                          <MoreVerticalIcon />
                                       </button>
                                       {activeCommentMenuId === c._id && (
                                          <div className="absolute right-0 mt-1 bg-white border border-[#e8d5b5] rounded-md shadow-lg py-1 z-30 w-20 text-left">
                                             {c.userId?._id === user.id && (
                                                <button 
                                                   onClick={() => {
                                                      setEditingCommentId(c._id);
                                                      setEditingCommentText(c.content);
                                                      setActiveCommentMenuId(null);
                                                   }}
                                                   className="w-full px-3 py-1.5 text-xs text-[#5c4a3d] hover:bg-[#f3e9d8] flex items-center gap-1.5"
                                                >
                                                   Sửa
                                                </button>
                                             )}
                                             <button 
                                                onClick={() => {
                                                   handleDeleteComment(c._id);
                                                   setActiveCommentMenuId(null);
                                                }}
                                                className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-[#f3e9d8] flex items-center gap-1.5 font-medium"
                                             >
                                                Xóa
                                             </button>
                                          </div>
                                       )}
                                    </div>
                                 )}
                              </div>
                           </div>
                           {editingCommentId === c._id ? (
                              <div className="mt-2 bg-white p-2 rounded border border-[#c9a15a] shadow-inner">
                                 <textarea 
                                    value={editingCommentText}
                                    onChange={e => setEditingCommentText(e.target.value)}
                                    className="w-full text-sm outline-none resize-none bg-transparent mb-2 text-[#3a2312] border-b border-[#e8d5b5]/50 pb-1"
                                    rows={2}
                                    autoFocus
                                 />
                                 <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingCommentId(null)} className="text-xs text-[#8c6a34] px-2 py-1">Hủy</button>
                                    <button onClick={() => handleUpdateComment(c._id)} className="bg-[#c9a15a] text-white text-xs px-3 py-1 rounded">Lưu</button>
                                 </div>
                              </div>
                           ) : (
                              <p className="text-sm text-[#5c4a3d]">{c.content}</p>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            </div>

          </div>
        </div>
      {/* ── Beautiful Result Overlay Modal ── */}
      {showResultModal && quizResult && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#fdfbf7] border-4 border-amber-600/40 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden border-t-8 border-t-amber-700">
            {/* Shiny gold details */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-amber-200/20 rounded-full blur-xl" />
            <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-amber-400/20 rounded-full blur-xl" />

            <div className="flex justify-center mb-4">
              {quizResult.passed ? (
                <svg className="w-16 h-16 text-amber-500 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
                  <path d="M12 2a6 6 0 0 1 6 6v1H6V8a6 6 0 0 1 6-6z" />
                </svg>
              ) : (
                <svg className="w-16 h-16 text-amber-700/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
              )}
            </div>

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
              <div className="mb-6 flex justify-center items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 font-bold px-5 py-2.5 rounded-full shadow-md max-w-xs mx-auto animate-bounce animate-duration-1000">
                <svg className="w-4 h-4 text-amber-950 fill-amber-950 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>Nhận +{quizResult.xpGained} XP Tích Lũy!</span>
              </div>
            ) : (
              <div className="mb-6 text-xs text-amber-600 italic">
                Bạn đã nhận đủ XP của bài học này từ trước.
              </div>
            )}

            {/* Scrollable details list */}
            {quizResult.details && quizResult.details.length > 0 && (
              <div className="text-left mb-6 max-h-48 overflow-y-auto border border-amber-200/50 rounded-xl p-3 bg-amber-50/30 text-amber-900 animate-fade-in">
                <div className="text-xs font-bold text-amber-800/80 uppercase tracking-wider mb-2">
                  Chi Tiết Đáp Án:
                </div>
                <div className="space-y-3">
                  {quizResult.details.map((q, idx) => (
                    <div key={idx} className="text-xs border-b border-amber-200/20 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-start gap-2">
                        <span className="text-sm shrink-0">
                          {q.isCorrect ? (
                            <svg className="w-4 h-4 text-emerald-600 inline shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-red-600 inline shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" x2="6" y1="6" y2="18" />
                              <line x1="6" x2="18" y1="6" y2="18" />
                            </svg>
                          )}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-amber-950 leading-tight">
                            {q.title}: {q.question}
                          </p>
                          <p className="text-[11px] text-amber-800 mt-1">
                            Đáp án đúng: <span className="font-semibold text-emerald-700">{q.correctAnswer}</span>
                          </p>
                          {!q.isCorrect && (
                            <p className="text-[11px] text-red-700 mt-0.5">
                              Bạn đã chọn: <span className="font-semibold">{q.selectedAnswer || "(Không trả lời)"}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowResultModal(false);
                  window.location.reload();
                }}
                className="w-full bg-amber-700 hover:bg-amber-800 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-sm text-sm"
              >
                Chơi lại bản đồ
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Completion Toast Notification ── */}
      {showCompletionToast && xpGained && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#3a2312] border-2 border-[#eac988] text-white rounded-xl shadow-2xl p-4 flex items-center gap-3 animate-slide-in max-w-sm border-t-4 border-t-amber-500">
          <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shrink-0 animate-bounce">
            <svg className="w-5 h-5 text-amber-950 fill-amber-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-[#f0ddb7] text-sm">Podcast Hoàn Thành!</h4>
            <p className="text-xs text-amber-200/90 mt-0.5">Bạn đã nghe xong podcast và nhận được <span className="font-bold text-amber-400">+{xpGained} XP</span> tích lũy.</p>
          </div>
          <button 
            onClick={() => setShowCompletionToast(false)}
            className="text-amber-200/70 hover:text-white ml-2 text-xs shrink-0 self-start"
          >
            ✕
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
