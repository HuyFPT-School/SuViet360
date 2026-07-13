const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const Podcast = require("../models/Podcast");
const PodcastNote = require("../models/PodcastNote");
const PodcastComment = require("../models/PodcastComment");
const Lesson = require("../models/Lesson");
const {
  uploadPodcastThumbnail,
  uploadPodcastAudio,
  deleteCloudinaryResource,
} = require("../services/cloudinaryService");
const {
  getCachePayload,
  setCachePayload,
  getCacheETag,
  setCacheETag,
  deleteCache,
  deleteCacheByPattern,
  LIST_TTL,
  DETAIL_TTL,
} = require("../utils/cache");

// ─── Cache Key Helpers ────────────────────────────────────────────

/**
 * So sánh ETag an toàn (xử lý cả trường hợp có/không dấu "", W/ prefix)
 */
const etagMatch = (clientETag, storedETag) => {
  if (!clientETag) return false;
  const a = clientETag.replace(/^W\//, "").replace(/^"|"$/g, "");
  const b = storedETag.replace(/^"|"$/g, "");
  return a === b;
};

const podcastListKey = (query = {}) => {
  const parts = ["podcasts:list"];
  if (query.page) parts.push(`p:${query.page}`);
  if (query.limit) parts.push(`l:${query.limit}`);
  if (query.level) parts.push(`lv:${query.level}`);
  if (query.category) parts.push(`cat:${query.category}`);
  if (query.keyword) parts.push(`kw:${query.keyword}`);
  if (query.sort) parts.push(`sort:${query.sort}`);
  return parts.join(":");
};

const podcastDetailKey = (id) => `podcast:${id}`;

/**
 * Invalidate tất cả cache liên quan đến Podcast khi có thay đổi.
 */
const invalidatePodcastCache = async (podcastId = null) => {
  // Xoá toàn bộ cache list (mọi filter/page) + etag keys
  await deleteCacheByPattern("podcasts:list*");
  // Xoá cache detail của podcast cụ thể (nếu có) + etag key
  if (podcastId) {
    await Promise.all([
      deleteCache(podcastDetailKey(podcastId)),
      deleteCache(`${podcastDetailKey(podcastId)}:etag`),
    ]);
  }
};

// ─── Staff Podcast CRUD ──────────────────────────────────────────────

// Create Podcast
const createPodcast = asyncHandler(async (req, res) => {
  const { title, description, content, level, category, lessonId } = req.body;

  if (!title) {
    throw new AppError("Title is required", 400);
  }

  if (!req.files || !req.files.thumbnail || !req.files.audio) {
    throw new AppError("Both thumbnail and audio files are required", 400);
  }

  const thumbnailFile = req.files.thumbnail[0];
  const audioFile = req.files.audio[0];

  // Upload thumbnail
  const thumbResult = await uploadPodcastThumbnail(thumbnailFile.buffer);

  // Upload audio
  const audioResult = await uploadPodcastAudio(audioFile.buffer);

  const cleanLessonId = (id) => {
    if (!id || id === "null" || id === "undefined" || id.trim() === "") {
      return null;
    }
    return id;
  };

  const cleanedLessonId = cleanLessonId(lessonId);
  if (cleanedLessonId) {
    const linkedLesson = await Lesson.findById(cleanedLessonId);
    if (!linkedLesson) {
      throw new AppError("Linked lesson not found", 404);
    }
    if (linkedLesson.status !== "Published") {
      throw new AppError("Only approved (Published) lessons can be linked to a podcast", 400);
    }
  }

  const podcast = await Podcast.create({
    title,
    description,
    content,
    level,
    category: category || "Chủ đề chung",
    lessonId: cleanedLessonId,
    thumbnail: thumbResult.secure_url,
    thumbnailPublicId: thumbResult.public_id,
    audioUrl: audioResult.secure_url,
    audioPublicId: audioResult.public_id,
    duration: audioResult.duration || 0,
    createdBy: req.user.id,
    status: "Pending_Review",
    reviewFeedback: "",
  });

  // Invalidate list cache vì có podcast mới
  await invalidatePodcastCache();

  res.status(201).json({
    success: true,
    data: podcast,
  });
});

// Update Podcast
const updatePodcast = asyncHandler(async (req, res) => {
  const podcast = await Podcast.findById(req.params.id);

  if (!podcast) {
    throw new AppError("Podcast not found", 404);
  }

  // Teacher permission check: can only edit their own podcasts
  if (req.user.role === "teacher" && podcast.createdBy.toString() !== req.user._id.toString()) {
    throw new AppError("Bạn không được phép chỉnh sửa podcast của người khác", 403);
  }

  // Staff permission check: cannot edit teacher's podcasts
  const User = require("../models/User");
  const creatorUser = await User.findById(podcast.createdBy);
  if (creatorUser && creatorUser.role === "teacher" && req.user.role === "staff") {
    throw new AppError("Bạn không được phép chỉnh sửa podcast do Giáo viên tạo", 403);
  }

  const { title, description, content, level, category, lessonId } = req.body;

  const cleanLessonId = (id) => {
    if (!id || id === "null" || id === "undefined" || id.trim() === "") {
      return null;
    }
    return id;
  };

  // Validate lessonId if provided
  let validatedLessonId;
  if (lessonId !== undefined) {
    const cleanedLessonId = cleanLessonId(lessonId);
    if (cleanedLessonId) {
      const linkedLesson = await Lesson.findById(cleanedLessonId);
      if (!linkedLesson) {
        throw new AppError("Linked lesson not found", 404);
      }
      if (linkedLesson.status !== "Published") {
        throw new AppError("Only approved (Published) lessons can be linked to a podcast", 400);
      }
    }
    validatedLessonId = cleanedLessonId;
  }

  // ── If podcast is Published → save to pendingDraft ──
  if (podcast.status === "Published") {
    const draft = { updatedAt: new Date() };

    if (title !== undefined) draft.title = title;
    if (description !== undefined) draft.description = description;
    if (content !== undefined) draft.content = content;
    if (level !== undefined) draft.level = level;
    if (category !== undefined) draft.category = category;
    if (lessonId !== undefined) draft.lessonId = validatedLessonId;

    // Upload new thumbnail WITHOUT deleting old one
    if (req.files && req.files.thumbnail) {
      const thumbnailFile = req.files.thumbnail[0];
      const thumbResult = await uploadPodcastThumbnail(thumbnailFile.buffer);
      draft.thumbnail = thumbResult.secure_url;
      draft.thumbnailPublicId = thumbResult.public_id;
    }

    // Upload new audio WITHOUT deleting old one
    if (req.files && req.files.audio) {
      const audioFile = req.files.audio[0];
      const audioResult = await uploadPodcastAudio(audioFile.buffer);
      draft.audioUrl = audioResult.secure_url;
      draft.audioPublicId = audioResult.public_id;
      draft.duration = audioResult.duration || 0;
    }

    podcast.pendingDraft = draft;
    podcast.markModified("pendingDraft");
    await podcast.save();

    await invalidatePodcastCache(req.params.id);

    return res.status(200).json({
      success: true,
      data: podcast,
    });
  }

  // ── Not Published → direct update (existing behavior) ──
  if (title !== undefined) podcast.title = title;
  if (description !== undefined) podcast.description = description;
  if (content !== undefined) podcast.content = content;
  if (level !== undefined) podcast.level = level;
  if (category !== undefined) podcast.category = category;
  podcast.status = "Pending_Review";
  podcast.reviewFeedback = "";
  if (lessonId !== undefined) {
    podcast.lessonId = validatedLessonId;
  }

  // Check if new thumbnail file is provided
  if (req.files && req.files.thumbnail) {
    const thumbnailFile = req.files.thumbnail[0];
    
    // Delete old thumbnail
    if (podcast.thumbnailPublicId) {
      await deleteCloudinaryResource(podcast.thumbnailPublicId, "image");
    }

    // Upload new
    const thumbResult = await uploadPodcastThumbnail(thumbnailFile.buffer);
    podcast.thumbnail = thumbResult.secure_url;
    podcast.thumbnailPublicId = thumbResult.public_id;
  }

  // Check if new audio file is provided
  if (req.files && req.files.audio) {
    const audioFile = req.files.audio[0];

    // Delete old audio
    if (podcast.audioPublicId) {
      await deleteCloudinaryResource(podcast.audioPublicId, "video");
    }

    // Upload new
    const audioResult = await uploadPodcastAudio(audioFile.buffer);
    podcast.audioUrl = audioResult.secure_url;
    podcast.audioPublicId = audioResult.public_id;
    podcast.duration = audioResult.duration || 0;
  }

  await podcast.save();

  // Invalidate cache của podcast này + list
  await invalidatePodcastCache(req.params.id);

  res.status(200).json({
    success: true,
    data: podcast,
  });
});

// Delete Podcast
const deletePodcast = asyncHandler(async (req, res) => {
  const podcast = await Podcast.findById(req.params.id);

  if (!podcast) {
    throw new AppError("Podcast not found", 404);
  }

  // Teacher permission check: can only delete their own podcasts
  if (req.user.role === "teacher" && podcast.createdBy.toString() !== req.user._id.toString()) {
    throw new AppError("Bạn không được phép xóa podcast của người khác", 403);
  }

  // Staff permission check: cannot delete teacher's podcasts
  const User = require("../models/User");
  const creatorUser = await User.findById(podcast.createdBy);
  if (creatorUser && creatorUser.role === "teacher" && req.user.role === "staff") {
    throw new AppError("Bạn không được phép xóa podcast do Giáo viên tạo", 403);
  }

  // Delete assets from Cloudinary
  if (podcast.thumbnailPublicId) {
    await deleteCloudinaryResource(podcast.thumbnailPublicId, "image");
  }
  if (podcast.audioPublicId) {
    await deleteCloudinaryResource(podcast.audioPublicId, "video");
  }

  // Delete pending draft assets from Cloudinary (Issue #4)
  if (podcast.pendingDraft) {
    if (podcast.pendingDraft.thumbnailPublicId) {
      await deleteCloudinaryResource(podcast.pendingDraft.thumbnailPublicId, "image");
    }
    if (podcast.pendingDraft.audioPublicId) {
      await deleteCloudinaryResource(podcast.pendingDraft.audioPublicId, "video");
    }
  }

  // Clean UserProgress references
  const UserProgress = require("../models/UserProgress");
  await UserProgress.updateMany(
    {},
    {
      $pull: { completedPodcasts: req.params.id },
    }
  );

  // Clean XP History
  const XPHistory = require("../models/XPHistory");
  await XPHistory.deleteMany({ source: "Podcast", sourceId: req.params.id });

  // Delete from DB
  await Podcast.findByIdAndDelete(req.params.id);

  // Also delete associated notes and comments
  const PodcastNote = require("../models/PodcastNote");
  const PodcastComment = require("../models/PodcastComment");
  await PodcastNote.deleteMany({ podcastId: req.params.id });
  await PodcastComment.deleteMany({ podcastId: req.params.id });

  // Invalidate cache
  await invalidatePodcastCache(req.params.id);

  res.status(200).json({
    success: true,
    message: "Podcast deleted successfully",
  });
});

// Get all podcasts for management (Staff)
const getStaffPodcasts = asyncHandler(async (req, res) => {
  const podcasts = await Podcast.find()
    .populate("lessonId")
    .populate("createdBy", "name email role")
    .sort({ createdAt: -1 });

  const PodcastRequest = require("../models/PodcastRequest");
  const podcastIds = podcasts.map(p => p._id);
  const requests = await PodcastRequest.find({ resultPodcastId: { $in: podcastIds } })
    .populate("requesterId", "name email")
    .lean();

  const podcastsWithRequests = podcasts.map(p => {
    const pObj = p.toObject();
    const matchedRequest = requests.find(r => r.resultPodcastId && r.resultPodcastId.toString() === p._id.toString());
    if (matchedRequest) {
      pObj.podcastRequest = {
        _id: matchedRequest._id,
        requester: matchedRequest.requesterId,
        title: matchedRequest.title,
      };
    }
    return pObj;
  });

  res.status(200).json({
    success: true,
    count: podcastsWithRequests.length,
    data: podcastsWithRequests,
  });
});

// Get single podcast for management (Staff)
const getStaffPodcastById = asyncHandler(async (req, res) => {
  const podcast = await Podcast.findById(req.params.id)
    .populate("lessonId")
    .populate("createdBy", "name email");

  if (!podcast) {
    throw new AppError("Podcast not found", 404);
  }

  res.status(200).json({
    success: true,
    data: podcast,
  });
});


// ─── Standalone Cloudinary Uploads (Staff Only) ──────────────────────

// Upload Image Endpoint
const uploadImageOnly = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("No image file uploaded", 400);
  }
  const result = await uploadPodcastThumbnail(req.file.buffer);
  res.status(200).json({
    url: result.secure_url,
  });
});

