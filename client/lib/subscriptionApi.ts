import { api } from "@/lib/api";
import type {
  SubscriptionTier,
  Subscription,
  Transaction,
  GiftCode,
  LessonRequest,
  CouponValidation,
  RecipientInfo,
} from "@/types/subscription";

const getCsrfToken = async (): Promise<string> => {
  const res = await api.get<{ data: { csrfToken: string } }>("/csrf-token");
  return res.data.data.csrfToken;
};

export const subscriptionApi = {
  // ─── Tiers ──────────────────────────────────────────
  getTiers: async () => {
    const res = await api.get<{ success: boolean; data: SubscriptionTier[] }>("/subscriptions/tiers");
    return res.data.data;
  },

  // ─── My Subscription ───────────────────────────────
  getMySubscription: async () => {
    const res = await api.get<{
      success: boolean;
      data: { subscription: Subscription | null; tier: string; expiry: string | null };
    }>("/subscriptions/my");
    return res.data.data;
  },

  // ─── Purchase ──────────────────────────────────────
  purchase: async (tierId: string, billingCycle: "monthly" | "yearly", couponCode?: string, paymentMethod?: string) => {
    const token = await getCsrfToken();
    const res = await api.post(
      "/subscriptions/purchase",
      { tierId, billingCycle, couponCode, paymentMethod },
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // ─── Gift ──────────────────────────────────────────
  purchaseGift: async (
    recipientIdentifier: string,
    tierId: string,
    billingCycle: "monthly" | "yearly",
    giftMessage: string,
    mode: "instant" | "code",
    couponCode?: string,
    paymentMethod?: string
  ) => {
    const token = await getCsrfToken();
    const res = await api.post(
      "/subscriptions/gift",
      { recipientIdentifier, tierId, billingCycle, giftMessage, mode, couponCode, paymentMethod },
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // ─── Redeem Gift Code ──────────────────────────────
  redeem: async (code: string) => {
    const token = await getCsrfToken();
    const res = await api.post(
      "/subscriptions/redeem",
      { code },
      { headers: { "x-csrf-token": token } }
    );
    return res.data;
  },

  // ─── Validate Coupon ──────────────────────────────
  validateCoupon: async (code: string, tierId: string, amount: number) => {
    const token = await getCsrfToken();
    const res = await api.post<{ success: boolean; data: CouponValidation }>(
      "/subscriptions/validate-coupon",
      { code, tierId, amount },
      { headers: { "x-csrf-token": token } }
    );
    return res.data.data;
  },

  // ─── Verify Recipient ─────────────────────────────
  verifyRecipient: async (identifier: string) => {
    const token = await getCsrfToken();
    const res = await api.post<{ success: boolean; data: RecipientInfo }>(
      "/subscriptions/verify-recipient",
      { identifier },
      { headers: { "x-csrf-token": token } }
    );
    return res.data.data;
  },

  // ─── Gift Code Info ────────────────────────────────
  getGiftCodeInfo: async (code: string) => {
    const res = await api.get<{ success: boolean; data: GiftCode }>(`/subscriptions/gift-code/${code}`);
    return res.data.data;
  },

  // ─── Transactions ─────────────────────────────────
  getTransactions: async () => {
    const res = await api.get<{ success: boolean; data: Transaction[] }>("/subscriptions/transactions");
    return res.data.data;
  },

  // ─── Lesson Requests ──────────────────────────────
  createLessonRequest: async (title: string, description: string, historicalPeriod?: string) => {
    const token = await getCsrfToken();
    const res = await api.post<{ success: boolean; data: LessonRequest }>(
      "/subscriptions/lesson-requests",
      { title, description, historicalPeriod },
      { headers: { "x-csrf-token": token } }
    );
    return res.data.data;
  },

  getMyLessonRequests: async () => {
    const res = await api.get<{ success: boolean; data: LessonRequest[] }>("/subscriptions/lesson-requests");
    return res.data.data;
  },

  // ─── Transaction Status Polling ───────────────────
  getTransactionStatus: async (id: string) => {
    const res = await api.get<{ success: boolean; data: { status: string; transactionId: string } }>(
      `/subscriptions/transactions/${id}/status`
    );
    return res.data.data;
  },
};
