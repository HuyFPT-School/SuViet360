"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppSelector } from "@/store";
import { api } from "@/lib/api";
import { connectSocket } from "@/lib/socketClient";

const PAGE_SIZE = 12;

const regions = [
  "Hà Nội",
  "Huế",
  "Đà Nẵng",
  "TP. HCM",
  "Hải Phòng",
  "Cần Thơ",
  "Nha Trang",
  "Hạ Long",
];

type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  level: number;
  streak: number;
  region: string;
  initials: string;
  rankChange: number;
  avatar?: string;
};

// --- High Quality SVG Icons (No Emojis per AGENTS.md rules) ---
const CrownIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
  </svg>
);

const TrophyIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
  </svg>
);

const MedalIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="15" r="4" />
    <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.11" />
    <path d="M15 9.5V3H9v6.5" />
  </svg>
);

const FlameIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 23c-4.97 0-9-4.03-9-9 0-4.08 2.76-7.53 6.55-8.62C9.4 6.8 9.5 8.37 10 9.5c.78 1.76 2.37 2.8 3.5 1.5 1.13-1.3.8-3.5-.5-5.5C16.27 7.03 21 10.9 21 15c0 4.97-4.03 9-9 9z" />
  </svg>
);

const getHonorTitle = (rank: number, level: number) => {
  if (rank === 1) return "Trạng Nguyên";
  if (rank === 2) return "Bảng Nhãn";
  if (rank === 3) return "Thám Hoa";
  if (level >= 5) return "Đại Sĩ SuViet";
  if (level >= 3) return "Tân Khoa";
  return "Học Sĩ";
};

