import { api, ensureCsrfToken } from './api';

export interface FriendUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  level: number;
  xp: number;
}

export interface FriendEntry {
  friendshipId: string;
  user: FriendUser;
}

export interface FriendRequest {
  _id: string;
  requester: FriendUser;
  recipient: FriendUser;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: string;
}

export const friendApi = {
  getFriends: async (): Promise<{ success: boolean; data: FriendEntry[] }> => {
    const res = await api.get<{ success: boolean; data: FriendEntry[] }>('/friends');
    return res.data;
  },

  getRequests: async (): Promise<{ success: boolean; data: FriendRequest[] }> => {
    const res = await api.get<{ success: boolean; data: FriendRequest[] }>('/friends/requests');
    return res.data;
  },

  getSentRequests: async (): Promise<{ success: boolean; data: FriendRequest[] }> => {
    const res = await api.get<{ success: boolean; data: FriendRequest[] }>('/friends/sent-requests');
    return res.data;
  },

  getSuggestions: async (search?: string): Promise<{ success: boolean; data: FriendUser[] }> => {
    const res = await api.get<{ success: boolean; data: FriendUser[] }>('/friends/suggestions', {
      params: search ? { search } : {},
    });
    return res.data;
  },

  sendRequest: async (userId: string): Promise<{ success: boolean }> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean }>(
      `/friends/request/${userId}`,
      {},
      { headers: { 'x-csrf-token': token } }
    );
    return res.data;
  },

  acceptRequest: async (friendshipId: string): Promise<{ success: boolean }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean }>(
      `/friends/accept/${friendshipId}`,
      {},
      { headers: { 'x-csrf-token': token } }
    );
    return res.data;
  },

  rejectRequest: async (friendshipId: string): Promise<{ success: boolean }> => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean }>(
      `/friends/reject/${friendshipId}`,
      {},
      { headers: { 'x-csrf-token': token } }
    );
    return res.data;
  },

  removeFriend: async (friendshipId: string): Promise<{ success: boolean }> => {
    const token = await ensureCsrfToken();
    const res = await api.delete<{ success: boolean }>(`/friends/${friendshipId}`, {
      headers: { 'x-csrf-token': token },
    });
    return res.data;
  },
};
