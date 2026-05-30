"use client";

import dynamic from "next/dynamic";

const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => <p>Dang tai game...</p>,
});

export default function GamePage() {
  return (
    <section style={{ padding: "24px 16px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Game</h1>
      <PhaserGame />
    </section>
  );
}
