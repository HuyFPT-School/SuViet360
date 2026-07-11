"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { subscriptionApi } from "@/lib/subscriptionApi";
import type { Transaction } from "@/types/subscription";
import "../subscription.css";

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const data = await subscriptionApi.getTransactions();
        setTransactions(data);
      } catch (err) {
        console.error("Error loading transaction history:", err);
        setError("Không thể tải lịch sử giao dịch. Vui lòng kiểm tra kết nối mạng.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const getStatusText = (status: string) => {
    switch (status) {
      case "Completed":
        return "Đã hoàn thành";
      case "Pending":
        return "Chờ thanh toán";
      case "Failed":
        return "Thất bại";
      case "Refunded":
        return "Đã hoàn tiền";
      default:
        return status;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Completed":
        return "text-emerald-400 font-semibold";
      case "Pending":
        return "text-yellow-400 font-semibold";
      case "Failed":
        return "text-rose-400 font-semibold";
      case "Refunded":
        return "text-gray-400 italic";
      default:
        return "";
    }
  };

  return (
    <div className="sub-page-wrapper">
      <div className="sub-container">
        
        {/* Breadcrumb */}
        <div className="text-xs text-muted mb-4 flex items-center gap-1">
          <Link href="/subscription" className="hover:text-gold transition">
            VIP SUBSCRIPTION
          </Link>
          <span>/</span>
          <span className="text-[#f4e7c9]">HISTORY</span>
        </div>

        <h1 className="sub-title">Lịch Sử Giao Dịch</h1>
        <p className="sub-subtitle">Theo dõi hành trình nâng cấp tài khoản của bạn</p>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gold italic">Đang tải lịch sử giao dịch...</p>
          </div>
        ) : error ? (
          <div className="sub-card text-center max-w-xl mx-auto py-10">
            <p className="text-rose-400 mb-6">{error}</p>
            <button
              className="btn-gold max-w-[200px]"
              onClick={() => window.location.reload()}
            >
              Thử lại
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="sub-card text-center max-w-xl mx-auto py-12">
             <div className="flex justify-center mb-4">
               <svg className="w-12 h-12 text-gold/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                 <rect width="16" height="20" x="4" y="2" rx="2" />
                 <path d="M12 6h-4" />
                 <path d="M12 10h-4" />
                 <path d="M12 14h-4" />
               </svg>
             </div>
            <h3 className="text-gold font-display text-lg font-semibold mb-2">
              Chưa có giao dịch nào
            </h3>
            <p className="text-muted text-sm mb-6">
              Bạn chưa thực hiện bất kỳ giao dịch mua gói hoặc tặng quà nào.
            </p>
            <Link href="/subscription" className="btn-gold max-w-[200px] inline-block">
              Khám Phá Gói VIP
            </Link>
          </div>
        ) : (
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Mã giao dịch</th>
                  <th>Gói dịch vụ</th>
                  <th>Chu kỳ</th>
                  <th>Số tiền</th>
                  <th>Người nhận</th>
                  <th>Trạng thái</th>
                  <th>Ngày giao dịch</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const txCode = tx.transactionId || tx._id || "SV-XXXX";
                  const cycleText = tx.billingCycle === "monthly" ? "Tháng" : "Năm";
                  const isRecipientSelf = !tx.isGift || (tx.recipientId && tx.buyerId && tx.recipientId._id === tx.buyerId._id);

                  return (
                    <tr key={tx._id}>
                      <td className="font-mono text-sm tracking-wider text-gold select-all font-semibold">
                        {txCode}
                      </td>
                      <td className="font-semibold text-stone-200">
                        {tx.tierId?.name || "Gói VIP"}
                      </td>
                      <td>
                        {cycleText}
                      </td>
                      <td className="font-semibold text-amber-100">
                        {tx.amount.toLocaleString("vi-VN")}đ
                      </td>
                      <td>
                        {isRecipientSelf ? (
                          <span className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded border border-gold/20">
                            Bản thân
                          </span>
                        ) : (
                          <div className="flex flex-col">
                             <span className="text-xs font-semibold text-amber-200 inline-flex items-center gap-1">
                               <svg className="w-3.5 h-3.5 text-amber-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                 <path d="M20 12v10H4V12" />
                                 <path d="M2 7h20v5H2z" />
                                 <path d="M12 22V7" />
                                 <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                                 <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                               </svg>
                               Tặng: {tx.recipientId?.name || "Bạn bè"}
                             </span>
                            <span className="text-[10px] text-muted">
                              ({tx.recipientId?.email || "Email không xác định"})
                            </span>
                          </div>
                        )}
                      </td>
                      <td className={getStatusStyle(tx.status)}>
                        {getStatusText(tx.status)}
                      </td>
                      <td className="text-stone-400 text-sm">
                        {new Date(tx.createdAt).toLocaleDateString("vi-VN")}{" "}
                        {new Date(tx.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/subscription" className="text-gold-dark hover:text-gold transition text-sm">
            ← Quay lại trang gói VIP
          </Link>
        </div>

      </div>
    </div>
  );
}
