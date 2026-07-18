import { api } from "@/lib/api";
import type { BlogPost } from "@/types/blog";

const ensureCsrfToken = async () => {
  const response = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
  return response.data.data.csrfToken;
};

export interface GroupMember {
  user: {
    _id: string;
    name: string;
    avatar?: string;
    role: string;
    level: number;
    xp: number;
  };
  role: "admin" | "member";
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
    let url = "/groups";
    if (search) url += `?search=${encodeURIComponent(search)}`;
    const res = await api.get(url);
    return res.data;
  },

  getMyGroups: async (): Promise<{ success: boolean; data: Group[] }> => {
    const res = await api.get("/groups/my");
    return res.data;
  },

  getGroupById: async (id: string): Promise<{ success: boolean; data: Group }> => {
    const res = await api.get(`/groups/${id}`);
    return res.data;
  },

  createGroup: async (data: {
    name: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<{ success: boolean; data: Group }> => {
    const token = await ensureCsrfToken();
    const res = await api.post("/groups", data, {
      headers: { "x-csrf-token": token },
    });
    return res.data;
  },

  updateGroup: async (
    id: string,
    data: { name?: string; description?: string; isPublic?: boolean }
  ): Promise<{ success: boolean; data: Group }> => {
    const token = await ensureCsrfToken();
    const res = await api.put(`/groups/${id}`, data, {
      headers: { "x-csrf-token": token },
    });
    return res.data;
  },

  joinGroup: async (id: string): Promise<{ success: boolean }> => {
    const token = await ensureCsrfToken();
    const res = await api.post(`/groups/${id}/join`, {}, {
      headers: { "x-csrf-token": token },
    });
    return res.data;
  },

  leaveGroup: async (id: string): Promise<{ success: boolean }> => {
    const token = await ensureCsrfToken();
    const res = await api.post(`/groups/${id}/leave`, {}, {
      headers: { "x-csrf-token": token },
    });
    return res.data;
  },

  getGroupPosts: async (
    id: string,
    page = 1,
    limit = 10
  ): Promise<{
    success: boolean;
    data: BlogPost[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> => {
    const res = await api.get(`/groups/${id}/posts?page=${page}&limit=${limit}`);
    return res.data;
  },

  moderatePost: async (
    groupId: string,
    postId: string,
    action: "approve" | "reject",
    feedback?: string
  ): Promise<{ success: boolean }> => {
    const token = await ensureCsrfToken();
    const res = await api.put(
      `/groups/${groupId}/posts/${postId}/moderate`,
      { action, feedback },
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },
};
