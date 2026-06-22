import { api, ensureCsrfToken } from './api';
import type { Podcast, PodcastNote, PodcastComment } from '@/types/podcast';

interface PodcastsResponse {
  success: boolean;
  count?: number;
  data?: Podcast[];
  podcasts?: Podcast[];
}

interface PodcastResponse {
  success: boolean;
  data?: Podcast;
  podcast?: Podcast;
}

export const podcastApi = {
  getAll: async () => {
    const response = await api.get<PodcastsResponse>('/podcasts');
    return {
      ...response.data,
      podcasts: response.data.podcasts ?? response.data.data ?? [],
    };
  },

  getById: async (id: string) => {
    const response = await api.get<PodcastResponse>(`/podcasts/${id}`);
    return {
      ...response.data,
      podcast: response.data.podcast ?? response.data.data ?? null,
    };
  },

  // Notes
  getNotes: async (podcastId: string) => {
    const response = await api.get<{ data: PodcastNote[] }>(`/podcast-notes/${podcastId}`);
    return response.data;
  },

  createNote: async (podcastId: string, content: string, timestamp: number) => {
    const token = await ensureCsrfToken();
    const response = await api.post(
      '/podcast-notes',
      { podcastId, content, timestamp },
      { headers: { 'x-csrf-token': token } }
    );
    return response.data;
  },

  deleteNote: async (noteId: string) => {
    const token = await ensureCsrfToken();
    await api.delete(`/podcast-notes/${noteId}`, {
      headers: { 'x-csrf-token': token },
    });
  },

  // Comments
  getComments: async (podcastId: string) => {
    const response = await api.get<{ data: PodcastComment[] }>(`/podcast-comments/${podcastId}`);
    return response.data;
  },

  createComment: async (podcastId: string, content: string) => {
    const token = await ensureCsrfToken();
    const response = await api.post(
      '/podcast-comments',
      { podcastId, content },
      { headers: { 'x-csrf-token': token } }
    );
    return response.data;
  },

  deleteComment: async (commentId: string) => {
    const token = await ensureCsrfToken();
    await api.delete(`/podcast-comments/${commentId}`, {
      headers: { 'x-csrf-token': token },
    });
  },
};
