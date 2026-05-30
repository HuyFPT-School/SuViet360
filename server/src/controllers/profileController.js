const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { cloudinary } = require("../config/cloudinary");

/* ─── Allowed fields for profile update ─── */
const ALLOWED_FIELDS = ["name", "phone", "birthDate", "gender", "address", "bio"];

/* ─── PATCH /api/user/profile ─── */
const updateProfile = asyncHandler(async (req, res) => {
  const updates = {};

  for (const field of ALLOWED_FIELDS) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  // Validate name
  if (updates.name !== undefined) {
    const name = String(updates.name).trim();
    if (name.length < 2 || name.length > 50) {
      throw new AppError("Tên phải từ 2 đến 50 ký tự", 400);
    }
    updates.name = name;
  }

  // Validate phone (Vietnamese format or international)
  if (updates.phone !== undefined && updates.phone !== "") {
    const phone = String(updates.phone).trim();
    if (!/^[0-9+\-\s()]{7,15}$/.test(phone)) {
      throw new AppError("Số điện thoại không hợp lệ", 400);
    }
    updates.phone = phone;
  }

  // Validate gender
  if (updates.gender !== undefined && updates.gender !== "") {
    if (!["male", "female", "other"].includes(updates.gender)) {
      throw new AppError("Giới tính không hợp lệ", 400);
    }
  }

  // Validate bio length
  if (updates.bio !== undefined) {
    if (String(updates.bio).length > 500) {
      throw new AppError("Giới thiệu bản thân tối đa 500 ký tự", 400);
    }
  }

  // Validate address length
  if (updates.address !== undefined) {
    if (String(updates.address).length > 200) {
      throw new AppError("Địa chỉ tối đa 200 ký tự", 400);
    }
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    message: "Cập nhật thông tin thành công",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        birthDate: user.birthDate,
        gender: user.gender,
        address: user.address,
        bio: user.bio,
      },
    },
  });
});

/* ─── POST /api/user/avatar ─── */
const uploadAvatarHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Vui lòng chọn ảnh để tải lên", 400);
  }

  const user = await User.findById(req.user._id);

  // Delete old avatar from Cloudinary if exists
  if (user.avatarPublicId) {
    try {
      await cloudinary.uploader.destroy(user.avatarPublicId);
    } catch (err) {
      console.error("Failed to delete old avatar:", err.message);
    }
  }

  // Update user with new avatar
  user.avatar = req.file.path; // Cloudinary secure_url
  user.avatarPublicId = req.file.filename; // Cloudinary public_id
  await user.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: "success",
    message: "Cập nhật ảnh đại diện thành công",
    data: {
      avatar: user.avatar,
    },
  });
});

/* ─── DELETE /api/user/avatar ─── */
const deleteAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user.avatarPublicId) {
    throw new AppError("Không có ảnh đại diện để xóa", 400);
  }

  // Delete from Cloudinary
  await cloudinary.uploader.destroy(user.avatarPublicId);

  // Clear avatar fields
  user.avatar = "";
  user.avatarPublicId = "";
  await user.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: "success",
    message: "Đã xóa ảnh đại diện",
  });
});

module.exports = { updateProfile, uploadAvatarHandler, deleteAvatar };
