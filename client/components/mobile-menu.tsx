"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "./user-menu";

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer when path changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="lg:hidden flex items-center">
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="text-[#f0ddb7] p-2 hover:text-[#c9a15a] focus:outline-none focus:ring-1 focus:ring-[#c9a15a]/50 rounded cursor-pointer"
        aria-label="Mở menu"
        aria-expanded={isOpen}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Overlay background */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[998] transition-opacity duration-300 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-[280px] max-w-[85vw] bg-[#1f0a0d] border-l border-[#8c6a34] z-[999] shadow-[0_0_30px_rgba(0,0,0,0.8)] p-6 flex flex-col transition-transform duration-300 ease-out transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Top header within drawer */}
        <div className="flex items-center justify-between pb-4 border-b border-[#8c6a34]/30 mb-6">
          <div className="flex items-center gap-2">
            <img
              className="w-8 h-8 object-contain"
              src="/images/Logo_SuViet-remove.png"
              alt="Logo"
            />
            <span className="font-display text-xs font-bold uppercase tracking-wider text-[#f0ddb7]">
              Sử Việt 360
            </span>
          </div>
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="text-[#f0ddb7] hover:text-[#c9a15a] p-1.5 rounded focus:outline-none cursor-pointer"
            aria-label="Đóng menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Search */}
        <div className="mb-6">
          <div className="flex items-center gap-2 px-3 py-2 border border-[#c9a15a]/50 rounded-full bg-black/40">
            <div className="w-3.5 h-3.5 rounded-full border-1.5 border-[#f0ddb7] relative flex-shrink-0 after:absolute after:-right-1 after:-bottom-1 after:w-1.5 after:h-0.5 after:bg-[#f0ddb7] after:rotate-45 after:rounded-sm" />
            <input
              className="bg-transparent border-none text-[#f0ddb7] font-display text-xs tracking-wide w-full outline-none placeholder-[#f0ddb7]/40"
              placeholder="Tìm kiếm..."
              aria-label="Tìm kiếm trên di động"
            />
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex flex-col gap-4 mb-auto overflow-y-auto">
          <Link
            href="/"
            className={`font-display text-sm tracking-wider uppercase py-2 border-b border-[#8c6a34]/10 transition-colors ${
              pathname === "/" ? "text-[#c9a15a]" : "text-[#f0ddb7] hover:text-[#c9a15a]"
            }`}
          >
            Trang Chủ
          </Link>
          <Link
            href="/game"
            className={`font-display text-sm tracking-wider uppercase py-2 border-b border-[#8c6a34]/10 transition-colors ${
              pathname === "/game" ? "text-[#c9a15a]" : "text-[#f0ddb7] hover:text-[#c9a15a]"
            }`}
          >
            Game
          </Link>
          <Link
            href="/lessons"
            className={`font-display text-sm tracking-wider uppercase py-2 border-b border-[#8c6a34]/10 transition-colors ${
              pathname === "/lessons" ? "text-[#c9a15a]" : "text-[#f0ddb7] hover:text-[#c9a15a]"
            }`}
          >
            Bài Học
          </Link>
          <Link
            href="/explore"
            className={`font-display text-sm tracking-wider uppercase py-2 border-b border-[#8c6a34]/10 transition-colors ${
              pathname === "/explore" ? "text-[#c9a15a]" : "text-[#f0ddb7] hover:text-[#c9a15a]"
            }`}
          >
            Bản Đồ Di Sản
          </Link>
          <Link
            href="/library"
            className={`font-display text-sm tracking-wider uppercase py-2 border-b border-[#8c6a34]/10 transition-colors ${
              pathname === "/library" ? "text-[#c9a15a]" : "text-[#f0ddb7] hover:text-[#c9a15a]"
            }`}
          >
            Hành Trình
          </Link>
          <Link
            href="/leaderboard"
            className={`font-display text-sm tracking-wider uppercase py-2 border-b border-[#8c6a34]/10 transition-colors ${
              pathname === "/leaderboard" ? "text-[#c9a15a]" : "text-[#f0ddb7] hover:text-[#c9a15a]"
            }`}
          >
            Bảng Vàng
          </Link>
          <Link
            href="/community"
            className={`font-display text-sm tracking-wider uppercase py-2 border-b border-[#8c6a34]/10 transition-colors ${
              pathname === "/community" ? "text-[#c9a15a]" : "text-[#f0ddb7] hover:text-[#c9a15a]"
            }`}
          >
            Kho Báu
          </Link>
        </nav>

        {/* User login / profile section at bottom of drawer */}
        <div className="pt-6 border-t border-[#8c6a34]/30 flex flex-col gap-3 mt-6">
          <span className="font-display text-[10px] uppercase tracking-widest text-[#a37636]">
            Tài Khoản
          </span>
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
