import { api } from "@/lib/api";

export interface NotificationItem {
  _id: string;
  recipient: string;
  type: "New_Podcast" | "System";
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetNotificationsResponse {
  success: boolean;
  unreadCount: number;
  data: NotificationItem[];
}

export interface FollowResponse {
  success: boolean;
  message: string;
  category: string;
}

const ensureCsrfToken = async () => {
  const response = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
  return response.data.data.csrfToken;
};

export const notificationApi = {
  // Follow a category
  followCategory: async (category: string): Promise<FollowResponse> => {
    const token = await ensureCsrfToken();
    const res = await api.post<FollowResponse>(
      "/user/notifications/follow",
      { category },
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // Unfollow a category
  unfollowCategory: async (category: string): Promise<FollowResponse> => {
    const token = await ensureCsrfToken();
    const res = await api.post<FollowResponse>(
      "/user/notifications/unfollow",
      { category },
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // Get user's followed categories
  getFollowedCategories: async (): Promise<string[]> => {
    const res = await api.get<{ success: boolean; data: string[] }>(
      "/user/notifications/followed"
    );
    return res.data.data;
  },

  // Get user's notifications list
  getNotifications: async (page = 1, limit = 20): Promise<GetNotificationsResponse> => {
    const res = await api.get<GetNotificationsResponse>(
      `/user/notifications?page=${page}&limit=${limit}`
    );
    return res.data;
  },

  // Mark a notification as read
  markAsRead: async (id: string): Promise<GetNotificationsResponse> => {
    const token = await ensureCsrfToken();
    const res = await api.put<GetNotificationsResponse>(
      `/user/notifications/${id}/read`,
      {},
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<{ success: boolean; unreadCount: number }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; unreadCount: number }>(
      "/user/notifications/read-all",
      {},
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },
};
