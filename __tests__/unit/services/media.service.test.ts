/**
 * Media Service Tests
 * Comprehensive test suite for polymorphic media operations
 *
 * Test Coverage:
 * - Type guards and validation
 * - Retrieve media (photos and floor plans)
 * - Add media to entities
 * - Update media
 * - Delete media with cascade
 * - Reorder media
 * - Copy/duplicate media
 * - Media validation
 * - Transaction safety
 * - Error handling
 */

import { MediaService } from "@services/media.service";
import PhotoModel, { PhotoableType, Photo } from "@models/photo.model";
import FloorPlanModel, {
  PlannableType,
  FloorPlan,
} from "@models/floor-plan.model";
import db from "@/config/database";

// Mock dependencies
jest.mock("@models/photo.model");
jest.mock("@models/floor-plan.model");
jest.mock("@/config/database");

describe("Media Service", () => {
  let mockTransaction: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock transaction
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };

    (db.transaction as jest.Mock) = jest
      .fn()
      .mockResolvedValue(mockTransaction);
    (db as any) = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      del: jest.fn().mockResolvedValue(1),
    });

    // Suppress console logs
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // TYPE GUARDS & VALIDATION TESTS
  // ============================================================================

  describe("Type Guards", () => {
    describe("isValidPhotoableType", () => {
      it("should validate correct photoable types", () => {
        expect(MediaService.isValidPhotoableType(PhotoableType.PROJECT)).toBe(
          true
        );
        expect(MediaService.isValidPhotoableType(PhotoableType.APARTMENT)).toBe(
          true
        );
        expect(
          MediaService.isValidPhotoableType(PhotoableType.COMMERCIAL_PROPERTY)
        ).toBe(true);
        expect(MediaService.isValidPhotoableType(PhotoableType.BLOG_POST)).toBe(
          true
        );
        expect(MediaService.isValidPhotoableType(PhotoableType.EVENT)).toBe(
          true
        );
      });

      it("should reject invalid photoable types", () => {
        expect(MediaService.isValidPhotoableType("invalid_type" as any)).toBe(
          false
        );
        expect(MediaService.isValidPhotoableType("" as any)).toBe(false);
        expect(MediaService.isValidPhotoableType(null as any)).toBe(false);
      });
    });

    describe("isValidPlannableType", () => {
      it("should validate correct plannable types", () => {
        expect(MediaService.isValidPlannableType(PlannableType.PROJECT)).toBe(
          true
        );
        expect(MediaService.isValidPlannableType(PlannableType.APARTMENT)).toBe(
          true
        );
      });

      it("should reject invalid plannable types", () => {
        expect(MediaService.isValidPlannableType("commercial" as any)).toBe(
          false
        );
        expect(MediaService.isValidPlannableType("blog_post" as any)).toBe(
          false
        );
      });
    });
  });

  // ============================================================================
  // RETRIEVE MEDIA TESTS
  // ============================================================================

  describe("Get Media Operations", () => {
    const mockPhotos: Photo[] = [
      {
        id: 1,
        photoableType: PhotoableType.PROJECT,
        photoableId: 1,
        url: "photo1.jpg",
        externalUrl: null, // Added
        caption: null, // Added
        isCover: true,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null, // Added
        polymorphicType: undefined as never, // Added (using 'never' type as per interface)
        polymorphicId: undefined as never, // Added (using 'never' type as per interface)
      },
    ];

    const mockFloorPlans: FloorPlan[] = [
      {
        id: 1,
        plannableType: PlannableType.PROJECT,
        plannableId: 1,
        name: "Floor Plan 1",
        imageUrl: "plan1.jpg",
        pdfUrl: null, // Added
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null, // Added
        polymorphicType: undefined as never, // Added (using 'never' type as per interface)
        polymorphicId: undefined as never, // Added (using 'never' type as per interface)
      },
    ];
    describe("getProjectMedia", () => {
      it("should retrieve all project media", async () => {
        (PhotoModel.getForEntity as jest.Mock).mockResolvedValue(mockPhotos);
        (FloorPlanModel.getForEntity as jest.Mock).mockResolvedValue(
          mockFloorPlans
        );

        const media = await MediaService.getProjectMedia(1);

        expect(media.photos).toEqual(mockPhotos);
        expect(media.floorPlans).toEqual(mockFloorPlans);
        expect(PhotoModel.getForEntity).toHaveBeenCalledWith(
          PhotoableType.PROJECT,
          1,
          {},
          undefined
        );
        expect(FloorPlanModel.getForEntity).toHaveBeenCalledWith(
          PlannableType.PROJECT,
          1,
          {},
          undefined
        );
      });

      it("should support transactions", async () => {
        (PhotoModel.getForEntity as jest.Mock).mockResolvedValue(mockPhotos);
        (FloorPlanModel.getForEntity as jest.Mock).mockResolvedValue(
          mockFloorPlans
        );

        await MediaService.getProjectMedia(1, mockTransaction);

        expect(PhotoModel.getForEntity).toHaveBeenCalledWith(
          PhotoableType.PROJECT,
          1,
          {},
          mockTransaction
        );
      });

      it("should handle errors gracefully", async () => {
        (PhotoModel.getForEntity as jest.Mock).mockRejectedValue(
          new Error("Database error")
        );

        await expect(MediaService.getProjectMedia(1)).rejects.toThrow(
          "Failed to retrieve media for project 1"
        );
      });
    });

    describe("getApartmentMedia", () => {
      it("should retrieve all apartment media", async () => {
        (PhotoModel.getForEntity as jest.Mock).mockResolvedValue(mockPhotos);
        (FloorPlanModel.getForEntity as jest.Mock).mockResolvedValue(
          mockFloorPlans
        );

        const media = await MediaService.getApartmentMedia(1);

        expect(media.photos).toEqual(mockPhotos);
        expect(media.floorPlans).toEqual(mockFloorPlans);
        expect(PhotoModel.getForEntity).toHaveBeenCalledWith(
          PhotoableType.APARTMENT,
          1,
          {},
          undefined
        );
      });

      it("should handle apartment retrieval errors", async () => {
        (PhotoModel.getForEntity as jest.Mock).mockRejectedValue(
          new Error("Not found")
        );

        await expect(MediaService.getApartmentMedia(1)).rejects.toThrow(
          "Failed to retrieve media for apartment 1"
        );
      });
    });

    describe("getCommercialPropertyPhotos", () => {
      it("should retrieve commercial property photos", async () => {
        (PhotoModel.getForEntity as jest.Mock).mockResolvedValue(mockPhotos);

        const photos = await MediaService.getCommercialPropertyPhotos(1);

        expect(photos).toEqual(mockPhotos);
        expect(PhotoModel.getForEntity).toHaveBeenCalledWith(
          PhotoableType.COMMERCIAL_PROPERTY,
          1,
          {},
          undefined
        );
      });
    });

    describe("getBlogPostPhotos", () => {
      it("should retrieve blog post photos", async () => {
        (PhotoModel.getForEntity as jest.Mock).mockResolvedValue(mockPhotos);

        const photos = await MediaService.getBlogPostPhotos(1);

        expect(photos).toEqual(mockPhotos);
        expect(PhotoModel.getForEntity).toHaveBeenCalledWith(
          PhotoableType.BLOG_POST,
          1,
          {},
          undefined
        );
      });
    });

    describe("getEventPhotos", () => {
      it("should retrieve event photos", async () => {
        (PhotoModel.getForEntity as jest.Mock).mockResolvedValue(mockPhotos);

        const photos = await MediaService.getEventPhotos(1);

        expect(photos).toEqual(mockPhotos);
        expect(PhotoModel.getForEntity).toHaveBeenCalledWith(
          PhotoableType.EVENT,
          1,
          {},
          undefined
        );
      });
    });

    describe("getEntityMedia", () => {
      it("should retrieve media for any valid entity type", async () => {
        (PhotoModel.getForEntity as jest.Mock).mockResolvedValue(mockPhotos);
        (FloorPlanModel.getForEntity as jest.Mock).mockResolvedValue(
          mockFloorPlans
        );

        const media = await MediaService.getEntityMedia(
          PhotoableType.PROJECT,
          1
        );

        expect(media.photos).toEqual(mockPhotos);
        expect(media.floorPlans).toEqual(mockFloorPlans);
      });

      it("should throw error for invalid entity type", async () => {
        await expect(
          MediaService.getEntityMedia("invalid_type" as any, 1)
        ).rejects.toThrow("Invalid entity type: invalid_type");
      });

      it("should not retrieve floor plans for entities without them", async () => {
        (PhotoModel.getForEntity as jest.Mock).mockResolvedValue(mockPhotos);

        const media = await MediaService.getEntityMedia(
          PhotoableType.COMMERCIAL_PROPERTY,
          1
        );

        expect(media.photos).toEqual(mockPhotos);
        expect(media.floorPlans).toBeUndefined();
        expect(FloorPlanModel.getForEntity).not.toHaveBeenCalled();
      });
    });

    describe("getCoverPhoto", () => {
      it("should retrieve cover photo", async () => {
        const mockCoverPhoto = { ...mockPhotos[0], isCover: true };
        (PhotoModel.getCoverPhoto as jest.Mock).mockResolvedValue(
          mockCoverPhoto
        );

        const coverPhoto = await MediaService.getCoverPhoto(
          PhotoableType.PROJECT,
          1
        );

        expect(coverPhoto).toEqual(mockCoverPhoto);
        expect(PhotoModel.getCoverPhoto).toHaveBeenCalledWith(
          PhotoableType.PROJECT,
          1,
          undefined
        );
      });

      it("should return null if no cover photo exists", async () => {
        (PhotoModel.getCoverPhoto as jest.Mock).mockResolvedValue(null);

        const coverPhoto = await MediaService.getCoverPhoto(
          PhotoableType.PROJECT,
          1
        );

        expect(coverPhoto).toBeNull();
      });
    });
  });

  // ============================================================================
  // ADD MEDIA TESTS
  // ============================================================================

  describe("Add Media Operations", () => {
    describe("addPhotos", () => {
      it("should add multiple photos to entity", async () => {
        const photoData = [
          { url: "photo1.jpg", caption: "Photo 1" },
          { url: "photo2.jpg", caption: "Photo 2" },
        ];

        const mockCreatedPhotos = photoData.map((data, i) => ({
          id: i + 1,
          photoableType: PhotoableType.PROJECT,
          photoableId: 1,
          ...data,
          displayOrder: i + 1,
          isCover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        (PhotoModel.createManyForEntity as jest.Mock).mockResolvedValue(
          mockCreatedPhotos
        );

        const photos = await MediaService.addPhotos(
          PhotoableType.PROJECT,
          1,
          photoData
        );

        expect(photos).toEqual(mockCreatedPhotos);
        expect(PhotoModel.createManyForEntity).toHaveBeenCalledWith(
          PhotoableType.PROJECT,
          1,
          photoData,
          undefined
        );
      });

      it("should support transactions when adding photos", async () => {
        const photoData = [{ url: "photo1.jpg" }];
        (PhotoModel.createManyForEntity as jest.Mock).mockResolvedValue([]);

        await MediaService.addPhotos(
          PhotoableType.PROJECT,
          1,
          photoData,
          mockTransaction
        );

        expect(PhotoModel.createManyForEntity).toHaveBeenCalledWith(
          PhotoableType.PROJECT,
          1,
          photoData,
          mockTransaction
        );
      });
    });

    describe("addFloorPlans", () => {
      it("should add multiple floor plans to entity", async () => {
        const planData = [
          { name: "Ground Floor", imageUrl: "ground.jpg" },
          { name: "First Floor", imageUrl: "first.jpg" },
        ];

        const mockCreatedPlans = planData.map((data, i) => ({
          id: i + 1,
          plannableType: PlannableType.PROJECT,
          plannableId: 1,
          ...data,
          displayOrder: i + 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        (FloorPlanModel.createManyForEntity as jest.Mock).mockResolvedValue(
          mockCreatedPlans
        );

        const plans = await MediaService.addFloorPlans(
          PlannableType.PROJECT,
          1,
          planData
        );

        expect(plans).toEqual(mockCreatedPlans);
        expect(FloorPlanModel.createManyForEntity).toHaveBeenCalledWith(
          PlannableType.PROJECT,
          1,
          planData,
          undefined
        );
      });
    });

    describe("addPhoto", () => {
      it("should add a single photo", async () => {
        const photoData = {
          url: "photo1.jpg",
          caption: "Single Photo",
          isCover: true,
        };

        const mockCreatedPhoto = {
          id: 1,
          photoableType: PhotoableType.PROJECT,
          photoableId: 1,
          ...photoData,
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (PhotoModel.create as jest.Mock).mockResolvedValue(mockCreatedPhoto);

        const photo = await MediaService.addPhoto(
          PhotoableType.PROJECT,
          1,
          photoData
        );

        expect(photo).toEqual(mockCreatedPhoto);
        expect(PhotoModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            photoableType: PhotoableType.PROJECT,
            photoableId: 1,
            ...photoData,
          }),
          undefined
        );
      });
    });

    describe("addFloorPlan", () => {
      it("should add a single floor plan", async () => {
        const planData = {
          name: "Ground Floor",
          imageUrl: "ground.jpg",
          pdfUrl: "ground.pdf",
        };

        const mockCreatedPlan = {
          id: 1,
          plannableType: PlannableType.PROJECT,
          plannableId: 1,
          ...planData,
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (FloorPlanModel.create as jest.Mock).mockResolvedValue(mockCreatedPlan);

        const plan = await MediaService.addFloorPlan(
          PlannableType.PROJECT,
          1,
          planData
        );

        expect(plan).toEqual(mockCreatedPlan);
        expect(FloorPlanModel.create).toHaveBeenCalledWith(
          expect.objectContaining({
            plannableType: PlannableType.PROJECT,
            plannableId: 1,
            ...planData,
          }),
          undefined
        );
      });
    });
  });

  // ============================================================================
  // UPDATE MEDIA TESTS
  // ============================================================================

  describe("Update Media Operations", () => {
    describe("updatePhoto", () => {
      it("should update photo data", async () => {
        const updateData = {
          caption: "Updated Caption",
          displayOrder: 5,
        };

        const mockUpdatedPhoto = {
          id: 1,
          ...updateData,
          url: "photo1.jpg",
          isCover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (PhotoModel.update as jest.Mock).mockResolvedValue(mockUpdatedPhoto);

        const photo = await MediaService.updatePhoto(1, updateData);

        expect(photo).toEqual(mockUpdatedPhoto);
        expect(PhotoModel.update).toHaveBeenCalledWith(
          1,
          updateData,
          undefined
        );
      });

      it("should return null if photo not found", async () => {
        (PhotoModel.update as jest.Mock).mockResolvedValue(null);

        const photo = await MediaService.updatePhoto(999, { caption: "Test" });

        expect(photo).toBeNull();
      });
    });

    describe("updateFloorPlan", () => {
      it("should update floor plan data", async () => {
        const updateData = {
          name: "Updated Floor Plan",
          pdfUrl: "updated.pdf",
        };

        const mockUpdatedPlan = {
          id: 1,
          ...updateData,
          imageUrl: "plan.jpg",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (FloorPlanModel.update as jest.Mock).mockResolvedValue(mockUpdatedPlan);

        const plan = await MediaService.updateFloorPlan(1, updateData);

        expect(plan).toEqual(mockUpdatedPlan);
        expect(FloorPlanModel.update).toHaveBeenCalledWith(
          1,
          updateData,
          undefined
        );
      });
    });

    describe("setCoverPhoto", () => {
      it("should set photo as cover", async () => {
        const mockCoverPhoto = {
          id: 1,
          isCover: true,
          url: "photo1.jpg",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (PhotoModel.setCover as jest.Mock).mockResolvedValue(mockCoverPhoto);

        const photo = await MediaService.setCoverPhoto(1);

        expect(photo).toEqual(mockCoverPhoto);
        expect(PhotoModel.setCover).toHaveBeenCalledWith(1, undefined);
      });
    });
  });

  // ============================================================================
  // DELETE MEDIA TESTS
  // ============================================================================

  describe("Delete Media Operations", () => {
    describe("deletePhoto", () => {
      it("should soft delete photo by default", async () => {
        (PhotoModel.delete as jest.Mock).mockResolvedValue(true);

        const deleted = await MediaService.deletePhoto(1);

        expect(deleted).toBe(true);
        expect(PhotoModel.delete).toHaveBeenCalledWith(1, undefined);
        expect(PhotoModel.forceDelete).not.toHaveBeenCalled();
      });

      it("should force delete when specified", async () => {
        (PhotoModel.forceDelete as jest.Mock).mockResolvedValue(true);

        const deleted = await MediaService.deletePhoto(1, true);

        expect(deleted).toBe(true);
        expect(PhotoModel.forceDelete).toHaveBeenCalledWith(1, undefined);
      });
    });

    describe("deleteFloorPlan", () => {
      it("should soft delete floor plan by default", async () => {
        (FloorPlanModel.delete as jest.Mock).mockResolvedValue(true);

        const deleted = await MediaService.deleteFloorPlan(1);

        expect(deleted).toBe(true);
        expect(FloorPlanModel.delete).toHaveBeenCalledWith(1, undefined);
      });

      it("should force delete when specified", async () => {
        (FloorPlanModel.forceDelete as jest.Mock).mockResolvedValue(true);

        const deleted = await MediaService.deleteFloorPlan(1, true);

        expect(deleted).toBe(true);
        expect(FloorPlanModel.forceDelete).toHaveBeenCalledWith(1, undefined);
      });
    });

    describe("deleteEntityMedia", () => {
      it("should delete all entity photos", async () => {
        (PhotoModel.deleteForEntity as jest.Mock).mockResolvedValue(true);

        const result = await MediaService.deleteEntityMedia(
          PhotoableType.PROJECT,
          1,
          false
        );

        expect(result.photosDeleted).toBe(true);
        expect(result.plansDeleted).toBeUndefined();
        expect(PhotoModel.deleteForEntity).toHaveBeenCalledWith(
          PhotoableType.PROJECT,
          1,
          false,
          mockTransaction
        );
      });

      it("should delete photos and floor plans when specified", async () => {
        (PhotoModel.deleteForEntity as jest.Mock).mockResolvedValue(true);
        (FloorPlanModel.deleteForEntity as jest.Mock).mockResolvedValue(true);

        const result = await MediaService.deleteEntityMedia(
          PhotoableType.PROJECT,
          1,
          true
        );

        expect(result.photosDeleted).toBe(true);
        expect(result.plansDeleted).toBe(true);
        expect(FloorPlanModel.deleteForEntity).toHaveBeenCalled();
      });

      it("should commit transaction on success", async () => {
        (PhotoModel.deleteForEntity as jest.Mock).mockResolvedValue(true);

        await MediaService.deleteEntityMedia(PhotoableType.PROJECT, 1, false);

        expect(mockTransaction.commit).toHaveBeenCalled();
      });

      it("should rollback transaction on error", async () => {
        (PhotoModel.deleteForEntity as jest.Mock).mockRejectedValue(
          new Error("Delete failed")
        );

        await expect(
          MediaService.deleteEntityMedia(PhotoableType.PROJECT, 1, false)
        ).rejects.toThrow("Delete failed");

        expect(mockTransaction.rollback).toHaveBeenCalled();
      });
    });

    describe("deleteEntityWithMedia", () => {
      it("should cascade delete entity with all media", async () => {
        (PhotoModel.deleteForEntity as jest.Mock).mockResolvedValue(true);
        (FloorPlanModel.deleteForEntity as jest.Mock).mockResolvedValue(true);

        const result = await MediaService.deleteEntityWithMedia(
          PhotoableType.PROJECT,
          1,
          "projects"
        );

        expect(result).toBe(true);
        expect(PhotoModel.deleteForEntity).toHaveBeenCalledWith(
          PhotoableType.PROJECT,
          1,
          true,
          mockTransaction
        );
        expect(mockTransaction.commit).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // REORDER MEDIA TESTS
  // ============================================================================

  describe("Reorder Media Operations", () => {
    describe("reorderPhotos", () => {
      it("should reorder photos for entity", async () => {
        const photoIds = [3, 1, 2];
        (PhotoModel.reorder as jest.Mock).mockResolvedValue(true);

        const result = await MediaService.reorderPhotos(
          PhotoableType.PROJECT,
          1,
          photoIds
        );

        expect(result).toBe(true);
        expect(PhotoModel.reorder).toHaveBeenCalledWith(
          PhotoableType.PROJECT,
          1,
          photoIds,
          undefined
        );
      });
    });

    describe("reorderFloorPlans", () => {
      it("should reorder floor plans for entity", async () => {
        const planIds = [2, 3, 1];
        (FloorPlanModel.reorder as jest.Mock).mockResolvedValue(true);

        const result = await MediaService.reorderFloorPlans(
          PlannableType.PROJECT,
          1,
          planIds
        );

        expect(result).toBe(true);
        expect(FloorPlanModel.reorder).toHaveBeenCalledWith(
          PlannableType.PROJECT,
          1,
          planIds,
          undefined
        );
      });
    });

    describe("reorderMedia", () => {
      it("should reorder both photos and floor plans", async () => {
        const photoIds = [3, 1, 2];
        const planIds = [2, 1];

        (PhotoModel.reorder as jest.Mock).mockResolvedValue(true);
        (FloorPlanModel.reorder as jest.Mock).mockResolvedValue(true);

        const result = await MediaService.reorderMedia(
          PhotoableType.PROJECT,
          1,
          photoIds,
          planIds
        );

        expect(result.photosReordered).toBe(true);
        expect(result.plansReordered).toBe(true);
        expect(mockTransaction.commit).toHaveBeenCalled();
      });

      it("should only reorder photos if no plan IDs provided", async () => {
        const photoIds = [3, 1, 2];

        (PhotoModel.reorder as jest.Mock).mockResolvedValue(true);

        const result = await MediaService.reorderMedia(
          PhotoableType.PROJECT,
          1,
          photoIds
        );

        expect(result.photosReordered).toBe(true);
        expect(result.plansReordered).toBeUndefined();
        expect(FloorPlanModel.reorder).not.toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // STATISTICS & COUNTS TESTS
  // ============================================================================

  describe("Statistics Operations", () => {
    describe("getMediaCounts", () => {
      it("should return photo and floor plan counts", async () => {
        (PhotoModel.countForEntity as jest.Mock).mockResolvedValue(10);
        (FloorPlanModel.countForEntity as jest.Mock).mockResolvedValue(3);

        const counts = await MediaService.getMediaCounts(
          PhotoableType.PROJECT,
          1
        );

        expect(counts.photoCount).toBe(10);
        expect(counts.floorPlanCount).toBe(3);
      });

      it("should not count floor plans for entities without them", async () => {
        (PhotoModel.countForEntity as jest.Mock).mockResolvedValue(5);

        const counts = await MediaService.getMediaCounts(
          PhotoableType.COMMERCIAL_PROPERTY,
          1
        );

        expect(counts.photoCount).toBe(5);
        expect(counts.floorPlanCount).toBeUndefined();
        expect(FloorPlanModel.countForEntity).not.toHaveBeenCalled();
      });
    });

    describe("getFloorPlanStatistics", () => {
      it("should return floor plan statistics", async () => {
        const mockStats = {
          total: 5,
          withPdf: 3,
          withoutPdf: 2,
        };

        (FloorPlanModel.getStatistics as jest.Mock).mockResolvedValue(
          mockStats
        );

        const stats = await MediaService.getFloorPlanStatistics(
          PlannableType.PROJECT,
          1
        );

        expect(stats).toEqual(mockStats);
        expect(FloorPlanModel.getStatistics).toHaveBeenCalledWith(
          PlannableType.PROJECT,
          1,
          undefined
        );
      });
    });
  });

  // ============================================================================
  // COPY/DUPLICATE MEDIA TESTS
  // ============================================================================

  describe("Copy Media Operations", () => {
    describe("copyMedia", () => {
      it("should copy media from source to target", async () => {
        const mockPhotos = [{ id: 1, url: "photo1.jpg" }];
        const mockPlans = [{ id: 1, name: "Plan 1" }];

        (PhotoModel.duplicatePhotos as jest.Mock).mockResolvedValue(mockPhotos);
        (FloorPlanModel.duplicateFloorPlans as jest.Mock).mockResolvedValue(
          mockPlans
        );

        const result = await MediaService.copyMedia(
          PhotoableType.PROJECT,
          1,
          PhotoableType.PROJECT,
          2,
          true
        );

        expect(result.photos).toEqual(mockPhotos);
        expect(result.floorPlans).toEqual(mockPlans);
        expect(mockTransaction.commit).toHaveBeenCalled();
      });

      it("should only copy photos if floor plans not included", async () => {
        const mockPhotos = [{ id: 1, url: "photo1.jpg" }];

        (PhotoModel.duplicatePhotos as jest.Mock).mockResolvedValue(mockPhotos);

        const result = await MediaService.copyMedia(
          PhotoableType.PROJECT,
          1,
          PhotoableType.PROJECT,
          2,
          false
        );

        expect(result.photos).toEqual(mockPhotos);
        expect(result.floorPlans).toBeUndefined();
        expect(FloorPlanModel.duplicateFloorPlans).not.toHaveBeenCalled();
      });

      it("should rollback on copy error", async () => {
        (PhotoModel.duplicatePhotos as jest.Mock).mockRejectedValue(
          new Error("Copy failed")
        );

        await expect(
          MediaService.copyMedia(
            PhotoableType.PROJECT,
            1,
            PhotoableType.PROJECT,
            2
          )
        ).rejects.toThrow("Copy failed");

        expect(mockTransaction.rollback).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  describe("Validation Operations", () => {
    describe("validateRequiredMedia", () => {
      it("should validate entity meets media requirements", async () => {
        (PhotoModel.countForEntity as jest.Mock).mockResolvedValue(5);
        (PhotoModel.getCoverPhoto as jest.Mock).mockResolvedValue({ id: 1 });
        (FloorPlanModel.countForEntity as jest.Mock).mockResolvedValue(2);

        const result = await MediaService.validateRequiredMedia(
          PhotoableType.PROJECT,
          1,
          {
            minPhotos: 3,
            requireCoverPhoto: true,
            minFloorPlans: 1,
          }
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should detect insufficient photos", async () => {
        (PhotoModel.countForEntity as jest.Mock).mockResolvedValue(2);

        const result = await MediaService.validateRequiredMedia(
          PhotoableType.PROJECT,
          1,
          { minPhotos: 5 }
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          "Requires at least 5 photo(s), found 2"
        );
      });

      it("should detect missing cover photo", async () => {
        (PhotoModel.countForEntity as jest.Mock).mockResolvedValue(5);
        (PhotoModel.getCoverPhoto as jest.Mock).mockResolvedValue(null);

        const result = await MediaService.validateRequiredMedia(
          PhotoableType.PROJECT,
          1,
          { requireCoverPhoto: true }
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Cover photo is required");
      });

      it("should detect insufficient floor plans", async () => {
        (PhotoModel.countForEntity as jest.Mock).mockResolvedValue(5);
        (FloorPlanModel.countForEntity as jest.Mock).mockResolvedValue(1);

        const result = await MediaService.validateRequiredMedia(
          PhotoableType.PROJECT,
          1,
          { minFloorPlans: 3 }
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          "Requires at least 3 floor plan(s), found 1"
        );
      });

      it("should pass validation when all requirements met", async () => {
        (PhotoModel.countForEntity as jest.Mock).mockResolvedValue(10);
        (PhotoModel.getCoverPhoto as jest.Mock).mockResolvedValue({ id: 1 });
        (FloorPlanModel.countForEntity as jest.Mock).mockResolvedValue(5);

        const result = await MediaService.validateRequiredMedia(
          PhotoableType.PROJECT,
          1,
          {
            minPhotos: 5,
            requireCoverPhoto: true,
            minFloorPlans: 3,
          }
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should handle multiple validation errors", async () => {
        (PhotoModel.countForEntity as jest.Mock).mockResolvedValue(1);
        (PhotoModel.getCoverPhoto as jest.Mock).mockResolvedValue(null);
        (FloorPlanModel.countForEntity as jest.Mock).mockResolvedValue(0);

        const result = await MediaService.validateRequiredMedia(
          PhotoableType.PROJECT,
          1,
          {
            minPhotos: 5,
            requireCoverPhoto: true,
            minFloorPlans: 2,
          }
        );

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIOS
  // ============================================================================

  describe("Integration Scenarios", () => {
    it("should handle complete media lifecycle", async () => {
      const photoData = [{ url: "photo1.jpg" }];
      const mockPhotos = [{ id: 1, url: "photo1.jpg" }];

      (PhotoModel.createManyForEntity as jest.Mock).mockResolvedValue(
        mockPhotos
      );
      (PhotoModel.update as jest.Mock).mockResolvedValue({
        id: 1,
        caption: "Updated",
      });
      (PhotoModel.delete as jest.Mock).mockResolvedValue(true);

      // Add
      await MediaService.addPhotos(PhotoableType.PROJECT, 1, photoData);

      // Update
      await MediaService.updatePhoto(1, { caption: "Updated" });

      // Delete
      await MediaService.deletePhoto(1);

      expect(PhotoModel.createManyForEntity).toHaveBeenCalled();
      expect(PhotoModel.update).toHaveBeenCalled();
      expect(PhotoModel.delete).toHaveBeenCalled();
    });

    it("should handle batch operations with transactions", async () => {
      const photoData = [
        { url: "photo1.jpg" },
        { url: "photo2.jpg" },
        { url: "photo3.jpg" },
      ];

      (PhotoModel.createManyForEntity as jest.Mock).mockResolvedValue([]);
      (PhotoModel.reorder as jest.Mock).mockResolvedValue(true);

      await MediaService.addPhotos(
        PhotoableType.PROJECT,
        1,
        photoData,
        mockTransaction
      );

      await MediaService.reorderPhotos(
        PhotoableType.PROJECT,
        1,
        [3, 1, 2],
        mockTransaction
      );

      expect(PhotoModel.createManyForEntity).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.any(Array),
        mockTransaction
      );
    });

    it("should handle entity migration with media", async () => {
      const mockPhotos = [{ id: 1, url: "photo1.jpg" }];
      const mockPlans = [{ id: 1, name: "Plan 1" }];

      (PhotoModel.duplicatePhotos as jest.Mock).mockResolvedValue(mockPhotos);
      (FloorPlanModel.duplicateFloorPlans as jest.Mock).mockResolvedValue(
        mockPlans
      );

      // Copy media from project 1 to project 2
      await MediaService.copyMedia(
        PhotoableType.PROJECT,
        1,
        PhotoableType.PROJECT,
        2,
        true
      );

      expect(PhotoModel.duplicatePhotos).toHaveBeenCalled();
      expect(FloorPlanModel.duplicateFloorPlans).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe("Error Handling", () => {
    it("should handle database connection errors", async () => {
      (PhotoModel.getForEntity as jest.Mock).mockRejectedValue(
        new Error("Connection lost")
      );

      await expect(MediaService.getProjectMedia(1)).rejects.toThrow(
        "Failed to retrieve media for project 1"
      );
    });

    it("should rollback transactions on error", async () => {
      (PhotoModel.deleteForEntity as jest.Mock).mockRejectedValue(
        new Error("Delete failed")
      );

      await expect(
        MediaService.deleteEntityMedia(PhotoableType.PROJECT, 1, false)
      ).rejects.toThrow();

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("should handle concurrent modification errors", async () => {
      (PhotoModel.reorder as jest.Mock).mockRejectedValue(
        new Error("Deadlock detected")
      );

      await expect(
        MediaService.reorderMedia(PhotoableType.PROJECT, 1, [1, 2, 3])
      ).rejects.toThrow();
    });

    it("should propagate validation errors", async () => {
      await expect(
        MediaService.getEntityMedia("invalid" as any, 1)
      ).rejects.toThrow("Invalid entity type");
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle empty media collections", async () => {
      (PhotoModel.getForEntity as jest.Mock).mockResolvedValue([]);
      (FloorPlanModel.getForEntity as jest.Mock).mockResolvedValue([]);

      const media = await MediaService.getProjectMedia(1);

      expect(media.photos).toEqual([]);
      expect(media.floorPlans).toEqual([]);
    });

    it("should handle very large media collections", async () => {
      const largePhotoArray = Array(1000).fill({ id: 1, url: "photo.jpg" });
      (PhotoModel.getForEntity as jest.Mock).mockResolvedValue(largePhotoArray);

      const media = await MediaService.getEntityMedia(PhotoableType.PROJECT, 1);

      expect(media.photos.length).toBe(1000);
    });

    it("should handle null transaction parameter", async () => {
      (PhotoModel.getForEntity as jest.Mock).mockResolvedValue([]);

      await MediaService.getEntityMedia(PhotoableType.PROJECT, 1, undefined);

      expect(PhotoModel.getForEntity).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.any(Object),
        undefined
      );
    });

    it("should handle entities with mixed media types", async () => {
      const mockPhotos = [{ id: 1, url: "photo.jpg" }];
      const mockPlans = [{ id: 1, name: "Plan" }];

      (PhotoModel.getForEntity as jest.Mock).mockResolvedValue(mockPhotos);
      (FloorPlanModel.getForEntity as jest.Mock).mockResolvedValue(mockPlans);

      const media = await MediaService.getApartmentMedia(1);

      expect(media.photos).toBeDefined();
      expect(media.floorPlans).toBeDefined();
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe("Performance", () => {
    it("should efficiently batch multiple operations", async () => {
      const operations = Array(100)
        .fill(null)
        .map((_, i) =>
          MediaService.addPhoto(PhotoableType.PROJECT, 1, {
            url: `photo${i}.jpg`,
          })
        );

      (PhotoModel.create as jest.Mock).mockResolvedValue({ id: 1 });

      await Promise.all(operations);

      expect(PhotoModel.create).toHaveBeenCalledTimes(100);
    });

    it("should handle concurrent reads efficiently", async () => {
      (PhotoModel.getForEntity as jest.Mock).mockResolvedValue([]);
      (FloorPlanModel.getForEntity as jest.Mock).mockResolvedValue([]);

      const reads = Array(50)
        .fill(null)
        .map(() => MediaService.getProjectMedia(1));

      await Promise.all(reads);

      expect(PhotoModel.getForEntity).toHaveBeenCalled();
    });
  });
});
