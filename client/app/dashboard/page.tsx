"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { user, isLoading, refreshUser, logout } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    refreshUser().catch(() => {
      setError("Unable to load your profile.");
    });
  }, [refreshUser]);

  if (isLoading) {
    return <p className="text-sm text-slate-600">Loading your dashboard...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <section className="rounded-2xl border bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-3 text-slate-600">Welcome, {user?.name ?? "User"}.</p>
      <ul className="mt-6 space-y-2 text-sm">
        <li>
          <span className="font-medium">Email:</span>{" "}
          {user?.email ?? "Unavailable"}
        </li>
        <li>
          <span className="font-medium">Role:</span> {user?.role ?? "user"}
        </li>
      </ul>
      <button
        type="button"
        onClick={() => logout()}
        className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Logout
      </button>
    </section>
  );
}
