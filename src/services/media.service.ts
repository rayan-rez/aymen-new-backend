/**
 * Media Helper Service
 * Provides utility functions for working with polymorphic media (photos, floor plans)
 *
 * @module services/media.service
 */

import PhotoModel, { PhotoableType, Photo } from "../models/photo.model";
import FloorPlanModel, {
  PlannableType,
  FloorPlan,
} from "../models/floor-plan.model";

/**
 * Media Helper Service Class
 * Centralizes common media operations across different entity types
 */
export class MediaService {
  /**
   * Gets all media (photos and floor plans) for a project
   *
   * @param projectId - Project ID
   * @returns Promise with photos and floor plans
   *
   * @example
   * const media = await MediaHelperService.getProjectMedia(1);
   */
  static async getProjectMedia(projectId: number) {
    const [photos, floorPlans] = await Promise.all([
      PhotoModel.getForEntity(PhotoableType.PROJECT, projectId),
      FloorPlanModel.getForEntity(PlannableType.PROJECT, projectId),
    ]);

    return { photos, floorPlans };
  }

  /**
   * Gets all media for an apartment
   *
   * @param apartmentId - Apartment ID
   * @returns Promise with photos and floor plans
   *
   * @example
   * const media = await MediaHelperService.getApartmentMedia(5);
   */
  static async getApartmentMedia(apartmentId: number) {
    const [photos, floorPlans] = await Promise.all([
      PhotoModel.getForEntity(PhotoableType.APARTMENT, apartmentId),
      FloorPlanModel.getForEntity(PlannableType.APARTMENT, apartmentId),
    ]);

    return { photos, floorPlans };
  }

  /**
   * Gets all photos for a commercial property
   *
   * @param propertyId - Commercial property ID
   * @returns Promise with photos
   *
   * @example
   * const photos = await MediaHelperService.getCommercialPropertyPhotos(3);
   */
  static async getCommercialPropertyPhotos(
    propertyId: number
  ): Promise<Photo[]> {
    return PhotoModel.getForEntity(
      PhotoableType.COMMERCIAL_PROPERTY,
      propertyId
    );
  }

  /**
   * Gets all photos for a blog post
   *
   * @param blogPostId - Blog post ID
   * @returns Promise with photos
   *
   * @example
   * const photos = await MediaHelperService.getBlogPostPhotos(7);
   */
  static async getBlogPostPhotos(blogPostId: number): Promise<Photo[]> {
    return PhotoModel.getForEntity(PhotoableType.BLOG_POST, blogPostId);
  }

  /**
   * Adds photos to any entity
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param photoData - Array of photo data
   * @returns Promise with created photos
   *
   * @example
   * const photos = await MediaHelperService.addPhotos(
   *   PhotoableType.PROJECT,
   *   1,
   *   [
   *     { url: "photo1.jpg", caption: "Front view" },
   *     { url: "photo2.jpg", caption: "Side view" }
   *   ]
   * );
   */
  static async addPhotos(
    entityType: PhotoableType,
    entityId: number,
    photoData: Array<{
      url: string;
      externalUrl?: string | null;
      caption?: string | null;
      displayOrder?: number;
      isCover?: boolean;
    }>
  ): Promise<Photo[]> {
    return PhotoModel.bulkCreate(entityType, entityId, photoData);
  }

  /**
   * Adds floor plans to any entity
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param planData - Array of floor plan data
   * @returns Promise with created floor plans
   *
   * @example
   * const plans = await MediaHelperService.addFloorPlans(
   *   PlannableType.APARTMENT,
   *   3,
   *   [
   *     { name: "Ground Floor", imageUrl: "plan1.jpg", pdfUrl: "plan1.pdf" },
   *     { name: "First Floor", imageUrl: "plan2.jpg" }
   *   ]
   * );
   */
  static async addFloorPlans(
    entityType: PlannableType,
    entityId: number,
    planData: Array<{
      name: string;
      imageUrl: string;
      pdfUrl?: string | null;
      displayOrder?: number;
    }>
  ): Promise<FloorPlan[]> {
    return FloorPlanModel.bulkCreate(entityType, entityId, planData);
  }

  /**
   * Deletes all media for an entity
   *
   * @param entityType - Entity type (project, apartment, etc.)
   * @param entityId - Entity ID
   * @param includeFloorPlans - Whether to delete floor plans too
   * @returns Promise with deletion status
   *
   * @example
   * await MediaHelperService.deleteEntityMedia(PhotoableType.PROJECT, 1, true);
   */
  static async deleteEntityMedia(
    entityType: PhotoableType,
    entityId: number,
    includeFloorPlans: boolean = false
  ): Promise<{ photosDeleted: boolean; plansDeleted?: boolean }> {
    const photosDeleted = await PhotoModel.deleteForEntity(
      entityType,
      entityId
    );

    let plansDeleted: boolean | undefined;
    if (includeFloorPlans) {
      // Map PhotoableType to PlannableType
      const plannableType =
        entityType === PhotoableType.PROJECT
          ? PlannableType.PROJECT
          : entityType === PhotoableType.APARTMENT
          ? PlannableType.APARTMENT
          : null;

      if (plannableType) {
        plansDeleted = await FloorPlanModel.deleteForEntity(
          plannableType,
          entityId
        );
      }
    }

    return { photosDeleted, plansDeleted };
  }

