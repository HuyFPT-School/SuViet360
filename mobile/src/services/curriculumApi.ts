import { api, ensureCsrfToken } from './api';

export interface Chapter {
  _id: string;
  title: string;
  description: string;
  grade: number;
  order: number;
  coverImage: string;
  status: string;
}

export interface StudyUnit {
  _id: string;
  title: string;
  summary: string;
  duration: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  thumbnail: string;
  status: string;
  contentBlocks?: ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'image' | 'quiz' | 'video';
  data: any;
  order: number;
}

export interface Quiz {
  _id: string;
  title: string;
  questions: QuizQuestion[];
  passScore: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex?: number;
}

export interface ProgressDashboard {
  xp: number;
  level: number;
  completedLessons: string[];
  completedUnits: string[];
  completedPodcasts: string[];
  quizPerformances: { quizId: string; passed: boolean; score: number; total: number }[];
  unlockedLessons: string[];
  streak: number;
  totalQuizzesTaken: number;
  totalQuizzesPassed: number;
  stats: {
    totalLessons: number;
    totalPodcasts: number;
    completedLessonsCount: number;
    completedPodcastsCount: number;
  };
  xpHistory: { amount: number; reason: string; createdAt: string }[];
}

export const curriculumApi = {
  /** Get all published chapters */
  getChapters: async (): Promise<Chapter[]> => {
    const res = await api.get<{ success: boolean; data: { chapters: Chapter[] } }>(
      '/curriculum/chapters'
    );
    return (res.data.data.chapters || []).filter((c) => c.status === 'Published');
  },

  /** Get study units for a chapter */
  getUnits: async (chapterId: string): Promise<StudyUnit[]> => {
    const res = await api.get<{ success: boolean; data: { units: StudyUnit[] } }>(
      `/curriculum/chapters/${chapterId}/units`
    );
    return res.data.data.units || [];
  },

  /** Get full detail of a study unit */
  getUnitDetail: async (unitId: string): Promise<StudyUnit> => {
    const res = await api.get<{ success: boolean; data: { unit: StudyUnit } }>(
      `/curriculum/units/${unitId}`
    );
    return res.data.data.unit;
  },

  /** Get user's progress for a unit */
  getUnitProgress: async (unitId: string): Promise<{
    completed: boolean;
    quizPerformance?: { quizId: string; passed: boolean };
  }> => {
    const res = await api.get<{ success: boolean; data: any }>(
      `/curriculum/progress/${unitId}`
    );
    return res.data.data;
  },

  /** Mark a study unit as completed (requires auth + CSRF) */
  completeUnit: async (unitId: string): Promise<{ xpGained: number }> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean; data: { xpGained: number } }>(
      `/curriculum/progress/${unitId}/complete`,
      {},
      { headers: { 'x-csrf-token': token } }
    );
    return res.data.data;
  },

  /** Get a specific quiz by ID */
  getQuiz: async (quizId: string): Promise<Quiz> => {
    const res = await api.get<{ success: boolean; data: { quiz: Quiz } }>(
      `/curriculum/quizzes/${quizId}`
    );
    return res.data.data.quiz;
  },

  /** Submit quiz answers for a curriculum quiz */
  submitQuiz: async (
    quizId: string,
    score: number,
    total: number
  ): Promise<{ xpGained: number; passed: boolean }> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{
      success: boolean;
      data: { xpGained: number; passed: boolean };
    }>(
      `/curriculum/quiz/${quizId}/submit`,
      { quizId, score, total },
      { headers: { 'x-csrf-token': token } }
    );
    return res.data.data;
  },

  /** Get overall progress dashboard */
  getProgressDashboard: async (): Promise<ProgressDashboard> => {
    const res = await api.get<{ success: boolean; data: ProgressDashboard }>(
      '/progress/dashboard'
    );
    return res.data.data;
  },

  /** Submit lesson/game quiz score and mark lesson complete */
  submitLessonProgress: async (
    lessonId: string,
    quizScore: number,
    quizTotal: number
  ): Promise<{
    quizXpGained: number;
    lessonXpGained: number;
    totalXpGained: number;
    passed: boolean;
  }> => {
    const token = await ensureCsrfToken();

    // 1. Submit quiz score
    const quizRes = await api.post<{
      success: boolean;
      data: { xpGained: number; passed: boolean };
    }>(
      `/progress/quiz/${lessonId}/submit`,
      { score: quizScore, total: quizTotal },
      { headers: { 'x-csrf-token': token } }
    );

    // 2. Mark lesson as completed
    const lessonRes = await api.post<{
      success: boolean;
      data: { xpGained: number };
    }>(
      `/progress/lesson/${lessonId}/complete`,
      {},
      { headers: { 'x-csrf-token': token } }
    );

    const quizXp = quizRes.data.data.xpGained;
    const lessonXp = lessonRes.data.data.xpGained || 0;

    return {
      quizXpGained: quizXp,
      lessonXpGained: lessonXp,
      totalXpGained: quizXp + lessonXp,
      passed: quizRes.data.data.passed,
    };
  },
};
