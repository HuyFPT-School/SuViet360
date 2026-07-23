import React, { useState, useEffect } from "react";
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-semibold text-lg text-amber-900 tracking-wider uppercase" style={{ fontFamily: "Cinzel, serif" }}>
            Theo dõi Yêu cầu bài học (Pro)
          </h3>
          <p className="text-xs text-amber-800">
            Giám sát các yêu cầu soạn thảo bài học từ học viên Pro và trạng thái xử lý của Giáo viên
          </p>
        </div>
        <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded text-xs font-bold border border-amber-200">
          {pendingRequestsCount} Yêu cầu
        </span>
      </div>

      {loadingRequests ? (
        <div className="text-center py-10 text-amber-800 font-semibold italic">
          Đang tải danh sách yêu cầu bài học...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontSize: "14px" }}>
            <thead>
              <tr className="border-b-2 border-amber-700 text-amber-900 font-bold uppercase" style={{ fontFamily: "Cinzel, serif", fontSize: "12px" }}>
                <th className="py-2.5 px-3">Học sinh</th>
                <th className="py-2.5 px-3">Chi tiết yêu cầu</th>
                <th className="py-2.5 px-3">Thời kỳ</th>
                <th className="py-2.5 px-3">Giáo viên phụ trách</th>
                <th className="py-2.5 px-3">Yêu cầu Game</th>
                <th className="py-2.5 px-3">Trạng thái</th>
                <th className="py-2.5 px-3">Ngày gửi</th>
              </tr>
            </thead>
            <tbody>
              {lessonRequests.filter((req) => req.needsGameCreation).map((req) => (
                <tr key={req._id} className="border-b border-amber-200 hover:bg-amber-50/50">
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
                            className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold py-1 px-1.5 rounded transition block text-center"
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
              {lessonRequests.filter((req) => req.needsGameCreation).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-stone-500 italic">
                    Chưa có yêu cầu bài học nào trên hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
