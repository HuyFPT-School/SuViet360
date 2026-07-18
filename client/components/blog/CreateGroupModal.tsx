"use client";

import { useState } from "react";
import { groupApi } from "@/lib/groupApi";

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Tên nhóm là bắt buộc.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await groupApi.createGroup({
        name: name.trim(),
        description: description.trim(),
        isPublic,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể tạo nhóm. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="blog-modal-overlay" onClick={onClose}>
      <div className="blog-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="blog-modal-header">
          <h2 className="blog-modal-title">Tạo nhóm thảo luận mới</h2>
          <button onClick={onClose} className="blog-modal-close-btn">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="blog-form-group">
            <label className="blog-form-label">Tên nhóm</label>
            <input
              type="text"
              required
              placeholder="Nhập tên nhóm (ví dụ: Lịch sử Việt Nam thời Trần)..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="blog-form-input"
            />
          </div>

          <div className="blog-form-group">
            <label className="blog-form-label">Mô tả nhóm (tuỳ chọn)</label>
            <textarea
              placeholder="Mô tả ngắn gọn về nhóm..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="blog-form-textarea"
            />
          </div>

          <div className="blog-form-group">
            <label className="blog-form-label">Chế độ nhóm</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-[#d4c5a0]">
                <input
                  type="radio"
                  name="privacy"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  className="accent-[#c9a15a]"
                />
                Công khai
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-[#d4c5a0]">
                <input
                  type="radio"
                  name="privacy"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  className="accent-[#c9a15a]"
                />
                Riêng tư
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="blog-comment-submit-btn !bg-transparent !border !border-[#c9a15a] !text-[#c9a15a]">
              Huỷ
            </button>
            <button type="submit" disabled={loading} className="blog-comment-submit-btn">
              {loading ? "Đang tạo..." : "Tạo nhóm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
