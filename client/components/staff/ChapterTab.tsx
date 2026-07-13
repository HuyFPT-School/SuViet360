import React, { useState, useEffect, useMemo } from "react";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import { CustomFileInput, getCsrfToken, renderStaffStatusBadge } from "./helpers";

type Chapter = {
  _id: string;
  title: string;
  description: string;
  grade: number;
  order: number;
  coverImage: string;
  status: "Draft" | "Published";
  updatedAt: string;
};

type ChapterFormState = {
  title: string;
  description: string;
  grade: string;
  order: string;
  coverImage: string;
  status: "Draft" | "Published";
};

const emptyFormState: ChapterFormState = {
  title: "",
  description: "",
  grade: "10",
  order: "0",
  coverImage: "",
  status: "Published",
};

type ChapterTabProps = {
  setMessage: (msg: { type: "error" | "success"; text: string } | null) => void;
  onUpdateCounts?: (count: number) => void;
};

export default function ChapterTab({ setMessage, onUpdateCounts }: ChapterTabProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("All");
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<ChapterFormState>(emptyFormState);
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchChapters = async () => {
    setChaptersLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: { chapters: Chapter[] } }>("/curriculum/chapters");
      setChapters(res.data.data.chapters);
      if (onUpdateCounts) {
        onUpdateCounts(res.data.data.chapters.length);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Không thể tải danh sách chương học." });
    } finally {
      setChaptersLoading(false);
    }
  };

  useEffect(() => {
    fetchChapters();
  }, []);

  const filteredChapters = useMemo(() => {
    if (selectedGradeFilter === "All") return chapters;
    return chapters.filter((c) => c.grade === Number(selectedGradeFilter));
  }, [chapters, selectedGradeFilter]);

  const setFormField = <K extends keyof ChapterFormState>(
    field: K,
    value: ChapterFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyFormState);
    setFormMode("create");
    setSelectedId(null);
  };

  const handleSelectChapter = (chapter: Chapter) => {
    setSelectedId(chapter._id);
    setFormMode("edit");
    setForm({
      title: chapter.title,
      description: chapter.description || "",
      grade: String(chapter.grade),
      order: String(chapter.order),
      coverImage: chapter.coverImage || "",
      status: "Published",
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      
      const csrfToken = await getCsrfToken();
      // Call podcast image upload endpoint
      const res = await api.post<{ url: string }>("/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
      });

      setFormField("coverImage", res.data.url);
      setMessage({ type: "success", text: "Tải ảnh bìa lên thành công." });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: "Lỗi tải ảnh lên: " + (err.response?.data?.message || err.message) });
    } finally {
      setUploadingImage(false);
    }
  };

  const validateForm = () => {
    if (!form.title.trim()) return "Vui lòng nhập tên chương học.";
    if (Number.isNaN(Number(form.order))) return "Thứ tự sắp xếp phải là số hợp lệ.";
    return "";
  };

  const handleSubmit = async () => {
    setMessage(null);
    const error = validateForm();
    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }

    setSaving(true);
    try {
      const csrfToken = await getCsrfToken();
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        grade: Number(form.grade),
        order: Number(form.order),
        coverImage: form.coverImage,
        status: form.status,
      };

      if (formMode === "create") {
        await api.post("/curriculum/chapters", payload, {
          headers: { "x-csrf-token": csrfToken },
        });
        setMessage({ type: "success", text: "Tạo chương học thành công." });
        resetForm();
      } else if (selectedId) {
        await api.put(`/curriculum/chapters/${selectedId}`, payload, {
          headers: { "x-csrf-token": csrfToken },
        });
        setMessage({ type: "success", text: "Cập nhật chương học thành công." });
      }
      await fetchChapters();
    } catch (err: any) {
      console.error(err);
      const messageText =
        err instanceof AxiosError
          ? err.response?.data?.message || "Có lỗi xảy ra khi lưu chương học."
          : "Có lỗi xảy ra khi lưu chương học.";
      setMessage({ type: "error", text: messageText });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("Bạn có chắc chắn muốn xóa chương này? Toàn bộ các bài học bên trong sẽ cần được xóa trước.")) return;

    setSaving(true);
    try {
      const csrfToken = await getCsrfToken();
      await api.delete(`/curriculum/chapters/${selectedId}`, {
        headers: { "x-csrf-token": csrfToken },
      });
      setMessage({ type: "success", text: "Xóa chương học thành công." });
      resetForm();
      await fetchChapters();
    } catch (err: any) {
      console.error(err);
      const messageText =
        err instanceof AxiosError
          ? err.response?.data?.message || "Không thể xóa chương học."
          : "Không thể xóa chương học.";
      setMessage({ type: "error", text: messageText });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
      <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-amber-900">
              Danh sách chương
            </h2>
            <div className="flex gap-2 mt-2">
              {["All", "10", "11", "12"].map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGradeFilter(g)}
                  className={`px-3 py-1 text-xs rounded border transition ${
                    selectedGradeFilter === g
                      ? "bg-amber-700 text-white border-amber-700 font-semibold"
                      : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  {g === "All" ? "Tất cả" : `Lớp ${g}`}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 hover:bg-amber-50 shrink-0"
          >
            Tạo mới
          </button>
        </div>

        {chaptersLoading ? (
          <div className="p-6 text-center text-amber-600">Đang tải...</div>
        ) : (
          <div className="divide-y divide-amber-100">
            {filteredChapters.map((chapter) => (
              <button
                key={chapter._id}
                type="button"
                onClick={() => handleSelectChapter(chapter)}
                className={`w-full text-left px-5 py-4 transition flex gap-4 items-start ${
                  selectedId === chapter._id ? "bg-amber-50" : "hover:bg-amber-50/60"
                }`}
              >
                {chapter.coverImage && (
                  <img
                    src={chapter.coverImage}
                    alt={chapter.title}
                    className="w-16 h-16 object-cover rounded-lg border border-amber-200 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-900">{chapter.title}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] bg-amber-50 text-amber-850 px-2 py-0.5 rounded-full border border-amber-200 font-bold">
                      Lớp {chapter.grade}
                    </span>
                    <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 font-bold">
                      Thứ tự: {chapter.order}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-amber-655 line-clamp-2">
                    {chapter.description}
                  </p>
                </div>
              </button>
            ))}

            {filteredChapters.length === 0 && (
              <div className="p-6 text-center text-amber-600">Chưa có chương học nào được cấu hình.</div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm h-fit">
        <div className="border-b border-amber-100 px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-amber-900">
            {formMode === "create" ? "Tạo chương học mới" : "Chỉnh sửa chương học"}
          </h2>
          <p className="text-xs text-amber-600 mt-1">
            Thiết lập các thuộc tính và ảnh bìa cho chương mục học tập.
          </p>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
              Tên chương học
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setFormField("title", e.target.value)}
              className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Nhập tên chương học"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
              Mô tả ngắn
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setFormField("description", e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Nhập mô tả cho chương học này"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Khối lớp
              </label>
              <select
                value={form.grade}
                onChange={(e) => setFormField("grade", e.target.value)}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="10">Lớp 10</option>
                <option value="11">Lớp 11</option>
                <option value="12">Lớp 12</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Thứ tự hiển thị
              </label>
              <input
                type="text"
                value={form.order}
                onChange={(e) => setFormField("order", e.target.value)}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                placeholder="0"
              />
            </div>
          </div>



          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
              Ảnh bìa chương học
            </label>
            <CustomFileInput
              accept="image/*"
              onChange={handleImageUpload}
              fileCount={form.coverImage ? 1 : 0}
              disabled={uploadingImage}
            />
            {uploadingImage && (
              <p className="text-xs text-amber-600 mt-1 italic animate-pulse">Đang tải ảnh lên Cloudinary...</p>
            )}
            {form.coverImage && (
              <div className="mt-3">
                <p className="text-[11px] text-amber-600 font-semibold mb-1">Ảnh bìa hiện tại:</p>
                <img
                  src={form.coverImage}
                  alt="Cover Preview"
                  className="w-full h-32 object-cover rounded-xl border border-amber-200 bg-amber-50/20"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || uploadingImage}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : formMode === "create" ? "Tạo chương" : "Cập nhật"}
            </button>
            {formMode === "edit" && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                Xóa chương
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
