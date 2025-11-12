/**
 * Services Index
 * Central export point for all application services
 * 
 * @module services
 */

// ============================================================================
// FILE UPLOAD & MEDIA SERVICES
// ============================================================================

// Enhanced Upload Service - Low-level file upload handling
export { default as UploadService } from "./upload.service";
export * from "./upload.service";

// Media Management Service - High-level media operations with database sync
export { default as MediaService } from "./media.service";
export * from "./media.service";

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * @example Basic Image Upload
 * 
 * ```typescript
 * import { UploadService } from '@/services';
 * 
 * // Upload and process an image
 * const result = await UploadService.upload(
 *   fileBuffer,
 *   "photo.jpg",
 *   "image/jpeg",
 *   { maxFileSize: 5 * 1024 * 1024 },
 *   {
 *     width: 1920,
 *     height: 1080,
 *     quality: 85,
 *     generateThumbnail: true
 *   }
 * );
 * 
 * console.log(result.url); // URL to access the image
 * console.log(result.thumbnail?.url); // Thumbnail URL
 * ```
 */

/**
 * @example Upload Project Photo with Database Sync
 * 
 * ```typescript
 * import { MediaManagementService } from '@/services';
 * import { PhotoableType } from '@/models';
 * 
 * // Upload photo and create database record
 * const result = await MediaManagementService.uploadPhoto(
 *   PhotoableType.PROJECT,
 *   projectId,
 *   {
 *     buffer: fileBuffer,
 *     originalFilename: "exterior.jpg",
 *     mimeType: "image/jpeg",
 *     caption: "Main entrance view",
 *     isCover: true
 *   },
 *   {
 *     width: 1920,
 *     quality: 85,
 *     generateThumbnail: true
 *   }
 * );
 * 
 * if (result.success) {
 *   console.log("Photo created:", result.photo);
 *   console.log("File URL:", result.uploadResult.url);
 * }
 * ```
 */

/**
 * @example Upload Multiple Photos in Transaction
 * 
 * ```typescript
 * import db from '@/config/database';
 * import { MediaManagementService } from '@/services';
 * import { PhotoableType } from '@/models';
 * 
 * const trx = await db.transaction();
 * 
 * try {
 *   const photoInputs = files.map(file => ({
 *     buffer: file.buffer,
 *     originalFilename: file.originalname,
 *     mimeType: file.mimetype,
 *     caption: file.caption
 *   }));
 * 
 *   const result = await MediaManagementService.uploadMultiplePhotos(
 *     PhotoableType.PROJECT,
 *     projectId,
 *     photoInputs,
 *     { width: 1920, quality: 85 },
 *     trx
 *   );
 * 
 *   await trx.commit();
 *   console.log(`Uploaded ${result.successCount} photos`);
 * } catch (error) {
 *   await trx.rollback();
 *   throw error;
 * }
 * ```
 */

/**
 * @example Upload Floor Plan with PDF
 * 
 * ```typescript
 * import { MediaManagementService } from '@/services';
 * import { PlannableType } from '@/models';
 * 
 * const result = await MediaManagementService.uploadFloorPlan(
 *   PlannableType.APARTMENT,
 *   apartmentId,
 *   {
 *     imageBuffer: imageFile.buffer,
 *     imageFilename: "floorplan.jpg",
 *     imageMimeType: "image/jpeg",
 *     pdfBuffer: pdfFile.buffer,
 *     pdfFilename: "floorplan.pdf",
 *     pdfMimeType: "application/pdf",
 *     name: "2-Bedroom Layout",
 *     displayOrder: 0
 *   }
 * );
 * ```
 */

/**
 * @example Validate Media Before Publishing
 * 
 * ```typescript
 * import { MediaManagementService } from '@/services';
 * import { PhotoableType } from '@/models';
 * 
 * const validation = await MediaManagementService.validateEntityMedia(
 *   PhotoableType.PROJECT,
 *   projectId,
 *   {
 *     minPhotos: 3,
 *     requireCoverPhoto: true,
 *     minFloorPlans: 1
 *   }
 * );
 * 
 * if (!validation.valid) {
 *   console.error("Cannot publish:", validation.errors);
 *   return;
 * }
 * 
 * // Proceed with publishing
 * await ProjectModel.publish(projectId);
 * ```
 */

