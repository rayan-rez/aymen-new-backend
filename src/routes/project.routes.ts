/**
 * Project Routes
 * Handles all project-related endpoints including media management
 *
 * @module routes/project.routes
 */

import { Router } from "express";
import projectController from "@/controllers/project.controller";
import {
  validate,
  validateMultiple,
} from "@/middlewares/validation.middleware";
import projectSchemas from "@/validators/project.validator";
import photoSchemas from "@/validators/photo.validators";
import floorPlanSchemas from "@/validators/floor-plan.validator";
import { apiLimiter } from "@/middlewares/rate-limit.middleware";

const router = Router();

// ============================================================================
// CORE PROJECT ROUTES
// ============================================================================

/**
 * @route   GET /api/projects
 * @desc    Get all projects with filtering and pagination
 * @access  Public
 * @query   {number} page - Page number (default: 1)
 * @query   {number} limit - Items per page (default: 10)
 * @query   {string} projectType - Filter by type (residential, commercial, etc.)
 * @query   {string} status - Filter by status (planning, completed, etc.)
 * @query   {number} locationId - Filter by location
 * @query   {boolean} isFeatured - Filter featured projects
 * @query   {boolean} isPublished - Filter published projects
 * @query   {number} minPrice - Minimum price filter
 * @query   {number} maxPrice - Maximum price filter
 * @query   {string} search - Search by name/description
 * @query   {boolean} includePhotos - Load photos with projects
 * @query   {boolean} includeFloorPlans - Load floor plans with projects
 */
router.get(
  "/",
  apiLimiter,
  validate(projectSchemas.filters, "query"),
  projectController.getProjects
);

/**
 * @route   GET /api/projects/search
 * @desc    Full-text search for projects
 * @access  Public
 * @query   {string} q - Search query (min 2 characters)
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 */
router.get(
  "/search",
  apiLimiter,
  validate(projectSchemas.search, "query"),
  projectController.getProjects
);

/**
 * @route   GET /api/projects/featured
 * @desc    Get featured projects only
 * @access  Public
 * @query   {number} limit - Maximum number of featured projects
 */
router.get("/featured", apiLimiter, projectController.getProjects);

/**
 * @route   GET /api/projects/:id
 * @desc    Get single project by ID with optional media
 * @access  Public
 * @param   {number} id - Project ID
 * @query   {boolean} includePhotos - Load photos
 * @query   {boolean} includeFloorPlans - Load floor plans
 * @query   {boolean} includeApartments - Load apartments
 */
router.get(
  "/:id",
  apiLimiter,
  validate(projectSchemas.getById, "params"),
  projectController.getProjectById
);

/**
 * @route   GET /api/projects/slug/:slug
 * @desc    Get project by slug (SEO-friendly URLs)
 * @access  Public
 * @param   {string} slug - Project slug
 */
router.get(
  "/slug/:slug",
  apiLimiter,
  validate(projectSchemas.getBySlug, "params"),
  projectController.getProjectBySlug
);

/**
 * @route   POST /api/projects
 * @desc    Create new project
 * @access  Private (Admin only)
 * @body    {object} project - Project data
 */
router.post(
  "/",
  validate(projectSchemas.create, "body"),
  projectController.createProject
);

/**
 * @route   PUT /api/projects/:id
 * @desc    Update existing project
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 * @body    {object} updates - Project updates
 */
router.put(
  "/:id",
  validateMultiple({
    params: projectSchemas.getById,
    body: projectSchemas.update,
  }),
  projectController.updateProject
);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project (soft delete)
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 */
router.delete(
  "/:id",
  validate(projectSchemas.getById, "params"),
  projectController.deleteProject
);

// ============================================================================
// PHOTO MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/projects/:id/photos
 * @desc    Get all photos for a project
 * @access  Public
 * @param   {number} id - Project ID
 * @query   {boolean} isCover - Filter cover photos only
 * @query   {boolean} hasCaption - Filter photos with captions
 */
router.get(
  "/:id/photos",
  apiLimiter,
  validate(photoSchemas.entityIdParam, "params"),
  projectController.getProjectPhotos
);

/**
 * @route   GET /api/projects/:id/photos/cover
 * @desc    Get project cover photo
 * @access  Public
 * @param   {number} id - Project ID
 */
router.get(
  "/:id/photos/cover",
  apiLimiter,
  validate(photoSchemas.entityIdParam, "params"),
  projectController.getProjectCoverPhoto
);

/**
 * @route   POST /api/projects/:id/photos
 * @desc    Add photos to project
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 * @body    {array} photos - Array of photo objects
 * @example { photos: [{ url: "...", caption: "...", isCover: true }] }
 */
router.post(
  "/:id/photos",
  validateMultiple({
    params: photoSchemas.entityIdParam,
    body: photoSchemas.addPhotos,
  }),
  projectController.addProjectPhotos
);

/**
 * @route   PATCH /api/projects/:id/photos/:photoId
 * @desc    Update specific photo
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 * @param   {number} photoId - Photo ID
 * @body    {object} updates - Photo updates
 */
router.patch(
  "/:id/photos/:photoId",
  validateMultiple({
    params: photoSchemas.photoParams,
    body: photoSchemas.updatePhoto,
  }),
  projectController.updateProjectPhoto
);

/**
 * @route   PATCH /api/projects/:id/photos/:photoId/set-cover
 * @desc    Set photo as cover (unsets others)
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 * @param   {number} photoId - Photo ID
 */
