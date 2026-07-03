export interface SubscriptionTier {
  _id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  features: {
    dailyAIQueries: number;
    premiumLessons: boolean;
    customLessonRequest: boolean;
    bonusXPMultiplier: number;
  };
  isActive: boolean;
  displayOrder: number;
  description: string;
  badge: string;
}

export interface Subscription {
  _id: string;
  userId: string;
  tierId: SubscriptionTier;
  status: "Active" | "Expired" | "Cancelled";
  startDate: string;
  endDate: string;
  billingCycle: "monthly" | "yearly";
  autoRenew: boolean;
  giftedBy?: string;
  giftMessage?: string;
}

export interface Transaction {
  _id: string;
  transactionId: string;
  buyerId: { _id: string; name: string; email: string };
  recipientId: { _id: string; name: string; email: string };
  tierId: { _id: string; name: string; slug: string };
  amount: number;
  originalAmount: number;
  currency: string;
  billingCycle: "monthly" | "yearly";
  status: "Pending" | "Completed" | "Failed" | "Refunded";
  paymentMethod: string;
  isGift: boolean;
  giftMessage: string;
  couponCode: string;
  discountAmount: number;
  createdAt: string;
}

export interface GiftCode {
  code: string;
  tier: SubscriptionTier;
  sender: { _id: string; name: string; avatar?: string };
  billingCycle: "monthly" | "yearly";
  giftMessage: string;
  status: "Pending" | "Redeemed" | "Expired";
  expiresAt: string;
}

export interface LessonRequest {
  _id: string;
  requesterId: string | { _id: string; name: string; avatar?: string; email?: string };
  title: string;
  description: string;
  historicalPeriod: string;
  status: "Pending" | "Accepted" | "InProgress" | "Completed" | "Rejected";
  assignedTeacherId?: { _id: string; name: string; avatar?: string };
  teacherResponse: string;
  resultLessonId?: { _id: string; title: string };
  createdAt: string;
}

export interface CouponValidation {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discount: number;
  description: string;
}

export interface RecipientInfo {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}
