const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/User");
const Lesson = require("../models/Lesson");

const getCsrfTokenAndCookie = async () => {
  const res = await request(app).get("/api/csrf-token");
  const csrfToken = res.body.data.csrfToken;
  const csrfCookie = res.headers["set-cookie"].find((c) => c.startsWith("csrf-token"));
  return { csrfToken, csrfCookie };
};

describe("Game/Lesson Collection and API Tests", () => {
  let teacherCookie;
  let csrfToken;
  let csrfCookie;

  beforeEach(async () => {
    // Clean collections before each test (handled by setup.js, but let's be safe)
    await Lesson.deleteMany({});
    await User.deleteMany({});

    const csrf = await getCsrfTokenAndCookie();
    csrfToken = csrf.csrfToken;
    csrfCookie = csrf.csrfCookie;

    // Create a teacher user
    const teacher = await User.create({
      name: "Teacher User",
      email: "teacher@test.com",
      password: "password123",
      isEmailVerified: true,
      role: "teacher",
    });

    // Login teacher to get auth cookies
    const loginRes = await request(app)
      .post("/api/auth/login")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({ email: "teacher@test.com", password: "password123" });
    
    teacherCookie = loginRes.headers["set-cookie"];
  });

  describe("Database Collection Mapping Integration", () => {
    it("should write documents to the 'games' collection in MongoDB under the hood", async () => {
      // 1. Create a lesson using Mongoose model
      const testLesson = await Lesson.create({
        title: "BÀI 1: LIÊN HỢP QUỐC",
        content: "Nội dung học thử về Liên Hợp Quốc.",
        game: {
          tilemapJsonUrl: "http://example.com/map.json",
          tilesets: [],
          character: { animations: [] },
          spawnPoint: { x: 100, y: 200 }
        },
        status: "Pending_Review"
      });

      expect(testLesson).toBeDefined();
      expect(testLesson.title).toBe("BÀI 1: LIÊN HỢP QUỐC");

      // 2. Query MongoDB collection directly using mongoose connection
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      // The collection name should be 'games', NOT 'lessons'!
      expect(collectionNames).toContain("games");
      expect(collectionNames).not.toContain("lessons");

      // 3. Fetch documents directly from the 'games' collection using node driver
      const rawDocuments = await mongoose.connection.db.collection("games").find({}).toArray();
      expect(rawDocuments.length).toBe(1);
      expect(rawDocuments[0].title).toBe("BÀI 1: LIÊN HỢP QUỐC");
    });
  });

  describe("API Integration - GET /api/lessons", () => {
    it("should return the created game records from the 'games' collection via public routes", async () => {
      // Seed a game
      await Lesson.create({
        title: "BÀI 2: CHIẾN TRANH LẠNH",
        content: "Chi tiết thế giới trong chiến tranh lạnh.",
        game: {
          tilemapJsonUrl: "http://example.com/map2.json",
          spawnPoint: { x: 150, y: 250 }
        },
        status: "Published"
      });

      // Query the API public GET endpoint
      const res = await request(app).get("/api/lessons");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.lessons.length).toBe(1);
      expect(res.body.lessons[0].title).toBe("BÀI 2: CHIẾN TRANH LẠNH");
    });

    it("should fetch a single game record by ID correctly", async () => {
      const game = await Lesson.create({
        title: "BÀI 3: THẾ GIỚI SAU CHIẾN TRANH LẠNH",
        content: "Chi tiết bài học thế giới sau chiến tranh lạnh.",
        game: {
          tilemapJsonUrl: "http://example.com/map3.json",
          spawnPoint: { x: 200, y: 300 }
        },
        status: "Published"
      });

      const res = await request(app).get(`/api/lessons/${game._id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.lesson.title).toBe("BÀI 3: THẾ GIỚI SAU CHIẾN TRANH LẠNH");
    });
  });

  describe("API Integration - PUT /api/lessons/:id/approve", () => {
    it("should allow teacher to approve a pending review game record", async () => {
      const pendingGame = await Lesson.create({
        title: "BÀI 15: HỒ CHÍ MINH",
        content: "Khái quát cuộc đời và sự nghiệp.",
        game: {
          tilemapJsonUrl: "http://example.com/map15.json",
          spawnPoint: { x: 50, y: 50 }
        },
        status: "Pending_Review"
      });

      const cookies = [csrfCookie, ...teacherCookie];

      const res = await request(app)
        .put(`/api/lessons/${pendingGame._id}/approve`)
        .set("x-csrf-token", csrfToken)
        .set("Cookie", cookies)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify DB status updated to Published
      const updated = await Lesson.findById(pendingGame._id);
      expect(updated.status).toBe("Published");
    });
  });
});
