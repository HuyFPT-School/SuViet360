import React, { useState, useEffect, useMemo } from "react";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import { Lesson, FormMode, LessonFormState, emptyFormState } from "./types";
import { CustomFileInput, renderStaffStatusBadge, getCsrfToken } from "./helpers";

type GameTabProps = {
  user: any;
  lessons: Lesson[];
  lessonsLoading: boolean;
  onRefreshLessons: () => Promise<void>;
  prefilledGameForm: LessonFormState | null;
  onClearPrefilledGameForm: () => void;
  setMessage: (msg: { type: "error" | "success"; text: string } | null) => void;
};

export default function GameTab({
  user,
  lessons,
  lessonsLoading,
  onRefreshLessons,
  prefilledGameForm,
  onClearPrefilledGameForm,
  setMessage,
}: GameTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [form, setForm] = useState<LessonFormState>(emptyFormState);
  const [newTilesetName, setNewTilesetName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const paginatedLessons = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return lessons.slice(start, start + pageSize);
  }, [lessons, currentPage, pageSize]);

  const totalPages = Math.ceil(lessons.length / pageSize) || 1;

  const selectedLesson = useMemo(() => lessons.find((l) => l._id === selectedId), [lessons, selectedId]);

  // Handle prefilled form from requests tab
  useEffect(() => {
    if (prefilledGameForm) {
      setForm(prefilledGameForm);
      setFormMode("create");
      setSelectedId(null);
      onClearPrefilledGameForm();
    }
  }, [prefilledGameForm, onClearPrefilledGameForm]);

  const setFormField = <K extends keyof LessonFormState>(
    field: K,
    value: LessonFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyFormState);
    setNewTilesetName("");
    setFormMode("create");
    setSelectedId(null);
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedId(lesson._id);
    setFormMode("edit");
    const draft = lesson.pendingDraft;
    setForm({
      title: draft?.title ?? lesson.title,
      content: draft?.content ?? lesson.content,
      spawnX: String(draft?.spawnPoint?.x ?? lesson.game.spawnPoint.x),
      spawnY: String(draft?.spawnPoint?.y ?? lesson.game.spawnPoint.y),
      tilesetNames: draft?.tilesets 
        ? draft.tilesets.map((ts: any) => ts.name)
        : lesson.game.tilesets.map((ts) => ts.name),
      tilemapFile: null,
      tilesetFiles: [],
      idleSprites: [],
      runSprites: [],
    });
    setNewTilesetName("");
  };

  const buildFormData = (mode: FormMode) => {
    const formData = new FormData();

    if (form.title.trim()) formData.append("title", form.title.trim());
    if (form.content.trim()) formData.append("content", form.content.trim());
    if (form.spawnX.trim()) formData.append("spawnPoint[x]", form.spawnX.trim());
    if (form.spawnY.trim()) formData.append("spawnPoint[y]", form.spawnY.trim());

    if (form.tilemapFile) {
      formData.append("tilemapJson", form.tilemapFile);
    }

    if (form.tilesetFiles.length > 0) {
      for (const file of form.tilesetFiles) {
        formData.append("tilesets", file);
      }
      formData.append("tilesetNames", JSON.stringify(form.tilesetNames));
    } else if (mode === "create" && form.tilesetNames.length > 0) {
      formData.append("tilesetNames", JSON.stringify(form.tilesetNames));
    }

    for (const file of form.idleSprites) {
      formData.append("idleSprites", file);
    }

    for (const file of form.runSprites) {
      formData.append("runSprites", file);
    }

    return formData;
  };

  const validateForm = (mode: FormMode) => {
    const spawnX = Number(form.spawnX);
    const spawnY = Number(form.spawnY);

    if (!form.title.trim() || !form.content.trim()) {
      return "Vui lòng nhập đầy đủ tiêu đề và nội dung.";
    }

    if (Number.isNaN(spawnX) || Number.isNaN(spawnY)) {
      return "Spawn point cần là số hợp lệ.";
    }

    if (mode === "create") {
      if (!form.tilemapFile) return "Cần tải lên file Tilemap JSON.";
      if (form.tilesetFiles.length === 0) return "Cần ít nhất 1 ảnh tileset.";
      if (form.tilesetNames.length !== form.tilesetFiles.length) {
        return "Số tileset name phải khớp với số ảnh tileset.";
      }
    }

    if (form.tilesetFiles.length > 0 && form.tilesetNames.length !== form.tilesetFiles.length) {
      return "Số tileset name phải khớp với số ảnh tileset.";
    }

    return "";
  };

  const handleSubmit = async () => {
    setMessage(null);
    const error = validateForm(formMode);
    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }

    setSaving(true);
    setUploadProgress(0);
    try {
      const formData = buildFormData(formMode);
      const csrfToken = await getCsrfToken();
      const onProgress = (progressEvent: any) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      };

      if (formMode === "create") {
        await api.post("/lessons", formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
          onUploadProgress: onProgress,
        });
        setMessage({ type: "success", text: "Tạo trò chơi thành công." });
        resetForm();
      } else if (selectedId) {
        await api.put(`/lessons/${selectedId}`, formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
          onUploadProgress: onProgress,
        });
        setMessage({ type: "success", text: "Cập nhật trò chơi thành công." });
      }

      await onRefreshLessons();
    } catch (error) {
      const messageText =
        error instanceof AxiosError
          ? error.response?.data?.message || "Có lỗi xảy ra khi lưu trò chơi."
          : "Có lỗi xảy ra khi lưu trò chơi.";
      setMessage({ type: "error", text: messageText });
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const ok = window.confirm("Bạn có chắc muốn xóa trò chơi này?");
    if (!ok) return;

    try {
      const csrfToken = await getCsrfToken();
      await api.delete(`/lessons/${selectedId}`, {
        headers: { "x-csrf-token": csrfToken },
      });
      setMessage({ type: "success", text: "Xóa trò chơi thành công." });
      resetForm();
      await onRefreshLessons();
    } catch (error) {
      const messageText =
        error instanceof AxiosError
          ? error.response?.data?.message || "Không thể xóa trò chơi."
          : "Không thể xóa trò chơi.";
      setMessage({ type: "error", text: messageText });
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] font-sans">
        {/* LEFT COLUMN: LIST OF GAMES */}
        <div className="staff-card-v2 flex flex-col justify-between">
          <div>
            <div className="staff-card-header-v2">
              <h2 className="staff-card-title-v2">
                <span>🎮</span>
                <span>Danh sách trò chơi</span>
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="staff-btn-brown text-xs py-1.5 px-3.5"
              >
                + Tạo mới
              </button>
            </div>

            {lessonsLoading ? (
              <div className="p-8 text-center text-[#8C6A34] text-sm">Đang tải trò chơi...</div>
            ) : (
              <div className="divide-y divide-[#F3E6CE]">
                {paginatedLessons.map((lesson) => {
                  const thumbnailSrc =
                    lesson.game?.tilesets?.[0]?.imageUrl ||
                    "/images/login_background.png";

                  return (
                    <div
                      key={lesson._id}
                      onClick={() => handleSelectLesson(lesson)}
                      className={`staff-item-row-v2 ${
                        selectedId === lesson._id ? "staff-item-row-v2--selected" : ""
                      }`}
                    >
                      <div className="staff-thumb-wrapper">
                        <img
                          src={thumbnailSrc}
                          alt={lesson.title}
                          className="staff-thumb-img"
                        />
                      </div>

                      <div className="staff-item-meta">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="staff-item-title">{lesson.title}</h3>
                          {renderStaffStatusBadge(lesson.status)}
                        </div>
                        <p className="staff-item-excerpt">{lesson.content}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-[#8C6A34] font-medium">
                          {new Date(lesson.updatedAt).toLocaleDateString("vi-VN")}
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
                  );
                })}

                {lessons.length === 0 && (
                  <div className="p-8 text-center text-[#8C6A34] text-sm italic">
                    Chưa có trò chơi nào.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pagination bar */}
          {lessons.length > 0 && (
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

        {/* RIGHT COLUMN: CREATE / EDIT GAME FORM */}
        <div className="staff-card-v2">
          <div className="staff-card-header-v2">
            <div>
              <h2 className="staff-card-title-v2">
                <span>🎮</span>
                <span>{formMode === "create" ? "Tạo trò chơi" : "Chỉnh sửa trò chơi"}</span>
              </h2>
              <p className="text-xs text-[#8C6A34] mt-0.5">
                {formMode === "create"
                  ? "Điền đầy đủ thông tin và upload assets để tạo trò chơi mới."
                  : "Có thể cập nhật nội dung và thay thế file khi cần."}
              </p>
            </div>
          </div>

          <div className="space-y-5 p-5">
            {formMode === "edit" && selectedLesson?.status === "Rejected" && selectedLesson?.reviewFeedback && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <h3 className="font-semibold text-rose-950 mb-1 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Trò chơi bị từ chối duyệt
                </h3>
                <p className="font-medium text-rose-700">{selectedLesson.reviewFeedback}</p>
              </div>
            )}

            {formMode === "edit" && selectedLesson?.pendingDraft && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-850">
                <h3 className="font-semibold text-sky-950 mb-1 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Có chỉnh sửa đang chờ duyệt
                </h3>
                <p className="font-medium text-sky-700">
                  Trò chơi này đã được xuất bản (Published). Các thay đổi mới nhất đang được lưu tạm chờ Giáo viên/Admin duyệt. Dưới đây là nội dung chỉnh sửa mới nhất của bạn.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8C6A34]">
                TIÊU ĐỀ *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setFormField("title", e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#E6D8BC] bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#2A1407] outline-none focus:border-[#53270D]"
                placeholder="Nhập tiêu đề trò chơi"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8C6A34]">
                NỘI DUNG *
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setFormField("content", e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-[#E6D8BC] bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#2A1407] outline-none focus:border-[#53270D]"
                placeholder="Mô tả nội dung trò chơi"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8C6A34]">
                TILEMAP JSON {formMode === "create" && "(BẮT BUỘC)"}
              </label>
              <CustomFileInput
                accept="application/json"
                onChange={(e) => setFormField("tilemapFile", e.target.files?.[0] || null)}
                fileCount={form.tilemapFile ? 1 : 0}
                singleFileName={form.tilemapFile?.name}
              />
              {formMode === "edit" && selectedLesson?.game?.tilemapJsonUrl && (
                <p className="mt-1 text-xs text-[#8C6A34] font-medium">
                  Tệp hiện tại: <a href={selectedLesson.game.tilemapJsonUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#2A1407] break-all">{selectedLesson.game.tilemapJsonUrl.split('/').pop()}</a>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8C6A34]">
                TILESET IMAGES {formMode === "create" && "(BẮT BUỘC)"}
              </label>

              {form.tilesetFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  {form.tilesetFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-xl border border-[#E6D8BC] bg-[#FAF4E8] px-3 py-2">
                      <span className="text-xs text-[#8C6A34] font-medium shrink-0 truncate max-w-[120px]" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[#8C6A34] shrink-0">→</span>
                      <input
                        type="text"
                        value={form.tilesetNames[idx] ?? ""}
                        onChange={(e) => {
                          const updated = [...form.tilesetNames];
                          updated[idx] = e.target.value;
                          setFormField("tilesetNames", updated);
                        }}
                        className="flex-1 min-w-0 rounded-lg border border-[#E6D8BC] bg-white px-2 py-1 text-xs text-[#2A1407] focus:outline-none font-mono"
                        placeholder="Tên tileset trong Tiled (vd: socauhoi)"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormField("tilesetFiles", form.tilesetFiles.filter((_, i) => i !== idx));
                          setFormField("tilesetNames", form.tilesetNames.filter((_, i) => i !== idx));
                        }}
                        className="shrink-0 text-red-500 hover:text-red-700 text-sm font-bold leading-none px-1"
                        title="Xóa tileset này"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#53270D] hover:bg-[#3D1C08] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-colors duration-150 select-none">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Thêm tileset</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const newFiles = e.target.files ? Array.from(e.target.files) : [];
                      if (newFiles.length === 0) return;
                      const newNames = newFiles.map((f) => {
                        const parts = f.name.split(".");
                        parts.pop();
                        return parts.join(".");
                      });
                      setFormField("tilesetFiles", [...form.tilesetFiles, ...newFiles]);
                      setFormField("tilesetNames", [...form.tilesetNames, ...newNames]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <span className="text-xs text-[#8C6A34] font-medium">
                  {form.tilesetFiles.length > 0
                    ? `${form.tilesetFiles.length} tileset — nhấn để thêm nữa`
                    : "Chưa có tileset nào"}
                </span>
              </div>

              {formMode === "edit" && selectedLesson?.game?.tilesets && selectedLesson.game.tilesets.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-[#8C6A34] font-semibold mb-1">Các tileset hiện tại (sẽ bị thay thế nếu upload mới):</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedLesson.game.tilesets.map((ts, idx) => (
                      <div key={idx} className="inline-flex items-center gap-1.5 bg-[#FAF4E8] border border-[#E6D8BC] px-2 py-1 rounded-lg text-xs text-[#2A1407] font-medium">
                        <img src={ts.imageUrl} alt={ts.name} className="w-6 h-6 object-contain rounded bg-white border border-[#E6D8BC]" />
                        <span className="font-mono">{ts.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <details className="group border border-[#E6D8BC] bg-[#FAF4E8]/40 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between cursor-pointer px-4 py-3 bg-[#FAF4E8] text-xs font-bold uppercase tracking-wider text-[#8C6A34] select-none">
                <span>THAY ĐỔI NHÂN VẬT (TÙY CHỌN)</span>
                <span className="transition-transform duration-200 group-open:rotate-180 text-[#8C6A34]">▼</span>
              </summary>
              <div className="p-4 space-y-4 border-t border-[#E6D8BC] bg-[#FFFDF8]">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#8C6A34]">
                      Idle sprites
                    </label>
                    <CustomFileInput
                      multiple
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) =>
                        setFormField(
                          "idleSprites",
                          e.target.files ? Array.from(e.target.files) : []
                        )
                      }
                      fileCount={form.idleSprites.length}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#8C6A34]">
                      Run sprites
                    </label>
                    <CustomFileInput
                      multiple
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) =>
                        setFormField(
                          "runSprites",
                          e.target.files ? Array.from(e.target.files) : []
                        )
                      }
                      fileCount={form.runSprites.length}
                    />
                  </div>
                </div>
              </div>
            </details>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                className="staff-btn-brown w-full py-3 text-sm"
              >
                🎮 {formMode === "create" ? "Tạo trò chơi" : "Lưu cập nhật"}
              </button>
              {formMode === "edit" && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-100 transition-colors w-full"
                >
                  Xóa trò chơi
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
              {uploadProgress === 100 ? "ĐANG XỬ LÝ DỮ LIỆU..." : "ĐANG TẢI TRÒ CHƠI LÊN..."}
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
                : "Đang tải tệp bản đồ và hình ảnh nhân vật lên máy chủ..."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
