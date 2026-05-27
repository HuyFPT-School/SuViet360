"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import Link from "next/link";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
        <input
          id="password"
          type="password"
          {...register("password")}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="Nhập mật khẩu"
          className="sv-auth-input"
          aria-invalid={Boolean(errors.password)}
        />
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
