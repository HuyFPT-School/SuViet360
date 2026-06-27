const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const BlogPost = require("../models/BlogPost");
const BlogComment = require("../models/BlogComment");
const BlogLike = require("../models/BlogLike");
const BlogReport = require("../models/BlogReport");

// Create Comment or Reply
const createComment = asyncHandler(async (req, res) => {
  const { content, parentComment } = req.body;
  const { postId } = req.params;

  if (!content) {
    throw new AppError("Comment content is required", 400);
  }

  const post = await BlogPost.findById(postId);
  if (!post) {
    throw new AppError("Blog post not found", 404);
  }

  let finalParentId = null;
  if (parentComment) {
    const parent = await BlogComment.findById(parentComment);
    if (!parent) {
      throw new AppError("Parent comment not found", 404);
    }
    if (parent.post.toString() !== postId) {
      throw new AppError("Parent comment does not belong to this post", 400);
    }
    // Limit to 2 levels: if parent is itself a reply, do NOT allow another level
    if (parent.parentComment !== null) {
      throw new AppError("Replies can only be nested up to 2 levels", 400);
    }
    finalParentId = parent._id;
  }

  const comment = await BlogComment.create({
    post: postId,
    author: req.user.id,
    content,
    parentComment: finalParentId,
  });

  // Increment commentCount
  post.commentCount += 1;
  await post.save();

  // Populate author details for the return object
  await comment.populate("author", "name avatar role");

  res.status(201).json({
    success: true,
    data: comment,
  });
});

// Get Comments by Post (including nested replies)
const getCommentsByPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await BlogPost.findById(postId);
  if (!post) {
    throw new AppError("Blog post not found", 404);
  }

  // Fetch root comments
  const rootComments = await BlogComment.find({
    post: postId,
    parentComment: null,
    status: { $ne: "Removed" },
  })
    .populate("author", "name avatar role")
    .sort({ createdAt: -1 });

  // Fetch replies
  const replies = await BlogComment.find({
    post: postId,
    parentComment: { $ne: null },
    status: { $ne: "Removed" },
  })
    .populate("author", "name avatar role")
    .sort({ createdAt: 1 });

  // Group replies by parentComment
  const repliesMap = {};
  replies.forEach((reply) => {
    const parentId = reply.parentComment.toString();
    if (!repliesMap[parentId]) {
      repliesMap[parentId] = [];
    }
    repliesMap[parentId].push(reply);
  });

  // Attach replies to root comments
  const data = rootComments.map((root) => {
    const rootObj = root.toObject();
    rootObj.replies = repliesMap[root._id.toString()] || [];
    return rootObj;
  });

  res.status(200).json({
    success: true,
    data,
  });
});

// Update Comment
const updateComment = asyncHandler(async (req, res) => {
  const comment = await BlogComment.findById(req.params.id);

  if (!comment) {
    throw new AppError("Comment not found", 404);
  }

  if (comment.author.toString() !== req.user.id) {
    throw new AppError("You do not own this comment", 403);
  }

  const { content } = req.body;
  if (!content) {
    throw new AppError("Content is required", 400);
  }

  comment.content = content;
  await comment.save();

  await comment.populate("author", "name avatar role");

  res.status(200).json({
    success: true,
    data: comment,
  });
});

// Delete Comment
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await BlogComment.findById(req.params.id);

  if (!comment) {
    throw new AppError("Comment not found", 404);
  }

  if (comment.author.toString() !== req.user.id && !["admin", "staff"].includes(req.user.role)) {
    throw new AppError("You are not authorized to delete this comment", 403);
  }

  const post = await BlogPost.findById(comment.post);

  let deletedCount = 0;
  if (comment.parentComment === null) {
    // If it's a root comment, also delete all replies
    const replies = await BlogComment.find({ parentComment: comment._id });
    const replyIds = replies.map(r => r._id);

    // Delete root + replies
    await BlogComment.deleteMany({
      $or: [{ _id: comment._id }, { parentComment: comment._id }]
    });

    // Delete likes for replies and root
    await BlogLike.deleteMany({ targetType: "Comment", targetId: { $in: [comment._id, ...replyIds] } });
    await BlogReport.deleteMany({ targetType: "Comment", targetId: { $in: [comment._id, ...replyIds] } });

    deletedCount = 1 + replies.length;
  } else {
    // Just delete this reply
    await BlogComment.findByIdAndDelete(comment._id);
    await BlogLike.deleteMany({ targetType: "Comment", targetId: comment._id });
    await BlogReport.deleteMany({ targetType: "Comment", targetId: comment._id });
    deletedCount = 1;
  }

  if (post) {
    post.commentCount = Math.max(0, post.commentCount - deletedCount);
    await post.save();
  }

  res.status(200).json({
    success: true,
    message: "Comment deleted successfully",
  });
});

// Hide Comment (Staff/Admin)
const hideComment = asyncHandler(async (req, res) => {
  const comment = await BlogComment.findById(req.params.id);

  if (!comment) {
    throw new AppError("Comment not found", 404);
  }

  comment.status = "Hidden";
  await comment.save();

  res.status(200).json({
    success: true,
    message: "Comment hidden successfully",
    data: comment,
  });
});

module.exports = {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
  hideComment,
};
