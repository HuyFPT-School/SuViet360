import React, { useState, useEffect } from "react";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import { CustomFileInput, getCsrfToken, renderStaffStatusBadge } from "./helpers";

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  image: string;
};

type Quiz = {
  _id: string;
  title: string;
  description: string;
  timeLimit: number | null;
  passScore: number;
  shuffleQuestions: boolean;
  status: "Draft" | "Pending_Review" | "Published" | "Rejected";
  questions: QuizQuestion[];
  reviewFeedback?: string;
  pendingDraft?: any;
};

type QuizTabProps = {
  user: any;
  setMessage: (msg: { type: "error" | "success"; text: string } | null) => void;
};

const emptyQuestion = (): QuizQuestion => ({
  question: "",
  options: ["", ""], // Start with 2 options
  correctIndex: 0,
  explanation: "",
  image: "",
});

export default function QuizTab({ user, setMessage }: QuizTabProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const selectedQuiz = quizzes.find((q) => q._id === selectedId) || null;

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState(""); // empty string = null
  const [passScore, setPassScore] = useState("60");
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [status, setStatus] = useState<"Draft" | "Pending_Review" | "Published" | "Rejected">("Draft");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  const [uploadingImageIdx, setUploadingImageIdx] = useState<number | null>(null);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: { quizzes: Quiz[] } }>("/curriculum/quizzes");
      setQuizzes(res.data.data.quizzes || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Không thể tải danh sách câu hỏi trắc nghiệm." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTimeLimit("");
    setPassScore("60");
    setShuffleQuestions(false);
    setStatus("Draft");
    setQuestions([]);
    setFormMode("create");
    setSelectedId(null);
  };

  const handleSelectQuiz = (quiz: Quiz) => {
    setSelectedId(quiz._id);
    setFormMode("edit");
    setTitle(quiz.title);
    setDescription(quiz.description || "");
    setTimeLimit(quiz.timeLimit ? String(quiz.timeLimit) : "");
    setPassScore(String(quiz.passScore));
    setShuffleQuestions(!!quiz.shuffleQuestions);
    setStatus(quiz.status);
    setQuestions(quiz.questions || []);
  };

  // Question editing handlers
  const addQuestion = () => {
    setQuestions([...questions, emptyQuestion()]);
  };

  const removeQuestion = (qIdx: number) => {
    setQuestions(questions.filter((_, idx) => idx !== qIdx));
  };

  const updateQuestionField = (qIdx: number, field: keyof QuizQuestion, value: any) => {
    const updated = [...questions];
    updated[qIdx] = { ...updated[qIdx], [field]: value };
    setQuestions(updated);
  };

  const addOption = (qIdx: number) => {
    const updated = [...questions];
    if (updated[qIdx].options.length >= 6) return; // Limit to 6 options
    updated[qIdx].options = [...updated[qIdx].options, ""];
    setQuestions(updated);
  };

  const removeOption = (qIdx: number, optIdx: number) => {
    const updated = [...questions];
    if (updated[qIdx].options.length <= 2) return; // Limit to min 2 options
    
    updated[qIdx].options = updated[qIdx].options.filter((_, idx) => idx !== optIdx);
    // Correct correctIndex if it was deleted or out of range
    if (updated[qIdx].correctIndex >= updated[qIdx].options.length) {
      updated[qIdx].correctIndex = 0;
    }
    setQuestions(updated);
  };

  const updateOptionText = (qIdx: number, optIdx: number, text: string) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx] = text;
    setQuestions(updated);
  };

  // Question image upload
  const handleQuestionImageUpload = async (qIdx: number, file: File) => {
    setUploadingImageIdx(qIdx);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      
      const csrfToken = await getCsrfToken();
      const res = await api.post<{ url: string }>("/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data", "x-csrf-token": csrfToken },
      });

      updateQuestionField(qIdx, "image", res.data.url);
      setMessage({ type: "success", text: `Tải ảnh câu hỏi #${qIdx + 1} thành công.` });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: "Lỗi tải ảnh: " + (err.response?.data?.message || err.message) });
    } finally {
      setUploadingImageIdx(null);
    }
  };

  const validateForm = () => {
    if (!title.trim()) return "Vui lòng nhập tiêu đề Quiz.";
    if (Number.isNaN(Number(passScore)) || Number(passScore) < 0 || Number(passScore) > 100) {
      return "Điểm đạt phải là tỉ lệ phần trăm từ 0 đến 100.";
    }
    if (timeLimit && Number.isNaN(Number(timeLimit))) {
      return "Giới hạn thời gian phải là số giây hợp lệ.";
    }

    if (questions.length === 0) return "Vui lòng thêm ít nhất một câu hỏi.";

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) return `Vui lòng điền nội dung câu hỏi #${i + 1}.`;
      if (q.options.some((opt) => !opt.trim())) return `Vui lòng điền đầy đủ các phương án trả lời ở câu hỏi #${i + 1}.`;
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        return `Vui lòng chọn đáp án đúng hợp lệ ở câu hỏi #${i + 1}.`;
      }
    }
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
        description: description.trim(),
        timeLimit: timeLimit ? Number(timeLimit) : null,
        passScore: Number(passScore),
        shuffleQuestions,
        questions,
      };

      if (formMode === "create") {
        await api.post("/curriculum/quizzes", payload, {
          headers: { "x-csrf-token": csrfToken },
        });
        setMessage({ type: "success", text: "Tạo Quiz trắc nghiệm thành công." });
        resetForm();
      } else if (selectedId) {
        await api.put(`/curriculum/quizzes/${selectedId}`, payload, {
          headers: { "x-csrf-token": csrfToken },
        });
        setMessage({ type: "success", text: "Cập nhật Quiz trắc nghiệm thành công." });
      }
      await fetchQuizzes();
    } catch (err: any) {
      console.error(err);
      setMessage({
        type: "error",
        text: err instanceof AxiosError ? err.response?.data?.message || "Lỗi lưu Quiz." : "Lỗi lưu Quiz.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("Bạn có chắc chắn muốn xóa Quiz trắc nghiệm này?")) return;

    setSaving(true);
    try {
      const csrfToken = await getCsrfToken();
      await api.delete(`/curriculum/quizzes/${selectedId}`, {
        headers: { "x-csrf-token": csrfToken },
      });
      setMessage({ type: "success", text: "Xóa Quiz thành công." });
      resetForm();
      await fetchQuizzes();
    } catch (err: any) {
      console.error(err);
      setMessage({
        type: "error",
        text: err instanceof AxiosError ? err.response?.data?.message || "Lỗi xóa Quiz." : "Lỗi xóa Quiz.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1.1fr]">
      {/* Left List Column */}
      <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm flex flex-col h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4 shrink-0">
          <h2 className="font-display text-lg font-semibold text-amber-900">
            Ngân hàng Quiz trắc nghiệm
          </h2>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 hover:bg-amber-50"
          >
            Tạo mới
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-amber-600 italic">Đang tải danh sách Quiz...</div>
        ) : (
          <div className="divide-y divide-amber-100">
            {quizzes.map((quiz) => (
              <button
                key={quiz._id}
                type="button"
                onClick={() => handleSelectQuiz(quiz)}
                className={`w-full text-left px-5 py-4 transition flex flex-col gap-1.5 ${
                  selectedId === quiz._id ? "bg-amber-50" : "hover:bg-amber-50/60"
                }`}
              >
                <div className="flex justify-between items-center gap-2">
                  <p className="font-semibold text-amber-900 truncate">{quiz.title}</p>
                  {renderStaffStatusBadge(quiz.status)}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-amber-850 font-medium">
                  <span>Số câu: {quiz.questions?.length || 0} câu</span>
                  <span>Đạt: {quiz.passScore}%</span>
                  {quiz.timeLimit && <span>Hạn giờ: {quiz.timeLimit}s</span>}
                </div>
                {quiz.description && (
                  <p className="text-xs text-amber-655 line-clamp-2">{quiz.description}</p>
                )}
              </button>
            ))}

            {quizzes.length === 0 && (
              <div className="p-6 text-center text-amber-600 italic">Chưa có bài Quiz trắc nghiệm nào.</div>
            )}
          </div>
        )}
      </div>

      {/* Right Form Editor Column */}
      <div className="rounded-2xl border border-amber-200 bg-white/90 backdrop-blur-sm shadow-sm flex flex-col h-[85vh]">
        <div className="border-b border-amber-100 px-5 py-4 shrink-0">
          <h2 className="font-display text-lg font-semibold text-amber-900">
            {formMode === "create" ? "Tạo Quiz mới" : "Chỉnh sửa bài Quiz"}
          </h2>
          <p className="text-xs text-amber-655 mt-1">
            Thiết lập câu hỏi, đáp án đúng và giải thích chi tiết đáp án.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {formMode === "edit" && selectedQuiz?.status === "Rejected" && selectedQuiz?.reviewFeedback && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <h3 className="font-semibold text-rose-950 mb-1 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Bài Quiz bị từ chối duyệt</span>
              </h3>
              <p className="font-medium text-rose-700">{selectedQuiz.reviewFeedback}</p>
            </div>
          )}

          {formMode === "edit" && selectedQuiz?.status === "Published" && selectedQuiz?.pendingDraft && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-800">
              <h3 className="font-semibold text-amber-950 mb-1 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Đang có bản thảo chờ duyệt</span>
              </h3>
              <p className="font-medium text-amber-700">
                Bài Quiz này đang được xuất bản (Published). Các thay đổi mới nhất đang được lưu tạm chờ Giáo viên duyệt.
              </p>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
              Tiêu đề bài Quiz
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Nhập tiêu đề Quiz ôn tập"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
              Mô tả ngắn
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none"
              placeholder="Mô tả mục tiêu ôn tập của bài Quiz..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Tỉ lệ điểm đạt (%)
              </label>
              <input
                type="text"
                value={passScore}
                onChange={(e) => setPassScore(e.target.value)}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-700">
                Hạn giờ (giây - để trống = vô hạn)
              </label>
              <input
                type="text"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                placeholder="Vô hạn"
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-amber-900 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="shuffleQuestions"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="rounded text-amber-700 focus:ring-amber-500 h-4 w-4 border-amber-300"
            />
            <label htmlFor="shuffleQuestions" className="text-xs font-semibold text-amber-800 uppercase cursor-pointer">
              Xáo trộn câu hỏi khi hiển thị
            </label>
          </div>

          {/* QUESTIONS LIST BUILDER */}
          <div className="border-t border-amber-200 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-850">
                Danh sách câu hỏi ({questions.length})
              </h3>
              <button
                type="button"
                onClick={addQuestion}
                className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
              >
                + Thêm câu hỏi
              </button>
            </div>

            <div className="space-y-6">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="p-4 rounded-xl border border-amber-200 bg-amber-50/20 space-y-3 relative">
                  <div className="flex justify-between items-center border-b border-amber-100 pb-2">
                    <span className="text-xs font-bold text-amber-900 uppercase">Câu hỏi #{qIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIdx)}
                      className="text-red-500 hover:text-red-700 text-xs font-bold"
                    >
                      Xóa câu hỏi
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-800 mb-1">NỘI DUNG CÂU HỎI</label>
                    <textarea
                      value={q.question}
                      onChange={(e) => updateQuestionField(qIdx, "question", e.target.value)}
                      rows={2}
                      className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs text-amber-955 focus:outline-none"
                      placeholder="Nhập câu hỏi..."
                    />
                  </div>

                  {/* Question Image */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-amber-800">Ảnh đính kèm câu hỏi (Tùy chọn)</label>
                    <CustomFileInput
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleQuestionImageUpload(qIdx, file);
                      }}
                      fileCount={q.image ? 1 : 0}
                      disabled={uploadingImageIdx === qIdx}
                    />
                    {uploadingImageIdx === qIdx && <p className="text-[10px] text-amber-600 italic">Đang tải ảnh...</p>}
                    {q.image && <img src={q.image} className="w-24 h-16 object-cover rounded border" alt="q-img" />}
                  </div>

                  {/* Options management */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-[11px] font-bold text-amber-800">CÁC PHƯƠNG ÁN TRẢ LỜI (TỐI THIỂU 2 - TỐI ĐA 6)</label>
                      <button
                        type="button"
                        onClick={() => addOption(qIdx)}
                        disabled={q.options.length >= 6}
                        className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-0.5 rounded border border-amber-200 disabled:opacity-40"
                      >
                        + Thêm đáp án
                      </button>
                    </div>

                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex gap-2 items-center">
                          <input
                            type="radio"
                            name={`correct-option-${qIdx}`}
                            checked={q.correctIndex === optIdx}
                            onChange={() => updateQuestionField(qIdx, "correctIndex", optIdx)}
                            className="text-amber-700 focus:ring-amber-500 h-4 w-4 border-amber-300"
                            title="Chọn làm đáp án đúng"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                            placeholder={`Đáp án ${optIdx + 1}`}
                            className="flex-1 rounded border border-amber-200 bg-white px-2 py-1 text-xs text-amber-950 focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={q.options.length <= 2}
                            onClick={() => removeOption(qIdx, optIdx)}
                            className="text-red-500 hover:text-red-700 text-xs disabled:opacity-30"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-800 mb-1">GIẢI THÍCH ĐÁP ÁN ĐÚNG</label>
                    <textarea
                      value={q.explanation}
                      onChange={(e) => updateQuestionField(qIdx, "explanation", e.target.value)}
                      rows={2}
                      className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs text-amber-955 focus:outline-none"
                      placeholder="Vì sao đáp án được chọn là chính xác?"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-amber-100 p-4 flex gap-3 shrink-0 bg-white">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : formMode === "create" ? "Tạo Quiz" : "Cập nhật Quiz"}
          </button>
          {formMode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              Xóa Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
