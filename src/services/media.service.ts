/**
 * Media Management Service
 * 
 * High-level service for managing polymorphic media (photos, floor plans)
 * with integrated upload handling, database operations, and file cleanup.
 * 
 * Features:
 * - Polymorphic photo management
 * - Floor plan handling
 * - Automatic file upload and database sync
 * - Transaction-safe operations
 * - Cascade delete with file cleanup
 * - Batch operations
 * - Cover photo management
 * - Media validation for publishing
 * 
 * @module services/media-management.service
 */

import PhotoModel, {
  PhotoableType,
  Photo,
  CreatePhotoDto,
  UpdatePhotoDto,
} from "@models/photo.model";
import FloorPlanModel, {
  PlannableType,
  FloorPlan,
  CreateFloorPlanDto,
  UpdateFloorPlanDto,
} from "@models/floor-plan.model";
import UploadService, {
  FileType,
  ImageProcessingOptions,
  UploadConfig,
  UploadResult,
} from "./upload.service";
import db from "@/config/database";
import { Knex } from "knex";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * File upload input for media creation
 */
export interface MediaUploadInput {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  caption?: string;
  displayOrder?: number;
  isCover?: boolean;
}

/**
 * Floor plan upload input
 */
export interface FloorPlanUploadInput {
  imageBuffer: Buffer;
  imageFilename: string;
  imageMimeType: string;
  pdfBuffer?: Buffer;
  pdfFilename?: string;
  pdfMimeType?: string;
  name: string;
  displayOrder?: number;
}

/**
 * Media creation result
 */
export interface MediaCreationResult {
  photo?: Photo;
  floorPlan?: FloorPlan;
  uploadResult: UploadResult;
  success: boolean;
  error?: string;
}

/**
 * Batch media creation result
 */
export interface BatchMediaResult {
  successful: MediaCreationResult[];
  failed: MediaCreationResult[];
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

/**
 * Media counts by entity
 */
export interface EntityMediaCounts {
  photoCount: number;
  floorPlanCount?: number;
  coverPhotoExists: boolean;
}

/**
 * Media validation requirements
 */
export interface MediaValidationRequirements {
  minPhotos?: number;
  maxPhotos?: number;
  requireCoverPhoto?: boolean;
  minFloorPlans?: number;
  maxFloorPlans?: number;
}

/**
 * Media validation result
 */
export interface MediaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  counts: EntityMediaCounts;
}

// ============================================================================
// MEDIA MANAGEMENT SERVICE CLASS
// ============================================================================

export class MediaManagementService {
  private uploadService: typeof UploadService;

  constructor() {
    this.uploadService = UploadService;
  }

  // ==========================================================================
  // PHOTO MANAGEMENT - CREATE
  // ==========================================================================

