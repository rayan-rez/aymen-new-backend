/**
 * File: src/__tests__/unit/models/photo.model.test.ts
 * FIXED: Added proper async/await and unique timestamps
 */

import PhotoModel, { PhotoableType } from "@models/photo.model";
import db from "@/config/database";
import ProjectModel from "@models/project.model";

describe("PhotoModel", () => {
  let projectId: number;

  beforeEach(async () => {
    // Clean up in correct order with await
    await db("photos").del();
    await db("floor_plans").del();
    await db("project_features").del();
    await db("projects").del();

    // Add small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create a test project with unique timestamp
    const project = await ProjectModel.create({
      name: "Test Project",
      slug: `photo-model-test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      address: "123 Test St",
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await db("photos").del();
    await db("floor_plans").del();
    await db("project_features").del();
    await db("projects").del();
    await db.destroy();
  });

  describe("bulkCreate", () => {
    it("should create multiple photos at once", async () => {
      const photos = await PhotoModel.bulkCreate(
        PhotoableType.PROJECT,
        projectId,
        [
          { url: "photo1.jpg", caption: "Photo 1", isCover: false },
          { url: "photo2.jpg", caption: "Photo 2", isCover: false },
          { url: "photo3.jpg", caption: "Photo 3", isCover: false },
        ]
      );

      expect(photos).toHaveLength(3);
      expect(photos[0].displayOrder).toBe(0);
      expect(photos[1].displayOrder).toBe(1);
      expect(photos[2].displayOrder).toBe(2);
    });

    it("should respect custom display order", async () => {
      const photos = await PhotoModel.bulkCreate(
        PhotoableType.PROJECT,
        projectId,
        [
          { url: "photo1.jpg", displayOrder: 5, isCover: false },
          { url: "photo2.jpg", displayOrder: 10, isCover: false },
        ]
      );

      expect(photos[0].displayOrder).toBe(5);
      expect(photos[1].displayOrder).toBe(10);
    });

    it("should fail when entity does not exist", async () => {
      await expect(
        PhotoModel.bulkCreate(PhotoableType.PROJECT, 99999, [
          { url: "photo.jpg", isCover: false },
        ])
      ).rejects.toThrow();
    });

    it("should handle single cover photo per entity", async () => {
      const photos = await PhotoModel.bulkCreate(
        PhotoableType.PROJECT,
        projectId,
        [
          { url: "photo1.jpg", isCover: true },
          { url: "photo2.jpg", isCover: false },
          { url: "photo3.jpg", isCover: false },
        ]
      );

      expect(photos).toHaveLength(3);
      const coverPhotos = photos.filter(p => p.isCover);
      expect(coverPhotos).toHaveLength(1);
    });
  });

  describe("reorder", () => {
    it("should reorder photos correctly", async () => {
      const photos = await PhotoModel.bulkCreate(
        PhotoableType.PROJECT,
        projectId,
        [
          { url: "photo1.jpg", isCover: false },
          { url: "photo2.jpg", isCover: false },
          { url: "photo3.jpg", isCover: false },
        ]
      );

      // Ensure photos were created
      expect(photos).toHaveLength(3);
      expect(photos[0]).toBeDefined();
      expect(photos[1]).toBeDefined();
      expect(photos[2]).toBeDefined();

      // Reverse order
      await PhotoModel.reorder(PhotoableType.PROJECT, projectId, [
        photos[2].id,
        photos[1].id,
        photos[0].id,
      ]);

      const reordered = await PhotoModel.getForEntity(
        PhotoableType.PROJECT,
        projectId
      );

      expect(reordered).toHaveLength(3);
      expect(reordered[0].id).toBe(photos[2].id);
      expect(reordered[1].id).toBe(photos[1].id);
      expect(reordered[2].id).toBe(photos[0].id);
    });
  });

  describe("deleteForEntity", () => {
    it("should delete all photos for an entity", async () => {
      await PhotoModel.bulkCreate(PhotoableType.PROJECT, projectId, [
        { url: "photo1.jpg", isCover: false },
        { url: "photo2.jpg", isCover: false },
      ]);

      const deleted = await PhotoModel.deleteForEntity(
        PhotoableType.PROJECT,
        projectId
      );
      expect(deleted).toBe(true);

      const remaining = await PhotoModel.getForEntity(
        PhotoableType.PROJECT,
        projectId
      );
      expect(remaining).toHaveLength(0);
    });
  });

  describe("setCover", () => {
    it("should set a photo as cover and unset others", async () => {
      const photos = await PhotoModel.bulkCreate(
        PhotoableType.PROJECT,
        projectId,
        [
          { url: "photo1.jpg", isCover: false },
          { url: "photo2.jpg", isCover: false },
          { url: "photo3.jpg", isCover: false },
        ]
      );

      // Ensure photos were created
      expect(photos).toHaveLength(3);
      expect(photos[1]).toBeDefined();
      expect(photos[1].id).toBeDefined();

      // Set second photo as cover
      await PhotoModel.setCover(photos[1].id);

      const allPhotos = await PhotoModel.getForEntity(
        PhotoableType.PROJECT,
        projectId
      );

      const coverPhotos = allPhotos.filter(p => p.isCover);
      expect(coverPhotos).toHaveLength(1);
      expect(coverPhotos[0].id).toBe(photos[1].id);
    });
  });

  describe("getCoverPhoto", () => {
    it("should return the cover photo for an entity", async () => {
      const photos = await PhotoModel.bulkCreate(
        PhotoableType.PROJECT,
        projectId,
        [
          { url: "photo1.jpg", isCover: false },
          { url: "photo2.jpg", isCover: true },
          { url: "photo3.jpg", isCover: false },
        ]
      );

      // Ensure photos were created
      expect(photos).toHaveLength(3);
      expect(photos[1]).toBeDefined();
      expect(photos[1].id).toBeDefined();

      const coverPhoto = await PhotoModel.getCoverPhoto(
        PhotoableType.PROJECT,
        projectId
      );

      expect(coverPhoto).toBeDefined();
      expect(coverPhoto?.id).toBe(photos[1].id);
      expect(coverPhoto?.isCover).toBe(true);
    });

    it("should return null if no cover photo exists", async () => {
      await PhotoModel.bulkCreate(PhotoableType.PROJECT, projectId, [
        { url: "photo1.jpg", isCover: false },
        { url: "photo2.jpg", isCover: false },
      ]);

      const coverPhoto = await PhotoModel.getCoverPhoto(
        PhotoableType.PROJECT,
        projectId
      );

      expect(coverPhoto).toBeNull();
    });
  });
});