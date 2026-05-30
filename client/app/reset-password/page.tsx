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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      router.push("/");
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

            <div className="pt-8 md:pt-12" />
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
                <div className="relative w-[70%]">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Nhập mật khẩu mới"
                    className="sv-auth-input pr-10"
                    style={{ width: "100%" }}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4f361c]/60 hover:text-[#4f361c] cursor-pointer focus:outline-none flex items-center justify-center"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="sv-auth-field">
                <label htmlFor="confirmPassword" className="sv-auth-label">
                  Xác nhận mật khẩu
                </label>
                <div className="relative w-[70%]">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu mới"
                    className="sv-auth-input pr-10"
                    style={{ width: "100%" }}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4f361c]/60 hover:text-[#4f361c] cursor-pointer focus:outline-none flex items-center justify-center"
                    aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
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