  /**
   * Uploads and creates a photo for an entity
   * 
   * Handles the complete flow: file upload → database record creation
   * 
   * @param entityType - Type of entity (project, apartment, etc.)
   * @param entityId - Entity ID
   * @param input - Upload input with file data
   * @param imageOptions - Image processing options
   * @param trx - Optional transaction
   * @returns Promise<MediaCreationResult>
   * 
   * @example
   * // Upload project photo with thumbnail
   * const result = await mediaService.uploadPhoto(
   *   PhotoableType.PROJECT,
   *   projectId,
   *   {
   *     buffer: fileBuffer,
   *     originalFilename: "exterior.jpg",
   *     mimeType: "image/jpeg",
   *     caption: "Main entrance",
   *     isCover: true
   *   },
   *   {
   *     width: 1920,
   *     quality: 85,
   *     generateThumbnail: true
   *   }
   * );
   */
  async uploadPhoto(
    entityType: PhotoableType,
    entityId: number,
    input: MediaUploadInput,
    imageOptions: ImageProcessingOptions = {},
    trx?: Knex.Transaction
  ): Promise<MediaCreationResult> {
    try {
      // Upload file
      const uploadResult = await this.uploadService.upload(
        input.buffer,
        input.originalFilename,
        input.mimeType,
        {},
        {
          ...imageOptions,
          generateThumbnail: true, // Always generate thumbnails
        }
      );

      // Create photo record
      const photoData: CreatePhotoDto = {
        photoableType: entityType,
        photoableId: entityId,
        url: uploadResult.url,
        caption: input.caption,
        displayOrder: input.displayOrder,
        isCover: input.isCover || false,
      };

      const photo = await PhotoModel.create(photoData, trx);

      return {
        photo,
        uploadResult,
        success: true,
      };
    } catch (error) {
      console.error("Failed to upload photo:", error);
      return {
        uploadResult: {} as UploadResult,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Uploads multiple photos for an entity
   * 
   * @param entityType - Type of entity
   * @param entityId - Entity ID
   * @param inputs - Array of upload inputs
   * @param imageOptions - Image processing options
   * @param trx - Optional transaction
   * @returns Promise<BatchMediaResult>
   */
  async uploadMultiplePhotos(
    entityType: PhotoableType,
    entityId: number,
    inputs: MediaUploadInput[],
    imageOptions: ImageProcessingOptions = {},
    trx?: Knex.Transaction
  ): Promise<BatchMediaResult> {
    const successful: MediaCreationResult[] = [];
    const failed: MediaCreationResult[] = [];

    for (const input of inputs) {
      const result = await this.uploadPhoto(
        entityType,
        entityId,
        input,
        imageOptions,
        trx
      );

      if (result.success) {
        successful.push(result);
      } else {
        failed.push(result);
      }
    }

    return {
      successful,
      failed,
      totalProcessed: inputs.length,
      successCount: successful.length,
      failureCount: failed.length,
    };
  }

  // ==========================================================================
  // PHOTO MANAGEMENT - UPDATE
  // ==========================================================================

  /**
   * Updates photo metadata
   */
  async updatePhoto(
    photoId: number,
    updates: UpdatePhotoDto,
    trx?: Knex.Transaction
  ): Promise<Photo | null> {
    return PhotoModel.update(photoId, updates, trx);
  }

  /**
   * Replaces a photo (deletes old file, uploads new one)
   */
  async replacePhoto(
    photoId: number,
    input: MediaUploadInput,
    imageOptions: ImageProcessingOptions = {},
    trx?: Knex.Transaction
  ): Promise<MediaCreationResult> {
    try {
      // Get existing photo
      const existingPhoto = await PhotoModel.findById(photoId, {}, trx);
      if (!existingPhoto) {
        throw new Error("Photo not found");
      }

      // Upload new file
      const uploadResult = await this.uploadService.upload(
        input.buffer,
        input.originalFilename,
        input.mimeType,
        {},
        {
          ...imageOptions,
          generateThumbnail: true,
        }
      );

      // Update photo record
      const updated = await PhotoModel.update(
        photoId,
        {
          url: uploadResult.url,
          caption: input.caption || existingPhoto.caption,
        },
        trx
      );

      // Delete old file
      const oldFilename = this.extractFilenameFromUrl(existingPhoto.url);
      if (oldFilename) {
        await this.uploadService.delete(oldFilename, FileType.IMAGE);
      }

      return {
        photo: updated || undefined,
        uploadResult,
        success: true,
      };
    } catch (error) {
      return {
        uploadResult: {} as UploadResult,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Sets a photo as cover photo
   */
  async setCoverPhoto(
    photoId: number,
    trx?: Knex.Transaction
  ): Promise<Photo | null> {
    return PhotoModel.setCover(photoId, trx);
  }

  // ==========================================================================
  // PHOTO MANAGEMENT - DELETE
  // ==========================================================================

  /**
   * Deletes a photo and its files
   */
  async deletePhoto(
    photoId: number,
    deleteFiles: boolean = true,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    try {
      const photo = await PhotoModel.findById(photoId, {}, trx);
      if (!photo) {
        return false;
      }

      // Delete from database
      const deleted = await PhotoModel.forceDelete(photoId, trx);

      // Delete files if requested
      if (deleted && deleteFiles) {
        const filename = this.extractFilenameFromUrl(photo.url);
        if (filename) {
          await this.uploadService.delete(filename, FileType.IMAGE);
        }
      }

      return deleted;
    } catch (error) {
      console.error(`Failed to delete photo ${photoId}:`, error);
      return false;
    }
  }

  /**
   * Deletes all photos for an entity
   */
  async deleteEntityPhotos(
    entityType: PhotoableType,
    entityId: number,
    deleteFiles: boolean = true,
    trx?: Knex.Transaction
  ): Promise<number> {
    try {
      // Get all photos
      const photos = await PhotoModel.getForEntity(entityType, entityId, {}, trx);

      let deletedCount = 0;

      for (const photo of photos) {
        const deleted = await this.deletePhoto(photo.id, deleteFiles, trx);
        if (deleted) deletedCount++;
      }

      return deletedCount;
    } catch (error) {
      console.error("Failed to delete entity photos:", error);
      return 0;
    }
  }

  // ==========================================================================
  // FLOOR PLAN MANAGEMENT - CREATE
  // ==========================================================================

  /**
   * Uploads and creates a floor plan
   * 
   * Handles both image and optional PDF upload
   */
  async uploadFloorPlan(
    entityType: PlannableType,
    entityId: number,
    input: FloorPlanUploadInput,
    trx?: Knex.Transaction
  ): Promise<MediaCreationResult> {
    try {
      // Upload image
      const imageResult = await this.uploadService.upload(
        input.imageBuffer,
        input.imageFilename,
        input.imageMimeType,
        {},
        {
          width: 2000, // Max width for floor plans
          quality: 90, // High quality for technical drawings
          format: "webp",
        }
      );

      // Upload PDF if provided
      let pdfUrl: string | undefined;
      if (input.pdfBuffer && input.pdfFilename && input.pdfMimeType) {
        const pdfResult = await this.uploadService.upload(
          input.pdfBuffer,
          input.pdfFilename,
          input.pdfMimeType,
          {
            allowedMimeTypes: ["application/pdf"],
          }
        );
        pdfUrl = pdfResult.url;
      }

      // Create floor plan record
      const floorPlanData: CreateFloorPlanDto = {
        plannableType: entityType,
        plannableId: entityId,
        name: input.name,
        imageUrl: imageResult.url,
        pdfUrl: pdfUrl || null,
        displayOrder: input.displayOrder,
      };

      const floorPlan = await FloorPlanModel.create(floorPlanData, trx);

      return {
        floorPlan,
        uploadResult: imageResult,
        success: true,
      };
    } catch (error) {
      console.error("Failed to upload floor plan:", error);
      return {
        uploadResult: {} as UploadResult,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Uploads multiple floor plans
   */
  async uploadMultipleFloorPlans(
    entityType: PlannableType,
    entityId: number,
    inputs: FloorPlanUploadInput[],
    trx?: Knex.Transaction
  ): Promise<BatchMediaResult> {
    const successful: MediaCreationResult[] = [];
    const failed: MediaCreationResult[] = [];

    for (const input of inputs) {
      const result = await this.uploadFloorPlan(entityType, entityId, input, trx);

      if (result.success) {
        successful.push(result);
      } else {
        failed.push(result);
      }
    }

    return {
      successful,
      failed,
      totalProcessed: inputs.length,
      successCount: successful.length,
      failureCount: failed.length,
    };
  }

  // ==========================================================================
  // FLOOR PLAN MANAGEMENT - UPDATE & DELETE
  // ==========================================================================

  /**
   * Updates floor plan metadata
   */
  async updateFloorPlan(
    floorPlanId: number,
    updates: UpdateFloorPlanDto,
    trx?: Knex.Transaction
  ): Promise<FloorPlan | null> {
    return FloorPlanModel.update(floorPlanId, updates, trx);
  }

  /**
   * Deletes a floor plan and its files
   */
  async deleteFloorPlan(
    floorPlanId: number,
    deleteFiles: boolean = true,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    try {
      const floorPlan = await FloorPlanModel.findById(floorPlanId, {}, trx);
      if (!floorPlan) {
        return false;
      }

      // Delete from database
      const deleted = await FloorPlanModel.forceDelete(floorPlanId, trx);

      // Delete files if requested
      if (deleted && deleteFiles) {
        // Delete image
        const imageFilename = this.extractFilenameFromUrl(floorPlan.imageUrl);
        if (imageFilename) {
          await this.uploadService.delete(imageFilename, FileType.IMAGE);
        }

        // Delete PDF if exists
        if (floorPlan.pdfUrl) {
          const pdfFilename = this.extractFilenameFromUrl(floorPlan.pdfUrl);
          if (pdfFilename) {
            await this.uploadService.delete(pdfFilename, FileType.DOCUMENT);
          }
        }
      }

      return deleted;
    } catch (error) {
      console.error(`Failed to delete floor plan ${floorPlanId}:`, error);
      return false;
    }
  }

  /**
   * Deletes all floor plans for an entity
   */
  async deleteEntityFloorPlans(
    entityType: PlannableType,
    entityId: number,
    deleteFiles: boolean = true,
    trx?: Knex.Transaction
  ): Promise<number> {
    try {
      const floorPlans = await FloorPlanModel.getForEntity(
        entityType,
        entityId,
        {},
        trx
      );

      let deletedCount = 0;

      for (const plan of floorPlans) {
        const deleted = await this.deleteFloorPlan(plan.id, deleteFiles, trx);
        if (deleted) deletedCount++;
      }

      return deletedCount;
    } catch (error) {
      console.error("Failed to delete entity floor plans:", error);
      return 0;
    }
  }

  // ==========================================================================
  // COMBINED MEDIA OPERATIONS
  // ==========================================================================

  /**
   * Gets all media for an entity (photos + floor plans)
   */
  async getEntityMedia(
    photoableType: PhotoableType,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<{ photos: Photo[]; floorPlans?: FloorPlan[] }> {
    const photos = await PhotoModel.getForEntity(photoableType, entityId, {}, trx);

    // Get floor plans if applicable
    let floorPlans: FloorPlan[] | undefined;
    const plannableType = this.mapToPlannableType(photoableType);
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
   * Gets media counts for an entity
   */
  async getEntityMediaCounts(
    photoableType: PhotoableType,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<EntityMediaCounts> {
    const [photoCount, coverPhoto] = await Promise.all([
      PhotoModel.countForEntity(photoableType, entityId, trx),
      PhotoModel.getCoverPhoto(photoableType, entityId, trx),
    ]);

    let floorPlanCount: number | undefined;
    const plannableType = this.mapToPlannableType(photoableType);
    if (plannableType) {
      floorPlanCount = await FloorPlanModel.countForEntity(
        plannableType,
        entityId,
        trx
      );
    }

    return {
      photoCount,
      floorPlanCount,
      coverPhotoExists: coverPhoto !== null,
    };
  }

  /**
   * Deletes all media for an entity (cascade)
   */
  async deleteAllEntityMedia(
    photoableType: PhotoableType,
    entityId: number,
    deleteFiles: boolean = true,
    trx?: Knex.Transaction
  ): Promise<{ photosDeleted: number; floorPlansDeleted?: number }> {
    const photosDeleted = await this.deleteEntityPhotos(
      photoableType,
      entityId,
      deleteFiles,
      trx
    );

    let floorPlansDeleted: number | undefined;
    const plannableType = this.mapToPlannableType(photoableType);
    if (plannableType) {
      floorPlansDeleted = await this.deleteEntityFloorPlans(
        plannableType,
        entityId,
        deleteFiles,
        trx
      );
    }

    return { photosDeleted, floorPlansDeleted };
  }

  /**
   * Reorders photos for an entity
   */
  async reorderPhotos(
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
  async reorderFloorPlans(
    entityType: PlannableType,
    entityId: number,
    planIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    return FloorPlanModel.reorder(entityType, entityId, planIds, trx);
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Validates entity media against requirements
   * 
   * Useful for checking if an entity can be published
   */
  async validateEntityMedia(
    photoableType: PhotoableType,
    entityId: number,
    requirements: MediaValidationRequirements,
    trx?: Knex.Transaction
  ): Promise<MediaValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get counts
    const counts = await this.getEntityMediaCounts(photoableType, entityId, trx);

    // Validate photo count
    if (requirements.minPhotos && counts.photoCount < requirements.minPhotos) {
      errors.push(
        `Minimum ${requirements.minPhotos} photo(s) required, found ${counts.photoCount}`
      );
    }

    if (requirements.maxPhotos && counts.photoCount > requirements.maxPhotos) {
      errors.push(
        `Maximum ${requirements.maxPhotos} photo(s) allowed, found ${counts.photoCount}`
      );
    }

    // Validate cover photo
    if (requirements.requireCoverPhoto && !counts.coverPhotoExists) {
      errors.push("Cover photo is required");
    }

    // Validate floor plans if applicable
    if (
      requirements.minFloorPlans &&
      counts.floorPlanCount !== undefined &&
      counts.floorPlanCount < requirements.minFloorPlans
    ) {
      errors.push(
        `Minimum ${requirements.minFloorPlans} floor plan(s) required, found ${counts.floorPlanCount}`
      );
    }

    if (
      requirements.maxFloorPlans &&
      counts.floorPlanCount !== undefined &&
      counts.floorPlanCount > requirements.maxFloorPlans
    ) {
      errors.push(
        `Maximum ${requirements.maxFloorPlans} floor plan(s) allowed, found ${counts.floorPlanCount}`
      );
    }

    // Add warnings
    if (counts.photoCount === 0) {
      warnings.push("No photos uploaded");
    }

    if (counts.floorPlanCount === 0) {
      warnings.push("No floor plans uploaded");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      counts,
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Maps PhotoableType to PlannableType
   */
  private mapToPlannableType(
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
   * Extracts filename from URL
   */
  private extractFilenameFromUrl(url: string): string | null {
    try {
      const parts = url.split("/");
      return parts[parts.length - 1];
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export default new MediaManagementService();