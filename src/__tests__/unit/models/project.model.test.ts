/**
 * Model Tests
 * Comprehensive tests for database models
 * File: src/__tests__/unit/models/project.model.test.ts
 */

import ProjectModel, { ProjectStatus } from "@models/project.model";
import PhotoModel, { PhotoableType } from "@models/photo.model";
import FloorPlanModel, { PlannableType } from "@models/floor-plan.model";
import db from "@/config/database";

describe("ProjectModel", () => {
  // Clean up database before each test
  beforeEach(async () => {
    // Truncate tables in correct order (respecting foreign keys)
    await db("floor_plans").del();
    await db("photos").del();
    await db("project_features").del();
    await db("projects").del();
  });

  afterAll(async () => {
    // Close database connection
    await db.destroy();
  });

  describe("create", () => {
    it("should create a new project", async () => {
      const projectData = {
        name: "Test Project",
        slug: "test-project",
        address: "123 Test St",
        status: ProjectStatus.PLANNING,
      };

      const project = await ProjectModel.create(projectData);

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.name).toBe(projectData.name);
      expect(project.slug).toBe(projectData.slug);
      expect(project.status).toBe(ProjectStatus.PLANNING);
    });

    it("should fail to create project with duplicate slug", async () => {
      const projectData = {
        name: "Test Project",
        slug: "duplicate-slug",
        address: "123 Test St",
      };

      await ProjectModel.create(projectData);

      // Attempting to create another project with same slug should fail
      await expect(ProjectModel.create(projectData)).rejects.toThrow();
    });
  });

  describe("findById", () => {
    it("should find project by id", async () => {
      const created = await ProjectModel.create({
        name: "Test Project",
        slug: "find-by-id",
        address: "123 Test St",
      });

      const found = await ProjectModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe(created.name);
    });

    it("should return null for non-existent id", async () => {
      const found = await ProjectModel.findById(99999);
      expect(found).toBeNull();
    });
  });

  describe("findBySlug", () => {
    it("should find project by slug", async () => {
      const created = await ProjectModel.create({
        name: "Test Project",
        slug: "test-slug",
        address: "123 Test St",
      });

      const found = await ProjectModel.findBySlug("test-slug");

      expect(found).toBeDefined();
      expect(found?.slug).toBe("test-slug");
      expect(found?.id).toBe(created.id);
    });

    it("should return null for non-existent slug", async () => {
      const found = await ProjectModel.findBySlug("non-existent");
      expect(found).toBeNull();
    });
  });

  describe("update", () => {
    it("should update project fields", async () => {
      const created = await ProjectModel.create({
        name: "Original Name",
        slug: "original-slug",
        address: "123 Test St",
      });

      const updated = await ProjectModel.update(created.id, {
        name: "Updated Name",
        description: "New description",
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe("Updated Name");
      expect(updated?.description).toBe("New description");
      expect(updated?.slug).toBe("original-slug"); // Unchanged
    });

    it("should return null when updating non-existent project", async () => {
      const updated = await ProjectModel.update(99999, { name: "Test" });
      expect(updated).toBeNull();
    });
  });

  describe("softDelete", () => {
    it("should soft delete a project", async () => {
      const created = await ProjectModel.create({
        name: "Test Project",
        slug: "delete-test",
        address: "123 Test St",
      });

      const deleted = await ProjectModel.softDelete(created.id);
      expect(deleted).toBe(true);

      // Should not be found in normal queries
      const found = await ProjectModel.findBySlug("delete-test");
      expect(found).toBeNull();

      // Should be found when including deleted
      const foundWithDeleted = await ProjectModel.findBySlug(
        "delete-test",
        true
      );
      expect(foundWithDeleted).toBeDefined();
      expect(foundWithDeleted?.deletedAt).toBeDefined();
    });
  });

  describe("getFeatured", () => {
    it("should return only featured projects", async () => {
      await ProjectModel.create({
        name: "Featured 1",
        slug: "featured-1",
        address: "123 Test St",
        isFeatured: true,
      });

      await ProjectModel.create({
        name: "Not Featured",
        slug: "not-featured",
        address: "456 Test St",
        isFeatured: false,
      });

      await ProjectModel.create({
        name: "Featured 2",
        slug: "featured-2",
        address: "789 Test St",
        isFeatured: true,
      });

      const featured = await ProjectModel.getFeatured(10);

      expect(featured).toHaveLength(2);
      expect(featured.every((p) => p.isFeatured)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      // Create 5 featured projects
      for (let i = 0; i < 5; i++) {
        await ProjectModel.create({
          name: `Featured ${i}`,
          slug: `featured-${i}`,
          address: "123 Test St",
          isFeatured: true,
        });
      }

      const featured = await ProjectModel.getFeatured(3);
      expect(featured).toHaveLength(3);
    });
  });

  describe("updateCompletionPercentage", () => {
    it("should update completion percentage", async () => {
      const project = await ProjectModel.create({
        name: "Test Project",
        slug: "completion-test",
        address: "123 Test St",
      });

      const updated = await ProjectModel.updateCompletionPercentage(
        project.id,
        75
      );
      expect(updated).toBe(true);

      const found = await ProjectModel.findById(project.id);
      expect(found?.completionPercentage).toBe(75);
    });

    it("should reject invalid percentages", async () => {
      const project = await ProjectModel.create({
        name: "Test Project",
        slug: "invalid-percentage",
        address: "123 Test St",
      });

      await expect(
        ProjectModel.updateCompletionPercentage(project.id, 150)
      ).rejects.toThrow();

      await expect(
        ProjectModel.updateCompletionPercentage(project.id, -10)
      ).rejects.toThrow();
    });
  });

  describe("Polymorphic Relations", () => {
    it("should add and retrieve photos", async () => {
      const project = await ProjectModel.create({
        name: "Test Project",
        slug: "photo-test",
        address: "123 Test St",
      });

      const photos = await PhotoModel.bulkCreate(
        PhotoableType.PROJECT,
        project.id,
        [
          { url: "photo1.jpg", caption: "Test 1", isCover: true },
          { url: "photo2.jpg", caption: "Test 2" },
        ]
      );

      expect(photos).toHaveLength(2);

      const retrieved = await PhotoModel.getForEntity(
        PhotoableType.PROJECT,
        project.id
      );
      expect(retrieved).toHaveLength(2);
    });

    it("should add and retrieve floor plans", async () => {
      const project = await ProjectModel.create({
        name: "Test Project",
        slug: "floor-plan-test",
        address: "123 Test St",
      });

      const plans = await FloorPlanModel.bulkCreate(
        PlannableType.PROJECT,
        project.id,
        [
          { name: "Ground Floor", imageUrl: "plan1.jpg" },
          { name: "First Floor", imageUrl: "plan2.jpg" },
        ]
      );

      expect(plans).toHaveLength(2);

      const retrieved = await FloorPlanModel.getForEntity(
        PlannableType.PROJECT,
        project.id
      );
      expect(retrieved).toHaveLength(2);
    });

    it("should set cover photo correctly", async () => {
      const project = await ProjectModel.create({
        name: "Test Project",
        slug: "cover-photo-test",
        address: "123 Test St",
      });

      const photos = await PhotoModel.bulkCreate(
        PhotoableType.PROJECT,
        project.id,
        [{ url: "photo1.jpg" }, { url: "photo2.jpg" }, { url: "photo3.jpg" }]
      );

      await PhotoModel.setCover(photos[1].id);

      const coverPhoto = await PhotoModel.getCoverPhoto(
        PhotoableType.PROJECT,
        project.id
      );

      expect(coverPhoto).toBeDefined();
      expect(coverPhoto?.id).toBe(photos[1].id);
      expect(coverPhoto?.isCover).toBe(true);

      // Verify only one cover photo
      const allPhotos = await PhotoModel.getForEntity(
        PhotoableType.PROJECT,
        project.id
      );
      const coverCount = allPhotos.filter((p) => p.isCover).length;
      expect(coverCount).toBe(1);
    });
  });
});

