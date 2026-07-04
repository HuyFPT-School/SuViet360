import { api } from "@/lib/api";

export type ReviewStatus = "Pending_Review" | "Published" | "Rejected";

export type ReviewContentType = "Lesson" | "Podcast";

export type Tileset = {
  name: string;
  imageUrl: string;
};

export type SpriteFrame = {
  key: string;
  frame: number;
  imageUrl: string;
};

export type LessonGame = {
  tilemapJsonUrl: string;
  tilesets: Tileset[];
  character: {
    animations: Record<string, SpriteFrame[]>;
  };
  spawnPoint: {
    x: number;
    y: number;
  };
};

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
} | null;

export type PodcastDetails = {
  thumbnail: string;
  audioUrl: string;
  level: string;
  category: string;
  duration: number;
  lessonId?: any;
};

export type TeacherReviewItem = {
  id: string;
  title: string;
  type: ReviewContentType;
  createdBy: string;
  submittedAt: string;
  status: ReviewStatus;
  summary: string;
  game?: LessonGame;
  podcastDetails?: PodcastDetails;
  reviewFeedback?: string;
  reviewedBy?: UserSummary;
  reviewedAt?: string;
  isDraftUpdate?: boolean;
};

type LessonResponseItem = {
  _id: string;
  title: string;
  content: string;
  status: ReviewStatus;
  reviewFeedback?: string;
  game: LessonGame;
  createdAt: string;
  createdBy?: string | { _id: string; name: string; email: string };
  hasPendingDraft?: boolean;
  pendingDraft?: any;
};

type LessonsResponse = {
  success: boolean;
  lessons: LessonResponseItem[];
};

type PodcastResponseItem = {
  _id: string;
  title: string;
  description: string;
  content: string;
  thumbnail: string;
  audioUrl: string;
  level: string;
  category: string;
  duration: number;
  lessonId?: any;
  status: ReviewStatus;
  reviewFeedback?: string;
  createdAt: string;
  createdBy?: string | { _id: string; name: string; email: string };
  pendingDraft?: any;
};

const formatCreator = (creator: any): string => {
  if (creator && typeof creator === "object") {
    if (creator.name && creator.email) {
      return `${creator.name} (${creator.email})`;
    }
    return creator.name || "Staff";
  }
  if (typeof creator === "string") {
    return creator;
  }
  return "Staff";
};

const toReviewItem = (
  lesson: LessonResponseItem
): TeacherReviewItem => {
  const isDraftUpdate = lesson.status === "Published" && !!lesson.hasPendingDraft;
  const draft = lesson.pendingDraft;
  
  return {
    id: lesson._id,
    title: isDraftUpdate ? (draft?.title || lesson.title) : lesson.title,
    type: "Lesson",
    createdBy: formatCreator(lesson.createdBy),
    submittedAt: lesson.createdAt,
    status: isDraftUpdate ? "Pending_Review" : (lesson.status || "Pending_Review"),
    summary: isDraftUpdate ? (draft?.content || lesson.content) : lesson.content,
    game: isDraftUpdate ? {
      tilemapJsonUrl: draft?.tilemapJsonUrl || lesson.game.tilemapJsonUrl,
      tilesets: draft?.tilesets || lesson.game.tilesets,
      character: draft?.animations 
        ? { animations: draft.animations } 
        : lesson.game.character,
      spawnPoint: draft?.spawnPoint || lesson.game.spawnPoint,
    } : lesson.game,
    reviewFeedback: lesson.reviewFeedback || "",
    isDraftUpdate,
  };
};

const podcastToReviewItem = (
  podcast: PodcastResponseItem
): TeacherReviewItem => {
  const isDraftUpdate = podcast.status === "Published" && !!podcast.pendingDraft;
  const draft = podcast.pendingDraft;

  return {
    id: podcast._id,
    title: isDraftUpdate ? (draft?.title || podcast.title) : podcast.title,
    type: "Podcast",
    createdBy: formatCreator(podcast.createdBy),
    submittedAt: podcast.createdAt,
    status: isDraftUpdate ? "Pending_Review" : (podcast.status || "Pending_Review"),
    summary: isDraftUpdate ? (draft?.description || draft?.content || podcast.description || podcast.content || "") : (podcast.description || podcast.content || ""),
    podcastDetails: {
      thumbnail: isDraftUpdate ? (draft?.thumbnail || podcast.thumbnail) : podcast.thumbnail,
      audioUrl: isDraftUpdate ? (draft?.audioUrl || podcast.audioUrl) : podcast.audioUrl,
      level: isDraftUpdate ? (draft?.level || podcast.level || "Medium") : (podcast.level || "Medium"),
      category: isDraftUpdate ? (draft?.category || podcast.category || "Chủ đề chung") : (podcast.category || "Chủ đề chung"),
      duration: isDraftUpdate ? (draft?.duration || podcast.duration || 0) : (podcast.duration || 0),
      lessonId: isDraftUpdate ? (draft?.lessonId || podcast.lessonId) : podcast.lessonId,
    },
    reviewFeedback: podcast.reviewFeedback || "",
    isDraftUpdate,
  };
};

export const rejectionSuggestions = [
  "Sai kiến thức lịch sử",
  "Nội dung chưa đầy đủ",
  "Audio không khớp với nội dung",
  "Game trong bài học bị lỗi logic",
  "Ảnh hoặc tài nguyên game bị lỗi",
  "Tilemap JSON không tải được",
  "Cần chỉnh sửa lại nội dung trước khi xuất bản",
];

const getCsrfToken = async () => {
  const response = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
  return response.data.data.csrfToken;
};

export const teacherReviewApi = {
  getReviewItems: async () => {
    const [lessonsRes, podcastsRes] = await Promise.all([
      api.get<LessonsResponse>("/lessons"),
      api.get<{ success: boolean; data: PodcastResponseItem[] }>("/podcasts/review"),
    ]);

    const lessonsData = lessonsRes.data.lessons.map((lesson) => toReviewItem(lesson));
    const podcastsData = podcastsRes.data.data.map((podcast) => podcastToReviewItem(podcast));

    const merged = [...lessonsData, ...podcastsData].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    return {
      success: true,
      data: merged,
    };
  },
  approveContent: async (id: string, type: ReviewContentType) => {
    const csrfToken = await getCsrfToken();
    const endpoint = type === "Lesson" ? `/lessons/${id}/approve` : `/podcasts/${id}/approve`;
    await api.put(
      endpoint,
      {},
      {
        headers: { "x-csrf-token": csrfToken },
      }
    );
    return { success: true };
  },
  rejectContent: async (id: string, type: ReviewContentType, feedback: string) => {
    const csrfToken = await getCsrfToken();
    const endpoint = type === "Lesson" ? `/lessons/${id}/reject` : `/podcasts/${id}/reject`;
    await api.put(
      endpoint,
      { feedback },
      {
        headers: { "x-csrf-token": csrfToken },
      }
    );
    return { success: true };
  },
};
