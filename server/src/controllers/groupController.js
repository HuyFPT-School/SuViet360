const asyncHandler = require("../utils/asyncHandler");
const Group = require("../models/Group");
const BlogPost = require("../models/BlogPost");
const { deleteCloudinaryResource } = require("../services/cloudinaryService");

// @desc    Create a new group
// @route   POST /api/groups
const createGroup = asyncHandler(async (req, res) => {
  const { name, description, isPublic } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: "Tên nhóm là bắt buộc." });
  }

  const group = await Group.create({
    name: name.trim(),
    description: description?.trim() || "",
    isPublic: isPublic !== false,
    creator: req.user.id,
    members: [{ user: req.user.id, role: "admin" }],
    memberCount: 1,
  });

  res.status(201).json({ success: true, data: group });
});

// @desc    Get public groups (for discovery)
// @route   GET /api/groups
const getPublicGroups = asyncHandler(async (req, res) => {
  const search = req.query.search;
  const query = { isPublic: true };

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  const groups = await Group.find(query)
    .populate("creator", "name avatar")
    .sort({ memberCount: -1, createdAt: -1 })
    .limit(50);

  res.status(200).json({ success: true, data: groups });
});

// @desc    Get groups the current user is a member of
// @route   GET /api/groups/my
const getMyGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ "members.user": req.user.id })
    .populate("creator", "name avatar")
    .sort({ updatedAt: -1 });

  res.status(200).json({ success: true, data: groups });
});

// @desc    Get group by ID
// @route   GET /api/groups/:id
const getGroupById = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate("creator", "name avatar")
    .populate("members.user", "name avatar role level xp");

  if (!group) {
    return res.status(404).json({ success: false, message: "Nhóm không tồn tại." });
  }

  res.status(200).json({ success: true, data: group });
});

// @desc    Update group info (admin only)
// @route   PUT /api/groups/:id
const updateGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) {
    return res.status(404).json({ success: false, message: "Nhóm không tồn tại." });
  }

  // Check if user is group admin
  const memberEntry = group.members.find(
    (m) => m.user.toString() === req.user.id && m.role === "admin"
  );
  if (!memberEntry) {
    return res.status(403).json({ success: false, message: "Chỉ admin nhóm mới được chỉnh sửa." });
  }

  const { name, description, isPublic } = req.body;
  if (name) group.name = name.trim();
  if (description !== undefined) group.description = description.trim();
  if (isPublic !== undefined) group.isPublic = isPublic;

  await group.save();

  res.status(200).json({ success: true, data: group });
});

// @desc    Join a group
// @route   POST /api/groups/:id/join
const joinGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) {
    return res.status(404).json({ success: false, message: "Nhóm không tồn tại." });
  }

  const alreadyMember = group.members.some(
    (m) => m.user.toString() === req.user.id
  );
  if (alreadyMember) {
    return res.status(400).json({ success: false, message: "Bạn đã là thành viên nhóm này." });
  }

  group.members.push({ user: req.user.id, role: "member" });
  group.memberCount = group.members.length;
  await group.save();

  res.status(200).json({ success: true, message: "Đã tham gia nhóm.", data: group });
});

// @desc    Leave a group
// @route   POST /api/groups/:id/leave
const leaveGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) {
    return res.status(404).json({ success: false, message: "Nhóm không tồn tại." });
  }

  // Creator cannot leave
  if (group.creator.toString() === req.user.id) {
    return res.status(400).json({ success: false, message: "Người tạo nhóm không thể rời nhóm. Hãy chuyển quyền admin trước." });
  }

  const memberIndex = group.members.findIndex(
    (m) => m.user.toString() === req.user.id
  );
  if (memberIndex === -1) {
    return res.status(400).json({ success: false, message: "Bạn không phải thành viên nhóm này." });
  }

  group.members.splice(memberIndex, 1);
  group.memberCount = group.members.length;
  await group.save();

  res.status(200).json({ success: true, message: "Đã rời nhóm." });
});

// @desc    Get posts in a group
// @route   GET /api/groups/:id/posts
const getGroupPosts = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) {
    return res.status(404).json({ success: false, message: "Nhóm không tồn tại." });
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Group posts: show Published + Pending (for admin review)
  const isMember = group.members.some(
    (m) => m.user.toString() === req.user.id
  );
  const isAdmin = group.members.some(
    (m) => m.user.toString() === req.user.id && m.role === "admin"
  );

  let statusFilter;
  if (isAdmin) {
    statusFilter = { $in: ["Published", "Pending_Review"] };
  } else if (isMember) {
    statusFilter = "Published";
  } else {
    statusFilter = "Published";
  }

  const [posts, total] = await Promise.all([
    BlogPost.find({ group: req.params.id, status: statusFilter })
      .populate("author", "name avatar role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    BlogPost.countDocuments({ group: req.params.id, status: statusFilter }),
  ]);

  res.status(200).json({
    success: true,
    data: posts,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Approve/Reject a group post (group admin)
// @route   PUT /api/groups/:id/posts/:postId/moderate
const moderateGroupPost = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) {
    return res.status(404).json({ success: false, message: "Nhóm không tồn tại." });
  }

  const isAdmin = group.members.some(
    (m) => m.user.toString() === req.user.id && m.role === "admin"
  );
  if (!isAdmin) {
    return res.status(403).json({ success: false, message: "Chỉ admin nhóm mới được duyệt bài." });
  }

  const post = await BlogPost.findOne({ _id: req.params.postId, group: req.params.id });
  if (!post) {
    return res.status(404).json({ success: false, message: "Bài viết không tồn tại trong nhóm này." });
  }

  const { action, feedback } = req.body; // action: "approve" | "reject"
  if (action === "approve") {
    post.status = "Published";
    post.reviewFeedback = "";
  } else if (action === "reject") {
    post.status = "Rejected";
    post.reviewFeedback = feedback || "Bài viết không phù hợp với nhóm.";
  } else {
    return res.status(400).json({ success: false, message: "Hành động không hợp lệ." });
  }

  await post.save();

  res.status(200).json({ success: true, data: post });
});

module.exports = {
  createGroup,
  getPublicGroups,
  getMyGroups,
  getGroupById,
  updateGroup,
  joinGroup,
  leaveGroup,
  getGroupPosts,
  moderateGroupPost,
};