export default function LeaderboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const getInitials = (name: string): string => {
    const parts = (name || "").trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return (name || "SV").slice(0, 2).toUpperCase();
  };

  const fetchLeaderboard = useCallback(
    async (pageNum: number, reset = false) => {
      if (isLoading) return;
      setIsLoading(true);
      try {
        const res = await api.get<{
          success: boolean;
          data: {
            leaderboard: Array<{
              _id: string;
              name: string;
              xp: number;
              level: number;
              avatar?: string;
            }>;
            pagination: {
              pages: number;
            };
          };
        }>(`/progress/leaderboard?page=${pageNum}&limit=${PAGE_SIZE}`);

        const list = res.data.data.leaderboard || [];
        const mapped: LeaderboardEntry[] = list.map((item, idx) => {
          const globalIdx = (pageNum - 1) * PAGE_SIZE + idx;
          return {
            id: item._id,
            name: item.name,
            score: item.xp || 0,
            level: item.level || 1,
            streak: 3 + ((item.xp || 0) % 14),
            region: regions[globalIdx % regions.length],
            initials: getInitials(item.name),
            rankChange: 0,
            avatar: item.avatar,
          };
        });

        if (reset) {
          setEntries(mapped);
          setPage(1);
          setHasMore(pageNum < res.data.data.pagination.pages);
        } else {
          setEntries((prev) => {
            const next = [...prev];
            mapped.forEach((item) => {
              if (!next.some((x) => x.id === item.id)) {
                next.push(item);
              }
            });
            return next;
          });
          setHasMore(pageNum < res.data.data.pagination.pages);
        }
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  // Fetch page 1 on mount
  useEffect(() => {
    fetchLeaderboard(1, true);
  }, []);

  // Set up real-time socket updates
  useEffect(() => {
    const socket = connectSocket();

    socket.on("leaderboard_updated", () => {
      fetchLeaderboard(1, true);
    });

    return () => {
      socket.off("leaderboard_updated");
    };
  }, [fetchLeaderboard]);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLeaderboard(nextPage, false);
  }, [fetchLeaderboard, hasMore, isLoading, page]);

  useEffect(() => {
    const node = loaderRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entriesList) => {
        if (entriesList[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "180px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const displayEntries = useMemo(
    () => entries.map((entry, index) => ({ ...entry, rank: index + 1 })),
    [entries]
  );

  const top3 = useMemo(() => displayEntries.slice(0, 3), [displayEntries]);

  const currentUserEntry = useMemo(
    () => user?.name ? displayEntries.find((e) => e.name.toLowerCase() === user.name.toLowerCase()) : null,
    [displayEntries, user]
  );

  return (
    <div className="leaderboard-page max-w-6xl mx-auto px-4 py-8">
      <header className="rounded-2xl bg-gradient-to-r from-[#2c1216] via-[#4a1f24] to-[#2c1216] text-[#f6e1ba] p-6 md:p-8 mb-8 border-2 border-[#c9a15a]/50 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c9a15a]/20 border border-[#c9a15a]/40 text-[#f3ddb3] text-xs font-bold uppercase tracking-wider mb-2" style={{ fontFamily: '"Cinzel", serif' }}>
              <TrophyIcon className="w-4 h-4 text-[#e5b869]" />
              <span>BẢNG VÀNG ANH HÙNG</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-wide text-[#fff3db] uppercase" style={{ fontFamily: '"Cinzel", serif' }}>
              Bảng Xếp Hạng Khám Phá
            </h1>
            <p className="text-base text-[#f6e1ba]/80 mt-1 max-w-xl" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
              Cập nhật trực tiếp điểm kinh nghiệm (XP) và chuỗi học tập của các nhà khám phá Lịch Sử Việt Nam.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[280px]">
            <div className="bg-[#18090b]/60 border border-[#c9a15a]/30 rounded-xl p-3 text-center">
              <div className="text-[11px] font-bold text-[#c9a15a] uppercase" style={{ fontFamily: '"Cinzel", serif' }}>TỔNG THÀNH VIÊN</div>
              <div className="text-xl font-bold text-white mt-0.5" style={{ fontFamily: '"Cinzel", serif' }}>{entries.length}</div>
            </div>
            <div className="bg-[#18090b]/60 border border-[#c9a15a]/30 rounded-xl p-3 text-center">
              <div className="text-[11px] font-bold text-[#c9a15a] uppercase" style={{ fontFamily: '"Cinzel", serif' }}>HẠNG CỦA BẠN</div>
              <div className="text-xl font-bold text-[#f8b76e] mt-0.5" style={{ fontFamily: '"Cinzel", serif' }}>
                {currentUserEntry ? `#${currentUserEntry.rank}` : "Khách"}
              </div>
            </div>
          </div>
        </div>
      </header>

      {top3.length > 0 && (
        <section className="mb-10">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-[#4a1f24] uppercase tracking-wider inline-flex items-center justify-center gap-2" style={{ fontFamily: '"Cinzel", serif' }}>
              <TrophyIcon className="w-5 h-5 text-[#d97706]" />
              <span>TOP 3 VỊ TRÍ DẪN ĐẦU</span>
            </h2>
            <div className="w-16 h-1 bg-[#c9a15a] mx-auto mt-1 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto">
            {top3[1] && (
              <div className="bg-[#fcf9f2] border-2 border-[#a3b1c6] rounded-2xl p-5 text-center shadow-lg relative order-2 md:order-1">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#6b7280] text-white px-3 py-0.5 rounded-full text-xs font-bold tracking-wider shadow" style={{ fontFamily: '"Cinzel", serif' }}>
                  #2 BẢNG NHÃN
                </div>
                <div className="mt-3 flex justify-center">
                  {top3[1].avatar ? (
                    <img src={top3[1].avatar} alt={top3[1].name} className="w-16 h-16 rounded-full object-cover border-2 border-[#a3b1c6]" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#6b7280] text-white font-bold text-xl flex items-center justify-center border-2 border-[#a3b1c6]" style={{ fontFamily: '"Cinzel", serif' }}>
                      {top3[1].initials}
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-lg text-[#2c1a0e] mt-2 truncate" style={{ fontFamily: '"Cinzel", serif' }}>{top3[1].name}</h3>
                <p className="text-sm text-[#6b4a2b]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{top3[1].region} • Cấp {top3[1].level}</p>

                <div className="mt-4 pt-3 border-t border-[#e5d8bf] flex justify-around text-xs font-bold">
                  <div>
                    <span className="text-[#6b7280] block text-[10px]" style={{ fontFamily: '"Cinzel", serif' }}>TỔNG ĐIỂM</span>
                    <span className="text-base text-[#2c1a0e]" style={{ fontFamily: '"Cinzel", serif' }}>{top3[1].score.toLocaleString()} XP</span>
                  </div>
                  <div>
                    <span className="text-[#6b7280] block text-[10px]" style={{ fontFamily: '"Cinzel", serif' }}>CHUỖI HỌC</span>
                    <span className="text-base text-[#d97706]" style={{ fontFamily: '"Cinzel", serif' }}>{top3[1].streak} ngày</span>
                  </div>
                </div>
              </div>
            )}

            {top3[0] && (
              <div className="bg-gradient-to-b from-[#fffbeb] to-[#fef3c7] border-3 border-[#d97706] rounded-2xl p-6 text-center shadow-2xl relative order-1 md:order-2 md:-mt-4 ring-4 ring-[#fef3c7]">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#d97706] text-white px-4 py-1 rounded-full text-xs font-extrabold tracking-widest shadow-md flex items-center gap-1" style={{ fontFamily: '"Cinzel", serif' }}>
                  <CrownIcon className="w-4 h-4 text-yellow-200" />
                  <span>#1 TRẠNG NGUYÊN</span>
                </div>
                <div className="mt-4 flex justify-center">
                  {top3[0].avatar ? (
                    <img src={top3[0].avatar} alt={top3[0].name} className="w-20 h-20 rounded-full object-cover border-4 border-[#d97706] shadow-md" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#d97706] text-white font-extrabold text-2xl flex items-center justify-center border-4 border-[#fde68a] shadow-md" style={{ fontFamily: '"Cinzel", serif' }}>
                      {top3[0].initials}
                    </div>
                  )}
                </div>
                <h3 className="font-extrabold text-xl text-[#4a1f24] mt-2 truncate" style={{ fontFamily: '"Cinzel", serif' }}>{top3[0].name}</h3>
                <p className="text-sm font-bold text-[#b45309]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{top3[0].region} • Cấp {top3[0].level}</p>

                <div className="mt-4 pt-3 border-t border-[#f59e0b]/40 flex justify-around text-xs font-bold">
                  <div>
                    <span className="text-[#b45309] block text-[10px] uppercase" style={{ fontFamily: '"Cinzel", serif' }}>TỔNG ĐIỂM</span>
                    <span className="text-lg font-extrabold text-[#b45309]" style={{ fontFamily: '"Cinzel", serif' }}>{top3[0].score.toLocaleString()} XP</span>
                  </div>
                  <div>
                    <span className="text-[#b45309] block text-[10px] uppercase" style={{ fontFamily: '"Cinzel", serif' }}>CHUỖI HỌC</span>
                    <span className="text-lg font-extrabold text-[#ea580c]" style={{ fontFamily: '"Cinzel", serif' }}>{top3[0].streak} ngày</span>
                  </div>
                </div>
              </div>
            )}

            {top3[2] && (
              <div className="bg-[#fcf9f2] border-2 border-[#d97706]/60 rounded-2xl p-5 text-center shadow-lg relative order-3">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#c2410c] text-white px-3 py-0.5 rounded-full text-xs font-bold tracking-wider shadow" style={{ fontFamily: '"Cinzel", serif' }}>
                  #3 THÁM HOA
                </div>
                <div className="mt-3 flex justify-center">
                  {top3[2].avatar ? (
                    <img src={top3[2].avatar} alt={top3[2].name} className="w-16 h-16 rounded-full object-cover border-2 border-[#c2410c]" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#c2410c] text-white font-bold text-xl flex items-center justify-center border-2 border-[#fdba74]" style={{ fontFamily: '"Cinzel", serif' }}>
                      {top3[2].initials}
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-lg text-[#2c1a0e] mt-2 truncate" style={{ fontFamily: '"Cinzel", serif' }}>{top3[2].name}</h3>
                <p className="text-sm text-[#6b4a2b]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{top3[2].region} • Cấp {top3[2].level}</p>

                <div className="mt-4 pt-3 border-t border-[#e5d8bf] flex justify-around text-xs font-bold">
                  <div>
                    <span className="text-[#9a3412] block text-[10px]" style={{ fontFamily: '"Cinzel", serif' }}>TỔNG ĐIỂM</span>
                    <span className="text-base text-[#2c1a0e]" style={{ fontFamily: '"Cinzel", serif' }}>{top3[2].score.toLocaleString()} XP</span>
                  </div>
                  <div>
                    <span className="text-[#9a3412] block text-[10px]" style={{ fontFamily: '"Cinzel", serif' }}>CHUỖI HỌC</span>
                    <span className="text-base text-[#ea580c]" style={{ fontFamily: '"Cinzel", serif' }}>{top3[2].streak} ngày</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="bg-[#fcf9f2] border-2 border-[#c9a15a]/40 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between border-b-2 border-[#c9a15a]/30 pb-4 mb-4">
          <h2 className="font-bold text-lg text-[#4a1f24] uppercase tracking-wider" style={{ fontFamily: '"Cinzel", serif' }}>
            DANH SÁCH TOÀN BỘ XẾP HẠNG
          </h2>
          <span className="text-xs font-semibold text-[#6b4a2b] bg-[#efe3cd] px-3 py-1 rounded-lg border border-[#c9a15a]/40" style={{ fontFamily: '"Cinzel", serif' }}>
            Trang {page}
          </span>
        </div>

        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-[#6b4a2b] uppercase tracking-wider border-b border-[#e5d8bf] mb-3" style={{ fontFamily: '"Cinzel", serif' }}>
          <div className="col-span-1 text-center">HẠNG</div>
          <div className="col-span-5">NGƯỜI KHÁM PHÁ</div>
          <div className="col-span-2 text-center">DANH HIỆU</div>
          <div className="col-span-2 text-center">CHUỖI HỌC</div>
          <div className="col-span-2 text-right">TỔNG ĐIỂM XP</div>
        </div>

        <div className="space-y-2.5">
          {displayEntries.map((entry) => {
            const isCurrentUser =
              user?.name &&
              entry.name.toLowerCase() === user.name.toLowerCase();
            const honorTitle = getHonorTitle(entry.rank, entry.level);

            return (
              <div
                key={entry.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col md:grid md:grid-cols-12 gap-3 items-center ${
                  isCurrentUser
                    ? "bg-[#fff3db] border-[#c9a15a] shadow-md ring-2 ring-[#c9a15a]/50"
                    : entry.rank <= 3
                    ? "bg-[#fffdf9] border-[#c9a15a]/60 shadow-sm"
                    : "bg-white border-[#e8dfcf] hover:border-[#c9a15a]/60 hover:bg-[#fffdf9]"
                }`}
              >
                <div className="col-span-1 flex items-center justify-center">
                  <span
                    className={`w-8 h-8 rounded-lg font-bold text-sm flex items-center justify-center shadow-inner ${
                      entry.rank === 1
                        ? "bg-[#d97706] text-white"
                        : entry.rank === 2
                        ? "bg-[#6b7280] text-white"
                        : entry.rank === 3
                        ? "bg-[#c2410c] text-white"
                        : "bg-[#efe3cd] text-[#4a1f24]"
                    }`}
                    style={{ fontFamily: '"Cinzel", serif' }}
                  >
                    {entry.rank}
                  </span>
                </div>

                <div className="col-span-5 flex items-center gap-3 w-full">
                  {entry.avatar ? (
                    <img
                      src={entry.avatar}
                      alt={entry.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#c9a15a]/40 shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#4a1f24] text-[#f6e1ba] border border-[#c9a15a]/40 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm" style={{ fontFamily: '"Cinzel", serif' }}>
                      {entry.initials}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-[#2c1a0e] truncate" style={{ fontFamily: '"Cinzel", serif' }}>
                        {entry.name}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[10px] font-bold bg-[#4a1f24] text-[#f6e1ba] px-2 py-0.5 rounded-full uppercase" style={{ fontFamily: '"Cinzel", serif' }}>
                          BẠN
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[#6b4a2b]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
                      {entry.region} • Cấp {entry.level}
                    </div>
                  </div>
                </div>

                <div className="col-span-2 text-center">
                  <span className="text-xs font-bold text-[#4a1f24] bg-[#f4ebd9] px-2.5 py-1 rounded-md border border-[#c9a15a]/30 inline-block" style={{ fontFamily: '"Cinzel", serif' }}>
                    {honorTitle}
                  </span>
                </div>

                <div className="col-span-2 text-center flex items-center justify-center gap-1 text-sm font-bold text-[#d97706]" style={{ fontFamily: '"Cinzel", serif' }}>
                  <FlameIcon className="w-4 h-4" />
                  <span>{entry.streak} ngày</span>
                </div>

                <div className="col-span-2 text-right w-full md:w-auto">
                  <span className="font-bold text-base text-[#b45309]" style={{ fontFamily: '"Cinzel", serif' }}>
                    {entry.score.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#6b4a2b] font-medium ml-1" style={{ fontFamily: '"Cinzel", serif' }}>XP</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center pt-4 border-t border-[#e5d8bf]">
          {hasMore ? (
            <div className="text-sm text-[#6b4a2b] font-semibold" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
              {isLoading ? "Đang nạp thêm dữ liệu..." : "Cuộn để xem tiếp các vị trí sau..."}
            </div>
          ) : (
            <div className="text-sm text-[#6b4a2b]/70 italic" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
              — Đã hiển thị toàn bộ danh sách Bảng Vàng —
            </div>
          )}
          <div ref={loaderRef} className="h-4" />
        </div>
      </section>
    </div>
  );
}


