/**
 * File: src/__tests__/unit/models/feature.model.test.ts
 * Comprehensive tests for FeatureModel
 */

import FeatureModel, { FeatureCategory } from "@models/feature.model";
import { closeDatabase, cleanTables } from "@tests/helpers/test-db";

describe("FeatureModel", () => {
  beforeEach(async () => {
    await cleanTables(["features"]);
  });

  afterAll(async () => {
    await cleanTables(["features"]);
    await closeDatabase();
  });

  describe("create", () => {
    it("should create a new feature", async () => {
      const data = {
        name: "Swimming Pool",
        slug: `pool-${Date.now()}`,
        category: FeatureCategory.AMENITY,
        icon: "pool-icon",
      };

      const feature = await FeatureModel.create(data);

      expect(feature).toBeDefined();
      expect(feature.id).toBeDefined();
      expect(feature.name).toBe(data.name);
      expect(feature.category).toBe(FeatureCategory.AMENITY);
      expect(feature.isActive).toBe(true);
    });

    it("should create with default values", async () => {
      const data = {
        name: "Security",
        slug: `security-${Date.now()}`,
      };

      const feature = await FeatureModel.create(data);

      expect(feature.category).toBe(FeatureCategory.AMENITY);
      expect(feature.displayOrder).toBe(0);
      expect(feature.isActive).toBe(true);
    });

    it("should fail with duplicate slug", async () => {
      const slug = `duplicate-${Date.now()}`;
      await FeatureModel.create({
        name: "Feature 1",
        slug,
      });

      await expect(
        FeatureModel.create({
          name: "Feature 2",
          slug,
        })
      ).rejects.toThrow();
    });
  });

  describe("findBySlug", () => {
    it("should find feature by slug", async () => {
      const slug = `gym-${Date.now()}`;
      const created = await FeatureModel.create({
        name: "Gym",
        slug,
        category: FeatureCategory.LEISURE,
      });

      const found = await FeatureModel.findBySlug(slug);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe("Gym");
    });

    it("should return null for non-existent slug", async () => {
      const found = await FeatureModel.findBySlug("nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    beforeEach(async () => {
      await FeatureModel.create({
        name: "Pool",
        slug: `pool-${Date.now()}`,
        category: FeatureCategory.AMENITY,
        displayOrder: 1,
      });

      await FeatureModel.create({
        name: "Security",
        slug: `security-${Date.now()}`,
        category: FeatureCategory.SECURITY,
        displayOrder: 2,
      });

      await FeatureModel.create({
        name: "Parking",
        slug: `parking-${Date.now()}`,
        category: FeatureCategory.AMENITY,
        displayOrder: 0,
        isActive: false,
      });
    });

    it("should return all features", async () => {
      const features = await FeatureModel.findAll();
      expect(features.length).toBeGreaterThanOrEqual(3);
    });

    it("should filter by category", async () => {
      const amenities = await FeatureModel.findAll({
        category: FeatureCategory.AMENITY,
      });

      expect(amenities.length).toBeGreaterThanOrEqual(2);
      expect(
        amenities.every((f) => f.category === FeatureCategory.AMENITY)
      ).toBe(true);
    });

    it("should filter by isActive", async () => {
      const active = await FeatureModel.findAll({ isActive: true });
      const inactive = await FeatureModel.findAll({ isActive: false });

      expect(active.length).toBeGreaterThanOrEqual(2);
      expect(inactive.length).toBeGreaterThanOrEqual(1);
    });

    it("should order by display_order and name", async () => {
      const features = await FeatureModel.findAll();

      expect(features.length).toBeGreaterThanOrEqual(3);
      // Verify ordering
      for (let i = 1; i < features.length; i++) {
        const prev = features[i - 1];
        const curr = features[i];
        expect(prev.displayOrder).toBeLessThanOrEqual(curr.displayOrder);
      }
    });

    it("should support pagination", async () => {
      const results = await FeatureModel.findAll({ page: 1, limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe("findByCategory", () => {
    beforeEach(async () => {
      await FeatureModel.create({
        name: "CCTV",
        slug: `cctv-${Date.now()}`,
        category: FeatureCategory.SECURITY,
        isActive: true,
      });

      await FeatureModel.create({
        name: "Guard",
        slug: `guard-${Date.now()}`,
        category: FeatureCategory.SECURITY,
        isActive: true,
      });

      await FeatureModel.create({
        name: "Inactive Security",
        slug: `inactive-${Date.now()}`,
        category: FeatureCategory.SECURITY,
        isActive: false,
      });
    });

    it("should return only active features in category", async () => {
      const security = await FeatureModel.findByCategory(
        FeatureCategory.SECURITY
      );

      expect(security.length).toBe(2);
      expect(
        security.every(
          (f) => f.category === FeatureCategory.SECURITY && f.isActive
        )
      ).toBe(true);
    });
  });

  describe("getGroupedByCategory", () => {
    beforeEach(async () => {
      await FeatureModel.create({
        name: "Pool",
        slug: `pool-${Date.now()}`,
        category: FeatureCategory.AMENITY,
        isActive: true,
      });

      await FeatureModel.create({
        name: "Gym",
        slug: `gym-${Date.now()}`,
        category: FeatureCategory.LEISURE,
        isActive: true,
      });

      await FeatureModel.create({
        name: "Security",
        slug: `security-${Date.now()}`,
        category: FeatureCategory.SECURITY,
        isActive: true,
      });

      await FeatureModel.create({
        name: "Inactive",
        slug: `inactive-${Date.now()}`,
        category: FeatureCategory.AMENITY,
        isActive: false,
      });
    });

    it("should group active features by category", async () => {
      const grouped = await FeatureModel.getGroupedByCategory();

      expect(grouped).toHaveProperty(FeatureCategory.AMENITY);
      expect(grouped).toHaveProperty(FeatureCategory.LEISURE);
      expect(grouped).toHaveProperty(FeatureCategory.SECURITY);

      expect(grouped[FeatureCategory.AMENITY].length).toBe(1);
      expect(grouped[FeatureCategory.LEISURE].length).toBe(1);
      expect(grouped[FeatureCategory.SECURITY].length).toBe(1);

      // Verify all are active
      Object.values(grouped).forEach((features) => {
        features.forEach((f) => expect(f.isActive).toBe(true));
      });
    });
  });

  describe("update", () => {
    it("should update feature fields", async () => {
      const feature = await FeatureModel.create({
        name: "Original",
        slug: `original-${Date.now()}`,
        category: FeatureCategory.AMENITY,
      });

      const updated = await FeatureModel.update(feature.id, {
        name: "Updated",
        category: FeatureCategory.SECURITY,
        displayOrder: 5,
        isActive: false,
      });

      expect(updated?.name).toBe("Updated");
      expect(updated?.category).toBe(FeatureCategory.SECURITY);
      expect(updated?.displayOrder).toBe(5);
      expect(updated?.isActive).toBe(false);
    });

    it("should return null for non-existent feature", async () => {
      const updated = await FeatureModel.update(999999, { name: "Updated" });
      expect(updated).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete feature", async () => {
      const feature = await FeatureModel.create({
        name: "To Delete",
        slug: `delete-${Date.now()}`,
      });

      const deleted = await FeatureModel.delete(feature.id);
      expect(deleted).toBe(true);

      const found = await FeatureModel.findById(feature.id);
      expect(found).toBeNull();
    });

    it("should return false for non-existent feature", async () => {
      const deleted = await FeatureModel.delete(999999);
      expect(deleted).toBe(false);
    });
  });
});
