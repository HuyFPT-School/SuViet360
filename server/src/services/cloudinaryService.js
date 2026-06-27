const { cloudinary } = require("../config/cloudinary");
const AppError = require("../utils/AppError");

/**
 * Upload a JSON file (Tiled map) to Cloudinary as "raw" resource.
 * @param {Buffer} buffer - file buffer
 * @param {string} folder - Cloudinary folder path
 * @returns {{ secure_url: string, public_id: string }}
 */
const uploadTilemapJson = async (buffer, folder = "suviet360/maps") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder,
        format: "json",
      },
      (error, result) => {
        if (error) {
          return reject(
            new AppError(`Failed to upload tilemap JSON: ${error.message}`, 500)
          );
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Upload a single tileset image to Cloudinary.
 * @param {Buffer} buffer - image buffer
 * @param {string} folder - Cloudinary folder path
 * @returns {{ secure_url: string, public_id: string }}
 */
const uploadTilesetImage = async (buffer, folder = "suviet360/tilesets") => {
  return uploadImage(buffer, folder);
};

/**
 * Upload a single animation sprite frame to Cloudinary.
 * @param {Buffer} buffer - image buffer
 * @param {string} characterId - unique identifier for the character
 * @param {string} animationName - e.g. "idle", "run"
 * @returns {{ secure_url: string, public_id: string }}
 */
const uploadAnimationSprite = async (buffer, characterId, animationName) => {
  return uploadImage(buffer, `suviet360/characters/${characterId}/${animationName}`);
};

/**
 * Shared image upload helper.
 */
const uploadImage = async (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder,
      },
      (error, result) => {
        if (error) {
          return reject(
            new AppError(`Failed to upload image: ${error.message}`, 500)
          );
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Upload a podcast thumbnail image to Cloudinary.
 * @param {Buffer} buffer - image buffer
 * @returns {{ secure_url: string, public_id: string }}
 */
const uploadPodcastThumbnail = async (buffer) => {
  return uploadImage(buffer, "suviet360/podcast_thumbnails");
};

/**
 * Upload a podcast audio file to Cloudinary.
 * @param {Buffer} buffer - audio buffer
 * @returns {{ secure_url: string, public_id: string }}
 */
const uploadPodcastAudio = async (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video", // Required for audio files by Cloudinary
        folder: "suviet360/podcast_audios",
      },
      (error, result) => {
        if (error) {
          return reject(
            new AppError(`Failed to upload audio: ${error.message}`, 500)
          );
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          duration: result.duration || 0,
        });
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Delete a Cloudinary resource by public_id and resource_type.
 * @param {string} publicId
 * @param {"image"|"raw"|"video"} resourceType
 */
const deleteCloudinaryResource = async (publicId, resourceType = "image") => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error(`Failed to delete Cloudinary resource ${publicId}:`, err.message);
  }
};

const uploadBlogImage = async (buffer) => {
  return uploadImage(buffer, "suviet360/blog_images");
};

module.exports = {
  uploadTilemapJson,
  uploadTilesetImage,
  uploadAnimationSprite,
  uploadPodcastThumbnail,
  uploadPodcastAudio,
  uploadBlogImage,
  deleteCloudinaryResource,
};
