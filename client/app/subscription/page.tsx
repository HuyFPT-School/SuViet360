"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { subscriptionApi } from "@/lib/subscriptionApi";
import { useAuth } from "@/hooks/useAuth";
import type { SubscriptionTier, Subscription, LessonRequest } from "@/types/subscription";
import "./subscription.css";

const LockIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  // Auth Modal State for Unauthenticated Visitors
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingTargetUrl, setPendingTargetUrl] = useState<string>("/subscription");

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
    if (!user) {
      setPendingTargetUrl("/subscription");
      setShowAuthModal(true);
      return;
    }
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
    if (!user) {
      setPendingTargetUrl("/subscription");
      setShowAuthModal(true);
      return;
    }
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

  const handleCancelRequest = async (id: string, title: string) => {
    const ok = window.confirm(`Bạn có chắc chắn muốn hủy yêu cầu bài học "${title}"?`);
    if (!ok) return;

    try {
      await subscriptionApi.deleteLessonRequest(id);
      setLessonRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || "Không thể hủy yêu cầu bài học.");
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
      badge: "Free",
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
      badge: "Plus",
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
      badge: "Pro",
    },
  ];

  const displayedTiers = tiers.length > 0 ? tiers : (fallbackTiers as unknown as SubscriptionTier[]);

  const renderTierIcon = (slug: string) => {
    const s = slug.toLowerCase();
    if (s === "student-pro") {
      return (
        <svg className="w-10 h-10 fill-amber-300/10 text-amber-300 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 12 12 2l6 10-6 10-6-10Z" />
          <path d="M12 2v20" />
          <path d="M6 12h12" />
        </svg>
      );
    }
    if (s === "student-plus") {
      return (
        <svg className="w-10 h-10 fill-yellow-300/10 text-yellow-300 mx-auto animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    }
    return (
      <svg className="w-10 h-10 fill-stone-400/10 text-stone-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  };

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

                  const getTierLevel = (slugName: string): number => {
                    const s = slugName.toLowerCase();
                    if (s.includes("pro")) return 2;
                    if (s.includes("plus")) return 1;
                    return 0;
                  };

                  const currentLevel = getTierLevel(userTier);
                  const targetLevel = getTierLevel(tier.slug || tier.name);

                  return (
                    <div
                      key={tier._id}
                      className={`tier-card ${tier.slug === "student-plus" ? "featured" : ""}`}
                    >
                      <div className="tier-header">
                        <div className="mb-4">{renderTierIcon(tier.slug)}</div>
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
                      ) : currentLevel > targetLevel ? (
                        <button className="btn-gold-outline opacity-60" disabled>
                          Đã có gói cao hơn
                        </button>
                      ) : (
                        <button
                          className="btn-gold cursor-pointer"
                          onClick={() => {
                            const targetUrl = `/subscription/checkout?tierId=${tier._id}&cycle=${billingCycle}`;
                            if (authLoading) return;
                            if (!user) {
                              setPendingTargetUrl(targetUrl);
                              setShowAuthModal(true);
                            } else {
                              router.push(targetUrl);
                            }
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
                <div className="lock-icon flex justify-center mb-4">
                  <svg className="w-16 h-16 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
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
                            <div className="flex items-center gap-2">
                              <span className={`request-status ${getStatusClass(req.status)}`}>
                                {getStatusText(req.status)}
                              </span>
                              {req.status === "Pending" && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelRequest(req._id, req.title)}
                                  className="text-xs px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/70 text-rose-200 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                                  title="Hủy yêu cầu bài học này"
                                >
                                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Hủy yêu cầu
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="request-desc">{req.description}</p>
                          <div className="request-meta">
                            <span>Thời kỳ: <strong>{req.historicalPeriod}</strong></span>
                            <span>Ngày gửi: {new Date(req.createdAt).toLocaleDateString("vi-VN")}</span>
                            {req.estimatedCompletionDate && (
                              <span className="block mt-1 text-gold">
                                Dự kiến hoàn tất: <strong>{new Date(req.estimatedCompletionDate).toLocaleDateString("vi-VN")}</strong>
                              </span>
                            )}
                          </div>

                          {req.pedagogicalNotes && (
                            <div className="mt-3 p-2.5 bg-blue-950/40 border border-blue-900/60 rounded text-xs">
                              <p className="text-blue-400 font-semibold uppercase mb-0.5">Nhận định sư phạm của Giáo viên:</p>
                              <p className="text-blue-100/95 italic">{req.pedagogicalNotes}</p>
                            </div>
                          )}

                          {req.needsGameCreation && (
                            <div className="mt-3 p-2.5 bg-purple-950/40 border border-purple-900/60 rounded text-xs flex justify-between items-center">
                              <span className="text-purple-300 font-semibold">Thiết kế Game/Bài học đi kèm:</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                req.gameCreationStatus === "Completed" ? "bg-emerald-800 text-emerald-100" : "bg-purple-800 text-purple-100"
                              }`}>
                                {req.gameCreationStatus === "Completed" ? "Đã thiết kế" : "Đang yêu cầu Staff"}
                              </span>
                            </div>
                          )}

                          {req.teacherResponse && (
                            <div className="mt-4 p-3 bg-amber-950/40 border border-amber-900 rounded text-sm">
                              <p className="text-gold font-semibold text-xs uppercase mb-1">
                                Phản hồi từ giáo viên:
                              </p>
                              <p className="text-amber-100/90 italic">{req.teacherResponse}</p>
                            </div>
                          )}

                          {req.status === "Completed" && req.resultPodcastId && (
                            <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-900 rounded text-sm">
                              <p className="text-emerald-400 font-semibold text-xs uppercase mb-1">
                                Podcast riêng tư của bạn (Chỉ duy nhất tài khoản bạn được nghe):
                              </p>
                              <a
                                href={`/podcasts/${typeof req.resultPodcastId === "object" ? req.resultPodcastId._id : req.resultPodcastId}`}
                                className="text-white hover:text-emerald-300 font-bold underline"
                              >
                                {typeof req.resultPodcastId === "object" ? req.resultPodcastId.title : "Nghe ngay tại đây"}
                              </a>
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

      {/* --- Auth Required Modal for VIP Package Subscription --- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#fdf9f1] border-2 border-[#c9a15a] rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative text-center text-[#2c1a0e]">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-[#8c6a34] hover:text-[#4a1f24] font-bold text-base cursor-pointer"
              aria-label="Đóng"
            >
              ✕
            </button>

            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#4a1f24] text-[#f6e1ba] border-2 border-[#c9a15a] flex items-center justify-center shadow-lg">
              <LockIcon className="w-8 h-8 text-[#e5b869]" />
            </div>

            <h3 className="text-xl font-extrabold text-[#4a1f24] uppercase mb-2" style={{ fontFamily: '"Cinzel", serif' }}>
              YÊU CẦU ĐĂNG NHẬP / ĐĂNG KÝ
            </h3>

            <p className="text-sm text-[#6b4a2b] mb-6 leading-relaxed" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
              Vui lòng đăng nhập hoặc tạo tài khoản SuViet360 để tiến hành nâng cấp gói VIP, kích hoạt mã quà tặng và nhận các đặc quyền AI & bài học nâng cao.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  router.push(`/login?redirect=${encodeURIComponent(pendingTargetUrl)}`);
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c9a15a] to-[#9a702e] text-[#1a0f0a] font-bold text-xs uppercase tracking-wider shadow hover:brightness-110 transition cursor-pointer"
                style={{ fontFamily: '"Cinzel", serif' }}
              >
                Đăng Nhập Ngay
              </button>

              <button
                onClick={() => {
                  setShowAuthModal(false);
                  router.push(`/register?redirect=${encodeURIComponent(pendingTargetUrl)}`);
                }}
                className="px-6 py-2.5 rounded-xl bg-[#2c1216] text-[#f6e1ba] border border-[#c9a15a]/50 font-bold text-xs uppercase tracking-wider hover:bg-[#4a1f24] transition cursor-pointer"
                style={{ fontFamily: '"Cinzel", serif' }}
              >
                Đăng Ký Tài Khoản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
