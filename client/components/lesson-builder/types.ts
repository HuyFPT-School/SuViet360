/* ═══════════════════════════════════════════════════════════════
   Lesson Builder — Shared Types
   ═══════════════════════════════════════════════════════════════ */

export type ContentBlockType =
  | "text" | "image" | "audio" | "video" | "timeline"
  | "quote" | "map" | "document" | "game" | "quiz" | "podcast";

export type ContentBlock = {
  type: ContentBlockType;
  data: Record<string, any>;
  order: number;
  _imageFile?: File;
  _audioFile?: File;
};

export type LessonPartData = {
  _id?: string;
  title: string;
  lessonId: string;
  order: number;
  learningObjective: string;
  estimatedMinutes: number;
  contentBlocks: ContentBlock[];
  status?: string;
};

export type LessonRef = {
  _id: string; title: string; chapter?: { title: string; grade: number } | null;
  grade?: number; status?: string;
};

export type PodcastRef = {
  _id: string; title: string; thumbnail: string; audioUrl: string;
  level: string; category: string; status: string;
};

export type GameRef = {
  _id: string; title: string; gameType: string; thumbnail: string; status: string;
};

/* ═══════════════════════════════════════════════════════════════
   Block type registry
   ═══════════════════════════════════════════════════════════════ */

export const BLOCK_TYPES: { type: ContentBlockType; label: string; desc: string; color: string }[] = [
  { type: "text",      label: "Van ban",     desc: "Noi dung giang bai",         color: "#8B6914" },
  { type: "image",     label: "Hinh anh",    desc: "Anh minh hoa + chu thich",  color: "#A07830" },
  { type: "podcast",   label: "Podcast",     desc: "Chon podcast co san",       color: "#9B6B2F" },
  { type: "audio",     label: "Am thanh",    desc: "Upload file MP3",           color: "#8B6914" },
  { type: "video",     label: "Video",       desc: "Link YouTube / Vimeo",      color: "#7A5A28" },
  { type: "game",      label: "Tro choi",    desc: "Game Phaser tuong tac",     color: "#6B4F10" },
  { type: "quiz",      label: "Cau do",      desc: "Bo cau hoi trac nghiem",    color: "#8B6914" },
  { type: "timeline",  label: "Dong thoi gian", desc: "Su kien theo moc",       color: "#9B6B2F" },
  { type: "quote",     label: "Trich dan",   desc: "Loi trich dan noi bat",     color: "#A07830" },
  { type: "map",       label: "Ban do",      desc: "Ban do tuong tac",          color: "#8B6914" },
  { type: "document",  label: "Tai lieu",    desc: "Link PDF / tham khao",      color: "#7A5A28" },
];

export function emptyBlock(type: ContentBlockType, order: number): ContentBlock {
  const defaults: Record<string, any> = {
    text: { text: "" }, image: { imageUrl: "", caption: "" }, audio: { audioUrl: "", title: "" },
    video: { url: "", title: "" }, timeline: { events: [{ date: "", title: "", description: "" }] },
    quote: { text: "", author: "" }, map: { embedUrl: "", title: "" },
    document: { title: "", url: "", description: "" }, game: { gameId: "", label: "" },
    quiz: { quizId: "", label: "" }, podcast: { podcastId: "", label: "" },
  };
  return { type, data: defaults[type] || {}, order, _imageFile: undefined, _audioFile: undefined };
}
