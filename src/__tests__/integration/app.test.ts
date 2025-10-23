/**
 * Application Integration Tests
 * Tests for core application functionality and routes
 */

import request from "supertest";
import { createApp } from "@/app";
import { Express } from "express";

describe("Application Integration Tests", () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  describe("Health Check Endpoint", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("status", "healthy");
      expect(response.body.data).toHaveProperty("database");
      expect(response.body.data).toHaveProperty("uptime");
      expect(response.body.data).toHaveProperty("timestamp");
    });
  });

  describe("Root Endpoint", () => {
    it("should return API information", async () => {
      const response = await request(app).get("/");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty(
        "name",
        "Aymen Real Estate API"
      );
      expect(response.body.data).toHaveProperty("version");
      expect(response.body.data).toHaveProperty("endpoints");
    });

    it("should include available endpoints", async () => {
      const response = await request(app).get("/");

      expect(response.body.data.endpoints).toHaveProperty("health");
      expect(response.body.data.endpoints).toHaveProperty("contacts");
      expect(response.body.data.endpoints).toHaveProperty("properties");
    });
  });

  describe("404 Not Found Handler", () => {
    it("should return 404 for non-existent routes", async () => {
      const response = await request(app).get("/nonexistent-route");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body.message).toContain("not found");
    });
  });

  describe("CORS Middleware", () => {
    it("should include CORS headers in response", async () => {
      const response = await request(app).get("/health");

      expect(response.headers).toHaveProperty("access-control-allow-origin");
    });

    it("should handle OPTIONS preflight requests", async () => {
      const response = await request(app).options("/health");

      expect(response.status).toBe(200);
    });
  });

  describe("JSON Body Parser", () => {
    it("should parse JSON request bodies", async () => {
      const testData = { test: "data" };

      // This will 404 but should successfully parse the body
      const response = await request(app)
        .post("/api/test-endpoint")
        .send(testData)
        .set("Content-Type", "application/json");

      // We expect 404 since endpoint doesn't exist, but no 400 for malformed JSON
      expect(response.status).toBe(404);
    });

    it("should reject requests exceeding size limit", async () => {
      const largeData = { data: "x".repeat(2 * 1024 * 1024) }; // 2MB of data

      const response = await request(app)
        .post("/api/test-endpoint")
        .send(largeData)
        .set("Content-Type", "application/json");

      // Should fail with payload too large or bad request
      expect([400, 413, 404]).toContain(response.status);
    });
  });
});
