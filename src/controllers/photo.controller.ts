/**
 * Photo Controller (Polymorphic)
 * Handles all photo-related HTTP requests across multiple entity types
 *
 * Supported entities: projects, apartments, commercial_properties, blog_posts, events
 *
 * @module controllers/photo.controller
 */

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@/utils/response.util";
import PhotoModel, { PhotoableType, Photo } from "@models/photo.model";
import { AppError } from "@/middlewares/error-handler.middleware";
import { Knex } from "knex";
import db from "@/config/database";

/**
 * Photo Controller Class
 */
export class PhotoController {
  // ============================================================================
  // GENERIC CRUD OPERATIONS (Works for all entity types)
  // ============================================================================

  /**
   * Get all photos for a specific entity
   * GET /api/{entity-type}/{id}/photos
   *
   * @example GET /api/projects/123/photos
   * @example GET /api/apartments/456/photos?isCover=true
   */
  async getPhotosForEntity(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;
      const { isCover, hasCaption, hasExternalUrl } = req.query;

      // Validate entity type
      const photoableType = this.validateAndMapEntityType(entityType);

      // Build query options
      const options: any = {
        polymorphicType: photoableType,
        polymorphicId: Number(id),
      };

      if (isCover !== undefined) options.isCover = isCover === "true";
      if (hasCaption !== undefined) options.hasCaption = hasCaption === "true";
      if (hasExternalUrl !== undefined)
        options.hasExternalUrl = hasExternalUrl === "true";

      const photos = await PhotoModel.findPhotos(options);

      ApiResponse.success(res, photos, "Photos retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single photo by ID
   * GET /api/photos/{photoId}
   */
  async getPhotoById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { photoId } = req.params;

      const photo = await PhotoModel.findById(Number(photoId));

      if (!photo) {
        throw new AppError("Photo not found", 404);
      }

      ApiResponse.success(res, photo, "Photo retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cover photo for entity
   * GET /api/{entity-type}/{id}/photos/cover
   *
   * @example GET /api/projects/123/photos/cover
   */
  async getCoverPhoto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;

      const photoableType = this.validateAndMapEntityType(entityType);
      const photo = await PhotoModel.getCoverPhoto(photoableType, Number(id));

      if (!photo) {
        throw new AppError("Cover photo not found", 404);
      }

      ApiResponse.success(res, photo, "Cover photo retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add photos to entity
   * POST /api/{entity-type}/{id}/photos
   *
   * Body: {
   *   photos: [
   *     { url, externalUrl?, caption?, displayOrder?, isCover? }
   *   ]
   * }
   */
  async addPhotos(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;
      const { photos } = req.body;

      if (!photos || !Array.isArray(photos) || photos.length === 0) {
        throw new AppError("Photos array is required", 400);
      }

      const photoableType = this.validateAndMapEntityType(entityType);
      const entityId = Number(id);

      // Validate entity exists
      await this.validateEntityExists(photoableType, entityId);

      // Create photos in transaction
      const trx = await db.transaction();

      try {
        const createdPhotos = await PhotoModel.createManyForEntity(
          photoableType,
          entityId,
          photos,
          trx
        );

        await trx.commit();

        ApiResponse.created(
          res,
          createdPhotos,
          `${createdPhotos.length} photo(s) added successfully`
        );
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update photo
   * PATCH /api/photos/{photoId}
   *
   * Body: { url?, externalUrl?, caption?, displayOrder?, isCover? }
   */
  async updatePhoto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { photoId } = req.params;
      const updateData = req.body;

      if (Object.keys(updateData).length === 0) {
        throw new AppError("No update data provided", 400);
      }

      const photo = await PhotoModel.update(Number(photoId), updateData);

      if (!photo) {
        throw new AppError("Photo not found", 404);
      }

      ApiResponse.success(res, photo, "Photo updated successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set photo as cover
   * PATCH /api/photos/{photoId}/set-cover
   */
  async setCoverPhoto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { photoId } = req.params;

      const photo = await PhotoModel.setCover(Number(photoId));

      if (!photo) {
        throw new AppError("Photo not found", 404);
      }

      ApiResponse.success(res, photo, "Photo set as cover successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete photo
   * DELETE /api/photos/{photoId}
   */
  async deletePhoto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { photoId } = req.params;

      const deleted = await PhotoModel.delete(Number(photoId));

      if (!deleted) {
        throw new AppError("Photo not found", 404);
      }

      ApiResponse.success(res, null, "Photo deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete multiple photos
   * DELETE /api/{entity-type}/{id}/photos
   *
   * Body: { photoIds?: number[] } (if empty, deletes all)
   */
  async deletePhotos(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;
      const { photoIds } = req.body;

      const photoableType = this.validateAndMapEntityType(entityType);
      const entityId = Number(id);

      const trx = await db.transaction();

      try {
        let deletedCount = 0;

        if (photoIds && Array.isArray(photoIds) && photoIds.length > 0) {
          // Delete specific photos
          deletedCount = Number(
            await PhotoModel.bulkDelete(photoIds, {
              force: false,
            })
          );
        } else {
          // Delete all photos for entity
          const deleted = await PhotoModel.deleteForEntity(
            photoableType,
            entityId,
            false,
            trx
          );
          deletedCount = deleted ? 1 : 0;
        }

        await trx.commit();

        ApiResponse.success(
          res,
          { deleted: deletedCount },
          `${deletedCount} photo(s) deleted successfully`
        );
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reorder photos for entity
   * POST /api/{entity-type}/{id}/photos/reorder
   *
   * Body: { photoIds: number[] }
   */
  async reorderPhotos(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;
      const { photoIds } = req.body;

      if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
        throw new AppError("photoIds array is required", 400);
      }

      const photoableType = this.validateAndMapEntityType(entityType);
      const entityId = Number(id);

      await PhotoModel.reorder(photoableType, entityId, photoIds);

      ApiResponse.success(res, null, "Photos reordered successfully");
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // SPECIALIZED OPERATIONS
  // ============================================================================

  /**
   * Get photos with external URLs only
   * GET /api/{entity-type}/{id}/photos/external
   */
  async getPhotosWithExternalUrls(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;

      const photoableType = this.validateAndMapEntityType(entityType);
      const photos = await PhotoModel.getPhotosWithExternalUrls(
        photoableType,
        Number(id)
      );

      ApiResponse.success(
        res,
        photos,
        "Photos with external URLs retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get photos with captions
   * GET /api/{entity-type}/{id}/photos/captioned
   */
  async getPhotosWithCaptions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;

      const photoableType = this.validateAndMapEntityType(entityType);
      const photos = await PhotoModel.getPhotosWithCaptions(
        photoableType,
        Number(id)
      );

      ApiResponse.success(
        res,
        photos,
        "Photos with captions retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Duplicate photos from one entity to another
   * POST /api/photos/duplicate
   *
   * Body: {
   *   sourceType: string,
   *   sourceId: number,
   *   targetType: string,
   *   targetId: number
   * }
   */
  async duplicatePhotos(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { sourceType, sourceId, targetType, targetId } = req.body;

      if (!sourceType || !sourceId || !targetType || !targetId) {
        throw new AppError(
          "sourceType, sourceId, targetType, and targetId are required",
          400
        );
      }

      const sourcePhotoableType = this.validateAndMapEntityType(sourceType);
      const targetPhotoableType = this.validateAndMapEntityType(targetType);

      // Validate both entities exist
      await Promise.all([
        this.validateEntityExists(sourcePhotoableType, Number(sourceId)),
        this.validateEntityExists(targetPhotoableType, Number(targetId)),
      ]);

      const trx = await db.transaction();

      try {
        const duplicatedPhotos = await PhotoModel.duplicatePhotos(
          sourcePhotoableType,
          Number(sourceId),
          targetPhotoableType,
          Number(targetId),
          trx
        );

        await trx.commit();

        ApiResponse.created(
          res,
          duplicatedPhotos,
          `${duplicatedPhotos.length} photo(s) duplicated successfully`
        );
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Count photos for entity
   * GET /api/{entity-type}/{id}/photos/count
   */
  async countPhotos(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;

      const photoableType = this.validateAndMapEntityType(entityType);
      const count = await PhotoModel.countForEntity(photoableType, Number(id));

      ApiResponse.success(res, { count }, "Photo count retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if entity has photos
   * GET /api/{entity-type}/{id}/photos/has-photos
   */
  async hasPhotos(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, id } = req.params;

      const photoableType = this.validateAndMapEntityType(entityType);
      const hasPhotos = await PhotoModel.hasRecordsForEntity(
        photoableType,
        Number(id)
      );

      ApiResponse.success(
        res,
        { hasPhotos },
        hasPhotos ? "Entity has photos" : "Entity has no photos"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get photos grouped by entity type
   * GET /api/photos/grouped
   *
   * Query: { entityType?, entityIds? }
   */
  async getPhotosGroupedByType(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { entityType, entityIds } = req.query;

      const options: any = {};

      if (entityType) {
        const photoableType = this.validateAndMapEntityType(
          entityType as string
        );
        options.polymorphicType = photoableType;
      }

      if (entityIds) {
        const ids = (entityIds as string).split(",").map(Number);
        options.polymorphicId = ids;
      }

      const grouped = await PhotoModel.groupByType(options);

      ApiResponse.success(
        res,
        grouped,
        "Photos grouped by type retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get photo count by entity type
   * GET /api/photos/count-by-type
   */
  async getCountByType(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const counts = await PhotoModel.countByType();

      ApiResponse.success(
        res,
        counts,
        "Photo counts by type retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Bulk update photos
   * PATCH /api/photos/bulk
   *
   * Body: {
   *   updates: [
   *     { id: number, data: UpdatePhotoDto }
   *   ]
   * }
   */
  async bulkUpdatePhotos(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { updates } = req.body;

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        throw new AppError("Updates array is required", 400);
      }

      const trx = await db.transaction();

      try {
        // Remove the empty options object
        const result = await PhotoModel.bulkUpdate(updates, trx);

        await trx.commit();

        ApiResponse.success(
          res,
          result,
          `${result.processed} photo(s) updated successfully`
        );
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk delete photos by IDs
   * DELETE /api/photos/bulk
   *
   * Body: { photoIds: number[], force?: boolean }
   */
  async bulkDeletePhotos(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { photoIds, force = false } = req.body;

      if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
        throw new AppError("photoIds array is required", 400);
      }

      const result = await PhotoModel.bulkDelete(photoIds, { force });

      ApiResponse.success(
        res,
        result,
        `${result.processed} photo(s) deleted successfully`
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // VALIDATION & HELPER METHODS
  // ============================================================================

  /**
   * Validates and maps entity type to PhotoableType
   */
  private validateAndMapEntityType(entityType: string): PhotoableType {
    const typeMap: Record<string, PhotoableType> = {
      projects: PhotoableType.PROJECT,
      project: PhotoableType.PROJECT,
      apartments: PhotoableType.APARTMENT,
      apartment: PhotoableType.APARTMENT,
      "commercial-properties": PhotoableType.COMMERCIAL_PROPERTY,
      "commercial-property": PhotoableType.COMMERCIAL_PROPERTY,
      commercial_properties: PhotoableType.COMMERCIAL_PROPERTY,
      commercial_property: PhotoableType.COMMERCIAL_PROPERTY,
      "blog-posts": PhotoableType.BLOG_POST,
      "blog-post": PhotoableType.BLOG_POST,
      blog_posts: PhotoableType.BLOG_POST,
      blog_post: PhotoableType.BLOG_POST,
      events: PhotoableType.EVENT,
      event: PhotoableType.EVENT,
    };

    const mappedType = typeMap[entityType.toLowerCase()];

    if (!mappedType) {
      throw new AppError(
        `Invalid entity type: ${entityType}. Valid types: projects, apartments, commercial-properties, blog-posts, events`,
        400
      );
    }

    return mappedType;
  }

  /**
   * Validates that entity exists
   */
  private async validateEntityExists(
    entityType: PhotoableType,
    entityId: number
  ): Promise<void> {
    const tableMap: Record<PhotoableType, string> = {
      [PhotoableType.PROJECT]: "projects",
      [PhotoableType.APARTMENT]: "apartments",
      [PhotoableType.COMMERCIAL_PROPERTY]: "commercial_properties",
      [PhotoableType.BLOG_POST]: "blog_posts",
      [PhotoableType.EVENT]: "events",
    };

    const tableName = tableMap[entityType];

    const exists = await db(tableName)
      .where({ id: entityId })
      .whereNull("deleted_at")
      .first();

    if (!exists) {
      throw new AppError(`${entityType} with ID ${entityId} not found`, 404);
    }
  }
}

// Export singleton instance
export default new PhotoController();
