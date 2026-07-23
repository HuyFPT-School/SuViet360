import React from "react";
import { api } from "@/lib/api";

export function CustomFileInput({
  accept,
  multiple,
  onChange,
  fileCount,
  singleFileName,
  disabled,
}: {
  accept?: string;
  multiple?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileCount: number;
  singleFileName?: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-2 flex items-center gap-3">
      <label className={`inline-flex items-center gap-2 px-3 py-1.5 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors duration-150 select-none ${
        disabled
          ? "bg-stone-300 cursor-not-allowed text-stone-500"
          : "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 cursor-pointer"
      }`}>
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        <span>Chọn tệp</span>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onChange}
          disabled={disabled}
          className="hidden"
        />
      </label>
      <span className="text-xs text-amber-800 truncate max-w-xs font-medium">
        {fileCount > 0
          ? multiple
            ? `Đã chọn ${fileCount} tệp`
            : singleFileName || "Đã chọn tệp"
          : "Chưa chọn tệp"}
      </span>
    </div>
  );
}

export function renderStaffStatusBadge(status?: string | boolean) {
  if (status === true || status === "Published") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        Đã duyệt
      </span>
    );
  }
  if (status === "Pending_Review") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
        Chờ duyệt
      </span>
    );
  }
  if (status === "Rejected") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        Từ chối
      </span>
    );
  }
  if (status === false || status === "Draft") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-800 border border-gray-200">
        Nháp
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
      Chờ duyệt
    </span>
  );
}

export const translateLevel = (level?: string) => {
  if (!level) return "";
  const mapping: Record<string, string> = {
    Easy: "Dễ",
    Medium: "Trung cấp",
    Hard: "Nâng cao",
    "Dễ": "Dễ",
    "Trung cấp": "Trung cấp",
    "Nâng cao": "Nâng cao"
  };
  return mapping[level] || level;
};

export const getCsrfToken = async () => {
  const response = await api.get<{ data: { csrfToken: string } }>(
    "/csrf-token"
  );
  return response.data.data.csrfToken;
};
