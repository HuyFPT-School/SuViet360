import { api, ensureCsrfToken } from './api';
import type {
  SubscriptionTier,
  Transaction,
  GiftCode,
  LessonRequest,
  CouponValidation,
  RecipientInfo,
} from '@/types/subscription';

export const subscriptionApi = {
  // ─── Tiers ──────────────────────────────────────────
  getTiers: async (): Promise<SubscriptionTier[]> => {
    const res = await api.get<{ success: boolean; data: SubscriptionTier[] }>('/subscriptions/tiers');
    return res.data.data;
  },

  // ─── My Subscription ───────────────────────────────
  getMySubscription: async (): Promise<{
    subscription: any | null;
    tier: string;
    expiry: string | null;
  }> => {
    const res = await api.get<{
      success: boolean;
      data: { subscription: any | null; tier: string; expiry: string | null };
    }>('/subscriptions/my');
    return res.data.data;
  },

  // ─── Purchase ──────────────────────────────────────
  purchase: async (
    tierId: string,
    billingCycle: 'monthly' | 'yearly',
    couponCode?: string,
    paymentMethod?: string,
  ) => {
    const token = await ensureCsrfToken();
    const res = await api.post(
      '/subscriptions/purchase',
      { tierId, billingCycle, couponCode, paymentMethod },
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  // ─── Gift ──────────────────────────────────────────
  purchaseGift: async (
    recipientIdentifier: string,
    tierId: string,
    billingCycle: 'monthly' | 'yearly',
    giftMessage: string,
    mode: 'instant' | 'code',
    couponCode?: string,
    paymentMethod?: string,
  ) => {
    const token = await ensureCsrfToken();
    const res = await api.post(
      '/subscriptions/gift',
      { recipientIdentifier, tierId, billingCycle, giftMessage, mode, couponCode, paymentMethod },
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  // ─── Redeem Gift Code ──────────────────────────────
  redeem: async (code: string) => {
    const token = await ensureCsrfToken();
    const res = await api.post(
      '/subscriptions/redeem',
      { code },
      { headers: { 'x-csrf-token': token } },
    );
    return res.data;
  },

  // ─── Validate Coupon ──────────────────────────────
  validateCoupon: async (code: string, tierId: string, amount: number): Promise<CouponValidation> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean; data: CouponValidation }>(
      '/subscriptions/validate-coupon',
      { code, tierId, amount },
      { headers: { 'x-csrf-token': token } },
    );
    return res.data.data;
  },

  // ─── Verify Recipient ─────────────────────────────
  verifyRecipient: async (identifier: string): Promise<RecipientInfo> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean; data: RecipientInfo }>(
      '/subscriptions/verify-recipient',
      { identifier },
      { headers: { 'x-csrf-token': token } },
    );
    return res.data.data;
  },

  // ─── Gift Code Info ────────────────────────────────
  getGiftCodeInfo: async (code: string): Promise<GiftCode> => {
    const res = await api.get<{ success: boolean; data: GiftCode }>(`/subscriptions/gift-code/${code}`);
    return res.data.data;
  },

  // ─── Transactions ─────────────────────────────────
  getTransactions: async (): Promise<Transaction[]> => {
    const res = await api.get<{ success: boolean; data: Transaction[] }>('/subscriptions/transactions');
    return res.data.data;
  },

  // ─── Lesson Requests ──────────────────────────────
  createLessonRequest: async (
    title: string,
    description: string,
    historicalPeriod?: string,
  ): Promise<LessonRequest> => {
    const token = await ensureCsrfToken();
    const res = await api.post<{ success: boolean; data: LessonRequest }>(
      '/subscriptions/lesson-requests',
      { title, description, historicalPeriod },
      { headers: { 'x-csrf-token': token } },
    );
    return res.data.data;
  },

  getMyLessonRequests: async (): Promise<LessonRequest[]> => {
    const res = await api.get<{ success: boolean; data: LessonRequest[] }>('/subscriptions/lesson-requests');
    return res.data.data;
  },

  getTeacherLessonRequests: async (): Promise<LessonRequest[]> => {
    const res = await api.get<{ success: boolean; data: LessonRequest[] }>('/subscriptions/lesson-requests/teacher');
    return res.data.data;
  },

  acceptLessonRequest: async (id: string) => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; data: any }>(`/subscriptions/lesson-requests/${id}/accept`, {}, { headers: { 'x-csrf-token': token } });
    return res.data.data;
  },

  rejectLessonRequest: async (id: string, reason: string) => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; data: any }>(`/subscriptions/lesson-requests/${id}/reject`, { reason }, { headers: { 'x-csrf-token': token } });
    return res.data.data;
  },

  startLessonRequest: async (id: string) => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; data: any }>(`/subscriptions/lesson-requests/${id}/in-progress`, {}, { headers: { 'x-csrf-token': token } });
    return res.data.data;
  },

  completeLessonRequest: async (id: string, resultPodcastId: string) => {
    const token = await ensureCsrfToken();
    const res = await api.put<{ success: boolean; data: any }>(`/subscriptions/lesson-requests/${id}/complete`, { resultPodcastId }, { headers: { 'x-csrf-token': token } });
    return res.data.data;
  },

  // ─── Transaction Status Polling ───────────────────
  getTransactionStatus: async (id: string): Promise<{ status: string; transactionId: string }> => {
    const res = await api.get<{ success: boolean; data: { status: string; transactionId: string } }>(
      `/subscriptions/transactions/${id}/status`,
    );
    return res.data.data;
  },
};
