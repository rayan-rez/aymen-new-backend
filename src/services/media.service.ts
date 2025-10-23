/**
 * Media Service
 * Provides utility functions for working with polymorphic media (photos, floor plans)
 * Includes transaction safety, validation, and cascade operations
 *
 * @module services/media.service
 */

import PhotoModel, { PhotoableType, Photo } from "../models/photo.model";
import FloorPlanModel, {
  PlannableType,
  FloorPlan,
} from "../models/floor-plan.model";
import db from "../config/database";

/**
 * Media Service Class
 * Centralizes common media operations across different entity types
 */
export class MediaService {
  /**
   * Type guard for PhotoableType
   */
  static isValidPhotoableType(type: string): type is PhotoableType {
    return Object.values(PhotoableType).includes(type as PhotoableType);
  }

  /**
   * Type guard for PlannableType
   */
  static isValidPlannableType(type: string): type is PlannableType {
    return Object.values(PlannableType).includes(type as PlannableType);
  }

  /**
   * Maps PhotoableType to PlannableType
   */
  private static mapToPlannableType(
    photoableType: PhotoableType
  ): PlannableType | null {
    switch (photoableType) {
      case PhotoableType.PROJECT:
        return PlannableType.PROJECT;
      case PhotoableType.APARTMENT:
        return PlannableType.APARTMENT;
      default:
        return null;
    }
  }

  /**
   * Gets all media with error handling
   */
  static async getProjectMedia(projectId: number) {
    try {
      const [photos, floorPlans] = await Promise.all([
        PhotoModel.getForEntity(PhotoableType.PROJECT, projectId),
        FloorPlanModel.getForEntity(PlannableType.PROJECT, projectId),
      ]);

      return { photos, floorPlans };
    } catch (error) {
      console.error(`Error getting media for project ${projectId}:`, error);
      throw new Error(`Failed to retrieve media for project ${projectId}`);
    }
  }

  /**
   * Gets all media for an apartment
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
   */
  static async getBlogPostPhotos(blogPostId: number): Promise<Photo[]> {
    return PhotoModel.getForEntity(PhotoableType.BLOG_POST, blogPostId);
  }

  /**
   * Gets media for any entity type with validation
   */
  static async getEntityMedia(entityType: string, entityId: number) {
    if (!this.isValidPhotoableType(entityType)) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    const photos = await PhotoModel.getForEntity(entityType, entityId);

    const plannableType = this.mapToPlannableType(entityType);
    let floorPlans: FloorPlan[] | undefined;

    if (plannableType) {
      floorPlans = await FloorPlanModel.getForEntity(plannableType, entityId);
    }

    return { photos, floorPlans };
  }

  /**
   * Adds photos to any entity with validation
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
   * Adds floor plans to any entity with validation
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
   * Deletes all media for an entity with cascade
   */
  static async deleteEntityMedia(
    entityType: PhotoableType,
    entityId: number,
    includeFloorPlans: boolean = false
  ): Promise<{ photosDeleted: boolean; plansDeleted?: boolean }> {
    const trx = await db.transaction();

    try {
      // Delete photos
      const photosDeleted = await PhotoModel.deleteForEntity(
        entityType,
        entityId
      );

      let plansDeleted: boolean | undefined;
      if (includeFloorPlans) {
        const plannableType = this.mapToPlannableType(entityType);

        if (plannableType) {
          plansDeleted = await FloorPlanModel.deleteForEntity(
            plannableType,
            entityId
          );
        }
      }

      await trx.commit();
      return { photosDeleted, plansDeleted };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Deletes an entity with all its media (cascade delete)
   */
  static async deleteEntityWithMedia(
    entityType: PhotoableType,
    entityId: number,
    entityTable: string
  ): Promise<boolean> {
    const trx = await db.transaction();

    try {
      // Delete photos
      await trx("photos")
        .where({ photoable_type: entityType, photoable_id: entityId })
        .del();

      // Delete floor plans if applicable
      const plannableType = this.mapToPlannableType(entityType);
      if (plannableType) {
        await trx("floor_plans")
          .where({ plannable_type: plannableType, plannable_id: entityId })
          .del();
      }

      // Delete main entity
      await trx(entityTable).where({ id: entityId }).del();

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Gets or sets cover photo for an entity
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
   */
  static async reorderMedia(
    entityType: PhotoableType,
    entityId: number,
    photoIds: number[],
    planIds?: number[]
  ): Promise<{ photosReordered: boolean; plansReordered?: boolean }> {
    const trx = await db.transaction();

    try {
      const photosReordered = await PhotoModel.reorder(
        entityType,
        entityId,
        photoIds
      );

      let plansReordered: boolean | undefined;
      if (planIds && planIds.length > 0) {
        const plannableType = this.mapToPlannableType(entityType);

        if (plannableType) {
          plansReordered = await FloorPlanModel.reorder(
            plannableType,
            entityId,
            planIds
          );
        }
      }

      await trx.commit();
      return { photosReordered, plansReordered };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
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
