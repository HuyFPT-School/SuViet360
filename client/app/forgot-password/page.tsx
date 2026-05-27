"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authApi } from "@/lib/authApi";
import { AxiosError } from "axios";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [serverSuccess, setServerSuccess] = useState("");

  useEffect(() => {
    document.body.classList.add("sv-auth-mode");
    return () => document.body.classList.remove("sv-auth-mode");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    setServerSuccess("");
    setIsSubmitting(true);

    try {
      await authApi.forgotPassword(email);
      setServerSuccess(
        "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu."
      );
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || "Đã xảy ra lỗi"
          : "Đã xảy ra lỗi";
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="sv-auth sv-auth-login">
      <div className="sv-auth-shell">
        <div className="sv-auth-panel">
          <img
            src="/images/login_form.png"
            alt=""
            aria-hidden="true"
            className="sv-auth-frame"
          />
          <div className="sv-auth-panel-inner">
            <div className="sv-auth-brand">
              <img
                src="/images/Logo_SuViet-remove.png"
                alt="Hành Trình Sử Việt"
                className="sv-auth-emblem"
              />
              <span>Hành Trình Sử Việt</span>
            </div>

            <div className="sv-auth-heading">
              <h1 className="sv-auth-title">Quên Mật Khẩu</h1>
              <p className="sv-auth-subtitle">
                Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="sv-auth-form">
              {serverSuccess && (
                <div className="sv-auth-success" role="status">
                  {serverSuccess}
                </div>
              )}
              {serverError && (
                <div className="sv-auth-error" role="alert">
                  {serverError}
                </div>
              )}

              <div className="sv-auth-field">
                <label htmlFor="email" className="sv-auth-label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="Nhập email của bạn"
                  className="sv-auth-input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="sv-auth-submit"
              >
                {isSubmitting ? "Đang gửi..." : "Gửi hướng dẫn"}
              </button>
            </form>

            <p className="sv-auth-footer">
              Quay lại{" "}
              <Link href="/login" className="sv-auth-footer-link">
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
