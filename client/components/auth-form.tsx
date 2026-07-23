"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import Link from "next/link";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";

const registerSchema = z.object({
  name: z.string().min(2, "Họ và tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Vui lòng nhập địa chỉ email hợp lệ"),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
});

const loginSchema = registerSchema.omit({ name: true });

type RegisterFormValues = z.infer<typeof registerSchema>;
type LoginFormValues = z.infer<typeof loginSchema>;
type AuthFormValues = {
  name?: string;
  email: string;
  password: string;
};

interface AuthFormProps {
  mode: "login" | "register";
  onSubmit: (
    values: RegisterFormValues | LoginFormValues
  ) => Promise<string | void>;
  onGoogleSuccess?: (credential: string) => Promise<void>;
}

export default function AuthForm({ mode, onSubmit, onGoogleSuccess }: AuthFormProps) {
  const schema = mode === "register" ? registerSchema : loginSchema;
  const [serverError, setServerError] = useState("");
  const [serverSuccess, setServerSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
  });

  const submitHandler = async (values: AuthFormValues) => {
    try {
      setServerError("");
      setServerSuccess("");
      const message = await onSubmit(
        values as RegisterFormValues | LoginFormValues
      );
      if (message) {
        setServerSuccess(message);
      }
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || "Authentication failed"
          : "Authentication failed";
      setServerError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="sv-auth-form">
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
      {mode === "register" && (
        <div className="sv-auth-field">
          <label htmlFor="name" className="sv-auth-label">
            Họ và Tên
          </label>
          <input
            id="name"
            type="text"
            {...register("name")}
            autoComplete="name"
            placeholder="Nhập họ và tên đầy đủ của bạn"
            className="sv-auth-input"
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && (
            <p className="sv-auth-help">{errors.name.message}</p>
          )}
        </div>
      )}

      <div className="sv-auth-field">
        <label htmlFor="email" className="sv-auth-label">
          Email
        </label>
        <input
          id="email"
          type="email"
          {...register("email")}
          autoComplete="email"
          placeholder="Nhập email của bạn"
          className="sv-auth-input"
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && (
          <p className="sv-auth-help">{errors.email.message}</p>
        )}
      </div>

      <div className="sv-auth-field">
        <label htmlFor="password" className="sv-auth-label">
          Mật khẩu
        </label>
        <div className="relative w-[70%]">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            {...register("password")}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Nhập mật khẩu"
            className="sv-auth-input pr-10"
            style={{ width: "100%" }}
            aria-invalid={Boolean(errors.password)}
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
        {errors.password && (
          <p className="sv-auth-help">{errors.password.message}</p>
        )}
      </div>

      {mode === "login" && (
        <Link href="/forgot-password" className="sv-auth-link">
          Quên mật khẩu?
        </Link>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="sv-auth-submit"
      >
        {isSubmitting
          ? "Đang xử lý..."
          : mode === "login"
            ? "Đăng nhập"
            : "Đăng ký"}
      </button>

      <div className="sv-auth-divider">
        {mode === "login" ? "Hoặc đăng nhập với" : "Hoặc đăng ký với"}
      </div>
      <div className="sv-auth-social">
        <GoogleLogin
          onSuccess={async (credentialResponse: CredentialResponse) => {
            if (credentialResponse.credential && onGoogleSuccess) {
              try {
                setServerError("");
                await onGoogleSuccess(credentialResponse.credential);
              } catch (error) {
                const message =
                  error instanceof AxiosError
                    ? error.response?.data?.message || "Đăng nhập Google thất bại"
                    : "Đăng nhập Google thất bại";
                setServerError(message);
              }
            }
          }}
          onError={() => {
            setServerError("Đăng nhập Google thất bại");
          }}
          theme="outline"
          size="large"
          width="100%"
          text={mode === "login" ? "signin_with" : "signup_with"}
        />
      </div>
    </form>
  );
}
