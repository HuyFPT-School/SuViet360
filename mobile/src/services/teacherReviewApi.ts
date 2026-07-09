import { api } from './api';
import type { TeacherReviewItem, ReviewStatus, ReviewContentType, LessonGame } from './teacherReviewTypes';

export { rejectionSuggestions } from './teacherReviewTypes';
export type { TeacherReviewItem, ReviewStatus, ReviewContentType, LessonGame };

export const teacherReviewApi = {
  // Get all review items (lessons + podcasts)
  getReviewItems: async (): Promise<{ success: boolean; data: TeacherReviewItem[] }> => {
    const [lessonsRes, podcastsRes] = await Promise.all([
      api.get<{ success: boolean; lessons: any[] }>('/lessons'),
      api.get<{ success: boolean; data: any[] }>('/podcasts/review'),
    ]);

    const lessonItems: TeacherReviewItem[] = (lessonsRes.data.lessons || []).map((l: any) => ({
      id: l._id,
      title: l.title,
      type: 'Lesson' as ReviewContentType,
      createdBy: l.createdBy?.name || 'Staff',
      submittedAt: l.createdAt,
      status: l.status || 'Pending_Review',
      summary: l.content ? l.content.substring(0, 150) + '...' : '',
      game: l.game,
      reviewFeedback: l.reviewFeedback,
      reviewedBy: l.reviewedBy ? { id: l.reviewedBy._id, name: l.reviewedBy.name, email: l.reviewedBy.email, role: l.reviewedBy.role } : null,
      reviewedAt: l.reviewedAt,
    }));

    const podcastItems: TeacherReviewItem[] = (podcastsRes.data.data || []).map((p: any) => ({
      id: p._id,
      title: p.title,
      type: 'Podcast' as ReviewContentType,
      createdBy: p.createdBy?.name || 'Staff',
      submittedAt: p.createdAt,
      status: p.status || 'Pending_Review',
      summary: p.description ? p.description.substring(0, 150) + '...' : '',
      podcastDetails: {
        thumbnail: p.thumbnail,
        audioUrl: p.audioUrl,
        level: p.level,
        category: p.category,
        duration: p.duration,
        lessonId: p.lessonId,
      },
      reviewFeedback: p.reviewFeedback,
      reviewedBy: p.reviewedBy ? { id: p.reviewedBy._id, name: p.reviewedBy.name, email: p.reviewedBy.email, role: p.reviewedBy.role } : null,
      reviewedAt: p.reviewedAt,
    }));

    const allItems = [...lessonItems, ...podcastItems].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );

    return { success: true, data: allItems };
  },

  // Approve content
  approveContent: async (
    id: string,
    type: ReviewContentType,
  ): Promise<{ success: boolean; message: string }> => {
    const endpoint = type === 'Lesson'
      ? `/lessons/${id}/approve`
      : `/podcasts/${id}/approve`;
    const res = await api.put<{ success: boolean; message: string }>(endpoint);
    return res.data;
  },

  // Reject content
  rejectContent: async (
    id: string,
    type: ReviewContentType,
    feedback: string,
  ): Promise<{ success: boolean; message: string }> => {
    const endpoint = type === 'Lesson'
      ? `/lessons/${id}/reject`
      : `/podcasts/${id}/reject`;
    const res = await api.put<{ success: boolean; message: string }>(endpoint, { feedback });
    return res.data;
  },
};
