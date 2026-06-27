const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const BlogLike = require("../models/BlogLike");
const BlogPost = require("../models/BlogPost");
const BlogComment = require("../models/BlogComment");

// Toggle Like on Post or Comment
const toggleLike = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.body;

  if (!targetType || !targetId) {
    throw new AppError("Target type and target ID are required", 400);
  }

  if (!["Post", "Comment"].includes(targetType)) {
    throw new AppError("Invalid target type", 400);
  }

  // Check if target exists
  let target;
  if (targetType === "Post") {
    target = await BlogPost.findById(targetId);
  } else {
    target = await BlogComment.findById(targetId);
  }

  if (!target) {
    throw new AppError(`${targetType} not found`, 404);
  }

  // Find if already liked
  const existingLike = await BlogLike.findOne({
    user: req.user.id,
    targetType,
    targetId,
  });

  let liked = false;
  if (existingLike) {
    // Unlike
    await BlogLike.findByIdAndDelete(existingLike._id);
    target.likeCount = Math.max(0, target.likeCount - 1);
    liked = false;
  } else {
    // Like
    await BlogLike.create({
      user: req.user.id,
      targetType,
      targetId,
    });
    target.likeCount += 1;
    liked = true;
  }

  await target.save();

  res.status(200).json({
    success: true,
    liked,
    likeCount: target.likeCount,
  });
});

// Get Like Status
const getLikeStatus = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.params;

  if (!["Post", "Comment"].includes(targetType)) {
    throw new AppError("Invalid target type", 400);
  }

  const existingLike = await BlogLike.findOne({
    user: req.user.id,
    targetType,
    targetId,
  });

  res.status(200).json({
    success: true,
    liked: !!existingLike,
  });
});

module.exports = {
  toggleLike,
  getLikeStatus,
};
