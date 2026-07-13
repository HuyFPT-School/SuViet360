import type { BlogPost, BlogReport } from "@/types/blog";

export type Tileset = { name: string; imageUrl: string };

export type SpriteFrame = { key: string; frame: number; imageUrl: string };

export type LessonGame = {
  tilemapJsonUrl: string;
  tilesets: Tileset[];
  character: { animations: Record<string, SpriteFrame[]> };
  spawnPoint: { x: number; y: number };
};

export type Lesson = {
  _id: string;
  title: string;
  content: string;
  status?: "Pending_Review" | "Published" | "Rejected";
  reviewFeedback?: string;
  game: LessonGame;
  createdAt: string;
  updatedAt: string;
  pendingDraft?: any;
};

export type FormMode = "create" | "edit";

export type LessonFormState = {
  title: string;
  content: string;
  spawnX: string;
  spawnY: string;
  tilesetNames: string[];
  tilemapFile: File | null;
  tilesetFiles: File[];
  idleSprites: File[];
  runSprites: File[];
};

export const emptyFormState: LessonFormState = {
  title: "",
  content: "",
  spawnX: "100",
  spawnY: "100",
  tilesetNames: [],
  tilemapFile: null,
  tilesetFiles: [],
  idleSprites: [],
  runSprites: [],
};

export type Podcast = {
  _id: string;
  title: string;
  description: string;
  content: string;
  thumbnail: string;
  audioUrl: string;
  level: string;
  category: string;
  status: "Draft" | "Pending_Review" | "Published" | "Rejected";
  reviewFeedback?: string;
  viewCount: number;
  lessonId?: string | Lesson | null;
  createdAt: string;
  updatedAt: string;
  pendingDraft?: any;
  createdBy?: any;
  podcastRequest?: { _id: string; requester: { name: string; email: string }; title: string } | null;
};

export type PodcastFormState = {
  title: string;
  description: string;
  content: string;
  level: string;
  category: string;
  lessonId: string;
  thumbnailFile: File | null;
  audioFile: File | null;
};

export const emptyPodcastForm: PodcastFormState = {
  title: "",
  description: "",
  content: "",
  level: "Medium",
  category: "",
  lessonId: "",
  thumbnailFile: null,
  audioFile: null,
};
