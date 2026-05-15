"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { authApi } from "@/lib/authApi";
import { setUser } from "@/store/features/authSlice";
import { useAppDispatch } from "@/store";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  return (
    <section className="mx-auto max-w-md rounded-2xl border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-slate-600">
        Access your SuViet360 dashboard.
      </p>
      <div className="mt-6">
        <AuthForm
          mode="login"
          onSubmit={async (values) => {
            const response = await authApi.login(
              values as { email: string; password: string }
            );
            dispatch(setUser(response.data.user));
            router.push("/dashboard");
          }}
        />
      </div>
      <p className="mt-4 text-sm text-slate-600">
        New here?{" "}
        <Link href="/register" className="font-medium text-blue-700">
          Create an account
        </Link>
      </p>
    </section>
  );
}
