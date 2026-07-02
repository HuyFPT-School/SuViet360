"use client";

import { useState } from "react";
import type { BlogPost, BlogReport } from "@/types/blog";
import { Card, SectionHeader, inputClass } from "@/components/staff/helpers";

type Props = {
  posts: BlogPost[];
  reports: BlogReport[];
  loading: boolean;
  onApprovePost: (id: string) => void;
  onRejectPost: (id: string, feedback: string) => Promise<void>;
  onResolveReport: (id: string, action: "delete" | "dismiss") => void;
};

export default function BlogTab({ posts, reports, loading, onApprovePost, onRejectPost, onResolveReport }: Props) {
  const [rejId, setRejId] = useState<string | null>(null);
  const [rejFb, setRejFb] = useState("");

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejId || !rejFb.trim()) return;
    await onRejectPost(rejId, rejFb.trim());
    setRejId(null); setRejFb("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <SectionHeader title={`Bài chờ duyệt (${posts.length})`}/>
        {loading ? <div className="p-8 text-center text-amber-600">Đang tải...</div> : !posts.length ? <div className="p-8 text-center text-amber-500 italic">Không có bài.</div> : (
          <div className="divide-y divide-amber-100 max-h-[600px] overflow-y-auto">
            {posts.map(p => (
              <div key={p._id} className="p-4 hover:bg-amber-50/30">
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">{p.category}</span>
                <h3 className="font-semibold text-[#3B2F1E] mt-1">{p.title}</h3>
                <p className="text-[11px] text-amber-600">bởi <strong>{p.author.name}</strong> • {new Date(p.createdAt).toLocaleString("vi-VN")}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-3">{p.content}</p>
                {p.images?.length > 0 && <div className="flex gap-1 mt-2">{p.images.map((img: { url: string }, i: number) => <img key={i} src={img.url} className="w-12 h-12 object-cover rounded border"/>)}</div>}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => onApprovePost(p._id)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 rounded font-semibold">✓ Duyệt</button>
                  <button onClick={() => setRejId(p._id)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs px-3 py-1 rounded font-semibold border border-rose-200">✕ Từ chối</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader title={`Báo cáo (${reports.length})`}/>
        {loading ? <div className="p-8 text-center text-amber-600">Đang tải...</div> : !reports.length ? <div className="p-8 text-center text-amber-500 italic">Không có.</div> : (
          <div className="divide-y divide-amber-100 max-h-[600px] overflow-y-auto">
            {reports.map(r => (
              <div key={r._id} className="p-4">
                <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded uppercase">{r.reason}</span>
                <span className="ml-2 text-xs text-amber-600">bởi <strong>{r.reporter.name}</strong></span>
                {r.description && <p className="text-xs text-amber-800 italic mt-1">"{r.description}"</p>}
                {r.target && <div className="mt-2 border border-rose-200 bg-rose-50/30 rounded p-2 text-xs"><p className="font-semibold">{r.targetType}: {r.target.title || r.target.content}</p><p className="text-amber-600">Tác giả: {r.target.author?.name || "?"}</p></div>}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => onResolveReport(r._id, "dismiss")} className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded font-semibold">Bỏ qua</button>
                  {r.target && <button onClick={() => onResolveReport(r._id, "delete")} className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded font-semibold">Xóa ND</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Reject Modal */}
      {rejId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="bg-[#FFFBF2] border-2 border-amber-700 rounded-2xl p-6 w-[90%] max-w-md shadow-2xl">
            <h3 className="font-display font-bold text-lg text-[#3B2F1E] mb-4">Từ chối bài viết</h3>
            <form onSubmit={handleReject}>
              <textarea required value={rejFb} onChange={e => setRejFb(e.target.value)} className={inputClass + " min-h-[80px]"} placeholder="Lý do từ chối..."/>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => { setRejId(null); setRejFb(""); }} className="px-4 py-2 text-sm font-semibold text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50">Hủy</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700">Gửi từ chối</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
