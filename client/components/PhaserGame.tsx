"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";

// ─── Types matching API response ──────────────────────────────────────
export type SpriteFrame = { key: string; frame: number; imageUrl: string };
export type Tileset = { name: string; imageUrl: string };
export type LessonGameData = {
  tilemapJsonUrl: string;
  tilesets: Tileset[];
  character: { animations: Record<string, SpriteFrame[]> };
  spawnPoint: { x: number; y: number };
};

type InteractPoint = { cx: number; cy: number; title: string; content: string };

const INTERACT_DISTANCE = 80;

interface PhaserGameProps {
  lessonGame: LessonGameData;
}

export default function PhaserGame({ lessonGame }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const dataRef = useRef(lessonGame);
  dataRef.current = lessonGame;

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const data = dataRef.current;
    const { tilemapJsonUrl, tilesets, character, spawnPoint } = data;

    let animationsMap: Record<string, SpriteFrame[]> = {};
    if (Array.isArray(character?.animations)) {
      for (const group of character.animations) {
        if (group && group.name) {
          animationsMap[group.name] = (group.frames || []).map((f: any) => ({
            key: f.key,
            frame: f.frame,
            imageUrl: f.imageUrl,
          }));
        }
      }
    } else if (character?.animations && typeof character.animations === "object") {
      animationsMap = character.animations as Record<string, SpriteFrame[]>;
    }

    const idleFrames: SpriteFrame[] = animationsMap.idle || [];
    const runFrames: SpriteFrame[] = animationsMap.run || [];
    const allFrames = [...idleFrames, ...runFrames];

    const bgTileset = tilesets?.[0];

    class DynamicLessonScene extends Phaser.Scene {
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      private player!: Phaser.Physics.Matter.Sprite;
      private interactPoints: InteractPoint[] = [];
      private popupEl: HTMLDivElement | null = null;
      private currentPopup: string | null = null;
      private mapWidth = 1440;
      private mapHeight = 1088;

      // Khóa tương tác tạm thời khi người chơi chọn đáp án để đợi hiệu ứng chuyển câu
      private isAnswering = false;

      preload() {
        if (bgTileset) {
          this.load.image("bg-tileset", bgTileset.imageUrl);
        }
        this.load.tilemapTiledJSON("lesson-map", tilemapJsonUrl);
        allFrames.forEach((f) => {
          this.load.image(f.key, f.imageUrl);
        });
      }

      create() {
        const map = this.make.tilemap({ key: "lesson-map" });
        const mapData = this.cache.tilemap.get("lesson-map")?.data as
          | { layers?: Array<{ type?: string; objects?: unknown[] }> }
          | undefined;

        const mapW = (map as any).widthInPixels;
        const mapH = (map as any).heightInPixels;
        if (mapW && mapH) {
          this.mapWidth = mapW;
          this.mapHeight = mapH;
        }

        if (bgTileset) {
          this.add
            .image(0, 0, "bg-tileset")
            .setOrigin(0, 0)
            .setDisplaySize(this.mapWidth, this.mapHeight);
        }

        const objectLayers = (mapData?.layers ?? []).filter(
          (layer): layer is { type?: string; objects?: any[] } =>
            layer.type === "objectgroup" && Array.isArray(layer.objects)
        );

        for (const objectLayer of objectLayers) {
          for (const obj of objectLayer.objects ?? []) {
            type ObjWithProps = { properties?: { name: string; value: string }[] };
            const props = (obj as unknown as ObjWithProps).properties;
            const propValue = props?.[0]?.value ?? null;
            const objName = obj.name ?? "";

            const saveInteract = (cx: number, cy: number) => {
              if (propValue && objName) {
                this.interactPoints.push({
                  cx,
                  cy,
                  title: objName.replace(/_/g, " "),
                  content: propValue,
                });
              }
            };

            if (obj.polygon && obj.polygon.length > 0) {
              const pts = obj.polygon as { x: number; y: number }[];
              let cx = 0, cy = 0;
              let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
              pts.forEach((p) => {
                cx += p.x; cy += p.y;
                minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
              });
              cx /= pts.length; cy /= pts.length;

              const vertices = pts.map((p) => ({ x: p.x - cx, y: p.y - cy }));
              const worldX = (obj.x ?? 0) + cx;
              const worldY = (obj.y ?? 0) + cy;

              try {
                this.matter.add.fromVertices(worldX, worldY, vertices, {
                  isStatic: true, friction: 0, frictionStatic: 0, restitution: 0,
                }, true);
              } catch {
                const w = maxX - minX, h = maxY - minY;
                if (w > 4 && h > 4) {
                  this.matter.add.rectangle(
                    (obj.x ?? 0) + minX + w / 2,
                    (obj.y ?? 0) + minY + h / 2,
                    w, h, { isStatic: true }
                  );
                }
              }

              saveInteract(
                (obj.x ?? 0) + (minX + maxX) / 2,
                (obj.y ?? 0) + (minY + maxY) / 2
              );
              continue;
            }

            if (!obj.width || !obj.height) continue;
            const rx = (obj.x ?? 0) + obj.width / 2;
            const ry = (obj.y ?? 0) + obj.height / 2;
            this.matter.add.rectangle(rx, ry, obj.width, obj.height, {
              isStatic: true, friction: 0, frictionStatic: 0, restitution: 0,
            });
            saveInteract(rx, ry);
          }
        }

        const startFrame = idleFrames[0]?.key || allFrames[0]?.key || "bg-tileset";

        this.player = this.matter.add.sprite(
          spawnPoint.x || this.mapWidth / 2,
          spawnPoint.y || this.mapHeight / 2,
          startFrame
        );

        if (this.player) {
          this.player.setDepth(100);
        }

        this.player.setBody({ type: "rectangle", width: 20, height: 20 });
        this.player.setFixedRotation();
        this.player.setFriction(0);
        this.player.setFrictionAir(0.3);

        if (idleFrames.length > 0) {
          this.anims.create({
            key: "idle",
            frames: idleFrames.map((f) => ({ key: f.key })),
            frameRate: 6,
            repeat: -1,
          });
        }
        if (runFrames.length > 0) {
          this.anims.create({
            key: "run",
            frames: runFrames.map((f) => ({ key: f.key })),
            frameRate: 10,
            repeat: -1,
          });
        }
        if (idleFrames.length > 0) {
          this.player.play("idle");
        }

        this.matter.world.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // ── Khởi tạo cấu trúc giao diện HTML cho hộp thoại câu hỏi ──
        const parent = this.game.canvas.parentElement;
        if (parent) {
          parent.style.position = "relative";
          const popup = document.createElement("div");
          popup.style.cssText = `
            display:none; position:absolute; bottom:24px; left:50%;
            transform:translateX(-50%); width:85%; max-width:580px;
            background:rgba(255,248,220,0.98); border:3px solid #8B6914;
            border-radius:12px; padding:18px 22px;
            font-family:'Times New Roman',serif; font-size:15px;
            line-height:1.5; color:#3b2000;
            box-shadow:0 6px 25px rgba(0,0,0,0.5); z-index:100;
            pointer-events: auto; /* Cho phép nhận tương tác chuột để click chọn */
          `;
          parent.appendChild(popup);
          this.popupEl = popup;
        }

        this.add.text(this.mapWidth / 2, 20, "Đi gần vật thể để xem câu hỏi trắc nghiệm", {
          fontSize: "13px", color: "#ffffff",
          backgroundColor: "#00000066",
          padding: { x: 10, y: 4 },
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10);

        this.cursors = this.input.keyboard!.createCursorKeys();
      }

      // Hàm xử lý logic chấm điểm và hiển thị kết quả trực quan
      handleAnswerClick(btn: HTMLButtonElement, index: number, correctIdx: number) {
        if (this.isAnswering) return;
        this.isAnswering = true;

        // Vô hiệu hóa trạng thái tương tác của toàn bộ các nút đáp án trong danh sách
        const buttons = this.popupEl?.querySelectorAll(".quiz-opt-btn");
        buttons?.forEach((b) => {
          (b as HTMLButtonElement).disabled = true;
          (b as HTMLButtonElement).style.cursor = "not-allowed";
        });

        if (index === correctIdx) {
          // Trả lời CHÍNH XÁC: Chuyển nút sang màu xanh lá cổ điển
          btn.style.backgroundColor = "#2e7d32";
          btn.style.color = "#ffffff";
          btn.style.borderColor = "#1b5e20";
          btn.innerHTML = `✓ ${btn.innerHTML}`;
        } else {
          // Trả lời SAI: Chuyển nút bấm hiện tại sang màu đỏ hỏa hoạn
          btn.style.backgroundColor = "#c62828";
          btn.style.color = "#ffffff";
          btn.style.borderColor = "#b71c1c";
          btn.innerHTML = `✗ ${btn.innerHTML}`;

          // Highlight đáp án đúng để người dùng nhận diện kiến thức
          if (buttons && buttons[correctIdx]) {
            const correctBtn = buttons[correctIdx] as HTMLButtonElement;
            correctBtn.style.backgroundColor = "#2e7d32";
            correctBtn.style.color = "#ffffff";
            correctBtn.style.borderColor = "#1b5e20";
          }
        }

        // Tạo độ trễ ngắn cho người học kịp ghi nhận kết quả trước khi cho phép đi tiếp
        this.time.delayedCall(2000, () => {
          this.isAnswering = false;
        });
      }

      update() {
        if (!this.player || !this.cursors) return;

        // Vô hiệu hóa di chuyển nhân vật khi đang đứng trả lời để tránh mất focus
        const speed = this.isAnswering ? 0 : 5;
        let vx = 0, vy = 0, moving = false;

        if (this.cursors.left?.isDown) { vx = -speed; this.player.setFlipX(true); moving = true; }
        else if (this.cursors.right?.isDown) { vx = speed; this.player.setFlipX(false); moving = true; }
        if (this.cursors.up?.isDown) { vy = -speed; moving = true; }
        else if (this.cursors.down?.isDown) { vy = speed; moving = true; }

        if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
        this.player.setVelocity(vx, vy);

        if (moving && this.anims.exists("run")) {
          this.player.play("run", true);
        } else if (!moving && this.anims.exists("idle")) {
          this.player.play("idle", true);
        }

        const px = this.player.x;
        const py = this.player.y;
        let nearest: InteractPoint | null = null;
        let nearestDist = Infinity;

        for (const pt of this.interactPoints) {
          const dist = Phaser.Math.Distance.Between(px, py, pt.cx, pt.cy);
          if (dist < INTERACT_DISTANCE && dist < nearestDist) {
            nearest = pt;
            nearestDist = dist;
          }
        }

        if (this.popupEl) {
          if (nearest !== null) {
            const n = nearest;
            if (this.currentPopup !== n.title) {
              this.currentPopup = n.title;
              const displayTitle = n.title
                .split(" ")
                .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(" ");

              // Cấu trúc phân tách dữ liệu mẫu từ Tiled: "Nội dung câu hỏi | Đáp án A | Đáp án B | C | D | Chỉ số đáp án đúng (0-3)"
              // Nếu chuỗi không chứa ký tự '|', hệ thống sẽ hiển thị ở chế độ Text thông tin thông thường.
              const tokens = n.content.split("|").map((t) => t.trim());

              if (tokens.length >= 6) {
                const questionText = tokens[0];
                const options = [tokens[1], tokens[2], tokens[3], tokens[4]];
                const correctIdx = parseInt(tokens[5], 10) || 0;

                let optionsHtml = `<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">`;
                options.forEach((opt, idx) => {
                  const prefix = String.fromCharCode(65 + idx); // Sinh tự động nhãn A, B, C, D
                  optionsHtml += `
                    <button class="quiz-opt-btn" data-idx="${idx}" style="
                      background: #fff; border: 1.5px solid #bba476; border-radius: 6px;
                      padding: 8px 12px; text-align: left; font-family: inherit; font-size: 14px;
                      color: #4a3211; cursor: pointer; transition: all 0.2s ease;
                      outline: none; font-weight: 500;
                    ">${prefix}. ${opt}</button>
                  `;
                });
                optionsHtml += `</div>`;

                this.popupEl.innerHTML = `
                  <div style="font-weight:bold;font-size:15px;margin-bottom:8px;color:#5c3300;border-bottom:1px solid #c8a04a;padding-bottom:6px;">
                    ❓ ${displayTitle}
                  </div>
                  <div style="font-weight: 600; color: #2b1a04;">${questionText}</div>
                  ${optionsHtml}
                `;

                // Đăng ký sự kiện click chuột trực tiếp cho các nút bấm vừa được render sinh ra
                const btns = this.popupEl.querySelectorAll(".quiz-opt-btn");
                btns.forEach((b) => {
                  const btnElement = b as HTMLButtonElement;

                  // Hiệu ứng rê chuột (Hover style) bằng JS
                  btnElement.onmouseenter = () => {
                    if (!this.isAnswering) {
                      btnElement.style.background = "#f4ebd0";
                      btnElement.style.borderColor = "#8b6914";
                    }
                  };
                  btnElement.onmouseleave = () => {
                    if (!this.isAnswering) {
                      btnElement.style.background = "#all";
                      btnElement.style.backgroundColor = "#fff";
                      btnElement.style.borderColor = "#bba476";
                    }
                  };

                  btnElement.onclick = (e) => {
                    e.preventDefault();
                    const idx = parseInt(btnElement.getAttribute("data-idx") || "0", 10);
                    this.handleAnswerClick(btnElement, idx, correctIdx);
                  };
                });

              } else {
                // Chế độ tương thích ngược: Hiện text thuần túy nếu dữ liệu không phải cấu trúc trắc nghiệm
                this.popupEl.innerHTML = `
                  <div style="font-weight:bold;font-size:15px;margin-bottom:8px;color:#5c3300;border-bottom:1px solid #c8a04a;padding-bottom:6px;">
                    📜 ${displayTitle}
                  </div>
                  <div>${n.content}</div>
                `;
              }
              this.popupEl.style.display = "block";
            }
          } else if (this.currentPopup !== null && !this.isAnswering) {
            // Chỉ ẩn hộp thoại khi nhân vật di chuyển xa khỏi Object và không ở trong trạng thái chờ kết quả
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
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: DynamicLessonScene,
    });

    gameRef.current = game;
    return () => { gameRef.current?.destroy(true); gameRef.current = null; };
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "70vh", minHeight: 480 }} />
  );
}