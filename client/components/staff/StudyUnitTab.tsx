import React, { useState, useEffect, useMemo } from "react";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import { Lesson, Podcast } from "./types";
import { CustomFileInput, getCsrfToken, renderStaffStatusBadge } from "./helpers";

type StudyUnit = {
  _id: string;
  title: string;
  summary: string;
  chapterId: any; // populated or ID string
  order: number;
  duration: number;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  thumbnail: string;
  contentBlocks: any[];
  status: "Draft" | "Pending_Review" | "Published" | "Rejected";
  reviewFeedback?: string;
  updatedAt: string;
  pendingDraft?: any;
};

type Quiz = {
  _id: string;
  title: string;
};

type Chapter = {
  _id: string;
  title: string;
  grade: number;
};

type StudyUnitTabProps = {
  user: any;
  lessons: Lesson[];
  podcasts: Podcast[];
  setMessage: (msg: { type: "error" | "success"; text: string } | null) => void;
};

export default function StudyUnitTab({ user, lessons, podcasts, setMessage }: StudyUnitTabProps) {
  const [units, setUnits] = useState<StudyUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  
  // Form values
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [order, setOrder] = useState("0");
  const [duration, setDuration] = useState("15");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [tags, setTags] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [contentBlocks, setContentBlocks] = useState<any[]>([]);
  const [status, setStatus] = useState<"Draft" | "Pending_Review" | "Published" | "Rejected">("Draft");

  const [saving, setSaving] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingBlockIdx, setUploadingBlockIdx] = useState<number | null>(null);

  const selectedUnit = useMemo(() => units.find((u) => u._id === selectedId), [units, selectedId]);

  const loadData = async () => {
    setUnitsLoading(true);
    try {
      const unitsRes = await api.get<{ success: boolean; data: { units: StudyUnit[] } }>("/curriculum/units");
      setUnits(unitsRes.data.data.units);

      const chRes = await api.get<{ success: boolean; data: { chapters: Chapter[] } }>("/curriculum/chapters");
      setChapters(chRes.data.data.chapters);

      const qzRes = await api.get<{ success: boolean; data: { quizzes: Quiz[] } }>("/curriculum/quizzes");
      setQuizzes(qzRes.data.data.quizzes);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Lỗi đồng bộ dữ liệu bài lý thuyết." });
    } finally {
      setUnitsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setTitle("");
    setSummary("");
    setChapterId("");
    setOrder("0");
    setDuration("15");
    setDifficulty("Medium");
    setTags("");
    setThumbnail("");
    setContentBlocks([]);
    setStatus("Draft");
    setFormMode("create");
    setSelectedId(null);
  };

  const handleSelectUnit = (unit: StudyUnit) => {
    setSelectedId(unit._id);
    setFormMode("edit");
    setTitle(unit.title);
    setSummary(unit.summary || "");
    setChapterId(typeof unit.chapterId === "object" ? unit.chapterId._id : unit.chapterId);
    setOrder(String(unit.order));
    setDuration(String(unit.duration));
    setDifficulty(unit.difficulty);
    setTags((unit.tags || []).join(", "));
    setThumbnail(unit.thumbnail || "");
    setContentBlocks(unit.contentBlocks || []);
    setStatus(unit.status);
  };

  // Thumbnail upload
  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingThumb(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      
      const csrfToken = await getCsrfToken();
      const res = await api.post<{ url: string }>("/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
      });

      setThumbnail(res.data.url);
      setMessage({ type: "success", text: "Tải ảnh thu nhỏ lên thành công." });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: "Lỗi tải ảnh lên: " + (err.response?.data?.message || err.message) });
    } finally {
      setUploadingThumb(false);
    }
  };

  // Block asset upload
  const handleBlockAssetUpload = async (idx: number, type: "image" | "audio", file: File) => {
    setUploadingBlockIdx(idx);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append(type, file);

      const csrfToken = await getCsrfToken();
      const endpoint = type === "image" ? "/upload/image" : "/upload/audio";
      
      const res = await api.post<{ url: string }>(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
      });

      const updated = [...contentBlocks];
      if (type === "image") {
        updated[idx].data = { ...updated[idx].data, imageUrl: res.data.url };
      } else {
        updated[idx].data = { ...updated[idx].data, audioUrl: res.data.url };
      }
      setContentBlocks(updated);
      setMessage({ type: "success", text: "Tải tệp khối nội dung lên thành công." });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: "Lỗi tải tệp lên: " + (err.response?.data?.message || err.message) });
    } finally {
      setUploadingBlockIdx(null);
    }
  };

  // Block control functions
  const addBlock = (type: string) => {
    let data: any = {};
    if (type === "text") data = { text: "" };
    else if (type === "image") data = { imageUrl: "", caption: "" };
    else if (type === "audio") data = { audioUrl: "", title: "" };
    else if (type === "video") data = { url: "", title: "" };
    else if (type === "timeline") data = { events: [] };
    else if (type === "quote") data = { text: "", author: "" };
    else if (type === "map") data = { embedUrl: "", title: "" };
    else if (type === "podcast") data = { podcastId: "" };
    else if (type === "game") data = { gameId: "" };
    else if (type === "quiz") data = { quizId: "" };

    const newBlock = {
      type,
      data,
      order: contentBlocks.length,
    };
    setContentBlocks([...contentBlocks, newBlock]);
  };

  const removeBlock = (idx: number) => {
    setContentBlocks(contentBlocks.filter((_, i) => i !== idx));
  };

  const moveBlock = (idx: number, direction: "up" | "down") => {
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === contentBlocks.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const updated = [...contentBlocks];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    
    // Recalculate orders
    updated.forEach((b, i) => { b.order = i; });
    setContentBlocks(updated);
  };

  const updateBlockDataField = (idx: number, field: string, value: any) => {
    const updated = [...contentBlocks];
    updated[idx].data = { ...updated[idx].data, [field]: value };
    setContentBlocks(updated);
  };

  // Timeline helpers
  const addTimelineEvent = (blockIdx: number) => {
    const updated = [...contentBlocks];
    const events = updated[blockIdx].data.events || [];
    updated[blockIdx].data.events = [...events, { date: "", title: "", description: "" }];
    setContentBlocks(updated);
  };

  const updateTimelineEvent = (blockIdx: number, eventIdx: number, field: string, value: any) => {
    const updated = [...contentBlocks];
    const events = [...(updated[blockIdx].data.events || [])];
    events[eventIdx] = { ...events[eventIdx], [field]: value };
    updated[blockIdx].data.events = events;
    setContentBlocks(updated);
  };

  const removeTimelineEvent = (blockIdx: number, eventIdx: number) => {
    const updated = [...contentBlocks];
    const events = updated[blockIdx].data.events || [];
    updated[blockIdx].data.events = events.filter((_: any, i: number) => i !== eventIdx);
    setContentBlocks(updated);
  };

  const validateForm = () => {
    if (!title.trim()) return "Vui lòng nhập tên bài học.";
    if (!chapterId) return "Vui lòng chọn chương học liên kết.";
    if (Number.isNaN(Number(order))) return "Thứ tự sắp xếp phải là số.";
    if (Number.isNaN(Number(duration))) return "Thời lượng ước tính phải là số.";
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
        title: title.trim(),
        summary: summary.trim(),
        chapterId,
        order: Number(order),
        duration: Number(duration),
        difficulty,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        thumbnail,
        contentBlocks,
      };

      if (formMode === "create") {
        await api.post("/curriculum/units", payload, {
          headers: { "x-csrf-token": csrfToken },
        });
        setMessage({ type: "success", text: "Tạo bài học lý thuyết thành công." });
        resetForm();
      } else if (selectedId) {
        await api.put(`/curriculum/units/${selectedId}`, payload, {
          headers: { "x-csrf-token": csrfToken },
        });
        setMessage({ type: "success", text: "Cập nhật bài học lý thuyết thành công." });
      }
      await loadData();
    } catch (err: any) {
      console.error(err);
      setMessage({
        type: "error",
        text: err instanceof AxiosError ? err.response?.data?.message || "Lỗi lưu bài học." : "Lỗi lưu bài học.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("Bạn có chắc chắn muốn xóa bài lý thuyết này?")) return;

    setSaving(true);
    try {
      const csrfToken = await getCsrfToken();
      await api.delete(`/curriculum/units/${selectedId}`, {
        headers: { "x-csrf-token": csrfToken },
      });
      setMessage({ type: "success", text: "Xóa bài học lý thuyết thành công." });
      resetForm();
      await loadData();
    } catch (err: any) {
      console.error(err);
      setMessage({
        type: "error",
        text: err instanceof AxiosError ? err.response?.data?.message || "Lỗi xóa bài học." : "Lỗi xóa bài học.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1.1fr]">
      {/* Left List Pane */}
      <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm flex flex-col h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4 shrink-0">
          <h2 className="font-display text-lg font-semibold text-amber-900">
            Bài học lý thuyết
          </h2>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 hover:bg-amber-50"
          >
            Tạo mới
          </button>
        </div>

        {unitsLoading ? (
          <div className="p-6 text-center text-amber-600 italic">Đang tải danh sách bài học...</div>
        ) : (
          <div className="divide-y divide-amber-100">
            {units.map((unit) => (
              <button
                key={unit._id}
                type="button"
                onClick={() => handleSelectUnit(unit)}
                className={`w-full text-left px-5 py-4 transition flex gap-4 items-start ${
                  selectedId === unit._id ? "bg-amber-50" : "hover:bg-amber-50/60"
                }`}
              >
                {unit.thumbnail && (
                  <img
                    src={unit.thumbnail}
                    alt={unit.title}
                    className="w-16 h-16 object-cover rounded-lg border border-amber-200 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-900">{unit.title}</p>
                  <p className="text-[10px] text-amber-700 italic font-medium">
                    Chương: {typeof unit.chapterId === "object" ? unit.chapterId.title : "Chưa liên kết"}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 font-bold">
                      {unit.difficulty === "Easy" ? "Dễ" : unit.difficulty === "Medium" ? "Trung cấp" : "Khó"}
                    </span>
                    <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 font-bold">
                      {unit.duration} phút
                    </span>
                    {renderStaffStatusBadge(unit.status)}
                  </div>
                  <p className="mt-2 text-xs text-amber-655 line-clamp-2">{unit.summary}</p>
                </div>
              </button>
            ))}

            {units.length === 0 && (
              <div className="p-6 text-center text-amber-600 italic">Chưa cấu hình bài học lý thuyết nào.</div>
            )}
          </div>
        )}
      </div>

      {/* Right Editor Form Pane */}
      <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm flex flex-col h-[85vh]">
        <div className="border-b border-amber-100 px-5 py-4 shrink-0">
          <h2 className="font-display text-lg font-semibold text-amber-900">
            {formMode === "create" ? "Tạo bài học lý thuyết" : "Chỉnh sửa bài học"}
          </h2>
          <p className="text-xs text-amber-655 mt-1">
            Thiết lập thông tin chung và soạn thảo các khối nội dung lý thuyết.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {formMode === "edit" && selectedUnit?.status === "Rejected" && selectedUnit?.reviewFeedback && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <h3 className="font-semibold text-rose-950 mb-1 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Bài lý thuyết bị từ chối duyệt</span>
              </h3>
              <p className="font-medium text-rose-700">{selectedUnit.reviewFeedback}</p>
            </div>
          )}

          {formMode === "edit" && selectedUnit?.status === "Published" && selectedUnit?.pendingDraft && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-800">
              <h3 className="font-semibold text-amber-950 mb-1 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Đang có bản thảo chờ duyệt</span>
              </h3>
              <p className="font-medium text-amber-700">
                Bài viết này đang được xuất bản (Published). Các thay đổi mới nhất đang được lưu tạm chờ Giáo viên duyệt.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
              Tiêu đề bài học
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Nhập tiêu đề bài viết lý thuyết"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
              Tóm tắt nội dung
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Tóm tắt ngắn gọn về bài lý thuyết này"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Chương liên kết
              </label>
              <select
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Chọn chương</option>
                {chapters.map((ch) => (
                  <option key={ch._id} value={ch._id}>
                    Lớp {ch.grade} — {ch.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Trình độ
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="Easy">Dễ</option>
                <option value="Medium">Trung cấp</option>
                <option value="Hard">Nâng cao</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Thứ tự sắp xếp
              </label>
              <input
                type="text"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Thời lượng (phút)
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
              Nhãn (Tags - Phân cách bằng dấu phẩy)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="lich-su, vi-dai, the-ky-20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
              Ảnh đại diện bài lý thuyết
            </label>
            <CustomFileInput
              accept="image/*"
              onChange={handleThumbUpload}
              fileCount={thumbnail ? 1 : 0}
              disabled={uploadingThumb}
            />
            {uploadingThumb && (
              <p className="text-xs text-amber-600 mt-1 italic animate-pulse">Đang tải ảnh đại diện lên Cloudinary...</p>
            )}
            {thumbnail && (
              <img src={thumbnail} className="mt-2 w-32 h-20 object-cover rounded-lg border border-amber-200" alt="thumb" />
            )}
          </div>

          {/* CONTENT BLOCKS BUILDER */}
          <div className="border-t border-amber-200 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-850">
                Các khối nội dung bài học ({contentBlocks.length})
              </h3>
              <div className="flex gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addBlock(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="rounded border border-amber-200 bg-amber-50/60 px-2 py-1 text-xs text-amber-900 font-semibold focus:outline-none"
                >
                  <option value="">+ Thêm khối nội dung</option>
                  <option value="text">Văn bản</option>
                  <option value="image">Hình ảnh</option>
                  <option value="audio">Âm thanh</option>
                  <option value="video">Video (Youtube)</option>
                  <option value="timeline">Dòng thời gian</option>
                  <option value="quote">Trích dẫn</option>
                  <option value="map">Bản đồ (Embed)</option>
                  <option value="podcast">Podcast liên kết</option>
                  <option value="game">Trò chơi 2D</option>
                  <option value="quiz">Trắc nghiệm liên kết</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {contentBlocks.map((block, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-amber-200 bg-amber-50/20 space-y-3 relative">
                  {/* Block Header Toolbar */}
                  <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                    <span className="text-xs font-bold text-amber-900 uppercase">
                      Khối #{idx + 1}: {block.type === "text" ? "Văn bản" :
                                         block.type === "image" ? "Hình ảnh" :
                                         block.type === "audio" ? "Âm thanh" :
                                         block.type === "video" ? "Video Youtube" :
                                         block.type === "timeline" ? "Dòng thời gian" :
                                         block.type === "quote" ? "Trích dẫn" :
                                         block.type === "map" ? "Bản đồ" :
                                         block.type === "podcast" ? "Podcast" :
                                         block.type === "game" ? "Trò chơi 2D" : "Trắc nghiệm"}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, "up")}
                        disabled={idx === 0}
                        className="text-stone-500 hover:text-amber-900 disabled:opacity-30 text-xs font-bold"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, "down")}
                        disabled={idx === contentBlocks.length - 1}
                        className="text-stone-500 hover:text-amber-900 disabled:opacity-30 text-xs font-bold"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBlock(idx)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold pl-2"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  {/* Block Form Fields by Type */}
                  {block.type === "text" && (
                    <textarea
                      value={block.data?.text || ""}
                      onChange={(e) => updateBlockDataField(idx, "text", e.target.value)}
                      rows={3}
                      className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs text-amber-950 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                      placeholder="Nhập nội dung văn bản học tập..."
                    />
                  )}

                  {block.type === "image" && (
                    <div className="space-y-2">
                      <CustomFileInput
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBlockAssetUpload(idx, "image", file);
                        }}
                        fileCount={block.data?.imageUrl ? 1 : 0}
                        disabled={uploadingBlockIdx === idx}
                      />
                      {uploadingBlockIdx === idx && (
                        <p className="text-[11px] text-amber-600 italic">Đang tải ảnh khối...</p>
                      )}
                      {block.data?.imageUrl && (
                        <img src={block.data.imageUrl} className="w-32 h-20 object-cover rounded border border-amber-100" alt="Block image" />
                      )}
                      <input
                        type="text"
                        value={block.data?.caption || ""}
                        onChange={(e) => updateBlockDataField(idx, "caption", e.target.value)}
                        className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        placeholder="Nhập chú thích ảnh..."
                      />
                    </div>
                  )}

                  {block.type === "audio" && (
                    <div className="space-y-2">
                      <CustomFileInput
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBlockAssetUpload(idx, "audio", file);
                        }}
                        fileCount={block.data?.audioUrl ? 1 : 0}
                        disabled={uploadingBlockIdx === idx}
                      />
                      {uploadingBlockIdx === idx && (
                        <p className="text-[11px] text-amber-600 italic">Đang tải âm thanh khối...</p>
                      )}
                      {block.data?.audioUrl && (
                        <audio src={block.data.audioUrl} controls className="w-full h-8" />
                      )}
                      <input
                        type="text"
                        value={block.data?.title || ""}
                        onChange={(e) => updateBlockDataField(idx, "title", e.target.value)}
                        className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        placeholder="Nhập tên tệp âm thanh..."
                      />
                    </div>
                  )}

                  {block.type === "video" && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={block.data?.url || ""}
                        onChange={(e) => updateBlockDataField(idx, "url", e.target.value)}
                        className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        placeholder="Nhập link Youtube (vd: https://www.youtube.com/watch?v=...)"
                      />
                      <input
                        type="text"
                        value={block.data?.title || ""}
                        onChange={(e) => updateBlockDataField(idx, "title", e.target.value)}
                        className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        placeholder="Nhập tiêu đề video..."
                      />
                    </div>
                  )}

                  {block.type === "quote" && (
                    <div className="space-y-2">
                      <textarea
                        value={block.data?.text || ""}
                        onChange={(e) => updateBlockDataField(idx, "text", e.target.value)}
                        rows={2}
                        className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        placeholder="Lời trích dẫn nổi bật..."
                      />
                      <input
                        type="text"
                        value={block.data?.author || ""}
                        onChange={(e) => updateBlockDataField(idx, "author", e.target.value)}
                        className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        placeholder="Tác giả trích dẫn..."
                      />
                    </div>
                  )}

                  {block.type === "map" && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={block.data?.embedUrl || ""}
                        onChange={(e) => updateBlockDataField(idx, "embedUrl", e.target.value)}
                        className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs text-amber-900 focus:outline-none"
                        placeholder="Nhập mã nhúng bản đồ tương tác (Embed URL)..."
                      />
                      <input
                        type="text"
                        value={block.data?.title || ""}
                        onChange={(e) => updateBlockDataField(idx, "title", e.target.value)}
                        className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs text-amber-900 focus:outline-none"
                        placeholder="Tiêu đề bản đồ..."
                      />
                    </div>
                  )}

                  {block.type === "podcast" && (
                    <select
                      value={block.data?.podcastId || ""}
                      onChange={(e) => updateBlockDataField(idx, "podcastId", e.target.value)}
                      className="w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-xs text-amber-900 focus:outline-none"
                    >
                      <option value="">Chọn podcast liên kết</option>
                      {podcasts.map((pod) => (
                        <option key={pod._id} value={pod._id}>{pod.title}</option>
                      ))}
                    </select>
                  )}

                  {block.type === "game" && (
                    <select
                      value={block.data?.gameId || ""}
                      onChange={(e) => updateBlockDataField(idx, "gameId", e.target.value)}
                      className="w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-xs text-amber-900 focus:outline-none"
                    >
                      <option value="">Chọn trò chơi 2D (Phaser)</option>
                      {lessons.map((lesson) => (
                        <option key={lesson._id} value={lesson._id}>{lesson.title}</option>
                      ))}
                    </select>
                  )}

                  {block.type === "quiz" && (
                    <select
                      value={block.data?.quizId || ""}
                      onChange={(e) => updateBlockDataField(idx, "quizId", e.target.value)}
                      className="w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-xs text-amber-900 focus:outline-none"
                    >
                      <option value="">Chọn Quiz trắc nghiệm</option>
                      {quizzes.map((qz) => (
                        <option key={qz._id} value={qz._id}>{qz.title}</option>
                      ))}
                    </select>
                  )}

                  {block.type === "timeline" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-800">Mốc sự kiện lịch sử</span>
                        <button
                          type="button"
                          onClick={() => addTimelineEvent(idx)}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-200"
                        >
                          + Thêm sự kiện
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(block.data.events || []).map((ev: any, evIdx: number) => (
                          <div key={evIdx} className="p-3 bg-white rounded border border-amber-150 space-y-2 relative">
                            <button
                              type="button"
                              onClick={() => removeTimelineEvent(idx, evIdx)}
                              className="absolute top-1.5 right-1.5 text-red-500 hover:text-red-700 text-xs font-semibold leading-none"
                            >
                              ✕
                            </button>
                            <input
                              type="text"
                              value={ev.date}
                              onChange={(e) => updateTimelineEvent(idx, evIdx, "date", e.target.value)}
                              className="w-full rounded border border-amber-200 bg-amber-50/20 px-2 py-1 text-xs text-amber-900 focus:outline-none"
                              placeholder="Thời gian (vd: Năm 40, Thế kỷ 10...)"
                            />
                            <input
                              type="text"
                              value={ev.title}
                              onChange={(e) => updateTimelineEvent(idx, evIdx, "title", e.target.value)}
                              className="w-full rounded border border-amber-200 bg-amber-50/20 px-2 py-1 text-xs text-amber-900 focus:outline-none"
                              placeholder="Tên sự kiện..."
                            />
                            <textarea
                              value={ev.description}
                              onChange={(e) => updateTimelineEvent(idx, evIdx, "description", e.target.value)}
                              rows={2}
                              className="w-full rounded border border-amber-200 bg-amber-50/20 px-2 py-1 text-xs text-amber-955 focus:outline-none"
                              placeholder="Mô tả sự kiện chi tiết..."
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer save controls */}
        <div className="border-t border-amber-100 p-4 flex gap-3 shrink-0 bg-white">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : formMode === "create" ? "Tạo bài học" : "Cập nhật bài"}
          </button>
          {formMode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              Xóa bài viết
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
