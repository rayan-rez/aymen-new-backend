/**
 * File: src/__tests__/unit/models/commercial-property.model.test.ts
 * Comprehensive tests for CommercialPropertyModel
 */

import CommercialPropertyModel, {
  CommercialPropertyType,
  CommercialPropertyStatus,
} from "@models/commercial-property.model";
import PhotoModel, { PhotoableType } from "@models/photo.model";
import { closeDatabase, cleanTables } from "@tests/helpers/test-db";

describe("CommercialPropertyModel", () => {
  beforeEach(async () => {
    await cleanTables(["photos", "commercial_properties"]);
  });

  afterAll(async () => {
    await cleanTables(["photos", "commercial_properties"]);
    await closeDatabase();
  });

  describe("create", () => {
    it("should create a new commercial property", async () => {
      const data = {
        title: "Downtown Office Space",
        slug: `office-${Date.now()}`,
        description: "Modern office space in prime location",
        address: "123 Business St",
        propertyType: CommercialPropertyType.OFFICE,
      };

      const property = await CommercialPropertyModel.create(data);

      expect(property).toBeDefined();
      expect(property.id).toBeDefined();
      expect(property.title).toBe(data.title);
      expect(property.propertyType).toBe(CommercialPropertyType.OFFICE);
      expect(property.status).toBe(CommercialPropertyStatus.AVAILABLE);
    });

    it("should create with all optional fields", async () => {
      const data = {
        title: "Retail Shop",
        slug: `shop-${Date.now()}`,
        subtitle: "Premium Location",
        description: "High-traffic retail space",
        cardDescription: "Perfect for retail",
        address: "456 Shopping Ave",
        propertyType: CommercialPropertyType.SHOP,
        areaSqm: 150.5,
        price: 250000,
        status: CommercialPropertyStatus.AVAILABLE,
        latitude: 36.9,
        longitude: 7.75,
        mainImageUrl: "shop.jpg",
        isFeatured: true,
      };

      const property = await CommercialPropertyModel.create(data);

      expect(property.subtitle).toBe(data.subtitle);
      expect(property.areaSqm).toBe(data.areaSqm);
      expect(property.price).toBe(data.price);
      expect(property.latitude).toBe(data.latitude);
      expect(property.isFeatured).toBe(true);
    });

    it("should fail with duplicate slug", async () => {
      const slug = `duplicate-${Date.now()}`;
      await CommercialPropertyModel.create({
        title: "Property 1",
        slug,
        description: "First property",
        address: "123 St",
        propertyType: CommercialPropertyType.OFFICE,
      });

      await expect(
        CommercialPropertyModel.create({
          title: "Property 2",
          slug,
          description: "Second property",
          address: "456 St",
          propertyType: CommercialPropertyType.OFFICE,
        })
      ).rejects.toThrow();
    });
  });

  describe("findById", () => {
    it("should find property by id", async () => {
      const created = await CommercialPropertyModel.create({
        title: "Test Property",
        slug: `test-${Date.now()}`,
        description: "Test description",
        address: "Test Address",
        propertyType: CommercialPropertyType.WAREHOUSE,
      });

      const found = await CommercialPropertyModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe(created.title);
    });

    it("should return null for non-existent id", async () => {
      const found = await CommercialPropertyModel.findById(999999);
      expect(found).toBeNull();
    });
  });

  describe("findBySlug", () => {
    it("should find property by slug", async () => {
      const slug = `unique-${Date.now()}`;
      const created = await CommercialPropertyModel.create({
        title: "Slug Test",
        slug,
        description: "Test",
        address: "Address",
        propertyType: CommercialPropertyType.SHOWROOM,
      });

      const found = await CommercialPropertyModel.findBySlug(slug);

      expect(found).toBeDefined();
      expect(found?.slug).toBe(slug);
      expect(found?.id).toBe(created.id);
    });

    it("should return null for non-existent slug", async () => {
      const found = await CommercialPropertyModel.findBySlug("nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    beforeEach(async () => {
      await CommercialPropertyModel.create({
        title: "Office 1",
        slug: `office1-${Date.now()}`,
        description: "Office",
        address: "Addr 1",
        propertyType: CommercialPropertyType.OFFICE,
        status: CommercialPropertyStatus.AVAILABLE,
        price: 100000,
      });

      await CommercialPropertyModel.create({
        title: "Shop 1",
        slug: `shop1-${Date.now()}`,
        description: "Shop",
        address: "Addr 2",
        propertyType: CommercialPropertyType.SHOP,
        status: CommercialPropertyStatus.RENTED,
        price: 200000,
      });

      await CommercialPropertyModel.create({
        title: "Featured Office",
        slug: `featured-${Date.now()}`,
        description: "Featured",
        address: "Addr 3",
        propertyType: CommercialPropertyType.OFFICE,
        isFeatured: true,
      });
    });

    it("should return all properties", async () => {
      const results = await CommercialPropertyModel.findAll();
      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    it("should filter by property type", async () => {
      const offices = await CommercialPropertyModel.findAll({
        propertyType: CommercialPropertyType.OFFICE,
      });

      expect(offices.length).toBeGreaterThanOrEqual(2);
      expect(
        offices.every((p) => p.propertyType === CommercialPropertyType.OFFICE)
      ).toBe(true);
    });

    it("should filter by status", async () => {
      const available = await CommercialPropertyModel.findAll({
        status: CommercialPropertyStatus.AVAILABLE,
      });

      expect(available.length).toBeGreaterThanOrEqual(1);
      expect(
        available.every((p) => p.status === CommercialPropertyStatus.AVAILABLE)
      ).toBe(true);
    });

    it("should filter by featured", async () => {
      const featured = await CommercialPropertyModel.findAll({
        isFeatured: true,
      });

      expect(featured.length).toBeGreaterThanOrEqual(1);
      expect(featured.every((p) => p.isFeatured)).toBe(true);
    });

    it("should filter by price range", async () => {
      const results = await CommercialPropertyModel.findAll({
        minPrice: 150000,
        maxPrice: 250000,
      });

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(
        results.every((p) => p.price && p.price >= 150000 && p.price <= 250000)
      ).toBe(true);
    });

    it("should support pagination", async () => {
      const results = await CommercialPropertyModel.findAll({
        page: 1,
        limit: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe("getFeatured", () => {
    beforeEach(async () => {
      await CommercialPropertyModel.create({
        title: "Featured 1",
        slug: `feat1-${Date.now()}`,
        description: "Featured",
        address: "Addr",
        propertyType: CommercialPropertyType.OFFICE,
        isFeatured: true,
      });

      await CommercialPropertyModel.create({
        title: "Featured 2",
        slug: `feat2-${Date.now()}`,
        description: "Featured",
        address: "Addr",
        propertyType: CommercialPropertyType.SHOP,
        isFeatured: true,
      });

      await CommercialPropertyModel.create({
        title: "Not Featured",
        slug: `notfeat-${Date.now()}`,
        description: "Not Featured",
        address: "Addr",
        propertyType: CommercialPropertyType.OFFICE,
        isFeatured: false,
      });
    });

    it("should return only featured properties", async () => {
      const featured = await CommercialPropertyModel.getFeatured();

      expect(featured.length).toBeGreaterThanOrEqual(2);
      expect(featured.every((p) => p.isFeatured)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const featured = await CommercialPropertyModel.getFeatured(1);
      expect(featured.length).toBeLessThanOrEqual(1);
    });
  });

  describe("getAvailableByType", () => {
    beforeEach(async () => {
      await CommercialPropertyModel.create({
        title: "Available Office",
        slug: `avail-office-${Date.now()}`,
        description: "Available",
        address: "Addr",
        propertyType: CommercialPropertyType.OFFICE,
        status: CommercialPropertyStatus.AVAILABLE,
      });

      await CommercialPropertyModel.create({
        title: "Rented Office",
        slug: `rented-office-${Date.now()}`,
        description: "Rented",
        address: "Addr",
        propertyType: CommercialPropertyType.OFFICE,
        status: CommercialPropertyStatus.RENTED,
      });
    });

    it("should return only available properties of specified type", async () => {
      const available = await CommercialPropertyModel.getAvailableByType(
        CommercialPropertyType.OFFICE
      );

      expect(available.length).toBeGreaterThanOrEqual(1);
      expect(
        available.every(
          (p) =>
            p.propertyType === CommercialPropertyType.OFFICE &&
            p.status === CommercialPropertyStatus.AVAILABLE
        )
      ).toBe(true);
    });
  });

  describe("getWithPhotos", () => {
    it("should return property with photos", async () => {
      const property = await CommercialPropertyModel.create({
        title: "Property with Photos",
        slug: `photos-${Date.now()}`,
        description: "Test",
        address: "Addr",
        propertyType: CommercialPropertyType.OFFICE,
      });

      await PhotoModel.bulkCreate(
        PhotoableType.COMMERCIAL_PROPERTY,
        property.id,
        [
          { url: "photo1.jpg", isCover: false },
          { url: "photo2.jpg", isCover: true },
        ]
      );

      const withPhotos = await CommercialPropertyModel.getWithPhotos(
        property.id
      );

      expect(withPhotos).toBeDefined();
      expect(withPhotos?.photos).toHaveLength(2);
    });
  });

  describe("updateStatus", () => {
    it("should update property status", async () => {
      const property = await CommercialPropertyModel.create({
        title: "Status Test",
        slug: `status-${Date.now()}`,
        description: "Test",
        address: "Addr",
        propertyType: CommercialPropertyType.OFFICE,
        status: CommercialPropertyStatus.AVAILABLE,
      });

      const updated = await CommercialPropertyModel.updateStatus(
        property.id,
        CommercialPropertyStatus.RENTED
      );

      expect(updated).toBe(true);

      const found = await CommercialPropertyModel.findById(property.id);
      expect(found?.status).toBe(CommercialPropertyStatus.RENTED);
    });

    it("should return false for non-existent property", async () => {
      const updated = await CommercialPropertyModel.updateStatus(
        999999,
        CommercialPropertyStatus.RENTED
      );
      expect(updated).toBe(false);
    });
  });

  describe("update", () => {
    it("should update property fields", async () => {
      const property = await CommercialPropertyModel.create({
        title: "Original Title",
        slug: `update-${Date.now()}`,
        description: "Original",
        address: "Original Addr",
        propertyType: CommercialPropertyType.OFFICE,
      });

      const updated = await CommercialPropertyModel.update(property.id, {
        title: "Updated Title",
        price: 300000,
        areaSqm: 200,
      });

      expect(updated?.title).toBe("Updated Title");
      expect(updated?.price).toBe(300000);
      expect(updated?.areaSqm).toBe(200);
    });

    it("should return null for non-existent property", async () => {
      const updated = await CommercialPropertyModel.update(999999, {
        title: "Updated",
      });
      expect(updated).toBeNull();
    });
  });

  describe("softDelete", () => {
    it("should soft delete property", async () => {
      const property = await CommercialPropertyModel.create({
        title: "To Delete",
        slug: `delete-${Date.now()}`,
        description: "Delete me",
        address: "Addr",
        propertyType: CommercialPropertyType.OFFICE,
      });

      await CommercialPropertyModel.softDelete(property.id);

      const found = await CommercialPropertyModel.findById(property.id);
      expect(found).toBeNull();

      const withDeleted = await CommercialPropertyModel.findById(
        property.id,
        true
      );
      expect(withDeleted?.deletedAt).not.toBeNull();
    });
  });
});
