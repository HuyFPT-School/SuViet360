export type ReviewStatus = 'Pending_Review' | 'Published' | 'Rejected';

export type Tileset = {
  name: string;
  imageUrl: string;
};

export type SpriteFrame = {
  key: string;
  frame: number;
  imageUrl: string;
};

export type LessonAnimationName =
  | 'idle'
  | 'run'
  | 'attack'
  | 'jump'
  | 'hurt'
  | 'dead';

export type LessonGame = {
  tilemapJsonUrl: string;
  tilesets: Tileset[];
  character: {
    animations: Partial<Record<LessonAnimationName, SpriteFrame[]>>;
  };
  spawnPoint: {
    x: number;
    y: number;
  };
};

export interface Lesson {
  _id: string;
  title: string;
  content: string;
  status?: ReviewStatus;
  reviewFeedback?: string;
  game: LessonGame;
  createdAt: string;
  updatedAt?: string;
}
