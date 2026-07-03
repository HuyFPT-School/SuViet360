"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { adminApi, type Lesson, type LessonFormValues, type AdminSubscriptionStats } from "@/lib/adminApi";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types/auth";

type AdminTab = "dashboard" | "lessons" | "users" | "subscriptions";

const emptyForm: LessonFormValues = {
  title: "",
  content: "",
  spawnX: "100",
  spawnY: "100",
  tilesetNames: "",
  tilemapJson: null,
  tilesets: null,
  idleSprites: null,
  runSprites: null,
};

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "lessons", label: "Quản lý lesson" },
  { id: "users", label: "Quản lý user" },
  { id: "subscriptions", label: "Quản lý Gói VIP" },
];

function formatDate(value?: string) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getLessonTilesetNames(lesson: Lesson) {
  return lesson.game.tilesets.map((tileset) => tileset.name).join(", ");
}

function getAnimationCount(lesson: Lesson) {
  return Object.values(lesson.game.character.animations).reduce(
    (total, frames) => total + (frames?.length ?? 0),
    0
  );
}

export default function AdminPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<LessonFormValues>(emptyForm);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [query, setQuery] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [subQuery, setSubQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  
  // Subscription management state
  const [subStats, setSubStats] = useState<AdminSubscriptionStats | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadAdmin = async () => {
      setLoading(true);
      setError("");
      try {
        const currentUser = await refreshUser();
        await adminApi.checkAdmin();
        const [lessonResponse, availableUsers] = await Promise.all([
          adminApi.getLessons(),
          adminApi.getAvailableUsers(currentUser),
        ]);

        let subscriptionDashboardStats = null;
        try {
          subscriptionDashboardStats = await adminApi.getSubscriptionDashboardStats();
        } catch (subErr) {
          console.error("Failed to load subscription dashboard stats:", subErr);
        }

        if (!mounted) return;
        setLessons(lessonResponse.lessons);
        setUsers(availableUsers);
        if (subscriptionDashboardStats) {
          setSubStats(subscriptionDashboardStats);
        }
      } catch {
        if (mounted) {
          setError("Bạn cần đăng nhập bằng tài khoản admin để vào trang này.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAdmin();
    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  const filteredLessons = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return lessons;
    return lessons.filter(
      (lesson) =>
        lesson.title.toLowerCase().includes(term) ||
        lesson.content.toLowerCase().includes(term)
    );
  }, [lessons, query]);

  const filteredUsers = useMemo(() => {
    const term = userQuery.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.role.toLowerCase().includes(term)
    );
  }, [users, userQuery]);

  const filteredSubs = useMemo(() => {
    const term = subQuery.trim().toLowerCase();
    if (!subStats?.subscriptions) return [];
    if (!term) return subStats.subscriptions;
    return subStats.subscriptions.filter(
      (sub) =>
        sub.userId.name.toLowerCase().includes(term) ||
        sub.userId.email.toLowerCase().includes(term) ||
        sub.tierId.name.toLowerCase().includes(term) ||
        sub.status.toLowerCase().includes(term)
    );
  }, [subStats, subQuery]);

  const dashboardStats = useMemo(() => {
    const totalFrames = lessons.reduce(
      (total, lesson) => total + getAnimationCount(lesson),
      0
    );
    const totalTilesets = lessons.reduce(
      (total, lesson) => total + lesson.game.tilesets.length,
      0
    );

    const baseStats = [
      { label: "Tổng lesson", value: lessons.length },
      { label: "Tileset", value: totalTilesets },
      { label: "Sprite frame", value: totalFrames },
      { label: "Admin hiện có", value: users.filter((u) => u.role === "admin").length },
    ];

    if (subStats?.stats) {
      return [
        ...baseStats,
        { label: "Tổng doanh thu", value: `${subStats.stats.totalRevenue.toLocaleString("vi-VN")}đ` },
        { label: "Gói VIP đang chạy", value: subStats.stats.totalActiveSubscriptions },
        { label: "Số lượng giao dịch", value: subStats.stats.totalTransactions },
        { label: "Tổng số User", value: subStats.stats.totalUsers },
      ];
    }

    return baseStats;
  }, [lessons, users, subStats]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingLesson(null);
  };

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setActiveTab("lessons");
    setForm({
      title: lesson.title,
      content: lesson.content,
      spawnX: String(lesson.game.spawnPoint.x),
      spawnY: String(lesson.game.spawnPoint.y),
      tilesetNames: getLessonTilesetNames(lesson),
      tilemapJson: null,
      tilesets: null,
      idleSprites: null,
      runSprites: null,
    });
  };

  const validateForm = () => {
    if (!form.title.trim() || !form.content.trim()) {
      return "Vui lòng nhập tiêu đề và nội dung lesson.";
    }
    if (Number.isNaN(Number(form.spawnX)) || Number.isNaN(Number(form.spawnY))) {
      return "Spawn X và Spawn Y phải là số.";
    }
    if (!form.tilesetNames.trim()) {
      return "Vui lòng nhập ít nhất một tên tileset.";
    }
    if (!editingLesson && (!form.tilemapJson || !form.tilesets?.length)) {
      return "Lesson mới cần file tilemap JSON và ít nhất một ảnh tileset.";
    }
    return "";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setUploadProgress(0);
    try {
      const onProgress = (progressEvent: any) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      };
      if (editingLesson) {
        const response = await adminApi.updateLesson(editingLesson._id, form, onProgress);
        setLessons((items) =>
          items.map((item) =>
            item._id === editingLesson._id ? response.lesson : item
          )
        );
        setMessage("Đã cập nhật lesson.");
      } else {
        const response = await adminApi.createLesson(form, onProgress);
        setLessons((items) => [response.lesson, ...items]);
        setMessage("Đã tạo lesson mới.");
      }
      resetForm();
    } catch (err: unknown) {
      const apiMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "";
      setError(apiMessage || "Không thể lưu lesson. Vui lòng kiểm tra dữ liệu.");
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (lesson: Lesson) => {
    const confirmed = window.confirm(`Xóa lesson "${lesson.title}"?`);
    if (!confirmed) return;

    setMessage("");
    setError("");
    try {
      await adminApi.deleteLesson(lesson._id);
      setLessons((items) => items.filter((item) => item._id !== lesson._id));
      if (editingLesson?._id === lesson._id) resetForm();
      setMessage("Đã xóa lesson.");
    } catch {
      setError("Không thể xóa lesson này.");
    }
  };

  if (loading || isLoading) {
    return (
      <section className="admin-page admin-page--center">
        <div className="admin-loading">Đang kiểm tra quyền admin...</div>
      </section>
    );
  }

  if (error && !user) {
    return (
      <section className="admin-page admin-page--center">
        <div className="admin-access-card">
          <h1>Admin Panel</h1>
          <p>{error}</p>
          <Link href="/login" className="admin-primary-link">
            Đăng nhập
          </Link>
        </div>
      </section>
    );
  }

  if (user?.role !== "admin") {
    return (
      <section className="admin-page admin-page--center">
        <div className="admin-access-card">
          <h1>Không có quyền truy cập</h1>
          <p>Trang này chỉ dành cho tài khoản admin.</p>
          <Link href="/" className="admin-primary-link">
            Về trang chủ
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div>
            <p className="admin-kicker">SuViet360</p>
            <h1>Admin Panel</h1>
          </div>
          <div className="admin-tabs" role="tablist" aria-label="Admin tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`admin-tab${
                  activeTab === tab.id ? " admin-tab--active" : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="admin-user-card">
            <span>Tài khoản</span>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
        </aside>

        <div className="admin-content">
          {(message || error) && (
            <div
              className={`admin-alert ${
                error ? "admin-alert--error" : "admin-alert--success"
              }`}
            >
              {error || message}
            </div>
          )}

          {activeTab === "dashboard" && (
            <DashboardPanel
              stats={dashboardStats}
              lessons={lessons}
              users={users}
              onOpenLessons={() => setActiveTab("lessons")}
              onOpenUsers={() => setActiveTab("users")}
              onOpenSubscriptions={() => setActiveTab("subscriptions")}
            />
          )}

          {activeTab === "lessons" && (
            <LessonsPanel
              form={form}
              setForm={setForm}
              editingLesson={editingLesson}
              saving={saving}
              filteredLessons={filteredLessons}
              query={query}
              setQuery={setQuery}
              onSubmit={handleSubmit}
              onReset={resetForm}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {activeTab === "users" && (
            <UsersPanel
              users={filteredUsers}
              allUsers={users}
              query={userQuery}
              setQuery={setUserQuery}
            />
          )}

          {activeTab === "subscriptions" && (
            <SubscriptionsPanel
              subStats={subStats}
              filteredSubs={filteredSubs}
              query={subQuery}
              setQuery={setSubQuery}
            />
          )}
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
          <div style={{
            background: "#FFFBF2",
            border: "2px solid #8c6a34",
            borderRadius: "12px",
            padding: "24px 32px",
            width: "90%",
            maxWidth: "400px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
            textAlign: "center"
          }}>
            <h3 style={{
              fontFamily: "Cinzel, serif",
              fontSize: "18px",
              fontWeight: "bold",
              color: "#6b4f14",
              marginBottom: "16px"
            }}>
              {uploadProgress === 100 ? "ĐANG XỬ LÝ DỮ LIỆU..." : "ĐANG TẢI GAME LÊN..."}
            </h3>
            <div style={{
              width: "100%",
              height: "12px",
              background: "#e5e7eb",
              borderRadius: "9999px",
              overflow: "hidden",
              marginBottom: "12px"
            }}>
              <div style={{
                height: "100%",
                width: `${uploadProgress}%`,
                background: "linear-gradient(90deg, #d2a85b, #9b6b2f)",
                borderRadius: "9999px",
                transition: "width 0.2s ease-out-in"
              }} />
            </div>
            <div style={{
              fontSize: "20px",
              fontWeight: "bold",
              color: "#4a1f24",
              marginBottom: "8px"
            }}>
              {uploadProgress}%
            </div>
            <p style={{
              fontSize: "12px",
              color: "rgba(58, 43, 27, 0.7)"
            }}>
              {uploadProgress === 100 
                ? "Đang lưu thông tin bài học vào cơ sở dữ liệu, vui lòng đợi..." 
                : "Đang tải tệp tin và hình ảnh lên máy chủ Cloudinary..."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function DashboardPanel({
  stats,
  lessons,
  users,
  onOpenLessons,
  onOpenUsers,
  onOpenSubscriptions,
}: {
  stats: Array<{ label: string; value: any }>;
  lessons: Lesson[];
  users: User[];
  onOpenLessons: () => void;
  onOpenUsers: () => void;
  onOpenSubscriptions: () => void;
}) {
  return (
    <div className="admin-stack">
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">Tổng quan</p>
          <h2>Dashboard</h2>
        </div>
        <div className="admin-actions">
          <button type="button" onClick={onOpenLessons}>
            Tạo lesson
          </button>
          <button type="button" onClick={onOpenUsers}>
            Xem user
          </button>
          <button type="button" onClick={onOpenSubscriptions}>
            Xem Gói VIP
          </button>
        </div>
      </div>

      <div className="admin-stat-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="admin-stat-card">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div className="admin-grid-2">
        <div className="admin-panel">
          <div className="admin-panel-heading">
            <h3>Lesson mới nhất</h3>
            <span>{lessons.length} mục</span>
          </div>
          <div className="admin-mini-list">
            {lessons.slice(0, 5).map((lesson) => (
              <div key={lesson._id} className="admin-mini-row">
                <div>
                  <strong>{lesson.title}</strong>
                  <span>{formatDate(lesson.createdAt)}</span>
                </div>
                <Link href={`/game?id=${lesson._id}`}>Chơi thử</Link>
              </div>
            ))}
            {lessons.length === 0 && (
              <p className="admin-empty">Chưa có lesson nào.</p>
            )}
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-heading">
            <h3>User trong client</h3>
            <span>{users.length} mục</span>
          </div>
          <div className="admin-mini-list">
            {users.map((item) => (
              <div key={item.id} className="admin-mini-row">
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.email}</span>
                </div>
                <em>{item.role}</em>
              </div>
            ))}
            <p className="admin-note">
              Server hiện chưa có endpoint danh sách user, nên client chỉ hiển
              thị dữ liệu tài khoản đang đăng nhập.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonsPanel({
  form,
  setForm,
  editingLesson,
  saving,
  filteredLessons,
  query,
  setQuery,
  onSubmit,
  onReset,
  onEdit,
  onDelete,
}: {
  form: LessonFormValues;
  setForm: React.Dispatch<React.SetStateAction<LessonFormValues>>;
  editingLesson: Lesson | null;
  saving: boolean;
  filteredLessons: Lesson[];
  query: string;
  setQuery: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
}) {
  return (
    <div className="admin-stack">
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">Nội dung</p>
          <h2>Quản lý lesson</h2>
        </div>
        <input
          className="admin-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm lesson..."
        />
      </div>

      <div className="admin-grid-2 admin-grid-2--wide">
        <form className="admin-panel admin-form" onSubmit={onSubmit}>
          <div className="admin-panel-heading">
            <h3>{editingLesson ? "Sửa lesson" : "Tạo lesson mới"}</h3>
            {editingLesson && <span>{editingLesson._id}</span>}
          </div>

          <label>
            <span>Tiêu đề</span>
            <input
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Ví dụ: Khởi nghĩa Lam Sơn"
            />
          </label>

          <label>
            <span>Nội dung</span>
            <textarea
              value={form.content}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, content: event.target.value }))
              }
              rows={6}
              placeholder="Tóm tắt nội dung bài học..."
            />
          </label>

          <div className="admin-form-row" style={{ display: "none" }}>
            <label>
              <span>Spawn X</span>
              <input
                type="number"
                min="0"
                value={form.spawnX}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, spawnX: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Spawn Y</span>
              <input
                type="number"
                min="0"
                value={form.spawnY}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, spawnY: event.target.value }))
                }
              />
            </label>
          </div>

          <label style={{ display: "none" }}>
            <span>Tên tileset</span>
            <input
              value={form.tilesetNames}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  tilesetNames: event.target.value,
                }))
              }
              placeholder="terrain, buildings, props"
            />
          </label>

          <div className="admin-file-grid">
            <FileInput
              label="Tilemap JSON"
              accept="application/json,.json"
              onChange={(files) =>
                setForm((prev) => ({
                  ...prev,
                  tilemapJson: files?.[0] ?? null,
                }))
              }
            />
            <FileInput
              label="Tilesets"
              accept="image/*"
              multiple
              onChange={(files) =>
                setForm((prev) => {
                  let derivedNames = prev.tilesetNames;
                  if (files && files.length > 0) {
                    derivedNames = Array.from(files)
                      .map((file) => {
                        const parts = file.name.split(".");
                        parts.pop();
                        return parts.join(".");
                      })
                      .join(", ");
                  }
                  return {
                    ...prev,
                    tilesets: files,
                    tilesetNames: derivedNames,
                  };
                })
              }
            />
          </div>

          <details className="admin-details" style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden", marginTop: "1rem" }}>
            <summary style={{ padding: "0.75rem 1rem", background: "#f9fafb", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600", color: "#374151" }}>
              Thay đổi nhân vật (Tuỳ chọn)
            </summary>
            <div className="admin-file-grid" style={{ padding: "1rem", background: "#fff", display: "grid", gap: "1rem" }}>
              <FileInput
                label="Idle sprites"
                accept="image/*"
                multiple
                onChange={(files) =>
                  setForm((prev) => ({ ...prev, idleSprites: files }))
                }
              />
              <FileInput
                label="Run sprites"
                accept="image/*"
                multiple
                onChange={(files) =>
                  setForm((prev) => ({ ...prev, runSprites: files }))
                }
              />
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                Khi upload sprite mới, hệ thống sẽ thay toàn bộ animation hiện tại.
              </div>
            </div>
          </details>

          <div className="admin-form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Đang lưu..." : editingLesson ? "Cập nhật" : "Tạo mới"}
            </button>
            <button type="button" onClick={onReset}>
              Làm mới
            </button>
          </div>
        </form>

        <div className="admin-panel">
          <div className="admin-panel-heading">
            <h3>Danh sách lesson</h3>
            <span>{filteredLessons.length} mục</span>
          </div>
          <div className="admin-table admin-lesson-table">
            <div className="admin-table-head">
              <span>Lesson</span>
              <span>Tài nguyên</span>
              <span>Ngày tạo</span>
              <span>Thao tác</span>
            </div>
            {filteredLessons.map((lesson) => (
              <div key={lesson._id} className="admin-table-row">
                <div>
                  <strong>{lesson.title}</strong>
                  <small>{lesson.content}</small>
                </div>
                <div>
                  <span>{lesson.game.tilesets.length} tileset</span>
                  <small>{getAnimationCount(lesson)} sprite frame</small>
                </div>
                <span>{formatDate(lesson.createdAt)}</span>
                <div className="admin-row-actions">
                  <Link href={`/game?id=${lesson._id}`}>Chơi</Link>
                  <button type="button" onClick={() => onEdit(lesson)}>
                    Sửa
                  </button>
                  <button type="button" onClick={() => onDelete(lesson)}>
                    Xóa
                  </button>
                </div>
              </div>
            ))}
            {filteredLessons.length === 0 && (
              <p className="admin-empty">Không tìm thấy lesson phù hợp.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FileInput({
  label,
  accept,
  multiple,
  onChange,
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  onChange: (files: FileList | null) => void;
}) {
  const [fileLabel, setFileLabel] = useState("Chưa chọn tệp");

  return (
    <label className="admin-file-input" style={{ cursor: "pointer" }}>
      <span>{label}</span>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: "none" }}
        onChange={(event) => {
          const files = event.target.files;
          onChange(files);
          setFileLabel(
            files?.length
              ? multiple
                ? `Đã chọn ${files.length} tệp`
                : files[0].name
              : "Chưa chọn tệp"
          );
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            background: "linear-gradient(180deg, #d2a85b, #9b6b2f)",
            color: "#2b1a0d",
            fontSize: "12px",
            fontWeight: "600",
            borderRadius: "6px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}
        >
          <svg
            style={{ width: "14px", height: "14px" }}
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
          Chọn tệp
        </div>
        <small style={{ color: "rgba(58, 43, 27, 0.7)", fontSize: "12px", fontWeight: "500", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "180px" }}>
          {fileLabel}
        </small>
      </div>
    </label>
  );
}

function UsersPanel({
  users,
  allUsers,
  query,
  setQuery,
}: {
  users: User[];
  allUsers: User[];
  query: string;
  setQuery: (value: string) => void;
}) {
  return (
    <div className="admin-stack">
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">Tài khoản</p>
          <h2>Quản lý user</h2>
        </div>
        <input
          className="admin-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm user..."
        />
      </div>

      <div className="admin-panel">
        <div className="admin-panel-heading">
          <h3>Danh sách user</h3>
          <span>{allUsers.length} mục</span>
        </div>
        <div className="admin-table admin-user-table">
          <div className="admin-table-head">
            <span>User</span>
            <span>Email</span>
            <span>Vai trò</span>
            <span>Trạng thái</span>
            <span>Thao tác</span>
          </div>
          {users.map((item) => (
            <div key={item.id} className="admin-table-row">
              <div className="admin-user-cell">
                <div
                  className="admin-avatar"
                  style={
                    item.avatar
                      ? { backgroundImage: `url(${item.avatar})` }
                      : undefined
                  }
                  aria-label={item.name}
                >
                  {!item.avatar && item.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <strong>{item.name}</strong>
                </div>
              </div>
              <span className="admin-email-cell">{item.email}</span>
              <span className="admin-role">{item.role}</span>
              <span>Đang hoạt động</span>
              <div className="admin-row-actions">
                <button type="button" disabled>
                  Sửa quyền
                </button>
                <button type="button" disabled>
                  Khóa
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="admin-empty">Chưa có user.</p>}
        </div>
        <p className="admin-note">
          Các nút sửa quyền và khóa tài khoản đang ở trạng thái chờ API server.
          Phần client đã chuẩn bị layout để nối endpoint sau.
        </p>
      </div>
    </div>
  );
}

function SubscriptionsPanel({
  subStats,
  filteredSubs,
  query,
  setQuery,
}: {
  subStats: AdminSubscriptionStats | null;
  filteredSubs: any[];
  query: string;
  setQuery: (val: string) => void;
}) {
  const maxRevenue = useMemo(() => {
    if (!subStats?.monthlyRevenue) return 100000;
    const vals = subStats.monthlyRevenue.map((r) => r.revenue);
    return Math.max(...vals, 100000);
  }, [subStats]);

  const formatVND = (val: number) => {
    return val.toLocaleString("vi-VN") + "đ";
  };

  return (
    <div className="admin-stack">
      {/* Header & Search */}
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">Gói thành viên</p>
          <h2>Quản lý Gói VIP</h2>
        </div>
        <input
          className="admin-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm học sinh, gói VIP..."
        />
      </div>

      {/* Revenue Chart Section */}
      {subStats?.monthlyRevenue && (
        <div className="admin-panel mb-6">
          <div className="admin-panel-heading mb-6">
            <h3>Doanh thu đăng ký thành viên (6 tháng qua)</h3>
            <span>Tổng cộng: {formatVND(subStats.stats.totalRevenue)}</span>
          </div>

          <div style={{ padding: "16px 8px 8px" }}>
            <div className="flex gap-4 items-end justify-between h-48 border-b border-gold/20 pb-2 relative">
              {/* Y Axis Guide Lines */}
              <div className="absolute left-0 right-0 top-0 border-t border-gold/5 text-[9px] text-muted/65 pt-0.5">
                {formatVND(maxRevenue)}
              </div>
              <div className="absolute left-0 right-0 top-1/2 border-t border-gold/5 text-[9px] text-muted/65 pt-0.5">
                {formatVND(maxRevenue / 2)}
              </div>

              {subStats.monthlyRevenue.map((r, idx) => {
                const pct = (r.revenue / maxRevenue) * 85; // Max 85% height to leave room for labels
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative z-10">
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 bg-[#1a0f05] border border-gold/30 text-gold text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-30">
                      <div>Doanh thu: {formatVND(r.revenue)}</div>
                      <div className="text-[10px] text-muted text-center">Giao dịch: {r.transactions}</div>
                    </div>

                    {/* Bar */}
                    <div
                      className="w-8 sm:w-12 rounded-t-md transition-all duration-300 group-hover:brightness-125"
                      style={{
                        height: `${pct}%`,
                        background: r.revenue > 0 
                          ? "linear-gradient(180deg, #d2a85b, #9b6b2f)" 
                          : "rgba(210, 168, 91, 0.08)",
                        minHeight: r.revenue > 0 ? "4px" : "1px",
                        boxShadow: r.revenue > 0 ? "0 0 10px rgba(210, 168, 91, 0.25)" : "none"
                      }}
                    />

                    {/* Month Label */}
                    <span className="text-[10px] text-muted mt-2 font-mono">{r.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Grid: Active VIP & Recent Transactions */}
      <div className="admin-grid-2 admin-grid-2--wide">
        
        {/* Active VIP List */}
        <div className="admin-panel">
          <div className="admin-panel-heading">
            <h3>Danh sách kích hoạt VIP</h3>
            <span>{filteredSubs.length} tài khoản</span>
          </div>

          <div className="admin-table admin-user-table">
            <div className="admin-table-head">
              <span>Học sinh</span>
              <span>Gói VIP</span>
              <span>Bắt đầu</span>
              <span>Hết hạn</span>
              <span>Trạng thái</span>
            </div>
            
            {filteredSubs.map((sub) => {
              const isExpired = sub.status === "Expired" || new Date(sub.endDate) < new Date();
              return (
                <div key={sub._id} className="admin-table-row">
                  <div className="admin-user-cell">
                    <div
                      className="admin-avatar"
                      style={
                        sub.userId?.avatar
                          ? { backgroundImage: `url(${sub.userId.avatar})` }
                          : undefined
                      }
                    >
                      {!sub.userId?.avatar && sub.userId?.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <strong>{sub.userId?.name || "Người dùng"}</strong>
                      <small className="text-[10px] text-muted font-mono">{sub.userId?.email}</small>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-gold">{sub.tierId?.name || "VIP"}</span>
                    <small className="text-[9px] uppercase tracking-wide text-muted block">{sub.billingCycle === "monthly" ? "Hàng tháng" : "Hàng năm"}</small>
                  </div>

                  <span>{formatDate(sub.startDate)}</span>
                  <span className={isExpired ? "text-red-400 font-bold" : "text-emerald-400"}>
                    {formatDate(sub.endDate)}
                  </span>
                  
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "9px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        border: "1px solid",
                        borderColor: isExpired ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)",
                        color: isExpired ? "#f87171" : "#34d399",
                        backgroundColor: isExpired ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)"
                      }}
                    >
                      {isExpired ? "Hết hạn" : "Hoạt động"}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredSubs.length === 0 && (
              <p className="admin-empty">Không có dữ liệu đăng ký VIP.</p>
            )}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="admin-panel">
          <div className="admin-panel-heading">
            <h3>Lịch sử giao dịch</h3>
            <span>{subStats?.recentTransactions.length || 0} mục</span>
          </div>

          <div className="admin-table admin-user-table">
            <div className="admin-table-head">
              <span>Mã GD / Người mua</span>
              <span>Gói VIP</span>
              <span>Số tiền</span>
              <span>Thanh toán</span>
              <span>Ngày mua</span>
            </div>

            {subStats?.recentTransactions.map((tx) => (
              <div key={tx._id} className="admin-table-row">
                <div>
                  <strong className="font-mono text-xs text-gold select-all">{tx.transactionId}</strong>
                  <small className="text-[10px] text-muted block">Mua bởi: {tx.buyerId?.name || "Ẩn danh"}</small>
                </div>

                <div>
                  <strong>{tx.tierId?.name || "VIP"}</strong>
                  {tx.isGift && (
                    <span className="text-[9px] bg-purple-950/40 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded ml-1 uppercase font-bold">Quà tặng</span>
                  )}
                </div>

                <span className="font-mono font-bold text-emerald-400">{formatVND(tx.amount)}</span>
                
                <div>
                  <span className="text-xs uppercase font-semibold text-muted">{tx.paymentMethod}</span>
                  {tx.couponCode && (
                    <small className="text-[9px] text-emerald-300 block font-mono">Coupon: {tx.couponCode}</small>
                  )}
                </div>

                <span>{formatDate(tx.createdAt)}</span>
              </div>
            ))}

            {(!subStats?.recentTransactions || subStats.recentTransactions.length === 0) && (
              <p className="admin-empty">Chưa có giao dịch nào.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
