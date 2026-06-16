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
};

type LessonResponseItem = {
  _id: string;
  title: string;
  content: string;
  status: ReviewStatus;
  reviewFeedback?: string;
  game: LessonGame;
  createdAt: string;
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
};

const toReviewItem = (
  lesson: LessonResponseItem
): TeacherReviewItem => {
  return {
    id: lesson._id,
    title: lesson.title,
    type: "Lesson",
    createdBy: "Staff",
    submittedAt: lesson.createdAt,
    status: lesson.status || "Pending_Review",
    summary: lesson.content,
    game: lesson.game,
    reviewFeedback: lesson.reviewFeedback || "",
  };
};

const podcastToReviewItem = (
  podcast: PodcastResponseItem
): TeacherReviewItem => {
  return {
    id: podcast._id,
    title: podcast.title,
    type: "Podcast",
    createdBy: "Staff",
    submittedAt: podcast.createdAt,
    status: podcast.status || "Pending_Review",
    summary: podcast.description || podcast.content || "",
    podcastDetails: {
      thumbnail: podcast.thumbnail,
      audioUrl: podcast.audioUrl,
      level: podcast.level || "Medium",
      category: podcast.category || "Chủ đề chung",
      duration: podcast.duration || 0,
      lessonId: podcast.lessonId,
    },
    reviewFeedback: podcast.reviewFeedback || "",
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
