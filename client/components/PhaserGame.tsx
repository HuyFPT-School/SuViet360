"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";

type FrameDef = { key: string; file: string };

const IDLE_FRAMES: FrameDef[] = [
  { key: "player-idle-0", file: "/Bai15/0.png" },
  { key: "player-idle-1", file: "/Bai15/1.png" },
  { key: "player-idle-2", file: "/Bai15/2.png" },
  { key: "player-idle-3", file: "/Bai15/3.png" },
];
const RUN_FRAMES: FrameDef[] = [
  { key: "player-run-0", file: "/Bai15/4.png" },
  { key: "player-run-1", file: "/Bai15/5.png" },
  { key: "player-run-2", file: "/Bai15/6.png" },
  { key: "player-run-3", file: "/Bai15/7.png" },
  { key: "player-run-4", file: "/Bai15/8.png" },
  { key: "player-run-5", file: "/Bai15/9.png" },
];

const MAP_WIDTH = 1440;
const MAP_HEIGHT = 1088;
const INTERACT_DISTANCE = 80;

export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    class Bai15Scene extends Phaser.Scene {
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      private player!: Phaser.Physics.Matter.Sprite;
      private interactPoints: { cx: number; cy: number; title: string; content: string }[] = [];
      private popupEl: HTMLDivElement | null = null;
      private currentPopup: string | null = null;

      preload() {
        this.load.image("bai15-bg", "/Bai15/Bai15.png");
        this.load.tilemapTiledJSON("bai15-map", "/Bai15/Bai15.json");
        IDLE_FRAMES.forEach((f) => this.load.image(f.key, f.file));
        RUN_FRAMES.forEach((f) => this.load.image(f.key, f.file));
      }

      create() {
        // --- Ảnh nền ---
        this.add.image(0, 0, "bai15-bg").setOrigin(0, 0).setDisplaySize(MAP_WIDTH, MAP_HEIGHT);

        // --- Đọc Object Layer ---
        const map = this.make.tilemap({ key: "bai15-map" });
        const objectLayer = map.getObjectLayer("CollisionsBai15");

        if (objectLayer?.objects?.length) {
          objectLayer.objects.forEach((obj) => {
            const props = (obj as unknown as { properties?: { name: string; value: string }[] }).properties;
            const propValue = props?.[0]?.value ?? null;
            const objName = obj.name ?? "";

            // --- POLYGON thật sự dùng Matter ---
            if (obj.polygon && obj.polygon.length > 0) {
              const pts = obj.polygon as { x: number; y: number }[];

              // Tính centroid để đặt body đúng vị trí
              let cx = 0, cy = 0;
              pts.forEach((p) => { cx += p.x; cy += p.y; });
              cx /= pts.length;
              cy /= pts.length;

              // Vertices relative to centroid
              const vertices = pts.map((p) => ({ x: p.x - cx, y: p.y - cy }));

              const worldX = (obj.x ?? 0) + cx;
              const worldY = (obj.y ?? 0) + cy;

              try {
                const body = this.matter.add.fromVertices(worldX, worldY, vertices, {
                  isStatic: true,
                  friction: 0,
                  frictionStatic: 0,
                  restitution: 0,
                  label: objName || "collision",
                }, true);

                // Lưu interact point nếu có nội dung
                if (propValue && objName) {
                  // Dùng bounding box của polygon để tính center hiển thị
                  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                  pts.forEach((p) => {
                    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
                  });
                  this.interactPoints.push({
                    cx: (obj.x ?? 0) + (minX + maxX) / 2,
                    cy: (obj.y ?? 0) + (minY + maxY) / 2,
                    title: objName.replace(/_/g, " "),
                    content: propValue,
                  });
                }
              } catch {
                // Fallback nếu polygon lỗi (tự giao): dùng bounding box
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                pts.forEach((p) => {
                  minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                  minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
                });
                const w = maxX - minX, h = maxY - minY;
                if (w > 4 && h > 4) {
                  this.matter.add.rectangle(
                    (obj.x ?? 0) + minX + w / 2,
                    (obj.y ?? 0) + minY + h / 2,
                    w, h, { isStatic: true }
                  );
                }
              }
              return;
            }

            // --- RECTANGLE ---
            if (!obj.width || !obj.height) return;
            const rx = (obj.x ?? 0) + obj.width / 2;
            const ry = (obj.y ?? 0) + obj.height / 2;

            this.matter.add.rectangle(rx, ry, obj.width, obj.height, {
              isStatic: true,
              friction: 0,
              frictionStatic: 0,
              restitution: 0,
              label: objName || "collision",
            });

            if (propValue && objName) {
              this.interactPoints.push({
                cx: rx, cy: ry,
                title: objName.replace(/_/g, " "),
                content: propValue,
              });
            }
          });
        }

        // --- Player dùng Matter ---
        this.player = this.matter.add.sprite(MAP_WIDTH / 2, MAP_HEIGHT / 2, IDLE_FRAMES[0].key);
        this.player.setBody({ type: "rectangle", width: 20, height: 20 });
        this.player.setFixedRotation(); // không bị xoay khi va chạm
        this.player.setFriction(0);
        this.player.setFrictionAir(0.3);

        // --- Animations ---
        this.anims.create({
          key: "idle",
          frames: IDLE_FRAMES.map((f) => ({ key: f.key })),
          frameRate: 6, repeat: -1,
        });
        this.anims.create({
          key: "run",
          frames: RUN_FRAMES.map((f) => ({ key: f.key })),
          frameRate: 10, repeat: -1,
        });
        this.player.play("idle");

        // --- World bounds ---
        this.matter.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

        // --- Camera ---
        this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // --- DOM Popup ---
        const parent = this.game.canvas.parentElement;
        if (parent) {
          parent.style.position = "relative";
          const popup = document.createElement("div");
          popup.style.cssText = `
            display: none;
            position: absolute;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            width: 80%;
            max-width: 560px;
            background: rgba(255, 248, 220, 0.97);
            border: 3px solid #8B6914;
            border-radius: 12px;
            padding: 16px 20px;
            font-family: 'Times New Roman', serif;
            font-size: 14px;
            line-height: 1.6;
            color: #3b2000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            z-index: 100;
            pointer-events: none;
          `;
          parent.appendChild(popup);
          this.popupEl = popup;
        }

        // --- Hint ---
        this.add.text(MAP_WIDTH / 2, 20, "Đi gần vật thể để xem thông tin", {
          fontSize: "13px", color: "#ffffff",
          backgroundColor: "#00000066",
          padding: { x: 10, y: 4 },
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10);

        this.cursors = this.input.keyboard!.createCursorKeys();
      }

      update() {
        if (!this.player || !this.cursors) return;

        const speed = 5;
        let vx = 0, vy = 0, moving = false;

        if (this.cursors.left?.isDown)       { vx = -speed; this.player.setFlipX(true);  moving = true; }
        else if (this.cursors.right?.isDown) { vx =  speed; this.player.setFlipX(false); moving = true; }
        if (this.cursors.up?.isDown)         { vy = -speed; moving = true; }
        else if (this.cursors.down?.isDown)  { vy =  speed; moving = true; }

        if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

        this.player.setVelocity(vx, vy);
        this.player.play(moving ? "run" : "idle", true);

        // --- Popup khi đến gần ---
        const px = this.player.x;
        const py = this.player.y;
        let nearest: typeof this.interactPoints[0] | null = null;
        let nearestDist = Infinity;

        this.interactPoints.forEach((pt) => {
          const dist = Phaser.Math.Distance.Between(px, py, pt.cx, pt.cy);
          if (dist < INTERACT_DISTANCE && dist < nearestDist) {
            nearest = pt;
            nearestDist = dist;
          }
        });

        if (this.popupEl) {
          if (nearest) {
            const key = nearest.title;
            if (this.currentPopup !== key) {
              this.currentPopup = key;
              const displayTitle = nearest.title
                .split(" ")
                .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(" ");
              this.popupEl.innerHTML = `
                <div style="font-weight:bold;font-size:15px;margin-bottom:8px;color:#5c3300;border-bottom:1px solid #c8a04a;padding-bottom:6px;">
                  📜 ${displayTitle}
                </div>
                <div>${nearest.content}</div>
              `;
              this.popupEl.style.display = "block";
            }
          } else if (this.currentPopup !== null) {
            this.currentPopup = null;
            this.popupEl.style.display = "none";
          }
        }
      }

      shutdown() {
        if (this.popupEl) { this.popupEl.remove(); this.popupEl = null; }
      }
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 960,
      height: 640,
      physics: {
        default: "matter",
        matter: {
          gravity: { x: 0, y: 0 },
          debug: false, // đổi true để thấy collision
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: Bai15Scene,
    });

    gameRef.current = game;
    return () => { gameRef.current?.destroy(true); gameRef.current = null; };
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "70vh", minHeight: 480 }} />
  );
}