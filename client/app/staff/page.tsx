"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

type Tileset = { name: string; imageUrl: string };

type SpriteFrame = { key: string; frame: number; imageUrl: string };

type LessonGame = {
  tilemapJsonUrl: string;
  tilesets: Tileset[];
  character: { animations: Record<string, SpriteFrame[]> };
  spawnPoint: { x: number; y: number };
};

type Lesson = {
  _id: string;
  title: string;
  content: string;
  game: LessonGame;
  createdAt: string;
  updatedAt: string;
};

type FormMode = "create" | "edit";

type LessonFormState = {
  title: string;
  content: string;
  spawnX: string;
  spawnY: string;
  tilesetNames: string[];
  tilemapFile: File | null;
  tilesetFiles: File[];
  idleSprites: File[];
  runSprites: File[];
};

const emptyFormState: LessonFormState = {
  title: "",
  content: "",
  spawnX: "",
  spawnY: "",
  tilesetNames: [],
  tilemapFile: null,
  tilesetFiles: [],
  idleSprites: [],
  runSprites: [],
};

export default function StaffPage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [isHydrating, setIsHydrating] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [form, setForm] = useState<LessonFormState>(emptyFormState);
  const [newTilesetName, setNewTilesetName] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    refreshUser().finally(() => setIsHydrating(false));
  }, [refreshUser]);

  useEffect(() => {
    if (!user) return;
    setLessonsLoading(true);
    api
      .get<{ success: boolean; lessons: Lesson[] }>("/lessons")
      .then((res) => setLessons(res.data.lessons))
      .catch(() => setMessage({ type: "error", text: "Không thể tải danh sách bài học." }))
      .finally(() => setLessonsLoading(false));
  }, [user]);

  const canAccess = user?.role === "staff" || user?.role === "admin";

  const stats = useMemo(() => {
    const total = lessons.length;
    const latest = lessons[0]?.updatedAt || lessons[0]?.createdAt || "";
    return { total, latest };
  }, [lessons]);

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
    setForm({
      title: lesson.title,
      content: lesson.content,
      spawnX: String(lesson.game.spawnPoint.x),
      spawnY: String(lesson.game.spawnPoint.y),
      tilesetNames: lesson.game.tilesets.map((ts) => ts.name),
      tilemapFile: null,
      tilesetFiles: [],
      idleSprites: [],
      runSprites: [],
    });
    setNewTilesetName("");
  };

  const handleAddTilesetName = () => {
    const trimmed = newTilesetName.trim();
    if (!trimmed) return;
    setForm((prev) => ({ ...prev, tilesetNames: [...prev.tilesetNames, trimmed] }));
    setNewTilesetName("");
  };

  const handleRemoveTilesetName = (index: number) => {
    setForm((prev) => ({
      ...prev,
      tilesetNames: prev.tilesetNames.filter((_, i) => i !== index),
    }));
  };

  const buildFormData = (mode: FormMode) => {
    const formData = new FormData();

    if (form.title.trim()) formData.append("title", form.title.trim());
    if (form.content.trim()) formData.append("content", form.content.trim());
    if (form.spawnX.trim()) formData.append("spawnPoint[x]", form.spawnX.trim());
    if (form.spawnY.trim()) formData.append("spawnPoint[y]", form.spawnY.trim());

    if (mode === "create" && form.tilemapFile) {
      formData.append("tilemapJson", form.tilemapFile);
    }

    if (mode === "edit" && form.tilemapFile) {
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

  const getCsrfToken = async () => {
    const response = await api.get<{ data: { csrfToken: string } }>(
      "/csrf-token"
    );
    return response.data.data.csrfToken;
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

    try {
      const formData = buildFormData(formMode);
      const csrfToken = await getCsrfToken();
      if (formMode === "create") {
        await api.post("/lessons", formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
        });
        setMessage({ type: "success", text: "Tạo bài học thành công." });
        resetForm();
      } else if (selectedId) {
        await api.put(`/lessons/${selectedId}`, formData, {
          headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
        });
        setMessage({ type: "success", text: "Cập nhật bài học thành công." });
      }

      const res = await api.get<{ success: boolean; lessons: Lesson[] }>("/lessons");
      setLessons(res.data.lessons);
    } catch (error) {
      const messageText =
        error instanceof AxiosError
          ? error.response?.data?.message || "Có lỗi xảy ra khi lưu bài học."
          : "Có lỗi xảy ra khi lưu bài học.";
      setMessage({ type: "error", text: messageText });
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const ok = window.confirm("Bạn có chắc muốn xóa bài học này?");
    if (!ok) return;

    try {
      const csrfToken = await getCsrfToken();
      await api.delete(`/lessons/${selectedId}`, {
        headers: { "x-csrf-token": csrfToken },
      });
      setMessage({ type: "success", text: "Xóa bài học thành công." });
      resetForm();
      const res = await api.get<{ success: boolean; lessons: Lesson[] }>("/lessons");
      setLessons(res.data.lessons);
    } catch (error) {
      const messageText =
        error instanceof AxiosError
          ? error.response?.data?.message || "Không thể xóa bài học."
          : "Không thể xóa bài học.";
      setMessage({ type: "error", text: messageText });
    }
  };

  if (authLoading || isHydrating) {
    return (
      <section className="px-6 py-12">
        <p className="text-center text-amber-800 text-lg">Đang tải tài khoản...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="px-6 py-12 text-center space-y-3">
        <h1 className="text-2xl font-semibold text-amber-900">Cần đăng nhập</h1>
        <p className="text-amber-700">Vui lòng đăng nhập để truy cập khu vực Staff.</p>
        <Link href="/login" className="text-amber-900 font-semibold underline">
          Đến trang đăng nhập
        </Link>
      </section>
    );
  }

  if (!canAccess) {
    return (
      <section className="px-6 py-12 text-center space-y-3">
        <h1 className="text-2xl font-semibold text-amber-900">Không có quyền truy cập</h1>
        <p className="text-amber-700">Tài khoản của bạn không có quyền quản lý bài học.</p>
        <Link href="/" className="text-amber-900 font-semibold underline">
          Quay về trang chủ
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10 space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-600">Staff workspace</p>
          <h1 className="text-3xl font-display font-semibold text-amber-950">
            Bảng điều phối bài học
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="rounded-xl border border-amber-200 bg-white px-4 py-2 shadow-sm">
            <p className="text-amber-500 text-xs uppercase tracking-widest">Tổng bài học</p>
            <p className="text-amber-900 text-lg font-semibold">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-white px-4 py-2 shadow-sm">
            <p className="text-amber-500 text-xs uppercase tracking-widest">Cập nhật gần nhất</p>
            <p className="text-amber-900 text-sm font-semibold">
              {stats.latest ? new Date(stats.latest).toLocaleDateString("vi-VN") : "-"}
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-amber-900">
              Danh sách bài học
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
                  className={`w-full text-left px-5 py-4 transition ${
                    selectedId === lesson._id
                      ? "bg-amber-50"
                      : "hover:bg-amber-50/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-amber-900">{lesson.title}</p>
                      <p className="mt-1 text-xs text-amber-600 line-clamp-2">
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
                <div className="p-6 text-center text-amber-600">Chưa có bài học nào.</div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="border-b border-amber-100 px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-amber-900">
              {formMode === "create" ? "Tạo bài học" : "Chỉnh sửa bài học"}
            </h2>
            <p className="text-xs text-amber-600 mt-1">
              {formMode === "create"
                ? "Điền đủ thông tin và upload assets để tạo bài học."
                : "Có thể cập nhật nội dung và thay thế file khi cần."}
            </p>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Tiêu đề
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setFormField("title", e.target.value)}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Nhập tiêu đề bài học"
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
                placeholder="Mô tả nội dung bài học"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Spawn X
                </label>
                <input
                  type="number"
                  value={form.spawnX}
                  onChange={(e) => setFormField("spawnX", e.target.value)}
                  className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Spawn Y
                </label>
                <input
                  type="number"
                  value={form.spawnY}
                  onChange={(e) => setFormField("spawnY", e.target.value)}
                  className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Tilemap JSON {formMode === "create" && "(bắt buộc)"}
              </label>
              <input
                type="file"
                accept="application/json"
                onChange={(e) => setFormField("tilemapFile", e.target.files?.[0] || null)}
                className="mt-2 w-full text-sm text-amber-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Tileset images {formMode === "create" && "(bắt buộc)"}
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                multiple
                onChange={(e) =>
                  setFormField(
                    "tilesetFiles",
                    e.target.files ? Array.from(e.target.files) : []
                  )
                }
                className="mt-2 w-full text-sm text-amber-700"
              />
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                <p className="text-xs text-amber-700 mb-2">
                  Tên tileset (theo đúng thứ tự file upload)
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTilesetName}
                    onChange={(e) => setNewTilesetName(e.target.value)}
                    className="flex-1 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm"
                    placeholder="VD: ground_tiles"
                  />
                  <button
                    type="button"
                    onClick={handleAddTilesetName}
                    className="rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white"
                  >
                    Thêm
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.tilesetNames.map((name, index) => (
                    <span
                      key={`${name}-${index}`}
                      className="flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs text-amber-700"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => handleRemoveTilesetName(index)}
                        className="text-amber-500 hover:text-amber-700"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Idle sprites (tuỳ chọn)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) =>
                    setFormField(
                      "idleSprites",
                      e.target.files ? Array.from(e.target.files) : []
                    )
                  }
                  className="mt-2 w-full text-sm text-amber-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Run sprites (tuỳ chọn)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) =>
                    setFormField(
                      "runSprites",
                      e.target.files ? Array.from(e.target.files) : []
                    )
                  }
                  className="mt-2 w-full text-sm text-amber-700"
                />
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-xs text-amber-700">
              Khi upload sprite mới, hệ thống sẽ thay toàn bộ animation hiện tại.
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
              >
                {formMode === "create" ? "Tạo bài học" : "Lưu cập nhật"}
              </button>
              {formMode === "edit" && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                >
                  Xóa bài học
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
