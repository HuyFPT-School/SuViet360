import { api, ensureCsrfToken } from './api';
import type { NotificationItem, GetNotificationsResponse, FollowResponse } from '@/types/notification';

export const notificationApi = {
  // Follow a category
  followCategory: async (category: string): Promise<FollowResponse> => {
    const token = await ensureCsrfToken();
    const res = await api.post<FollowResponse>(
      '/user/notifications/follow',
      { category },
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  // Unfollow a category
  unfollowCategory: async (category: string): Promise<FollowResponse> => {
    const token = await ensureCsrfToken();
    const res = await api.post<FollowResponse>(
      '/user/notifications/unfollow',
      { category },
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  // Get user's followed categories
  getFollowedCategories: async (): Promise<string[]> => {
    const res = await api.get<{ success: boolean; data: string[] }>(
      '/user/notifications/followed',
    );
    return res.data.data;
  },

  // Get notifications
  getNotifications: async (page = 1, limit = 20): Promise<GetNotificationsResponse> => {
    const res = await api.get<GetNotificationsResponse>(
      `/user/notifications?page=${page}&limit=${limit}`,
    );
    return res.data;
  },

  // Mark single notification as read
  markAsRead: async (id: string): Promise<{ success: boolean; message: string }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; message: string }>(
      `/user/notifications/${id}/read`,
      {},
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<{ success: boolean; message: string }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; message: string }>(
      '/user/notifications/read-all',
      {},
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },
};
