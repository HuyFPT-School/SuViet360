"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { authApi } from "@/lib/authApi";
import { setUser } from "@/store/features/authSlice";
import { useAppDispatch } from "@/store";

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  return (
    <section className="mx-auto max-w-md rounded-2xl border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <p className="mt-1 text-sm text-slate-600">
        Sign up to start using the platform.
      </p>
      <div className="mt-6">
        <AuthForm
          mode="register"
          onSubmit={async (values) => {
            const response = await authApi.register(
              values as { name: string; email: string; password: string }
            );
            dispatch(setUser(response.data.user));
            router.push("/dashboard");
          }}
        />
      </div>
      <p className="mt-4 text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-blue-700">
          Sign in
        </Link>
      </p>
    </section>
  );
}
