"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { useAppSelector } from "@/store";

type Tileset = { name: string; imageUrl: string };
type SpriteFrame = { key: string; frame: number; imageUrl: string };
type LessonGame = {
  tilemapJsonUrl: string;
  tilesets: Tileset[];
  character: { animations: Record<string, SpriteFrame[]> };
  spawnPoint: { x: number; y: number };
};
type Lesson = {
  _id: string;
  title: string;
  content: string;
  game: LessonGame;
  createdAt: string;
};

export default function LessonsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [unlockedLessons, setUnlockedLessons] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch all lessons on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const lessonsRes = await api.get<{ success: boolean; lessons: Lesson[] }>("/lessons");
        setLessons(lessonsRes.data.lessons);

        // If student is logged in, fetch their progress dashboard
        if (user && user.role === "student") {
          const progressRes = await api.get<{ success: boolean; data: { unlockedLessons: string[] } }>(
            "/progress/dashboard"
          );
          setUnlockedLessons(progressRes.data.data.unlockedLessons || []);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Fetch single lesson when selected
  const handleSelect = async (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedLesson(null);
      return;
    }
    setSelectedId(id);
    setSelectedLesson(null);
    try {
      const res = await api.get<{ success: boolean; lesson: Lesson }>(
        `/lessons/${id}`
      );
      setSelectedLesson(res.data.lesson);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <section className="px-6 py-12">
        <p className="text-center text-amber-800 text-lg">
          Đang tải danh sách bài học...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="px-6 py-12">
        <p className="text-center text-red-600">Lỗi: {error}</p>
      </section>
    );
  }

  return (
    <section className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-amber-900 mb-2">
        📚 Danh Sách Bài Học
      </h1>
      <p className="text-amber-700 mb-8">
        {lessons.length} bài học — nhấn vào để xem chi tiết
      </p>

      {/* ── Lesson list ── */}
      <div className="space-y-4">
        {lessons.map((lesson) => {
          const isStudent = user?.role === "student";
          const isLocked = isStudent && unlockedLessons.length > 0 && !unlockedLessons.includes(lesson._id);

          return (
            <div key={lesson._id}>
              <button
                type="button"
                onClick={() => handleSelect(lesson._id)}
                className={`w-full text-left rounded-xl border-2 p-5 transition-all duration-200 ${
                  isLocked ? "opacity-65 bg-amber-50/20" : "bg-white"
                } ${
                  selectedId === lesson._id
                    ? "border-amber-500 bg-amber-50 shadow-md"
                    : "border-amber-200/60 hover:border-amber-400 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-semibold text-amber-950 flex items-center gap-2">
                    {isLocked && <span>🔒</span>}
                    {lesson.title}
                  </span>
                  <div className="flex items-center gap-3">
                    {isLocked ? (
                      <span
                        className="rounded-lg bg-gray-400 px-4 py-1.5 text-sm font-medium text-white cursor-not-allowed select-none"
                        onClick={(e) => e.stopPropagation()}
                        title="Hãy hoàn thành bài học trước đó để mở khóa!"
                      >
                        Khóa
                      </span>
                    ) : (
                      <Link
                        href={`/game?id=${lesson._id}`}
                        className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        🎮 Chơi
                      </Link>
                    )}
                    <span className="text-amber-500 text-xl">
                      {selectedId === lesson._id ? "▲" : "▼"}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-sm text-amber-700 line-clamp-2">
                  {lesson.content}
                </p>
              </button>

            {/* ── Detail panel ── */}
            {selectedId === lesson._id && (
              <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50/50 p-6 space-y-4">
                {selectedLesson ? (
                  <DetailContent lesson={selectedLesson} />
                ) : (
                  <p className="text-amber-600 text-sm">Đang tải...</p>
                )}
              </div>
            )}
          </div>
          );
        })}
      </div>

      {lessons.length === 0 && (
        <p className="text-center text-amber-600">
          Chưa có bài học nào. Hãy tạo bài học mới từ Admin API.
        </p>
      )}
    </section>
  );
}

/* ─── Detail sub-component ─── */
function DetailContent({ lesson }: { lesson: Lesson }) {
  const { game } = lesson;

  return (
    <>
      {/* Meta */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-amber-500 font-medium">ID:</span>{" "}
          <code className="text-xs text-amber-700">{lesson._id}</code>
        </div>
        <div>
          <span className="text-amber-500 font-medium">Spawn:</span>{" "}
          <span className="text-amber-800">
            ({game.spawnPoint.x}, {game.spawnPoint.y})
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-amber-500 font-medium">Nội dung:</span>
          <p className="text-amber-800 mt-0.5">{lesson.content}</p>
        </div>
      </div>

      {/* Tilemap JSON URL */}
      <div>
        <span className="text-amber-500 font-medium text-sm">
          🗺️ Tilemap JSON:
        </span>
        <a
          href={game.tilemapJsonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 text-xs text-blue-600 underline break-all"
        >
          {game.tilemapJsonUrl}
        </a>
      </div>

      {/* Tilesets */}
      <div>
        <span className="text-amber-500 font-medium text-sm">🖼️ Tilesets:</span>
        <div className="mt-1 flex flex-wrap gap-3">
          {game.tilesets.map((ts) => (
            <div
              key={ts.name}
              className="rounded-lg border border-amber-200 bg-white p-2 text-center"
            >
              <img
                src={ts.imageUrl}
                alt={ts.name}
                className="h-20 w-auto object-contain mx-auto"
              />
              <span className="block text-xs text-amber-700 mt-1">
                {ts.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Character animations */}
      <div>
        <span className="text-amber-500 font-medium text-sm">
          🎮 Animations:
        </span>
        {Object.keys(game.character.animations).length === 0 ? (
          <p className="text-xs text-amber-400 mt-1">
            Chưa có animation nhân vật
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            {Object.entries(game.character.animations).map(
              ([animName, frames]) => (
                <div key={animName}>
                  <span className="text-xs font-semibold text-amber-800 uppercase">
                    {animName}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {frames.map((f) => (
                      <div
                        key={f.key}
                        className="rounded border border-amber-200 bg-white p-1.5 text-center"
                      >
                        <img
                          src={f.imageUrl}
                          alt={f.key}
                          className="h-12 w-auto object-contain mx-auto"
                        />
                        <span className="block text-[10px] text-amber-600">
                          {f.key}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </>
  );
}
