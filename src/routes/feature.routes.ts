/**
 * Feature Routes
 * Handles all feature (amenities/facilities) related endpoints
 *
 * @module routes/feature.routes
 */

import { Router } from "express";
import featureController from "@/controllers/feature.controller";
import { validate, validateMultiple } from "@/middlewares/validation.middleware";
import featureSchemas from "@/validators/feature.validator";
import { apiLimiter } from "@/middlewares/rate-limit.middleware";

const router = Router();

// Apply rate limiting to all routes
router.use(apiLimiter);

// ============================================================================
// PUBLIC FEATURE ROUTES
// ============================================================================

/**
 * @route   GET /api/features
 * @desc    Get all features with filtering and pagination
 * @access  Public
 * @query   {string} category - Filter by category (amenity, security, transport, leisure, other)
 * @query   {boolean} isActive - Filter active features only
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 * @query   {string} search - Search by name
 */
router.get(
  "/",
  apiLimiter,
  validate(featureSchemas.filters, "query"),
  featureController.getFeatures
);

/**
 * @route   GET /api/features/active
 * @desc    Get active features only (commonly used for dropdowns)
 * @access  Public
 */
router.get("/active", apiLimiter, featureController.getActiveFeatures);

/**
 * @route   GET /api/features/popular
 * @desc    Get most popular features (most used in projects)
 * @access  Public
 * @query   {number} limit - Maximum number of features (default: 10)
 */
router.get(
  "/popular",
  apiLimiter,
  validate(featureSchemas.popularQuery, "query"),
  featureController.getPopularFeatures
);

/**
 * @route   GET /api/features/category/:category
 * @desc    Get features by category
 * @access  Public
 * @param   {string} category - Feature category
 */
router.get(
  "/category/:category",
  apiLimiter,
  validate(featureSchemas.categoryParam, "params"),
  featureController.getFeaturesByCategory
);

/**
 * @route   GET /api/features/statistics
 * @desc    Get feature statistics (count by category, etc.)
 * @access  Private (Admin only)
 */
router.get("/statistics", featureController.getStatistics);

/**
 * @route   GET /api/features/:id
 * @desc    Get single feature by ID
 * @access  Public
 * @param   {number} id - Feature ID
 * @query   {boolean} includeUsage - Include usage statistics
 */
router.get(
  "/:id",
  apiLimiter,
  validate(featureSchemas.getById, "params"),
  featureController.getFeatureById
);

// ============================================================================
// ADMIN FEATURE MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/features
 * @desc    Create new feature
 * @access  Private (Admin only)
 * @body    {object} feature - Feature data
 * @example {
 *   "name": "Swimming Pool",
 *   "category": "amenity",
 *   "icon": "pool",
 *   "translations": { "fr": "Piscine", "ar": "مسبح" }
 * }
 */
router.post(
  "/",
  validate(featureSchemas.create, "body"),
  featureController.createFeature
);

/**
 * @route   POST /api/features/bulk
 * @desc    Bulk create features
 * @access  Private (Admin only)
 * @body    {array} features - Array of feature objects
 */
router.post("/bulk", featureController.bulkCreateFeatures);

/**
 * @route   PUT /api/features/:id
 * @desc    Update existing feature
 * @access  Private (Admin only)
 * @param   {number} id - Feature ID
 * @body    {object} updates - Feature updates
 */
router.put(
  "/:id",
  validateMultiple({
    params: featureSchemas.getById,
    body: featureSchemas.update,
  }),
  featureController.updateFeature
);

/**
 * @route   DELETE /api/features/:id
 * @desc    Delete feature (checks for usage in projects first)
 * @access  Private (Admin only)
 * @param   {number} id - Feature ID
 */
router.delete(
  "/:id",
  validate(featureSchemas.getById, "params"),
  featureController.deleteFeature
);

// ============================================================================
// TRANSLATION MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   PATCH /api/features/:id/translations
 * @desc    Update feature translations (multi-language support)
 * @access  Private (Admin only)
 * @param   {number} id - Feature ID
 * @body    {object} translations - Language translations
 * @body    {boolean} merge - Merge with existing translations (default: true)
 * @example {
 *   "translations": { "en": "Swimming Pool", "fr": "Piscine" },
 *   "merge": true
 * }
 */
router.patch(
  "/:id/translations",
  validateMultiple({
    params: featureSchemas.getById,
    body: featureSchemas.updateTranslations,
  }),
  featureController.updateTranslations
);

export default router;