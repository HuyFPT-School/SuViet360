"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { blogApi } from "@/lib/blogApi";
import type { BlogPost, BlogReport } from "@/types/blog";
import type {
  Chapter, Lesson, Podcast, LessonFormState, ChapterFormState, PodcastFormState,
} from "@/components/staff/types";
import { GuardView, Message, UploadOverlay } from "@/components/staff/helpers";
import ChaptersTab from "@/components/staff-tabs/ChaptersTab";
import LessonsTab from "@/components/staff-tabs/LessonsTab";
import PodcastsTab from "@/components/staff-tabs/PodcastsTab";
import BlogTab from "@/components/staff-tabs/BlogTab";

export default function StaffPage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [tab, setTab] = useState<"chapters" | "lessons" | "podcasts" | "blog">("chapters");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chLoading, setChLoading] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lLoading, setLLoading] = useState(false);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [podLoading, setPodLoading] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [reports, setReports] = useState<BlogReport[]>([]);
  const [blogLoading, setBlogLoading] = useState(false);

  const getCsrf = async () => (await api.get<{ data: { csrfToken: string } }>("/csrf-token")).data.data.csrfToken;

  const fetchChapters = useCallback(async () => {
    setChLoading(true);
    try { const r = await api.get<{ success: boolean; chapters: Chapter[] }>("/lessons/chapters/list"); if (r.data.success) setChapters(r.data.chapters); }
    catch { setMsg({ type: "error", text: "Không tải được chương." }); }
    finally { setChLoading(false); }
  }, []);

  const fetchLessons = useCallback(async () => {
    setLLoading(true);
    try { const r = await api.get<{ success: boolean; lessons: Lesson[] }>("/lessons"); setLessons(r.data.lessons); }
    catch { setMsg({ type: "error", text: "Không tải được bài học." }); }
    finally { setLLoading(false); }
  }, []);

  const fetchPodcasts = useCallback(async () => {
    setPodLoading(true);
    try { const r = await api.get<{ success: boolean; data: Podcast[] }>("/staff/podcasts"); setPodcasts(r.data.data); }
    catch { setMsg({ type: "error", text: "Không tải được podcast." }); }
    finally { setPodLoading(false); }
  }, []);

  const fetchBlog = useCallback(async () => {
    setBlogLoading(true);
    try { const [pr, rr] = await Promise.all([blogApi.getPendingPosts(), blogApi.getPendingReports()]); if (pr.success) setPosts(pr.data); if (rr.success) setReports(rr.data); }
    catch {}
    finally { setBlogLoading(false); }
  }, []);

  useEffect(() => { refreshUser(); }, []);
  useEffect(() => {
    if (!user) return;
    if (tab === "chapters") fetchChapters();
    if (tab === "lessons") { fetchLessons(); fetchChapters(); fetchPodcasts(); }
    if (tab === "podcasts") fetchPodcasts();
    if (tab === "blog") fetchBlog();
  }, [user, tab, fetchChapters, fetchLessons, fetchPodcasts, fetchBlog]);

  const handleChapterSave = async (form: ChapterFormState, editId: string | null) => {
    setSaving(true);
    try {
      const csrf = await getCsrf();
      const body = { title: form.title.trim(), description: form.description.trim(), grade: +form.grade, order: +form.order || 0, status: form.status };
      if (editId) await api.put(`/lessons/chapters/${editId}`, body, { headers: { "x-csrf-token": csrf } });
      else await api.post("/lessons/chapters", body, { headers: { "x-csrf-token": csrf } });
      setMsg({ type: "success", text: editId ? "Đã cập nhật." : "Đã tạo chương." });
      fetchChapters();
    } catch (err: any) { setMsg({ type: "error", text: err.response?.data?.message || "Lỗi." }); }
    finally { setSaving(false); }
  };

  const handleChapterDelete = async (id: string) => {
    if (!confirm("Xóa chương = xóa TẤT CẢ bài học bên trong. Chắc chứ?")) return;
    try { await api.delete(`/lessons/chapters/${id}`, { headers: { "x-csrf-token": await getCsrf() } }); setMsg({ type: "success", text: "Đã xóa." }); fetchChapters(); fetchLessons(); }
    catch { setMsg({ type: "error", text: "Không xóa được." }); }
  };

  const handleLessonSave = async (form: LessonFormState, mode: "create" | "edit", lessonId: string | null) => {
    if (!form.title.trim()) { setMsg({ type: "error", text: "Nhập tiêu đề." }); return; }
    if (mode === "create" && !form.tilemapFile) { setMsg({ type: "error", text: "Cần Tilemap JSON." }); return; }
    setSaving(true); setUploadPct(0);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim()); fd.append("content", form.content.trim());
      if (form.chapterId) fd.append("chapterId", form.chapterId);
      if (form.grade) fd.append("grade", form.grade);
      fd.append("order", form.order); fd.append("spawnPoint[x]", form.spawnX); fd.append("spawnPoint[y]", form.spawnY);
      if (form.tilemapFile) fd.append("tilemapJson", form.tilemapFile);
      form.tilesetFiles.forEach(f => fd.append("tilesets", f));
      fd.append("tilesetNames", JSON.stringify(form.tilesetNames));
      form.idleSprites.forEach(f => fd.append("idleSprites", f));
      form.runSprites.forEach(f => fd.append("runSprites", f));
      const csrf = await getCsrf();
      const onProg = (e: any) => { if (e.total) setUploadPct(Math.round((e.loaded * 100) / e.total)); };
      if (mode === "create") await api.post("/lessons", fd, { headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrf }, onUploadProgress: onProg });
      else if (lessonId) await api.put(`/lessons/${lessonId}`, fd, { headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrf }, onUploadProgress: onProg });
      setMsg({ type: "success", text: mode === "create" ? "Đã tạo." : "Đã cập nhật." });
      fetchLessons();
    } catch (err: any) { setMsg({ type: "error", text: err.response?.data?.message || "Lỗi." }); }
    finally { setSaving(false); setUploadPct(null); }
  };

  const handleLessonDelete = async (id: string) => {
    if (!confirm("Xóa?")) return;
    try { await api.delete(`/lessons/${id}`, { headers: { "x-csrf-token": await getCsrf() } }); setMsg({ type: "success", text: "Đã xóa." }); fetchLessons(); }
    catch { setMsg({ type: "error", text: "Không xóa được." }); }
  };

  const handlePodcastSave = async (form: PodcastFormState, mode: "create" | "edit", podcastId: string | null) => {
    if (!form.title.trim()) { setMsg({ type: "error", text: "Nhập tiêu đề." }); return; }
    if (mode === "create" && (!form.thumbnailFile || !form.audioFile)) { setMsg({ type: "error", text: "Cần ảnh + audio." }); return; }
    setSaving(true); setUploadPct(0);
    try {
      const fd = new FormData(); const csrf = await getCsrf();
      fd.append("title", form.title.trim()); fd.append("description", form.description.trim()); fd.append("content", form.content.trim());
      fd.append("level", form.level); fd.append("category", form.category.trim());
      if (form.lessonId) fd.append("lessonId", form.lessonId);
      if (form.thumbnailFile) fd.append("thumbnail", form.thumbnailFile);
      if (form.audioFile) fd.append("audio", form.audioFile);
      const onProg = (e: any) => { if (e.total) setUploadPct(Math.round((e.loaded * 100) / e.total)); };
      if (mode === "create") await api.post("/staff/podcasts", fd, { headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrf }, onUploadProgress: onProg });
      else if (podcastId) await api.put(`/staff/podcasts/${podcastId}`, fd, { headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrf }, onUploadProgress: onProg });
      setMsg({ type: "success", text: "Đã lưu." }); fetchPodcasts();
    } catch (err: any) { setMsg({ type: "error", text: err.response?.data?.message || "Lỗi." }); }
    finally { setSaving(false); setUploadPct(null); }
  };

  const handlePodcastDelete = async (id: string) => {
    if (!confirm("Xóa?")) return;
    try { await api.delete(`/staff/podcasts/${id}`, { headers: { "x-csrf-token": await getCsrf() } }); setMsg({ type: "success", text: "Đã xóa." }); fetchPodcasts(); }
    catch { setMsg({ type: "error", text: "Không xóa được." }); }
  };

  const handleApprovePost = async (id: string) => { if (!confirm("Duyệt?")) return; try { await blogApi.approvePost(id); setMsg({ type: "success", text: "Đã duyệt." }); fetchBlog(); } catch { setMsg({ type: "error", text: "Lỗi." }); } };
  const handleRejectPost = async (id: string, feedback: string) => { await blogApi.rejectPost(id, feedback); setMsg({ type: "success", text: "Đã từ chối." }); fetchBlog(); };
  const handleResolveReport = async (id: string, action: "delete" | "dismiss") => { if (!confirm(action === "delete" ? "XÓA?" : "Bỏ qua?")) return; try { await blogApi.resolveReport(id, action); setMsg({ type: "success", text: "Đã xử lý." }); fetchBlog(); } catch { setMsg({ type: "error", text: "Lỗi." }); } };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F3E9" }}><p className="text-amber-800 animate-pulse">Đang tải...</p></div>;
  if (!user) return <GuardView title="Cần đăng nhập" desc="Đăng nhập để vào Staff." link="/login" linkText="Đăng nhập" />;
  if (user.role !== "staff" && user.role !== "admin") return <GuardView title="Không có quyền" desc="Bạn không có quyền." link="/" linkText="Về trang chủ" />;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(rgba(247,243,233,0.5), rgba(247,243,233,0.5)), url('/textures/paper.jpg')", backgroundSize: "cover", backgroundAttachment: "fixed" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8"> 
          <div>
            <h1 className="text-3xl font-display font-bold text-[#3B2F1E]">Bảng Điều Phối</h1>
          </div>     
        <div className="flex gap-0 mb-6 border-b-2 border-amber-300">
          {[
            { key: "chapters" as const, label: "Chuong", desc: "Quan ly chuong" },
            { key: "lessons" as const, label: "Bai hoc", desc: "Bai hoc & Part" },
            { key: "podcasts" as const, label: "Podcast", desc: "Audio" },
            { key: "blog" as const, label: "Dien dan", desc: "Kiem duyet" },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setMsg(null); }}
              className={`flex-1 px-4 py-3 rounded-t-xl text-sm font-semibold transition-all ${tab === t.key ? "bg-white/95 border-2 border-b-0 border-amber-300 text-[#3B2F1E] shadow-md -mb-[2px] relative z-10" : "bg-amber-100/50 border border-transparent text-amber-700 hover:bg-amber-100"}`}>
              <span className="block">{t.label}</span><span className="text-[10px] opacity-60">{t.desc}</span>
            </button>
          ))}
        </div>
        <Message msg={msg} onDismiss={() => setMsg(null)} />
        {tab === "chapters" && <ChaptersTab chapters={chapters} loading={chLoading} saving={saving} onSave={handleChapterSave} onDelete={handleChapterDelete} />}
        {tab === "lessons" && <LessonsTab lessons={lessons} chapters={chapters} loading={lLoading} saving={saving} uploadPct={uploadPct} onSave={handleLessonSave} onDelete={handleLessonDelete} />}
        {tab === "podcasts" && <PodcastsTab podcasts={podcasts} lessons={lessons} loading={podLoading} saving={saving} uploadPct={uploadPct} onSave={handlePodcastSave} onDelete={handlePodcastDelete} />}
        {tab === "blog" && <BlogTab posts={posts} reports={reports} loading={blogLoading} onApprovePost={handleApprovePost} onRejectPost={handleRejectPost} onResolveReport={handleResolveReport} />}
        {saving && uploadPct !== null && <UploadOverlay pct={uploadPct} />}
      </div>
    </div>
  );
}
