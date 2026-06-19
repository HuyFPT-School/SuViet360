/**
 * Redis Cache Helpers
 * ──────────────────────────────
 * Graceful fallback: nếu Redis không kết nối được, mọi hàm đều trả về
 * null / no-op, không gây crash server.
 *
 * Hai tầng hàm:
 *  - getCache / setCache         → lưu object (tự parse / stringify)
 *  - getCachePayload / setCachePayload → lưu raw JSON + ETag (tối ưu HTTP 304)
 */

const crypto = require("crypto");
const { redisClient, isRedisReady } = require("../config/redis");

// ─── TTL mặc định (giây) ──────────────────────────────────────────

/** Cache list: 1 giờ (dữ liệu ít thay đổi, đọc nhiều) */
const LIST_TTL = 60 * 60;

/** Cache detail: 10 phút (ngắn hơn vì có viewCount, comment…) */
const DETAIL_TTL = 10 * 60;

// ─── Helpers ──────────────────────────────────────────────────────

// ── Tầng 1: Cache object (hiện tại, dùng cho Lesson) ──────────────

/**
 * Lấy dữ liệu từ cache theo key.
 * @returns {any|null} parsed JSON hoặc null nếu miss / Redis lỗi
 */
const getCache = async (key) => {
  if (!isRedisReady()) return null;
  try {
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Cache] get error:", err.message);
    return null;
  }
};

/**
 * Ghi dữ liệu vào cache.
 * @param {string} key
 * @param {any} data - object/array (tự JSON.stringify)
 * @param {number} ttl - thời gian sống (giây), mặc định LIST_TTL
 */
const setCache = async (key, data, ttl = LIST_TTL) => {
  if (!isRedisReady()) return;
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(data));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Cache] set error:", err.message);
  }
};

// ── Tầng 2: Cache raw JSON + ETag (tối ưu cho HTTP conditional request) ─

const hashETag = (rawBody) =>
  `"${crypto.createHash("md5").update(rawBody).digest("hex")}"`;

/**
 * Lưu response vào cache kèm ETag để tối ưu 304.
 * Đồng thời lưu ETag ra key riêng (chỉ ~50 bytes) để check 304 cực nhanh.
 * @param {string} key
 * @param {object} data - object response (tự serialize → JSON string)
 * @param {number} ttl
 */
const setCachePayload = async (key, data, ttl = LIST_TTL) => {
  if (!isRedisReady()) return;
  try {
    const body = JSON.stringify(data);
    const etag = hashETag(body);
    const payload = JSON.stringify({ body, etag });
    // Lưu đồng thời: full payload + key etag riêng (nhỏ, đọc nhanh cho 304)
    await Promise.all([
      redisClient.setEx(key, ttl, payload),
      redisClient.setEx(`${key}:etag`, ttl, etag),
    ]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Cache] setPayload error:", err.message);
  }
};

/**
 * Chỉ đọc ETag từ cache (cực nhanh, ~50 bytes).
 * Dùng để check If-None-Match trước khi quyết định có cần đọc full body không.
 * @returns {string | null} ETag hoặc null nếu không có
 */
const getCacheETag = async (key) => {
  if (!isRedisReady()) return null;
  try {
    return await redisClient.get(`${key}:etag`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Cache] getETag error:", err.message);
    return null;
  }
};

/**
 * Lưu ETag vào key riêng (để check 304 không cần đọc body).
 * @param {string} key - cache key gốc (tự thêm suffix :etag)
 * @param {string} etag 
 * @param {number} ttl
 */
const setCacheETag = async (key, etag, ttl = LIST_TTL) => {
  if (!isRedisReady()) return;
  try {
    await redisClient.setEx(`${key}:etag`, ttl, etag);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Cache] setETag error:", err.message);
  }
};

/**
 * Lấy response từ cache.
 * @returns {{ body: string, etag: string } | null}
 *   - `body`: raw JSON string (dùng thẳng res.send, không parse lại)
 *   - `etag`: MD5 hash để so sánh với If-None-Match
 *   - Trả về null nếu cache format cũ (không có body/etag) → tự động rebuild
 */
const getCachePayload = async (key) => {
  if (!isRedisReady()) return null;
  try {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Phát hiện cache format cũ (không có body + etag, hoặc etag thiếu dấu "")
    if (!parsed.body || !parsed.etag || !parsed.etag.startsWith('"')) {
      // Xoá cache cũ để lần sau không bị dính nữa
      redisClient.del(key).catch(() => {});
      return null;
    }
    return parsed;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Cache] getPayload error:", err.message);
    return null;
  }
};

// ── Xoá cache ────────────────────────────────────────────────────

/**
 * Xoá một key cụ thể.
 */
const deleteCache = async (key) => {
  if (!isRedisReady()) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Cache] delete error:", err.message);
  }
};

/**
 * Xoá tất cả key khớp với pattern (dùng SCAN để tránh block Redis).
 * Ví dụ: deleteCacheByPattern("podcasts:*")
 */
const deleteCacheByPattern = async (pattern) => {
  if (!isRedisReady()) return;
  try {
    let cursor = 0;
    do {
      const reply = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = reply.cursor;
      if (reply.keys.length > 0) {
        await redisClient.del(reply.keys);
      }
    } while (cursor !== 0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Cache] deleteByPattern error:", err.message);
  }
};

module.exports = {
  LIST_TTL,
  DETAIL_TTL,
  getCache,
  setCache,
  getCachePayload,
  setCachePayload,
  getCacheETag,
  setCacheETag,
  deleteCache,
  deleteCacheByPattern,
};
