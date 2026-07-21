"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { subscriptionApi } from "@/lib/subscriptionApi";
import { useAuth } from "@/hooks/useAuth";
import type { SubscriptionTier, RecipientInfo } from "@/types/subscription";
import "../subscription.css";

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  // Query params
  const tierId = searchParams.get("tierId") || "";
  const cycle = (searchParams.get("cycle") as "monthly" | "yearly") || "monthly";

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      const checkoutUrl = `/subscription/checkout?tierId=${tierId}&cycle=${cycle}`;
      router.push(`/login?redirect=${encodeURIComponent(checkoutUrl)}`);
    }
  }, [user, authLoading, tierId, cycle, router]);

  // Tier info state
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [loadingTier, setLoadingTier] = useState(true);

  // Promo Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [validatedCoupon, setValidatedCoupon] = useState<any>(null);

  // Mode: "self" | "gift"
  const [purchaseMode, setPurchaseMode] = useState<"self" | "gift">("self");

  // Gift recipient states
  const [recipientInput, setRecipientInput] = useState("");
  const [verifyingRecipient, setVerifyingRecipient] = useState(false);
  const [recipientVerified, setRecipientVerified] = useState<RecipientInfo | null>(null);
  const [recipientError, setRecipientError] = useState("");
  
  // Gift details
  const [giftMessage, setGiftMessage] = useState("");
  const [giftDeliveryMode, setGiftDeliveryMode] = useState<"instant" | "code">("instant");

  // Checkout states
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState<any>(null);
  
  // Sepay Integration states
  const [paymentMethod, setPaymentMethod] = useState<"sepay" | "demo">("sepay");
  const [pendingPayment, setPendingPayment] = useState<any>(null);

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

  // Fetch tier details
  useEffect(() => {
    if (!tierId) {
      router.push("/subscription");
      return;
    }

    const fetchTier = async () => {
      try {
        setLoadingTier(true);
        const allTiers = await subscriptionApi.getTiers();
        const found = allTiers.find((t) => t._id === tierId || t.slug === tierId);
        if (found) {
          setTier(found);
        } else {
          // Check fallback
          const fb = fallbackTiers.find((t) => t._id === tierId || t.slug === tierId);
          if (fb) {
            setTier(fb as unknown as SubscriptionTier);
          } else {
            router.push("/subscription");
          }
        }
      } catch (err) {
        console.error("Error fetching tier details:", err);
        // Load fallback if API fails
        const fb = fallbackTiers.find((t) => t._id === tierId || t.slug === tierId);
        if (fb) {
          setTier(fb as unknown as SubscriptionTier);
        } else {
          router.push("/subscription");
        }
      } finally {
        setLoadingTier(false);
      }
    };

    fetchTier();
  }, [tierId, router]);

  // Poll payment status
  useEffect(() => {
    if (!pendingPayment) return;

    let pollCount = 0;
    const maxPolls = 200; // 10 minutes (200 * 3s)

    const intervalId = setInterval(async () => {
      pollCount++;
      if (pollCount > maxPolls) {
        clearInterval(intervalId);
        console.log("Payment polling timed out after 10 minutes.");
        return;
      }
      try {
        const res = await subscriptionApi.getTransactionStatus(pendingPayment.id);
        if (res.status === "Completed") {
          clearInterval(intervalId);
          setPendingPayment(null);
          
          if (pendingPayment.mode === "self") {
            setCheckoutSuccess({
              mode: "self",
              data: { success: true }
            });
            await refreshUser();
          } else {
            setCheckoutSuccess({
              mode: "gift",
              delivery: pendingPayment.delivery,
              data: res
            });
          }
        }
      } catch (err) {
        console.error("Error polling payment status:", err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [pendingPayment, refreshUser]);

  // Calculate pricing
  const basePrice = tier ? (cycle === "monthly" ? tier.priceMonthly : tier.priceYearly) : 0;
  
  // Coupon Discount
  const discountAmount = validatedCoupon
    ? validatedCoupon.discountType === "percentage"
      ? (basePrice * validatedCoupon.discountValue) / 100
      : validatedCoupon.discountValue
    : 0;

  const finalTotal = Math.max(0, basePrice - discountAmount);

  const formatPrice = (price: number) => {
    return price.toLocaleString("vi-VN") + "đ";
  };

  // Apply Coupon
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    setCouponError("");
    setValidatedCoupon(null);

    try {
      const result = await subscriptionApi.validateCoupon(
        couponCode.trim().toUpperCase(),
        tierId,
        basePrice
      );
      setValidatedCoupon(result);
    } catch (err: any) {
      console.error(err);
      setCouponError(err.response?.data?.message || "Mã giảm giá không hợp lệ hoặc đã hết hạn.");
    } finally {
      setCouponLoading(false);
    }
  };

  // Verify Recipient
  const handleVerifyRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientInput.trim()) return;

    setVerifyingRecipient(true);
    setRecipientError("");
    setRecipientVerified(null);

    try {
      const res = await subscriptionApi.verifyRecipient(recipientInput.trim());
      setRecipientVerified(res);
    } catch (err: any) {
      console.error(err);
      setRecipientError(err.response?.data?.message || "Không tìm thấy người dùng này.");
    } finally {
      setVerifyingRecipient(false);
    }
  };

  // Perform checkout purchase
  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError("");

    try {
      if (purchaseMode === "self") {
        const result = await subscriptionApi.purchase(
          tierId,
          cycle,
          validatedCoupon?.code || undefined,
          paymentMethod
        );

        if (paymentMethod === "demo" || finalTotal === 0) {
          setCheckoutSuccess({
            mode: "self",
            data: result.data || result
          });
          await refreshUser();
        } else {
          // Sepay mode -> show QR code
          setPendingPayment({
            id: result.data?.transaction?._id || result.transaction?._id,
            transactionId: result.data?.transaction?.transactionId || result.transaction?.transactionId,
            amount: result.data?.transaction?.amount || result.transaction?.amount,
            bankInfo: result.data?.bankInfo || result.bankInfo,
            mode: "self"
          });
        }
      } else {
        // Gift mode
        if (giftDeliveryMode === "instant" && !recipientVerified) {
          setCheckoutError("Vui lòng nhập và xác nhận thông tin người nhận.");
          setCheckoutLoading(false);
          return;
        }

        const recipientIdentifier = giftDeliveryMode === "instant" 
          ? recipientVerified?.email || recipientInput.trim()
          : "gift_code_generation";

        const result = await subscriptionApi.purchaseGift(
          recipientIdentifier,
          tierId,
          cycle,
          giftMessage.trim(),
          giftDeliveryMode,
          validatedCoupon?.code || undefined,
          paymentMethod
        );

        if (paymentMethod === "demo" || finalTotal === 0) {
          setCheckoutSuccess({
            mode: "gift",
            delivery: giftDeliveryMode,
            data: result.data || result
          });
        } else {
          // Sepay mode -> show QR code
          setPendingPayment({
            id: result.data?.transaction?._id || result.transaction?._id,
            transactionId: result.data?.transaction?.transactionId || result.transaction?.transactionId,
            amount: result.data?.transaction?.amount || result.transaction?.amount,
            bankInfo: result.data?.bankInfo || result.bankInfo,
            mode: "gift",
            delivery: giftDeliveryMode,
            giftResultData: result.data || result
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setCheckoutError(err.response?.data?.message || "Thanh toán thất bại. Vui lòng thử lại.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loadingTier) {
    return (
      <div className="sub-page-wrapper flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gold italic">Đang tải thông tin hóa đơn...</p>
        </div>
      </div>
    );
  }

  if (!tier) {
    return null;
  }

  // Handle Copy Redeem Code to Clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert("Đã sao chép mã quà tặng vào bộ nhớ tạm!");
  };

  if (pendingPayment) {
    const vietqrUrl = `https://img.vietqr.io/image/${pendingPayment.bankInfo.bin}-${pendingPayment.bankInfo.accountNumber}-qr_only.png?amount=${pendingPayment.amount}&addInfo=${pendingPayment.transactionId}&accountName=${encodeURIComponent(pendingPayment.bankInfo.accountName)}`;

    return (
      <div className="sub-page-wrapper flex items-center justify-center py-12">
        <div className="sub-container max-w-3xl w-full mx-auto px-4">
          <div className="sub-card text-center p-8">
            <h2 className="sub-title mb-2 text-2xl text-gold" style={{ fontFamily: "Cinzel, serif" }}>
              Chuyển Khoản Ngân Hàng
            </h2>
            <p className="text-sm text-muted mb-8 italic">Quét mã VietQR hoặc chuyển khoản đúng thông tin dưới đây</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-center text-left">
              
              {/* QR Image */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-lg border border-gold/25 max-w-[260px] mx-auto w-full">
                <img
                  src={vietqrUrl}
                  alt="VietQR Code"
                  className="w-full h-auto"
                />
                <span className="text-[9px] text-gray-500 font-bold tracking-widest mt-2 uppercase">Napas 247 VietQR</span>
              </div>
              
              {/* Bank Details Table */}
              <div className="flex flex-col gap-4 p-5 bg-black/50 rounded-lg border border-gold/15">
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">Ngân hàng nhận</label>
                  <span className="text-[#f4e7c9] font-medium text-sm">VietQR (BIN {pendingPayment.bankInfo.bin})</span>
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">Số tài khoản</label>
                  <span className="text-gold font-bold font-mono text-lg tracking-wider">{pendingPayment.bankInfo.accountNumber}</span>
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">Chủ tài khoản</label>
                  <span className="text-[#f4e7c9] font-medium uppercase text-sm">{pendingPayment.bankInfo.accountName}</span>
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">Số tiền cần chuyển</label>
                  <span className="text-emerald-400 font-bold text-xl">{formatPrice(pendingPayment.amount)}</span>
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase tracking-wider block mb-0.5">Nội dung chuyển khoản (Ghi chính xác)</label>
                  <span className="text-gold font-mono font-bold text-lg select-all bg-black/85 px-3 py-1.5 rounded border border-gold/30 inline-block mt-1">
                    {pendingPayment.transactionId}
                  </span>
                </div>
              </div>

            </div>

            <div className="mt-8 pt-6 border-t border-gold/15 flex flex-col items-center justify-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gold italic text-sm font-semibold">Đang đợi hệ thống tự động ghi nhận thanh toán...</span>
              </div>
              <p className="text-xs text-muted max-w-md mx-auto">
                Tài khoản của bạn sẽ được kích hoạt tự động trong vòng 10-30 giây sau khi chuyển khoản thành công. Vui lòng giữ nguyên trang này và không tải lại.
              </p>
              <button
                className="btn-gold-outline max-w-[200px] mt-2"
                onClick={() => {
                  if (confirm("Hủy giao dịch hiện tại để quay về trang thanh toán?")) {
                    setPendingPayment(null);
                  }
                }}
              >
                Hủy & Quay lại
              </button>
            </div>
            
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sub-page-wrapper">
      <div className="sub-container">
        
        {/* Breadcrumb */}
        <div className="text-xs text-muted mb-4 flex items-center gap-1">
          <Link href="/subscription" className="hover:text-gold transition">
            VIP SUBSCRIPTION
          </Link>
          <span>/</span>
          <span className="text-[#f4e7c9]">CHECKOUT</span>
        </div>

        <h1 className="sub-title mb-10">Thanh Toán Đăng Ký</h1>

        {checkoutSuccess ? (
          // Success Modal/Layout
          <div className="sub-card max-w-2xl mx-auto text-center py-10">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
            </div>
            <h2 className="sub-title mb-4" style={{ fontSize: "1.6rem" }}>
              Giao Dịch Thành Công!
            </h2>
            <div className="w-16 h-[2px] bg-gold mx-auto mb-6"></div>

            {checkoutSuccess.mode === "self" ? (
              <p className="text-lg text-emerald-100 mb-8 max-w-md mx-auto">
                Cảm ơn bạn! Tài khoản của bạn đã được nâng cấp thành công lên gói{" "}
                <strong className="text-gold">{tier.name}</strong>.
              </p>
            ) : checkoutSuccess.delivery === "instant" ? (
              <p className="text-lg text-emerald-100 mb-8 max-w-md mx-auto">
                Cảm ơn bạn! Gói <strong className="text-gold">{tier.name}</strong> đã được gửi tặng và kích hoạt trực tiếp trên tài khoản của{" "}
                <strong className="text-gold">{recipientVerified?.name || recipientInput}</strong>.
              </p>
            ) : (
              // Code delivery mode
              <div className="mb-8 max-w-md mx-auto">
                <p className="text-lg text-emerald-100 mb-6">
                  Bạn đã mua quà tặng thành công! Dưới đây là mã quà tặng để gửi cho bạn bè:
                </p>
                <div className="flex items-center gap-2 bg-black/60 border border-gold p-4 rounded-lg justify-between mb-4">
                  <span className="font-mono text-xl tracking-wider text-gold select-all font-bold">
                    {checkoutSuccess.data?.code || checkoutSuccess.data?.giftCode?.code || "MÃ QUÀ TẶNG"}
                  </span>
                  <button
                    className="px-3 py-1 bg-gold text-black rounded text-xs font-semibold hover:bg-yellow-600 transition"
                    onClick={() =>
                      handleCopyCode(
                        checkoutSuccess.data?.code || checkoutSuccess.data?.giftCode?.code || ""
                      )
                    }
                  >
                    Sao chép
                  </button>
                </div>
                <p className="text-xs text-muted">
                  Người nhận có thể vào mục &ldquo;Mã Quà Tặng (Redeem)&rdquo; trên website để kích hoạt mã này.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                className="btn-gold max-w-[200px]"
                onClick={() => router.push("/subscription")}
              >
                Trở lại gói VIP
              </button>
              <button
                className="btn-gold-outline max-w-[200px]"
                onClick={() => router.push("/")}
              >
                Trang Chủ
              </button>
            </div>
          </div>
        ) : (
          // Main Checkout Grid
          <div className="checkout-grid">
            
            {/* Left Column: Details & Payment Mode */}
            <div className="flex flex-col gap-6">
              
              {/* Payment Mode Choice */}
              <div className="sub-card">
                <h3 className="checkout-section-title">Đối tượng sử dụng</h3>
                <div className="mode-selectors">
                  <div
                    className={`mode-btn ${purchaseMode === "self" ? "active" : ""}`}
                    onClick={() => setPurchaseMode("self")}
                  >
                    <div className="mode-title">Mua Cho Bản Thân</div>
                    <div className="mode-desc">Kích hoạt trực tiếp vào tài khoản hiện tại</div>
                  </div>
                  <div
                    className={`mode-btn ${purchaseMode === "gift" ? "active" : ""}`}
                    onClick={() => setPurchaseMode("gift")}
                  >
                    <div className="mode-title">Gửi Tặng Quà</div>
                    <div className="mode-desc">Mua tặng người khác qua email hoặc gửi mã</div>
                  </div>
                </div>

                {purchaseMode === "gift" && (
                  <div className="mt-6 border-t border-gold/15 pt-6 flex flex-col gap-4">
                    
                    {/* Choose between Instant Activation & Generate Redeem Code */}
                    <div className="form-group">
                      <label className="form-label">Phương thức tặng quà</label>
                      <div className="gift-activation-modes">
                        <button
                          type="button"
                          className={`gift-act-btn ${giftDeliveryMode === "instant" ? "active" : ""}`}
                          onClick={() => setGiftDeliveryMode("instant")}
                        >
                          Kích hoạt trực tiếp
                        </button>
                        <button
                          type="button"
                          className={`gift-act-btn ${giftDeliveryMode === "code" ? "active" : ""}`}
                          onClick={() => setGiftDeliveryMode("code")}
                        >
                          Tạo mã quà tặng (Redeem Code)
                        </button>
                      </div>
                    </div>

                    {/* Recipient Verification (Only for Instant activation) */}
                    {giftDeliveryMode === "instant" && (
                      <div className="form-group">
                        <label className="form-label">Tài khoản người nhận</label>
                        <form onSubmit={handleVerifyRecipient} className="flex gap-2">
                          <input
                            className="input-gold"
                            type="text"
                            placeholder="Nhập email hoặc tên đăng nhập người nhận"
                            value={recipientInput}
                            onChange={(e) => setRecipientInput(e.target.value)}
                            disabled={verifyingRecipient}
                          />
                          <button
                            type="submit"
                            className="btn-gold max-w-[120px]"
                            disabled={verifyingRecipient || !recipientInput.trim()}
                          >
                            {verifyingRecipient ? "Kiểm tra..." : "Kiểm tra"}
                          </button>
                        </form>
                        
                        {recipientVerified && (
                          <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded flex items-center gap-3">
                            {recipientVerified.avatar ? (
                              <img
                                src={recipientVerified.avatar}
                                alt="avatar"
                                className="w-10 h-10 rounded-full border border-gold object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gold/20 border border-gold flex items-center justify-center text-xs text-gold">
                                SV
                              </div>
                            )}
                            <div>
                              <div className="text-emerald-100 font-semibold text-sm">
                                {recipientVerified.name}
                              </div>
                              <div className="text-emerald-400 text-xs">{recipientVerified.email}</div>
                            </div>
                            <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                              HỢP LỆ
                            </span>
                          </div>
                        )}

                        {recipientError && (
                          <div className="mt-2 text-sm text-red-400 italic flex items-center gap-1.5">
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                              <line x1="12" x2="12" y1="9" y2="13" />
                              <line x1="12" x2="12.01" y1="17" y2="17" />
                            </svg>
                            <span>{recipientError}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Gift Message */}
                    <div className="form-group">
                      <label className="form-label">Lời nhắn kèm theo</label>
                      <textarea
                        className="input-gold textarea-gold min-h-[80px]"
                        placeholder="Nhập lời chúc tốt đẹp gửi đến bạn bè..."
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        maxLength={250}
                      />
                    </div>

                  </div>
                )}
              </div>

              {/* Promo code Section */}
              <div className="sub-card">
                <h3 className="checkout-section-title">Mã giảm giá (Coupon)</h3>
                <form onSubmit={handleApplyCoupon} className="coupon-row">
                  <input
                    className="input-gold"
                    type="text"
                    placeholder="Nhập mã ưu đãi (Ví dụ: CHAOSUMMER)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={couponLoading}
                  />
                  <button
                    type="submit"
                    className="btn-gold max-w-[120px]"
                    disabled={couponLoading || !couponCode.trim()}
                  >
                    {couponLoading ? "Áp dụng..." : "Áp dụng"}
                  </button>
                </form>

                {validatedCoupon && (
                  <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded text-sm text-emerald-200 flex items-start gap-2">
                    <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <div>
                      <strong>Đã áp dụng mã: {validatedCoupon.code}</strong> - {validatedCoupon.description || `Giảm ${validatedCoupon.discountValue}${validatedCoupon.discountType === "percentage" ? "%" : "đ"}`}
                    </div>
                  </div>
                )}

                {couponError && (
                  <div className="mt-2 text-sm text-red-400 italic flex items-center gap-1.5">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" x2="12" y1="9" y2="13" />
                      <line x1="12" x2="12.01" y1="17" y2="17" />
                    </svg>
                    <span>{couponError}</span>
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="sub-card">
                <h3 className="checkout-section-title">Phương thức thanh toán</h3>
                <div className="flex flex-col gap-3">
                  <label className={`payment-method-option ${paymentMethod === "sepay" ? "active" : ""}`} onClick={() => setPaymentMethod("sepay")} style={{ cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="sepay"
                      checked={paymentMethod === "sepay"}
                      onChange={() => setPaymentMethod("sepay")}
                      className="hidden"
                    />
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-semibold text-sm text-[#f4e7c9]">Chuyển khoản VietQR Ngân hàng (Tự động duyệt)</div>
                        <div className="text-xs text-muted">Quét mã QR bằng ứng dụng ngân hàng, duyệt VIP ngay sau 10 giây</div>
                      </div>
                      <svg className="w-6 h-6 text-gold shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 22h18" />
                        <path d="M6 18v-7" />
                        <path d="M10 18v-7" />
                        <path d="M14 18v-7" />
                        <path d="M18 18v-7" />
                        <path d="m12 2-10 5v3h20V7L12 2Z" />
                      </svg>
                    </div>
                  </label>
                  
                  <label className={`payment-method-option ${paymentMethod === "demo" ? "active" : ""}`} onClick={() => setPaymentMethod("demo")} style={{ cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="demo"
                      checked={paymentMethod === "demo"}
                      onChange={() => setPaymentMethod("demo")}
                      className="hidden"
                    />
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-semibold text-sm text-[#f4e7c9]">Chế độ Demo (Nâng cấp tức thì để thử nghiệm)</div>
                        <div className="text-xs text-muted">Mô phỏng thanh toán thành công ngay lập tức để nhà phát triển kiểm tra flow</div>
                      </div>
                      <svg className="w-6 h-6 text-[#c9a15a] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 2v7.5" />
                        <path d="M14 2v7.5" />
                        <path d="M8.5 2h7" />
                        <path d="M14 11.5c1.7-1 3.5 1 3.5 3.5a5.5 5.5 0 0 1-11 0c0-2.5 1.8-4.5 3.5-3.5Z" />
                      </svg>
                    </div>
                  </label>
                </div>
              </div>

            </div>

            {/* Right Column: Invoice summary */}
            <div className="flex flex-col gap-6">
              
              <div className="sub-card">
                <h3 className="checkout-section-title">Hóa đơn thanh toán</h3>
                
                <div className="flex flex-col gap-4">
                  
                  <div className="invoice-row">
                    <span className="text-muted">Gói đăng ký</span>
                    <span className="font-semibold text-gold">{tier.name}</span>
                  </div>

                  <div className="invoice-row">
                    <span className="text-muted">Chu kỳ thanh toán</span>
                    <span>{cycle === "monthly" ? "Hàng Tháng" : "Hàng Năm"}</span>
                  </div>

                  <div className="invoice-row">
                    <span className="text-muted">Giá gốc</span>
                    <span>{formatPrice(basePrice)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="invoice-row text-emerald-400">
                      <span>Giảm giá</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}

                  <div className="invoice-row invoice-total">
                    <span>Tổng thanh toán</span>
                    <span className="text-gold text-2xl font-bold">{formatPrice(finalTotal)}</span>
                  </div>

                </div>

                {checkoutError && (
                  <div className="mt-4 p-3 bg-rose-950/50 border border-rose-500 text-rose-200 rounded text-sm">
                    {checkoutError}
                  </div>
                )}

                <button
                  className="btn-gold mt-6"
                  disabled={checkoutLoading || (purchaseMode === "gift" && giftDeliveryMode === "instant" && !recipientVerified)}
                  onClick={handleCheckout}
                >
                  {checkoutLoading ? "Đang xử lý..." : "Xác nhận & Thanh toán"}
                </button>

                <p className="text-xs text-center text-muted mt-4">
                  Bằng việc xác nhận thanh toán, bạn đồng ý với các Điều khoản & Chính sách của SuViet360.
                </p>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="sub-page-wrapper flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gold italic">Đang chuẩn bị trang thanh toán...</p>
        </div>
      </div>
    }>
      <CheckoutForm />
    </Suspense>
  );
}
