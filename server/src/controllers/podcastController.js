const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const Podcast = require("../models/Podcast");
const PodcastNote = require("../models/PodcastNote");
const PodcastComment = require("../models/PodcastComment");
const {
  uploadPodcastThumbnail,
  uploadPodcastAudio,
  deleteCloudinaryResource,
} = require("../services/cloudinaryService");

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

  const podcast = await Podcast.create({
    title,
    description,
    content,
    level,
    category: category || "Chủ đề chung",
    lessonId: cleanLessonId(lessonId),
    thumbnail: thumbResult.secure_url,
    thumbnailPublicId: thumbResult.public_id,
    audioUrl: audioResult.secure_url,
    audioPublicId: audioResult.public_id,
    duration: audioResult.duration || 0,
    createdBy: req.user.id,
    status: "Pending_Review",
    reviewFeedback: "",
  });

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

  const { title, description, content, level, category, lessonId } = req.body;

  const cleanLessonId = (id) => {
    if (!id || id === "null" || id === "undefined" || id.trim() === "") {
      return null;
    }
    return id;
  };

  if (title !== undefined) podcast.title = title;
  if (description !== undefined) podcast.description = description;
  if (content !== undefined) podcast.content = content;
  if (level !== undefined) podcast.level = level;
  if (category !== undefined) podcast.category = category;
  podcast.status = "Pending_Review";
  podcast.reviewFeedback = "";
  if (lessonId !== undefined) podcast.lessonId = cleanLessonId(lessonId);

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

  // Delete assets from Cloudinary
  if (podcast.thumbnailPublicId) {
    await deleteCloudinaryResource(podcast.thumbnailPublicId, "image");
  }
  if (podcast.audioPublicId) {
    await deleteCloudinaryResource(podcast.audioPublicId, "video");
  }

  // Delete from DB
  await Podcast.findByIdAndDelete(req.params.id);

  // Also delete associated notes and comments
  await PodcastNote.deleteMany({ podcastId: req.params.id });
  await PodcastComment.deleteMany({ podcastId: req.params.id });

  res.status(200).json({
    success: true,
    message: "Podcast deleted successfully",
  });
});

// Get all podcasts for management (Staff)
const getStaffPodcasts = asyncHandler(async (req, res) => {
  const podcasts = await Podcast.find().populate("lessonId").sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: podcasts.length,
    data: podcasts,
  });
});

// Get single podcast for management (Staff)
const getStaffPodcastById = asyncHandler(async (req, res) => {
  const podcast = await Podcast.findById(req.params.id).populate("lessonId");

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

  const podcasts = await Podcast.find(queryObj)
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  const total = await Podcast.countDocuments(queryObj);

  res.status(200).json({
    success: true,
    count: podcasts.length,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
    data: podcasts,
  });
});

// Get single podcast by ID (Public)
const getPodcastById = asyncHandler(async (req, res) => {
  const podcast = await Podcast.findOneAndUpdate(
    { _id: req.params.id, status: { $in: ["Published", true] } },
    { $inc: { viewCount: 1 } },
    { new: true }
  ).populate("lessonId");

  if (!podcast) {
    throw new AppError("Podcast not found", 404);
  }

  res.status(200).json({
    success: true,
    data: podcast,
  });
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

// Create Comment (Authenticated)
const createComment = asyncHandler(async (req, res) => {
  const { podcastId, content } = req.body;

  if (!podcastId || !content) {
    throw new AppError("Podcast ID and content are required", 400);
  }

  let comment = await PodcastComment.create({
    podcastId,
    userId: req.user.id,
    content,
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

  comment.content = content;
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

  podcast.status = "Published";
  podcast.reviewFeedback = "";
  await podcast.save();

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

  podcast.status = "Rejected";
  podcast.reviewFeedback = feedback;
  await podcast.save();

  res.status(200).json({
    success: true,
    data: podcast,
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
};
