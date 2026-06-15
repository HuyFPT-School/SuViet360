"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { authApi } from "@/lib/authApi";
import { setUser } from "@/store/features/authSlice";
import { useAppDispatch } from "@/store";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  useEffect(() => {
    document.body.classList.add("sv-auth-mode");
    return () => document.body.classList.remove("sv-auth-mode");
  }, []);

  return (
    <section className="sv-auth sv-auth-login">
      <Link
        href="/"
        className="absolute top-6 left-6 z-[100] flex items-center gap-2 px-3 py-2 rounded-full border border-[#c9a15a]/50 bg-[#1f0a0d]/80 text-[#f0ddb7] hover:bg-[#c9a15a]/20 hover:text-white transition-all backdrop-blur-sm group"
        aria-label="Về trang chủ"
      >
        <svg
          className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        <span className="font-display text-xs uppercase tracking-wider hidden sm:block">Trang chủ</span>
      </Link>
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

            <div className="sv-auth-tabs">
              <Link
                href="/login"
                className="sv-auth-tab sv-auth-tab-active"
              >
                Đăng nhập
              </Link>
              <Link href="/register" className="sv-auth-tab">
                Đăng ký
              </Link>
            </div>

            <div className="sv-auth-heading">
              <h1 className="sv-auth-title">Chào mừng Trở lại!</h1>
              <p className="sv-auth-subtitle">
                Đăng nhập để tiếp tục hành trình khám phá.
              </p>
            </div>

            <AuthForm
              mode="login"
              onSubmit={async (values) => {
                const response = await authApi.login(
                  values as { email: string; password: string }
                );
                dispatch(setUser(response.data.user));
                const role = response.data.user.role;
                router.push(
                  role === "staff" ? "/staff" : role === "teacher" ? "/teacher" : "/"
                );
              }}
              onGoogleSuccess={async (credential) => {
                const response = await authApi.googleLogin(credential);
                dispatch(setUser(response.data.user));
                const role = response.data.user.role;
                router.push(
                  role === "staff" ? "/staff" : role === "teacher" ? "/teacher" : "/"
                );
              }}
            />

            <p className="sv-auth-footer">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="sv-auth-footer-link">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
