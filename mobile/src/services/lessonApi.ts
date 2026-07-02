import { api } from './api';
import type { Lesson } from '@/types/lesson';

interface LessonsResponse {
  success: boolean;
  count?: number;
  lessons: Lesson[];
}

interface LessonResponse {
  success: boolean;
  lesson: Lesson;
}

export const lessonApi = {
  getAll: async () => {
    const response = await api.get<LessonsResponse>('/lessons');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<LessonResponse>(`/lessons/${id}`);
    return response.data;
  },
};
