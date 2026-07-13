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
      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-amber-900">
              Danh sách trò chơi
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 hover:bg-amber-50"
            >
              Tạo mới
            </button>
          </div>

          {lessonsLoading ? (
            <div className="p-6 text-center text-amber-600">Đang tải...</div>
          ) : (
            <div className="divide-y divide-amber-100">
              {lessons.map((lesson) => (
                <button
                  key={lesson._id}
                  type="button"
                  onClick={() => handleSelectLesson(lesson)}
                  className={`w-full text-left px-5 py-4 transition ${selectedId === lesson._id
                      ? "bg-amber-50"
                      : "hover:bg-amber-50/60"
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-amber-900">{lesson.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {renderStaffStatusBadge(lesson.status)}
                      </div>
                      <p className="mt-2 text-xs text-amber-600 line-clamp-2">
                        {lesson.content}
                      </p>
                    </div>
                    <span className="text-xs text-amber-500 whitespace-nowrap">
                      {new Date(lesson.updatedAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </button>
              ))}

              {lessons.length === 0 && (
                <div className="p-6 text-center text-amber-600">Chưa có trò chơi nào.</div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm">
          <div className="border-b border-amber-100 px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-amber-900">
              {formMode === "create" ? "Tạo trò chơi" : "Chỉnh sửa trò chơi"}
            </h2>
            <p className="text-xs text-amber-600 mt-1">
              {formMode === "create"
                ? "Điền đủ thông tin và upload assets để tạo trò chơi."
                : "Có thể cập nhật nội dung và thay thế file khi cần."}
            </p>
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Tiêu đề
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setFormField("title", e.target.value)}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Nhập tiêu đề trò chơi"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Nội dung
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setFormField("content", e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Mô tả nội dung trò chơi"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Tilemap JSON {formMode === "create" && "(bắt buộc)"}
              </label>
              <CustomFileInput
                accept="application/json"
                onChange={(e) => setFormField("tilemapFile", e.target.files?.[0] || null)}
                fileCount={form.tilemapFile ? 1 : 0}
                singleFileName={form.tilemapFile?.name}
              />
              {formMode === "edit" && selectedLesson?.game?.tilemapJsonUrl && (
                <p className="mt-1 text-xs text-amber-600 font-medium">
                  Tệp hiện tại: <a href={selectedLesson.game.tilemapJsonUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-800 break-all">{selectedLesson.game.tilemapJsonUrl.split('/').pop()}</a>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Tileset images {formMode === "create" && "(bắt buộc)"}
              </label>

              {form.tilesetFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  {form.tilesetFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2">
                      <span className="text-xs text-amber-600 font-medium shrink-0 truncate max-w-[120px]" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-amber-400 shrink-0">→</span>
                      <input
                        type="text"
                        value={form.tilesetNames[idx] ?? ""}
                        onChange={(e) => {
                          const updated = [...form.tilesetNames];
                          updated[idx] = e.target.value;
                          setFormField("tilesetNames", updated);
                        }}
                        className="flex-1 min-w-0 rounded border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                        placeholder="Tên tileset trong Tiled (vd: socauhoi)"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormField("tilesetFiles", form.tilesetFiles.filter((_, i) => i !== idx));
                          setFormField("tilesetNames", form.tilesetNames.filter((_, i) => i !== idx));
                        }}
                        className="shrink-0 text-red-400 hover:text-red-600 text-sm font-bold leading-none"
                        title="Xóa tileset này"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition-colors duration-150 select-none">
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
                <span className="text-xs text-amber-700 font-medium">
                  {form.tilesetFiles.length > 0
                    ? `${form.tilesetFiles.length} tileset — nhấn để thêm nữa`
                    : "Chưa có tileset nào"}
                </span>
              </div>

              {formMode === "edit" && selectedLesson?.game?.tilesets && selectedLesson.game.tilesets.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-amber-600 font-semibold mb-1">Các tileset hiện tại (sẽ bị thay thế nếu upload mới):</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedLesson.game.tilesets.map((ts, idx) => (
                      <div key={idx} className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg text-xs text-amber-800 font-medium">
                        <img src={ts.imageUrl} alt={ts.name} className="w-6 h-6 object-contain rounded bg-white border border-amber-100" />
                        <span className="font-mono">{ts.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <details className="group border border-amber-200 bg-amber-50/20 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between cursor-pointer px-4 py-3 bg-amber-50/50 text-xs font-semibold uppercase tracking-wider text-amber-700 select-none">
                <span>Thay đổi nhân vật (Tuỳ chọn)</span>
                <span className="transition-transform duration-200 group-open:rotate-180 text-amber-600">▼</span>
              </summary>
              <div className="p-4 space-y-4 border-t border-amber-100 bg-white/95">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-amber-800">
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
                    {formMode === "edit" && (() => {
                      const idleKey = Object.keys(selectedLesson?.game?.character?.animations || {}).find(k => k.toLowerCase().includes("idle"));
                      const idleFrames = idleKey ? selectedLesson?.game?.character?.animations[idleKey] : null;
                      if (idleFrames && idleFrames.length > 0) {
                        return (
                          <div className="mt-2">
                            <p className="text-[11px] text-amber-600 font-semibold mb-1">Idle sprites hiện tại ({idleFrames.length} frames):</p>
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-amber-50/50 rounded-lg border border-amber-100">
                              {idleFrames.map((f, idx) => (
                                <img key={idx} src={f.imageUrl} alt={f.key} className="w-8 h-8 object-contain rounded bg-white border border-amber-200" title={f.key} />
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-amber-800">
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
                    {formMode === "edit" && (() => {
                      const runKey = Object.keys(selectedLesson?.game?.character?.animations || {}).find(k => k.toLowerCase().includes("run"));
                      const runFrames = runKey ? selectedLesson?.game?.character?.animations[runKey] : null;
                      if (runFrames && runFrames.length > 0) {
                        return (
                          <div className="mt-2">
                            <p className="text-[11px] text-amber-600 font-semibold mb-1">Run sprites hiện tại ({runFrames.length} frames):</p>
                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-amber-50/50 rounded-lg border border-amber-100">
                              {runFrames.map((f, idx) => (
                                <img key={idx} src={f.imageUrl} alt={f.key} className="w-8 h-8 object-contain rounded bg-white border border-amber-200" title={f.key} />
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50/30 px-3 py-2 text-xs text-amber-700">
                  Khi upload sprite mới, hệ thống sẽ thay toàn bộ animation hiện tại.
                </div>
              </div>
            </details>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
              >
                {formMode === "create" ? "Tạo trò chơi" : "Lưu cập nhật"}
              </button>
              {formMode === "edit" && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
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
