const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const env = require("./env");

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
});

// ─── Avatar upload (existing) ──────────────────────────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "suviet360/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

// ─── Lesson upload (memory storage → manual Cloudinary upload) ──────────
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const ALLOWED_JSON_TYPES = ["application/json"];

const lessonFileFilter = (req, file, cb) => {
  if (file.fieldname === "tilemapJson") {
    if (ALLOWED_JSON_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tilemap JSON must be a .json file"), false);
    }
  } else if (
    file.fieldname === "tilesets" ||
    file.fieldname.endsWith("Sprites")
  ) {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tileset and sprite images must be PNG, JPG, or WebP"), false);
    }
  } else {
    cb(null, true);
  }
};

const uploadLessonFiles = multer({
  storage: multer.memoryStorage(),
  fileFilter: lessonFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
  },
});

module.exports = { cloudinary, uploadAvatar, uploadLessonFiles };

