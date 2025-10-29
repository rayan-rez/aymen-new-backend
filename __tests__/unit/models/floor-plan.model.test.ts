/**
 * File: src/__tests__/unit/models/floor-plan.model.test.ts
 * Comprehensive tests for FloorPlanModel (Polymorphic)
 * Tests floor plan operations for projects and apartments
 */

import FloorPlanModel, { PlannableType } from "@models/floor-plan.model";
import ProjectModel from "@models/project.model";
import ApartmentModel from "@models/apartment.model";
import { closeDatabase, cleanTables } from "@tests/helpers/test-db";

describe("FloorPlanModel", () => {
  let projectId: number;
  let apartmentId: number;

  beforeEach(async () => {
    // Clean up in correct order
    await cleanTables([
      "floor_plans",
      "photos",
      "apartments",
      "project_features",
      "projects",
    ]);

    // Create test project
    const project = await ProjectModel.create({
      name: "Test Project",
      slug: `floor-plan-test-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}`,
      address: "123 Test St",
    });
    projectId = project.id;

    // Create test apartment
    const apartment = await ApartmentModel.create({
      projectId,
      name: "A101",
    });
    apartmentId = apartment.id;
  });

  afterAll(async () => {
    await cleanTables([
      "floor_plans",
      "photos",
      "apartments",
      "project_features",
      "projects",
    ]);
    await closeDatabase();
  });

  describe("create", () => {
    it("should create a floor plan for a project", async () => {
      const planData = {
        plannableType: PlannableType.PROJECT,
        plannableId: projectId,
        name: "Ground Floor",
        imageUrl: "ground-floor.jpg",
        pdfUrl: "ground-floor.pdf",
      };

      const plan = await FloorPlanModel.create(planData);

      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.plannableType).toBe(PlannableType.PROJECT);
      expect(plan.plannableId).toBe(projectId);
      expect(plan.name).toBe("Ground Floor");
      expect(plan.imageUrl).toBe("ground-floor.jpg");
      expect(plan.pdfUrl).toBe("ground-floor.pdf");
    });

    it("should create a floor plan for an apartment", async () => {
      const planData = {
        plannableType: PlannableType.APARTMENT,
        plannableId: apartmentId,
        name: "Apartment Layout",
        imageUrl: "apt-layout.jpg",
      };

      const plan = await FloorPlanModel.create(planData);

      expect(plan.plannableType).toBe(PlannableType.APARTMENT);
      expect(plan.plannableId).toBe(apartmentId);
      expect(plan.pdfUrl).toBeNull();
    });

    it("should fail when entity does not exist", async () => {
      const planData = {
        plannableType: PlannableType.PROJECT,
        plannableId: 999999,
        name: "Invalid",
        imageUrl: "invalid.jpg",
      };

      await expect(FloorPlanModel.create(planData)).rejects.toThrow();
    });

    it("should set default display order", async () => {
      const plan = await FloorPlanModel.create({
        plannableType: PlannableType.PROJECT,
        plannableId: projectId,
        name: "Floor 1",
        imageUrl: "floor1.jpg",
      });

      expect(plan.displayOrder).toBe(0);
    });
  });

  describe("getForEntity", () => {
    beforeEach(async () => {
      await FloorPlanModel.bulkCreate(PlannableType.PROJECT, projectId, [
        { name: "Ground Floor", imageUrl: "ground.jpg" },
        { name: "First Floor", imageUrl: "first.jpg" },
        { name: "Second Floor", imageUrl: "second.jpg" },
      ]);
    });

    it("should get all floor plans for an entity", async () => {
      const plans = await FloorPlanModel.getForEntity(
        PlannableType.PROJECT,
        projectId
      );

      expect(plans).toHaveLength(3);
      expect(plans[0].name).toBe("Ground Floor");
    });

    it("should return empty array for entity with no plans", async () => {
      const plans = await FloorPlanModel.getForEntity(
        PlannableType.APARTMENT,
        apartmentId
      );

      expect(plans).toHaveLength(0);
    });

    it("should order by display_order", async () => {
      const plans = await FloorPlanModel.getForEntity(
        PlannableType.PROJECT,
        projectId
      );

      expect(plans[0].displayOrder).toBe(0);
      expect(plans[1].displayOrder).toBe(1);
      expect(plans[2].displayOrder).toBe(2);
    });
  });

  describe("bulkCreate", () => {
    it("should create multiple floor plans at once", async () => {
      const plansData = [
        { name: "Ground Floor", imageUrl: "ground.jpg", pdfUrl: "ground.pdf" },
        { name: "First Floor", imageUrl: "first.jpg" },
        { name: "Second Floor", imageUrl: "second.jpg", displayOrder: 5 },
      ];

      const plans = await FloorPlanModel.bulkCreate(
        PlannableType.PROJECT,
        projectId,
        plansData
      );

      expect(plans).toHaveLength(3);
      expect(plans[0].displayOrder).toBe(0);
      expect(plans[1].displayOrder).toBe(1);
      expect(plans[2].displayOrder).toBe(5);
    });

    it("should fail when entity does not exist", async () => {
      await expect(
        FloorPlanModel.bulkCreate(PlannableType.PROJECT, 999999, [
          { name: "Floor", imageUrl: "floor.jpg" },
        ])
      ).rejects.toThrow();
    });

    it("should handle empty array", async () => {
      const plans = await FloorPlanModel.bulkCreate(
        PlannableType.PROJECT,
        projectId,
        []
      );

      expect(plans).toHaveLength(0);
    });
  });

  describe("deleteForEntity", () => {
    beforeEach(async () => {
      await FloorPlanModel.bulkCreate(PlannableType.PROJECT, projectId, [
        { name: "Ground", imageUrl: "ground.jpg" },
        { name: "First", imageUrl: "first.jpg" },
      ]);
    });

    it("should delete all floor plans for an entity", async () => {
      const deleted = await FloorPlanModel.deleteForEntity(
        PlannableType.PROJECT,
        projectId
      );

      expect(deleted).toBe(true);

      const remaining = await FloorPlanModel.getForEntity(
        PlannableType.PROJECT,
        projectId
      );
      expect(remaining).toHaveLength(0);
    });

    it("should return true even if no plans exist", async () => {
      const deleted = await FloorPlanModel.deleteForEntity(
        PlannableType.APARTMENT,
        apartmentId
      );

      expect(deleted).toBe(false);
    });
  });

  describe("reorder", () => {
    let planIds: number[];

    beforeEach(async () => {
      const plans = await FloorPlanModel.bulkCreate(
        PlannableType.PROJECT,
        projectId,
        [
          { name: "Ground", imageUrl: "ground.jpg" },
          { name: "First", imageUrl: "first.jpg" },
          { name: "Second", imageUrl: "second.jpg" },
        ]
      );

      planIds = plans.map((p) => p.id);
    });

    it("should reorder floor plans", async () => {
      // Reverse order
      const reordered = await FloorPlanModel.reorder(
        PlannableType.PROJECT,
        projectId,
        [planIds[2], planIds[1], planIds[0]]
      );

      expect(reordered).toBe(true);

      const plans = await FloorPlanModel.getForEntity(
        PlannableType.PROJECT,
        projectId
      );

      expect(plans[0].id).toBe(planIds[2]);
      expect(plans[1].id).toBe(planIds[1]);
      expect(plans[2].id).toBe(planIds[0]);
    });

    it("should handle partial reorder", async () => {
      const reordered = await FloorPlanModel.reorder(
        PlannableType.PROJECT,
        projectId,
        [planIds[1], planIds[0]]
      );

      expect(reordered).toBe(true);
    });
  });

  describe("update", () => {
    it("should update floor plan details", async () => {
      const plan = await FloorPlanModel.create({
        plannableType: PlannableType.PROJECT,
        plannableId: projectId,
        name: "Original",
        imageUrl: "original.jpg",
      });

      const updated = await FloorPlanModel.update(plan.id, {
        name: "Updated Floor",
        pdfUrl: "updated.pdf",
      });

      expect(updated?.name).toBe("Updated Floor");
      expect(updated?.pdfUrl).toBe("updated.pdf");
      expect(updated?.imageUrl).toBe("original.jpg");
    });

    it("should return null for non-existent plan", async () => {
      const updated = await FloorPlanModel.update(999999, {
        name: "Non-existent",
      });

      expect(updated).toBeNull();
    });
  });

  describe("findById", () => {
    it("should find floor plan by id", async () => {
      const created = await FloorPlanModel.create({
        plannableType: PlannableType.PROJECT,
        plannableId: projectId,
        name: "Test Floor",
        imageUrl: "test.jpg",
      });

      const found = await FloorPlanModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe("Test Floor");
    });

    it("should return null for non-existent id", async () => {
      const found = await FloorPlanModel.findById(999999);
      expect(found).toBeNull();
    });
  });

  describe("Polymorphic behavior", () => {
    it("should keep plans separate between different entity types", async () => {
      await FloorPlanModel.create({
        plannableType: PlannableType.PROJECT,
        plannableId: projectId,
        name: "Project Floor",
        imageUrl: "project.jpg",
      });

      await FloorPlanModel.create({
        plannableType: PlannableType.APARTMENT,
        plannableId: apartmentId,
        name: "Apartment Floor",
        imageUrl: "apartment.jpg",
      });

      const projectPlans = await FloorPlanModel.getForEntity(
        PlannableType.PROJECT,
        projectId
      );
      const apartmentPlans = await FloorPlanModel.getForEntity(
        PlannableType.APARTMENT,
        apartmentId
      );

      expect(projectPlans).toHaveLength(1);
      expect(apartmentPlans).toHaveLength(1);
      expect(projectPlans[0].name).toBe("Project Floor");
      expect(apartmentPlans[0].name).toBe("Apartment Floor");
    });

    it("should keep plans separate between different entities of same type", async () => {
      const project2 = await ProjectModel.create({
        name: "Project 2",
        slug: `project-2-${Date.now()}`,
        address: "456 Test St",
      });

      await FloorPlanModel.create({
        plannableType: PlannableType.PROJECT,
        plannableId: projectId,
        name: "Project 1 Floor",
        imageUrl: "p1.jpg",
      });

      await FloorPlanModel.create({
        plannableType: PlannableType.PROJECT,
        plannableId: project2.id,
        name: "Project 2 Floor",
        imageUrl: "p2.jpg",
      });

      const project1Plans = await FloorPlanModel.getForEntity(
        PlannableType.PROJECT,
        projectId
      );
      const project2Plans = await FloorPlanModel.getForEntity(
        PlannableType.PROJECT,
        project2.id
      );

      expect(project1Plans).toHaveLength(1);
      expect(project2Plans).toHaveLength(1);
    });
  });
});
