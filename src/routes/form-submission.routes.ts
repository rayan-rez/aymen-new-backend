// ============================================================================
// routes/form-submission.routes.ts
// ============================================================================

/**
 * Form Submission Routes
 * Handles all form submission endpoints (contact, inquiries, etc.)
 *
 * @module routes/form-submission.routes
 */

import { Router } from "express";
import formSubmissionController from "@/controllers/form-submission.controller";
import { validate } from "@/middlewares/validation.middleware";
import { formLimiter, apiLimiter } from "@/middlewares/rate-limit.middleware";
import Joi from "joi";

const router = Router();

// Public form submission schemas
const contactFormSchema = Joi.object({
  firstName: Joi.string().min(2).max(100).required(),
  lastName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(30).allow(null, "").optional(),
  message: Joi.string().min(10).max(5000).required(),
  utmSource: Joi.string().max(100).allow(null).optional(),
  utmMedium: Joi.string().max(100).allow(null).optional(),
  utmCampaign: Joi.string().max(150).allow(null).optional(),
});

const projectInquirySchema = Joi.object({
  projectId: Joi.number().integer().positive().allow(null).optional(),
  firstName: Joi.string().min(2).max(100).required(),
  lastName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(30).allow(null, "").optional(),
  message: Joi.string().min(10).max(5000).required(),
  budget: Joi.string().max(50).allow(null).optional(),
  preferredContactMethod: Joi.string()
    .valid("email", "phone", "whatsapp")
    .optional(),
  utmSource: Joi.string().max(100).allow(null).optional(),
  utmMedium: Joi.string().max(100).allow(null).optional(),
  utmCampaign: Joi.string().max(150).allow(null).optional(),
});

/**
 * @route   POST /api/forms/contact
 * @desc    Submit contact form (public)
 * @access  Public (rate limited)
 * @body    {object} Contact form data
 */
router.post(
  "/contact",
  formLimiter,
  validate(contactFormSchema, "body"),
  formSubmissionController.submitContactForm
);

/**
 * @route   POST /api/forms/project-inquiry
 * @desc    Submit project inquiry form (public)
 * @access  Public (rate limited)
 * @body    {object} Project inquiry data
 */
router.post(
  "/project-inquiry",
  formLimiter,
  validate(projectInquirySchema, "body"),
  formSubmissionController.submitProjectInquiry
);

/**
 * @route   POST /api/forms/appointment
 * @desc    Submit appointment request (public)
 * @access  Public (rate limited)
 * @body    {object} Appointment request data
 */
router.post(
  "/appointment",
  formLimiter,
  formSubmissionController.submitAppointmentRequest
);

/**
 * @route   POST /api/forms/catalog-download
 * @desc    Submit catalog download request (public)
 * @access  Public (rate limited)
 * @body    {object} Catalog download data
 */
router.post(
  "/catalog-download",
  formLimiter,
  formSubmissionController.submitCatalogDownload
);

// Admin routes
/**
 * @route   GET /api/form-submissions
 * @desc    Get all form submissions (admin)
 * @access  Private (Admin only)
 * @query   {string} formType - Filter by form type
 * @query   {string} status - Filter by status
 * @query   {boolean} isSpam - Filter spam
 */
router.get("/", apiLimiter, formSubmissionController.getFormSubmissions);

/**
 * @route   GET /api/form-submissions/statistics
 * @desc    Get submission statistics
 * @access  Private (Admin only)
 */
router.get("/statistics", formSubmissionController.getStatistics);

/**
 * @route   GET /api/form-submissions/pending-sync
 * @desc    Get submissions pending Odoo sync
 * @access  Private (Admin only)
 */
router.get("/pending-sync", formSubmissionController.getPendingSync);

/**
 * @route   PATCH /api/form-submissions/:id/mark-synced
 * @desc    Mark submission as synced
 * @access  Private (Admin only)
 */
router.patch("/:id/mark-synced", formSubmissionController.markSynced);

export { router as formSubmissionRoutes };

// ============================================================================
// routes/location.routes.ts
// ============================================================================

/**
 * Location Routes
 * Handles hierarchical location management
 *
 * @module routes/location.routes
 */

