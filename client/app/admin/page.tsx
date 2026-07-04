"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { adminApi, type Lesson, type LessonFormValues, type AdminSubscriptionStats, type Coupon } from "@/lib/adminApi";
import { subscriptionApi } from "@/lib/subscriptionApi";
import type { SubscriptionTier } from "@/types/subscription";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types/auth";

type AdminTab = "dashboard" | "lessons" | "users" | "subscriptions" | "coupons";

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
  { id: "users", label: "Quản lý user" },
  { id: "subscriptions", label: "Quản lý Gói VIP" },
  { id: "coupons", label: "Quản lý Coupon" },
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
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadAdmin = async () => {
      setLoading(true);
      setError("");
      try {
        const currentUser = await refreshUser();
        await adminApi.checkAdmin();
        const [lessonResponse, availableUsers, loadedTiers, loadedCoupons] = await Promise.all([
          adminApi.getLessons(),
          adminApi.getAvailableUsers(),
          subscriptionApi.getTiers(),
          adminApi.getCoupons(),
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
        setTiers(loadedTiers);
        setCoupons(loadedCoupons);
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
    const baseStats = [
      { label: "Tổng lesson", value: lessons.length },
      { label: "Staff hiện có", value: users.filter((u) => u.role === "staff").length },
      { label: "Teacher hiện có", value: users.filter((u) => u.role === "teacher").length },
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

  const handleUpdateRole = async (userId: string, role: string) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await adminApi.updateUserRole(userId, role);
      const updatedUsers = await adminApi.getAvailableUsers();
      setUsers(updatedUsers);
      setMessage("Cập nhật vai trò người dùng thành công.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể cập nhật vai trò người dùng.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async (userId: string) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await adminApi.toggleUserLock(userId);
      const updatedUsers = await adminApi.getAvailableUsers();
      setUsers(updatedUsers);
      setMessage("Thay đổi trạng thái khóa tài khoản thành công.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể thay đổi trạng thái khóa tài khoản.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTierPrice = async (id: string, priceMonthly: number, priceYearly: number) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await adminApi.updateTierPrice(id, priceMonthly, priceYearly);
      const [loadedTiers, stats] = await Promise.all([
        subscriptionApi.getTiers(),
        adminApi.getSubscriptionDashboardStats()
      ]);
      setTiers(loadedTiers);
      if (stats) setSubStats(stats);
      setMessage("Cập nhật giá gói thành viên thành công.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể cập nhật giá gói.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCoupon = async (couponData: any) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await adminApi.createCoupon(couponData);
      const updatedCoupons = await adminApi.getCoupons();
      setCoupons(updatedCoupons);
      setMessage("Tạo mã giảm giá thành công.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể tạo mã giảm giá.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    const confirmed = window.confirm("Bạn có chắc muốn xóa mã giảm giá này?");
    if (!confirmed) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await adminApi.deleteCoupon(id);
      setCoupons((items) => items.filter((item) => item._id !== id));
      setMessage("Đã xóa mã giảm giá.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể xóa mã giảm giá.");
    } finally {
      setSaving(false);
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
              subStats={subStats}
              onOpenUsers={() => setActiveTab("users")}
              onOpenSubscriptions={() => setActiveTab("subscriptions")}
            />
          )}

          {activeTab === "users" && (
            <UsersPanel
              users={filteredUsers}
              allUsers={users}
              query={userQuery}
              setQuery={setUserQuery}
              onUpdateRole={handleUpdateRole}
              onToggleLock={handleToggleLock}
            />
          )}

          {activeTab === "subscriptions" && (
            <SubscriptionsPanel
              subStats={subStats}
              filteredSubs={filteredSubs}
              query={subQuery}
              setQuery={setSubQuery}
              tiers={tiers}
              onUpdateTierPrice={handleUpdateTierPrice}
            />
          )}

          {activeTab === "coupons" && (
            <CouponsPanel
              coupons={coupons}
              tiers={tiers}
              onCreate={handleCreateCoupon}
              onDelete={handleDeleteCoupon}
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
  subStats,
  onOpenUsers,
  onOpenSubscriptions,
}: {
  stats: Array<{ label: string; value: any }>;
  subStats: AdminSubscriptionStats | null;
  onOpenUsers: () => void;
  onOpenSubscriptions: () => void;
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
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">Tổng quan</p>
          <h2>Dashboard</h2>
        </div>
        <div className="admin-actions">
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

      {/* Revenue Chart Section */}
      {subStats?.monthlyRevenue && (
        <div className="admin-panel mt-6">
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
  onUpdateRole,
  onToggleLock,
}: {
  users: User[];
  allUsers: User[];
  query: string;
  setQuery: (value: string) => void;
  onUpdateRole: (id: string, role: string) => Promise<void>;
  onToggleLock: (id: string) => Promise<void>;
}) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userHistory, setUserHistory] = useState<{ transactions: any[]; subscriptions: any[] } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleViewDetails = async (user: User) => {
    setSelectedUser(user);
    setLoadingHistory(true);
    setUserHistory(null);
    try {
      const data = await adminApi.getUserTransactions(user.id);
      setUserHistory(data);
    } catch (err) {
      console.error("Failed to fetch user transaction history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

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
              <div 
                className="admin-user-cell cursor-pointer group"
                onClick={() => handleViewDetails(item)}
              >
                <div
                  className="admin-avatar group-hover:scale-105 transition-transform duration-200"
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
                  <strong className="group-hover:text-gold transition-colors duration-200">{item.name}</strong>
                  <span className="text-[10px] text-muted block group-hover:underline">Xem chi tiết</span>
                </div>
              </div>
              <span className="admin-email-cell">{item.email}</span>
              <div>
                <select
                  value={item.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    if (window.confirm(`Bạn có chắc muốn đổi quyền của ${item.name} thành ${newRole.toUpperCase()}?`)) {
                      onUpdateRole(item.id, newRole);
                    }
                  }}
                  className="bg-transparent border border-gold/30 rounded px-2 py-1 text-xs text-gold font-semibold uppercase cursor-pointer"
                >
                  <option value="student">student</option>
                  <option value="staff">staff</option>
                  <option value="teacher">teacher</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <span className={item.isLocked ? "text-red-400 font-semibold" : "text-emerald-500 font-semibold"}>
                {item.isLocked ? "Bị khóa" : "Hoạt động"}
              </span>
              <div className="admin-row-actions">
                <button
                  type="button"
                  onClick={() => {
                    const actionName = item.isLocked ? "mở khóa" : "khóa";
                    if (window.confirm(`Bạn có chắc muốn ${actionName} tài khoản của ${item.name}?`)) {
                      onToggleLock(item.id);
                    }
                  }}
                  className={`rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                    item.isLocked
                      ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30"
                      : "bg-red-950/40 text-red-400 border border-red-800/40 hover:bg-red-950/60"
                  }`}
                >
                  {item.isLocked ? "Mở khóa" : "Khóa"}
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="admin-empty">Chưa có user.</p>}
        </div>
      </div>

      {/* User Transaction Details Modal */}
      {selectedUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setSelectedUser(null)}
        >
          <div
            style={{
              background: "#FFFBF2",
              border: "2px solid #8c6a34",
              borderRadius: "12px",
              padding: "24px",
              width: "90%",
              maxWidth: "800px",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 border-b border-gold/30 pb-3">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#8c6a34] font-semibold">Lịch sử giao dịch chi tiết</span>
                <h3 className="font-serif text-xl text-[#4a1f24] font-bold mt-1">{selectedUser.name}</h3>
                <small className="text-muted block font-mono mt-0.5">{selectedUser.email}</small>
              </div>
              <button
                type="button"
                className="text-gold hover:text-[#4a1f24] font-bold text-lg p-2"
                onClick={() => setSelectedUser(null)}
              >
                ✕
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-gold font-semibold">Đang tải lịch sử giao dịch...</div>
            ) : (
              <div className="space-y-6">
                {/* Active Subscriptions Block */}
                <div>
                  <h4 className="font-serif text-sm uppercase tracking-wider text-[#8c6a34] font-bold mb-3">Thông tin đăng ký VIP</h4>
                  {userHistory?.subscriptions && userHistory.subscriptions.length > 0 ? (
                    <div className="overflow-x-auto w-full">
                      <table className="admin-vip-table-new">
                        <thead>
                          <tr>
                            <th>Gói VIP</th>
                            <th>Bắt đầu</th>
                            <th>Hết hạn</th>
                            <th>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userHistory.subscriptions.map((sub) => {
                            const isExpired = sub.status === "Expired" || new Date(sub.endDate) < new Date();
                            return (
                              <tr key={sub._id}>
                                <td>
                                  <span className="font-semibold text-gold">{sub.tierId?.name || "VIP"}</span>
                                  <small className="text-[9px] uppercase tracking-wide text-muted block">{sub.billingCycle === "monthly" ? "Hàng tháng" : "Hàng năm"}</small>
                                </td>
                                <td className="font-mono text-xs">{formatDate(sub.startDate)}</td>
                                <td className={`font-mono text-xs ${isExpired ? "text-red-400 font-bold" : "text-emerald-400"}`}>
                                  {formatDate(sub.endDate)}
                                </td>
                                <td>
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
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted py-2">Chưa kích hoạt gói VIP nào.</p>
                  )}
                </div>

                {/* Transactions Block */}
                <div>
                  <h4 className="font-serif text-sm uppercase tracking-wider text-[#8c6a34] font-bold mb-3">Lịch sử giao dịch mua hàng</h4>
                  {userHistory?.transactions && userHistory.transactions.length > 0 ? (
                    <div className="overflow-x-auto w-full">
                      <table className="admin-vip-table-new">
                        <thead>
                          <tr>
                            <th>Mã giao dịch</th>
                            <th>Gói VIP</th>
                            <th>Số tiền</th>
                            <th>Thanh toán</th>
                            <th>Ngày mua</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userHistory.transactions.map((tx) => (
                            <tr key={tx._id}>
                              <td className="font-mono text-xs text-gold select-all">{tx.transactionId}</td>
                              <td>
                                <span className="font-semibold">{tx.tierId?.name || "VIP"}</span>
                                {tx.isGift && (
                                  <span className="text-[9px] bg-purple-950/40 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded ml-1 uppercase font-bold">Quà</span>
                                )}
                              </td>
                              <td className="font-mono font-bold text-emerald-500">{tx.amount.toLocaleString("vi-VN")}đ</td>
                              <td className="text-xs uppercase font-semibold text-muted">{tx.paymentMethod}</td>
                              <td className="font-mono text-xs">{formatDate(tx.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted py-2">Chưa có lịch sử giao dịch.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TierRow({
  tier,
  onUpdatePrice,
}: {
  tier: SubscriptionTier;
  onUpdatePrice: (id: string, pm: number, py: number) => Promise<void>;
}) {
  const [priceMonthly, setPriceMonthly] = useState(tier.priceMonthly);
  const [priceYearly, setPriceYearly] = useState(tier.priceYearly);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (priceMonthly < 0 || priceYearly < 0) {
      alert("Giá gói không được âm.");
      return;
    }
    setSaving(true);
    try {
      await onUpdatePrice(tier._id, priceMonthly, priceYearly);
    } catch (err) {
      console.error("Failed to save price:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td>
        <div className="flex flex-col">
          <strong className="text-gold font-serif text-sm">{tier.name}</strong>
          <small className="text-[10px] text-muted font-mono">{tier.slug}</small>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={priceMonthly}
            onChange={(e) => setPriceMonthly(Number(e.target.value))}
            className="bg-transparent border border-gold/30 rounded px-2 py-1 text-xs text-gold font-mono w-28"
            min="0"
          />
          <span className="text-[11px] text-muted">đ</span>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={priceYearly}
            onChange={(e) => setPriceYearly(Number(e.target.value))}
            className="bg-transparent border border-gold/30 rounded px-2 py-1 text-xs text-gold font-mono w-28"
            min="0"
          />
          <span className="text-[11px] text-muted">đ</span>
        </div>
      </td>
      <td>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-[#8c6a34] text-[#FFFBF2] hover:bg-[#8c6a34]/80 disabled:opacity-50 text-xs font-semibold px-4 py-1.5 rounded transition uppercase"
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </button>
      </td>
    </tr>
  );
}

function SubscriptionsPanel({
  subStats,
  filteredSubs,
  query,
  setQuery,
  tiers,
  onUpdateTierPrice,
}: {
  subStats: AdminSubscriptionStats | null;
  filteredSubs: any[];
  query: string;
  setQuery: (val: string) => void;
  tiers: SubscriptionTier[];
  onUpdateTierPrice: (id: string, priceMonthly: number, priceYearly: number) => Promise<void>;
}) {
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

      {/* Subscription Tiers List & Price Management */}
      <div className="admin-panel mb-6">
        <div className="admin-panel-heading">
          <h3>Định cấu hình giá gói VIP</h3>
          <span>{tiers.filter((t) => t.slug !== "free").length} gói</span>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="admin-vip-table-new">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Tên gói</th>
                <th style={{ width: "30%" }}>Giá hàng tháng</th>
                <th style={{ width: "30%" }}>Giá hàng năm</th>
                <th style={{ width: "10%" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tiers
                .filter((tier) => tier.slug !== "free")
                .map((tier) => (
                  <TierRow
                    key={tier._id}
                    tier={tier}
                    onUpdatePrice={onUpdateTierPrice}
                  />
                ))}
              {tiers.filter((t) => t.slug !== "free").length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">Chưa có gói VIP nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Active VIP & Recent Transactions */}
      <div className="admin-grid-2 admin-grid-2--wide">
        
        {/* Active VIP List */}
        <div className="admin-panel">
          <div className="admin-panel-heading">
            <h3>Danh sách kích hoạt VIP</h3>
            <span>{filteredSubs.length} tài khoản</span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="admin-vip-table-new">
              <thead>
                <tr>
                  <th style={{ width: "32%" }}>Học sinh</th>
                  <th style={{ width: "23%" }}>Gói VIP</th>
                  <th style={{ width: "15%" }}>Bắt đầu</th>
                  <th style={{ width: "15%" }}>Hết hạn</th>
                  <th style={{ width: "15%" }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((sub) => {
                  const isExpired = sub.status === "Expired" || new Date(sub.endDate) < new Date();
                  return (
                    <tr key={sub._id}>
                      <td>
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
                          <div className="flex flex-col min-w-0">
                            <strong className="truncate block max-w-[110px] xl:max-w-none">{sub.userId?.name || "Người dùng"}</strong>
                            <small className="text-[10px] text-muted font-mono truncate block max-w-[110px] xl:max-w-none">{sub.userId?.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-semibold text-gold">{sub.tierId?.name || "VIP"}</span>
                        <small className="text-[9px] uppercase tracking-wide text-muted block">{sub.billingCycle === "monthly" ? "Hàng tháng" : "Hàng năm"}</small>
                      </td>
                      <td className="font-mono text-[11px] whitespace-nowrap">{formatDate(sub.startDate)}</td>
                      <td className={`font-mono text-[11px] whitespace-nowrap ${isExpired ? "text-red-400 font-bold" : "text-emerald-400"}`}>
                        {formatDate(sub.endDate)}
                      </td>
                      <td>
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

          <div className="overflow-x-auto w-full">
            <table className="admin-vip-table-new">
              <thead>
                <tr>
                  <th style={{ width: "35%" }}>Mã GD / Người mua</th>
                  <th style={{ width: "23%" }}>Gói VIP</th>
                  <th style={{ width: "14%" }}>Số tiền</th>
                  <th style={{ width: "14%" }}>Thanh toán</th>
                  <th style={{ width: "14%" }}>Ngày mua</th>
                </tr>
              </thead>
              <tbody>
                {subStats?.recentTransactions.map((tx) => (
                  <tr key={tx._id}>
                    <td>
                      <div className="flex flex-col min-w-0">
                        <strong className="font-mono text-xs text-gold select-all truncate block max-w-[120px] xl:max-w-none">{tx.transactionId}</strong>
                        <small className="text-[10px] text-muted truncate block max-w-[120px] xl:max-w-none">Mua bởi: {tx.buyerId?.name || "Ẩn danh"}</small>
                      </div>
                    </td>
                    <td>
                      <span className="font-semibold">{tx.tierId?.name || "VIP"}</span>
                      {tx.isGift && (
                        <span className="text-[9px] bg-purple-950/40 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded ml-1 uppercase font-bold">Quà</span>
                      )}
                    </td>
                    <td className="font-mono font-bold text-emerald-400 whitespace-nowrap">{formatVND(tx.amount)}</td>
                    <td>
                      <span className="text-xs uppercase font-semibold text-muted">{tx.paymentMethod}</span>
                      {tx.couponCode && (
                        <small className="text-[9px] text-emerald-300 block font-mono">Coupon: {tx.couponCode}</small>
                      )}
                    </td>
                    <td className="font-mono text-[11px] whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!subStats?.recentTransactions || subStats.recentTransactions.length === 0) && (
              <p className="admin-empty">Chưa có giao dịch nào.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function CouponsPanel({
  coupons,
  tiers,
  onCreate,
  onDelete,
}: {
  coupons: Coupon[];
  tiers: SubscriptionTier[];
  onCreate: (couponData: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [maxUses, setMaxUses] = useState<number>(-1);
  const [minPurchaseAmount, setMinPurchaseAmount] = useState<number>(0);
  const [applicableTiers, setApplicableTiers] = useState<string[]>([]);
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !endDate) {
      alert("Vui lòng nhập đầy đủ mã code và ngày hết hạn.");
      return;
    }
    if (discountValue <= 0) {
      alert("Giá trị giảm giá phải lớn hơn 0.");
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({
        code: code.toUpperCase().trim(),
        discountType,
        discountValue,
        maxUses,
        minPurchaseAmount,
        applicableTiers,
        endDate: new Date(endDate).toISOString(),
        description,
      });
      // Reset form
      setCode("");
      setDiscountType("percentage");
      setDiscountValue(10);
      setMaxUses(-1);
      setMinPurchaseAmount(0);
      setApplicableTiers([]);
      setEndDate("");
      setDescription("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTierCheck = (tierId: string, checked: boolean) => {
    if (checked) {
      setApplicableTiers((prev) => [...prev, tierId]);
    } else {
      setApplicableTiers((prev) => prev.filter((id) => id !== tierId));
    }
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === "percentage") return `${value}%`;
    return `${value.toLocaleString("vi-VN")}đ`;
  };

  const isCouponExpired = (coupon: Coupon) => {
    const expired = new Date(coupon.endDate) < new Date();
    const limitReached = coupon.maxUses !== -1 && coupon.usesCount >= coupon.maxUses;
    return expired || limitReached;
  };

  return (
    <div className="admin-stack">
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">Khuyến mãi</p>
          <h2>Quản lý Coupon giảm giá</h2>
        </div>
      </div>

      <div className="admin-grid-2 admin-grid-2--wide">
        {/* List Panel */}
        <div className="admin-panel">
          <div className="admin-panel-heading">
            <h3>Danh sách mã giảm giá</h3>
            <span>{coupons.length} mã</span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="admin-vip-table-new">
              <thead>
                <tr>
                  <th style={{ width: "25%" }}>Mã Code</th>
                  <th style={{ width: "20%" }}>Mức giảm</th>
                  <th style={{ width: "20%" }}>Sử dụng</th>
                  <th style={{ width: "20%" }}>Hết hạn</th>
                  <th style={{ width: "15%" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => {
                  const expired = isCouponExpired(coupon);
                  return (
                    <tr key={coupon._id}>
                      <td>
                        <div className="flex flex-col">
                          <strong className="text-gold font-mono text-sm tracking-wider select-all">{coupon.code}</strong>
                          <span className="text-[10px] text-muted block truncate max-w-[150px]">{coupon.description || "Không có mô tả"}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-semibold text-emerald-500">{formatDiscount(coupon.discountType, coupon.discountValue)}</span>
                        {coupon.minPurchaseAmount > 0 && (
                          <small className="text-[9px] text-muted block">Min: {coupon.minPurchaseAmount.toLocaleString("vi-VN")}đ</small>
                        )}
                      </td>
                      <td className="text-xs">
                        {coupon.maxUses === -1 ? (
                          <span>{coupon.usesCount} / ∞ lượt</span>
                        ) : (
                          <span>{coupon.usesCount} / {coupon.maxUses} lượt</span>
                        )}
                      </td>
                      <td>
                        <span className={`font-mono text-xs ${expired ? "text-red-400 font-bold" : "text-emerald-400"}`}>
                          {formatDate(coupon.endDate)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => onDelete(coupon._id)}
                          className="bg-[#FFFBF2] text-[#4a1f24] hover:bg-[#8c6a34]/10 border border-[#8c6a34]/30 text-[11px] font-bold px-4 py-1.5 rounded transition uppercase tracking-wider whitespace-nowrap shadow-sm cursor-pointer"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">Chưa có mã giảm giá nào.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Panel */}
        <div className="admin-panel">
          <div className="admin-panel-heading">
            <h3>Tạo mã giảm giá mới</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gold">Mã Coupon</label>
              <input
                type="text"
                placeholder="VD: CHAOSUMMER"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="bg-transparent border border-gold/30 rounded px-3 py-2 text-xs text-gold font-mono uppercase"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gold">Loại giảm giá</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="bg-transparent border border-gold/30 rounded px-3 py-2 text-xs text-[#2a2016] font-semibold cursor-pointer outline-none"
                >
                  <option value="percentage" className="bg-[#FFFBF2] text-[#2a2016]">Phần trăm (%)</option>
                  <option value="fixed" className="bg-[#FFFBF2] text-[#2a2016]">Số tiền cố định (đ)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gold">Giá trị giảm</label>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="bg-transparent border border-gold/30 rounded px-3 py-2 text-xs text-gold font-mono"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gold">Lượt dùng tối đa</label>
                <input
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                  placeholder="-1 nếu không giới hạn"
                  className="bg-transparent border border-gold/30 rounded px-3 py-2 text-xs text-gold font-mono"
                  min="-1"
                />
                <small className="text-[9px] text-muted">-1 là không giới hạn lượt dùng</small>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gold">Chi tiêu tối thiểu</label>
                <input
                  type="number"
                  value={minPurchaseAmount}
                  onChange={(e) => setMinPurchaseAmount(Number(e.target.value))}
                  className="bg-transparent border border-gold/30 rounded px-3 py-2 text-xs text-gold font-mono"
                  min="0"
                />
                <small className="text-[9px] text-muted">Đơn tối thiểu để áp dụng coupon</small>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gold">Áp dụng cho gói VIP</label>
              <div className="grid grid-cols-2 gap-2 border border-gold/20 rounded p-2.5 max-h-24 overflow-y-auto">
                {tiers
                  .filter((t) => t.slug !== "free")
                  .map((tier) => (
                    <label key={tier._id} className="flex items-center gap-2 text-xs text-[#2a2016] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applicableTiers.includes(tier._id)}
                        onChange={(e) => handleTierCheck(tier._id, e.target.checked)}
                        className="accent-[#8c6a34]"
                      />
                      <span>{tier.name}</span>
                    </label>
                  ))}
              </div>
              <small className="text-[9px] text-muted">Bỏ trống nếu áp dụng cho mọi gói VIP</small>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gold">Ngày hết hạn</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border border-gold/30 rounded px-3 py-2 text-xs text-gold font-mono cursor-pointer"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gold">Mô tả ngắn</label>
              <input
                type="text"
                placeholder="VD: Giảm giá hè 10%"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-transparent border border-gold/30 rounded px-3 py-2 text-xs text-[#2a2016]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#8c6a34] text-[#FFFBF2] hover:bg-[#8c6a34]/90 disabled:opacity-50 font-serif text-sm font-semibold uppercase tracking-wider py-2.5 rounded transition shadow-md"
            >
              {submitting ? "Đang tạo..." : "Tạo mã giảm giá"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
