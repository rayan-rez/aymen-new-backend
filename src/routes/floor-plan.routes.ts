/**
 * Floor Plan Routes (Polymorphic)
 * Handles floor plan management for projects and apartments
 *
 * @module routes/floor-plan.routes
 */

import { Router } from "express";
import floorPlanController from "@/controllers/floor-plan.controller";
import { validate } from "@/middlewares/validation.middleware";
import floorPlanSchemas from "@/validators/floor-plan.validator";
import { apiLimiter } from "@/middlewares/rate-limit.middleware";

const router = Router();

// ============================================================================
// POLYMORPHIC FLOOR PLAN ROUTES
// ============================================================================

/**
 * @route   GET /api/:entityType/:id/floor-plans
 * @desc    Get all floor plans for any entity (projects, apartments)
 * @access  Public
 * @param   {string} entityType - Entity type (projects, apartments)
 * @param   {number} id - Entity ID
 * @query   {boolean} hasPdf - Filter plans with PDF only
 * @query   {string} searchName - Search by name
 * @example GET /api/projects/123/floor-plans
 * @example GET /api/apartments/456/floor-plans?hasPdf=true
 */
router.get(
  "/:entityType/:id/floor-plans",
  apiLimiter,
  floorPlanController.getFloorPlansForEntity
);

/**
 * @route   GET /api/floor-plans/:floorPlanId
 * @desc    Get single floor plan by ID
 * @access  Public
 * @param   {number} floorPlanId - Floor plan ID
 */
router.get("/:floorPlanId", apiLimiter, floorPlanController.getFloorPlanById);

/**
 * @route   GET /api/:entityType/:id/floor-plans/by-name/:name
 * @desc    Get floor plan by name within an entity
 * @access  Public
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 * @param   {string} name - Floor plan name
 */
router.get(
  "/:entityType/:id/floor-plans/by-name/:name",
  apiLimiter,
  floorPlanController.getFloorPlanByName
);

/**
 * @route   POST /api/:entityType/:id/floor-plans
 * @desc    Add floor plans to any entity
 * @access  Private (Admin only)
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 * @body    {array} floorPlans - Array of floor plan objects
 * @example POST /api/projects/123/floor-plans
 * @body { floorPlans: [{ name: "Ground Floor", imageUrl: "...", pdfUrl: "..." }] }
 */
router.post(
  "/:entityType/:id/floor-plans",
  validate(floorPlanSchemas.addFloorPlans, "body"),
  floorPlanController.addFloorPlans
);

/**
 * @route   PATCH /api/floor-plans/:floorPlanId
 * @desc    Update a floor plan
 * @access  Private (Admin only)
 * @param   {number} floorPlanId - Floor plan ID
 * @body    {object} updates - Floor plan updates
 */
router.patch(
  "/:floorPlanId",
  validate(floorPlanSchemas.updateFloorPlan, "body"),
  floorPlanController.updateFloorPlan
);

/**
 * @route   PATCH /api/floor-plans/:floorPlanId/files
 * @desc    Update floor plan files (image and/or PDF)
 * @access  Private (Admin only)
 * @param   {number} floorPlanId - Floor plan ID
 * @body    {string} imageUrl - Image URL (optional)
 * @body    {string} pdfUrl - PDF URL (optional)
 */
router.patch(
  "/:floorPlanId/files",
  validate(floorPlanSchemas.updateFiles, "body"),
  floorPlanController.updateFloorPlanFiles
);

/**
 * @route   DELETE /api/floor-plans/:floorPlanId/pdf
 * @desc    Remove PDF from floor plan
 * @access  Private (Admin only)
 * @param   {number} floorPlanId - Floor plan ID
 */
router.delete("/:floorPlanId/pdf", floorPlanController.removePdf);

/**
 * @route   DELETE /api/floor-plans/:floorPlanId
 * @desc    Delete a floor plan
 * @access  Private (Admin only)
 * @param   {number} floorPlanId - Floor plan ID
 */
router.delete("/:floorPlanId", floorPlanController.deleteFloorPlan);

/**
 * @route   DELETE /api/:entityType/:id/floor-plans
 * @desc    Delete multiple floor plans for an entity
 * @access  Private (Admin only)
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 * @body    {array} floorPlanIds - Array of floor plan IDs (optional - deletes all if not provided)
 */
router.delete(
  "/:entityType/:id/floor-plans",
  validate(floorPlanSchemas.deleteFloorPlans, "body"),
  floorPlanController.deleteFloorPlans
);

