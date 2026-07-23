import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";

type LessonRequestsTabProps = {
  onDesignGame: (req: any) => void;
  setMessage: (msg: { type: "error" | "success"; text: string } | null) => void;
  onUpdateCounts?: (requestsCount: number) => void;
};

export default function LessonRequestsTab({
  onDesignGame,
  setMessage,
  onUpdateCounts,
}: LessonRequestsTabProps) {
  const [lessonRequests, setLessonRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

  // Search & Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  const filteredRequests = useMemo(() => {
    const base = lessonRequests.filter((req) => req.needsGameCreation);
    const term = searchQuery.trim().toLowerCase();
    if (!term) return base;
    return base.filter(
      (req) =>
        req.title?.toLowerCase().includes(term) ||
        req.description?.toLowerCase().includes(term) ||
        req.historicalPeriod?.toLowerCase().includes(term) ||
        req.requesterId?.name?.toLowerCase().includes(term) ||
        req.requesterId?.email?.toLowerCase().includes(term)
    );
  }, [lessonRequests, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredRequests.slice(start, start + limit);
  }, [filteredRequests, page, limit]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredRequests.length / limit) || 1;
  }, [filteredRequests, limit]);

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await api.get<{ success: boolean; data: any[] }>("/subscriptions/admin/lesson-requests");
      setLessonRequests(res.data.data);

      if (onUpdateCounts) {
        onUpdateCounts(res.data.data.filter((req) => req.needsGameCreation).length);
      }
    } catch (err) {
      console.error("Error loading requests:", err);
      setMessage({ type: "error", text: "Không thể tải yêu cầu bài học." });
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const pendingRequestsCount = lessonRequests.filter((req) => req.needsGameCreation).length;

  return (
    <div className="bg-[#FFFBF2] border-2 border-amber-700 rounded-xl p-6 shadow-md mt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-semibold text-lg text-amber-900 tracking-wider uppercase" style={{ fontFamily: "Cinzel, serif" }}>
            Theo dõi Yêu cầu bài học (Pro)
          </h3>
          <p className="text-xs text-amber-800">
            Giám sát các yêu cầu soạn thảo bài học từ học viên Pro và trạng thái xử lý của Giáo viên
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-700 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm đề xuất, học viên..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-amber-950 font-medium outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
            />
          </div>
          <span className="bg-amber-100 text-amber-900 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-300 whitespace-nowrap shrink-0">
            {pendingRequestsCount} Yêu cầu
          </span>
        </div>
      </div>

      {loadingRequests ? (
        <div className="text-center py-10 text-amber-800 font-semibold italic">
          Đang tải danh sách yêu cầu bài học...
        </div>
      ) : (
        <div className="border border-amber-200 rounded-xl overflow-hidden flex flex-col justify-between bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-amber-50/70 border-b border-amber-200 text-amber-900 font-bold uppercase" style={{ fontFamily: "Cinzel, serif" }}>
                  <th className="py-3 px-3">Học sinh</th>
                  <th className="py-3 px-3">Chi tiết yêu cầu</th>
                  <th className="py-3 px-3">Thời kỳ</th>
                  <th className="py-3 px-3">Giáo viên phụ trách</th>
                  <th className="py-3 px-3">Yêu cầu Game</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3">Ngày gửi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {paginatedRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-amber-50/50 transition">
                    <td className="py-3 px-3">
                      <strong className="text-amber-950 block">{req.requesterId?.name || "Học viên Pro"}</strong>
                      <span className="text-[10px] text-stone-500">{req.requesterId?.email || ""}</span>
                    </td>
                    <td className="py-3 px-3" style={{ maxWidth: "350px" }}>
                      <strong className="text-amber-900">{req.title}</strong>
                      <p className="text-stone-600 text-xs mt-1 line-clamp-3">{req.description}</p>
                      {req.pedagogicalNotes && (
                        <div className="mt-2 text-sky-700 bg-sky-50 p-2 rounded border border-sky-200 text-xs">
                          <strong>Nhận định sư phạm:</strong> {req.pedagogicalNotes}
                        </div>
                      )}
                      {req.estimatedCompletionDate && (
                        <div className="mt-1 text-stone-500 text-xs">
                          Dự kiến hoàn tất: <strong>{new Date(req.estimatedCompletionDate).toLocaleDateString("vi-VN")}</strong>
                        </div>
                      )}
                      {req.teacherResponse && (
                        <div className="mt-2 text-rose-700 bg-rose-50 p-2 rounded border border-rose-200 text-xs">
                          <strong>Lý do từ chối:</strong> {req.teacherResponse}
                        </div>
                      )}
                      {req.resultPodcastId && (
                        <div className="mt-2 text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200 text-xs">
                          <strong>Podcast xuất bản:</strong> {typeof req.resultPodcastId === "object" ? req.resultPodcastId.title : req.resultPodcastId}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-stone-700">{req.historicalPeriod || "Chưa rõ"}</td>
                    <td className="py-3 px-3">
                      <strong className="text-amber-950 block">{req.assignedTeacherId?.name || "Chưa nhận"}</strong>
                      <span className="text-[10px] text-stone-500">{req.assignedTeacherId?.email || ""}</span>
                    </td>
                    <td className="py-3 px-3">
                      {req.needsGameCreation ? (
                        <div className="flex flex-col gap-1.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-center ${
                            req.gameCreationStatus === "Completed" ? "bg-emerald-100 text-emerald-800" : "bg-purple-100 text-purple-800"
                          }`}>
                            {req.gameCreationStatus === "Completed" ? "Đã thiết kế" : "Cần thiết kế"}
                          </span>
                          {req.gameCreationStatus !== "Completed" && (
                            <button
                              type="button"
                              onClick={() => onDesignGame(req)}
                              className="text-[10px] bg-amber-700 hover:bg-amber-800 text-white font-bold py-1 px-2 rounded transition block text-center cursor-pointer shadow-xs"
                            >
                              Thiết kế ngay
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-stone-400 italic">Không yêu cầu</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === "Pending" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                        req.status === "Accepted" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                        req.status === "InProgress" ? "bg-purple-100 text-purple-800 border border-purple-200" :
                        req.status === "Completed" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                        "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}>
                        {req.status === "Pending" ? "Chờ duyệt" :
                         req.status === "Accepted" ? "Đã nhận" :
                         req.status === "InProgress" ? "Đang soạn" :
                         req.status === "Completed" ? "Hoàn thành" :
                         "Từ chối"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-stone-500 text-xs">
                      {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-stone-500 italic">
                      Chưa có yêu cầu bài học nào trên hệ thống.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION BAR */}
          <div className="p-4 border-t border-amber-200 bg-[#FDF8ED] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold">
            <div className="text-stone-600">
              Hiển thị {filteredRequests.length === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, filteredRequests.length)} trong {filteredRequests.length} nội dung
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#D8C49A] bg-[#FFFDF8] text-[#2A1407] hover:bg-[#F5EBD4] disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setPage(pNum)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    page === pNum
                      ? "bg-[#53270D] text-white border-[#53270D] shadow-xs"
                      : "bg-[#FFFDF8] border-[#D8C49A] text-[#2A1407] hover:bg-[#F5EBD4]"
                  }`}
                >
                  {pNum}
                </button>
              ))}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#D8C49A] bg-[#FFFDF8] text-[#2A1407] hover:bg-[#F5EBD4] disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
              >
                ›
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1 bg-[#FFFDF8] border border-[#D8C49A] rounded-lg text-xs font-bold text-[#2A1407] outline-none cursor-pointer"
              >
                <option value={5}>5 / trang</option>
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
