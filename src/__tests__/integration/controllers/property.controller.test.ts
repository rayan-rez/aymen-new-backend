/**
 * File: src/__tests__/integration/controllers/property.controller.test.ts
 * FIXED: Resolves empty results issue by ensuring proper cleanup
 */

import request from "supertest";
import { createApp } from "@/app";
import { Express } from "express";
import db from "@/config/database";
import ProjectModel, { ProjectStatus } from "@models/project.model";

describe("Property Controller", () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(async () => {
    // Clean database in correct order
    await db("floor_plans").del();
    await db("photos").del();
    await db("project_features").del();
    await db("projects").del();
  });

  afterAll(async () => {
    await db("floor_plans").del();
    await db("photos").del();
    await db("project_features").del();
    await db("projects").del();
    await db.destroy();
  });

  describe("GET /api/properties/projects", () => {
    it("should return all projects", async () => {
      // Create test projects with unique slugs
      await ProjectModel.create({
        name: "Project 1",
        slug: `project-1-${Date.now()}`,
        address: "Address 1",
      });

      await ProjectModel.create({
        name: "Project 2",
        slug: `project-2-${Date.now()}`,
        address: "Address 2",
      });

      const response = await request(app).get("/api/properties/projects");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it("should filter by status", async () => {
      const timestamp = Date.now();

      await ProjectModel.create({
        name: "Planning Project",
        slug: `planning-${timestamp}`,
        address: "Address 1",
        status: ProjectStatus.PLANNING,
      });

      await ProjectModel.create({
        name: "Completed Project",
        slug: `completed-${timestamp}`,
        address: "Address 2",
        status: ProjectStatus.COMPLETED,
      });

      const response = await request(app)
        .get("/api/properties/projects")
        .query({ status: ProjectStatus.COMPLETED });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe(ProjectStatus.COMPLETED);
    });

    it("should return featured projects only", async () => {
      const timestamp = Date.now();

      await ProjectModel.create({
        name: "Featured",
        slug: `featured-${timestamp}`,
        address: "Address 1",
        isFeatured: true,
      });

      await ProjectModel.create({
        name: "Not Featured",
        slug: `not-featured-${timestamp}`,
        address: "Address 2",
        isFeatured: false,
      });

      const response = await request(app)
        .get("/api/properties/projects")
        .query({ isFeatured: "true" });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].isFeatured).toBe(true);
    });

    it("should support pagination", async () => {
      // Create 15 projects
      for (let i = 1; i <= 15; i++) {
        await ProjectModel.create({
          name: `Project ${i}`,
          slug: `project-${i}-${Date.now()}`,
          address: `Address ${i}`,
        });
      }

      const response = await request(app)
        .get("/api/properties/projects")
        .query({ page: 2, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(5);
    });
  });

  describe("GET /api/properties/projects/featured", () => {
    it("should return only featured projects", async () => {
      const timestamp = Date.now();

      await ProjectModel.create({
        name: "Featured 1",
        slug: `featured-1-${timestamp}`,
        address: "Address 1",
        isFeatured: true,
      });

      await ProjectModel.create({
        name: "Not Featured",
        slug: `not-featured-${timestamp}`,
        address: "Address 2",
        isFeatured: false,
      });

      await ProjectModel.create({
        name: "Featured 2",
        slug: `featured-2-${timestamp}`,
        address: "Address 3",
        isFeatured: true,
      });

      const response = await request(app).get(
        "/api/properties/projects/featured"
      );

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data.every((p: any) => p.isFeatured)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const timestamp = Date.now();

      // Create 10 featured projects
      for (let i = 1; i <= 10; i++) {
        await ProjectModel.create({
          name: `Featured ${i}`,
          slug: `featured-${i}-${timestamp}`,
          address: `Address ${i}`,
          isFeatured: true,
        });
      }

      const response = await request(app)
        .get("/api/properties/projects/featured")
        .query({ limit: 3 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(3);
    });
  });

  describe("GET /api/properties/projects/:identifier", () => {
    it("should get project by slug", async () => {
      const slug = `test-project-${Date.now()}`;
      await ProjectModel.create({
        name: "Test Project",
        slug,
        address: "123 Test St",
        description: "Test description",
      });

      const response = await request(app).get(
        `/api/properties/projects/${slug}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe(slug);
      expect(response.body.data.name).toBe("Test Project");
    });

    it("should get project by ID", async () => {
      const project = await ProjectModel.create({
        name: "Test Project",
        slug: `test-id-${Date.now()}`,
        address: "123 Test St",
      });

      const response = await request(app).get(
        `/api/properties/projects/${project.id}`
      );

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(project.id);
    });

    it("should return 404 for non-existent project", async () => {
      const response = await request(app).get(
        "/api/properties/projects/non-existent-slug-999"
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/properties/projects", () => {
    it("should create a new project", async () => {
      const projectData = {
        name: "New Project",
        slug: `new-project-${Date.now()}`,
        address: "456 New St",
        status: ProjectStatus.PLANNING,
        description: "A new project",
      };

      const response = await request(app)
        .post("/api/properties/projects")
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(projectData.name);
      expect(response.body.data.slug).toBe(projectData.slug);
    });

    it("should validate required fields", async () => {
      const response = await request(app)
        .post("/api/properties/projects")
        .send({ name: "Incomplete Project" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should reject duplicate slugs", async () => {
      const slug = `duplicate-slug-${Date.now()}`;
      const projectData = {
        name: "Project",
        slug,
        address: "123 Test St",
      };

      await request(app).post("/api/properties/projects").send(projectData);

      const response = await request(app)
        .post("/api/properties/projects")
        .send(projectData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe("PUT /api/properties/projects/:id", () => {
    it("should update a project", async () => {
      const project = await ProjectModel.create({
        name: "Original Name",
        slug: `original-${Date.now()}`,
        address: "123 Test St",
      });

      const response = await request(app)
        .put(`/api/properties/projects/${project.id}`)
        .send({
          name: "Updated Name",
          description: "Updated description",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe("Updated Name");
      expect(response.body.data.description).toBe("Updated description");
    });

    it("should return 404 for non-existent project", async () => {
      const response = await request(app)
        .put("/api/properties/projects/99999")
        .send({ name: "Updated" });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/properties/projects/:id", () => {
    it("should soft delete a project", async () => {
      const slug = `to-delete-${Date.now()}`;
      const project = await ProjectModel.create({
        name: "To Delete",
        slug,
        address: "123 Test St",
      });

      const response = await request(app).delete(
        `/api/properties/projects/${project.id}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify project is soft deleted
      const found = await ProjectModel.findBySlug(slug);
      expect(found).toBeNull();

      const foundWithDeleted = await ProjectModel.findBySlug(slug, true);
      expect(foundWithDeleted).toBeDefined();
      expect(foundWithDeleted?.deletedAt).toBeDefined();
    });
  });
});
