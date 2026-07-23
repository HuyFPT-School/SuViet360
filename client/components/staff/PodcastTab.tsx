import React, { useState, useMemo } from "react";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import { Lesson, Podcast, PodcastFormState, emptyPodcastForm } from "./types";
import { CustomFileInput, renderStaffStatusBadge, translateLevel, getCsrfToken } from "./helpers";

type PodcastTabProps = {
  user: any;
  lessons: Lesson[];
  podcasts: Podcast[];
  podcastsLoading: boolean;
  onRefreshPodcasts: () => Promise<void>;
  setMessage: (msg: { type: "error" | "success"; text: string } | null) => void;
};

export default function PodcastTab({
  user,
  lessons,
  podcasts,
  podcastsLoading,
  onRefreshPodcasts,
  setMessage,
}: PodcastTabProps) {
  const [selectedPodcastId, setSelectedPodcastId] = useState<string | null>(null);
  const [podcastFormMode, setPodcastFormMode] = useState<"create" | "edit">("create");
  const [podcastForm, setPodcastForm] = useState<PodcastFormState>(emptyPodcastForm);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const paginatedPodcasts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return podcasts.slice(start, start + pageSize);
  }, [podcasts, currentPage, pageSize]);

  const totalPages = Math.ceil(podcasts.length / pageSize) || 1;

  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    podcasts.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [podcasts]);

  const selectedPodcast = useMemo(() => podcasts.find((p) => p._id === selectedPodcastId), [podcasts, selectedPodcastId]);

  const isTeacherPodcast = useMemo(() => {
    return podcastFormMode === "edit" && selectedPodcast?.createdBy && (
      typeof selectedPodcast.createdBy === "object" && (selectedPodcast.createdBy as any).role === "teacher"
    );
  }, [podcastFormMode, selectedPodcast]);

  const setPodcastFormField = <K extends keyof PodcastFormState>(
    field: K,
    value: PodcastFormState[K]
  ) => {
    setPodcastForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetPodcastForm = () => {
    setPodcastForm(emptyPodcastForm);
    setPodcastFormMode("create");
    setSelectedPodcastId(null);
    setIsAddingNewCategory(false);
    setNewCategoryName("");
  };

  const handleRenameCategoryPrompt = async () => {
    const oldCat = podcastForm.category;
    if (!oldCat) return;

    const newCat = window.prompt(`Nhập tên mới cho chủ đề "${oldCat}":`, oldCat);
    if (!newCat || newCat.trim() === "" || newCat.trim() === oldCat) return;

    if (window.confirm(`Bạn có chắc chắn muốn đổi tên chủ đề từ "${oldCat}" thành "${newCat.trim()}" cho TẤT CẢ các podcast liên quan?`)) {
      setSaving(true);
      setMessage(null);
      try {
        const csrfToken = await getCsrfToken();

        await api.put(
          "/staff/categories/rename",
          { oldCategory: oldCat, newCategory: newCat.trim() },
          { headers: { "x-csrf-token": csrfToken } }
        );

        setMessage({ type: "success", text: `Đã đổi tên chủ đề "${oldCat}" thành "${newCat.trim()}" thành công.` });
        await onRefreshPodcasts();
        setPodcastFormField("category", newCat.trim());
      } catch (err: any) {
        console.error(err);
        setMessage({ type: "error", text: "Lỗi đổi tên chủ đề: " + (err.response?.data?.message || err.message) });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDeleteCategoryPrompt = async () => {
    const catToDelete = podcastForm.category;
    if (!catToDelete) return;

    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa chủ đề "${catToDelete}"? Tất cả các podcast thuộc chủ đề này sẽ được chuyển sang chủ đề mặc định "Chủ đề chung".`
      )
    ) {
      setSaving(true);
      setMessage(null);
      try {
        const csrfToken = await getCsrfToken();

        await api.delete(
          "/staff/categories/delete",
          {
            headers: { "x-csrf-token": csrfToken },
            data: { category: catToDelete }
          }
        );

        setMessage({ type: "success", text: `Đã xóa chủ đề "${catToDelete}" thành công. Các podcast liên quan đã chuyển sang "Chủ đề chung".` });
        await onRefreshPodcasts();
        setPodcastFormField("category", "");
      } catch (err: any) {
        console.error(err);
        setMessage({ type: "error", text: "Lỗi xóa chủ đề: " + (err.response?.data?.message || err.message) });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSelectPodcast = (podcast: Podcast) => {
    setSelectedPodcastId(podcast._id);
    setPodcastFormMode("edit");
    setIsAddingNewCategory(false);
    setNewCategoryName("");
    const draft = podcast.pendingDraft;
    setPodcastForm({
      title: draft?.title ?? podcast.title,
      description: draft?.description ?? podcast.description ?? "",
      content: draft?.content ?? podcast.content ?? "",
      level: draft?.level ?? podcast.level ?? "Medium",
      category: draft?.category ?? podcast.category ?? "",
      lessonId: draft?.lessonId
        ? (typeof draft.lessonId === "object" ? draft.lessonId._id : draft.lessonId)
        : (podcast.lessonId ? (typeof podcast.lessonId === "object" ? podcast.lessonId._id : podcast.lessonId) : ""),
      thumbnailFile: null,
      audioFile: null,
    });
  };

  const handlePodcastSubmit = async () => {
    setMessage(null);
    if (!podcastForm.title.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập tiêu đề podcast." });
      return;
    }
    if (podcastFormMode === "create") {
      if (!podcastForm.thumbnailFile) {
        setMessage({ type: "error", text: "Vui lòng tải lên ảnh giao diện." });
        return;
      }
      if (!podcastForm.audioFile) {
        setMessage({ type: "error", text: "Vui lòng tải lên file âm thanh." });
        return;
      }
    }

    setSaving(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("title", podcastForm.title.trim());
      formData.append("description", podcastForm.description.trim());
      formData.append("content", podcastForm.content.trim());
      formData.append("level", podcastForm.level.trim());
      formData.append("category", podcastForm.category.trim());
      if (podcastForm.lessonId) {
        formData.append("lessonId", podcastForm.lessonId);
      }

      if (podcastForm.thumbnailFile) {
        formData.append("thumbnail", podcastForm.thumbnailFile);
      }
      if (podcastForm.audioFile) {
        formData.append("audio", podcastForm.audioFile);
      }

      const csrfToken = await getCsrfToken();
      const onProgress = (progressEvent: any) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      };

      if (podcastFormMode === "create") {
        await api.post("/staff/podcasts", formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
          onUploadProgress: onProgress,
        });
        setMessage({ type: "success", text: "Tạo podcast thành công." });
        resetPodcastForm();
      } else if (selectedPodcastId) {
        await api.put(`/staff/podcasts/${selectedPodcastId}`, formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
          onUploadProgress: onProgress,
        });
        setMessage({ type: "success", text: "Cập nhật podcast thành công." });
      }
      await onRefreshPodcasts();
    } catch (error) {
      const messageText =
        error instanceof AxiosError
          ? error.response?.data?.message || "Có lỗi xảy ra khi lưu podcast."
          : "Có lỗi xảy ra khi lưu podcast.";
      setMessage({ type: "error", text: messageText });
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handlePodcastDelete = async () => {
    if (!selectedPodcastId) return;
    const ok = window.confirm("Bạn có chắc muốn xóa podcast này?");
    if (!ok) return;

    try {
      const csrfToken = await getCsrfToken();
      await api.delete(`/staff/podcasts/${selectedPodcastId}`, {
        headers: { "x-csrf-token": csrfToken },
      });
      setMessage({ type: "success", text: "Xóa podcast thành công." });
      resetPodcastForm();
      await onRefreshPodcasts();
    } catch (error) {
      const messageText =
        error instanceof AxiosError
          ? error.response?.data?.message || "Không thể xóa podcast."
          : "Không thể xóa podcast.";
      setMessage({ type: "error", text: messageText });
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] font-sans">
        {/* LEFT COLUMN: PODCAST LIST */}
        <div className="staff-card-v2 flex flex-col justify-between">
          <div>
            <div className="staff-card-header-v2">
              <h2 className="staff-card-title-v2">
                <span>🎙️</span>
                <span>Danh sách podcast</span>
              </h2>
              <button
                type="button"
                onClick={resetPodcastForm}
                className="staff-btn-brown text-xs py-1.5 px-3.5"
              >
                + Tạo mới
              </button>
            </div>

            {podcastsLoading ? (
              <div className="p-8 text-center text-[#8C6A34] text-sm">Đang tải podcast...</div>
            ) : (
              <div className="divide-y divide-[#F3E6CE]">
                {paginatedPodcasts.map((podcast) => (
                  <div
                    key={podcast._id}
                    onClick={() => handleSelectPodcast(podcast)}
                    className={`staff-item-row-v2 ${
                      selectedPodcastId === podcast._id ? "staff-item-row-v2--selected" : ""
                    }`}
                  >
                    <div className="staff-thumb-wrapper">
                      <img
                        src={podcast.thumbnail || "/images/login_background.png"}
                        alt={podcast.title}
                        className="staff-thumb-img"
                      />
                    </div>
                    <div className="staff-item-meta">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="staff-item-title">{podcast.title}</h3>
                        {renderStaffStatusBadge(podcast.status)}
                      </div>
                      <p className="staff-item-excerpt">{podcast.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-[#8C6A34] font-medium">
                        {new Date(podcast.updatedAt || podcast.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                      <button
                        type="button"
                        className="text-[#8C6A34] hover:text-[#2A1407] p-1 font-bold text-base"
                        title="Thao tác"
                      >
                        ⋮
                      </button>
                    </div>
                  </div>
                ))}

                {podcasts.length === 0 && (
                  <div className="p-8 text-center text-[#8C6A34] text-sm italic">
                    Chưa có podcast nào.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pagination bar */}
          {podcasts.length > 0 && (
            <div className="staff-pagination-bar">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="staff-page-btn disabled:opacity-40"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`staff-page-btn ${
                      currentPage === idx + 1 ? "staff-page-btn--active" : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="staff-page-btn disabled:opacity-40"
                >
                  ›
                </button>
              </div>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#FFFDF8] border border-[#E6D8BC] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#2A1407] outline-none"
              >
                <option value={5}>5 / trang</option>
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
              </select>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PODCAST FORM */}
        <div className="staff-card-v2">
          <div className="staff-card-header-v2">
            <div>
              <h2 className="staff-card-title-v2">
                <span>🎙️</span>
                <span>{podcastFormMode === "create" ? "Tạo podcast" : "Chỉnh sửa podcast"}</span>
              </h2>
              <p className="text-xs text-[#8C6A34] mt-0.5">
                {podcastFormMode === "create"
                  ? "Điền đầy đủ thông tin và tải lên tệp âm thanh/ảnh giao diện."
                  : "Có thể cập nhật thông tin hoặc upload file mới để thay thế."}
              </p>
            </div>
          </div>

          <div className="space-y-5 p-5">
            {podcastFormMode === "edit" && selectedPodcast?.status === "Rejected" && selectedPodcast?.reviewFeedback && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <h3 className="font-semibold text-rose-950 mb-1 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Podcast bị từ chối duyệt
                </h3>
                <p className="font-medium text-rose-700">{selectedPodcast.reviewFeedback}</p>
              </div>
            )}

            {podcastFormMode === "edit" && selectedPodcast?.pendingDraft && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-850">
                <h3 className="font-semibold text-sky-950 mb-1 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Có bản chỉnh sửa đang chờ duyệt
                </h3>
                <p className="font-medium text-sky-700">
                  Podcast này đã được xuất bản. Bản sửa đổi của bạn đang ở trạng thái nháp chờ Giáo viên duyệt trước khi áp dụng.
                </p>
              </div>
            )}

            {isTeacherPodcast && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                <h3 className="font-bold text-emerald-950 mb-1 flex items-center gap-1.5 text-sm">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Quyền sở hữu của Giáo viên & Học sinh VIP
                </h3>
                <p className="mb-2">
                  Podcast này được biên soạn bởi Giáo viên <strong>{(selectedPodcast?.createdBy as any)?.name}</strong> ({(selectedPodcast?.createdBy as any)?.email}).
                </p>
                {selectedPodcast?.podcastRequest && (
                  <div className="pt-2 border-t border-emerald-200/60 text-[11px] space-y-1 text-emerald-800">
                    <p>• <strong>Thời kỳ Lịch sử:</strong> {(selectedPodcast.podcastRequest as any).historicalPeriod || "Chưa rõ"}</p>
                    <p>• <strong>Học sinh yêu cầu (VIP):</strong> {selectedPodcast.podcastRequest.requester?.name || "Học sinh VIP"} ({(selectedPodcast.podcastRequest.requester as any)?.email})</p>
                  </div>
                )}
                <p className="mt-2 text-[11px] text-emerald-700 italic">
                  * Vì đây là podcast chuyên biệt do Giáo viên tạo theo Yêu cầu học tập riêng tư của Học sinh gói VIP, Staff không có quyền chỉnh sửa hoặc xóa dữ liệu này. Chỉ Giáo viên chịu trách nhiệm biên soạn mới có quyền chỉnh sửa.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Tiêu đề
              </label>
              <input
                type="text"
                value={podcastForm.title}
                onChange={(e) => setPodcastFormField("title", e.target.value)}
                disabled={isTeacherPodcast}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-100 disabled:cursor-not-allowed"
                placeholder="Nhập tiêu đề podcast"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Mô tả ngắn
              </label>
              <textarea
                value={podcastForm.description}
                onChange={(e) => setPodcastFormField("description", e.target.value)}
                disabled={isTeacherPodcast}
                rows={2}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-100 disabled:cursor-not-allowed"
                placeholder="Tóm tắt ngắn về podcast này"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Nội dung chi tiết / Ghi chú
              </label>
              <textarea
                value={podcastForm.content}
                onChange={(e) => setPodcastFormField("content", e.target.value)}
                disabled={isTeacherPodcast}
                rows={4}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-100 disabled:cursor-not-allowed"
                placeholder="Nội dung chính hoặc transcript của podcast"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mt-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Chủ đề (Category)
                </label>
                <div className="flex items-center gap-3">
                  {podcastForm.category && !isAddingNewCategory && !isTeacherPodcast && (
                    <>
                      <button
                        type="button"
                        onClick={handleRenameCategoryPrompt}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer font-medium"
                      >
                        Đổi tên
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteCategoryPrompt}
                        className="text-xs font-semibold text-red-700 hover:text-red-900 underline cursor-pointer font-medium"
                      >
                        Xóa
                      </button>
                    </>
                  )}
                  {!isTeacherPodcast && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewCategory(!isAddingNewCategory);
                        setNewCategoryName("");
                        setPodcastFormField("category", "");
                      }}
                      className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline cursor-pointer font-medium"
                    >
                      {isAddingNewCategory ? "Hủy" : "Tạo mới"}
                    </button>
                  )}
                </div>
              </div>
              {isAddingNewCategory ? (
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    setPodcastFormField("category", e.target.value);
                  }}
                  disabled={isTeacherPodcast}
                  className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-100 disabled:cursor-not-allowed"
                  placeholder="Nhập tên chủ đề mới (ví dụ: liên hợp quốc...)"
                />
              ) : (
                <select
                  value={podcastForm.category}
                  onChange={(e) => setPodcastFormField("category", e.target.value)}
                  disabled={isTeacherPodcast}
                  className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-100 disabled:cursor-not-allowed"
                >
                  <option value="">Chọn chủ đề (Bắt buộc)</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Trình độ (Level)
              </label>
              <select
                value={podcastForm.level}
                onChange={(e) => setPodcastFormField("level", e.target.value)}
                disabled={isTeacherPodcast}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-100 disabled:cursor-not-allowed"
              >
                <option value="Easy">Dễ</option>
                <option value="Medium">Trung cấp</option>
                <option value="Hard">Nâng cao</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Trò chơi liên kết (Chứa Game 2D)
              </label>
              <select
                value={podcastForm.lessonId}
                onChange={(e) => setPodcastFormField("lessonId", e.target.value)}
                disabled={isTeacherPodcast}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-100 disabled:cursor-not-allowed"
              >
                <option value="">Không liên kết game</option>
                {lessons
                  .filter(
                    (lesson) =>
                      lesson.status === "Published" ||
                      lesson._id === podcastForm.lessonId
                  )
                  .map((lesson) => (
                    <option key={lesson._id} value={lesson._id}>
                      {lesson.title} {lesson.status !== "Published" && `(${lesson.status})`}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Ảnh giao diện {podcastFormMode === "create" && "(bắt buộc)"}
              </label>
              <CustomFileInput
                accept="image/*"
                onChange={(e) => setPodcastFormField("thumbnailFile", e.target.files?.[0] || null)}
                fileCount={podcastForm.thumbnailFile ? 1 : 0}
                singleFileName={podcastForm.thumbnailFile?.name}
                disabled={isTeacherPodcast}
              />
              {podcastFormMode === "edit" && selectedPodcast?.thumbnail && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-[11px] text-amber-600 font-semibold">Ảnh giao diện hiện tại:</p>
                  <div className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                    <img
                      src={selectedPodcast.thumbnail}
                      alt="Ảnh giao diện hiện tại"
                      className="w-16 h-16 object-cover rounded-lg border border-amber-200 bg-white"
                    />
                    <a
                      href={selectedPodcast.thumbnail}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-800 underline hover:text-amber-900 break-all truncate block"
                    >
                      {selectedPodcast.thumbnail.split("/").pop()}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                File âm thanh {podcastFormMode === "create" && "(bắt buộc)"}
              </label>
              <CustomFileInput
                accept="audio/*"
                onChange={(e) => setPodcastFormField("audioFile", e.target.files?.[0] || null)}
                fileCount={podcastForm.audioFile ? 1 : 0}
                singleFileName={podcastForm.audioFile?.name}
                disabled={isTeacherPodcast}
              />
              {podcastFormMode === "edit" && selectedPodcast?.audioUrl && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-[11px] text-amber-600 font-semibold">Tệp âm thanh hiện tại:</p>
                  <div className="flex flex-col gap-2 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                    <audio src={selectedPodcast.audioUrl} controls className="w-full h-8 max-w-md" />
                    <a
                      href={selectedPodcast.audioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-800 underline hover:text-amber-900 break-all truncate block"
                    >
                      {selectedPodcast.audioUrl.split("/").pop()}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              {!isTeacherPodcast && (
                <button
                  type="button"
                  onClick={handlePodcastSubmit}
                  className="staff-btn-brown w-full py-3 text-sm"
                >
                  🎙️ {podcastFormMode === "create" ? "Tạo podcast" : "Lưu cập nhật"}
                </button>
              )}
              {podcastFormMode === "edit" && !isTeacherPodcast && (
                <button
                  type="button"
                  onClick={handlePodcastDelete}
                  className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-100 transition-colors w-full"
                >
                  Xóa podcast
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {saving && uploadProgress !== null && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div className="bg-[#FFFBF2] border-2 border-amber-700 rounded-xl p-6 w-[90%] max-w-[400px] shadow-2xl text-center">
            <h3 className="font-semibold text-lg text-amber-900 mb-4 tracking-wider uppercase" style={{ fontFamily: "Cinzel, serif" }}>
              {uploadProgress === 100 ? "ĐANG XỬ LÝ DỮ LIỆU..." : "ĐANG TẢI PODCAST LÊN..."}
            </h3>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-amber-600 rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="text-xl font-bold text-amber-900 mb-2">
              {uploadProgress}%
            </div>
            <p className="text-xs text-amber-800/80">
              {uploadProgress === 100
                ? "Đang lưu thông tin vào cơ sở dữ liệu, vui lòng đợi..."
                : "Đang tải ảnh giao diện và tệp âm thanh lên máy chủ..."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
