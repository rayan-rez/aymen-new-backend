/**
 * Location Routes
 * Handles hierarchical location management (country > region > city > neighborhood)
 *
 * @module routes/location.routes
 */

import { Router } from "express";
import locationController from "@/controllers/location.controller";
import { validate } from "@/middlewares/validation.middleware";
import locationSchemas from "@/validators/location.validator";
import { apiLimiter } from "@/middlewares/rate-limit.middleware";

const router = Router();

// Apply rate limiting
router.use(apiLimiter);

// ============================================================================
// PUBLIC LOCATION HIERARCHY ROUTES
// ============================================================================

/**
 * @route   GET /api/locations
 * @desc    Get all locations with filtering and pagination
 * @access  Public
 * @query   {string} type - Filter by type (country, region, city, neighborhood)
 * @query   {number} parentId - Filter by parent location
 * @query   {boolean} isActive - Filter active locations only
 * @query   {number} depth - Filter by hierarchy depth
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 * @query   {string} search - Search by name
 */
router.get(
  "/",
  validate(locationSchemas.filters, "query"),
  locationController.getLocations
);

/**
 * @route   GET /api/locations/countries
 * @desc    Get all countries (root level locations)
 * @access  Public
 */
router.get("/countries", locationController.getCountries);

/**
 * @route   GET /api/locations/countries/:countryId/regions
 * @desc    Get all regions for a specific country
 * @access  Public
 * @param   {number} countryId - Country ID
 */
router.get("/countries/:countryId/regions", locationController.getRegions);

/**
 * @route   GET /api/locations/regions/:regionId/cities
 * @desc    Get all cities for a specific region
 * @access  Public
 * @param   {number} regionId - Region ID
 */
router.get("/regions/:regionId/cities", locationController.getCities);

/**
 * @route   GET /api/locations/cities/:cityId/neighborhoods
 * @desc    Get all neighborhoods for a specific city
 * @access  Public
 * @param   {number} cityId - City ID
 */
router.get(
  "/cities/:cityId/neighborhoods",
  locationController.getNeighborhoods
);

/**
 * @route   GET /api/locations/statistics
 * @desc    Get location statistics (counts by type, depth info, etc.)
 * @access  Private (Admin only)
 */
router.get("/statistics", locationController.getStatistics);

/**
 * @route   GET /api/locations/:id
 * @desc    Get single location by ID
 * @access  Public
 * @param   {number} id - Location ID
 * @query   {boolean} includeHierarchy - Include full hierarchy path
 */
router.get(
  "/:id",
  validate(locationSchemas.getById, "params"),
  locationController.getLocationById
);

/**
 * @route   GET /api/locations/:id/hierarchy
 * @desc    Get full hierarchy path for a location (from root to location)
 * @access  Public
 * @param   {number} id - Location ID
 * @returns {array} Ordered array of locations from root to target
 */
router.get(
  "/:id/hierarchy",
  validate(locationSchemas.getById, "params"),
  locationController.getHierarchyPath
);

/**
 * @route   GET /api/locations/:id/descendants
 * @desc    Get all descendants of a location (children, grandchildren, etc.)
 * @access  Public
 * @param   {number} id - Location ID
 * @query   {number} maxDepth - Maximum depth to retrieve
 * @query   {string} typesOnly - Comma-separated types to filter
 */
router.get(
  "/:id/descendants",
  validate(locationSchemas.getById, "params"),
  validate(locationSchemas.descendantsQuery, "query"),
  locationController.getDescendants
);

// ============================================================================
// ADMIN LOCATION MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/locations
 * @desc    Create new location
 * @access  Private (Admin only)
 * @body    {object} location - Location data
 * @example {
 *   "name": "Algiers",
 *   "type": "region",
 *   "parentId": 1,
 *   "isActive": true
 * }
 */
router.post(
  "/",
  validate(locationSchemas.create, "body"),
  locationController.createLocation
);

/**
 * @route   PUT /api/locations/:id
 * @desc    Update existing location
 * @access  Private (Admin only)
 * @param   {number} id - Location ID
 * @body    {object} updates - Location updates
 */
router.put(
  "/:id",
  validate(locationSchemas.getById, "params"),
  validate(locationSchemas.update, "body"),
  locationController.updateLocation
);

/**
 * @route   DELETE /api/locations/:id
 * @desc    Delete location (checks for children and dependencies first)
 * @access  Private (Admin only)
 * @param   {number} id - Location ID
 */
router.delete(
  "/:id",
  validate(locationSchemas.getById, "params"),
  locationController.deleteLocation
);

export default router;
