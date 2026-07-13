const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const BlogPost = require("../models/BlogPost");
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
  const { title, content, category, tags } = req.body;

  if (!title || !content) {
    throw new AppError("Title and content are required", 400);
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

  const post = await BlogPost.create({
    author: req.user.id,
    title,
    content,
    category: category || "Chủ đề chung",
    tags: tagList,
    images,
    status: "Pending_Review",
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

  const filter = { status: "Published" };

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

  const { title, content, category, tags, keepImages } = req.body;

  if (title !== undefined) post.title = title;
  if (content !== undefined) post.content = content;
  if (category !== undefined) post.category = category;
  if (tags !== undefined) {
    post.tags = Array.isArray(tags) ? tags : tags.split(",").map(t => t.trim()).filter(Boolean);
  }

  // Handle images (Issue #13)
  let keptImages = [];
  if (keepImages !== undefined) {
    // keepImages could be a JSON string or array of publicIds to keep
    const keepList = typeof keepImages === "string" ? JSON.parse(keepImages) : keepImages;
    // Delete removed images from Cloudinary
    for (const img of post.images) {
      if (!keepList.includes(img.publicId)) {
        await deleteCloudinaryResource(img.publicId, "image");
      } else {
        keptImages.push(img);
      }
    }
  } else if (req.files && req.files.length > 0) {
    // If keepImages is not specified but new files are uploaded, delete all old images
    for (const img of post.images) {
      await deleteCloudinaryResource(img.publicId, "image");
    }
  } else {
    // If keepImages is not specified AND no new files are uploaded, keep all old images
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

  // Reset status to Pending Review on edit
  post.status = "Pending_Review";
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
  const posts = await BlogPost.find({ status: "Pending_Review" })
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

  post.status = "Rejected";
  post.reviewFeedback = feedback;
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
