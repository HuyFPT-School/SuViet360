"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { subscriptionApi } from "@/lib/subscriptionApi";
import { useAuth } from "@/hooks/useAuth";
import type { SubscriptionTier, Subscription, LessonRequest } from "@/types/subscription";
import "./subscription.css";

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  // Tab State: "tiers" | "redeem" | "request"
  const [activeTab, setActiveTab] = useState<"tiers" | "redeem" | "request">("tiers");

  // Subscription cycle: "monthly" | "yearly"
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // API Data States
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [currentSub, setCurrentSub] = useState<{
    subscription: Subscription | null;
    tier: string;
    expiry: string | null;
  } | null>(null);
  const [lessonRequests, setLessonRequests] = useState<LessonRequest[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [loadingSub, setLoadingSub] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Form States
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState<any>(null);

  // Lesson Request Form States
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDesc, setLessonDesc] = useState("");
  const [lessonPeriod, setLessonPeriod] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const fetchTiersAndSub = async () => {
      try {
        setLoadingTiers(true);
        const fetchedTiers = await subscriptionApi.getTiers();
        // Sort tiers by display order
        setTiers(fetchedTiers.sort((a, b) => a.displayOrder - b.displayOrder));
      } catch (err) {
        console.error("Error fetching tiers:", err);
      } finally {
        setLoadingTiers(false);
      }

      try {
        setLoadingSub(true);
        const subInfo = await subscriptionApi.getMySubscription();
        setCurrentSub(subInfo);
      } catch (err) {
        console.error("Error fetching subscription status:", err);
      } finally {
        setLoadingSub(false);
      }
    };

    fetchTiersAndSub();
  }, []);

  // Fetch lesson requests if user is Student Pro
  useEffect(() => {
    const isPro = currentSub?.tier?.toLowerCase() === "student pro" || currentSub?.tier?.toLowerCase() === "student-pro" || user?.subscriptionTier === "Student Pro";
    if (activeTab === "request" && isPro) {
      const fetchRequests = async () => {
        try {
          setLoadingRequests(true);
          const requests = await subscriptionApi.getMyLessonRequests();
          setLessonRequests(requests);
        } catch (err) {
          console.error("Error fetching lesson requests:", err);
        } finally {
          setLoadingRequests(false);
        }
      };
      fetchRequests();
    }
  }, [activeTab, currentSub, user]);

  // Handle Redeem
  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim()) {
      setRedeemError("Vui lòng nhập mã quà tặng.");
      return;
    }
    setRedeemLoading(true);
    setRedeemError("");
    setRedeemSuccess(null);

    try {
      const result = await subscriptionApi.redeem(redeemCode.trim());
      setRedeemSuccess(result);
      setRedeemCode("");
      // Refresh user details and subscription
      await refreshUser();
      const subInfo = await subscriptionApi.getMySubscription();
      setCurrentSub(subInfo);
    } catch (err: any) {
      console.error(err);
      setRedeemError(
        err.response?.data?.message || "Kích hoạt mã thất bại. Vui lòng kiểm tra lại mã."
      );
    } finally {
      setRedeemLoading(false);
    }
  };

  // Handle Lesson Request Submit
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim() || !lessonDesc.trim() || !lessonPeriod.trim()) {
      setRequestError("Vui lòng điền đầy đủ tất cả thông tin.");
      return;
    }
    setRequestLoading(true);
    setRequestError("");
    setRequestSuccess(false);

    try {
      const newRequest = await subscriptionApi.createLessonRequest(
        lessonTitle.trim(),
        lessonDesc.trim(),
        lessonPeriod.trim()
      );
      setLessonRequests((prev) => [newRequest, ...prev]);
      setLessonTitle("");
      setLessonDesc("");
      setLessonPeriod("");
      setRequestSuccess(true);
      setTimeout(() => setRequestSuccess(false), 5000);
    } catch (err: any) {
      console.error(err);
      setRequestError(err.response?.data?.message || "Gửi yêu cầu bài học thất bại.");
    } finally {
      setRequestLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "Pending":
        return "Chờ duyệt";
      case "Accepted":
        return "Đã nhận";
      case "InProgress":
        return "Đang soạn thảo";
      case "Completed":
        return "Đã hoàn thành";
      case "Rejected":
        return "Từ chối";
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Pending":
        return "status-pending";
      case "Accepted":
        return "status-accepted";
      case "InProgress":
        return "status-inprogress";
      case "Completed":
        return "status-completed";
      case "Rejected":
        return "status-rejected";
      default:
        return "";
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("vi-VN") + "đ";
  };

  // Helper check for tier level
  const userTier = currentSub?.tier || user?.subscriptionTier || "Free";
  const isPro = userTier.toLowerCase() === "student pro" || userTier.toLowerCase() === "student-pro" || userTier === "Student Pro";

  // Fallback tiers data in case MongoDB is empty/not loaded
  const fallbackTiers = [
    {
      _id: "free",
      name: "Free",
      slug: "free",
      priceMonthly: 0,
      priceYearly: 0,
      features: {
        dailyAIQueries: 3,
        premiumLessons: false,
        customLessonRequest: false,
        bonusXPMultiplier: 1.0,
      },
      description: "Trải nghiệm cơ bản với các bài học lịch sử Việt Nam",
      badge: "🆓",
    },
    {
      _id: "student-plus",
      name: "Student Plus",
      slug: "student-plus",
      priceMonthly: 49000,
      priceYearly: 490000,
      features: {
        dailyAIQueries: 20,
        premiumLessons: true,
        customLessonRequest: false,
        bonusXPMultiplier: 1.5,
      },
      description: "Mở khóa bài học premium và tăng tốc học tập",
      badge: "⭐",
    },
    {
      _id: "student-pro",
      name: "Student Pro",
      slug: "student-pro",
      priceMonthly: 99000,
      priceYearly: 990000,
      features: {
        dailyAIQueries: -1,
        premiumLessons: true,
        customLessonRequest: true,
        bonusXPMultiplier: 2.0,
      },
      description: "Trải nghiệm tối đa với AI không giới hạn và yêu cầu bài học riêng",
      badge: "💎",
    },
  ];

  const displayedTiers = tiers.length > 0 ? tiers : (fallbackTiers as unknown as SubscriptionTier[]);

  return (
    <div className="sub-page-wrapper">
      <div className="sub-container">
        
        {/* Title */}
        <h1 className="sub-title">Gói VIP Thành Viên</h1>
        <p className="sub-subtitle">Mở rộng kiến thức, tăng tốc hành trình khám phá Lịch Sử Việt</p>

        {/* Current Active Package Status Bar */}
        {!loadingSub && (
          <div className="user-sub-status">
            <div className="user-sub-info">
              <div className="flex flex-col gap-1">
                <span className="text-muted text-xs uppercase tracking-wider font-semibold">
                  Gói hiện tại của bạn
                </span>
                <div className="flex items-center gap-2">
                  <span className="user-sub-badge">{userTier}</span>
                  {userTier.toLowerCase() !== "free" && currentSub?.subscription?.billingCycle && (
                    <span className="text-xs text-amber-500/80 italic font-medium">
                      ({currentSub.subscription.billingCycle === "monthly" ? "Thanh toán theo Tháng" : "Thanh toán theo Năm"})
                    </span>
                  )}
                </div>
              </div>
            </div>
            {userTier.toLowerCase() !== "free" && currentSub?.expiry && (
              <div className="user-sub-expiry flex items-center gap-2">
                <span className="text-muted">Hết hạn vào:</span>
                <span className="font-semibold text-gold">
                  {new Date(currentSub.expiry).toLocaleDateString("vi-VN")}
                </span>
              </div>
            )}
            {userTier.toLowerCase() === "free" && (
              <span className="text-sm text-gold-dark italic">
                Nâng cấp lên gói VIP để mở khóa toàn bộ tính năng và bài học độc quyền.
              </span>
            )}
          </div>
        )}

        {/* Tabs navigation */}
        <div className="sub-tabs">
          <button
            className={`sub-tab-btn ${activeTab === "tiers" ? "active" : ""}`}
            onClick={() => setActiveTab("tiers")}
          >
            Gói Thành Viên
          </button>
          <button
            className={`sub-tab-btn ${activeTab === "redeem" ? "active" : ""}`}
            onClick={() => setActiveTab("redeem")}
          >
            Mã Quà Tặng (Redeem)
          </button>
          <button
            className={`sub-tab-btn ${activeTab === "request" ? "active" : ""}`}
            onClick={() => setActiveTab("request")}
          >
            Yêu Cầu Bài Học (Pro)
          </button>
        </div>

        {/* Tab CONTENT: GÓI THÀNH VIÊN */}
        {activeTab === "tiers" && (
          <div>
            {/* Cycle Toggle */}
            <div className="flex justify-center mb-10">
              <div className="tier-cycle-toggle">
                <button
                  className={`tier-cycle-btn ${billingCycle === "monthly" ? "active" : ""}`}
                  onClick={() => setBillingCycle("monthly")}
                >
                  Thanh Toán Tháng
                </button>
                <button
                  className={`tier-cycle-btn ${billingCycle === "yearly" ? "active" : ""}`}
                  onClick={() => setBillingCycle("yearly")}
                >
                  Thanh Toán Năm (Tiết kiệm 20%)
                </button>
              </div>
            </div>

            {/* Grid of tiers */}
            {loadingTiers ? (
              <div className="text-center py-20">
                <div className="inline-block w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gold italic">Đang tải danh sách các gói dịch vụ...</p>
              </div>
            ) : (
              <div className="tier-grid">
                {displayedTiers.map((tier) => {
                  const isCurrent =
                    userTier.toLowerCase() === tier.slug.toLowerCase() ||
                    userTier.toLowerCase() === tier.name.toLowerCase();

                  const isFree = tier.slug === "free";
                  const price = billingCycle === "monthly" ? tier.priceMonthly : tier.priceYearly;

                  return (
                    <div
                      key={tier._id}
                      className={`tier-card ${tier.slug === "student-plus" ? "featured" : ""}`}
                    >
                      <div className="tier-header">
                        <div className="text-3xl mb-2">{tier.badge || (isFree ? "🆓" : tier.slug === "student-plus" ? "⭐" : "💎")}</div>
                        <h3 className="tier-name">{tier.name}</h3>
                        <p className="text-muted text-sm px-4 min-h-[40px]">{tier.description}</p>
                        <div className="tier-price-box">
                          <span className="tier-price">{formatPrice(price)}</span>
                          {!isFree && (
                            <span className="tier-period">
                              /{billingCycle === "monthly" ? "tháng" : "năm"}
                            </span>
                          )}
                        </div>
                      </div>

                      <ul className="tier-features">
                        {/* feature 1: AI queries */}
                        <li className="tier-feature-item">
                          <svg className="tier-feature-icon w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            {tier.features.dailyAIQueries === -1
                              ? "Không giới hạn AI"
                              : `${tier.features.dailyAIQueries} lượt truy vấn AI/ngày`}
                          </span>
                        </li>

                        {/* feature 2: Premium lessons */}
                        <li className={`tier-feature-item ${!tier.features.premiumLessons ? "disabled" : ""}`}>
                          {tier.features.premiumLessons ? (
                            <svg className="tier-feature-icon w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="tier-feature-icon disabled w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                          <span>
                            {tier.features.premiumLessons
                              ? "Mở khóa bài học Premium"
                              : "Không học được bài Premium"}
                          </span>
                        </li>

                        {/* feature 3: Custom Lesson requests */}
                        <li className={`tier-feature-item ${!tier.features.customLessonRequest ? "disabled" : ""}`}>
                          {tier.features.customLessonRequest ? (
                            <svg className="tier-feature-icon w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="tier-feature-icon disabled w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                          <span>
                            {tier.features.customLessonRequest
                              ? "Quyền yêu cầu bài học riêng"
                              : "Không yêu cầu bài học riêng"}
                          </span>
                        </li>

                        {/* feature 4: Multiplier */}
                        <li className="tier-feature-item">
                          <svg className="tier-feature-icon w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>
                            Tốc độ XP: Multiplier {tier.features.bonusXPMultiplier.toFixed(1)} (
                            {tier.features.bonusXPMultiplier >= 2.0
                              ? "Bậc thầy"
                              : tier.features.bonusXPMultiplier >= 1.5
                              ? "Học nhanh"
                              : "Thường"}
                            )
                          </span>
                        </li>
                      </ul>

                      {isFree ? (
                        <button className="btn-gold-outline" disabled>
                          Gói mặc định
                        </button>
                      ) : isCurrent ? (
                        <button className="btn-gold-outline" disabled>
                          Đang kích hoạt
                        </button>
                      ) : (
                        <button
                          className="btn-gold"
                          onClick={() => {
                            router.push(`/subscription/checkout?tierId=${tier._id}&cycle=${billingCycle}`);
                          }}
                        >
                          Nâng Cấp Ngay
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab CONTENT: MÃ QUÀ TẶNG (REDEEM) */}
        {activeTab === "redeem" && (
          <div className="sub-card redeem-wrap">
            <h2 className="sub-title" style={{ fontSize: "1.4rem", marginBottom: "16px" }}>
              Kích Hoạt Mã Quà Tặng
            </h2>
            <p className="redeem-description">
              Nhập mã quà tặng hoặc mã kích hoạt mà bạn nhận được (định dạng GIFT-XXXX-XXXX-XXXX) để kích hoạt gói thành viên VIP của bạn ngay lập tức.
            </p>

            {redeemSuccess && (
              <div className="mb-6 p-4 bg-emerald-950/50 border border-emerald-500 rounded-lg text-left">
                <div className="success-badge font-semibold">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Kích hoạt thành công!
                </div>
                <p className="text-sm mt-2 text-emerald-200">
                  Chúc mừng! Bạn đã kích hoạt gói{" "}
                  <strong className="text-gold">
                    {redeemSuccess.data?.tierName || redeemSuccess.data?.tier?.name || "VIP"}
                  </strong>{" "}
                  thành công thông qua mã quà tặng.
                </p>
                {redeemSuccess.data?.senderName && (
                  <p className="text-sm mt-1 text-emerald-200">
                    Người gửi: <strong>{redeemSuccess.data.senderName}</strong>
                  </p>
                )}
                {redeemSuccess.data?.giftMessage && (
                  <p className="text-sm mt-2 p-2 bg-emerald-950/70 italic rounded border border-emerald-900 text-emerald-300">
                    &ldquo;{redeemSuccess.data.giftMessage}&rdquo;
                  </p>
                )}
              </div>
            )}

            {redeemError && (
              <div className="mb-6 p-4 bg-rose-950/50 border border-rose-500 rounded-lg text-rose-200 text-left text-sm">
                <div className="error-badge font-semibold">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Kích hoạt thất bại
                </div>
                <p className="mt-1">{redeemError}</p>
              </div>
            )}

            <form onSubmit={handleRedeem} className="text-left">
              <div className="form-group">
                <label className="form-label" htmlFor="code-input">
                  Nhập mã kích hoạt
                </label>
                <input
                  id="code-input"
                  className="input-gold"
                  type="text"
                  placeholder="GIFT-XXXX-XXXX-XXXX"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  disabled={redeemLoading}
                />
              </div>

              <button type="submit" className="btn-gold" disabled={redeemLoading}>
                {redeemLoading ? "Đang kích hoạt..." : "Kích hoạt gói ngay"}
              </button>
            </form>
          </div>
        )}

        {/* Tab CONTENT: YÊU CẦU BÀI HỌC (PRO) */}
        {activeTab === "request" && (
          <div>
            {!isPro ? (
              <div className="sub-card lock-screen">
                <div className="lock-icon">🔒</div>
                <h2 className="lock-title">Tính năng dành riêng cho Student Pro</h2>
                <p className="text-muted max-w-md mx-auto">
                  Tính năng yêu cầu soạn thảo bài học lịch sử theo chủ đề riêng chỉ dành cho các thành viên sở hữu gói <strong>Student Pro</strong>. Vui lòng nâng cấp gói để tiếp tục.
                </p>
                <button
                  className="btn-gold max-w-[240px] mt-4"
                  onClick={() => setActiveTab("tiers")}
                >
                  Nâng Cấp Gói Ngay
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Form submit */}
                <div className="sub-card">
                  <h2 className="sub-title" style={{ fontSize: "1.3rem", textAlign: "left", marginBottom: "20px" }}>
                    Yêu Cầu Bài Học Mới
                  </h2>
                  <p className="text-muted text-sm mb-6">
                    Là thành viên Student Pro, bạn có thể yêu cầu đội ngũ giáo viên biên soạn một bài học lịch sử chi tiết theo đúng chủ đề bạn quan tâm.
                  </p>

                  {requestSuccess && (
                    <div className="mb-6 p-4 bg-emerald-950/50 border border-emerald-500 rounded-lg text-emerald-200 text-sm">
                      Gửi yêu cầu bài học thành công! Đội ngũ giáo viên sẽ xem xét và phản hồi trong thời gian sớm nhất.
                    </div>
                  )}

                  {requestError && (
                    <div className="mb-6 p-4 bg-rose-950/50 border border-rose-500 rounded-lg text-rose-200 text-sm">
                      {requestError}
                    </div>
                  )}

                  <form onSubmit={handleRequestSubmit}>
                    <div className="form-group">
                      <label className="form-label">Tiêu đề bài học</label>
                      <input
                        className="input-gold"
                        type="text"
                        placeholder="Ví dụ: Chiến dịch Điện Biên Phủ trên không"
                        value={lessonTitle}
                        onChange={(e) => setLessonTitle(e.target.value)}
                        disabled={requestLoading}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Thời kỳ lịch sử</label>
                      <input
                        className="input-gold"
                        type="text"
                        placeholder="Ví dụ: Lịch sử Việt Nam hiện đại (1954 - 1975)"
                        value={lessonPeriod}
                        onChange={(e) => setLessonPeriod(e.target.value)}
                        disabled={requestLoading}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Mô tả chi tiết yêu cầu</label>
                      <textarea
                        className="input-gold textarea-gold"
                        placeholder="Mô tả các nội dung bạn muốn bài học tập trung khai thác (ví dụ: bối cảnh lịch sử, diễn biến chính, ý nghĩa chiến lược...)"
                        value={lessonDesc}
                        onChange={(e) => setLessonDesc(e.target.value)}
                        disabled={requestLoading}
                      />
                    </div>

                    <button type="submit" className="btn-gold" disabled={requestLoading}>
                      {requestLoading ? "Đang gửi..." : "Gửi yêu cầu biên soạn"}
                    </button>
                  </form>
                </div>

                {/* History list */}
                <div className="sub-card">
                  <h2 className="sub-title" style={{ fontSize: "1.3rem", textAlign: "left", marginBottom: "20px" }}>
                    Yêu Cầu Đã Gửi
                  </h2>

                  {loadingRequests ? (
                    <div className="text-center py-10">
                      <div className="inline-block w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-2 text-muted text-sm italic">Đang tải lịch sử yêu cầu...</p>
                    </div>
                  ) : lessonRequests.length === 0 ? (
                    <p className="text-muted italic text-center py-10">
                      Bạn chưa gửi yêu cầu bài học nào.
                    </p>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto pr-2 flex flex-col gap-4">
                      {lessonRequests.map((req) => (
                        <div key={req._id} className="request-card m-0">
                          <div className="request-header">
                            <span className="request-title-text">{req.title}</span>
                            <span className={`request-status ${getStatusClass(req.status)}`}>
                              {getStatusText(req.status)}
                            </span>
                          </div>
                          <p className="request-desc">{req.description}</p>
                          <div className="request-meta">
                            <span>Thời kỳ: <strong>{req.historicalPeriod}</strong></span>
                            <span>Ngày gửi: {new Date(req.createdAt).toLocaleDateString("vi-VN")}</span>
                          </div>
                          {req.teacherResponse && (
                            <div className="mt-4 p-3 bg-amber-950/40 border border-amber-900 rounded text-sm">
                              <p className="text-gold font-semibold text-xs uppercase mb-1">
                                Phản hồi từ giáo viên:
                              </p>
                              <p className="text-amber-100/90 italic">{req.teacherResponse}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