// Upload Audio Endpoint
const uploadAudioOnly = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("No audio file uploaded", 400);
  }
  const result = await uploadPodcastAudio(req.file.buffer);
  res.status(200).json({
    url: result.secure_url,
  });
});


// ─── User Podcast API ────────────────────────────────────────────────

// Get all podcasts (Public)
const getAllPodcasts = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  const queryObj = { status: { $in: ["Published", true] } };

  if (req.query.level) {
    queryObj.level = req.query.level;
  }

  if (req.query.category) {
    queryObj.category = req.query.category;
  }

  if (req.query.keyword) {
    queryObj.title = { $regex: req.query.keyword, $options: "i" };
  }

  let sortObj = { createdAt: -1 };
  if (req.query.sort === "views") {
    sortObj = { viewCount: -1 };
  } else if (req.query.sort === "oldest") {
    sortObj = { createdAt: 1 };
  }

  // ── Determine current user and enforce privacy checks ──
  const jwt = require("jsonwebtoken");
  const env = require("../config/env");
  const User = require("../models/User");
  const { getCookie } = require("../utils/cookies");

  let currentUser = null;
  const token = getCookie(req, "token");
  if (token) {
    try {
      const decoded = jwt.verify(token, env.jwtSecret);
      currentUser = await User.findById(decoded.id);
    } catch (err) {
      // Ignore
    }
  }

  // Enforce privacy: Public listing only returns public podcasts.
  // Private requests are accessed exclusively through direct links from the student's request dashboard.
  queryObj.isPrivate = { $ne: true };
  const bypassCache = false;

  // ── Redis Cache (2-step: ETag check nhỏ → body chỉ khi cần) ─
  const cacheKey = podcastListKey(req.query);

  if (!bypassCache) {
    // Bước 1: Chỉ đọc ETag (~50 bytes, cực nhanh)
    let cachedETag = await getCacheETag(cacheKey);
    if (cachedETag && etagMatch(req.headers["if-none-match"], cachedETag)) {
      return res
        .set("Cache-Control", "no-cache")
        .status(304)
        .end();
    }

    // Bước 2: ETag key chưa có hoặc không khớp → đọc full body
    const payload = await getCachePayload(cacheKey);
    if (payload) {
      if (!cachedETag) {
        await setCacheETag(cacheKey, payload.etag);
      }
      if (etagMatch(req.headers["if-none-match"], payload.etag)) {
        return res
          .set("Cache-Control", "no-cache")
          .status(304)
          .end();
      }
      return res
        .status(200)
        .set("Cache-Control", "no-cache")
        .set("ETag", payload.etag)
        .type("json")
        .send(payload.body);
    }
  }

  // ────────────────────────────────────────────────────────────

  const podcasts = await Podcast.find(queryObj)
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  const total = await Podcast.countDocuments(queryObj);

  const responseData = {
    success: true,
    count: podcasts.length,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
    data: podcasts,
  };

  // Lưu cache kèm ETag nếu không bypass (không await để không block response)
  if (!bypassCache) {
    setCachePayload(cacheKey, responseData);
  }

  res
    .set("Cache-Control", "no-cache")
    .status(200)
    .json(responseData);
});

