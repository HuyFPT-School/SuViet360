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
  // Keep lessonGame in a ref so the scene closure always reads latest
  const dataRef = useRef(lessonGame);
  dataRef.current = lessonGame;

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const data = dataRef.current;
    const { tilemapJsonUrl, tilesets, character, spawnPoint } = data;

    // Derive animation frames from API data
    const idleFrames: SpriteFrame[] = character.animations.idle || [];
    const runFrames: SpriteFrame[] = character.animations.run || [];
    const allFrames = [...idleFrames, ...runFrames];

    class DynamicLessonScene extends Phaser.Scene {
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      private player!: Phaser.Physics.Matter.Sprite;
      private interactPoints: InteractPoint[] = [];
      private popupEl: HTMLDivElement | null = null;
      private currentPopup: string | null = null;
      private mapWidth = 1440;
      private mapHeight = 1088;

      preload() {
        // Load all tileset images using their name as the image key
        tilesets.forEach((ts) => {
          this.load.image(ts.name, ts.imageUrl);
        });

        // Load tilemap JSON from Cloudinary URL
        this.load.tilemapTiledJSON("lesson-map", tilemapJsonUrl);

        // Load all animation frames from Cloudinary URLs
        allFrames.forEach((f) => this.load.image(f.key, f.imageUrl));
      }

      create() {
        const map = this.make.tilemap({ key: "lesson-map" });

        // Try to read map dimensions from tilemap
        const mapW = map.widthInPixels;
        const mapH = map.heightInPixels;
        if (mapW && mapH) {
          this.mapWidth = mapW;
          this.mapHeight = mapH;
        }

        // Associate loaded tileset images with the tilemap data
        const phaserTilesets = tilesets
          .map((ts) => map.addTilesetImage(ts.name, ts.name))
          .filter(Boolean) as Phaser.Tilemaps.Tileset[];

        // Render all Tile layers dynamically from the Tiled JSON
        map.layers.forEach((layer) => {
          map.createLayer(layer.name, phaserTilesets, 0, 0);
        });

        // ── Build collision bodies from object layer ──
        // Try finding "CollisionsBai15" or fallback to any object layer containing "collision"
        let objectLayer = map.getObjectLayer("CollisionsBai15");
        if (!objectLayer && map.objects) {
          const collisionLayerObj = map.objects.find((layer) =>
            layer.name.toLowerCase().includes("collision")
          );
          if (collisionLayerObj) {
            objectLayer = map.getObjectLayer(collisionLayerObj.name);
          }
        }
        if (objectLayer?.objects?.length) {
          objectLayer.objects.forEach((obj) => {
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
              return;
            }

            if (!obj.width || !obj.height) return;
            const rx = (obj.x ?? 0) + obj.width / 2;
            const ry = (obj.y ?? 0) + obj.height / 2;
            this.matter.add.rectangle(rx, ry, obj.width, obj.height, {
              isStatic: true, friction: 0, frictionStatic: 0, restitution: 0,
            });
            saveInteract(rx, ry);
          });
        }

        // ── Player ──
        const startFrame = idleFrames[0]?.key || allFrames[0]?.key || "bg-tileset";
        this.player = this.matter.add.sprite(
          spawnPoint.x || this.mapWidth / 2,
          spawnPoint.y || this.mapHeight / 2,
          startFrame
        );
        this.player.setBody({ type: "rectangle", width: 20, height: 20 });
        this.player.setFixedRotation();
        this.player.setFriction(0);
        this.player.setFrictionAir(0.3);

        // ── Animations ──
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

        // ── Popup ──
        const parent = this.game.canvas.parentElement;
        if (parent) {
          parent.style.position = "relative";
          const popup = document.createElement("div");
          popup.style.cssText = `
            display:none; position:absolute; bottom:24px; left:50%;
            transform:translateX(-50%); width:80%; max-width:560px;
            background:rgba(255,248,220,0.97); border:3px solid #8B6914;
            border-radius:12px; padding:16px 20px;
            font-family:'Times New Roman',serif; font-size:14px;
            line-height:1.6; color:#3b2000;
            box-shadow:0 4px 20px rgba(0,0,0,0.4); z-index:100; pointer-events:none;
          `;
          parent.appendChild(popup);
          this.popupEl = popup;
        }

        this.add.text(this.mapWidth / 2, 20, "Đi gần vật thể để xem thông tin", {
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
              this.popupEl.innerHTML = `
                <div style="font-weight:bold;font-size:15px;margin-bottom:8px;color:#5c3300;border-bottom:1px solid #c8a04a;padding-bottom:6px;">
                  📜 ${displayTitle}
                </div>
                <div>${n.content}</div>
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