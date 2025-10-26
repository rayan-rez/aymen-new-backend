/**
 * File: src/__tests__/unit/models/location.model.test.ts
 * Comprehensive tests for LocationModel
 * Tests geographical location hierarchy and operations
 */

import LocationModel, { LocationType } from "@models/location.model";
import { closeDatabase, cleanTables } from "@tests/helpers/test-db";

describe("LocationModel", () => {
  beforeEach(async () => {
    await cleanTables(["locations"]);
  });

  afterAll(async () => {
    await cleanTables(["locations"]);
    await closeDatabase();
  });

  describe("create", () => {
    it("should create a country location", async () => {
      const data = {
        name: "Algeria",
        slug: "algeria",
        type: LocationType.COUNTRY,
        displayOrder: 1,
        isActive: true,
      };

      const location = await LocationModel.create(data);

      expect(location).toBeDefined();
      expect(location.id).toBeDefined();
      expect(location.name).toBe("Algeria");
      expect(location.type).toBe(LocationType.COUNTRY);
      expect(location.parentId).toBeNull();
      expect(location.isActive).toBe(true);
    });

    it("should create a city with parent", async () => {
      const country = await LocationModel.create({
        name: "Algeria",
        slug: "algeria",
        type: LocationType.COUNTRY,
      });

      const city = await LocationModel.create({
        name: "Annaba",
        slug: "annaba",
        type: LocationType.CITY,
        parentId: country.id,
      });

      expect(city.parentId).toBe(country.id);
      expect(city.type).toBe(LocationType.CITY);
    });

    it("should create location hierarchy", async () => {
      const country = await LocationModel.create({
        name: "Algeria",
        slug: "algeria",
        type: LocationType.COUNTRY,
      });

      const region = await LocationModel.create({
        name: "East",
        slug: "east",
        type: LocationType.REGION,
        parentId: country.id,
      });

      const city = await LocationModel.create({
        name: "Annaba",
        slug: "annaba",
        type: LocationType.CITY,
        parentId: region.id,
      });

      const neighborhood = await LocationModel.create({
        name: "City Center",
        slug: "city-center-annaba",
        type: LocationType.NEIGHBORHOOD,
        parentId: city.id,
      });

      expect(country.parentId).toBeNull();
      expect(region.parentId).toBe(country.id);
      expect(city.parentId).toBe(region.id);
      expect(neighborhood.parentId).toBe(city.id);
    });

    it("should fail for duplicate slug", async () => {
      await LocationModel.create({
        name: "Annaba",
        slug: "annaba",
        type: LocationType.CITY,
      });

      await expect(
        LocationModel.create({
          name: "Annaba 2",
          slug: "annaba",
          type: LocationType.CITY,
        })
      ).rejects.toThrow();
    });

    it("should create with default values", async () => {
      const location = await LocationModel.create({
        name: "Test City",
        slug: "test-city",
        type: LocationType.CITY,
      });

      expect(location.displayOrder).toBe(0);
      expect(location.isActive).toBe(true);
      expect(location.parentId).toBeNull();
    });
  });

  describe("findById", () => {
    it("should find location by id", async () => {
      const created = await LocationModel.create({
        name: "Constantine",
        slug: "constantine",
        type: LocationType.CITY,
      });

      const found = await LocationModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe("Constantine");
    });

    it("should return null for non-existent id", async () => {
      const found = await LocationModel.findById(999999);
      expect(found).toBeNull();
    });
  });

  describe("findBySlug", () => {
    it("should find location by slug", async () => {
      await LocationModel.create({
        name: "Oran",
        slug: "oran",
        type: LocationType.CITY,
      });

      const found = await LocationModel.findBySlug("oran");

      expect(found).toBeDefined();
      expect(found?.slug).toBe("oran");
      expect(found?.name).toBe("Oran");
    });

    it("should return null for non-existent slug", async () => {
      const found = await LocationModel.findBySlug("nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("findAll", () => {
    beforeEach(async () => {
      const country = await LocationModel.create({
        name: "Algeria",
        slug: "algeria",
        type: LocationType.COUNTRY,
        displayOrder: 1,
      });

      await LocationModel.create({
        name: "Annaba",
        slug: "annaba",
        type: LocationType.CITY,
        parentId: country.id,
        displayOrder: 1,
      });

      await LocationModel.create({
        name: "Constantine",
        slug: "constantine",
        type: LocationType.CITY,
        parentId: country.id,
        displayOrder: 2,
      });

      const inactiveCity = await LocationModel.create({
        name: "Inactive City",
        slug: "inactive-city",
        type: LocationType.CITY,
        parentId: country.id,
      });

      await LocationModel.update(inactiveCity.id, { isActive: false });
    });

    it("should return all locations", async () => {
      const locations = await LocationModel.findAll();
      expect(locations.length).toBeGreaterThanOrEqual(4);
    });

    it("should filter by type", async () => {
      const cities = await LocationModel.findAll({ type: LocationType.CITY });

      expect(cities.length).toBeGreaterThanOrEqual(3);
      expect(cities.every((l) => l.type === LocationType.CITY)).toBe(true);
    });

    it("should filter by parentId", async () => {
      const country = await LocationModel.findBySlug("algeria");
      const children = await LocationModel.findAll({
        parentId: country!.id,
      });

      expect(children.length).toBeGreaterThanOrEqual(3);
      expect(children.every((l) => l.parentId === country!.id)).toBe(true);
    });

    it("should filter by isActive", async () => {
      const active = await LocationModel.findAll({ isActive: true });
      const inactive = await LocationModel.findAll({ isActive: false });

      expect(active.length).toBeGreaterThanOrEqual(3);
      expect(inactive.length).toBeGreaterThanOrEqual(1);
    });

    it("should support pagination", async () => {
      const results = await LocationModel.findAll({ page: 1, limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should order by display_order and name", async () => {
      const cities = await LocationModel.findAll({ type: LocationType.CITY });

      expect(cities[0].displayOrder).toBeLessThanOrEqual(
        cities[1].displayOrder
      );
    });
  });

  describe("getHierarchy", () => {
    beforeEach(async () => {
      const country = await LocationModel.create({
        name: "Algeria",
        slug: "algeria",
        type: LocationType.COUNTRY,
      });

      const region1 = await LocationModel.create({
        name: "East",
        slug: "east",
        type: LocationType.REGION,
        parentId: country.id,
      });

      const region2 = await LocationModel.create({
        name: "West",
        slug: "west",
        type: LocationType.REGION,
        parentId: country.id,
      });

      const city1 = await LocationModel.create({
        name: "Annaba",
        slug: "annaba",
        type: LocationType.CITY,
        parentId: region1.id,
      });

      await LocationModel.create({
        name: "City Center",
        slug: "city-center-annaba",
        type: LocationType.NEIGHBORHOOD,
        parentId: city1.id,
      });

      await LocationModel.create({
        name: "Oran",
        slug: "oran",
        type: LocationType.CITY,
        parentId: region2.id,
      });
    });

    it("should get root level hierarchy", async () => {
      const hierarchy = await LocationModel.getHierarchy();

      expect(hierarchy.length).toBeGreaterThanOrEqual(1);
      expect(hierarchy[0].name).toBe("Algeria");
      expect(hierarchy[0].children).toBeDefined();
      expect(hierarchy[0].children!.length).toBe(2);
    });

    it("should build nested hierarchy", async () => {
      const hierarchy = await LocationModel.getHierarchy();
      const country = hierarchy[0];

      expect(country.children).toBeDefined();
      expect(country.children!.length).toBe(2);

      const eastRegion = country.children!.find((c) => c.slug === "east");
      expect(eastRegion).toBeDefined();
      expect(eastRegion!.children).toBeDefined();
      expect(eastRegion!.children!.length).toBe(1);

      const annaba = eastRegion!.children![0];
      expect(annaba.name).toBe("Annaba");
      expect(annaba.children).toBeDefined();
      expect(annaba.children!.length).toBe(1);
    });

    it("should get hierarchy for specific parent", async () => {
      const country = await LocationModel.findBySlug("algeria");
      const hierarchy = await LocationModel.getHierarchy(country!.id);

      expect(hierarchy.length).toBe(2); // East and West regions
    });

    it("should return empty array for locations with no children", async () => {
      const neighborhood = await LocationModel.findBySlug("city-center-annaba");
      const hierarchy = await LocationModel.getHierarchy(neighborhood!.id);

      expect(hierarchy).toHaveLength(0);
    });
  });

  describe("getChildren", () => {
    let countryId: number;
    let regionId: number;
    let cityId: number;

    beforeEach(async () => {
      const country = await LocationModel.create({
        name: "Algeria",
        slug: "algeria",
        type: LocationType.COUNTRY,
      });
      countryId = country.id;

      const region = await LocationModel.create({
        name: "East",
        slug: "east",
        type: LocationType.REGION,
        parentId: countryId,
      });
      regionId = region.id;

      const city = await LocationModel.create({
        name: "Annaba",
        slug: "annaba",
        type: LocationType.CITY,
        parentId: regionId,
      });
      cityId = city.id;

      await LocationModel.create({
        name: "City Center",
        slug: "city-center",
        type: LocationType.NEIGHBORHOOD,
        parentId: cityId,
      });

      await LocationModel.create({
        name: "Beaches",
        slug: "beaches",
        type: LocationType.NEIGHBORHOOD,
        parentId: cityId,
      });
    });

    it("should get direct children only", async () => {
      const children = await LocationModel.getChildren(cityId, false);

      expect(children).toHaveLength(2);
      expect(children.every((c) => c.parentId === cityId)).toBe(true);
      expect(children.every((c) => c.type === LocationType.NEIGHBORHOOD)).toBe(
        true
      );
    });

    it("should get all descendants recursively", async () => {
      const descendants = await LocationModel.getChildren(countryId, true);

      expect(descendants.length).toBeGreaterThanOrEqual(4);
      // Should include: region, city, and 2 neighborhoods
    });

    it("should return empty array for locations with no children", async () => {
      const neighborhood = await LocationModel.findBySlug("city-center");
      const children = await LocationModel.getChildren(neighborhood!.id);

      expect(children).toHaveLength(0);
    });
  });

  describe("getParent", () => {
    it("should get parent location", async () => {
      const country = await LocationModel.create({
        name: "Algeria",
        slug: "algeria",
        type: LocationType.COUNTRY,
      });

      const city = await LocationModel.create({
        name: "Annaba",
        slug: "annaba",
        type: LocationType.CITY,
        parentId: country.id,
      });

      const parent = await LocationModel.getParent(city.id);

      expect(parent).toBeDefined();
      expect(parent?.id).toBe(country.id);
      expect(parent?.name).toBe("Algeria");
    });

    it("should return null for root location", async () => {
      const country = await LocationModel.create({
        name: "Algeria",
        slug: "algeria",
        type: LocationType.COUNTRY,
      });

      const parent = await LocationModel.getParent(country.id);

      expect(parent).toBeNull();
    });

    it("should return null for non-existent location", async () => {
      const parent = await LocationModel.getParent(999999);
      expect(parent).toBeNull();
    });
  });

  describe("getParents", () => {
    it("should get breadcrumb of parent locations", async () => {
      const country = await LocationModel.create({
        name: "Algeria",
        slug: "algeria",
        type: LocationType.COUNTRY,
      });

      const region = await LocationModel.create({
        name: "East",
        slug: "east",
        type: LocationType.REGION,
        parentId: country.id,
      });

      const city = await LocationModel.create({
        name: "Annaba",
        slug: "annaba",
        type: LocationType.CITY,
        parentId: region.id,
      });

      const neighborhood = await LocationModel.create({
        name: "City Center",
        slug: "city-center",
        type: LocationType.NEIGHBORHOOD,
        parentId: city.id,
      });

      const parents = await LocationModel.getParents(neighborhood.id);

      expect(parents).toHaveLength(3);
      expect(parents[0].name).toBe("Algeria");
      expect(parents[1].name).toBe("East");
      expect(parents[2].name).toBe("Annaba");
    });

    it("should return empty array for root location", async () => {
      const country = await LocationModel.create({
        name: "Algeria",
        slug: "algeria",
        type: LocationType.COUNTRY,
      });

      const parents = await LocationModel.getParents(country.id);

      expect(parents).toHaveLength(0);
    });

    it("should return single parent for second-level location", async () => {
      const country = await LocationModel.create({
        name: "Algeria",
        slug: "algeria",
        type: LocationType.COUNTRY,
      });

      const city = await LocationModel.create({
        name: "Annaba",
        slug: "annaba",
        type: LocationType.CITY,
        parentId: country.id,
      });

      const parents = await LocationModel.getParents(city.id);

      expect(parents).toHaveLength(1);
      expect(parents[0].name).toBe("Algeria");
    });
  });

  describe("update", () => {
    it("should update location details", async () => {
      const location = await LocationModel.create({
        name: "Original Name",
        slug: "original-slug",
        type: LocationType.CITY,
      });

      const updated = await LocationModel.update(location.id, {
        name: "Updated Name",
        displayOrder: 10,
        isActive: false,
      });

      expect(updated?.name).toBe("Updated Name");
      expect(updated?.displayOrder).toBe(10);
      expect(updated?.isActive).toBe(false);
      expect(updated?.slug).toBe("original-slug");
    });

    it("should update parent relationship", async () => {
      const country1 = await LocationModel.create({
        name: "Country 1",
        slug: "country-1",
        type: LocationType.COUNTRY,
      });

      const country2 = await LocationModel.create({
        name: "Country 2",
        slug: "country-2",
        type: LocationType.COUNTRY,
      });

      const city = await LocationModel.create({
        name: "City",
        slug: "city",
        type: LocationType.CITY,
        parentId: country1.id,
      });

      const updated = await LocationModel.update(city.id, {
        parentId: country2.id,
      });

      expect(updated?.parentId).toBe(country2.id);
    });

    it("should return null for non-existent location", async () => {
      const updated = await LocationModel.update(999999, {
        name: "Non-existent",
      });

      expect(updated).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete location", async () => {
      const location = await LocationModel.create({
        name: "To Delete",
        slug: "to-delete",
        type: LocationType.CITY,
      });

      const deleted = await LocationModel.delete(location.id);

      expect(deleted).toBe(true);

      const found = await LocationModel.findById(location.id);
      expect(found).toBeNull();
    });

    it("should return false for non-existent location", async () => {
      const deleted = await LocationModel.delete(999999);
      expect(deleted).toBe(false);
    });
  });
});
