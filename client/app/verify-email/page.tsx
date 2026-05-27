"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/authApi";
import { setUser } from "@/store/features/authSlice";
import { useAppDispatch } from "@/store";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.body.classList.add("sv-auth-mode");
    return () => document.body.classList.remove("sv-auth-mode");
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token xác thực không hợp lệ.");
      return;
    }

    const verify = async () => {
      try {
        const response = await authApi.verifyEmail(token);
        dispatch(setUser(response.data.user));
        setStatus("success");
        setMessage("Email đã được xác thực thành công!");
        setTimeout(() => router.push("/dashboard"), 2000);
      } catch {
        setStatus("error");
        setMessage("Token xác thực không hợp lệ hoặc đã hết hạn.");
      }
    };

    verify();
  }, [token, dispatch, router]);

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
              <h1 className="sv-auth-title">Xác Thực Email</h1>
            </div>

            <div className="sv-auth-form">
              {status === "loading" && (
                <div className="sv-auth-success" role="status">
                  Đang xác thực email của bạn...
                </div>
              )}
              {status === "success" && (
                <div className="sv-auth-success" role="status">
                  {message} Đang chuyển hướng...
                </div>
              )}
              {status === "error" && (
                <div className="sv-auth-error" role="alert">
                  {message}
                </div>
              )}
            </div>

            <p className="sv-auth-footer">
              <Link href="/login" className="sv-auth-footer-link">
                Quay lại đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  );
}
