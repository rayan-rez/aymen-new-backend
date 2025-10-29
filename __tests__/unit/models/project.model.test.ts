/**
 * File: src/__tests__/unit/models/project.model.test.ts
 * FIXED: Proper cleanup and unique identifiers with memory leak prevention
 */

import ProjectModel, { ProjectStatus } from "@models/project.model";
import PhotoModel, { PhotoableType } from "@models/photo.model";
import FloorPlanModel, { PlannableType } from "@models/floor-plan.model";
import { closeDatabase, cleanTables } from "@tests/helpers/test-db";

// Helper to generate unique slug
const uniqueSlug = (prefix: string) => 
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

describe("ProjectModel", () => {
  beforeEach(async () => {
    // Clean up in correct order (respecting foreign keys)
    await cleanTables([
      "floor_plans",
      "photos", 
      "project_features",
      "projects"
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await cleanTables([
      "floor_plans",
      "photos",
      "project_features", 
      "projects"
    ]);
    
    // Small delay before closing connection
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // CRITICAL: Close database connection to prevent memory leaks
    await closeDatabase();
  });

  describe("create", () => {
    it("should create a new project", async () => {
      const projectData = {
        name: "Test Project",
        slug: uniqueSlug("test-project"),
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
      const slug = uniqueSlug("duplicate-slug");
      const projectData = {
        name: "Test Project",
        slug,
        address: "123 Test St",
      };

      await ProjectModel.create(projectData);
      await expect(ProjectModel.create(projectData)).rejects.toThrow();
    });
  });

  describe("findById", () => {
    it("should find project by id", async () => {
      const created = await ProjectModel.create({
        name: "Test Project",
        slug: uniqueSlug("find-by-id"),
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
      const slug = uniqueSlug("test-slug");
      const created = await ProjectModel.create({
        name: "Test Project",
        slug,
        address: "123 Test St",
      });

      const found = await ProjectModel.findBySlug(slug);

      expect(found).toBeDefined();
      expect(found?.slug).toBe(slug);
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
        slug: uniqueSlug("original-slug"),
        address: "123 Test St",
      });

      const updated = await ProjectModel.update(created.id, {
        name: "Updated Name",
        description: "New description",
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe("Updated Name");
      expect(updated?.description).toBe("New description");
      expect(updated?.slug).toBe(created.slug);
    });

    it("should return null when updating non-existent project", async () => {
      const updated = await ProjectModel.update(99999, { name: "Test" });
      expect(updated).toBeNull();
    });
  });

  describe("softDelete", () => {
    it("should soft delete a project", async () => {
      const slug = uniqueSlug("delete-test");
      const created = await ProjectModel.create({
        name: "Test Project",
        slug,
        address: "123 Test St",
      });

      const deleted = await ProjectModel.softDelete(created.id);
      expect(deleted).toBe(true);

      const found = await ProjectModel.findBySlug(slug);
      expect(found).toBeNull();

      const foundWithDeleted = await ProjectModel.findBySlug(slug, true);
      expect(foundWithDeleted).toBeDefined();
      expect(foundWithDeleted?.deletedAt).toBeDefined();
    });
  });

  describe("getFeatured", () => {
    it("should return only featured projects", async () => {
      await ProjectModel.create({
        name: "Featured 1",
        slug: uniqueSlug("featured-1"),
        address: "123 Test St",
        isFeatured: true,
      });

      await ProjectModel.create({
        name: "Not Featured",
        slug: uniqueSlug("not-featured"),
        address: "456 Test St",
        isFeatured: false,
      });

      await ProjectModel.create({
        name: "Featured 2",
        slug: uniqueSlug("featured-2"),
        address: "789 Test St",
        isFeatured: true,
      });

      const featured = await ProjectModel.getFeatured(10);

      expect(featured.length).toBeGreaterThanOrEqual(2);
      expect(featured.every((p) => p.isFeatured)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      for (let i = 0; i < 5; i++) {
        await ProjectModel.create({
          name: `Featured ${i}`,
          slug: uniqueSlug(`featured-${i}`),
          address: "123 Test St",
          isFeatured: true,
        });
      }

      const featured = await ProjectModel.getFeatured(3);
      expect(featured.length).toBeLessThanOrEqual(3);
    });
  });

  describe("updateCompletionPercentage", () => {
    it("should update completion percentage", async () => {
      const project = await ProjectModel.create({
        name: "Test Project",
        slug: uniqueSlug("completion-test"),
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
        slug: uniqueSlug("invalid-percentage"),
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
        slug: uniqueSlug("photo-test"),
        address: "123 Test St",
      });

      const photos = await PhotoModel.bulkCreate(
        PhotoableType.PROJECT,
        project.id,
        [
          { url: "photo1.jpg", caption: "Test 1", isCover: false },
          { url: "photo2.jpg", caption: "Test 2", isCover: false },
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
        slug: uniqueSlug("floor-plan-test"),
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
        slug: uniqueSlug("cover-photo-test"),
        address: "123 Test St",
      });

      const photos = await PhotoModel.bulkCreate(
        PhotoableType.PROJECT,
        project.id,
        [
          { url: "photo1.jpg", isCover: false },
          { url: "photo2.jpg", isCover: false },
          { url: "photo3.jpg", isCover: false },
        ]
      );

      // Ensure photos were created properly
      expect(photos).toHaveLength(3);
      expect(photos[1]).toBeDefined();
      expect(photos[1].id).toBeDefined();

      await PhotoModel.setCover(photos[1].id);

      const coverPhoto = await PhotoModel.getCoverPhoto(
        PhotoableType.PROJECT,
        project.id
      );

      expect(coverPhoto).toBeDefined();
      expect(coverPhoto?.id).toBe(photos[1].id);
      expect(coverPhoto?.isCover).toBe(true);

      const allPhotos = await PhotoModel.getForEntity(
        PhotoableType.PROJECT,
        project.id
      );
      const coverCount = allPhotos.filter((p) => p.isCover).length;
      expect(coverCount).toBe(1);
    });
  });
});