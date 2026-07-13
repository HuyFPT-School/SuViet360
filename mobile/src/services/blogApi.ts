import { api, ensureCsrfToken } from './api';
import type { BlogPost, BlogComment, BlogReport, PaginatedPostsResponse } from '@/types/blog';

export const blogApi = {
  // ─── Posts ─────────────────────────────────────────
  getPublishedPosts: async (
    page = 1,
    limit = 12,
    category?: string,
    search?: string,
  ): Promise<PaginatedPostsResponse> => {
    let url = `/blog/posts?page=${page}&limit=${limit}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const res = await api.get<PaginatedPostsResponse>(url);
    return res.data;
  },

  getPostById: async (id: string): Promise<{ success: boolean; data: BlogPost }> => {
    const res = await api.get<{ success: boolean; data: BlogPost }>(`/blog/posts/${id}`);
    return res.data;
  },

  getMyPosts: async (): Promise<{ success: boolean; data: BlogPost[] }> => {
    const res = await api.get<{ success: boolean; data: BlogPost[] }>('/blog/posts/my');
    return res.data;
  },

  createPost: async (formData: FormData): Promise<{ success: boolean; data: BlogPost }> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean; data: BlogPost }>(
      '/blog/posts',
      formData,
      { headers: { 'x-csrf-token': token, 'Content-Type': 'multipart/form-data' } },
    );
    return res.data;
  },

  updatePost: async (id: string, formData: FormData): Promise<{ success: boolean; data: BlogPost }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; data: BlogPost }>(
      `/blog/posts/${id}`,
      formData,
      { headers: { 'x-csrf-token': token, 'Content-Type': 'multipart/form-data' } },
    );
    return res.data;
  },

  deletePost: async (id: string): Promise<{ success: boolean; message: string }> => {
    const token = await ensureCsrfToken();
    const res = await api.delete<{ success: boolean; message: string }>(
      `/blog/posts/${id}`,
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  // ─── Comments ──────────────────────────────────────
  getCommentsByPost: async (postId: string): Promise<{ success: boolean; data: BlogComment[] }> => {
    const res = await api.get<{ success: boolean; data: BlogComment[] }>(`/blog/posts/${postId}/comments`);
    return res.data;
  },

  createComment: async (
    postId: string,
    content: string,
    parentComment: string | null = null,
  ): Promise<{ success: boolean; data: BlogComment }> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean; data: BlogComment }>(
      `/blog/posts/${postId}/comments`,
      { content, parentComment },
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  updateComment: async (id: string, content: string): Promise<{ success: boolean; data: BlogComment }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; data: BlogComment }>(
      `/blog/comments/${id}`,
      { content },
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  deleteComment: async (id: string): Promise<{ success: boolean; message: string }> => {
    const token = await ensureCsrfToken();
    const res = await api.delete<{ success: boolean; message: string }>(
      `/blog/comments/${id}`,
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  // ─── Likes ─────────────────────────────────────────
  toggleLike: async (
    targetType: 'Post' | 'Comment',
    targetId: string,
  ): Promise<{ success: boolean; liked: boolean; likeCount: number }> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean; liked: boolean; likeCount: number }>(
      '/blog/like',
      { targetType, targetId },
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  getLikeStatus: async (
    targetType: 'Post' | 'Comment',
    targetId: string,
  ): Promise<{ success: boolean; liked: boolean }> => {
    const res = await api.get<{ success: boolean; liked: boolean }>(
      `/blog/like/${targetType}/${targetId}`,
    );
    return res.data;
  },

  // ─── Reports ───────────────────────────────────────
  createReport: async (data: {
    targetType: 'Post' | 'Comment';
    targetId: string;
    reason: string;
    description?: string;
  }): Promise<{ success: boolean; data: BlogReport }> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean; data: BlogReport }>(
      '/blog/reports',
      data,
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  // ─── Moderation ────────────────────────────────────
  getPendingPosts: async (): Promise<{ success: boolean; data: BlogPost[] }> => {
    const res = await api.get<{ success: boolean; data: BlogPost[] }>('/blog/moderation/posts');
    return res.data;
  },

  approvePost: async (id: string): Promise<{ success: boolean; data: BlogPost }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; data: BlogPost }>(
      `/blog/moderation/posts/${id}/approve`,
      {},
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  rejectPost: async (id: string, feedback: string): Promise<{ success: boolean; data: BlogPost }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; data: BlogPost }>(
      `/blog/moderation/posts/${id}/reject`,
      { feedback },
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  removePost: async (id: string): Promise<{ success: boolean; message: string }> => {
    const token = await ensureCsrfToken();
    const res = await api.delete<{ success: boolean; message: string }>(
      `/blog/moderation/posts/${id}`,
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  hideComment: async (id: string): Promise<{ success: boolean; message: string; data: BlogComment }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; message: string; data: BlogComment }>(
      `/blog/comments/${id}/hide`,
      {},
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  getPendingReports: async (): Promise<{ success: boolean; data: BlogReport[] }> => {
    const res = await api.get<{ success: boolean; data: BlogReport[] }>('/blog/reports');
    return res.data;
  },

  resolveReport: async (
    id: string,
    action: 'delete' | 'dismiss',
  ): Promise<{ success: boolean; message: string; data: BlogReport }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; message: string; data: BlogReport }>(
      `/blog/reports/${id}/resolve`,
      { action },
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },
};