import { Router as LocationRouter } from "express";
import locationController from "@/controllers/location.controller";
import { validate as validateLocation } from "@/middlewares/validation.middleware";
import locationSchemas from "@/validators/location.validator";
import { apiLimiter as locationApiLimiter } from "@/middlewares/rate-limit.middleware";

const locationRouter = LocationRouter();

/**
 * @route   GET /api/locations
 * @desc    Get all locations with filtering
 * @access  Public
 * @query   {string} type - Filter by type (country, region, city, neighborhood)
 * @query   {number} parentId - Filter by parent
 * @query   {boolean} isActive - Filter active locations
 */
locationRouter.get(
  "/",
  locationApiLimiter,
  validateLocation(locationSchemas.filters, "query"),
  locationController.getLocations
);

/**
 * @route   GET /api/locations/countries
 * @desc    Get all countries (root level)
 * @access  Public
 */
locationRouter.get(
  "/countries",
  locationApiLimiter,
  locationController.getCountries
);

/**
 * @route   GET /api/locations/countries/:countryId/regions
 * @desc    Get regions for a country
 * @access  Public
 * @param   {number} countryId - Country ID
 */
locationRouter.get(
  "/countries/:countryId/regions",
  locationApiLimiter,
  locationController.getRegions
);

/**
 * @route   GET /api/locations/regions/:regionId/cities
 * @desc    Get cities for a region
 * @access  Public
 * @param   {number} regionId - Region ID
 */
locationRouter.get(
  "/regions/:regionId/cities",
  locationApiLimiter,
  locationController.getCities
);

/**
 * @route   GET /api/locations/cities/:cityId/neighborhoods
 * @desc    Get neighborhoods for a city
 * @access  Public
 * @param   {number} cityId - City ID
 */
locationRouter.get(
  "/cities/:cityId/neighborhoods",
  locationApiLimiter,
  locationController.getNeighborhoods
);

/**
 * @route   GET /api/locations/:id
 * @desc    Get location by ID with hierarchy
 * @access  Public
 * @param   {number} id - Location ID
 * @query   {boolean} includeHierarchy - Include full hierarchy path
 */
locationRouter.get(
  "/:id",
  locationApiLimiter,
  validateLocation(locationSchemas.getById, "params"),
  locationController.getLocationById
);

/**
 * @route   GET /api/locations/:id/hierarchy
 * @desc    Get full hierarchy path for a location
 * @access  Public
 * @param   {number} id - Location ID
 */
locationRouter.get(
  "/:id/hierarchy",
  locationApiLimiter,
  validateLocation(locationSchemas.getById, "params"),
  locationController.getHierarchyPath
);

/**
 * @route   GET /api/locations/:id/descendants
 * @desc    Get all descendants of a location
 * @access  Public
 * @param   {number} id - Location ID
 * @query   {number} maxDepth - Maximum depth to retrieve
 */
locationRouter.get(
  "/:id/descendants",
  locationApiLimiter,
  validateLocation(locationSchemas.getById, "params"),
  locationController.getDescendants
);

/**
 * @route   POST /api/locations
 * @desc    Create new location
 * @access  Private (Admin only)
 * @body    {object} location - Location data
 */
locationRouter.post(
  "/",
  validateLocation(locationSchemas.create, "body"),
  locationController.createLocation
);

/**
 * @route   PUT /api/locations/:id
 * @desc    Update location
 * @access  Private (Admin only)
 * @param   {number} id - Location ID
 */
locationRouter.put(
  "/:id",
  validateLocation(locationSchemas.getById, "params"),
  validateLocation(locationSchemas.update, "body"),
  locationController.updateLocation
);

/**
 * @route   DELETE /api/locations/:id
 * @desc    Delete location (checks for children and dependencies)
 * @access  Private (Admin only)
 * @param   {number} id - Location ID
 */
locationRouter.delete(
  "/:id",
  validateLocation(locationSchemas.getById, "params"),
  locationController.deleteLocation
);

/**
 * @route   GET /api/locations/statistics
 * @desc    Get location statistics
 * @access  Private (Admin only)
 */
locationRouter.get("/statistics", locationController.getStatistics);

export { locationRouter as locationRoutes };