// Get single podcast by ID (Public)
const getPodcastById = asyncHandler(async (req, res) => {
  const cacheKey = podcastDetailKey(req.params.id);

  // ── Determine current user and enforce privacy checks ──
  const jwt = require("jsonwebtoken");
  const env = require("../config/env");
  const User = require("../models/User");
  const { getCookie } = require("../utils/cookies");

  let currentUser = null;
  const token = getCookie(req, "token");
  if (token) {
    try {
      const decoded = jwt.verify(token, env.jwtSecret);
      currentUser = await User.findById(decoded.id);
    } catch (err) {
      // Ignore
    }
  }

  // Pre-load podcast to verify status & privacy
  const checkPodcast = await Podcast.findById(req.params.id);
  if (!checkPodcast) {
    throw new AppError("Podcast not found", 404);
  }

  // Enforce privacy (allowedUsers or admin/staff/teacher)
  if (checkPodcast.isPrivate) {
    const isAllowed = currentUser && (
      ["admin", "staff", "teacher"].includes(currentUser.role) ||
      checkPodcast.allowedUsers.some(uid => uid.toString() === currentUser._id.toString())
    );
    if (!isAllowed) {
      throw new AppError("Bạn không có quyền truy cập podcast riêng tư này", 403);
    }
  }

  const bypassCache = checkPodcast.isPrivate;

  if (!bypassCache) {
    // ── Redis Cache (2-step: ETag check nhỏ → body chỉ khi cần) ─
    let cachedETag = await getCacheETag(cacheKey);
    if (cachedETag && etagMatch(req.headers["if-none-match"], cachedETag)) {
      // Vẫn tăng viewCount ngầm
      Podcast.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).catch(() => {});
      return res
        .set("Cache-Control", "no-cache")
        .status(304)
        .end();
    }

    const payload = await getCachePayload(cacheKey);
    if (payload) {
      Podcast.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).catch(() => {});
      if (!cachedETag) await setCacheETag(cacheKey, payload.etag);
      if (etagMatch(req.headers["if-none-match"], payload.etag)) {
        return res
          .set("Cache-Control", "no-cache")
          .status(304)
          .end();
      }
      return res
        .status(200)
        .set("Cache-Control", "no-cache")
        .set("ETag", payload.etag)
        .type("json")
        .send(payload.body);
    }
  }
  // ────────────────────────────────────────────────────────────

  const podcast = await Podcast.findOneAndUpdate(
    { _id: req.params.id, status: { $in: ["Published", true] } },
    { $inc: { viewCount: 1 } },
    { new: true }
  ).populate({
    path: "lessonId",
    match: { status: "Published" },
  });

  if (!podcast) {
    throw new AppError("Podcast not found", 404);
  }

  const responseData = {
    success: true,
    data: podcast,
  };

  // Lưu cache kèm ETag (TTL ngắn hơn vì có viewCount) nếu không bypass
  if (!bypassCache) {
    setCachePayload(cacheKey, responseData, DETAIL_TTL);
  }

  res
    .set("Cache-Control", "no-cache")
    .status(200)
    .json(responseData);
});


