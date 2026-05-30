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
                router.push("/");
              }}
              onGoogleSuccess={async (credential) => {
                const response = await authApi.googleLogin(credential);
                dispatch(setUser(response.data.user));
                router.push("/");
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
