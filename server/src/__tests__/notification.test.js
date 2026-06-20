const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/User");
const Notification = require("../models/Notification");

const getCsrfTokenAndCookie = async () => {
  const res = await request(app).get("/api/csrf-token");
  const csrfToken = res.body.data.csrfToken;
  const csrfCookie = res.headers["set-cookie"].find((c) => c.startsWith("csrf-token"));
  return { csrfToken, csrfCookie };
};

describe("Notification API Endpoints", () => {
  let userToken;
  let userCookie;
  let csrfToken;
  let csrfCookie;
  let testUser;

  beforeEach(async () => {
    // Get CSRF token
    const csrf = await getCsrfTokenAndCookie();
    csrfToken = csrf.csrfToken;
    csrfCookie = csrf.csrfCookie;

    // Create user
    testUser = await User.create({
      name: "Notification User",
      email: "notif_user@test.com",
      password: "password123",
      isEmailVerified: true,
      role: "user",
    });

    // Login user to get token
    const loginUserRes = await request(app)
      .post("/api/auth/login")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({ email: "notif_user@test.com", password: "password123" });
    
    userCookie = loginUserRes.headers["set-cookie"];
  });

  describe("POST /api/user/notifications/follow & /unfollow", () => {
    it("should allow a logged-in user to follow a category", async () => {
      const cookies = [csrfCookie, ...userCookie];
      const res = await request(app)
        .post("/api/user/notifications/follow")
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookies)
        .send({ category: "Chủ đề 1" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.category).toBe("Chủ đề 1");

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.followedCategories).toContain("Chủ đề 1");
    });

    it("should allow a logged-in user to unfollow a category", async () => {
      // First manually set user's followed category
      await User.findByIdAndUpdate(testUser._id, {
        $addToSet: { followedCategories: "Chủ đề 1" }
      });

      const cookies = [csrfCookie, ...userCookie];
      const res = await request(app)
        .post("/api/user/notifications/unfollow")
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookies)
        .send({ category: "Chủ đề 1" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.followedCategories).not.toContain("Chủ đề 1");
    });

    it("should get the list of followed categories", async () => {
      await User.findByIdAndUpdate(testUser._id, {
        $addToSet: { followedCategories: "Chủ đề 2" }
      });

      const cookies = [csrfCookie, ...userCookie];
      const res = await request(app)
        .get("/api/user/notifications/followed")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toContain("Chủ đề 2");
    });
  });

  describe("GET and PUT /api/user/notifications", () => {
    let notif1;
    let notif2;

    beforeEach(async () => {
      notif1 = await Notification.create({
        recipient: testUser._id,
        title: "Thông báo 1",
        message: "Nội dung 1",
        link: "/podcasts/1",
        isRead: false,
      });

      notif2 = await Notification.create({
        recipient: testUser._id,
        title: "Thông báo 2",
        message: "Nội dung 2",
        link: "/podcasts/2",
        isRead: true,
      });
    });

    it("should fetch all notifications and correct unreadCount", async () => {
      const cookies = [csrfCookie, ...userCookie];
      const res = await request(app)
        .get("/api/user/notifications")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.unreadCount).toBe(1);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].title).toBe("Thông báo 2"); // sorted by createdAt desc
    });

    it("should mark a notification as read", async () => {
      const cookies = [csrfCookie, ...userCookie];
      const res = await request(app)
        .put(`/api/user/notifications/${notif1._id}/read`)
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.unreadCount).toBe(0);
      expect(res.body.data.isRead).toBe(true);

      const updatedNotif = await Notification.findById(notif1._id);
      expect(updatedNotif.isRead).toBe(true);
    });

    it("should mark all notifications as read", async () => {
      const cookies = [csrfCookie, ...userCookie];
      const res = await request(app)
        .put("/api/user/notifications/read-all")
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.unreadCount).toBe(0);

      const unreadCount = await Notification.countDocuments({ recipient: testUser._id, isRead: false });
      expect(unreadCount).toBe(0);
    });
  });
});