/**
 * @example Delete Entity with All Media
 * 
 * ```typescript
 * import { MediaManagementService } from '@/services';
 * import { PhotoableType } from '@/models';
 * import db from '@/config/database';
 * 
 * const trx = await db.transaction();
 * 
 * try {
 *   // Delete all media (photos + floor plans)
 *   const result = await MediaManagementService.deleteAllEntityMedia(
 *     PhotoableType.PROJECT,
 *     projectId,
 *     true, // Delete files from disk
 *     trx
 *   );
 * 
 *   // Delete the entity itself
 *   await ProjectModel.forceDelete(projectId, trx);
 * 
 *   await trx.commit();
 *   console.log(`Deleted ${result.photosDeleted} photos and ${result.floorPlansDeleted} floor plans`);
 * } catch (error) {
 *   await trx.rollback();
 *   throw error;
 * }
 * ```
 */

/**
 * @example Upload Document (PDF, Word, Excel)
 * 
 * ```typescript
 * import { UploadService, FileType } from '@/services';
 * 
 * // Upload a PDF document
 * const result = await UploadService.upload(
 *   pdfBuffer,
 *   "contract.pdf",
 *   "application/pdf",
 *   {
 *     allowedMimeTypes: ["application/pdf"],
 *     maxFileSize: 10 * 1024 * 1024
 *   }
 * );
 * 
 * console.log("Document URL:", result.url);
 * console.log("File size:", result.size);
 * ```
 */

/**
 * @example Replace Existing Photo
 * 
 * ```typescript
 * import { MediaManagementService } from '@/services';
 * 
 * // Replace photo (deletes old file, uploads new one)
 * const result = await MediaManagementService.replacePhoto(
 *   photoId,
 *   {
 *     buffer: newFileBuffer,
 *     originalFilename: "updated.jpg",
 *     mimeType: "image/jpeg",
 *     caption: "Updated photo"
 *   },
 *   {
 *     width: 1920,
 *     quality: 90
 *   }
 * );
 * ```
 */

/**
 * @example Set Cover Photo
 * 
 * ```typescript
 * import { MediaManagementService } from '@/services';
 * 
 * // Set a photo as cover (unsets other cover photos automatically)
 * const coverPhoto = await MediaManagementService.setCoverPhoto(photoId);
 * console.log("Cover photo set:", coverPhoto);
 * ```
 */

/**
 * @example Reorder Photos
 * 
 * ```typescript
 * import { MediaManagementService } from '@/services';
 * import { PhotoableType } from '@/models';
 * 
 * // Reorder photos by ID array
 * const photoIds = [45, 23, 67, 12, 89]; // Desired order
 * 
 * await MediaManagementService.reorderPhotos(
 *   PhotoableType.PROJECT,
 *   projectId,
 *   photoIds
 * );
 * ```
 */

/**
 * @example Get Entity Media Counts
 * 
 * ```typescript
 * import { MediaManagementService } from '@/services';
 * import { PhotoableType } from '@/models';
 * 
 * const counts = await MediaManagementService.getEntityMediaCounts(
 *   PhotoableType.PROJECT,
 *   projectId
 * );
 * 
 * console.log(`Photos: ${counts.photoCount}`);
 * console.log(`Floor Plans: ${counts.floorPlanCount}`);
 * console.log(`Has Cover: ${counts.coverPhotoExists}`);
 * ```
 */

/**
 * @example Cleanup Old Temporary Files
 * 
 * ```typescript
 * import { UploadService } from '@/services';
 * 
 * // Delete temporary files older than 24 hours
 * const deletedCount = await UploadService.cleanupTempFiles(24);
 * console.log(`Cleaned up ${deletedCount} temporary files`);
 * ```
 */

/**
 * @example Check File Existence
 * 
 * ```typescript
 * import { UploadService, FileType } from '@/services';
 * 
 * const exists = await UploadService.exists(
 *   "1699876543210_photo.webp",
 *   FileType.IMAGE
 * );
 * 
 * if (!exists) {
 *   console.log("File not found on disk");
 * }
 * ```
 */