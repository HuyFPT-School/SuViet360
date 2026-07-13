# 🏗️ SuViet360 — Kế hoạch tái kiến trúc Hệ thống Bài học & Trò chơi (Lesson & Game System)

> **Branch:** `feat/test` | **So sánh với:** `main`  
> **Ngày cập nhật:** 13/07/2026 | **Người soạn:** Antigravity (AI Assistant)

---

## 📌 Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kiến trúc dữ liệu đơn giản hóa](#2-kiến-trúc-dữ-liệu-đơn-giản-hóa)
3. [Chi tiết các Model mới](#3-chi-tiết-các-model-mới)
4. [Tái cấu trúc Staff Dashboard (Ưu tiên hàng đầu)](#4-tái-cấu-trúc-staff-dashboard-ưu-tiên-hàng-đầu)
5. [Hệ thống Content Block Builder](#5-hệ-thống-content-block-builder)
6. [API Endpoints](#6-api-endpoints)
7. [Tiến độ học tập & Gamification](#7-tiến-độ-học-tập--gamification)
8. [Luồng dữ liệu Client (Web & Mobile)](#8-luồng-dữ-liệu-client-web--mobile)
9. [Kế hoạch triển khai từng bước](#9-kế-hoạch-triển-khai-từng-bước)

---

## 1. Tổng quan

Hệ thống hiện tại có cấu trúc khá phẳng:
- **Game 2D** (trước đây gọi là Lesson, lưu trong collection `games`) chứa cấu trúc cấu hình Phaser (tilemap, tileset, animation, spawnPoint) và câu hỏi tích hợp trực tiếp. Game chỉ chơi trên Mobile và được Giáo viên chơi thử trên Web để duyệt.
- Chưa có hệ thống chương mục học tập lý thuyết (Chapter), chưa có các phần học lý thuyết tương tác ngoài Game và Podcast.

**Kế hoạch tái kiến trúc** hướng tới việc bổ sung hệ thống bài học lý thuyết có cấu trúc, tách biệt phần game 2D và bổ sung các chương học lý thuyết, cụ thể:
1. **Giữ nguyên Game 2D**: Tiếp tục sử dụng collection `games` phục vụ chơi game trên Mobile và duyệt bài trên Web.
2. **Thêm Module Lý thuyết (Curriculum)**: Cho phép tạo các bài học lý thuyết trực quan (gồm văn bản, hình ảnh, video, audio) được gom nhóm theo Chương (Chapter).
3. **Đơn giản hóa cấu trúc**: Thay vì 4 tầng như kế hoạch cũ, rút gọn xuống còn **3 tầng**:
   - **Chapter (Chương)**: Phân nhóm các bài học lý thuyết theo lớp (10, 11, 12) và thứ tự.
   - **StudyUnit (Bài học lý thuyết)**: Chứa các block nội dung hiển thị cho học sinh.
   - **ContentBlock (Block nội dung)**: Nhúng trực tiếp trong StudyUnit dưới dạng mảng (không tách collection riêng).

---

## 2. Kiến trúc dữ liệu đơn giản hóa

```
┌─────────────────────────────────────────────────────┐
│                   CHAPTER (Chương)                  │
│  Metadata: title, grade (10/11/12), order, coverImg │
│  Virtual: unitCount                                 │
├─────────────────────────────────────────────────────┤
│             STUDY UNIT (Bài học lý thuyết)          │
│  Metadata: title, chapterId, order, difficulty, tags│
│  Status flow: Draft → Pending_Review → Published     │
│  Core: contentBlocks[]                              │
├─────────────────────────────────────────────────────┤
│         CONTENT BLOCKS (Nhúng trong StudyUnit)      │
│  ┌───────┬────────┬───────┬──────────┬──────────┐  │
│  │ text  │ image  │ audio │ podcast* │  video   │  │
│  ├───────┼────────┼───────┼──────────┼──────────┤  │
│  │ game* │ quiz*  │timeline│  quote   │   map    │  │
│  └───────┴────────┴───────┴──────────┴──────────┘  │
│  * game/quiz/podcast: tham chiếu (ref) ID riêng     │
├─────────────────────────────────────────────────────┤
│               COLLECTION ĐỘC LẬP TÁCH RIÊNG         │
│  🎮 games     🎙️ podcasts      ❓ quizzes            │
└─────────────────────────────────────────────────────┘
```

### So sánh Trước / Sau Cập Nhật Plan

| Khía cạnh | ❌ Kế hoạch cũ (4 tầng) | ✅ Kế hoạch mới (Đơn giản & Khả thi) |
|-----------|------------------------|------------------------------------|
| Cấu trúc phân cấp | Chapter → CurriculumLesson → LessonPart → Block | Chapter → StudyUnit → ContentBlock (3 tầng) |
| Quản lý Game 2D | Gọi là Lesson, nhúng lẫn lộn | Gọi đúng là **Game**, lưu trong collection `games` độc lập |
| Quiz | Nhúng trong Lesson schema | Tách riêng thành collection `quizzes` để tái sử dụng |
| Giao diện Web | Hiển thị bài học & game trên Web | Game chỉ chơi trên Mobile. Web chỉ hiển thị bài học lý thuyết (StudyUnit) và hỗ trợ giáo viên chơi thử game để duyệt bài |
| Staff Dashboard | Code dồn trong một file `page.tsx` 78KB | Tách thành các file Tab Component riêng biệt để dễ bảo trì |

---

## 3. Chi tiết các Model mới

### 3.1 Chapter (`chapters`)
```typescript
{
  title: string;              // Tên chương
  description: string;        // Mô tả chương
  grade: 10 | 11 | 12;        // Khối lớp học
  order: number;              // Thứ tự hiển thị chương
  coverImage: string;         // Ảnh đại diện chương
  status: "Draft" | "Published";
  createdBy: ObjectId;        // ref: User
}
```

### 3.2 StudyUnit (`studyunits`)
```typescript
{
  title: string;              // Tiêu đề bài học lý thuyết
  summary: string;            // Tóm tắt nội dung
  chapterId: ObjectId;        // ref: Chapter
  order: number;              // Thứ tự trong chương
  duration: number;           // Thời gian ước tính (phút), mặc định 15
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];             // Ví dụ: ["lich-su-viet-nam", "chien-tranh-lanh"]
  thumbnail: string;          // Ảnh thu nhỏ đại diện bài học
  contentBlocks: ContentBlock[]; // Mảng các khối nội dung lý thuyết
  status: "Draft" | "Pending_Review" | "Published" | "Rejected";
  reviewFeedback: string;     // Góp ý phản hồi của giáo viên khi từ chối duyệt
  createdBy: ObjectId;        // ref: User
}
```

### 3.3 ContentBlock (Schema nhúng trực tiếp trong StudyUnit)
```typescript
{
  type: "text" | "image" | "audio" | "video" | "timeline" | "quote" | "map" | "podcast" | "game" | "quiz";
  data: Record<string, any>;   // Cấu trúc linh hoạt tùy theo type
  order: number;               // Thứ tự hiển thị
}
```
*Chi tiết `data` theo từng loại block:*
- `text`: `{ text: string }`
- `image`: `{ imageUrl: string, caption: string, publicId: string }`
- `audio`: `{ audioUrl: string, title: string, publicId: string }`
- `video`: `{ url: string, title: string }` (hỗ trợ link YouTube)
- `timeline`: `{ events: [{ date: string, title: string, description: string }] }`
- `quote`: `{ text: string, author: string }`
- `map`: `{ embedUrl: string, title: string }`
- `podcast`: `{ podcastId: ObjectId }` (tham chiếu đến collection `podcasts`)
- `game`: `{ gameId: ObjectId }` (tham chiếu đến collection `games` để tải cấu hình Phaser)
- `quiz`: `{ quizId: ObjectId }` (tham chiếu đến collection `quizzes` câu hỏi trắc nghiệm)

### 3.4 Quiz (`quizzes`) — Tách riêng để tái sử dụng
```typescript
{
  title: string;
  description: string;
  timeLimit: number | null;       // Giới hạn thời gian (giây), null = tự do
  passScore: number;              // Điểm đạt (%), mặc định 60
  shuffleQuestions: boolean;      // Trộn câu hỏi
  questions: [{
    question: string;
    options: string[];            // Danh sách câu trả lời
    correctIndex: number;         // Index đáp án đúng
    explanation: string;          // Lời giải thích chi tiết
    image: string;                // Ảnh đính kèm (nếu có)
  }];
  status: "Draft" | "Published";
  createdBy: ObjectId;            // ref: User
}
```

---

## 4. Tái cấu trúc Staff Dashboard (Ưu tiên hàng đầu)

Trước khi thêm bất kỳ giao diện quản lý Chương/Bài học lý thuyết nào, file `client/app/staff/page.tsx` (78KB) cần được chia nhỏ thành các Component độc lập trong thư mục `client/components/staff/` để dễ quản lý:

```
client/components/staff/
├── GameTab.tsx          # CRUD Quản lý game 2D (trước đây là Lesson)
├── PodcastTab.tsx       # CRUD Quản lý các Podcast âm thanh
├── BlogTab.tsx          # Quản lý các bài viết Blog
├── ChapterTab.tsx       # CRUD Quản lý Chương học (MỚI)
├── StudyUnitTab.tsx     # CRUD Quản lý Bài học lý thuyết & Content Blocks (MỚI)
└── CouponTab.tsx        # Quản lý Coupon & Giftcode
```

File chính `client/app/staff/page.tsx` sẽ chỉ đóng vai trò chứa layout ngoài và gọi các Tab tương ứng dựa trên state hiện tại.

---

## 5. Hệ thống Content Block Builder

Công cụ thiết kế bài học lý thuyết trực quan (Block Builder) sẽ nằm trong Tab quản lý Bài học:
- **Vị trí code**: `client/components/staff/builder/`
- **Chức năng**:
  - Cho phép Staff thêm mới các block theo hàng dọc.
  - Kéo thả thay đổi thứ tự các block nội dung.
  - Tải lên hình ảnh/âm thanh qua Cloudinary và đính kèm vào block.
  - Chọn các game từ collection `games` hoặc các bộ câu hỏi từ `quizzes` để nhúng vào bài viết.

---

## 6. API Endpoints

### 6.1 Public (Học sinh)
- `GET /api/curriculum/chapters?grade=12` - Lấy danh sách chương của lớp
- `GET /api/curriculum/chapters/:id/units` - Lấy danh sách bài học lý thuyết trong chương
- `GET /api/curriculum/units/:id` - Lấy chi tiết bài học lý thuyết (gồm các block)
- `GET /api/curriculum/quizzes/:id` - Tải câu hỏi của Quiz (không kèm `correctIndex` để bảo mật)

### 6.2 Authentication (Lưu tiến trình học tập)
- `GET /api/curriculum/progress/:unitId` - Lấy tiến trình bài học lý thuyết
- `POST /api/curriculum/progress/:unitId/complete` - Đánh dấu hoàn thành bài học và nhận +100 XP
- `POST /api/curriculum/progress/:unitId/quiz-submit` - Nộp bài trắc nghiệm độc lập

### 6.3 Staff & Admin (Quản lý)
- `POST/PUT/DELETE /api/curriculum/chapters` - Quản lý Chương học
- `POST/PUT/DELETE /api/curriculum/units` - Quản lý Bài học lý thuyết
- `POST/PUT/DELETE /api/curriculum/quizzes` - Quản lý Ngân hàng câu hỏi trắc nghiệm

### 6.4 Teacher (Duyệt bài)
- `PUT /api/curriculum/units/:id/approve` - Phê duyệt bài lý thuyết xuất bản
- `PUT /api/curriculum/units/:id/reject` - Từ chối bài lý thuyết kèm lý do góp ý

---

## 7. Tiến độ học tập & Gamification

* **UserProgress** (`userprogresses`):
  * Cập nhật thêm mảng `completedUnits[]` (chứa ID các StudyUnit lý thuyết đã học).
  * Mảng `quizPerformances[]` ghi nhận điểm số của các Quiz độc lập.
* **Quy tắc cộng điểm kinh nghiệm (XP)**:
  * Đọc và hoàn thành 1 bài lý thuyết StudyUnit: **+100 XP**
  * Vượt qua Quiz trắc nghiệm độc lập (đạt >= passScore%): **+150 XP**

---

## 8. Luồng dữ liệu Client (Web & Mobile)

* **Trên Web**:
  * Học sinh vào học lý thuyết tại route `/study` (Xem danh sách chương → chọn bài học → hiển thị danh sách block → làm quiz nhúng hoặc nghe podcast).
  * Giáo viên duyệt bài tại `/teacher` (Xem danh sách game cần duyệt, danh sách bài học lý thuyết cần duyệt).
* **Trên Mobile**:
  * Học sinh chơi game 2D (gọi API `/api/lessons` trỏ về collection `games` bình thường).
  * Có thể mở rộng gọi API `/api/curriculum` để hiển thị bài học lý thuyết ngay trên app.

---

## 9. Kế hoạch triển khai từng bước

1. **Bước 1 (Dọn dẹp & Tách nhỏ code)**:
   * Tiến hành chia tách tệp `client/app/staff/page.tsx` thành các Component Tab riêng biệt (`GameTab.tsx`, `PodcastTab.tsx`...).
2. **Bước 2 (Thiết lập Database & API Backend)**:
   * Tạo các Mongoose Schema mới cho `Chapter`, `StudyUnit`, `Quiz`.
   * Viết các Controller và Routes phục vụ API CRUD cho phía Staff và API lấy dữ liệu cho phía Học sinh.
3. **Bước 3 (Giao diện Quản lý phía Staff)**:
   * Phát triển Tab `ChapterTab` và `StudyUnitTab` tích hợp vào Dashboard của Staff.
   * Xây dựng trình soạn thảo đơn giản cho phép sắp xếp mảng `contentBlocks`.
4. **Bước 4 (Giao diện Học sinh và Giáo viên duyệt)**:
   * Phát triển trang xem bài học lý thuyết cho học sinh trên Web/Mobile.
   * Cập nhật trang Duyệt bài của Giáo viên để hiển thị duyệt cả Game 2D lẫn Bài học lý thuyết mới.
