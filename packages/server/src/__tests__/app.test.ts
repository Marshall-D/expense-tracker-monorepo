import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";

process.env.JWT_SECRET ??= "test-jwt-secret-for-vitest";
process.env.MONGO_URI ??= "mongodb://127.0.0.1:27017/expense-tracker-test";

const app = createApp();

describe("Express API", () => {
  it("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("mongo");
  });

  it("GET /api/expenses without Authorization returns 401", async () => {
    const res = await request(app).get("/api/expenses");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("unauthorized");
  });

  it("POST /api/auth/register with invalid body returns 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("GET /api/categories without Authorization returns 401", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(401);
  });

  it("GET /api/budgets without Authorization returns 401", async () => {
    const res = await request(app).get("/api/budgets");
    expect(res.status).toBe(401);
  });

  it("GET /api/reports/monthly without Authorization returns 401", async () => {
    const res = await request(app).get("/api/reports/monthly");
    expect(res.status).toBe(401);
  });
});
