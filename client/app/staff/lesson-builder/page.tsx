"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { ContentBlock, LessonRef, PodcastRef, GameRef, LessonPartData } from "@/components/lesson-builder/types";
import BuilderSidebar from "@/components/lesson-builder/BuilderSidebar";
import BuilderCanvas from "@/components/lesson-builder/BuilderCanvas";
import { Message, GuardView } from "@/components/staff/helpers";

function BuilderPage() {
  const { user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const presetLessonId = searchParams.get("lessonId");

  const [lessons, setLessons] = useState<LessonRef[]>([]);
  const [podcasts, setPodcasts] = useState<PodcastRef[]>([]);
  const [games, setGames] = useState<GameRef[]>([]);
  const [parts, setParts] = useState<LessonPartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [selLessonId, setSelLessonId] = useState(presetLessonId || "");
  const [partTitle, setPartTitle] = useState("");
  const [partOrder, setPartOrder] = useState(0);
  const [learningObj, setLearningObj] = useState("");
  const [estMinutes, setEstMinutes] = useState(15);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [editPartId, setEditPartId] = useState<string | null>(null);

  const selLesson = lessons.find(l => l._id === selLessonId);

  const getCsrf = async () => (await api.get<{ data: { csrfToken: string } }>("/csrf-token")).data.data.csrfToken;

  useEffect(() => {
    (async () => {
      try {
        const [lR, pR, gR] = await Promise.all([
          api.get<{ success: boolean; lessons: LessonRef[] }>("/lessons"),
          api.get<{ success: boolean; data: PodcastRef[] }>("/staff/podcasts"),
          api.get<{ success: boolean; games: GameRef[] }>("/curriculum/games"),
        ]);
        if (lR.data.success) setLessons(lR.data.lessons);
        if (pR.data.success) setPodcasts(pR.data.data || []);
        if (gR.data.success) setGames(gR.data.games || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const fetchParts = useCallback(async (lid: string) => {
    if (!lid) { setParts([]); return; }
    try { const r = await api.get<{ success: boolean; parts: LessonPartData[] }>(`/lessons/${lid}/parts`); setParts(r.data.parts); } catch {}
  }, []);

  useEffect(() => { if (selLessonId) fetchParts(selLessonId); }, [selLessonId, fetchParts]);

  const reset = () => {
    setPartTitle(""); setPartOrder(0); setLearningObj(""); setEstMinutes(15);
    setBlocks([]); setEditPartId(null);
  };

  const loadPart = (part: LessonPartData) => {
    setEditPartId(part._id || null); setPartTitle(part.title); setPartOrder(part.order);
    setLearningObj(part.learningObjective || ""); setEstMinutes(part.estimatedMinutes || 15);
    setBlocks((part.contentBlocks || []).map((b, i) => ({ ...b, order: i })));
  };

  const handleSave = async () => {
    if (!partTitle.trim()) { setMsg({ type: "error", text: "Nhập tiêu đề." }); return; }
    if (!selLessonId) { setMsg({ type: "error", text: "Chọn bài học trước." }); return; }
    setSaving(true); setMsg(null);
    try {
      const csrf = await getCsrf();
      const cleanBlocks = blocks.map(b => {
        const { _imageFile, _audioFile, ...rest } = b as any;
        return { type: b.type, data: b.data, order: b.order };
      });
      const fd = new FormData();
      fd.append("title", partTitle.trim()); fd.append("order", String(partOrder));
      fd.append("learningObjective", learningObj.trim()); fd.append("estimatedMinutes", String(estMinutes));
      fd.append("contentBlocks", JSON.stringify(cleanBlocks));
      blocks.forEach(b => { if (b._imageFile) fd.append("images", b._imageFile); if (b._audioFile) fd.append("audios", b._audioFile); });
      if (editPartId) await api.put(`/lessons/parts/${editPartId}`, fd, { headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrf } });
      else await api.post(`/lessons/${selLessonId}/parts`, fd, { headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrf } });
      setMsg({ type: "success", text: editPartId ? "Đã cập nhật." : "Đã tạo Part." });
      fetchParts(selLessonId);
    } catch (err: any) { setMsg({ type: "error", text: err.response?.data?.message || "Lỗi." }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa?")) return;
    try { await api.delete(`/lessons/parts/${id}`, { headers: { "x-csrf-token": await getCsrf() } }); setMsg({ type: "success", text: "Đã xóa." }); if (editPartId === id) reset(); fetchParts(selLessonId); }
    catch { setMsg({ type: "error", text: "Không xóa được." }); }
  };

  const handleSelectLesson = (id: string) => { setSelLessonId(id); reset(); };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F3E9" }}><p className="text-amber-800 animate-pulse">Đang tải...</p></div>;
  if (!user) return <GuardView title="Cần đăng nhập" desc="Đăng nhập để vào." link="/login" linkText="Đăng nhập" />;
  if (user.role !== "staff" && user.role !== "admin") return <GuardView title="Không có quyền" desc="Bạn không có quyền." link="/" linkText="Về trang chủ" />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F5F0E8" }}>
      <header className="bg-[#2B1F0E] text-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-lg border-b-2 border-amber-600 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/staff" className="text-amber-400 hover:text-amber-300 text-sm font-semibold transition flex items-center gap-1">Staff</Link>
          <div className="h-5 w-px bg-amber-700/50"/>
          <h1 className="text-lg font-display font-bold tracking-wide">Trinh Dung Bai Hoc</h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {selLesson && <span className="bg-amber-800/50 text-amber-200 px-3 py-1 rounded-full border border-amber-700/50">{selLesson.title}</span>}
          <span className="text-amber-400/70">{user.name}</span>
        </div>
      </header>

      <div className="flex-1 flex">
        <BuilderSidebar
          lessons={lessons} selectedLessonId={selLessonId} onSelectLesson={handleSelectLesson}
          parts={parts} editingPartId={editPartId} onLoadPart={loadPart} onDeletePart={handleDelete}
          partTitle={partTitle} onPartTitleChange={setPartTitle} partOrder={partOrder} onPartOrderChange={setPartOrder}
          learningObj={learningObj} onLearningObjChange={setLearningObj} estMinutes={estMinutes} onEstMinutesChange={setEstMinutes}
          saving={saving} onSave={handleSave} onReset={reset}
        />
        <div className="flex-1 flex flex-col">
          {msg && <div className="mx-6 mt-4"><Message msg={msg} onDismiss={() => setMsg(null)}/></div>}
          {!selLessonId ? (
            <div className="flex items-center justify-center flex-1 text-center">
              <div><p className="text-5xl mb-4">👈</p><p className="text-amber-700 text-lg font-display font-bold">Chọn bài học bên trái</p><p className="text-amber-500 text-sm mt-1">Sau đó thêm các block nội dung</p></div>
            </div>
          ) : (
            <BuilderCanvas blocks={blocks} podcasts={podcasts} games={games} lessons={lessons}
              partTitle={partTitle} learningObj={learningObj} estMinutes={estMinutes}
              onBlocksChange={setBlocks}/>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F3E9" }}><p className="text-amber-800 animate-pulse">Đang tải...</p></div>}><BuilderPage/></Suspense>;
}
