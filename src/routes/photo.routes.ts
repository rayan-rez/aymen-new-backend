/**
 * Photo Routes (Polymorphic)
 * Handles photo management for projects, apartments, and blog posts
 *
 * @module routes/photo.routes
 */

import { Router } from "express";
import photoController from "@/controllers/photo.controller";
import { validate } from "@/middlewares/validation.middleware";
import photoSchemas from "@/validators/photo.validators";
import { apiLimiter } from "@/middlewares/rate-limit.middleware";

const router = Router();

// ============================================================================
// POLYMORPHIC PHOTO ROUTES
// ============================================================================

/**
 * @route   GET /api/:entityType/:id/photos
 * @desc    Get all photos for any entity (projects, apartments, blog-posts)
 * @access  Public
 * @param   {string} entityType - Entity type (projects, apartments, blog-posts)
 * @param   {number} id - Entity ID
 * @query   {boolean} isCover - Filter cover photos only
 * @query   {boolean} hasCaption - Filter photos with captions
 * @example GET /api/projects/123/photos
 * @example GET /api/apartments/456/photos?isCover=true
 */
router.get(
  "/:entityType/:id/photos",
  apiLimiter,
  photoController.getPhotosForEntity
);

/**
 * @route   GET /api/photos/:photoId
 * @desc    Get single photo by ID
 * @access  Public
 * @param   {number} photoId - Photo ID
 */
router.get("/:photoId", apiLimiter, photoController.getPhotoById);

/**
 * @route   GET /api/:entityType/:id/photos/cover
 * @desc    Get cover photo for an entity
 * @access  Public
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 */
router.get(
  "/:entityType/:id/photos/cover",
  apiLimiter,
  photoController.getCoverPhoto
);

/**
 * @route   POST /api/:entityType/:id/photos
 * @desc    Add photos to any entity
 * @access  Private (Admin only)
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 * @body    {array} photos - Array of photo objects
 * @example POST /api/projects/123/photos
 * @body { photos: [{ url: "...", caption: "...", isCover: true }] }
 */
router.post(
  "/:entityType/:id/photos",
  validate(photoSchemas.addPhotos, "body"),
  photoController.addPhotos
);

/**
 * @route   PATCH /api/photos/:photoId
 * @desc    Update a photo
 * @access  Private (Admin only)
 * @param   {number} photoId - Photo ID
 * @body    {object} updates - Photo updates
 */
router.patch(
  "/:photoId",
  validate(photoSchemas.updatePhoto, "body"),
  photoController.updatePhoto
);

/**
 * @route   PATCH /api/photos/:photoId/set-cover
 * @desc    Set photo as cover (unsets others)
 * @access  Private (Admin only)
 * @param   {number} photoId - Photo ID
 */
router.patch("/:photoId/set-cover", photoController.setCoverPhoto);

/**
 * @route   DELETE /api/photos/:photoId
 * @desc    Delete a photo
 * @access  Private (Admin only)
 * @param   {number} photoId - Photo ID
 */
router.delete("/:photoId", photoController.deletePhoto);

/**
 * @route   DELETE /api/:entityType/:id/photos
 * @desc    Delete multiple photos for an entity
 * @access  Private (Admin only)
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 * @body    {array} photoIds - Array of photo IDs (optional - deletes all if not provided)
 */
router.delete(
  "/:entityType/:id/photos",
  validate(photoSchemas.deletePhotos, "body"),
  photoController.deletePhotos
);

/**
 * @route   POST /api/:entityType/:id/photos/reorder
 * @desc    Reorder photos for an entity
 * @access  Private (Admin only)
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 * @body    {array} photoIds - Ordered array of photo IDs
 */
router.post(
  "/:entityType/:id/photos/reorder",
  validate(photoSchemas.reorderPhotos, "body"),
  photoController.reorderPhotos
);

// ============================================================================
// SPECIALIZED ROUTES
// ============================================================================

/**
 * @route   GET /api/:entityType/:id/photos/external
 * @desc    Get photos with external URLs only
 * @access  Public
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 */
router.get(
  "/:entityType/:id/photos/external",
  apiLimiter,
  photoController.getPhotosWithExternalUrls
);

/**
 * @route   GET /api/:entityType/:id/photos/captioned
 * @desc    Get photos with captions
 * @access  Public
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 */
router.get(
  "/:entityType/:id/photos/captioned",
  apiLimiter,
  photoController.getPhotosWithCaptions
);

/**
 * @route   POST /api/photos/duplicate
 * @desc    Duplicate photos from one entity to another
 * @access  Private (Admin only)
 * @body    {string} sourceType - Source entity type
 * @body    {number} sourceId - Source entity ID
 * @body    {string} targetType - Target entity type
 * @body    {number} targetId - Target entity ID
 */
router.post("/duplicate", photoController.duplicatePhotos);

/**
 * @route   GET /api/:entityType/:id/photos/count
 * @desc    Get photo count for an entity
 * @access  Public
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 */
router.get(
  "/:entityType/:id/photos/count",
  apiLimiter,
  photoController.countPhotos
);

/**
 * @route   GET /api/:entityType/:id/photos/has-photos
 * @desc    Check if entity has photos
 * @access  Public
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 */
router.get(
  "/:entityType/:id/photos/has-photos",
  apiLimiter,
  photoController.hasPhotos
);

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * @route   PATCH /api/photos/bulk
 * @desc    Bulk update photos
 * @access  Private (Admin only)
 * @body    {array} updates - Array of { id, data } objects
 */
router.patch("/bulk", photoController.bulkUpdatePhotos);

/**
 * @route   DELETE /api/photos/bulk
 * @desc    Bulk delete photos by IDs
 * @access  Private (Admin only)
 * @body    {array} photoIds - Array of photo IDs
 * @body    {boolean} force - Force delete (optional)
 */
router.delete("/bulk", photoController.bulkDeletePhotos);

// ============================================================================
// ANALYTICS & ADMIN ROUTES
// ============================================================================

/**
 * @route   GET /api/photos/grouped
 * @desc    Get photos grouped by entity type
 * @access  Private (Admin only)
 * @query   {string} entityType - Filter by entity type
 * @query   {string} entityIds - Comma-separated entity IDs
 */
router.get("/grouped", photoController.getPhotosGroupedByType);

/**
 * @route   GET /api/photos/count-by-type
 * @desc    Get photo count by entity type
 * @access  Private (Admin only)
 */
router.get("/count-by-type", photoController.getCountByType);

export default router;