// ─── User Notes API ──────────────────────────────────────────────────

// Get Notes for a Podcast (Authenticated)
const getNotes = asyncHandler(async (req, res) => {
  const notes = await PodcastNote.find({
    podcastId: req.params.podcastId,
    userId: req.user.id,
  }).sort({ timestamp: 1 });

  res.status(200).json({
    success: true,
    count: notes.length,
    data: notes,
  });
});

// Create Note (Authenticated)
const createNote = asyncHandler(async (req, res) => {
  const { podcastId, content, timestamp } = req.body;

  if (!podcastId || !content || timestamp === undefined) {
    throw new AppError("Podcast ID, content, and timestamp are required", 400);
  }

  const note = await PodcastNote.create({
    podcastId,
    userId: req.user.id,
    content,
    timestamp: Number(timestamp),
  });

  res.status(201).json({
    success: true,
    data: note,
  });
});

// Delete Note (Authenticated)
const deleteNote = asyncHandler(async (req, res) => {
  const note = await PodcastNote.findById(req.params.id);

  if (!note) {
    throw new AppError("Note not found", 404);
  }

  // Ensure note belongs to user
  if (note.userId.toString() !== req.user.id) {
    throw new AppError("Not authorized to delete this note", 403);
  }

  await PodcastNote.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Note deleted successfully",
  });
});


