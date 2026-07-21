const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const BlogPost = require("../models/BlogPost");
const Group = require("../models/Group");
const BlogComment = require("../models/BlogComment");
const BlogLike = require("../models/BlogLike");
const BlogReport = require("../models/BlogReport");
const User = require("../models/User");
const { uploadBlogImage, deleteCloudinaryResource } = require("../services/cloudinaryService");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { getCookie } = require("../utils/cookies");

// ─── Student Blog Actions ───────────────────────────────────────────

// Create BlogPost
const createPost = asyncHandler(async (req, res) => {
  const { title, content, category, tags, group } = req.body;

  if (!title || !content) {
    throw new AppError("Title and content are required", 400);
  }

  // Validate group if provided
  let groupObj = null;
  let isGroupAdmin = false;
  if (group) {
    groupObj = await Group.findById(group);
    if (!groupObj) {
      throw new AppError("Group not found", 404);
    }
    const memberEntry = groupObj.members.find(m => m.user.toString() === req.user.id);
    if (!memberEntry) {
      throw new AppError("You must be a member of the group to post", 403);
    }
    isGroupAdmin = memberEntry.role === "admin";
  }

  const images = [];
  if (req.files && req.files.length > 0) {
    if (req.files.length > 3) {
      throw new AppError("You can attach up to 3 images only", 400);
    }
    for (const file of req.files) {
      const result = await uploadBlogImage(file.buffer);
      images.push({ url: result.secure_url, publicId: result.public_id });
    }
  }

  let tagList = [];
  if (tags) {
    tagList = Array.isArray(tags) ? tags : tags.split(",").map(t => t.trim()).filter(Boolean);
  }

  // If in a group, it starts as Published if creator/admin, else Pending_Review.
  // General forum posts always start as Pending_Review.
  const status = groupObj ? (isGroupAdmin ? "Published" : "Pending_Review") : "Pending_Review";

  const post = await BlogPost.create({
    author: req.user.id,
    title,
    content,
    category: category || "Chủ đề chung",
    tags: tagList,
    images,
    group: group || null,
    status,
  });

  res.status(201).json({
    success: true,
    data: post,
  });
});

// Get Published Posts (with Search, Pagination, Filter)
const getPublishedPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;
  const skip = (page - 1) * limit;

  const filter = { status: "Published", group: null };

  if (req.query.category && req.query.category !== "Tất cả") {
    filter.category = req.query.category;
  }

  if (req.query.search) {
    // Text search if index is ready, or simple regex
    filter.$or = [
      { title: { $regex: req.query.search, $options: "i" } },
      { content: { $regex: req.query.search, $options: "i" } }
    ];
  }

  const total = await BlogPost.countDocuments(filter);
  const pages = Math.ceil(total / limit);

  const posts = await BlogPost.find(filter)
    .populate("author", "name avatar role")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    count: posts.length,
    pagination: {
      total,
      page,
      limit,
      pages,
    },
    data: posts,
  });
});

// Get BlogPost by ID (Public for Published, Owner/Staff for others)
const getPostById = asyncHandler(async (req, res) => {
  const post = await BlogPost.findById(req.params.id).populate("author", "name avatar role");

  if (!post) {
    throw new AppError("Blog post not found", 404);
  }

  // Parse JWT token manually if available to check roles (for non-Published posts)
  if (post.status !== "Published") {
    let isAuthorized = false;
    let token = getCookie(req, "token");
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (token) {
      try {
        const decoded = jwt.verify(token, env.jwtSecret);
        const currentUser = await User.findById(decoded.id);
        if (
          currentUser &&
          (currentUser.role === "admin" ||
            currentUser.role === "staff" ||
            currentUser.role === "teacher" ||
            post.author._id.toString() === currentUser._id.toString())
        ) {
          isAuthorized = true;
        }
      } catch (err) {
        // Ignore jwt verify errors
      }
    }

    if (!isAuthorized) {
      throw new AppError("You are not authorized to view this post", 403);
    }
  }

  // Increment viewCount atomically with cookie deduplication (Issues #14, #24)
  const viewedCookieName = `viewed_post_${req.params.id}`;
  const hasViewed = getCookie(req, viewedCookieName);
  if (!hasViewed) {
    await BlogPost.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    post.viewCount += 1;
    res.cookie(viewedCookieName, "true", {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: env.cookieSecure ? "none" : "lax"
    });
  }

  res.status(200).json({
    success: true,
    data: post,
  });
});

// Get My Posts (All statuses)
const getMyPosts = asyncHandler(async (req, res) => {
  const posts = await BlogPost.find({ author: req.user.id })
    .populate("author", "name avatar role")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: posts,
  });
});

