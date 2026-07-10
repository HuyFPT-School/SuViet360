import { api } from "@/lib/api";
import type { User } from "@/types/auth";

export type LessonAnimationName =
  | "idle"
  | "run"
  | "attack"
  | "jump"
  | "hurt"
  | "dead";

export type Tileset = {
  name: string;
  imageUrl: string;
};

export type SpriteFrame = {
  key: string;
  frame: number;
  imageUrl: string;
};

export type Lesson = {
  _id: string;
  title: string;
  content: string;
  game: {
    tilemapJsonUrl: string;
    tilesets: Tileset[];
    character: {
      animations: Partial<Record<LessonAnimationName, SpriteFrame[]>>;
    };
    spawnPoint: {
      x: number;
      y: number;
    };
  };
  createdAt: string;
  updatedAt?: string;
};

export type LessonFormValues = {
  title: string;
  content: string;
  spawnX: string;
  spawnY: string;
  tilesetNames: string;
  tilemapJson: File | null;
  tilesets: FileList | null;
  idleSprites: FileList | null;
  runSprites: FileList | null;
};

type LessonsResponse = {
  success: boolean;
  count: number;
  lessons: Lesson[];
};

type LessonResponse = {
  success: boolean;
  lesson: Lesson;
};

const ensureCsrfToken = async () => {
  const response = await api.get<{ data: { csrfToken: string } }>(
    "/csrf-token"
  );
  return response.data.data.csrfToken;
};

const appendFiles = (
  formData: FormData,
  fieldName: string,
  files: FileList | null
) => {
  if (!files) return;
  Array.from(files).forEach((file) => formData.append(fieldName, file));
};

const toFormData = (values: LessonFormValues) => {
  const formData = new FormData();
  formData.append("title", values.title.trim());
  formData.append("content", values.content.trim());
  formData.append("spawnPoint[x]", values.spawnX);
  formData.append("spawnPoint[y]", values.spawnY);

  let names: string[] = [];
  if (values.tilesetNames && values.tilesetNames.trim()) {
    names = values.tilesetNames
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
  } else if (values.tilesets) {
    names = Array.from(values.tilesets).map((file) => {
      const parts = file.name.split(".");
      parts.pop();
      return parts.join(".");
    });
  }

  if (names.length > 0) {
    formData.append("tilesetNames", JSON.stringify(names));
  }

  if (values.tilemapJson) {
    formData.append("tilemapJson", values.tilemapJson);
  }

  appendFiles(formData, "tilesets", values.tilesets);
  appendFiles(formData, "idleSprites", values.idleSprites);
  appendFiles(formData, "runSprites", values.runSprites);

  return formData;
};

