/**
 * Media Service
 * Provides utility functions for working with polymorphic media (photos, floor plans)
 * Includes transaction safety, validation, and cascade operations
 *
 * @module services/media.service
 */

import PhotoModel, {
  PhotoableType,
  Photo,
  CreatePhotoDto,
} from "@models/photo.model";
import FloorPlanModel, {
  PlannableType,
  FloorPlan,
  CreateFloorPlanDto,
} from "@models/floor-plan.model";
import db from "@/config/database";
import { Knex } from "knex";

/**
 * Media counts interface
 */
export interface MediaCounts {
  photoCount: number;
  floorPlanCount?: number;
}

/**
 * Entity media interface
 */
export interface EntityMedia {
  photos: Photo[];
  floorPlans?: FloorPlan[];
}

/**
 * Media Service Class
 * Centralizes common media operations across different entity types
 */
export class MediaService {
  // ============================================================================
  // TYPE GUARDS & VALIDATION
  // ============================================================================

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
        return null; // Commercial properties, blog posts, events don't have floor plans
    }
  }

  // ============================================================================
  // RETRIEVE MEDIA
  // ============================================================================

  /**
   * Gets all media for a project
   */
  static async getProjectMedia(
    projectId: number,
    trx?: Knex.Transaction
  ): Promise<EntityMedia> {
    try {
      const [photos, floorPlans] = await Promise.all([
        PhotoModel.getForEntity(PhotoableType.PROJECT, projectId, {}, trx),
        FloorPlanModel.getForEntity(PlannableType.PROJECT, projectId, {}, trx),
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
  static async getApartmentMedia(
    apartmentId: number,
    trx?: Knex.Transaction
  ): Promise<EntityMedia> {
    try {
      const [photos, floorPlans] = await Promise.all([
        PhotoModel.getForEntity(PhotoableType.APARTMENT, apartmentId, {}, trx),
        FloorPlanModel.getForEntity(
          PlannableType.APARTMENT,
          apartmentId,
          {},
          trx
        ),
      ]);

      return { photos, floorPlans };
    } catch (error) {
      console.error(`Error getting media for apartment ${apartmentId}:`, error);
      throw new Error(`Failed to retrieve media for apartment ${apartmentId}`);
    }
  }

  /**
   * Gets all photos for a commercial property
   */
  static async getCommercialPropertyPhotos(
    propertyId: number,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    return PhotoModel.getForEntity(
      PhotoableType.COMMERCIAL_PROPERTY,
      propertyId,
      {},
      trx
    );
  }

  /**
   * Gets all photos for a blog post
   */
  static async getBlogPostPhotos(
    blogPostId: number,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    return PhotoModel.getForEntity(
      PhotoableType.BLOG_POST,
      blogPostId,
      {},
      trx
    );
  }

  /**
   * Gets all photos for an event
   */
  static async getEventPhotos(
    eventId: number,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    return PhotoModel.getForEntity(PhotoableType.EVENT, eventId, {}, trx);
  }

  /**
   * Gets media for any entity type with validation
   */
  static async getEntityMedia(
    entityType: string,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<EntityMedia> {
    if (!this.isValidPhotoableType(entityType)) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    const photos = await PhotoModel.getForEntity(entityType, entityId, {}, trx);

    const plannableType = this.mapToPlannableType(entityType);
    let floorPlans: FloorPlan[] | undefined;

    if (plannableType) {
      floorPlans = await FloorPlanModel.getForEntity(
        plannableType,
        entityId,
        {},
        trx
      );
    }

    return { photos, floorPlans };
  }

  /**
   * Gets cover photo for an entity
   */
  static async getCoverPhoto(
    entityType: PhotoableType,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<Photo | null> {
    return PhotoModel.getCoverPhoto(entityType, entityId, trx);
  }

  // ============================================================================
  // ADD MEDIA
  // ============================================================================

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
    }>,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    return PhotoModel.bulkCreate(entityType, entityId, photoData, trx);
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
    }>,
    trx?: Knex.Transaction
  ): Promise<FloorPlan[]> {
    return FloorPlanModel.bulkCreate(entityType, entityId, planData, trx);
  }

  /**
   * Adds a single photo
   */
  static async addPhoto(
    entityType: PhotoableType,
    entityId: number,
    photoData: {
      url: string;
      externalUrl?: string | null;
      caption?: string | null;
      displayOrder?: number;
      isCover?: boolean;
    },
    trx?: Knex.Transaction
  ): Promise<Photo> {
    const createData: CreatePhotoDto = {
      photoableType: entityType,
      photoableId: entityId,
      ...photoData,
    };

    return PhotoModel.create(createData, trx);
  }

  /**
   * Adds a single floor plan
   */
  static async addFloorPlan(
    entityType: PlannableType,
    entityId: number,
    planData: {
      name: string;
      imageUrl: string;
      pdfUrl?: string | null;
      displayOrder?: number;
    },
    trx?: Knex.Transaction
  ): Promise<FloorPlan> {
    const createData: CreateFloorPlanDto = {
      plannableType: entityType,
      plannableId: entityId,
      ...planData,
    };

    return FloorPlanModel.create(createData, trx);
  }

  // ============================================================================
  // UPDATE MEDIA
  // ============================================================================

  /**
   * Updates a photo
   */
  static async updatePhoto(
    photoId: number,
    data: {
      url?: string;
      externalUrl?: string | null;
      caption?: string | null;
      displayOrder?: number;
      isCover?: boolean;
    },
    trx?: Knex.Transaction
  ): Promise<Photo | null> {
    return PhotoModel.update(photoId, data, trx);
  }

  /**
   * Updates a floor plan
   */
  static async updateFloorPlan(
    floorPlanId: number,
    data: {
      name?: string;
      imageUrl?: string;
      pdfUrl?: string | null;
      displayOrder?: number;
    },
    trx?: Knex.Transaction
  ): Promise<FloorPlan | null> {
    return FloorPlanModel.update(floorPlanId, data, trx);
  }

  /**
   * Sets a photo as cover
   */
  static async setCoverPhoto(
    photoId: number,
    trx?: Knex.Transaction
  ): Promise<Photo | null> {
    return PhotoModel.setCover(photoId, trx);
  }

  // ============================================================================
  // DELETE MEDIA
  // ============================================================================

  /**
   * Deletes a single photo
   */
  static async deletePhoto(
    photoId: number,
    force: boolean = false,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    if (force) {
      return PhotoModel.forceDelete(photoId, trx);
    }
    return PhotoModel.delete(photoId, trx);
  }

  /**
   * Deletes a single floor plan
   */
  static async deleteFloorPlan(
    floorPlanId: number,
    force: boolean = false,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    if (force) {
      return FloorPlanModel.forceDelete(floorPlanId, trx);
    }
    return FloorPlanModel.delete(floorPlanId, trx);
  }

  /**
   * Deletes all media for an entity with cascade
   */
  static async deleteEntityMedia(
    entityType: PhotoableType,
    entityId: number,
    includeFloorPlans: boolean = false,
    force: boolean = false,
    trx?: Knex.Transaction
  ): Promise<{ photosDeleted: boolean; plansDeleted?: boolean }> {
    const useTrx = trx || (await db.transaction());

    try {
      // Delete photos
      const photosDeleted = await PhotoModel.deleteForEntity(
        entityType,
        entityId,
        force,
        useTrx
      );

      let plansDeleted: boolean | undefined;
      if (includeFloorPlans) {
        const plannableType = this.mapToPlannableType(entityType);

        if (plannableType) {
          plansDeleted = await FloorPlanModel.deleteForEntity(
            plannableType,
            entityId,
            force,
            useTrx
          );
        }
      }

      if (!trx) {
        await useTrx.commit();
      }

      return { photosDeleted, plansDeleted };
    } catch (error) {
      if (!trx) {
        await useTrx.rollback();
      }
      throw error;
    }
  }

  /**
   * Deletes an entity with all its media (cascade delete)
   */
  static async deleteEntityWithMedia(
    entityType: PhotoableType,
    entityId: number,
    entityTable: string,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const useTrx = trx || (await db.transaction());

    try {
      // Delete photos
      await PhotoModel.deleteForEntity(entityType, entityId, true, useTrx);

      // Delete floor plans if applicable
      const plannableType = this.mapToPlannableType(entityType);
      if (plannableType) {
        await FloorPlanModel.deleteForEntity(
          plannableType,
          entityId,
          true,
          useTrx
        );
      }

      // Delete main entity
      await useTrx(entityTable).where({ id: entityId }).del();

      if (!trx) {
        await useTrx.commit();
      }

      return true;
    } catch (error) {
      if (!trx) {
        await useTrx.rollback();
      }
      throw error;
    }
  }

  // ============================================================================
  // REORDER MEDIA
  // ============================================================================

  /**
   * Reorders photos for an entity
   */
  static async reorderPhotos(
    entityType: PhotoableType,
    entityId: number,
    photoIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    return PhotoModel.reorder(entityType, entityId, photoIds, trx);
  }

  /**
   * Reorders floor plans for an entity
   */
  static async reorderFloorPlans(
    entityType: PlannableType,
    entityId: number,
    planIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    return FloorPlanModel.reorder(entityType, entityId, planIds, trx);
  }

  /**
   * Reorders all media for an entity
   */
  static async reorderMedia(
    entityType: PhotoableType,
    entityId: number,
    photoIds: number[],
    planIds?: number[],
    trx?: Knex.Transaction
  ): Promise<{ photosReordered: boolean; plansReordered?: boolean }> {
    const useTrx = trx || (await db.transaction());

    try {
      const photosReordered = await PhotoModel.reorder(
        entityType,
        entityId,
        photoIds,
        useTrx
      );

      let plansReordered: boolean | undefined;
      if (planIds && planIds.length > 0) {
        const plannableType = this.mapToPlannableType(entityType);

        if (plannableType) {
          plansReordered = await FloorPlanModel.reorder(
            plannableType,
            entityId,
            planIds,
            useTrx
          );
        }
      }

      if (!trx) {
        await useTrx.commit();
      }

      return { photosReordered, plansReordered };
    } catch (error) {
      if (!trx) {
        await useTrx.rollback();
      }
      throw error;
    }
  }

  // ============================================================================
  // STATISTICS & COUNTS
  // ============================================================================

  /**
   * Gets media counts for an entity
   */
  static async getMediaCounts(
    entityType: PhotoableType,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<MediaCounts> {
    const photoCount = await PhotoModel.countForEntity(
      entityType,
      entityId,
      trx
    );

    let floorPlanCount: number | undefined;
    const plannableType = this.mapToPlannableType(entityType);

    if (plannableType) {
      floorPlanCount = await FloorPlanModel.countForEntity(
        plannableType,
        entityId,
        trx
      );
    }

    return { photoCount, floorPlanCount };
  }

  /**
   * Gets floor plan statistics
   */
  static async getFloorPlanStatistics(
    entityType: PlannableType,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<{
    total: number;
    withPdf: number;
    withoutPdf: number;
  }> {
    return FloorPlanModel.getStatistics(entityType, entityId, trx);
  }

  // ============================================================================
  // COPY/DUPLICATE MEDIA
  // ============================================================================

  /**
   * Copies media from one entity to another
   */
  static async copyMedia(
    sourceType: PhotoableType,
    sourceId: number,
    targetType: PhotoableType,
    targetId: number,
    includeFloorPlans: boolean = false,
    trx?: Knex.Transaction
  ): Promise<{ photos: Photo[]; floorPlans?: FloorPlan[] }> {
    const useTrx = trx || (await db.transaction());

    try {
      // Copy photos
      const photos = await PhotoModel.duplicatePhotos(
        sourceType,
        sourceId,
        targetType,
        targetId,
        useTrx
      );

      let floorPlans: FloorPlan[] | undefined;
      if (includeFloorPlans) {
        const sourcePlannableType = this.mapToPlannableType(sourceType);
        const targetPlannableType = this.mapToPlannableType(targetType);

        if (sourcePlannableType && targetPlannableType) {
          floorPlans = await FloorPlanModel.duplicateFloorPlans(
            sourcePlannableType,
            sourceId,
            targetPlannableType,
            targetId,
            useTrx
          );
        }
      }

      if (!trx) {
        await useTrx.commit();
      }

      return { photos, floorPlans };
    } catch (error) {
      if (!trx) {
        await useTrx.rollback();
      }
      throw error;
    }
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  /**
   * Validates that an entity has required media before publishing
   */
  static async validateRequiredMedia(
    entityType: PhotoableType,
    entityId: number,
    requirements: {
      minPhotos?: number;
      requireCoverPhoto?: boolean;
      minFloorPlans?: number;
    },
    trx?: Knex.Transaction
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check photo count
    if (requirements.minPhotos) {
      const photoCount = await PhotoModel.countForEntity(
        entityType,
        entityId,
        trx
      );

      if (photoCount < requirements.minPhotos) {
        errors.push(
          `Requires at least ${requirements.minPhotos} photo(s), found ${photoCount}`
        );
      }
    }

    // Check cover photo
    if (requirements.requireCoverPhoto) {
      const coverPhoto = await PhotoModel.getCoverPhoto(
        entityType,
        entityId,
        trx
      );

      if (!coverPhoto) {
        errors.push("Cover photo is required");
      }
    }

    // Check floor plans
    if (requirements.minFloorPlans) {
      const plannableType = this.mapToPlannableType(entityType);

      if (plannableType) {
        const planCount = await FloorPlanModel.countForEntity(
          plannableType,
          entityId,
          trx
        );

        if (planCount < requirements.minFloorPlans) {
          errors.push(
            `Requires at least ${requirements.minFloorPlans} floor plan(s), found ${planCount}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default MediaService;
