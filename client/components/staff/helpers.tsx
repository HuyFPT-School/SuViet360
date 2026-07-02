"use client";
import React from "react";
import Link from "next/link";

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */

export function statusBadge(status?: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    Published:       { bg: "bg-amber-100 border-amber-300", text: "text-amber-800", label: "Da duyet" },
    Pending_Review:  { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Cho duyet" },
    Rejected:        { bg: "bg-amber-100/50 border-amber-200", text: "text-amber-600", label: "Tu choi" },
    Draft:           { bg: "bg-white border-amber-200", text: "text-amber-500", label: "Nhap" },
  };
  const s = map[status || ""] || map.Draft;
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.text}`}>{s.label}</span>;
}

export function translateLevel(lvl?: string) {
  return ({ Easy: "Dễ", Medium: "Trung bình", Hard: "Nâng cao" } as Record<string, string>)[lvl || ""] || lvl || "";
}

/* ═══════════════════════════════════════════════════════════════
   Shared classes
   ═══════════════════════════════════════════════════════════════ */

export const inputClass = "w-full rounded-lg border border-amber-300 bg-[#FFFDF5] px-3 py-2 text-sm text-[#3B2F1E] placeholder:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow";
export const selectClass = inputClass;

/* ═══════════════════════════════════════════════════════════════
   UI Primitives
   ═══════════════════════════════════════════════════════════════ */

export function FileField({ label, accept, multiple, fileCount, fileName, onChange }: {
  label: string; accept?: string; multiple?: boolean;
  fileCount: number; fileName?: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-amber-700 mb-1.5">{label}</p>
      <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#8B6914] hover:bg-[#6B4F10] text-white text-xs font-semibold rounded cursor-pointer transition-colors select-none">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
        </svg>
        <span>Chọn tệp</span>
        <input type="file" accept={accept} multiple={multiple} onChange={onChange} className="hidden"/>
      </label>
      <span className="ml-3 text-xs text-amber-600 font-medium">
        {fileCount > 0 ? (multiple ? `${fileCount} tệp` : fileName || "Đã chọn") : "Chưa chọn"}
      </span>
    </div>
  );
}

export function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function GuardView({ title, desc, link, linkText }: {
  title: string; desc: string; link: string; linkText: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F3E9" }}>
      <div className="text-center bg-white/80 backdrop-blur border border-amber-200 rounded-2xl p-10 shadow-lg max-w-md">
        <h1 className="text-2xl font-display font-bold text-[#3B2F1E] mb-2">{title}</h1>
        <p className="text-amber-600 mb-6">{desc}</p>
        <Link href={link} className="inline-block bg-[#8B6914] hover:bg-[#6B4F10] text-white px-6 py-2.5 rounded-xl font-bold transition shadow-md">{linkText}</Link>
      </div>
    </div>
  );
}

export function Message({ msg, onDismiss }: { msg: { type: "success" | "error"; text: string } | null; onDismiss: () => void }) {
  if (!msg) return null;
  return (
    <div className="mb-6 rounded-xl border px-4 py-3 text-sm font-medium animate-in fade-in border-amber-300 bg-amber-50 text-amber-800">
      {msg.text}
      <button onClick={onDismiss} className="float-right font-bold ml-4">&times;</button>
    </div>
  );
}

export function UploadOverlay({ pct }: { pct: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-[#FFFBF2] border-2 border-amber-700 rounded-2xl p-8 w-[90%] max-w-sm shadow-2xl text-center">
        <p className="font-display font-bold text-lg text-[#3B2F1E] mb-4">Đang tải lên...</p>
        <div className="w-full h-3 bg-amber-200 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-[#8B6914] rounded-full transition-all duration-300" style={{ width: `${pct}%` }}/>
        </div>
        <p className="text-2xl font-bold text-[#3B2F1E]">{pct}%</p>
        <p className="text-xs text-amber-600 mt-2">{pct === 100 ? "Đang xử lý..." : "Vui lòng đợi..."}</p>
      </div>
    </div>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-transparent">
      <h2 className="font-display text-lg font-bold text-[#3B2F1E]">{title}</h2>
      {action}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/90 backdrop-blur border border-amber-200 rounded-2xl shadow-lg overflow-hidden ${className || ""}`}>
      {children}
    </div>
  );
}
