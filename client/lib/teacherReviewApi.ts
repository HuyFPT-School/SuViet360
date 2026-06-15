import { api } from "@/lib/api";

export type ReviewStatus = "Pending_Review" | "Published" | "Rejected";

export type ReviewContentType = "Lesson";

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

export type TeacherReviewItem = {
  id: string;
  title: string;
  type: ReviewContentType;
  createdBy: string;
  submittedAt: string;
  status: ReviewStatus;
  summary: string;
  game: LessonGame;
  reviewFeedback?: string;
  reviewedBy?: UserSummary;
  reviewedAt?: string;
};

type LessonResponseItem = {
  _id: string;
  title: string;
  content: string;
  game: LessonGame;
  createdAt: string;
};

type LessonsResponse = {
  success: boolean;
  lessons: LessonResponseItem[];
};

type ReviewOverride = {
  status: ReviewStatus;
  reviewFeedback?: string;
};

const storageKey = "suviet360.teacherReview.lessonOverrides";

const getReviewOverrides = (): Record<string, ReviewOverride> => {
  if (typeof window === "undefined") return {};
  const rawValue = window.localStorage.getItem(storageKey);
  if (!rawValue) return {};

  try {
    return JSON.parse(rawValue) as Record<string, ReviewOverride>;
  } catch {
    return {};
  }
};

const saveReviewOverride = (id: string, override: ReviewOverride) => {
  if (typeof window === "undefined") return;
  const overrides = getReviewOverrides();
  window.localStorage.setItem(
    storageKey,
    JSON.stringify({ ...overrides, [id]: override })
  );
};

const toReviewItem = (
  lesson: LessonResponseItem,
  override?: ReviewOverride
): TeacherReviewItem => {
  return {
    id: lesson._id,
    title: lesson.title,
    type: "Lesson",
    createdBy: "Staff",
    submittedAt: lesson.createdAt,
    status: override?.status || "Pending_Review",
    summary: lesson.content,
    game: lesson.game,
    reviewFeedback: override?.reviewFeedback || "",
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

export const teacherReviewApi = {
  getReviewItems: async () => {
    const response = await api.get<LessonsResponse>("/lessons");
    const overrides = getReviewOverrides();
    return {
      success: response.data.success,
      data: response.data.lessons.map((lesson) =>
        toReviewItem(lesson, overrides[lesson._id])
      ),
    };
  },
  approveContent: async (id: string) => {
    saveReviewOverride(id, { status: "Published" });
    return { success: true };
  },
  rejectContent: async (id: string, feedback: string) => {
    saveReviewOverride(id, {
      status: "Rejected",
      reviewFeedback: feedback,
    });
    return { success: true };
  },
};
