"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export default function UserMenu() {
  const { user, isLoading, refreshUser, logout } = useAuth();

  useEffect(() => {
    refreshUser().catch(() => {});
  }, [refreshUser]);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 animate-pulse">
        <div className="h-8 w-16 bg-[#a37636]/30 rounded-md"></div>
        <div className="h-8 w-16 bg-[#a37636]/30 rounded-md"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          className="text-[#f0ddb7] font-semibold text-xs tracking-wider uppercase hover:text-[#c9a15a] transition duration-200 whitespace-nowrap"
        >
          {user.name}
        </Link>
        <span className="text-[#a37636] font-light">|</span>
        <button
          onClick={() => logout()}
          className="rounded border border-[#c9a15a]/50 bg-transparent px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#f0ddb7] cursor-pointer transition hover:bg-[#c9a15a]/25 hover:text-[#f0ddb7] whitespace-nowrap"
        >
          Đăng xuất
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="rounded border border-[#c9a15a]/50 bg-transparent px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#f0ddb7] transition hover:bg-[#c9a15a]/25 hover:text-[#f0ddb7] whitespace-nowrap"
      >
        Đăng nhập
      </Link>
      <Link
        href="/register"
        className="rounded bg-gradient-to-r from-[#d2a85b] to-[#9b6b2f] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#2a120b] shadow-[0_2px_10px_rgba(197,151,76,0.3)] transition hover:brightness-110 whitespace-nowrap"
      >
        Đăng ký
      </Link>
    </div>
  );
}