export const adminApi = {
  checkAdmin: async () => {
    const response = await api.get<{ status: string; message: string }>(
      "/auth/admin"
    );
    return response.data;
  },
  getLessons: async () => {
    const response = await api.get<LessonsResponse>("/lessons");
    return response.data;
  },
  createLesson: async (values: LessonFormValues, onUploadProgress?: (progressEvent: any) => void) => {
    const token = await ensureCsrfToken();
    const response = await api.post<LessonResponse>(
      "/lessons",
      toFormData(values),
      {
        headers: { "x-csrf-token": token },
        onUploadProgress,
      }
    );
    return response.data;
  },
  updateLesson: async (id: string, values: LessonFormValues, onUploadProgress?: (progressEvent: any) => void) => {
    const token = await ensureCsrfToken();
    const response = await api.put<LessonResponse>(
      `/lessons/${id}`,
      toFormData(values),
      {
        headers: { "x-csrf-token": token },
        onUploadProgress,
      }
    );
    return response.data;
  },
  deleteLesson: async (id: string) => {
    const token = await ensureCsrfToken();
    const response = await api.delete<{ success: boolean; message: string }>(
      `/lessons/${id}`,
      {
        headers: { "x-csrf-token": token },
      }
    );
    return response.data;
  },
  getAvailableUsers: async () => {
    const response = await api.get<{ status: string; data: User[] }>("/auth/users");
    return response.data.data;
  },
  getSubscriptionDashboardStats: async () => {
    const response = await api.get<{ success: boolean; data: AdminSubscriptionStats }>("/subscriptions/admin/dashboard-stats");
    return response.data.data;
  },
  updateUserRole: async (id: string, role: string) => {
    const token = await ensureCsrfToken();
    const response = await api.patch<{ status: string; message: string }>(
      `/auth/users/${id}/role`,
      { role },
      { headers: { "x-csrf-token": token } }
    );
    return response.data;
  },
  toggleUserLock: async (id: string) => {
    const token = await ensureCsrfToken();
    const response = await api.patch<{ status: string; message: string }>(
      `/auth/users/${id}/toggle-lock`,
      {},
      { headers: { "x-csrf-token": token } }
    );
    return response.data;
  },
  getUserTransactions: async (userId: string) => {
    const response = await api.get<{
      success: boolean;
      data: {
        transactions: any[];
        subscriptions: any[];
      };
    }>(`/subscriptions/admin/users/${userId}/transactions`);
    return response.data.data;
  },
  updateTierPrice: async (id: string, priceMonthly: number, priceYearly: number) => {
    const token = await ensureCsrfToken();
    const response = await api.put<{ success: boolean; message: string }>(
      `/subscriptions/admin/tiers/${id}/price`,
      { priceMonthly, priceYearly },
      { headers: { "x-csrf-token": token } }
    );
    return response.data;
  },
  getCoupons: async () => {
    const response = await api.get<{ success: boolean; data: Coupon[] }>("/subscriptions/coupons");
    return response.data.data;
  },
  createCoupon: async (couponData: any) => {
    const token = await ensureCsrfToken();
    const response = await api.post<{ success: boolean; data: Coupon }>(
      "/subscriptions/coupons",
      couponData,
      { headers: { "x-csrf-token": token } }
    );
    return response.data.data;
  },
  deleteCoupon: async (id: string) => {
    const token = await ensureCsrfToken();
    const response = await api.delete<{ success: boolean; message: string }>(
      `/subscriptions/coupons/${id}`,
      { headers: { "x-csrf-token": token } }
    );
    return response.data;
  },
  getAdminGiftCodes: async (params: { page?: number; limit?: number; status?: string; search?: string }) => {
    const response = await api.get<GiftCodesResponse>("/subscriptions/admin/gift-codes", { params });
    return response.data;
  },
  generateBulkGiftCodes: async (data: {
    tierId: string;
    billingCycle: "monthly" | "yearly";
    giftMessage: string;
    quantity: number;
    expiresInDays: number;
  }) => {
    const token = await ensureCsrfToken();
    const response = await api.post<{ success: boolean; message: string; data: AdminGiftCode[] }>(
      "/subscriptions/admin/gift-codes/bulk",
      data,
      { headers: { "x-csrf-token": token } }
    );
    return response.data;
  },
  deleteGiftCode: async (id: string) => {
    const token = await ensureCsrfToken();
    const response = await api.delete<{ success: boolean; message: string }>(
      `/subscriptions/admin/gift-codes/${id}`,
      { headers: { "x-csrf-token": token } }
    );
    return response.data;
  },
};

export type AdminGiftCode = {
  _id: string;
  code: string;
  tierId: { _id: string; name: string; slug: string };
  billingCycle: "monthly" | "yearly";
  senderId: { _id: string; name: string; email: string };
  recipientEmail?: string;
  giftMessage?: string;
  status: "Pending" | "Redeemed" | "Expired";
  redeemedBy?: { name: string; email: string } | null;
  redeemedAt?: string | null;
  expiresAt: string;
  createdAt: string;
};

export type GiftCodesResponse = {
  success: boolean;
  data: AdminGiftCode[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

export type Coupon = {
  _id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxUses: number;
  usesCount: number;
  minPurchaseAmount: number;
  applicableTiers: string[];
  startDate?: string;
  endDate: string;
  isActive: boolean;
  description: string;
  createdAt: string;
};

export type AdminSubscriptionStats = {
  stats: {
    totalActiveSubscriptions: number;
    totalRevenue: number;
    totalTransactions: number;
    totalUsers: number;
  };
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    transactions: number;
  }>;
  recentTransactions: Array<{
    _id: string;
    transactionId: string;
    buyerId: { name: string; email: string };
    recipientId: { name: string; email: string };
    tierId: { name: string; slug: string };
    amount: number;
    paymentMethod: string;
    createdAt: string;
    isGift: boolean;
    couponCode: string;
  }>;
  subscriptions: Array<{
    _id: string;
    userId: { name: string; email: string; avatar?: string };
    tierId: { name: string; slug: string };
    startDate: string;
    endDate: string;
    billingCycle: "monthly" | "yearly";
    status: "Active" | "Expired" | "Cancelled";
  }>;
};
