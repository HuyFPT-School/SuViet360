import { api, ensureCsrfToken } from './api';

export interface GroupMember {
  user: {
    _id: string;
    name: string;
    avatar?: string;
    role: string;
    level: number;
    xp: number;
  };
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface Group {
  _id: string;
  name: string;
  description: string;
  avatar: string;
  creator: { _id: string; name: string; avatar?: string };
  members: GroupMember[];
  memberCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export const groupApi = {
  getPublicGroups: async (search?: string): Promise<{ success: boolean; data: Group[] }> => {
    let url = '/groups';
    if (search) url += `?search=${encodeURIComponent(search)}`;
    const res = await api.get<{ success: boolean; data: Group[] }>(url);
    return res.data;
  },

  getMyGroups: async (): Promise<{ success: boolean; data: Group[] }> => {
    const res = await api.get<{ success: boolean; data: Group[] }>('/groups/my');
    return res.data;
  },

  getGroupById: async (id: string): Promise<{ success: boolean; data: Group }> => {
    const res = await api.get<{ success: boolean; data: Group }>(`/groups/${id}`);
    return res.data;
  },

  createGroup: async (data: {
    name: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<{ success: boolean; data: Group }> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean; data: Group }>('/groups', data, {
      headers: { 'x-csrf-token': token },
    });
    return res.data;
  },

  joinGroup: async (groupId: string): Promise<{ success: boolean }> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean }>(
      `/groups/${groupId}/join`,
      {},
      { headers: { 'x-csrf-token': token } }
    );
    return res.data;
  },

  leaveGroup: async (groupId: string): Promise<{ success: boolean }> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean }>(
      `/groups/${groupId}/leave`,
      {},
      { headers: { 'x-csrf-token': token } }
    );
    return res.data;
  },
};
