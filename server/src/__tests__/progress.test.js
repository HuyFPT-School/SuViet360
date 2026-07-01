const request = require("supertest");
const app = require("../app");
const User = require("../models/User");
const Lesson = require("../models/Lesson");
const Podcast = require("../models/Podcast");
const UserProgress = require("../models/UserProgress");
const XPHistory = require("../models/XPHistory");

const getCsrfTokenAndCookie = async () => {
  const res = await request(app).get("/api/csrf-token");
  const csrfToken = res.body.data.csrfToken;
  const csrfCookie = res.headers["set-cookie"].find((c) =>
    c.startsWith("csrf-token")
  );
  return { csrfToken, csrfCookie };
};

describe("Progress & Gamification API Endpoints", () => {
  let userCookie;
  let csrfToken;
  let csrfCookie;
  let testUser;
  let testLesson;
  let testPodcast;

  beforeEach(async () => {
    // 1. Get CSRF token
    const csrf = await getCsrfTokenAndCookie();
    csrfToken = csrf.csrfToken;
    csrfCookie = csrf.csrfCookie;

    // 2. Create test student
    testUser = await User.create({
      name: "Progress Student",
      email: "progress_student@test.com",
      password: "password123",
      isEmailVerified: true,
      role: "student",
      xp: 0,
      level: 1,
    });

    // 3. Login to get session cookies
    const loginRes = await request(app)
      .post("/api/auth/login")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({ email: "progress_student@test.com", password: "password123" });

    if (loginRes.status !== 200) {
      console.error("Login failed:", loginRes.status, loginRes.body);
    }
    expect(loginRes.status).toBe(200);

    userCookie = loginRes.headers["set-cookie"];

    // 4. Create test lesson and podcast
    testLesson = await Lesson.create({
      title: "Bài Học Tế Bào Mẫu",
      content: "Nội dung bài học thử nghiệm",
      status: "Published",
      game: {
        tilemapJsonUrl: "http://example.com/map.json",
        tilesets: [{ name: "tileset1", imageUrl: "http://example.com/tileset.png" }],
        character: {
          animations: [
            {
              name: "idle",
              frames: [{ key: "idle1", frame: 0, imageUrl: "http://example.com/idle1.png" }],
            }
          ],
        },
        spawnPoint: { x: 100, y: 100 },
      },
    });

    testPodcast = await Podcast.create({
      title: "Podcast Tế Bào Mẫu",
      audioUrl: "http://example.com/audio.mp3",
      thumbnail: "http://example.com/thumbnail.png",
      status: "Published",
      category: "Lịch sử Việt Nam",
      description: "Podcast thử nghiệm",
      createdBy: testUser._id,
    });
  });

  describe("GET /api/progress/dashboard", () => {
    it("should return the progress dashboard with default values", async () => {
      const cookies = [csrfCookie, ...userCookie];
      const res = await request(app)
        .get("/api/progress/dashboard")
        .set("Cookie", cookies);

      console.log("DASHBOARD RESP:", res.status, res.body);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.xp).toBe(0);
      expect(res.body.data.level).toBe(1);
      expect(res.body.data.completedLessons).toHaveLength(0);
      expect(res.body.data.unlockedLessons).toContain(
        testLesson._id.toString()
      );
    });
  });

  describe("POST /api/progress/lesson/:id/complete", () => {
    it("should complete a lesson, award 100 XP, and log to XPHistory", async () => {
      const cookies = [csrfCookie, ...userCookie];
      const res = await request(app)
        .post(`/api/progress/lesson/${testLesson._id}/complete`)
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.xp).toBe(100);
      expect(res.body.data.level).toBe(2); // sqrt(100/100) + 1 = 2

      // Verify db changes
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.xp).toBe(100);
      expect(updatedUser.level).toBe(2);

      const history = await XPHistory.findOne({ userId: testUser._id, source: "Lesson" });
      expect(history.amount).toBe(100);
    });

    it("should not award duplicate XP if lesson is completed again", async () => {
      const cookies = [csrfCookie, ...userCookie];
      
      // Complete 1st time
      await request(app)
        .post(`/api/progress/lesson/${testLesson._id}/complete`)
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookies);

      // Complete 2nd time
      const res = await request(app)
        .post(`/api/progress/lesson/${testLesson._id}/complete`)
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.xp).toBe(100); // remains 100
    });
  });

  describe("POST /api/progress/podcast/:id/complete", () => {
    it("should complete a podcast and award 50 XP", async () => {
      const cookies = [csrfCookie, ...userCookie];
      const res = await request(app)
        .post(`/api/progress/podcast/${testPodcast._id}/complete`)
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.xp).toBe(50);
    });
  });

  describe("POST /api/progress/quiz/:id/submit", () => {
    it("should award 150 XP on passing score (>= 50%)", async () => {
      const cookies = [csrfCookie, ...userCookie];
      const res = await request(app)
        .post(`/api/progress/quiz/${testLesson._id}/submit`)
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookies)
        .send({ score: 3, total: 5 }); // 60%

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.passed).toBe(true);
      expect(res.body.data.xpGained).toBe(150);
    });

    it("should award 50 XP on failing score (< 50%)", async () => {
      const cookies = [csrfCookie, ...userCookie];
      const res = await request(app)
        .post(`/api/progress/quiz/${testLesson._id}/submit`)
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookies)
        .send({ score: 1, total: 5 }); // 20%

      expect(res.status).toBe(200);
      expect(res.body.data.passed).toBe(false);
      expect(res.body.data.xpGained).toBe(50);
    });

    it("should award difference (+100 XP) if retaken and passed after a failure", async () => {
      const cookies = [csrfCookie, ...userCookie];
      
      // Fail first
      await request(app)
        .post(`/api/progress/quiz/${testLesson._id}/submit`)
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookies)
        .send({ score: 1, total: 5 }); // +50 XP

      // Pass second
      const res = await request(app)
        .post(`/api/progress/quiz/${testLesson._id}/submit`)
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookies)
        .send({ score: 4, total: 5 }); // passed -> should award 150 - 50 = +100 XP

      expect(res.status).toBe(200);
      expect(res.body.data.passed).toBe(true);
      expect(res.body.data.xpGained).toBe(100);
    });
  });

  describe("GET /api/progress/leaderboard", () => {
    it("should return the leaderboard sorted by XP", async () => {
      // Create another student with higher XP
      await User.create({
        name: "Top Student",
        email: "top@test.com",
        password: "password123",
        isEmailVerified: true,
        role: "student",
        xp: 500,
        level: 3,
      });

      const res = await request(app).get("/api/progress/leaderboard");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.leaderboard[0].name).toBe("Top Student");
      expect(res.body.data.leaderboard[1].name).toBe("Progress Student");
    });
  });
});
