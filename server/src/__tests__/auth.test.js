const supertest = require("supertest");
const User = require("../models/User");
const { sendEmail } = require("../utils/mailer");

// Access mockRedisStore from global set up in setup.js
const mockRedisStore = global.mockRedisStore;

const app = require("../app");
const request = supertest(app);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch a fresh CSRF token from the server.
 * Returns the token string and the raw Set-Cookie header value for the
 * `csrf-token` cookie so it can be forwarded in subsequent requests.
 */
const getCsrfToken = async () => {
  const res = await request.get("/api/csrf-token");
  const csrfToken = res.body.data.csrfToken;
  const cookies = res.headers["set-cookie"] || [];
  // Build a semicolon-separated cookie string usable with .set("Cookie", …)
  const cookieString = cookies.map((c) => c.split(";")[0]).join("; ");
  return { csrfToken, cookieString };
};

/**
 * Extract Set-Cookie values (name=value only) from a response and return as a
 * semicolon-separated string that can be merged with other cookies.
 */
const extractCookies = (res) => {
  const setCookies = res.headers["set-cookie"] || [];
  return setCookies.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Merge two cookie strings, keeping the last occurrence of each cookie name.
 */
const mergeCookies = (...parts) => {
  const map = new Map();
  for (const part of parts) {
    if (!part) continue;
    for (const pair of part.split(";")) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const name = trimmed.slice(0, eqIdx);
      map.set(name, trimmed);
    }
  }
  return Array.from(map.values()).join("; ");
};

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const TEST_USER = {
  name: "Test User",
  email: "test@example.com",
  password: "Test@1234",
};

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe("Auth API", () => {
  let csrfToken;
  let csrfCookies;

  beforeEach(async () => {
    mockRedisStore.clear();
    sendEmail.mockClear();
    
    const { redisClient } = require("../config/redis");
    redisClient.set.mockClear();
    redisClient.get.mockClear();
    redisClient.del.mockClear();
    redisClient.keys.mockClear();

    const csrf = await getCsrfToken();
    csrfToken = csrf.csrfToken;
    csrfCookies = csrf.cookieString;
  });

  // =========================================================================
  // CSRF protection
  // =========================================================================

  describe("CSRF Protection", () => {
    it("should reject POST requests without a CSRF token", async () => {
      const res = await request
        .post("/api/auth/register")
        .send(TEST_USER);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/csrf/i);
    });

    it("should reject POST requests with mismatched CSRF token", async () => {
      const res = await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", "wrong-token")
        .send(TEST_USER);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/csrf/i);
    });

    it("should allow GET requests without CSRF token", async () => {
      const res = await request.get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
    });
  });

  // =========================================================================
  // POST /api/auth/register
  // =========================================================================

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const res = await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send(TEST_USER);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data.user.email).toBe(TEST_USER.email);
      expect(res.body.data.user.name).toBe(TEST_USER.name);
      expect(res.body.data.user.role).toBe("student");
      // Password should NOT be returned
      expect(res.body.data.user.password).toBeUndefined();
    });

    it("should persist the user in the database", async () => {
      await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send(TEST_USER);

      const user = await User.findOne({ email: TEST_USER.email });
      expect(user).not.toBeNull();
      expect(user.name).toBe(TEST_USER.name);
      expect(user.isEmailVerified).toBe(false);
    });

    it("should hash the password before storing", async () => {
      await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send(TEST_USER);

      const user = await User.findOne({ email: TEST_USER.email }).select(
        "+password"
      );
      expect(user.password).not.toBe(TEST_USER.password);
      expect(user.password.length).toBeGreaterThan(0);
    });
    it("should send a verification email after registration", async () => {
      await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send(TEST_USER);

      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: TEST_USER.email })
      );
    });

    it("should reject duplicate email", async () => {
      // Create the user first
      await User.create(TEST_USER);

      const res = await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send(TEST_USER);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already in use/i);
    });

    it("should reject invalid email format", async () => {
      const res = await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ ...TEST_USER, email: "not-an-email" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/valid email/i);
    });

    it("should reject empty email", async () => {
      const res = await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ ...TEST_USER, email: "" });

      expect(res.status).toBe(400);
    });

    it("should normalize email to lowercase", async () => {
      const res = await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ ...TEST_USER, email: "Test@EXAMPLE.com" });

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe("test@example.com");
    });

    it("should reject password shorter than 8 characters", async () => {
      const res = await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ ...TEST_USER, password: "Ab@1" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/8 characters/i);
    });

    it("should reject password without uppercase letter", async () => {
      const res = await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ ...TEST_USER, password: "test@1234" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/uppercase/i);
    });

    it("should reject password without lowercase letter", async () => {
      const res = await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ ...TEST_USER, password: "TEST@1234" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/lowercase/i);
    });

    it("should reject password without a number", async () => {
      const res = await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ ...TEST_USER, password: "TestTest@" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/number/i);
    });

    it("should reject password without special character", async () => {
      const res = await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ ...TEST_USER, password: "TestTest1" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/special character/i);
    });

    it("should reject missing name", async () => {
      const res = await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      expect(res.status).toBe(400);
    });

    it("should reject missing password", async () => {
      const res = await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ name: TEST_USER.name, email: TEST_USER.email });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // POST /api/auth/login
  // =========================================================================

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Create a verified user
      const user = await User.create(TEST_USER);
      user.isEmailVerified = true;
      await user.save({ validateBeforeSave: false });
    });

    it("should login with correct credentials and set cookies", async () => {
      const res = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toBe("Login successful");
      expect(res.body.data.user.email).toBe(TEST_USER.email);
      expect(res.body.data.user.name).toBe(TEST_USER.name);

      // Should set httpOnly auth cookies
      const cookies = res.headers["set-cookie"] || [];
      const cookieNames = cookies.map((c) => c.split("=")[0]);
      expect(cookieNames).toContain("token");
      expect(cookieNames).toContain("refreshToken");
    });

    it("should store refresh token in Redis after login", async () => {
      await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      // There should be at least one refresh:* key in our mock store
      const keys = Array.from(mockRedisStore.keys());
      const refreshKeys = keys.filter((k) => k.startsWith("refresh:"));
      expect(refreshKeys.length).toBe(1);
    });

    it("should not return password in response", async () => {
      const res = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      expect(res.body.data.user.password).toBeUndefined();
    });

    it("should reject unverified email (returns 401 same as wrong creds)", async () => {
      // Create unverified user with different email
      await User.create({
        name: "Unverified",
        email: "unverified@example.com",
        password: TEST_USER.password,
      });

      const res = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({
          email: "unverified@example.com",
          password: TEST_USER.password,
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it("should reject wrong password", async () => {
      const res = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email, password: "Wrong@1234" });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it("should reject non-existent email", async () => {
      const res = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: "nobody@example.com", password: TEST_USER.password });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it("should reject missing email", async () => {
      const res = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ password: TEST_USER.password });

      expect(res.status).toBe(400);
    });

    it("should reject missing password", async () => {
      const res = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email });

      expect(res.status).toBe(400);
    });

    it("should handle case-insensitive email login", async () => {
      const res = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: "TEST@EXAMPLE.COM", password: TEST_USER.password });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(TEST_USER.email);
    });
  });

  // =========================================================================
  // GET /api/auth/verify-email
  // =========================================================================

  describe("GET /api/auth/verify-email", () => {
    it("should verify email with valid token", async () => {
      const user = await User.create(TEST_USER);
      const verifyToken = user.createEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      const res = await request
        .get(`/api/auth/verify-email?token=${verifyToken}`)
        .set("Accept", "application/json");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toMatch(/verified/i);

      // User should now be verified in DB
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.isEmailVerified).toBe(true);
      expect(updatedUser.emailVerificationToken).toBeUndefined();
      expect(updatedUser.emailVerificationExpires).toBeUndefined();
    });

    it("should set auth cookies upon successful verification", async () => {
      const user = await User.create(TEST_USER);
      const verifyToken = user.createEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      const res = await request
        .get(`/api/auth/verify-email?token=${verifyToken}`)
        .set("Accept", "application/json");

      expect(res.status).toBe(200);
      const cookies = res.headers["set-cookie"] || [];
      const cookieNames = cookies.map((c) => c.split("=")[0]);
      expect(cookieNames).toContain("token");
      expect(cookieNames).toContain("refreshToken");
    });

    it("should reject invalid token", async () => {
      const res = await request.get(
        "/api/auth/verify-email?token=invalidtoken123"
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid or expired/i);
    });

    it("should reject missing token", async () => {
      const res = await request.get("/api/auth/verify-email");

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/required/i);
    });

    it("should reject expired token", async () => {
      const user = await User.create(TEST_USER);
      const verifyToken = user.createEmailVerificationToken();
      // Force the expiry to the past
      user.emailVerificationExpires = Date.now() - 1000;
      await user.save({ validateBeforeSave: false });

      const res = await request.get(
        `/api/auth/verify-email?token=${verifyToken}`
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid or expired/i);
    });
  });

  // =========================================================================
  // POST /api/auth/resend-verification
  // =========================================================================

  describe("POST /api/auth/resend-verification", () => {
    it("should resend verification email for unverified user", async () => {
      sendEmail.mockClear();

      await User.create(TEST_USER);

      const res = await request
        .post("/api/auth/resend-verification")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    it("should return 200 for already-verified user (no info leak)", async () => {
      await User.create({ ...TEST_USER, isEmailVerified: true });

      const res = await request
        .post("/api/auth/resend-verification")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/already verified/i);
    });

    it("should return 200 for non-existent email (no info leak)", async () => {
      const res = await request
        .post("/api/auth/resend-verification")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: "nobody@example.com" });

      expect(res.status).toBe(200);
    });

    it("should reject invalid email format", async () => {
      const res = await request
        .post("/api/auth/resend-verification")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: "bad-email" });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // POST /api/auth/forgot-password
  // =========================================================================

  describe("POST /api/auth/forgot-password", () => {
    it("should send reset email for existing user", async () => {
      sendEmail.mockClear();

      await User.create({ ...TEST_USER, isEmailVerified: true });

      const res = await request
        .post("/api/auth/forgot-password")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    it("should store password reset token in database", async () => {
      await User.create({ ...TEST_USER, isEmailVerified: true });

      await request
        .post("/api/auth/forgot-password")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email });

      const user = await User.findOne({ email: TEST_USER.email });
      expect(user.passwordResetToken).toBeDefined();
      expect(user.passwordResetExpires).toBeDefined();
      expect(new Date(user.passwordResetExpires).getTime()).toBeGreaterThan(
        Date.now()
      );
    });

    it("should return 200 for non-existent email (no info leak)", async () => {
      const res = await request
        .post("/api/auth/forgot-password")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: "nobody@example.com" });

      expect(res.status).toBe(200);
    });

    it("should reject invalid email format", async () => {
      const res = await request
        .post("/api/auth/forgot-password")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: "notanemail" });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // POST /api/auth/reset-password
  // =========================================================================

  describe("POST /api/auth/reset-password", () => {
    it("should reset password with valid token", async () => {
      const user = await User.create({ ...TEST_USER, isEmailVerified: true });
      const resetToken = user.createPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      const newPassword = "NewPass@1234";
      const res = await request
        .post(`/api/auth/reset-password?token=${resetToken}`)
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ password: newPassword });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toMatch(/reset/i);

      // Verify the password was actually changed
      const updatedUser = await User.findById(user._id).select("+password");
      const canLogin = await updatedUser.comparePassword(newPassword);
      expect(canLogin).toBe(true);
    });

    it("should clear reset token from DB after use", async () => {
      const user = await User.create({ ...TEST_USER, isEmailVerified: true });
      const resetToken = user.createPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      await request
        .post(`/api/auth/reset-password?token=${resetToken}`)
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ password: "NewPass@1234" });

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.passwordResetToken).toBeUndefined();
      expect(updatedUser.passwordResetExpires).toBeUndefined();
    });

    it("should set auth cookies after successful reset", async () => {
      const user = await User.create({ ...TEST_USER, isEmailVerified: true });
      const resetToken = user.createPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      const res = await request
        .post(`/api/auth/reset-password?token=${resetToken}`)
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ password: "NewPass@1234" });

      const cookies = res.headers["set-cookie"] || [];
      const cookieNames = cookies.map((c) => c.split("=")[0]);
      expect(cookieNames).toContain("token");
      expect(cookieNames).toContain("refreshToken");
    });

    it("should reject invalid/expired token", async () => {
      const res = await request
        .post("/api/auth/reset-password?token=invalidtoken")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ password: "NewPass@1234" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid or expired/i);
    });

    it("should reject missing token", async () => {
      const res = await request
        .post("/api/auth/reset-password")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ password: "NewPass@1234" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/required/i);
    });

    it("should reject weak new password", async () => {
      const user = await User.create({ ...TEST_USER, isEmailVerified: true });
      const resetToken = user.createPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      const res = await request
        .post(`/api/auth/reset-password?token=${resetToken}`)
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ password: "weak" });

      expect(res.status).toBe(400);
    });

    it("should revoke all refresh tokens after reset", async () => {
      const user = await User.create({ ...TEST_USER, isEmailVerified: true });

      // Login first to create a refresh token in Redis
      await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const keysBeforeReset = Array.from(mockRedisStore.keys()).filter((k) =>
        k.startsWith("refresh:")
      );
      expect(keysBeforeReset.length).toBeGreaterThan(0);

      const resetToken = user.createPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      await request
        .post(`/api/auth/reset-password?token=${resetToken}`)
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ password: "NewPass@1234" });

      // Old refresh tokens for this user should be gone (new one created)
      // The mock store should still have one key (the NEW refresh token from the reset response)
      const keysAfterReset = Array.from(mockRedisStore.keys()).filter((k) =>
        k.startsWith("refresh:")
      );
      expect(keysAfterReset.length).toBe(1);
    });
  });

  // =========================================================================
  // POST /api/auth/change-password (requires auth)
  // =========================================================================

  describe("POST /api/auth/change-password", () => {
    let loginCookies;

    beforeEach(async () => {
      await User.create({ ...TEST_USER, isEmailVerified: true });

      // Login to get auth cookies
      const loginRes = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      loginCookies = mergeCookies(csrfCookies, extractCookies(loginRes));
    });

    it("should change password successfully", async () => {
      // Get fresh CSRF with login cookies
      const csrfRes = await request
        .get("/api/csrf-token")
        .set("Cookie", loginCookies);
      const newCsrf = csrfRes.body.data.csrfToken;
      const allCookies = mergeCookies(loginCookies, extractCookies(csrfRes));

      const res = await request
        .post("/api/auth/change-password")
        .set("Cookie", allCookies)
        .set("x-csrf-token", newCsrf)
        .send({
          currentPassword: TEST_USER.password,
          newPassword: "Changed@1234",
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toMatch(/changed/i);
    });

    it("should allow login with new password after change", async () => {
      const csrfRes = await request
        .get("/api/csrf-token")
        .set("Cookie", loginCookies);
      const newCsrf = csrfRes.body.data.csrfToken;
      const allCookies = mergeCookies(loginCookies, extractCookies(csrfRes));

      await request
        .post("/api/auth/change-password")
        .set("Cookie", allCookies)
        .set("x-csrf-token", newCsrf)
        .send({
          currentPassword: TEST_USER.password,
          newPassword: "Changed@1234",
        });

      // Get a new CSRF for the login attempt
      const csrf2 = await getCsrfToken();

      const loginRes = await request
        .post("/api/auth/login")
        .set("Cookie", csrf2.cookieString)
        .set("x-csrf-token", csrf2.csrfToken)
        .send({ email: TEST_USER.email, password: "Changed@1234" });

      expect(loginRes.status).toBe(200);
    });

    it("should reject wrong current password", async () => {
      const csrfRes = await request
        .get("/api/csrf-token")
        .set("Cookie", loginCookies);
      const newCsrf = csrfRes.body.data.csrfToken;
      const allCookies = mergeCookies(loginCookies, extractCookies(csrfRes));

      const res = await request
        .post("/api/auth/change-password")
        .set("Cookie", allCookies)
        .set("x-csrf-token", newCsrf)
        .send({
          currentPassword: "Wrong@1234",
          newPassword: "Changed@1234",
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/incorrect/i);
    });

    it("should reject weak new password", async () => {
      const csrfRes = await request
        .get("/api/csrf-token")
        .set("Cookie", loginCookies);
      const newCsrf = csrfRes.body.data.csrfToken;
      const allCookies = mergeCookies(loginCookies, extractCookies(csrfRes));

      const res = await request
        .post("/api/auth/change-password")
        .set("Cookie", allCookies)
        .set("x-csrf-token", newCsrf)
        .send({
          currentPassword: TEST_USER.password,
          newPassword: "weak",
        });

      expect(res.status).toBe(400);
    });

    it("should reject missing fields", async () => {
      const csrfRes = await request
        .get("/api/csrf-token")
        .set("Cookie", loginCookies);
      const newCsrf = csrfRes.body.data.csrfToken;
      const allCookies = mergeCookies(loginCookies, extractCookies(csrfRes));

      const res = await request
        .post("/api/auth/change-password")
        .set("Cookie", allCookies)
        .set("x-csrf-token", newCsrf)
        .send({ currentPassword: TEST_USER.password });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/required/i);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request
        .post("/api/auth/change-password")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({
          currentPassword: TEST_USER.password,
          newPassword: "Changed@1234",
        });

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // POST /api/auth/refresh-token
  // =========================================================================

  describe("POST /api/auth/refresh-token", () => {
    it("should refresh token successfully", async () => {
      await User.create({ ...TEST_USER, isEmailVerified: true });

      // Login to get tokens
      const loginRes = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const allCookies = mergeCookies(csrfCookies, extractCookies(loginRes));

      // Get fresh CSRF
      const csrfRes = await request
        .get("/api/csrf-token")
        .set("Cookie", allCookies);
      const newCsrf = csrfRes.body.data.csrfToken;
      const refreshCookies = mergeCookies(allCookies, extractCookies(csrfRes));

      const res = await request
        .post("/api/auth/refresh-token")
        .set("Cookie", refreshCookies)
        .set("x-csrf-token", newCsrf)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toMatch(/refreshed/i);

      // Should set new cookies
      const cookies = res.headers["set-cookie"] || [];
      const cookieNames = cookies.map((c) => c.split("=")[0]);
      expect(cookieNames).toContain("token");
      expect(cookieNames).toContain("refreshToken");
    });

    it("should reject when no refresh token cookie", async () => {
      const res = await request
        .post("/api/auth/refresh-token")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/required/i);
    });

    it("should reject invalid refresh token", async () => {
      const cookiesWithFakeRefresh = mergeCookies(
        csrfCookies,
        "refreshToken=invalid-jwt-token"
      );

      const res = await request
        .post("/api/auth/refresh-token")
        .set("Cookie", cookiesWithFakeRefresh)
        .set("x-csrf-token", csrfToken)
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it("should invalidate old refresh token after rotation", async () => {
      await User.create({ ...TEST_USER, isEmailVerified: true });

      const loginRes = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      // Extract the original refresh token cookie value
      const loginSetCookies = loginRes.headers["set-cookie"] || [];
      const refreshCookieStr = loginSetCookies
        .find((c) => c.startsWith("refreshToken="));
      const originalRefreshToken = refreshCookieStr
        ? refreshCookieStr.split(";")[0].split("=").slice(1).join("=")
        : null;
      expect(originalRefreshToken).toBeTruthy();

      const allCookies = mergeCookies(csrfCookies, extractCookies(loginRes));

      const csrfRes = await request
        .get("/api/csrf-token")
        .set("Cookie", allCookies);
      const newCsrf = csrfRes.body.data.csrfToken;
      const refreshCookies = mergeCookies(allCookies, extractCookies(csrfRes));

      // Perform the refresh
      await request
        .post("/api/auth/refresh-token")
        .set("Cookie", refreshCookies)
        .set("x-csrf-token", newCsrf)
        .send({});

      // The original refresh token key should be deleted from Redis
      const oldKey = `refresh:${originalRefreshToken}`;
      const { redisClient } = require("../config/redis");
      expect(redisClient.del).toHaveBeenCalledWith(oldKey);
    });
  });

  // =========================================================================
  // GET /api/auth/me (protected)
  // =========================================================================

  describe("GET /api/auth/me", () => {
    it("should return current user info when authenticated", async () => {
      await User.create({ ...TEST_USER, isEmailVerified: true });

      const loginRes = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const allCookies = mergeCookies(csrfCookies, extractCookies(loginRes));

      const res = await request
        .get("/api/auth/me")
        .set("Cookie", allCookies);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.user.email).toBe(TEST_USER.email);
      expect(res.body.data.user.name).toBe(TEST_USER.name);
      expect(res.body.data.user.role).toBe("student");
      expect(res.body.data.user.password).toBeUndefined();
    });

    it("should reject unauthenticated request", async () => {
      const res = await request.get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not authenticated/i);
    });

    it("should reject with invalid JWT", async () => {
      const res = await request
        .get("/api/auth/me")
        .set("Cookie", "token=invalid-jwt-here");

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // POST /api/auth/logout
  // =========================================================================

  describe("POST /api/auth/logout", () => {
    it("should logout successfully and clear cookies", async () => {
      await User.create({ ...TEST_USER, isEmailVerified: true });

      const loginRes = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const allCookies = mergeCookies(csrfCookies, extractCookies(loginRes));

      // Get fresh CSRF
      const csrfRes = await request
        .get("/api/csrf-token")
        .set("Cookie", allCookies);
      const newCsrf = csrfRes.body.data.csrfToken;
      const logoutCookies = mergeCookies(allCookies, extractCookies(csrfRes));

      const res = await request
        .post("/api/auth/logout")
        .set("Cookie", logoutCookies)
        .set("x-csrf-token", newCsrf)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toMatch(/logout/i);

      // Should clear auth cookies (maxAge=0)
      const cookies = res.headers["set-cookie"] || [];
      const tokenCookie = cookies.find((c) => c.startsWith("token="));
      expect(tokenCookie).toBeDefined();
      // maxAge=0 or expires in the past means clearing
      expect(tokenCookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    });

    it("should delete refresh token from Redis on logout", async () => {
      await User.create({ ...TEST_USER, isEmailVerified: true });

      const loginRes = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      // Confirm token is in Redis after login
      const keysAfterLogin = Array.from(mockRedisStore.keys()).filter((k) =>
        k.startsWith("refresh:")
      );
      expect(keysAfterLogin.length).toBe(1);

      const allCookies = mergeCookies(csrfCookies, extractCookies(loginRes));
      const csrfRes = await request
        .get("/api/csrf-token")
        .set("Cookie", allCookies);
      const newCsrf = csrfRes.body.data.csrfToken;
      const logoutCookies = mergeCookies(allCookies, extractCookies(csrfRes));

      await request
        .post("/api/auth/logout")
        .set("Cookie", logoutCookies)
        .set("x-csrf-token", newCsrf)
        .send({});

      // Refresh token should be removed from Redis
      const keysAfterLogout = Array.from(mockRedisStore.keys()).filter((k) =>
        k.startsWith("refresh:")
      );
      expect(keysAfterLogout.length).toBe(0);
    });

    it("should not fail when logging out without a refresh token", async () => {
      const res = await request
        .post("/api/auth/logout")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
    });
  });

  // =========================================================================
  // GET /api/auth/admin (role-based)
  // =========================================================================

  describe("GET /api/auth/admin (role-based authorization)", () => {
    it("should reject non-admin users", async () => {
      await User.create({ ...TEST_USER, isEmailVerified: true });

      const loginRes = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const allCookies = mergeCookies(csrfCookies, extractCookies(loginRes));

      const res = await request
        .get("/api/auth/admin")
        .set("Cookie", allCookies);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/forbidden/i);
    });

    it("should allow admin users", async () => {
      const adminUser = await User.create({
        ...TEST_USER,
        email: "admin@example.com",
        role: "admin",
        isEmailVerified: true,
      });

      const loginRes = await request
        .post("/api/auth/login")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: "admin@example.com", password: TEST_USER.password });

      const allCookies = mergeCookies(csrfCookies, extractCookies(loginRes));

      const res = await request
        .get("/api/auth/admin")
        .set("Cookie", allCookies);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/admin/i);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request.get("/api/auth/admin");

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // Full auth flow integration
  // =========================================================================

  describe("Full Auth Flow (integration)", () => {
    it("register → verify → login → me → change password → logout", async () => {
      // 1. Register
      const regRes = await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send(TEST_USER);

      expect(regRes.status).toBe(201);

      // 2. Verify email
      const user = await User.findOne({ email: TEST_USER.email });
      const verifyToken = user.createEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      const verifyRes = await request.get(
        `/api/auth/verify-email?token=${verifyToken}`
      );
      expect(verifyRes.status).toBe(200);

      // 3. Login
      const csrf2 = await getCsrfToken();
      const loginRes = await request
        .post("/api/auth/login")
        .set("Cookie", csrf2.cookieString)
        .set("x-csrf-token", csrf2.csrfToken)
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      expect(loginRes.status).toBe(200);

      // 4. Access /me
      const meCookies = mergeCookies(
        csrf2.cookieString,
        extractCookies(loginRes)
      );
      const meRes = await request
        .get("/api/auth/me")
        .set("Cookie", meCookies);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.email).toBe(TEST_USER.email);

      // 5. Change password
      const csrf3Res = await request
        .get("/api/csrf-token")
        .set("Cookie", meCookies);
      const csrf3 = csrf3Res.body.data.csrfToken;
      const changeCookies = mergeCookies(meCookies, extractCookies(csrf3Res));

      const changeRes = await request
        .post("/api/auth/change-password")
        .set("Cookie", changeCookies)
        .set("x-csrf-token", csrf3)
        .send({
          currentPassword: TEST_USER.password,
          newPassword: "NewFlow@1234",
        });

      expect(changeRes.status).toBe(200);

      // 6. Logout
      const logoutCookies = mergeCookies(
        changeCookies,
        extractCookies(changeRes)
      );
      const csrf4Res = await request
        .get("/api/csrf-token")
        .set("Cookie", logoutCookies);
      const csrf4 = csrf4Res.body.data.csrfToken;
      const finalCookies = mergeCookies(
        logoutCookies,
        extractCookies(csrf4Res)
      );

      const logoutRes = await request
        .post("/api/auth/logout")
        .set("Cookie", finalCookies)
        .set("x-csrf-token", csrf4)
        .send({});

      expect(logoutRes.status).toBe(200);

      // 7. Confirm can login with new password
      const csrf5 = await getCsrfToken();
      const newLoginRes = await request
        .post("/api/auth/login")
        .set("Cookie", csrf5.cookieString)
        .set("x-csrf-token", csrf5.csrfToken)
        .send({ email: TEST_USER.email, password: "NewFlow@1234" });

      expect(newLoginRes.status).toBe(200);
    });

    it("register → forgot password → reset → login with new password", async () => {
      // 1. Register
      await request
        .post("/api/auth/register")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send(TEST_USER);

      // Manually verify the user
      const user = await User.findOne({ email: TEST_USER.email });
      user.isEmailVerified = true;
      await user.save({ validateBeforeSave: false });

      // 2. Forgot password
      const forgotRes = await request
        .post("/api/auth/forgot-password")
        .set("Cookie", csrfCookies)
        .set("x-csrf-token", csrfToken)
        .send({ email: TEST_USER.email });

      expect(forgotRes.status).toBe(200);

      // 3. Get reset token from DB
      const updatedUser = await User.findOne({ email: TEST_USER.email });
      const resetToken = updatedUser.createPasswordResetToken();
      await updatedUser.save({ validateBeforeSave: false });

      // 4. Reset password
      const csrf2 = await getCsrfToken();
      const resetRes = await request
        .post(`/api/auth/reset-password?token=${resetToken}`)
        .set("Cookie", csrf2.cookieString)
        .set("x-csrf-token", csrf2.csrfToken)
        .send({ password: "Reset@5678" });

      expect(resetRes.status).toBe(200);

      // 5. Login with new password
      const csrf3 = await getCsrfToken();
      const loginRes = await request
        .post("/api/auth/login")
        .set("Cookie", csrf3.cookieString)
        .set("x-csrf-token", csrf3.csrfToken)
        .send({ email: TEST_USER.email, password: "Reset@5678" });

      expect(loginRes.status).toBe(200);

      // 6. Old password should not work
      const csrf4 = await getCsrfToken();
      const oldLoginRes = await request
        .post("/api/auth/login")
        .set("Cookie", csrf4.cookieString)
        .set("x-csrf-token", csrf4.csrfToken)
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      expect(oldLoginRes.status).toBe(401);
    });
  });
});
