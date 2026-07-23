import { api, ensureCsrfToken } from './api';

export type LessonAnimationName = 'idle' | 'run' | 'attack' | 'jump' | 'hurt' | 'dead';

export type AdminTileset = {
  name: string;
  imageUrl: string;
};

export type AdminSpriteFrame = {
  key: string;
  frame: number;
  imageUrl: string;
};

export type AdminLesson = {
  _id: string;
  title: string;
  content: string;
  game: {
    tilemapJsonUrl: string;
    tilesets: AdminTileset[];
    character: {
      animations: Partial<Record<LessonAnimationName, AdminSpriteFrame[]>>;
    };
    spawnPoint: {
      x: number;
      y: number;
    };
  };
  createdAt: string;
  updatedAt?: string;
};

export type AdminSubscriptionStats = {
  stats: {
    totalActiveSubscriptions: number;
    totalRevenue: number;
    totalTransactions: number;
    totalUsers: number;
  };
  monthlyRevenue: Array<{ month: string; revenue: number; transactions: number }>;
};

export type Coupon = {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses: number;
  currentUses: number;
  expiresAt: string;
  isActive: boolean;
  description: string;
};

export const adminApi = {
  // ─── Auth ──────────────────────────────────────────
  checkAdmin: async () => {
    const res = await api.get('/auth/admin');
    return res.data;
  },

  // ─── Lessons ───────────────────────────────────────
  getLessons: async (): Promise<AdminLesson[]> => {
    const res = await api.get<{ success: boolean; lessons: AdminLesson[] }>('/lessons/staff');
    return res.data.lessons;
  },

  getLessonById: async (id: string): Promise<AdminLesson> => {
    const res = await api.get<{ success: boolean; lesson: AdminLesson }>(`/lessons/${id}`);
    return res.data.lesson;
  },

  createLesson: async (formData: FormData, onUploadProgress?: (e: any) => void) => {
    const token = await ensureCsrfToken();
    const res = await api.post('/lessons', formData, {
      headers: { 'x-csrf-token': token, 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return res.data;
  },

  updateLesson: async (id: string, formData: FormData, onUploadProgress?: (e: any) => void) => {
    const token = await ensureCsrfToken();
    const res = await api.put(`/lessons/${id}`, formData, {
      headers: { 'x-csrf-token': token, 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return res.data;
  },

  deleteLesson: async (id: string) => {
    const token = await ensureCsrfToken();
    const res = await api.delete(`/lessons/${id}`, {
      headers: { 'x-csrf-token': token },
    });
    return res.data;
  },

  // ─── Podcasts ──────────────────────────────────────
  getPodcasts: async () => {
    const res = await api.get('/staff/podcasts');
    return res.data.data || res.data.podcasts || [];
  },

  getPodcastById: async (id: string) => {
    const res = await api.get(`/staff/podcasts/${id}`);
    return res.data.data;
  },

  createPodcast: async (formData: FormData, onUploadProgress?: (e: any) => void) => {
    const token = await ensureCsrfToken();
    const res = await api.post('/staff/podcasts', formData, {
      headers: { 'x-csrf-token': token, 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return res.data;
  },

  updatePodcast: async (id: string, formData: FormData, onUploadProgress?: (e: any) => void) => {
    const token = await ensureCsrfToken();
    const res = await api.put(`/staff/podcasts/${id}`, formData, {
      headers: { 'x-csrf-token': token, 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return res.data;
  },

  deletePodcast: async (id: string) => {
    const token = await ensureCsrfToken();
    const res = await api.delete(`/staff/podcasts/${id}`, {
      headers: { 'x-csrf-token': token },
    });
    return res.data;
  },

  // ─── Users ─────────────────────────────────────────
  getAvailableUsers: async () => {
    const res = await api.get('/auth/users');
    return res.data;
  },

  updateUserRole: async (id: string, role: string) => {
    const token = await ensureCsrfToken();
    const res = await api.patch(`/auth/users/${id}/role`, { role }, {
      headers: { 'x-csrf-token': token },
    });
    return res.data;
  },

  toggleUserLock: async (id: string) => {
    const token = await ensureCsrfToken();
    const res = await api.patch(`/auth/users/${id}/toggle-lock`, {}, {
      headers: { 'x-csrf-token': token },
    });
    return res.data;
  },

  // ─── Subscriptions ─────────────────────────────────
  getSubscriptionDashboardStats: async (): Promise<AdminSubscriptionStats> => {
    const res = await api.get<{ success: boolean; data: AdminSubscriptionStats }>('/subscriptions/admin/dashboard-stats');
    return res.data.data;
  },

  getUserTransactions: async (userId: string) => {
    const res = await api.get(`/subscriptions/admin/users/${userId}/transactions`);
    return res.data;
  },

  updateTierPrice: async (id: string, priceMonthly: number, priceYearly: number) => {
    const token = await ensureCsrfToken();
    const res = await api.put(`/subscriptions/admin/tiers/${id}/price`, { priceMonthly, priceYearly }, {
      headers: { 'x-csrf-token': token },
    });
    return res.data;
  },

  // ─── Coupons ───────────────────────────────────────
  getCoupons: async (): Promise<Coupon[]> => {
    const res = await api.get<{ success: boolean; data: Coupon[] }>('/subscriptions/coupons');
    return res.data.data;
  },

  createCoupon: async (couponData: {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    maxUses?: number;
    minPurchaseAmount?: number;
    applicableTiers?: string[];
    endDate?: string;
    expiresAt?: string;
    description?: string;
  }) => {
    const token = await ensureCsrfToken();
    const res = await api.post('/subscriptions/coupons', couponData, {
      headers: { 'x-csrf-token': token },
    });
    return res.data;
  },

  deleteCoupon: async (id: string) => {
    const token = await ensureCsrfToken();
    const res = await api.delete(`/subscriptions/coupons/${id}`, {
      headers: { 'x-csrf-token': token },
    });
    return res.data;
  },
};
