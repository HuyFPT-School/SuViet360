"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import type { LessonGameData } from "@/components/PhaserGame";

const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => (
    <p style={{ textAlign: "center", padding: 40, color: "#8B6914" }}>
      Đang tải game...
    </p>
  ),
});

function GameContent() {
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("id");

  const [gameData, setGameData] = useState<LessonGameData | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!lessonId) {
      // No ID: fetch first lesson
      api
        .get<{ success: boolean; lessons: { _id: string; title: string; game: LessonGameData }[] }>("/lessons")
        .then((res) => {
          if (res.data.lessons.length > 0) {
            const first = res.data.lessons[0];
            setTitle(first.title);
            setGameData(first.game);
          } else {
            setError("Chưa có bài học nào.");
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
      return;
    }

    api
      .get<{ success: boolean; lesson: { title: string; game: LessonGameData } }>(
        `/lessons/${lessonId}`
      )
      .then((res) => {
        setTitle(res.data.lesson.title);
        setGameData(res.data.lesson.game);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [lessonId]);

  if (loading) {
    return (
      <p style={{ textAlign: "center", padding: 40, color: "#8B6914" }}>
        Đang tải dữ liệu bài học...
      </p>
    );
  }

  if (error) {
    return (
      <p style={{ textAlign: "center", padding: 40, color: "#cc3333" }}>
        Lỗi: {error}
      </p>
    );
  }

  if (!gameData) {
    return (
      <p style={{ textAlign: "center", padding: 40, color: "#8B6914" }}>
        Không có dữ liệu game.
      </p>
    );
  }

  return (
    <section style={{ padding: "24px 16px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>{title}</h1>
      <p style={{ fontSize: 13, color: "#8B6914", marginBottom: 16 }}>
        Sử dụng phím ↑↓←→ để di chuyển nhân vật
      </p>
      <PhaserGame lessonGame={gameData} />
    </section>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <p style={{ textAlign: "center", padding: 40, color: "#8B6914" }}>
          Đang tải...
        </p>
      }
    >
      <GameContent />
    </Suspense>
  );
}
