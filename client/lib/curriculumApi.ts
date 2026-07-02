/**
 * Curriculum API Types — Đồng bộ với backend model.
 *
 * Hierarchy:
 *   Chapter → CurriculumLesson → LessonPart → ContentBlock → Game | Quiz
 */

// ═══════════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════════

export type Grade = 10 | 11 | 12;

export type Difficulty = "Easy" | "Medium" | "Hard";

export type ContentStatus = "Draft" | "Pending_Review" | "Published" | "Rejected";

export type PublishStatus = "Draft" | "Published";

export type ContentBlockType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "timeline"
  | "quote"
  | "map"
  | "document"
  | "game"
  | "quiz";

export type GameType =
  | "quiz_map"
  | "puzzle"
  | "drag_drop"
  | "rpg"
  | "memory"
  | "timeline_sort";

export type AnimationName = "idle" | "run" | "attack" | "jump" | "hurt" | "dead";

// ═══════════════════════════════════════════════════════════════
// Chapter
// ═══════════════════════════════════════════════════════════════

export type Chapter = {
  _id: string;
  title: string;
  description: string;
  grade: Grade;
  order: number;
  coverImage: string;
  status: PublishStatus;
  lessonCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type ChaptersResponse = {
  success: true;
  grade: Grade;
  count: number;
  chapters: Chapter[];
};

// ═══════════════════════════════════════════════════════════════
// CurriculumLesson
// ═══════════════════════════════════════════════════════════════

export type CurriculumLesson = {
  _id: string;
  title: string;
  chapterId: string;
  order: number;
  duration: number;
  difficulty: Difficulty;
  tags: string[];
  thumbnail: string;
  status: ContentStatus;
  partCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type LessonsResponse = {
  success: true;
  chapterId: string;
  count: number;
  lessons: CurriculumLesson[];
};

// ═══════════════════════════════════════════════════════════════
// LessonPart
// ═══════════════════════════════════════════════════════════════

export type LessonPartMeta = {
  _id: string;
  title: string;
  order: number;
  learningObjective: string;
  estimatedMinutes: number;
  status: PublishStatus;
};

export type PartsResponse = {
  success: true;
  lessonId: string;
  count: number;
  parts: LessonPartMeta[];
};

// ═══════════════════════════════════════════════════════════════
// ContentBlock
// ═══════════════════════════════════════════════════════════════

export type ContentBlock = {
  type: ContentBlockType;
  data: Record<string, unknown>;
  order: number;
};

export type LessonPartDetail = LessonPartMeta & {
  contentBlocks: ContentBlock[];
};

export type PartBlocksResponse = {
  success: true;
  part: LessonPartDetail;
};

// ═══════════════════════════════════════════════════════════════
// Game (lazy-load)
// ═══════════════════════════════════════════════════════════════

export type GameConfig = {
  tilemapJsonUrl: string;
  tilesets: { name: string; imageUrl: string }[];
  character: {
    animations: Partial<
      Record<
        AnimationName,
        { key: string; frame: number; imageUrl: string }[]
      >
    >;
  };
  spawnPoint: { x: number; y: number };
  extra?: Record<string, unknown>;
};

export type GameData = {
  _id: string;
  title: string;
  description: string;
  gameType: GameType;
  thumbnail: string;
  config: GameConfig;
  status: PublishStatus;
};

export type GameResponse = {
  success: true;
  game: GameData;
};

// ═══════════════════════════════════════════════════════════════
// Quiz (lazy-load)
// ═══════════════════════════════════════════════════════════════

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex?: number; // student không thấy
  explanation?: string; // student không thấy
  image?: string;
  points: number;
};

export type QuizData = {
  _id: string;
  title: string;
  description: string;
  timeLimit: number | null;
  passScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: QuizQuestion[];
  totalPoints?: number;
  questionCount?: number;
  status: PublishStatus;
};

export type QuizResponse = {
  success: true;
  quiz: QuizData;
};

// ═══════════════════════════════════════════════════════════════
// UserProgress
// ═══════════════════════════════════════════════════════════════

export type QuizAnswer = {
  questionIndex: number;
  selectedIndex: number;
  correct: boolean;
};

export type QuizResult = {
  quizId: string;
  score: number;
  totalPoints: number;
  passed: boolean;
  answers: QuizAnswer[];
  completedAt: string;
};

export type GameResult = {
  gameId: string;
  score: number;
  metadata: Record<string, unknown>;
  completedAt: string;
};

export type LastPosition = {
  partId: string;
  blockIndex: number;
};

export type UserProgress = {
  _id: string;
  userId: string;
  lessonId: string;
  completedParts: string[];
  quizResults: QuizResult[];
  gameResults: GameResult[];
  lastPosition: LastPosition;
  totalTimeSpent: number;
  updatedAt: string;
};

export type ProgressResponse = {
  success: true;
  progress: UserProgress | null;
};

export type QuizSubmitBody = {
  quizId: string;
  answers: { questionIndex: number; selectedIndex: number }[];
};

export type GameSubmitBody = {
  gameId: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export type CompletePartBody = {
  partId: string;
};
