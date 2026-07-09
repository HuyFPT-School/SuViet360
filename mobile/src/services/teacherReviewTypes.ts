export type ReviewStatus = 'Pending_Review' | 'Published' | 'Rejected';
export type ReviewContentType = 'Lesson' | 'Podcast';

export type Tileset = {
  name: string;
  imageUrl: string;
};

export type SpriteFrame = {
  key: string;
  frame: number;
  imageUrl: string;
};

export type LessonGame = {
  tilemapJsonUrl: string;
  tilesets: Tileset[];
  character: {
    animations: Record<string, SpriteFrame[]>;
  };
  spawnPoint: {
    x: number;
    y: number;
  };
};

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
} | null;

export type PodcastDetails = {
  thumbnail: string;
  audioUrl: string;
  level: string;
  category: string;
  duration: number;
  lessonId?: any;
};

export type TeacherReviewItem = {
  id: string;
  title: string;
  type: ReviewContentType;
  createdBy: string;
  submittedAt: string;
  status: ReviewStatus;
  summary: string;
  game?: LessonGame;
  podcastDetails?: PodcastDetails;
  reviewFeedback?: string;
  reviewedBy?: UserSummary;
  reviewedAt?: string;
  isDraftUpdate?: boolean;
};

export const rejectionSuggestions = [
  'Nội dung chưa chính xác về mặt lịch sử',
  'Cần bổ sung thêm tài liệu tham khảo',
  'Hình ảnh/minh họa chưa phù hợp',
  'Văn phong chưa phù hợp với đối tượng học sinh',
  'Cần chỉnh sửa lỗi chính tả/ngữ pháp',
  'Bố cục bài học chưa hợp lý',
  'Cần cập nhật thông tin mới hơn',
];
