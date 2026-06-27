import { api } from "@/lib/api";
import type { BlogPost, BlogComment, BlogReport } from "@/types/blog";

const ensureCsrfToken = async () => {
  const response = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
  return response.data.data.csrfToken;
};

export interface PaginatedPostsResponse {
  success: boolean;
  count: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  data: BlogPost[];
}

export const blogApi = {
  // Get all published posts (public)
  getPublishedPosts: async (
    page = 1,
    limit = 12,
    category?: string,
    search?: string
  ): Promise<PaginatedPostsResponse> => {
    let url = `/blog/posts?page=${page}&limit=${limit}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const res = await api.get<PaginatedPostsResponse>(url);
    return res.data;
  },

  // Get a single post by ID (public/protected check handled by backend)
  getPostById: async (id: string): Promise<{ success: boolean; data: BlogPost }> => {
    const res = await api.get<{ success: boolean; data: BlogPost }>(`/blog/posts/${id}`);
    return res.data;
  },

  // Get current user's own posts (protected)
  getMyPosts: async (): Promise<{ success: boolean; data: BlogPost[] }> => {
    const res = await api.get<{ success: boolean; data: BlogPost[] }>("/blog/posts/my");
    return res.data;
  },

  // Create a new blog post (protected)
  createPost: async (formData: FormData): Promise<{ success: boolean; data: BlogPost }> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean; data: BlogPost }>(
      "/blog/posts",
      formData,
      {
        headers: {
          "x-csrf-token": token,
        },
      }
    );
    return res.data;
  },

  // Update a blog post (protected)
  updatePost: async (id: string, formData: FormData): Promise<{ success: boolean; data: BlogPost }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; data: BlogPost }>(
      `/blog/posts/${id}`,
      formData,
      {
        headers: {
          "x-csrf-token": token,
        },
      }
    );
    return res.data;
  },

  // Delete a blog post (protected)
  deletePost: async (id: string): Promise<{ success: boolean; message: string }> => {
    const token = await ensureCsrfToken();
    const res = await api.delete<{ success: boolean; message: string }>(
      `/blog/posts/${id}`,
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // Get comments of a post (public)
  getCommentsByPost: async (postId: string): Promise<{ success: boolean; data: BlogComment[] }> => {
    const res = await api.get<{ success: boolean; data: BlogComment[] }>(`/blog/posts/${postId}/comments`);
    return res.data;
  },

  // Create a comment (protected)
  createComment: async (
    postId: string,
    content: string,
    parentComment: string | null = null
  ): Promise<{ success: boolean; data: BlogComment }> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean; data: BlogComment }>(
      `/blog/posts/${postId}/comments`,
      { content, parentComment },
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // Update a comment (protected)
  updateComment: async (id: string, content: string): Promise<{ success: boolean; data: BlogComment }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; data: BlogComment }>(
      `/blog/comments/${id}`,
      { content },
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // Delete a comment (protected)
  deleteComment: async (id: string): Promise<{ success: boolean; message: string }> => {
    const token = await ensureCsrfToken();
    const res = await api.delete<{ success: boolean; message: string }>(
      `/blog/comments/${id}`,
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // Toggle like (protected)
  toggleLike: async (
    targetType: "Post" | "Comment",
    targetId: string
  ): Promise<{ success: boolean; liked: boolean; likeCount: number }> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean; liked: boolean; likeCount: number }>(
      "/blog/like",
      { targetType, targetId },
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // Get like status (protected)
  getLikeStatus: async (
    targetType: "Post" | "Comment",
    targetId: string
  ): Promise<{ success: boolean; liked: boolean }> => {
    const res = await api.get<{ success: boolean; liked: boolean }>(
      `/blog/like/${targetType}/${targetId}`
    );
    return res.data;
  },

  // Create a report (protected)
  createReport: async (data: {
    targetType: "Post" | "Comment";
    targetId: string;
    reason: string;
    description?: string;
  }): Promise<{ success: boolean; data: BlogReport }> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean; data: BlogReport }>(
      "/blog/reports",
      data,
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // Get pending posts (moderation)
  getPendingPosts: async (): Promise<{ success: boolean; data: BlogPost[] }> => {
    const res = await api.get<{ success: boolean; data: BlogPost[] }>("/blog/moderation/posts");
    return res.data;
  },

  // Approve post (moderation)
  approvePost: async (id: string): Promise<{ success: boolean; data: BlogPost }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; data: BlogPost }>(
      `/blog/moderation/posts/${id}/approve`,
      {},
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // Reject post (moderation)
  rejectPost: async (id: string, feedback: string): Promise<{ success: boolean; data: BlogPost }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; data: BlogPost }>(
      `/blog/moderation/posts/${id}/reject`,
      { feedback },
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // Remove violating post (moderation)
  removePost: async (id: string): Promise<{ success: boolean; message: string }> => {
    const token = await ensureCsrfToken();
    const res = await api.delete<{ success: boolean; message: string }>(
      `/blog/moderation/posts/${id}`,
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // Hide comment (moderation)
  hideComment: async (id: string): Promise<{ success: boolean; message: string; data: BlogComment }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; message: string; data: BlogComment }>(
      `/blog/comments/${id}/hide`,
      {},
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // Get pending reports (moderation)
  getPendingReports: async (): Promise<{ success: boolean; data: BlogReport[] }> => {
    const res = await api.get<{ success: boolean; data: BlogReport[] }>("/blog/reports");
    return res.data;
  },

  // Resolve a report (moderation)
  resolveReport: async (
    id: string,
    action: "delete" | "dismiss"
  ): Promise<{ success: boolean; message: string; data: BlogReport }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; message: string; data: BlogReport }>(
      `/blog/reports/${id}/resolve`,
      { action },
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },
};
