import Link from "next/link";

export default function Home() {
  return (
    <section className="rounded-2xl border bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold tracking-tight">SuViet360 Starter</h1>
      <p className="mt-3 text-slate-600">
        Next.js + Express + MongoDB starter with JWT cookie authentication and
        role-based authorization.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/register"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
        >
          Get started
        </Link>
        <Link href="/login" className="rounded-lg border px-4 py-2 font-medium">
          Sign in
        </Link>
      </div>
    </section>
  );
}