router.patch(
  "/:id/photos/:photoId/set-cover",
  validate(photoSchemas.photoParams, "params"),
  projectController.setProjectCoverPhoto
);

/**
 * @route   DELETE /api/projects/:id/photos/:photoId
 * @desc    Delete single photo
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 * @param   {number} photoId - Photo ID
 */
router.delete(
  "/:id/photos/:photoId",
  validate(photoSchemas.photoParams, "params"),
  projectController.deleteProjectPhoto
);

/**
 * @route   POST /api/projects/:id/photos/reorder
 * @desc    Reorder photos by display order
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 * @body    {array} photoIds - Ordered array of photo IDs
 */
router.post(
  "/:id/photos/reorder",
  validateMultiple({
    params: photoSchemas.entityIdParam,
    body: photoSchemas.reorderPhotos,
  }),
  projectController.reorderProjectPhotos
);

// ============================================================================
// FLOOR PLAN MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/projects/:id/floor-plans
 * @desc    Get all floor plans for a project
 * @access  Public
 * @param   {number} id - Project ID
 * @query   {boolean} hasPdf - Filter plans with PDF only
 */
router.get(
  "/:id/floor-plans",
  apiLimiter,
  validate(floorPlanSchemas.entityIdParam, "params"),
  projectController.getProjectFloorPlans
);

/**
 * @route   POST /api/projects/:id/floor-plans
 * @desc    Add floor plans to project
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 * @body    {array} floorPlans - Array of floor plan objects
 * @example { floorPlans: [{ name: "...", imageUrl: "...", pdfUrl: "..." }] }
 */
router.post(
  "/:id/floor-plans",
  validateMultiple({
    params: floorPlanSchemas.entityIdParam,
    body: floorPlanSchemas.addFloorPlans,
  }),
  projectController.addProjectFloorPlans
);

/**
 * @route   PATCH /api/projects/:id/floor-plans/:floorPlanId
 * @desc    Update specific floor plan
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 * @param   {number} floorPlanId - Floor plan ID
 * @body    {object} updates - Floor plan updates
 */
router.patch(
  "/:id/floor-plans/:floorPlanId",
  validateMultiple({
    params: floorPlanSchemas.floorPlanParams,
    body: floorPlanSchemas.updateFloorPlan,
  }),
  projectController.updateProjectFloorPlan
);

/**
 * @route   DELETE /api/projects/:id/floor-plans/:floorPlanId
 * @desc    Delete single floor plan
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 * @param   {number} floorPlanId - Floor plan ID
 */
router.delete(
  "/:id/floor-plans/:floorPlanId",
  validate(floorPlanSchemas.floorPlanParams, "params"),
  projectController.deleteProjectFloorPlan
);

/**
 * @route   POST /api/projects/:id/floor-plans/reorder
 * @desc    Reorder floor plans by display order
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 * @body    {array} floorPlanIds - Ordered array of floor plan IDs
 */
router.post(
  "/:id/floor-plans/reorder",
  validateMultiple({
    params: floorPlanSchemas.entityIdParam,
    body: floorPlanSchemas.reorderFloorPlans,
  }),
  projectController.reorderProjectFloorPlans
);

// ============================================================================
// FEATURES MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/projects/:id/features
 * @desc    Get all features for a project
 * @access  Public
 * @param   {number} id - Project ID
 */
router.get(
  "/:id/features",
  apiLimiter,
  validate(projectSchemas.getById, "params"),
  projectController.getProjects // TODO: Implement in controller
);

/**
 * @route   POST /api/projects/:id/features
 * @desc    Sync project features (replaces all)
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 * @body    {array} featureIds - Array of feature IDs
 */
router.post(
  "/:id/features",
  validateMultiple({
    params: projectSchemas.getById,
    body: projectSchemas.features,
  }),
  projectController.createProject // TODO: Implement in controller
);

// ============================================================================
// PUBLISHING & VALIDATION ROUTES
// ============================================================================

/**
 * @route   GET /api/projects/:id/validate-media
 * @desc    Validate project media before publishing
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 * @returns {object} Validation result with errors if any
 */
router.get(
  "/:id/validate-media",
  validate(projectSchemas.getById, "params"),
  projectController.validateProjectMedia
);

/**
 * @route   PATCH /api/projects/:id/publish
 * @desc    Publish project (validates media first)
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 */
router.patch(
  "/:id/publish",
  validate(projectSchemas.getById, "params"),
  projectController.publishProject
);

/**
 * @route   PATCH /api/projects/:id/unpublish
 * @desc    Unpublish project
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 */
router.patch(
  "/:id/unpublish",
  validate(projectSchemas.getById, "params"),
  projectController.unpublishProject
);

// ============================================================================
// STATISTICS & ANALYTICS ROUTES
// ============================================================================

/**
 * @route   GET /api/projects/:id/media-stats
 * @desc    Get media statistics for project
 * @access  Private (Admin only)
 * @param   {number} id - Project ID
 * @returns {object} Photo and floor plan counts
 */
router.get(
  "/:id/media-stats",
  validate(projectSchemas.getById, "params"),
  projectController.getProjectMediaStats
);

/**
 * @route   POST /api/projects/compare
 * @desc    Compare multiple projects side-by-side
 * @access  Public
 * @body    {array} projectIds - Array of project IDs to compare
 */
router.post("/compare", apiLimiter, projectController.compareProjects);

export default router;