// ─── User Comments API ───────────────────────────────────────────────

// Get Comments (Public)
const getComments = asyncHandler(async (req, res) => {
  const comments = await PodcastComment.find({
    podcastId: req.params.podcastId,
  })
    .populate("userId", "name avatar")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: comments.length,
    data: comments,
  });
});

// Helper to sanitize html tags (Issue #17)
const sanitizeInput = (text) => {
  if (typeof text !== "string") return text;
  return text.replace(/<[^>]*>/g, "");
};

// Create Comment (Authenticated)
const createComment = asyncHandler(async (req, res) => {
  const { podcastId, content } = req.body;

  if (!podcastId || !content) {
    throw new AppError("Podcast ID and content are required", 400);
  }

  const sanitizedContent = sanitizeInput(content.trim());

  let comment = await PodcastComment.create({
    podcastId,
    userId: req.user.id,
    content: sanitizedContent,
  });

  // Populate user details for response
  comment = await comment.populate("userId", "name avatar");

  res.status(201).json({
    success: true,
    data: comment,
  });
});

// Delete Comment (Authenticated)
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await PodcastComment.findById(req.params.id);

  if (!comment) {
    throw new AppError("Comment not found", 404);
  }

  // Allow deletion if the user is the author OR if the user is a staff or admin
  const isAuthor = comment.userId.toString() === req.user.id;
  const isStaffOrAdmin = ["staff", "admin"].includes(req.user.role);

  if (!isAuthor && !isStaffOrAdmin) {
    throw new AppError("Not authorized to delete this comment", 403);
  }

  await PodcastComment.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Comment deleted successfully",
  });
});

