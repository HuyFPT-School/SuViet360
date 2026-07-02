/* ═══════════════════════════════════════════════════════════════
   Staff — Shared Types
   ═══════════════════════════════════════════════════════════════ */

export type Tileset = { name: string; imageUrl: string };
export type SpriteFrame = { key: string; frame: number; imageUrl: string };

export type LessonGame = {
  tilemapJsonUrl: string;
  tilesets: Tileset[];
  character: { animations: Record<string, SpriteFrame[]> };
  spawnPoint: { x: number; y: number };
};

export type Chapter = {
  _id: string; title: string; description: string; grade: number; order: number;
  coverImage: string; status: "Draft" | "Published"; lessonCount?: number;
  createdAt: string; updatedAt: string;
};

export type Lesson = {
  _id: string; title: string; content: string;
  status?: "Pending_Review" | "Published" | "Rejected"; reviewFeedback?: string;
  game: LessonGame;
  chapterId?: string | null; chapter?: { _id: string; title: string; grade: number } | null;
  grade?: number | null; order?: number;
  podcast?: LessonPodcast | null; podcastId?: string | null;
  createdAt: string; updatedAt: string;
};

export type LessonPodcast = {
  _id: string; title: string; thumbnail: string; audioUrl: string;
  level: string; category: string; status: string; duration: number;
};

export type Podcast = {
  _id: string; title: string; description: string; content: string;
  thumbnail: string; audioUrl: string; level: string; category: string;
  status: "Draft" | "Pending_Review" | "Published" | "Rejected"; reviewFeedback?: string;
  viewCount: number; lessonId?: string | Lesson | null; duration: number;
  createdAt: string; updatedAt: string;
};

export type LessonPart = {
  _id?: string; title: string; lessonId?: string;
  order: number; learningObjective: string; estimatedMinutes: number;
  contentBlocks: ContentBlock[];
  podcastId?: string; status?: string;
};

export type ContentBlock = {
  type: "text" | "image";
  data: { text?: string; imageUrl?: string; caption?: string };
  order: number;
  _imageFile?: File;
};

export type LessonFormState = {
  title: string; content: string; chapterId: string; grade: string; order: string;
  spawnX: string; spawnY: string;
  tilemapFile: File | null; tilesetFiles: File[]; tilesetNames: string[];
  idleSprites: File[]; runSprites: File[];
};

export type PodcastFormState = {
  title: string; description: string; content: string;
  level: string; category: string; lessonId: string;
  thumbnailFile: File | null; audioFile: File | null;
};

export type ChapterFormState = {
  title: string; description: string; grade: string; order: string;
  status: "Draft" | "Published";
};
