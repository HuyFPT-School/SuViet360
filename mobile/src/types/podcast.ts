export interface Podcast {
  _id: string;
  title: string;
  description: string;
  content?: string;
  thumbnail: string;
  audioUrl: string;
  level: string;
  category: string;
  duration: number;
  lessonId?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PodcastNote {
  _id: string;
  podcastId: string;
  content: string;
  timestamp: number;
  createdAt: string;
}

export interface PodcastComment {
  _id: string;
  podcastId: string;
  userId: {
    _id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
}