// Update BlogPost (Reset to Pending_Review)
const updatePost = asyncHandler(async (req, res) => {
  const post = await BlogPost.findById(req.params.id);

  if (!post) {
    throw new AppError("Blog post not found", 404);
  }

  if (post.author.toString() !== req.user.id && req.user.role !== "admin") {
    throw new AppError("You do not own this post", 403);
  }

  // --- Rule: Posts with images cannot replace images after posting ---
  if (post.images && post.images.length > 0 && req.files && req.files.length > 0) {
    throw new AppError("Bài viết đã chứa hình ảnh cố định. Không thể thay thế bằng ảnh/video khác sau khi đã đăng. Bạn chỉ có thể chỉnh sửa phần chữ hoặc xóa bài.", 400);
  }

  const { title, content, category, tags, keepImages } = req.body;

  // --- Draft Revision Rule: Published posts remain live with old content while edits are saved to pendingDraft ---
  if (post.status === "Published") {
    post.hasPendingDraft = true;
    post.pendingDraft = {
      title: title !== undefined ? title : post.title,
      content: content !== undefined ? content : post.content,
      updatedAt: new Date(),
    };
  } else {
    // For non-published posts, update content directly
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    post.status = "Pending_Review";
  }

  if (category !== undefined) post.category = category;
  if (tags !== undefined) {
    post.tags = Array.isArray(tags) ? tags : tags.split(",").map(t => t.trim()).filter(Boolean);
  }

  // Handle images (Issue #13)
  let keptImages = [];
  if (keepImages !== undefined) {
    const keepList = typeof keepImages === "string" ? JSON.parse(keepImages) : keepImages;
    for (const img of post.images) {
      if (!keepList.includes(img.publicId)) {
        await deleteCloudinaryResource(img.publicId, "image");
      } else {
        keptImages.push(img);
      }
    }
  } else if (req.files && req.files.length > 0) {
    for (const img of post.images) {
      await deleteCloudinaryResource(img.publicId, "image");
    }
  } else {
    keptImages = [...post.images];
  }

  // Add new uploaded images
  const newImages = [...keptImages];
  if (req.files && req.files.length > 0) {
    if (newImages.length + req.files.length > 3) {
      throw new AppError("You can attach up to 3 images only", 400);
    }
    for (const file of req.files) {
      const result = await uploadBlogImage(file.buffer);
      newImages.push({ url: result.secure_url, publicId: result.public_id });
    }
  }
  post.images = newImages;
  post.reviewFeedback = "";

  await post.save();

  res.status(200).json({
    success: true,
    data: post,
  });
});

// Delete BlogPost
const deletePost = asyncHandler(async (req, res) => {
  const post = await BlogPost.findById(req.params.id);

  if (!post) {
    throw new AppError("Blog post not found", 404);
  }

  if (post.author.toString() !== req.user.id && !["admin", "staff"].includes(req.user.role)) {
    throw new AppError("You are not authorized to delete this post", 403);
  }

  // Delete images from Cloudinary
  for (const img of post.images) {
    await deleteCloudinaryResource(img.publicId, "image");
  }

  // Hard delete post
  await BlogPost.findByIdAndDelete(req.params.id);

  // Delete all comments
  await BlogComment.deleteMany({ post: req.params.id });

  // Delete all likes
  await BlogLike.deleteMany({ targetType: "Post", targetId: req.params.id });

  // Delete all reports
  await BlogReport.deleteMany({ targetType: "Post", targetId: req.params.id });

  res.status(200).json({
    success: true,
    message: "Blog post deleted successfully",
  });
});

// ─── Staff/Admin Moderation Actions ───────────────────────────────────

// Get Pending Posts
const getPendingPosts = asyncHandler(async (req, res) => {
  const posts = await BlogPost.find({
    $or: [{ status: "Pending_Review" }, { hasPendingDraft: true }],
    group: null
  })
    .populate("author", "name avatar role")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: posts,
  });
});

// Approve BlogPost
const approvePost = asyncHandler(async (req, res) => {
  const post = await BlogPost.findById(req.params.id);

  if (!post) {
    throw new AppError("Blog post not found", 404);
  }

  // If approving a pending draft update on a published post
  if (post.hasPendingDraft && post.pendingDraft) {
    // Record current live version to history
    if (!post.editHistory) post.editHistory = [];
    post.editHistory.push({
      title: post.title,
      content: post.content,
      editedAt: new Date(),
    });

    // Overwrite live content with approved draft
    if (post.pendingDraft.title) post.title = post.pendingDraft.title;
    if (post.pendingDraft.content) post.content = post.pendingDraft.content;
    post.isEdited = true;
    post.hasPendingDraft = false;
    post.pendingDraft = { title: "", content: "" };
  }

  post.status = "Published";
  post.reviewFeedback = "";
  await post.save();

  res.status(200).json({
    success: true,
    data: post,
  });
});

// Reject BlogPost
const rejectPost = asyncHandler(async (req, res) => {
  const { feedback } = req.body;
  if (!feedback) {
    throw new AppError("Feedback is required to reject a blog post", 400);
  }

  const post = await BlogPost.findById(req.params.id);

  if (!post) {
    throw new AppError("Blog post not found", 404);
  }

  // If rejecting a draft edit on an already published post, keep live post published and clear draft
  if (post.hasPendingDraft) {
    post.hasPendingDraft = false;
    post.pendingDraft = { title: "", content: "" };
    post.reviewFeedback = feedback;
  } else {
    // Rejecting new post submission
    post.status = "Rejected";
    post.reviewFeedback = feedback;
  }

  await post.save();

  res.status(200).json({
    success: true,
    data: post,
  });
});

// Hard remove post (Staff/Admin force delete)
const removePost = deletePost; // We can reuse the same delete post logic as it has authorization check

module.exports = {
  createPost,
  getPublishedPosts,
  getPostById,
  getMyPosts,
  updatePost,
  deletePost,
  getPendingPosts,
  approvePost,
  rejectPost,
  removePost,
};
