const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const BlogReport = require("../models/BlogReport");
const BlogPost = require("../models/BlogPost");
const BlogComment = require("../models/BlogComment");
const BlogLike = require("../models/BlogLike");
const { deleteCloudinaryResource } = require("../services/cloudinaryService");

// Create Report
const createReport = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, description } = req.body;

  if (!targetType || !targetId || !reason) {
    throw new AppError("Target type, target ID, and reason are required", 400);
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
    throw new AppError(`${targetType} to report not found`, 404);
  }

  // Check for duplicate report
  const duplicate = await BlogReport.findOne({
    reporter: req.user.id,
    targetType,
    targetId,
  });

  if (duplicate) {
    throw new AppError("You have already reported this content", 400);
  }

  const report = await BlogReport.create({
    reporter: req.user.id,
    targetType,
    targetId,
    reason,
    description: description || "",
  });

  res.status(201).json({
    success: true,
    data: report,
  });
});

// Get Pending Reports (Staff/Admin)
const getPendingReports = asyncHandler(async (req, res) => {
  const reports = await BlogReport.find({ status: "Pending" })
    .populate("reporter", "name avatar role")
    .sort({ createdAt: -1 });

  // Manually fetch and populate targets for preview
  const populatedReports = [];
  for (const report of reports) {
    const reportObj = report.toObject();
    let target = null;
    
    try {
      if (report.targetType === "Post") {
        target = await BlogPost.findById(report.targetId).populate("author", "name avatar role");
      } else {
        target = await BlogComment.findById(report.targetId)
          .populate("author", "name avatar role")
          .populate("post", "title");
      }
    } catch (err) {
      // Handle cases where the target document is malformed or invalid
    }

    reportObj.target = target;
    populatedReports.push(reportObj);
  }

  res.status(200).json({
    success: true,
    data: populatedReports,
  });
});

// Resolve Report (Staff/Admin)
const resolveReport = asyncHandler(async (req, res) => {
  const { action } = req.body; // "delete" or "dismiss"
  const report = await BlogReport.findById(req.params.id);

  if (!report) {
    throw new AppError("Report not found", 404);
  }

  if (report.status !== "Pending") {
    throw new AppError("Report has already been resolved", 400);
  }

  if (!["delete", "dismiss"].includes(action)) {
    throw new AppError("Invalid action, must be 'delete' or 'dismiss'", 400);
  }

  if (action === "delete") {
    if (report.targetType === "Post") {
      const post = await BlogPost.findById(report.targetId);
      if (post) {
        // Delete post images from Cloudinary
        for (const img of post.images) {
          await deleteCloudinaryResource(img.publicId, "image");
        }
        // Hard delete post
        await BlogPost.findByIdAndDelete(post._id);
        // Delete all comments
        await BlogComment.deleteMany({ post: post._id });
        // Delete likes
        await BlogLike.deleteMany({ targetType: "Post", targetId: post._id });
        
        // Resolve all other pending reports for this post in the audit logs
        await BlogReport.updateMany(
          { targetType: "Post", targetId: post._id, _id: { $ne: report._id } },
          {
            status: "Resolved_Deleted",
            resolvedBy: req.user.id,
            resolvedAt: new Date()
          }
        );
      }
    } else {
      const comment = await BlogComment.findById(report.targetId);
      if (comment) {
        const post = await BlogPost.findById(comment.post);
        let deletedCount = 0;

        if (comment.parentComment === null) {
          // Delete root + replies
          const replies = await BlogComment.find({ parentComment: comment._id });
          const replyIds = replies.map(r => r._id);
          
          await BlogComment.deleteMany({
            $or: [{ _id: comment._id }, { parentComment: comment._id }]
          });

          await BlogLike.deleteMany({ targetType: "Comment", targetId: { $in: [comment._id, ...replyIds] } });
          
          // Resolve all other pending reports for this comment and its replies in the audit logs
          await BlogReport.updateMany(
            { targetType: "Comment", targetId: { $in: [comment._id, ...replyIds] }, _id: { $ne: report._id } },
            {
              status: "Resolved_Deleted",
              resolvedBy: req.user.id,
              resolvedAt: new Date()
            }
          );

          deletedCount = 1 + replies.length;
        } else {
          // Delete single reply
          await BlogComment.findByIdAndDelete(comment._id);
          await BlogLike.deleteMany({ targetType: "Comment", targetId: comment._id });
          
          // Resolve all other pending reports for this single reply in the audit logs
          await BlogReport.updateMany(
            { targetType: "Comment", targetId: comment._id, _id: { $ne: report._id } },
            {
              status: "Resolved_Deleted",
              resolvedBy: req.user.id,
              resolvedAt: new Date()
            }
          );
          deletedCount = 1;
        }

        if (post) {
          post.commentCount = Math.max(0, post.commentCount - deletedCount);
          await post.save();
        }
      }
    }
    report.status = "Resolved_Deleted";
  } else {
    report.status = "Resolved_Dismissed";
  }

  report.resolvedBy = req.user.id;
  report.resolvedAt = new Date();
  await report.save();

  res.status(200).json({
    success: true,
    message: `Report resolved with action: ${action}`,
    data: report,
  });
});

module.exports = {
  createReport,
  getPendingReports,
  resolveReport,
};
