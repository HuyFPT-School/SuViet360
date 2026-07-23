import { api } from "@/lib/api";

export type ReviewStatus = "Pending_Review" | "Published" | "Rejected";

export type ReviewContentType = "Lesson" | "Podcast" | "StudyUnit" | "Quiz";

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
  creatorAvatar?: string;
  submittedAt: string;
  status: ReviewStatus;
  summary: string;
  game?: LessonGame;
  podcastDetails?: PodcastDetails;
  studyUnitDetails?: {
    contentBlocks: any[];
  };
  quizDetails?: {
    questions: any[];
    timeLimit?: number;
    passScore?: number;
    shuffleQuestions?: boolean;
  };
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
  createdBy?: string | { _id: string; name: string; email: string; avatar?: string };
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
  createdBy?: string | { _id: string; name: string; email: string; avatar?: string };
  pendingDraft?: any;
};

type StudyUnitResponseItem = {
  _id: string;
  title: string;
  summary: string;
  status: ReviewStatus;
  reviewFeedback?: string;
  createdAt: string;
  createdBy?: string | { _id: string; name: string; email: string; avatar?: string };
  contentBlocks: any[];
  pendingDraft?: any;
};

type QuizResponseItem = {
  _id: string;
  title: string;
  description: string;
  status: ReviewStatus;
  reviewFeedback?: string;
  createdAt: string;
  createdBy?: string | { _id: string; name: string; email: string; avatar?: string };
  questions: any[];
  timeLimit?: number;
  passScore?: number;
  shuffleQuestions?: boolean;
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

const getCreatorAvatar = (creator: any): string | undefined => {
  if (creator && typeof creator === "object") {
    return creator.avatar || creator.avatarUrl || undefined;
  }
  return undefined;
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
    creatorAvatar: getCreatorAvatar(lesson.createdBy),
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
    creatorAvatar: getCreatorAvatar(podcast.createdBy),
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

const studyUnitToReviewItem = (
  unit: StudyUnitResponseItem
): TeacherReviewItem => {
  const isDraftUpdate = unit.status === "Published" && !!unit.pendingDraft;
  const draft = unit.pendingDraft;

  return {
    id: unit._id,
    title: isDraftUpdate ? (draft?.title || unit.title) : unit.title,
    type: "StudyUnit",
    createdBy: formatCreator(unit.createdBy),
    creatorAvatar: getCreatorAvatar(unit.createdBy),
    submittedAt: unit.createdAt,
    status: isDraftUpdate ? "Pending_Review" : (unit.status || "Pending_Review"),
    summary: isDraftUpdate ? (draft?.summary || unit.summary || "") : (unit.summary || ""),
    reviewFeedback: unit.reviewFeedback || "",
    studyUnitDetails: {
      contentBlocks: isDraftUpdate ? (draft?.contentBlocks || unit.contentBlocks || []) : (unit.contentBlocks || []),
    },
    isDraftUpdate,
  };
};

const quizToReviewItem = (
  quiz: QuizResponseItem
): TeacherReviewItem => {
  const isDraftUpdate = quiz.status === "Published" && !!quiz.pendingDraft;
  const draft = quiz.pendingDraft;

  return {
    id: quiz._id,
    title: isDraftUpdate ? (draft?.title || quiz.title) : quiz.title,
    type: "Quiz",
    createdBy: formatCreator(quiz.createdBy),
    creatorAvatar: getCreatorAvatar(quiz.createdBy),
    submittedAt: quiz.createdAt,
    status: isDraftUpdate ? "Pending_Review" : (quiz.status || "Pending_Review"),
    summary: isDraftUpdate ? (draft?.description || quiz.description || "") : (quiz.description || ""),
    reviewFeedback: quiz.reviewFeedback || "",
    quizDetails: {
      questions: isDraftUpdate ? (draft?.questions || quiz.questions || []) : (quiz.questions || []),
      timeLimit: isDraftUpdate ? (draft?.timeLimit || quiz.timeLimit) : quiz.timeLimit,
      passScore: isDraftUpdate ? (draft?.passScore || quiz.passScore) : quiz.passScore,
      shuffleQuestions: isDraftUpdate ? (draft?.shuffleQuestions || quiz.shuffleQuestions) : quiz.shuffleQuestions,
    },
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
    const [lessonsRes, podcastsRes, unitsRes, quizzesRes] = await Promise.all([
      api.get<LessonsResponse>("/lessons"),
      api.get<{ success: boolean; data: PodcastResponseItem[] }>("/podcasts/review"),
      api.get<{ success: boolean; data: { units: StudyUnitResponseItem[] } }>("/curriculum/units"),
      api.get<{ success: boolean; data: { quizzes: QuizResponseItem[] } }>("/curriculum/quizzes"),
    ]);

    const lessonsData = lessonsRes.data.lessons.map((lesson) => toReviewItem(lesson));
    const podcastsData = podcastsRes.data.data.map((podcast) => podcastToReviewItem(podcast));
    const unitsData = (unitsRes.data.data.units || []).map((unit) => studyUnitToReviewItem(unit));
    const quizzesData = (quizzesRes.data.data.quizzes || []).map((quiz) => quizToReviewItem(quiz));

    const merged = [...lessonsData, ...podcastsData, ...unitsData, ...quizzesData].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    return {
      success: true,
      data: merged,
    };
  },
  approveContent: async (id: string, type: ReviewContentType) => {
    const csrfToken = await getCsrfToken();
    let endpoint = "";
    if (type === "Lesson") endpoint = `/lessons/${id}/approve`;
    else if (type === "Podcast") endpoint = `/podcasts/${id}/approve`;
    else if (type === "StudyUnit") endpoint = `/curriculum/units/${id}/approve`;
    else if (type === "Quiz") endpoint = `/curriculum/quizzes/${id}/approve`;

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
    let endpoint = "";
    if (type === "Lesson") endpoint = `/lessons/${id}/reject`;
    else if (type === "Podcast") endpoint = `/podcasts/${id}/reject`;
    else if (type === "StudyUnit") endpoint = `/curriculum/units/${id}/reject`;
    else if (type === "Quiz") endpoint = `/curriculum/quizzes/${id}/reject`;

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
