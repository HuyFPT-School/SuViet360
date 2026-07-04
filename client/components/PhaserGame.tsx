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

// ── Định nghĩa lại 2 kiểu dữ liệu rõ ràng theo mong muốn nhập chữ trực tiếp ──
type QuestionPointData = {
  cx: number;
  cy: number;
  title: string;
  cauHoi: string;
  dapAnA: string;
  dapAnB: string;
  dapAnC: string;
  dapAnD: string;
  dapAnDung: string;
  sprite?: Phaser.Physics.Matter.Sprite; // Quản lý hình ảnh dấu hỏi xoay
};

type HintPointData = {
  cx: number;
  cy: number;
  title: string;
  goiY: string;
};

const INTERACT_DISTANCE = 80;

interface PhaserGameProps {
  lessonGame: LessonGameData;
  onQuizComplete?: (
    score: number,
    total: number,
    details?: {
      title: string;
      question: string;
      isCorrect: boolean;
      selectedAnswer: string;
      correctAnswer: string;
    }[]
  ) => void;
}

export default function PhaserGame({ lessonGame, onQuizComplete }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const dataRef = useRef(lessonGame);
  dataRef.current = lessonGame;

  const callbackRef = useRef(onQuizComplete);
  callbackRef.current = onQuizComplete;

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

    // Map từ name → imageUrl để dùng trong preload
    const tilesetMap: Record<string, string> = {};
    (tilesets ?? []).forEach((ts) => {
      if (ts.name && ts.imageUrl) tilesetMap[ts.name] = ts.imageUrl;
    });
    const bgTileset = tilesets?.[0];

    class DynamicLessonScene extends Phaser.Scene {
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      private player!: Phaser.Physics.Matter.Sprite;

      // Tách biệt quản lý 2 mảng dữ liệu riêng biệt không dùng ID chung
      private questionPoints: QuestionPointData[] = [];
      private hintPoints: HintPointData[] = [];

      private popupEl: HTMLDivElement | null = null;
      private currentPopup: string | null = null;
      private mapWidth = 1440;
      private mapHeight = 1088;

      // Khóa tương tác tạm thời khi người chơi chọn đáp án để đợi hiệu ứng chuyển câu
      private isAnswering = false;
      private correctAnswersCount = 0;
      private answeredQuestions = new Set<string>();
      private quizDetails: {
        title: string;
        question: string;
        isCorrect: boolean;
        selectedAnswer: string;
        correctAnswer: string;
      }[] = [];

      preload() {
        // Load tilemap JSON trước
        this.load.tilemapTiledJSON("lesson-map", tilemapJsonUrl);

        // Load TẤT CẢ tileset images với key = tên tileset (phải khớp tên trong JSON Tiled)
        Object.entries(tilesetMap).forEach(([name, url]) => {
          this.load.image(name, url);
        });

        // Load sprite frames nhân vật
        allFrames.forEach((f) => {
          this.load.image(f.key, f.imageUrl);
        });

        // Sprite sheet dấu hỏi xoay: ảnh 1920x1920, lưới 3x3, mỗi ô 640x640
        // 7 ô đầu (index 0-6) là 7 góc xoay, 2 ô cuối bỏ trống
        this.load.spritesheet("question-mark-sheet", "/question_mask/socauhoi.png", {
          frameWidth: 640,
          frameHeight: 640
        });
      }

      create() {
        this.correctAnswersCount = 0;
        this.answeredQuestions = new Set();
        const map = this.make.tilemap({ key: "lesson-map" });
        const mapData = this.cache.tilemap.get("lesson-map")?.data as any;

        const mapW = (map as any).widthInPixels;
        const mapH = (map as any).heightInPixels;
        if (mapW && mapH) {
          this.mapWidth = mapW;
          this.mapHeight = mapH;
        }

        // BƯỚC 1: Luôn vẽ ảnh nền (tileset đầu tiên) phủ toàn bộ map ở lớp sâu nhất
        if (bgTileset) {
          this.add
            .image(0, 0, bgTileset.name)
            .setOrigin(0, 0)
            .setDisplaySize(this.mapWidth, this.mapHeight)
            .setDepth(-1);
        }

        // BƯỚC 2: Gắn TẤT CẢ tilesets vào tilemap để Phaser có thể render tile layers
        const phaserTilesets: Phaser.Tilemaps.Tileset[] = [];
        Object.keys(tilesetMap).forEach((name) => {
          const ts = map.addTilesetImage(name, name);
          if (ts) phaserTilesets.push(ts);
        });

        // BƯỚC 3: Render tất cả tile layers từ JSON Tiled lên trên ảnh nền
        const tileLayers = (mapData?.layers ?? []).filter(
          (l: any) => l.type === "tilelayer"
        );
        if (tileLayers.length > 0 && phaserTilesets.length > 0) {
          tileLayers.forEach((layerData: any, idx: number) => {
            try {
              const layer = map.createLayer(layerData.name, phaserTilesets, 0, 0);
              // depth 1, 2, 3... — trên nền nhưng dưới nhân vật (depth 100)
              if (layer) layer.setDepth(1 + idx);
            } catch {
              // Bỏ qua layer lỗi để không crash toàn bộ game
            }
          });
        }

        // Tạo hiệu ứng chuyển động xoay tròn liên tục từ sprite sheet dấu chấm hỏi
        this.anims.create({
          key: "rotate-question",
          frames: this.anims.generateFrameNumbers("question-mark-sheet", { start: 0, end: 6 }),
          frameRate: 8,
          repeat: -1
        });

        const objectLayers = (mapData?.layers ?? []).filter(
          (layer: any): layer is { name: string; type: string; objects: any[] } =>
            layer.type === "objectgroup" && Array.isArray(layer.objects)
        );

        // Duyệt danh sách các layer đối tượng từ file Tiled để sinh nội dung tự động
        for (const objectLayer of objectLayers) {
          for (const obj of objectLayer.objects ?? []) {

            // Chuyển mảng properties của Tiled thành Object key-value để đọc trực tiếp bằng chữ
            const props: Record<string, string> = {};
            if (Array.isArray(obj.properties)) {
              obj.properties.forEach((p: any) => {
                if (p.name) props[p.name] = String(p.value);
              });
            }

            // Tính toán tọa độ trung tâm của Object hình học
            let cx = obj.x ?? 0;
            let cy = obj.y ?? 0;
            if (obj.width && obj.height) {
              cx += obj.width / 2;
              cy += obj.height / 2;
            }

            // Tạo vật thể cứng chắn đường (Colliders) của Matter Physics
            if (obj.polygon && obj.polygon.length > 0) {
              const pts = obj.polygon as { x: number; y: number }[];
              let polyCx = 0, polyCy = 0;
              pts.forEach((p) => { polyCx += p.x; polyCy += p.y; });
              polyCx /= pts.length; polyCy /= pts.length;
              const vertices = pts.map((p) => ({ x: p.x - polyCx, y: p.y - polyCy }));
              try {
                this.matter.add.fromVertices((obj.x ?? 0) + polyCx, (obj.y ?? 0) + polyCy, vertices, { isStatic: true, friction: 0, frictionStatic: 0, restitution: 0 }, true);
              } catch { }
              cx = (obj.x ?? 0) + polyCx;
              cy = (obj.y ?? 0) + polyCy;
            } else if (obj.width && obj.height) {
              this.matter.add.rectangle(cx, cy, obj.width, obj.height, { isStatic: true, friction: 0, frictionStatic: 0, restitution: 0 });
            }

            const objTitle = (obj.name ?? "").replace(/_/g, " ");

            // ── PHÂN LOẠI XỬ LÝ THEO TÊN LAYER BẠN ĐÃ ĐẶT TRONG TILED ──
            if (objectLayer.name === "Layer_CauHoi") {
              // Tự động spawn ra dấu hỏi chấm xoay vòng tại tọa độ của object này
              const qSprite = this.matter.add.sprite(cx, cy, "question-mark-sheet", 0, { isStatic: true });
              qSprite.play("rotate-question");
              qSprite.setDepth(90);
              qSprite.setScale(0.12); // ảnh gốc 640x640 -> hiển thị ~77x77px trên map
              qSprite.setTintFill(0xc6eb34); // đổi màu dấu hỏi sang vàng gold, đổi hex tùy ý

              let cauHoi = props["cau_hoi"];
              let dapAnA = props["dap_an_A"];
              let dapAnB = props["dap_an_B"];
              let dapAnC = props["dap_an_C"];
              let dapAnD = props["dap_an_D"];
              let dapAnDung = props["dap_an_dung"];
              let questionTitle = objTitle || "Câu Hỏi Bản Đồ";

              if (Array.isArray(obj.properties)) {
                obj.properties.forEach((p: any) => {
                  const nameLower = (p.name || "").toLowerCase().replace(/_/g, " ").trim();
                  const valStr = String(p.value || "").trim();

                  if (nameLower.includes("cau hoi") || nameLower.includes("câu hỏi")) {
                    if (p.name.toLowerCase() !== "cau_hoi" && p.name.toLowerCase() !== "cau hoi") {
                      questionTitle = p.name; // Dùng tên thân thiện như "Câu hỏi 1", "Câu hỏi 2"
                    }
                    if (valStr.includes("|")) {
                      const parts = valStr.split("|").map((x) => x.trim());
                      if (parts.length >= 6) {
                        cauHoi = parts[0];
                        dapAnA = parts[1];
                        dapAnB = parts[2];
                        dapAnC = parts[3];
                        dapAnD = parts[4];
                        dapAnDung = parts[5];
                      } else {
                        cauHoi = valStr;
                      }
                    } else {
                      cauHoi = valStr;
                    }
                  } else if (nameLower === "cau_hoi") {
                    cauHoi = valStr; // field kỹ thuật, KHÔNG override tiêu đề
                  } else if (nameLower === "dap an a" || nameLower === "đáp án a" || nameLower === "dap_an_a") {
                    dapAnA = valStr;
                  } else if (nameLower === "dap an b" || nameLower === "đáp án b" || nameLower === "dap_an_b") {
                    dapAnB = valStr;
                  } else if (nameLower === "dap an c" || nameLower === "đáp án c" || nameLower === "dap_an_c") {
                    dapAnC = valStr;
                  } else if (nameLower.includes("dap an dung") || nameLower.includes("đáp án đúng")) {
                    dapAnDung = valStr;
                  } else if (nameLower.includes("dap an d") || nameLower.includes("đáp án d")) {
                    dapAnD = valStr;
                  }
                });
              }

              this.questionPoints.push({
                cx, cy,
                title: questionTitle,
                cauHoi: cauHoi || "Nội dung câu hỏi chưa nhập",
                dapAnA: dapAnA || "",
                dapAnB: dapAnB || "",
                dapAnC: dapAnC || "",
                dapAnD: dapAnD || "",
                dapAnDung: dapAnDung || "",
                sprite: qSprite
              });
            } else if (objectLayer.name === "Layer_GoiY") {
              let goiYVal = props["goi_y"];
              let hintTitle = objTitle || "Thông Tin Gợi Ý";

              if (Array.isArray(obj.properties)) {
                obj.properties.forEach((p: any) => {
                  const nameLower = (p.name || "").toLowerCase().replace(/_/g, " ").trim();
                  const valStr = String(p.value || "").trim();

                  if (nameLower.includes("goi y") || nameLower.includes("gợi ý")) {
                    if (p.name.toLowerCase() !== "goi_y" && p.name.toLowerCase() !== "goi y") {
                      hintTitle = p.name; // Dùng tên thân thiện như "Gợi ý 1"
                    }
                    goiYVal = valStr;
                  } else if (nameLower === "goi_y") {
                    goiYVal = valStr; // field kỹ thuật, không override tiêu đề
                  }
                });
              }

              // Tuyệt đối fallback: nếu không tìm thấy thuộc tính nào khớp tên gợi ý,
              // dùng giá trị thuộc tính đầu tiên có trong object
              if (!goiYVal && obj.properties && obj.properties.length > 0) {
                goiYVal = String(obj.properties[0].value || "");
              }

              this.hintPoints.push({
                cx, cy,
                title: hintTitle,
                goiY: goiYVal || "Thông tin đang được cập nhật",
              });
            }
          }
        }

        // Dùng frame nhân vật hợp lệ; nếu không có sprite nào thì tạo placeholder
        const startFrame = idleFrames[0]?.key || allFrames[0]?.key || null;

        // Chỉ spawn nhân vật khi có frame hợp lệ
        if (!startFrame) {
          console.warn("[PhaserGame] Không có sprite nhân vật — bỏ qua spawn player.");
        }
        this.player = this.matter.add.sprite(
          spawnPoint.x || this.mapWidth / 2,
          spawnPoint.y || this.mapHeight / 2,
          startFrame ?? "__DEFAULT"
        );

        if (this.player) {
          this.player.setDepth(100);
          this.player.setBody({ type: "rectangle", width: 20, height: 20 });
          this.player.setFixedRotation();
          this.player.setFriction(0);
          this.player.setFrictionAir(0.3);
        }

        if (idleFrames.length > 0) {
          this.anims.create({
            key: "idle",
            frames: idleFrames.map((f) => ({ key: f.key })),
            frameRate: 6,
            repeat: -1,
          });
          this.player.play("idle");
        }
        if (runFrames.length > 0) {
          this.anims.create({
            key: "run",
            frames: runFrames.map((f) => ({ key: f.key })),
            frameRate: 10,
            repeat: -1,
          });
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
            pointer-events: auto;
          `;
          parent.appendChild(popup);
          this.popupEl = popup;
        }

        this.add.text(this.mapWidth / 2, 20, "Di chuyển đến gần các vị trí để khám phá kiến thức", {
          fontSize: "13px", color: "#ffffff",
          backgroundColor: "#00000066",
          padding: { x: 10, y: 4 },
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10);

        this.cursors = this.input.keyboard!.createCursorKeys();
      }

      // Hàm xử lý kiểm tra chuỗi chữ đáp án đúng/sai trực tiếp
      handleAnswerClick(btn: HTMLButtonElement, selectedAnswer: string, correctAnswer: string, qPoint: QuestionPointData) {
        if (this.isAnswering) return;
        this.isAnswering = true;

        const buttons = this.popupEl?.querySelectorAll(".quiz-opt-btn");
        buttons?.forEach((b) => {
          (b as HTMLButtonElement).disabled = true;
          (b as HTMLButtonElement).style.cursor = "not-allowed";
        });

        // Chuẩn hóa và so khớp chữ trực tiếp
        const isCorrect = selectedAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        const questionKey = qPoint.title;

        if (!this.answeredQuestions.has(questionKey)) {
          this.answeredQuestions.add(questionKey);
          if (isCorrect) {
            this.correctAnswersCount += 1;
          }
          this.quizDetails.push({
            title: qPoint.title,
            question: qPoint.cauHoi,
            isCorrect,
            selectedAnswer,
            correctAnswer,
          });
        }

        if (isCorrect) {
          // Đúng -> Đổi nút sang màu xanh lá
          btn.style.backgroundColor = "#2e7d32";
          btn.style.color = "#ffffff";
          btn.style.borderColor = "#1b5e20";
          btn.innerHTML = `✓ ${btn.innerHTML}`;
        } else {
          // Sai -> Đổi nút sang màu đỏ hỏa hoạn
          btn.style.backgroundColor = "#c62828";
          btn.style.color = "#ffffff";
          btn.style.borderColor = "#b71c1c";
          btn.innerHTML = `✗ ${btn.innerHTML}`;

          // Tự động tìm hiển thị màu xanh lá làm nổi bật đáp án đúng cho học sinh
          buttons?.forEach((b) => {
            const btnEl = b as HTMLButtonElement;
            const textVal = btnEl.getAttribute("data-val") || "";
            if (textVal.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
              btnEl.style.backgroundColor = "#2e7d32";
              btnEl.style.color = "#ffffff";
              btnEl.style.borderColor = "#1b5e20";
            }
          });
        }

        // Đã trả lời (Đúng hoặc Sai) -> Xóa bỏ dấu chấm hỏi xoay tròn trên bản đồ
        if (qPoint.sprite) {
          qPoint.sprite.destroy();
        }

        // Tạo độ trễ ngắn 2 giây trước khi đóng popup cho người học kịp ghi nhận đáp án đúng
        this.time.delayedCall(2000, () => {
          this.isAnswering = false;
          if (this.popupEl) {
            this.popupEl.style.display = "none";
            this.currentPopup = null;
          }

          // Kiểm tra xem đã trả lời hết câu hỏi chưa
          const totalQuestions = this.questionPoints.length;
          if (this.answeredQuestions.size === totalQuestions) {
            if (callbackRef.current) {
              callbackRef.current(this.correctAnswersCount, totalQuestions, this.quizDetails);
            }
          }
        });
      }

      update() {
        if (!this.player || !this.cursors) return;

        const speed = this.isAnswering ? 0 : 5;
        let vx = 0, vy = 0, moving = false;

        if (this.cursors.left?.isDown) { vx = -speed; this.player.setFlipX(true); moving = true; }
        else if (this.cursors.right?.isDown) { vx = speed; this.player.setFlipX(false); moving = true; }
        if (this.cursors.up?.isDown) { vy = -speed; moving = true; }
        else if (this.cursors.down?.isDown) { vy = speed; moving = true; }

        if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
        this.player.setVelocity(vx, vy);

        if (moving && this.anims.exists("run")) this.player.play("run", true);
        else if (!moving && this.anims.exists("idle")) this.player.play("idle", true);

        const px = this.player.x;
        const py = this.player.y;

        let nearestQuestion: QuestionPointData | null = null;
        let nearestHint: HintPointData | null = null;
        let nearestDist = Infinity;

        // 1. Quét tìm vị trí thuộc Layer_CauHoi gần nhất chưa được giải đáp
        for (const pt of this.questionPoints) {
          if (this.answeredQuestions.has(pt.title)) continue; // Bỏ qua nếu đã trả lời xong
          if (pt.sprite && !pt.sprite.active) continue; // Bỏ qua nếu dấu hỏi đã bị xóa

          const dist = Phaser.Math.Distance.Between(px, py, pt.cx, pt.cy);
          if (dist < INTERACT_DISTANCE && dist < nearestDist) {
            nearestQuestion = pt;
            nearestHint = null;
            nearestDist = dist;
          }
        }

        // 2. Quét tìm vị trí thuộc Layer_GoiY gần nhất
        for (const pt of this.hintPoints) {
          const dist = Phaser.Math.Distance.Between(px, py, pt.cx, pt.cy);
          if (dist < INTERACT_DISTANCE && dist < nearestDist) {
            nearestHint = pt;
            nearestQuestion = null;
            nearestDist = dist;
          }
        }

        if (this.popupEl) {
          // THẮP SÁNG BẢNG POPUP CÂU HỎI TRẮC NGHIỆM CHỮ
          if (nearestQuestion !== null) {
            const q = nearestQuestion;
            if (this.currentPopup !== q.title) {
              this.currentPopup = q.title;

              // Thu gom các đáp án chữ hợp lệ đã gõ từ Tiled
              const rawOptions = [q.dapAnA, q.dapAnB, q.dapAnC, q.dapAnD].filter(o => o !== "");
              let optionsHtml = `<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">`;

              rawOptions.forEach((opt, idx) => {
                const prefix = String.fromCharCode(65 + idx); // Tạo nhãn A, B, C, D tự động
                optionsHtml += `
                  <button class="quiz-opt-btn" data-val="${opt}" style="
                    background: #fff; border: 1.5px solid #bba476; border-radius: 6px;
                    padding: 8px 12px; text-align: left; font-family: inherit; font-size: 14px;
                    color: #4a3211; cursor: pointer; transition: all 0.2s ease; outline: none;
                    font-weight: 500;
                  ">${prefix}. ${opt}</button>
                `;
              });
              optionsHtml += `</div>`;

              this.popupEl.innerHTML = `
                <div style="font-weight:bold;font-size:15px;margin-bottom:8px;color:#5c3300;border-bottom:1px solid #c8a04a;padding-bottom:6px;">❓ ${q.title}</div>
                <div style="font-weight: 600; color: #2b1a04;">${q.cauHoi}</div>
                ${optionsHtml}
              `;

              // Đăng ký tương tác click chọn cho các đáp án trắc nghiệm chữ
              const btns = this.popupEl.querySelectorAll(".quiz-opt-btn");
              btns.forEach((b) => {
                const btnElement = b as HTMLButtonElement;

                btnElement.onmouseenter = () => {
                  if (!this.isAnswering) btnElement.style.background = "#f4ebd0";
                };
                btnElement.onmouseleave = () => {
                  if (!this.isAnswering) btnElement.style.background = "#fff";
                };

                btnElement.onclick = (e) => {
                  e.preventDefault();
                  const val = btnElement.getAttribute("data-val") || "";
                  this.handleAnswerClick(btnElement, val, q.dapAnDung, q);
                };
              });
              this.popupEl.style.display = "block";
            }
          }
          // THẮP SÁNG BẢNG HIỂN THỊ GỢI Ý THUẦN CHỮ TIẾNG VIỆT
          else if (nearestHint !== null) {
            const h = nearestHint;
            if (this.currentPopup !== h.title) {
              this.currentPopup = h.title;
              this.popupEl.innerHTML = `
                <div style="font-weight:bold;font-size:15px;margin-bottom:8px;color:#0d47a1;border-bottom:1px solid #90caf9;padding-bottom:6px;">💡 Thông Tin Gợi Ý: ${h.title}</div>
                <div style="color: #0c3370; font-weight: 500;">${h.goiY}</div>
              `;
              this.popupEl.style.display = "block";
            }
          }
          // ẨN POPUP KHI DI CHUYỂN RA XA VÙNG INTERACT
          else if (this.currentPopup !== null && !this.isAnswering) {
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