// Update Note (Authenticated)
const updateNote = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    throw new AppError("Content is required", 400);
  }

  const note = await PodcastNote.findById(req.params.id);

  if (!note) {
    throw new AppError("Note not found", 404);
  }

  // Ensure note belongs to user
  if (note.userId.toString() !== req.user.id) {
    throw new AppError("Not authorized to update this note", 403);
  }

  note.content = content;
  await note.save();

  res.status(200).json({
    success: true,
    data: note,
  });
});

// Update Comment (Authenticated)
const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    throw new AppError("Content is required", 400);
  }

  const comment = await PodcastComment.findById(req.params.id);

  if (!comment) {
    throw new AppError("Comment not found", 404);
  }

  // Ensure comment belongs to user (only authors can edit comments)
  if (comment.userId.toString() !== req.user.id) {
    throw new AppError("Not authorized to update this comment", 403);
  }

  comment.content = sanitizeInput(content.trim());
  await comment.save();

  // Populate user info for frontend response consistency
  const populatedComment = await PodcastComment.findById(comment._id).populate("userId", "name avatar");

  res.status(200).json({
    success: true,
    data: populatedComment,
  });
});

// Approve Podcast (Teacher/Admin)
const approvePodcast = asyncHandler(async (req, res) => {
  const podcast = await Podcast.findById(req.params.id);

  if (!podcast) {
    throw new AppError("Podcast not found", 404);
  }

  // If there's a pending draft, apply it
  if (podcast.pendingDraft) {
    const draft = podcast.pendingDraft;

    // Apply text fields from draft
    if (draft.title !== undefined) podcast.title = draft.title;
    if (draft.description !== undefined) podcast.description = draft.description;
    if (draft.content !== undefined) podcast.content = draft.content;
    if (draft.level !== undefined) podcast.level = draft.level;
    if (draft.category !== undefined) podcast.category = draft.category;
    if (draft.lessonId !== undefined) podcast.lessonId = draft.lessonId;

    // Apply thumbnail (delete old, use new from draft)
    if (draft.thumbnail) {
      if (podcast.thumbnailPublicId) {
        await deleteCloudinaryResource(podcast.thumbnailPublicId, "image");
      }
      podcast.thumbnail = draft.thumbnail;
      podcast.thumbnailPublicId = draft.thumbnailPublicId;
    }

    // Apply audio (delete old, use new from draft)
    if (draft.audioUrl) {
      if (podcast.audioPublicId) {
        await deleteCloudinaryResource(podcast.audioPublicId, "video");
      }
      podcast.audioUrl = draft.audioUrl;
      podcast.audioPublicId = draft.audioPublicId;
      if (draft.duration !== undefined) podcast.duration = draft.duration;
    }

    // Clear draft
    podcast.pendingDraft = null;
    podcast.markModified("pendingDraft");
  }

  podcast.status = "Published";
  podcast.reviewFeedback = "";
  await podcast.save();

  // Status thay đổi → invalidate cả list lẫn detail
  await invalidatePodcastCache(req.params.id);

  // Gửi thông báo cho những người dùng theo dõi chủ đề này
  try {
    const User = require("../models/User");
    const Notification = require("../models/Notification");
    const { redisClient, isRedisReady } = require("../config/redis");

    const followers = await User.find({ followedCategories: podcast.category }).select("_id");
    
      // 1. Kiểm tra và lọc người dùng đã được thông báo trước đó để tránh trùng lặp (Issue #5)
      const existing = await Notification.find({
        type: "New_Podcast",
        link: `/podcasts/${podcast._id}`
      }).select("recipient").lean();
      const existingRecipients = new Set(existing.map(n => n.recipient.toString()));

      const newFollowers = followers.filter(f => !existingRecipients.has(f._id.toString()));

      if (newFollowers.length > 0) {
        // 2. Batch insert thông báo bằng insertMany để tăng tốc độ (Issue #23)
        const docs = newFollowers.map((follower) => ({
          recipient: follower._id,
          type: "New_Podcast",
          title: "Bài học âm thanh mới!",
          message: `Chủ đề "${podcast.category}" vừa có podcast mới: "${podcast.title}"`,
          link: `/podcasts/${podcast._id}`,
        }));
        await Notification.insertMany(docs);
      }

      // 2. Publish tín hiệu sang Redis Pub/Sub để Socket Server truyền tải thời gian thực
      if (isRedisReady()) {
        await redisClient.publish(
          "notification:new_podcast",
          JSON.stringify({
            category: podcast.category,
            title: "Bài học âm thanh mới!",
            message: `Chủ đề "${podcast.category}" vừa có podcast mới: "${podcast.title}"`,
            link: `/podcasts/${podcast._id}`,
            podcastId: podcast._id,
          })
        );
      }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Notification] Failed to create or publish notification:", err.message);
  }

  res.status(200).json({
    success: true,
    data: podcast,
  });
});

