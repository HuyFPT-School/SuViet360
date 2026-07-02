"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { adminApi, type Lesson, type LessonFormValues } from "@/lib/adminApi";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types/auth";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminLessons from "@/components/admin/AdminLessons";
import AdminUsers from "@/components/admin/AdminUsers";

type AdminTab = "dashboard" | "lessons" | "users";

const emptyForm: LessonFormValues = { title: "", content: "", spawnX: "100", spawnY: "100", tilesetNames: "", tilemapJson: null, tilesets: null, idleSprites: null, runSprites: null };
const tabs: Array<{ id: AdminTab; label: string }> = [{ id: "dashboard", label: "Dashboard" }, { id: "lessons", label: "Quản lý lesson" }, { id: "users", label: "Quản lý user" }];

function getLessonTilesetNames(lesson: Lesson) { return lesson.game.tilesets.map((tileset) => tileset.name).join(", "); }
function getAnimationCount(lesson: Lesson) { return Object.values(lesson.game.character.animations).reduce((total, frames) => total + (frames?.length ?? 0), 0); }

export default function AdminPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<LessonFormValues>(emptyForm);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [query, setQuery] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadAdmin = async () => {
      setLoading(true); setError("");
      try {
        const currentUser = await refreshUser();
        await adminApi.checkAdmin();
        const [lessonResponse, availableUsers] = await Promise.all([adminApi.getLessons(), adminApi.getAvailableUsers(currentUser)]);
        if (!mounted) return;
        setLessons(lessonResponse.lessons); setUsers(availableUsers);
      } catch { if (mounted) setError("Bạn cần đăng nhập bằng tài khoản admin."); }
      finally { if (mounted) setLoading(false); }
    };
    loadAdmin();
    return () => { mounted = false; };
  }, [refreshUser]);

  const filteredLessons = useMemo(() => {
    const term = query.trim().toLowerCase();
    return !term ? lessons : lessons.filter((l) => l.title.toLowerCase().includes(term) || l.content.toLowerCase().includes(term));
  }, [lessons, query]);

  const filteredUsers = useMemo(() => {
    const term = userQuery.trim().toLowerCase();
    return !term ? users : users.filter((u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || u.role.toLowerCase().includes(term));
  }, [users, userQuery]);

  const dashboardStats = useMemo(() => [
    { label: "Tổng lesson", value: lessons.length },
    { label: "Tileset", value: lessons.reduce((t, l) => t + l.game.tilesets.length, 0) },
    { label: "Sprite frame", value: lessons.reduce((t, l) => t + getAnimationCount(l), 0) },
    { label: "Admin hiện có", value: users.filter((u) => u.role === "admin").length },
  ], [lessons, users]);

  const resetForm = () => { setForm(emptyForm); setEditingLesson(null); };

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson); setActiveTab("lessons");
    setForm({ title: lesson.title, content: lesson.content, spawnX: String(lesson.game.spawnPoint.x), spawnY: String(lesson.game.spawnPoint.y), tilesetNames: getLessonTilesetNames(lesson), tilemapJson: null, tilesets: null, idleSprites: null, runSprites: null });
  };

  const validateForm = () => {
    if (!form.title.trim() || !form.content.trim()) return "Vui lòng nhập tiêu đề và nội dung.";
    if (Number.isNaN(Number(form.spawnX)) || Number.isNaN(Number(form.spawnY))) return "Spawn X và Y phải là số.";
    if (!form.tilesetNames.trim()) return "Vui lòng nhập tên tileset.";
    if (!editingLesson && (!form.tilemapJson || !form.tilesets?.length)) return "Cần file tilemap JSON và ảnh tileset.";
    return "";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage(""); setError("");
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }
    setSaving(true); setUploadProgress(0);
    try {
      const onProgress = (e: any) => { if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total)); };
      if (editingLesson) {
        const response = await adminApi.updateLesson(editingLesson._id, form, onProgress);
        setLessons((items) => items.map((item) => item._id === editingLesson._id ? response.lesson : item));
        setMessage("Đã cập nhật.");
      } else {
        const response = await adminApi.createLesson(form, onProgress);
        setLessons((items) => [response.lesson, ...items]);
        setMessage("Đã tạo lesson mới.");
      }
      resetForm();
    } catch (err: unknown) {
      const apiMessage = err && typeof err === "object" && "response" in err ? (err as any).response?.data?.message : "";
      setError(apiMessage || "Không thể lưu lesson.");
    } finally { setSaving(false); setUploadProgress(null); }
  };

  const handleDelete = async (lesson: Lesson) => {
    if (!window.confirm(`Xóa lesson "${lesson.title}"?`)) return;
    setMessage(""); setError("");
    try { await adminApi.deleteLesson(lesson._id); setLessons((items) => items.filter((item) => item._id !== lesson._id)); if (editingLesson?._id === lesson._id) resetForm(); setMessage("Đã xóa."); }
    catch { setError("Không thể xóa."); }
  };

  if (loading || isLoading) return <section className="admin-page admin-page--center"><div className="admin-loading">Đang kiểm tra quyền admin...</div></section>;
  if (error && !user) return <section className="admin-page admin-page--center"><div className="admin-access-card"><h1>Admin Panel</h1><p>{error}</p><Link href="/login" className="admin-primary-link">Đăng nhập</Link></div></section>;
  if (user?.role !== "admin") return <section className="admin-page admin-page--center"><div className="admin-access-card"><h1>Không có quyền</h1><p>Trang này chỉ dành cho admin.</p><Link href="/" className="admin-primary-link">Về trang chủ</Link></div></section>;

  return (
    <section className="admin-page">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div><p className="admin-kicker">SuViet360</p><h1>Admin Panel</h1></div>
          <div className="admin-tabs" role="tablist">
            {tabs.map((tab) => <button key={tab.id} type="button" className={`admin-tab${activeTab === tab.id ? " admin-tab--active" : ""}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
          </div>
          <div className="admin-user-card"><span>Tài khoản</span><strong>{user.name}</strong><small>{user.email}</small></div>
        </aside>
        <div className="admin-content">
          {(message || error) && <div className={`admin-alert ${error ? "admin-alert--error" : "admin-alert--success"}`}>{error || message}</div>}
          {activeTab === "dashboard" && <AdminDashboard stats={dashboardStats} lessons={lessons} users={users} onOpenLessons={() => setActiveTab("lessons")} onOpenUsers={() => setActiveTab("users")}/>}
          {activeTab === "lessons" && <AdminLessons form={form} setForm={setForm} editingLesson={editingLesson} saving={saving} filteredLessons={filteredLessons} query={query} setQuery={setQuery} onSubmit={handleSubmit} onReset={resetForm} onEdit={handleEdit} onDelete={handleDelete}/>}
          {activeTab === "users" && <AdminUsers users={filteredUsers} allUsers={users} query={userQuery} setQuery={setUserQuery}/>}
        </div>
      </div>
      {saving && uploadProgress !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#FFFBF2", border: "2px solid #8c6a34", borderRadius: "12px", padding: "24px 32px", width: "90%", maxWidth: "400px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)", textAlign: "center" }}>
            <h3 style={{ fontFamily: "Cinzel, serif", fontSize: "18px", fontWeight: "bold", color: "#6b4f14", marginBottom: "16px" }}>{uploadProgress === 100 ? "ĐANG XỬ LÝ..." : "ĐANG TẢI GAME LÊN..."}</h3>
            <div style={{ width: "100%", height: "12px", background: "#e5e7eb", borderRadius: "9999px", overflow: "hidden", marginBottom: "12px" }}><div style={{ height: "100%", width: `${uploadProgress}%`, background: "linear-gradient(90deg, #d2a85b, #9b6b2f)", borderRadius: "9999px", transition: "width 0.2s" }}/></div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#4a1f24", marginBottom: "8px" }}>{uploadProgress}%</div>
            <p style={{ fontSize: "12px", color: "rgba(58,43,27,0.7)" }}>{uploadProgress === 100 ? "Đang lưu thông tin..." : "Đang tải lên Cloudinary..."}</p>
          </div>
        </div>
      )}
    </section>
  );
}
