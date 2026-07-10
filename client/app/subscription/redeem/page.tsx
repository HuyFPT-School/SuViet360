"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { subscriptionApi } from "@/lib/subscriptionApi";
import { useAuth } from "@/hooks/useAuth";
import "../subscription.css";

export default function RedeemPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Stages: "input" | "opening" | "success"
  const [stage, setStage] = useState<"input" | "opening" | "success">("input");
  const [giftData, setGiftData] = useState<{
    tierName: string;
    senderName: string;
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Vui lòng nhập mã quà tặng của bạn.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await subscriptionApi.redeem(code.trim().toUpperCase());
      
      // The server returns: { success: true, data: { tier, sender, giftMessage } }
      const returnedData = response.data || response;
      const tierName = returnedData?.tier?.name || returnedData?.tierName || "Gói VIP";
      const senderName = returnedData?.sender?.name || returnedData?.senderName || "Người bạn bí ẩn";
      const message = returnedData?.giftMessage || returnedData?.message || "";

      setGiftData({
        tierName,
        senderName,
        message,
      });

      // Advance to opening animation stage
      setStage("opening");
      await refreshUser();

      // Trigger actual success screen after 1.8 seconds of animation
      setTimeout(() => {
        setStage("success");
        setLoading(false);
      }, 1800);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Kích hoạt mã quà tặng thất bại. Vui lòng xác minh mã và thử lại."
      );
      setLoading(false);
    }
  };

  return (
    <div className="sub-page-wrapper flex items-center justify-center">
      <div className="sub-container w-full max-w-lg">
        
        {stage === "input" && (
          <div className="sub-card">
            <h1 className="sub-title mb-2">Kích Hoạt Quà Tặng</h1>
            <p className="sub-subtitle mb-8" style={{ fontSize: "1rem" }}>
              Nhập mã nhận thưởng để nâng cấp tài khoản
            </p>

            {error && (
              <div className="mb-6 p-4 bg-rose-950/60 border border-rose-500 rounded text-rose-200 text-sm flex items-start gap-2">
                <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" x2="12" y1="9" y2="13" />
                  <line x1="12" x2="12.01" y1="17" y2="17" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="form-group mb-0">
                <label className="form-label" htmlFor="redeem-code">
                  Mã quà tặng của bạn
                </label>
                <input
                  id="redeem-code"
                  className="input-gold font-mono text-center tracking-widest text-lg"
                  type="text"
                  placeholder="GIFT-XXXX-XXXX-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-gold" disabled={loading || !code.trim()}>
                {loading ? "Đang xử lý..." : "Nhận Quà Ngay"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link href="/subscription" className="text-gold-dark hover:text-gold transition text-sm">
                ← Quay lại bảng giá VIP
              </Link>
            </div>
          </div>
        )}

        {stage === "opening" && (
          <div className="gift-box-container text-center">
            <div className="gift-box-glow"></div>
            <div className="gift-box-anim">
              {/* Premium Gift Box SVG */}
              <svg
                className="gift-box-svg"
                viewBox="0 0 240 240"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  animation: "float 1.5s ease-in-out infinite alternate",
                }}
              >
                {/* Ribbon top */}
                <path
                  d="M120 40 C110 20, 80 20, 80 45 C80 60, 105 60, 120 75 C135 60, 160 60, 160 45 C160 20, 130 20, 120 40 Z"
                  fill="#c9a15a"
                  stroke="#8c6a34"
                  strokeWidth="2"
                />
                {/* Lid */}
                <rect x="40" y="70" width="160" height="30" rx="4" fill="#4a1f24" stroke="#c9a15a" strokeWidth="2" />
                {/* Box body */}
                <rect x="50" y="100" width="140" height="90" rx="4" fill="#2a0e13" stroke="#c9a15a" strokeWidth="2" />
                {/* Horizontal Ribbon */}
                <rect x="50" y="135" width="140" height="20" fill="#c9a15a" />
                {/* Vertical Ribbon */}
                <rect x="110" y="70" width="20" height="120" fill="#c9a15a" />
              </svg>
            </div>
            <h2 className="sub-title mt-8 text-xl animate-pulse">
              Đang mở hộp quà lịch sử...
            </h2>
            <p className="text-muted italic mt-2">Dấu ấn thời gian đang hiển hiện</p>
          </div>
        )}

        {stage === "success" && giftData && (
          <div className="gift-details-card">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 className="sub-title" style={{ fontSize: "1.5rem" }}>
              Nhận Quà Thành Công!
            </h2>
            <p className="text-muted text-sm mt-1">Hộp quà đã được mở</p>

            <div className="w-16 h-[1px] bg-gold mx-auto my-6"></div>

            <p className="text-lg text-emerald-100 mb-2">
              Bạn đã mở khóa gói thành viên:
            </p>
            <div className="text-gold font-bold font-display text-2xl tracking-wide uppercase mb-4">
              {giftData.tierName}
            </div>

            <p className="text-sm text-muted">
              Được gửi tặng bởi người bạn chí cốt:
            </p>
            <div className="text-[#f4e7c9] font-semibold text-base mb-4">
              {giftData.senderName}
            </div>

            {giftData.message && (
              <div className="gift-message-bubble">
                <span className="text-xs text-gold block mb-1 not-italic font-semibold">Lời chúc:</span>
                &ldquo;{giftData.message}&rdquo;
              </div>
            )}

            <div className="mt-8 flex flex-col gap-4">
              <button
                className="btn-gold"
                onClick={() => router.push("/subscription")}
              >
                Xem chi tiết gói dịch vụ
              </button>
              <button
                className="btn-gold-outline"
                onClick={() => router.push("/")}
              >
                Về Trang Chủ
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