// Reject Podcast (Teacher/Admin)
const rejectPodcast = asyncHandler(async (req, res) => {
  const { feedback } = req.body;

  if (!feedback) {
    throw new AppError("Feedback is required to reject a podcast", 400);
  }

  const podcast = await Podcast.findById(req.params.id);

  if (!podcast) {
    throw new AppError("Podcast not found", 404);
  }

  // If there's a pending draft, discard it (delete new Cloudinary assets)
  if (podcast.pendingDraft) {
    const draft = podcast.pendingDraft;

    if (draft.thumbnailPublicId) {
      await deleteCloudinaryResource(draft.thumbnailPublicId, "image");
    }
    if (draft.audioPublicId) {
      await deleteCloudinaryResource(draft.audioPublicId, "video");
    }

    podcast.pendingDraft = null;
    podcast.markModified("pendingDraft");
    podcast.reviewFeedback = feedback;
    // Keep Published status — old content stays visible
    await podcast.save();

    await invalidatePodcastCache(req.params.id);

    return res.status(200).json({
      success: true,
      data: podcast,
    });
  }

  // No draft → normal reject
  podcast.status = "Rejected";
  podcast.reviewFeedback = feedback;
  await podcast.save();

  // Status thay đổi → invalidate cả list lẫn detail
  await invalidatePodcastCache(req.params.id);

  res.status(200).json({
    success: true,
    data: podcast,
  });
});

// Rename category for all podcasts
const renameCategory = asyncHandler(async (req, res) => {
  const { oldCategory, newCategory } = req.body;

  if (!oldCategory || !newCategory || oldCategory.trim() === "" || newCategory.trim() === "") {
    throw new AppError("Tên chủ đề cũ và mới không được để trống", 400);
  }

  // Update all podcasts with the old category
  await Podcast.updateMany(
    { category: oldCategory.trim() },
    { category: newCategory.trim() }
  );

  // Invalidate all podcast caches
  await invalidatePodcastCache();

  res.status(200).json({
    success: true,
    message: `Đã đổi tên chủ đề từ "${oldCategory}" thành "${newCategory}" cho tất cả bài học âm thanh`,
  });
});

// Delete a category (resets to default "Chủ đề chung")
const deleteCategory = asyncHandler(async (req, res) => {
  const { category } = req.body;

  if (!category || category.trim() === "") {
    throw new AppError("Tên chủ đề cần xóa không được để trống", 400);
  }

  // Update all podcasts under this category to "Chủ đề chung"
  await Podcast.updateMany(
    { category: category.trim() },
    { category: "Chủ đề chung" }
  );

  // Invalidate all podcast caches
  await invalidatePodcastCache();

  res.status(200).json({
    success: true,
    message: `Đã xóa chủ đề "${category}". Các podcast liên quan đã được chuyển sang "Chủ đề chung"`,
  });
});

module.exports = {
  createPodcast,
  updatePodcast,
  deletePodcast,
  getStaffPodcasts,
  getStaffPodcastById,
  uploadImageOnly,
  uploadAudioOnly,
  getAllPodcasts,
  getPodcastById,
  getNotes,
  createNote,
  deleteNote,
  updateNote,
  getComments,
  createComment,
  deleteComment,
  updateComment,
  approvePodcast,
  rejectPodcast,
  renameCategory,
  deleteCategory,
};
