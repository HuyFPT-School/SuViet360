export interface NotificationItem {
  _id: string;
  recipient: string;
  type: 'New_Podcast' | 'System';
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
