/**
 * Basic auth flow tests. Requires a test DATABASE_URL and JWT_SECRET set
 * in the test environment (see package.json "test" script / CI config).
 */
const request = require("supertest");
const app = require("../server");

describe("Auth", () => {
  it("rejects login with missing credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });

  it("rejects login with wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "amani", password: "wrong-password" });
    expect([401, 400]).toContain(res.status);
  });

  it("rejects unauthenticated dashboard access", async () => {
    const res = await request(app).get("/api/dashboard");
    expect(res.status).toBe(401);
  });
});
