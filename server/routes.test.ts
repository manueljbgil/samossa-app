import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { createApiApp } from "./app";

let app: Awaited<ReturnType<typeof createApiApp>>["app"];

beforeAll(async () => {
  const built = await createApiApp();
  app = built.app;
});

describe("API routes", () => {
  it("returns seeded places", async () => {
    const response = await request(app).get("/api/places");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it("supports register and me endpoint with bearer auth", async () => {
    const username = `api-test-${Date.now()}`;

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        username,
        password: "secret123",
        displayName: "API Test User",
      });

    expect(registerResponse.status).toBe(200);
    expect(registerResponse.body.token).toEqual(expect.any(String));
    expect(registerResponse.body.user.username).toBe(username);

    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${registerResponse.body.token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user).not.toBeNull();
    expect(meResponse.body.user.username).toBe(username);
  });

  it("rejects unauthenticated place creation", async () => {
    const response = await request(app).post("/api/places").send({
      name: "No Auth Place",
      kind: "restaurant",
      area: "Center",
      city: "Lisbon",
      address: "No street",
      description: "Should fail without auth",
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("auth required");
  });
});