/**
 * @route   POST /api/:entityType/:id/floor-plans/reorder
 * @desc    Reorder floor plans for an entity
 * @access  Private (Admin only)
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 * @body    {array} floorPlanIds - Ordered array of floor plan IDs
 */
router.post(
  "/:entityType/:id/floor-plans/reorder",
  validate(floorPlanSchemas.reorderFloorPlans, "body"),
  floorPlanController.reorderFloorPlans
);

// ============================================================================
// SPECIALIZED ROUTES
// ============================================================================

/**
 * @route   GET /api/:entityType/:id/floor-plans/with-pdf
 * @desc    Get floor plans with PDF only
 * @access  Public
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 */
router.get(
  "/:entityType/:id/floor-plans/with-pdf",
  apiLimiter,
  floorPlanController.getFloorPlansWithPdf
);

/**
 * @route   GET /api/:entityType/:id/floor-plans/search
 * @desc    Search floor plans by name
 * @access  Public
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 * @query   {string} name - Search term
 */
router.get(
  "/:entityType/:id/floor-plans/search",
  apiLimiter,
  validate(floorPlanSchemas.searchQuery, "query"),
  floorPlanController.searchFloorPlansByName
);

/**
 * @route   POST /api/floor-plans/duplicate
 * @desc    Duplicate floor plans from one entity to another
 * @access  Private (Admin only)
 * @body    {string} sourceType - Source entity type
 * @body    {number} sourceId - Source entity ID
 * @body    {string} targetType - Target entity type
 * @body    {number} targetId - Target entity ID
 */
router.post("/duplicate", floorPlanController.duplicateFloorPlans);

/**
 * @route   GET /api/:entityType/:id/floor-plans/statistics
 * @desc    Get floor plan statistics for an entity
 * @access  Public
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 */
router.get(
  "/:entityType/:id/floor-plans/statistics",
  apiLimiter,
  floorPlanController.getStatistics
);

/**
 * @route   GET /api/:entityType/:id/floor-plans/count
 * @desc    Get floor plan count for an entity
 * @access  Public
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 */
router.get(
  "/:entityType/:id/floor-plans/count",
  apiLimiter,
  floorPlanController.countFloorPlans
);

/**
 * @route   GET /api/:entityType/:id/floor-plans/has-floor-plans
 * @desc    Check if entity has floor plans
 * @access  Public
 * @param   {string} entityType - Entity type
 * @param   {number} id - Entity ID
 */
router.get(
  "/:entityType/:id/floor-plans/has-floor-plans",
  apiLimiter,
  floorPlanController.hasFloorPlans
);

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * @route   PATCH /api/floor-plans/bulk
 * @desc    Bulk update floor plans
 * @access  Private (Admin only)
 * @body    {array} updates - Array of { id, data } objects
 */
router.patch("/bulk", floorPlanController.bulkUpdateFloorPlans);

/**
 * @route   DELETE /api/floor-plans/bulk
 * @desc    Bulk delete floor plans by IDs
 * @access  Private (Admin only)
 * @body    {array} floorPlanIds - Array of floor plan IDs
 * @body    {boolean} force - Force delete (optional)
 */
router.delete("/bulk", floorPlanController.bulkDeleteFloorPlans);

// ============================================================================
// ANALYTICS & ADMIN ROUTES
// ============================================================================

/**
 * @route   GET /api/floor-plans
 * @desc    Get all floor plans across entities (admin dashboard)
 * @access  Private (Admin only)
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 * @query   {boolean} hasPdf - Filter by PDF presence
 * @query   {string} entityType - Filter by entity type
 */
router.get("/", apiLimiter, floorPlanController.getAllFloorPlans);

/**
 * @route   GET /api/floor-plans/grouped
 * @desc    Get floor plans grouped by entity type
 * @access  Private (Admin only)
 * @query   {string} entityType - Filter by entity type
 * @query   {string} entityIds - Comma-separated entity IDs
 */
router.get("/grouped", floorPlanController.getFloorPlansGroupedByType);

/**
 * @route   GET /api/floor-plans/count-by-type
 * @desc    Get floor plan count by entity type
 * @access  Private (Admin only)
 */
router.get("/count-by-type", floorPlanController.getCountByType);

/**
 * @route   POST /api/floor-plans/batch-download
 * @desc    Prepare batch download of floor plan PDFs
 * @access  Private (Admin only)
 * @body    {array} floorPlanIds - Array of floor plan IDs
 */
router.post("/batch-download", floorPlanController.batchDownload);

export default router;
