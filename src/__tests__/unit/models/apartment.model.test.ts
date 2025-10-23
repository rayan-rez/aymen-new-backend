/**
 * File: src/__tests__/unit/models/apartment.model.test.ts
 * Comprehensive tests for ApartmentModel
 * Covers CRUD operations, relations, and custom methods
 */

import ApartmentModel, { ApartmentStatus } from "@models/apartment.model";
import PhotoModel, { PhotoableType } from "@models/photo.model";
import FloorPlanModel, { PlannableType } from "@models/floor-plan.model";
import ProjectModel from "@models/project.model";
import db from "@/config/database";

describe("ApartmentModel", () => {
  let projectId: number;

  beforeEach(async () => {
    // Clean up in correct order (respecting foreign keys)
    await db("photos").del();
    await db("floor_plans").del();
    await db("apartments").del();
    await db("project_features").del();
    await db("projects").del();

    // Add small delay to ensure cleanup completes
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create a test project with unique slug
    const project = await ProjectModel.create({
      name: "Test Project",
      slug: `apartment-model-test-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}`,
      address: "123 Test St",
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await db("photos").del();
    await db("floor_plans").del();
    await db("apartments").del();
    await db("project_features").del();
    await db("projects").del();
    await db.destroy();
  });

  describe("create", () => {
    it("should create a new apartment", async () => {
      const apartmentData = {
        projectId,
        name: "A101",
        status: ApartmentStatus.AVAILABLE,
      };

      const apartment = await ApartmentModel.create(apartmentData);

      expect(apartment).toBeDefined();
      expect(apartment.id).toBeDefined();
      expect(apartment.projectId).toBe(projectId);
      expect(apartment.name).toBe(apartmentData.name);
      expect(apartment.status).toBe(ApartmentStatus.AVAILABLE);
    });

    it("should fail to create apartment with invalid projectId", async () => {
      const invalidData = {
        projectId: 999999, // Non-existent
        name: "Invalid",
      };
      await expect(ApartmentModel.create(invalidData)).rejects.toThrow(); // Foreign key violation
    });
  });

  describe("findById", () => {
    it("should find apartment by id", async () => {
      const created = await ApartmentModel.create({
        projectId,
        name: "A102",
      });

      const found = await ApartmentModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe(created.name);
    });

    it("should return null for non-existent id", async () => {
      const found = await ApartmentModel.findById(999999);
      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    beforeEach(async () => {
      // Create multiple apartments for testing
      await ApartmentModel.create({
        projectId,
        name: "A103",
        status: ApartmentStatus.AVAILABLE,
      });
      await ApartmentModel.create({
        projectId,
        name: "A104",
        status: ApartmentStatus.RESERVED,
      });
      await ApartmentModel.create({
        projectId,
        name: "A105",
        status: ApartmentStatus.SOLD,
      });
    });

    it("should return all apartments with pagination", async () => {
      const results = await ApartmentModel.findAll({ page: 1, limit: 2 });
      expect(results).toHaveLength(2);
    });

    it("should filter by status", async () => {
      const available = await ApartmentModel.findAll({
        status: ApartmentStatus.AVAILABLE,
      });
      expect(available).toHaveLength(1);
      expect(available[0].status).toBe(ApartmentStatus.AVAILABLE);
    });

    it("should filter by projectId", async () => {
      const byProject = await ApartmentModel.findAll({ projectId });
      expect(byProject).toHaveLength(3);
    });

    it("should return empty array for no matches", async () => {
      const results = await ApartmentModel.findAll({ projectId: 999999 });
      expect(results).toHaveLength(0);
    });
  });

  describe("update", () => {
    it("should update apartment fields", async () => {
      const created = await ApartmentModel.create({
        projectId,
        name: "A106",
        status: ApartmentStatus.AVAILABLE,
      });

      const updateData = {
        name: "Updated A106",
        status: ApartmentStatus.RESERVED,
        description: "New description",
      };

      const updated = await ApartmentModel.update(created.id, updateData);

      expect(updated).toBeDefined();
      expect(updated?.name).toBe(updateData.name);
      expect(updated?.status).toBe(updateData.status);
      expect(updated?.description).toBe(updateData.description);
    });

    it("should return null when updating non-existent apartment", async () => {
      const updated = await ApartmentModel.update(999999, {
        name: "Non-existent",
      });
      expect(updated).toBeNull();
    });
  });

  describe("softDelete", () => {
    it("should soft delete an apartment", async () => {
      const created = await ApartmentModel.create({
        projectId,
        name: "A107",
      });

      await ApartmentModel.softDelete(created.id);

      const found = await ApartmentModel.findById(created.id);
      expect(found).toBeNull(); // Should not find soft-deleted by default

      const withDeleted = await ApartmentModel.findById(created.id);
      expect(withDeleted?.deletedAt).not.toBeNull();
    });
  });

  describe("getAvailable", () => {
    beforeEach(async () => {
      await ApartmentModel.create({
        projectId,
        name: "A108",
        status: ApartmentStatus.AVAILABLE,
      });
      await ApartmentModel.create({
        projectId,
        name: "A109",
        status: ApartmentStatus.SOLD,
      });
    });

    it("should return only available apartments", async () => {
      const available = await ApartmentModel.getAvailable();
      expect(available).toHaveLength(1);
      expect(available[0].status).toBe(ApartmentStatus.AVAILABLE);
    });

    it("should respect limit parameter", async () => {
      await ApartmentModel.create({
        projectId,
        name: "A110",
        status: ApartmentStatus.AVAILABLE,
      });
      const limited = await ApartmentModel.getAvailable(1);
      expect(limited).toHaveLength(1);
    });
  });

  describe("findByProject", () => {
    beforeEach(async () => {
      await ApartmentModel.create({ projectId, name: "A111" });
      await ApartmentModel.create({ projectId, name: "A112" });
    });

    it("should return apartments for a project", async () => {
      const byProject = await ApartmentModel.findByProject(projectId);
      expect(byProject).toHaveLength(2);
    });

    it("should return empty array for non-existent project", async () => {
      const byProject = await ApartmentModel.findByProject(999999);
      expect(byProject).toHaveLength(0);
    });
  });

  describe("Polymorphic Relations", () => {
    let apartmentId: number;

    beforeEach(async () => {
      const apartment = await ApartmentModel.create({
        projectId,
        name: "A113",
      });
      apartmentId = apartment.id;
    });

    it("should add and retrieve photos", async () => {
      const photos = await PhotoModel.bulkCreate(
        PhotoableType.APARTMENT,
        apartmentId,
        [
          { url: "apt-photo1.jpg", caption: "Apt Photo 1" },
          { url: "apt-photo2.jpg", caption: "Apt Photo 2" },
        ]
      );

      expect(photos).toHaveLength(2);

      const retrieved = await PhotoModel.getForEntity(
        PhotoableType.APARTMENT,
        apartmentId
      );
      expect(retrieved).toHaveLength(2);
    });

    it("should add and retrieve floor plans", async () => {
      const plans = await FloorPlanModel.bulkCreate(
        PlannableType.APARTMENT,
        apartmentId,
        [
          { name: "Apt Floor 1", imageUrl: "apt-plan1.jpg" },
          { name: "Apt Floor 2", imageUrl: "apt-plan2.jpg" },
        ]
      );

      expect(plans).toHaveLength(2);

      const retrieved = await FloorPlanModel.getForEntity(
        PlannableType.APARTMENT,
        apartmentId
      );
      expect(retrieved).toHaveLength(2);
    });

    it("should get apartment with photos", async () => {
      await PhotoModel.bulkCreate(PhotoableType.APARTMENT, apartmentId, [
        { url: "apt-photo3.jpg" },
      ]);

      const withPhotos = await ApartmentModel.getWithPhotos(apartmentId);
      expect(withPhotos).toBeDefined();
      expect(withPhotos?.photos).toHaveLength(1);
    });

    it("should get complete apartment data", async () => {
      await PhotoModel.bulkCreate(PhotoableType.APARTMENT, apartmentId, [
        { url: "apt-photo4.jpg" },
      ]);
      await FloorPlanModel.bulkCreate(PlannableType.APARTMENT, apartmentId, [
        { name: "Apt Plan 3", imageUrl: "apt-plan3.jpg" },
      ]);

      const complete = await ApartmentModel.getComplete(apartmentId);
      expect(complete).toBeDefined();
      expect(complete?.photos).toHaveLength(1);
      expect(complete?.floorPlans).toHaveLength(1);
      expect(complete?.project).toBeDefined();
    });
  });

  describe("updateStatus", () => {
    it("should update apartment status", async () => {
      const created = await ApartmentModel.create({
        projectId,
        name: "A114",
        status: ApartmentStatus.AVAILABLE,
      });

      const updated = await ApartmentModel.updateStatus(
        created.id,
        ApartmentStatus.SOLD
      );
      expect(updated).toBe(true);

      const found = await ApartmentModel.findById(created.id);
      expect(found?.status).toBe(ApartmentStatus.SOLD);
    });

    it("should return false for non-existent apartment", async () => {
      const updated = await ApartmentModel.updateStatus(
        999999,
        ApartmentStatus.SOLD
      );
      expect(updated).toBe(false);
    });
  });
});