  /**
   * Gets or sets cover photo for an entity
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param photoId - Photo ID to set as cover (optional)
   * @returns Promise with cover photo
   *
   * @example
   * // Get current cover
   * const cover = await MediaHelperService.manageCoverPhoto(PhotoableType.PROJECT, 1);
   *
   * // Set new cover
   * const newCover = await MediaHelperService.manageCoverPhoto(PhotoableType.PROJECT, 1, 5);
   */
  static async manageCoverPhoto(
    entityType: PhotoableType,
    entityId: number,
    photoId?: number
  ): Promise<Photo | null> {
    if (photoId) {
      await PhotoModel.setCover(photoId);
    }

    return PhotoModel.getCoverPhoto(entityType, entityId);
  }

  /**
   * Reorders media for an entity
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param photoIds - Array of photo IDs in desired order
   * @param planIds - Array of floor plan IDs in desired order (optional)
   * @returns Promise with reorder status
   *
   * @example
   * await MediaHelperService.reorderMedia(
   *   PhotoableType.PROJECT,
   *   1,
   *   [5, 3, 7, 2], // photo order
   *   [10, 11]      // floor plan order
   * );
   */
  static async reorderMedia(
    entityType: PhotoableType,
    entityId: number,
    photoIds: number[],
    planIds?: number[]
  ): Promise<{ photosReordered: boolean; plansReordered?: boolean }> {
    const photosReordered = await PhotoModel.reorder(
      entityType,
      entityId,
      photoIds
    );

    let plansReordered: boolean | undefined;
    if (planIds && planIds.length > 0) {
      const plannableType =
        entityType === PhotoableType.PROJECT
          ? PlannableType.PROJECT
          : entityType === PhotoableType.APARTMENT
          ? PlannableType.APARTMENT
          : null;

      if (plannableType) {
        plansReordered = await FloorPlanModel.reorder(
          plannableType,
          entityId,
          planIds
        );
      }
    }

    return { photosReordered, plansReordered };
  }

  /**
   * Gets media counts for an entity
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @returns Promise with media counts
   *
   * @example
   * const counts = await MediaHelperService.getMediaCounts(PhotoableType.PROJECT, 1);
   * // Returns: { photoCount: 15, floorPlanCount: 3 }
   */
  static async getMediaCounts(
    entityType: PhotoableType,
    entityId: number
  ): Promise<{ photoCount: number; floorPlanCount?: number }> {
    const photoCount = await PhotoModel.countForEntity(entityType, entityId);

    let floorPlanCount: number | undefined;
    const plannableType =
      entityType === PhotoableType.PROJECT
        ? PlannableType.PROJECT
        : entityType === PhotoableType.APARTMENT
        ? PlannableType.APARTMENT
        : null;

    if (plannableType) {
      floorPlanCount = await FloorPlanModel.countForEntity(
        plannableType,
        entityId
      );
    }

    return { photoCount, floorPlanCount };
  }

  /**
   * Copies media from one entity to another
   * Useful for duplicating projects/apartments
   *
   * @param sourceType - Source entity type
   * @param sourceId - Source entity ID
   * @param targetType - Target entity type
   * @param targetId - Target entity ID
   * @param includeFloorPlans - Whether to copy floor plans too
   * @returns Promise with copied media
   *
   * @example
   * // Duplicate project media to another project
   * await MediaHelperService.copyMedia(
   *   PhotoableType.PROJECT,
   *   1,
   *   PhotoableType.PROJECT,
   *   2,
   *   true
   * );
   */
  static async copyMedia(
    sourceType: PhotoableType,
    sourceId: number,
    targetType: PhotoableType,
    targetId: number,
    includeFloorPlans: boolean = false
  ): Promise<{ photos: Photo[]; floorPlans?: FloorPlan[] }> {
    // Copy photos
    const sourcePhotos = await PhotoModel.getForEntity(sourceType, sourceId);
    const photoData = sourcePhotos.map((photo) => ({
      url: photo.url,
      externalUrl: photo.externalUrl,
      caption: photo.caption,
      displayOrder: photo.displayOrder,
      isCover: photo.isCover,
    }));
    const photos = await PhotoModel.bulkCreate(targetType, targetId, photoData);

    let floorPlans: FloorPlan[] | undefined;
    if (includeFloorPlans) {
      const sourcePlannableType =
        sourceType === PhotoableType.PROJECT
          ? PlannableType.PROJECT
          : sourceType === PhotoableType.APARTMENT
          ? PlannableType.APARTMENT
          : null;

      const targetPlannableType =
        targetType === PhotoableType.PROJECT
          ? PlannableType.PROJECT
          : targetType === PhotoableType.APARTMENT
          ? PlannableType.APARTMENT
          : null;

      if (sourcePlannableType && targetPlannableType) {
        const sourcePlans = await FloorPlanModel.getForEntity(
          sourcePlannableType,
          sourceId
        );
        const planData = sourcePlans.map((plan) => ({
          name: plan.name,
          imageUrl: plan.imageUrl,
          pdfUrl: plan.pdfUrl,
          displayOrder: plan.displayOrder,
        }));
        floorPlans = await FloorPlanModel.bulkCreate(
          targetPlannableType,
          targetId,
          planData
        );
      }
    }

    return { photos, floorPlans };
  }
}

export default MediaService;
