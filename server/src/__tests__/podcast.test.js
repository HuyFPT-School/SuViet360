const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/User");
const Podcast = require("../models/Podcast");

// Helpers to get CSRF token and set auth cookies (similar to auth.test.js)
const getCsrfTokenAndCookie = async () => {
  const res = await request(app).get("/api/csrf-token");
  const csrfToken = res.body.data.csrfToken;
  const csrfCookie = res.headers["set-cookie"].find((c) => c.startsWith("csrf-token"));
  return { csrfToken, csrfCookie };
};

describe("Podcast API Endpoints", () => {
  let userToken;
  let userCookie;
  let staffToken;
  let staffCookie;
  let csrfToken;
  let csrfCookie;

  beforeEach(async () => {
    // Get CSRF token
    const csrf = await getCsrfTokenAndCookie();
    csrfToken = csrf.csrfToken;
    csrfCookie = csrf.csrfCookie;

    // Create user
    const user = await User.create({
      name: "Normal User",
      email: "user@test.com",
      password: "password123",
      isEmailVerified: true,
      role: "user",
    });

    // Create staff
    const staff = await User.create({
      name: "Staff User",
      email: "staff@test.com",
      password: "password123",
      isEmailVerified: true,
      role: "staff",
    });

    // Login user to get token
    const loginUserRes = await request(app)
      .post("/api/auth/login")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({ email: "user@test.com", password: "password123" });
    
    userCookie = loginUserRes.headers["set-cookie"];

    // Login staff to get token
    const loginStaffRes = await request(app)
      .post("/api/auth/login")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({ email: "staff@test.com", password: "password123" });

    staffCookie = loginStaffRes.headers["set-cookie"];
  });

  describe("GET /api/podcasts", () => {
    it("should return empty list of podcasts when none exist", async () => {
      const res = await request(app).get("/api/podcasts");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe("POST /api/staff/podcasts", () => {
    it("should fail with 401 when not logged in", async () => {
      const res = await request(app)
        .post("/api/staff/podcasts")
        .set("x-csrf-token", csrfToken)
        .set("Cookie", csrfCookie)
        .send({ title: "Test Podcast" });

      expect(res.status).toBe(401);
    });

    it("should fail with 403 when logged in as normal user (not staff)", async () => {
      const cookies = [csrfCookie, ...userCookie];
      const res = await request(app)
        .post("/api/staff/podcasts")
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookies)
        .send({ title: "Test Podcast" });

      expect(res.status).toBe(403);
    });

    it("should pass auth checks and allow staff to hit the endpoint (validation fails on missing files)", async () => {
      const cookies = [csrfCookie, ...staffCookie];
      const res = await request(app)
        .post("/api/staff/podcasts")
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookies)
        .send({ title: "Test Podcast" });

      // Should fail on validation / files missing rather than authentication/authorization
      expect(res.status).toBe(400); 
      expect(res.body.message).toContain("files are required");
    });
  });
});
