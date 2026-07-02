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
      // Refetch page 1 when someone completes a task and gains XP
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

  return (
    <div className="leaderboard-page">
      <header className="leaderboard-hero">
        <div className="leaderboard-hero__content">
          <span className="leaderboard-pill">Bảng xếp hạng trực tuyến</span>
          <h1 className="leaderboard-title">Thứ hạng Nhà Khám Phá</h1>
          <p className="leaderboard-subtitle">
            Cập nhật theo thời gian thực, đánh giá theo XP và chuỗi thành tích.
          </p>
        </div>
        <div className="leaderboard-hero__stats">
          <div className="hero-stat">
            <span className="hero-stat__label">Người tham gia</span>
            <span className="hero-stat__value">{entries.length}</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat__label">Trạng thái</span>
            <span className="hero-stat__value hero-stat__live">Trực tiếp</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat__label">Người dùng hiện tại</span>
            <span className="hero-stat__value">{user?.name ?? "Khách"}</span>
          </div>
        </div>
      </header>

      <section className="leaderboard-panel">
        <div className="leaderboard-panel__header">
          <h2>Bảng xếp hạng</h2>
        </div>

        <div className="leaderboard-list">
          {displayEntries.map((entry) => {
            const isTop = entry.rank <= 3;
            const isCurrentUser =
              user?.name &&
              entry.name.toLowerCase() === user.name.toLowerCase();
            const trend =
              entry.rankChange > 0
                ? "up"
                : entry.rankChange < 0
                  ? "down"
                  : "steady";

            return (
              <div
                key={entry.id}
                className={`leaderboard-row${isTop ? " leaderboard-row--top" : ""}${
                  isCurrentUser ? " leaderboard-row--me" : ""
                }`}
              >
                <div className="leaderboard-rank">
                  <span className={`rank-badge rank-badge--${entry.rank}`}>
                    {entry.rank}
                  </span>
                  <span className={`rank-trend rank-trend--${trend}`}>
                    {entry.rankChange === 0
                      ? "·"
                      : entry.rankChange > 0
                        ? `+${entry.rankChange}`
                        : `${entry.rankChange}`}
                  </span>
                </div>

                <div className="leaderboard-user">
                  {entry.avatar ? (
                    <img
                      src={entry.avatar}
                      alt={entry.name}
                      className="w-10 h-10 rounded-full object-cover border border-[#c9a15a]/30"
                    />
                  ) : (
                    <div className="avatar-chip">{entry.initials}</div>
                  )}
                  <div>
                    <div className="leaderboard-name">{entry.name}</div>
                    <div className="leaderboard-meta">
                      {entry.region} · Cấp {entry.level}
                    </div>
                  </div>
                </div>

                <div className="leaderboard-score">
                  <span className="score-label">XP</span>
                  <span className="score-value">
                    {entry.score.toLocaleString()}
                  </span>
                </div>

                <div className="leaderboard-streak">
                  <span className="streak-label">Chuỗi</span>
                  <span className="streak-value">{entry.streak} ngày</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="leaderboard-footer">
          {hasMore ? (
            <div className="leaderboard-loading">
              {isLoading ? "Đang tải..." : "Cuộn để tải thêm"}
            </div>
          ) : (
            <div className="leaderboard-loading">Đã tải hết</div>
          )}
          <div ref={loaderRef} className="leaderboard-sentinel" />
        </div>
      </section>
    </div>
  );
}
