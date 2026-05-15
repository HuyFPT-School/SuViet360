const request = require("supertest");
const app = require("../src/app");

describe("Auth API", () => {
  it("returns healthy API response", async () => {
    const healthRes = await request(app).get("/api/health");
    expect(healthRes.statusCode).toBe(200);
    expect(healthRes.body.status).toBe("success");
  });

  it("blocks protected route without token", async () => {
    const meRes = await request(app).get("/api/auth/me");

    expect(meRes.statusCode).toBe(401);
  });
});
