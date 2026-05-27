"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/authApi";
import { setUser } from "@/store/features/authSlice";
import { useAppDispatch } from "@/store";
import { AxiosError } from "axios";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const resetToken = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    document.body.classList.add("sv-auth-mode");
    return () => document.body.classList.remove("sv-auth-mode");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    if (password !== confirmPassword) {
      setServerError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (!resetToken) {
      setServerError("Token đặt lại mật khẩu không hợp lệ");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authApi.resetPassword(resetToken, password);
      dispatch(setUser(response.data.user));
      router.push("/dashboard");
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

  if (!resetToken) {
    return (
      <section className="sv-auth sv-auth-login">
        <div className="sv-auth-shell">
          <div className="sv-auth-panel">
            <div className="sv-auth-panel-inner">
              <div className="sv-auth-heading">
                <h1 className="sv-auth-title">Liên kết không hợp lệ</h1>
                <p className="sv-auth-subtitle">
                  Token đặt lại mật khẩu không tìm thấy.{" "}
                  <Link href="/forgot-password" className="sv-auth-footer-link">
                    Thử lại
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

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
              <h1 className="sv-auth-title">Đặt Lại Mật Khẩu</h1>
              <p className="sv-auth-subtitle">
                Nhập mật khẩu mới cho tài khoản của bạn.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="sv-auth-form">
              {serverError && (
                <div className="sv-auth-error" role="alert">
                  {serverError}
                </div>
              )}

              <div className="sv-auth-field">
                <label htmlFor="password" className="sv-auth-label">
                  Mật khẩu mới
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Nhập mật khẩu mới"
                  className="sv-auth-input"
                  required
                  minLength={8}
                />
              </div>

              <div className="sv-auth-field">
                <label htmlFor="confirmPassword" className="sv-auth-label">
                  Xác nhận mật khẩu
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu mới"
                  className="sv-auth-input"
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="sv-auth-submit"
              >
                {isSubmitting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <section className="sv-auth sv-auth-login">
        <div className="sv-auth-shell">
          <div className="sv-auth-panel">
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
                <h1 className="sv-auth-title">Đang tải...</h1>
              </div>
            </div>
          </div>
        </div>
      </section>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
