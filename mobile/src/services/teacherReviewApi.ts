import { api } from './api';
import type { TeacherReviewItem, ReviewStatus, ReviewContentType, LessonGame } from './teacherReviewTypes';

export { rejectionSuggestions } from './teacherReviewTypes';
export type { TeacherReviewItem, ReviewStatus, ReviewContentType, LessonGame };

export const teacherReviewApi = {
  // Get all review items (lessons + podcasts)
  getReviewItems: async (): Promise<{ success: boolean; data: TeacherReviewItem[] }> => {
    const [lessonsRes, podcastsRes] = await Promise.all([
      api.get<{ success: boolean; lessons: any[] }>('/lessons/review'),
      api.get<{ success: boolean; data: any[] }>('/podcasts/review'),
    ]);

    const lessonItems: TeacherReviewItem[] = (lessonsRes.data.lessons || []).map((l: any) => {
      const isDraftUpdate = l.status === 'Published' && !!l.hasPendingDraft;
      const draft = l.pendingDraft;

      return {
        id: l._id,
        title: isDraftUpdate ? (draft?.title || l.title) : l.title,
        type: 'Lesson' as ReviewContentType,
        createdBy: l.createdBy?.name || 'Staff',
        submittedAt: l.createdAt,
        status: isDraftUpdate ? 'Pending_Review' : (l.status || 'Pending_Review'),
        summary: isDraftUpdate
          ? (draft?.content ? draft.content.substring(0, 150) + '...' : l.content ? l.content.substring(0, 150) + '...' : '')
          : (l.content ? l.content.substring(0, 150) + '...' : ''),
        game: isDraftUpdate
          ? {
              tilemapJsonUrl: draft?.tilemapJsonUrl || l.game?.tilemapJsonUrl,
              tilesets: draft?.tilesets || l.game?.tilesets,
              character: draft?.animations
                ? { animations: draft.animations }
                : l.game?.character,
              spawnPoint: draft?.spawnPoint || l.game?.spawnPoint,
            }
          : l.game,
        reviewFeedback: l.reviewFeedback,
        reviewedBy: l.reviewedBy ? { id: l.reviewedBy._id, name: l.reviewedBy.name, email: l.reviewedBy.email, role: l.reviewedBy.role } : null,
        reviewedAt: l.reviewedAt,
        isDraftUpdate,
      };
    });

    const podcastItems: TeacherReviewItem[] = (podcastsRes.data.data || []).map((p: any) => {
      const isDraftUpdate = p.status === 'Published' && !!p.hasPendingDraft;
      const draft = p.pendingDraft;

      return {
        id: p._id,
        title: isDraftUpdate ? (draft?.title || p.title) : p.title,
        type: 'Podcast' as ReviewContentType,
        createdBy: p.createdBy?.name || 'Staff',
        submittedAt: p.createdAt,
        status: isDraftUpdate ? 'Pending_Review' : (p.status || 'Pending_Review'),
        summary: isDraftUpdate
          ? (draft?.description || draft?.content || p.description || p.content || '').substring(0, 150) + '...'
          : ((p.description || p.content || '').substring(0, 150) + '...'),
        podcastDetails: {
          thumbnail: isDraftUpdate ? (draft?.thumbnail || p.thumbnail) : p.thumbnail,
          audioUrl: isDraftUpdate ? (draft?.audioUrl || p.audioUrl) : p.audioUrl,
          level: isDraftUpdate ? (draft?.level || p.level || 'Medium') : (p.level || 'Medium'),
          category: isDraftUpdate ? (draft?.category || p.category || 'Chủ đề chung') : (p.category || 'Chủ đề chung'),
          duration: isDraftUpdate ? (draft?.duration || p.duration || 0) : (p.duration || 0),
          lessonId: isDraftUpdate ? (draft?.lessonId || p.lessonId) : p.lessonId,
        },
        reviewFeedback: p.reviewFeedback,
        reviewedBy: p.reviewedBy ? { id: p.reviewedBy._id, name: p.reviewedBy.name, email: p.reviewedBy.email, role: p.reviewedBy.role } : null,
        reviewedAt: p.reviewedAt,
        isDraftUpdate,
      };
    });

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
