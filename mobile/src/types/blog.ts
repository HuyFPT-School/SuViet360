export interface BlogPostAuthor {
  _id: string;
  name: string;
  avatar?: string;
  role: string;
}

export interface BlogImage {
  url: string;
  publicId: string;
}

export interface BlogPost {
  _id: string;
  author: BlogPostAuthor;
  title: string;
  content: string;
  images: BlogImage[];
  category: string;
  tags: string[];
  status: 'Pending_Review' | 'Published' | 'Rejected';
  reviewFeedback: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlogComment {
  _id: string;
  post: string;
  author: BlogPostAuthor;
  content: string;
  parentComment: string | null;
  likeCount: number;
  status: 'Visible' | 'Hidden' | 'Removed';
  replies?: BlogComment[];
  createdAt: string;
  updatedAt: string;
}

export interface BlogReport {
  _id: string;
  reporter: BlogPostAuthor;
  targetType: 'Post' | 'Comment';
  targetId: string;
  reason: 'Spam' | 'Offensive_Language' | 'Historical_Inaccuracy' | 'Harassment' | 'Other';
  description?: string;
  status: 'Pending' | 'Resolved_Deleted' | 'Resolved_Dismissed';
  resolvedBy?: BlogPostAuthor;
  resolvedAt?: string;
  createdAt: string;
  target?: any;
}

export interface PaginatedPostsResponse {
  success: boolean;
  count: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  data: BlogPost[];
}
