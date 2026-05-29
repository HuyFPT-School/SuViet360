"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppSelector } from "@/store";

const PAGE_SIZE = 12;
const MAX_ENTRIES = 120;

const nameSeeds = [
  "An",
  "Bình",
  "Chi",
  "Đức",
  "Hà",
  "Huy",
  "Khánh",
  "Linh",
  "Minh",
  "Nam",
  "Ngọc",
  "Phúc",
  "Quân",
  "Sơn",
  "Thảo",
  "Trang",
  "Tuấn",
  "Vy",
  "Yến",
];

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
};

const createEntry = (rank: number): LeaderboardEntry => {
  const seed = (rank * 7) % nameSeeds.length;
  const region = regions[rank % regions.length];
  const name = `${nameSeeds[seed]} ${nameSeeds[(seed + 5) % nameSeeds.length]}`;
  const score = 2400 - rank * 11 + (rank % 3) * 7;
  const level = Math.max(1, 18 - Math.floor(rank / 6));
  const streak = 3 + (rank % 14);
  const initials = `${name[0]}${name.split(" ")[1][0]}`.toUpperCase();

  return {
    id: `entry-${rank}`,
    name,
    score,
    level,
    streak,
    region,
    initials,
    rankChange: 0,
  };
};

const createBatch = (offset: number, size: number) =>
  Array.from({ length: size }, (_, index) => createEntry(offset + index + 1));

export default function LeaderboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() =>
    createBatch(0, PAGE_SIZE)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const displayEntries = useMemo(
    () => entries.map((entry, index) => ({ ...entry, rank: index + 1 })),
    [entries]
  );

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    setTimeout(() => {
      setEntries((prev) => {
        const nextBatch = createBatch(prev.length, PAGE_SIZE);
        const next = [...prev, ...nextBatch];
        if (next.length >= MAX_ENTRIES) {
          setHasMore(false);
        }
        return next.slice(0, MAX_ENTRIES);
      });
      setIsLoading(false);
    }, 350);
  }, [hasMore, isLoading]);

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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setEntries((prev) => {
        const oldRank = new Map(
          prev.map((entry, index) => [entry.id, index + 1])
        );
        const next = prev
          .map((entry) => {
            const delta = Math.round((Math.random() - 0.45) * 18);
            return {
              ...entry,
              score: Math.max(0, entry.score + delta),
            };
          })
          .sort((a, b) => b.score - a.score);

        return next.map((entry, index) => ({
          ...entry,
          rankChange: (oldRank.get(entry.id) ?? index + 1) - (index + 1),
        }));
      });
    }, 3500);

    return () => window.clearInterval(interval);
  }, []);

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
                  <div className="avatar-chip">{entry.initials}</div>
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
