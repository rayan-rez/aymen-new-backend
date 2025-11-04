/**
 * Apartment Routes
 * Handles all apartment-related endpoints
 *
 * @module routes/apartment.routes
 */

import { Router } from "express";
import apartmentController from "@/controllers/apartment.controller";
import {
  validate,
  validateMultiple,
} from "@/middlewares/validation.middleware";
import apartmentSchemas from "@/validators/apartment.validators";
import { apiLimiter } from "@/middlewares/rate-limit.middleware";

const router = Router();

// ============================================================================
// CORE APARTMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/apartments
 * @desc    Get all apartments with filtering and pagination
 * @access  Public
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 * @query   {number} projectId - Filter by project
 * @query   {string} status - Filter by status (available, reserved, sold)
 * @query   {boolean} isPublished - Filter published apartments
 * @query   {number} minPrice - Minimum price
 * @query   {number} maxPrice - Maximum price
 * @query   {number} bedrooms - Number of bedrooms
 * @query   {number} bathrooms - Number of bathrooms
 * @query   {number} minArea - Minimum area (sqm)
 * @query   {number} maxArea - Maximum area (sqm)
 * @query   {number} floorNumber - Filter by floor
 * @query   {string} search - Search term
 */
router.get(
  "/",
  apiLimiter,
  validate(apartmentSchemas.filters, "query"),
  apartmentController.getApartments
);

/**
 * @route   GET /api/apartments/available
 * @desc    Get available apartments only
 * @access  Public
 * @query   {number} projectId - Filter by project
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 */
router.get(
  "/available",
  apiLimiter,
  validate(apartmentSchemas.filters, "query"),
  apartmentController.getAvailableApartments
);

/**
 * @route   GET /api/apartments/model-units
 * @desc    Get model units (show apartments)
 * @access  Public
 * @query   {number} projectId - Filter by project
 */
router.get("/model-units", apiLimiter, apartmentController.getModelUnits);

/**
 * @route   GET /api/apartments/floor
 * @desc    Get apartments by floor number
 * @access  Public
 * @query   {number} projectId - Project ID (required)
 * @query   {number} floorNumber - Floor number (required)
 */
router.get(
  "/floor",
  apiLimiter,
  validate(apartmentSchemas.floorQuery, "query"),
  apartmentController.getApartmentsByFloor
);

/**
 * @route   GET /api/apartments/check-duplicate
 * @desc    Check if apartment unit number exists in project
 * @access  Private (Admin only)
 * @query   {number} projectId - Project ID
 * @query   {string} unitNumber - Unit number to check
 */
router.get(
  "/check-duplicate",
  validate(apartmentSchemas.filters, "query"),
  apartmentController.checkDuplicate
);

/**
 * @route   GET /api/apartments/:id
 * @desc    Get single apartment by ID
 * @access  Public
 * @param   {number} id - Apartment ID
 * @query   {string} relations - Comma-separated relations to load
 */
router.get(
  "/:id",
  apiLimiter,
  validate(apartmentSchemas.getById, "params"),
  apartmentController.getApartmentById
);

/**
 * @route   POST /api/apartments
 * @desc    Create new apartment
 * @access  Private (Admin only)
 * @body    {object} apartment - Apartment data
 */
router.post(
  "/",
  validate(apartmentSchemas.create, "body"),
  apartmentController.createApartment
);

/**
 * @route   PUT /api/apartments/:id
 * @desc    Update apartment
 * @access  Private (Admin only)
 * @param   {number} id - Apartment ID
 * @body    {object} updates - Apartment updates
 */
router.put(
  "/:id",
  validateMultiple({
    params: apartmentSchemas.getById,
    body: apartmentSchemas.update,
  }),
  apartmentController.updateApartment
);

/**
 * @route   DELETE /api/apartments/:id
 * @desc    Delete apartment (soft delete)
 * @access  Private (Admin only)
 * @param   {number} id - Apartment ID
 */
router.delete(
  "/:id",
  validate(apartmentSchemas.getById, "params"),
  apartmentController.deleteApartment
);

// ============================================================================
// STATUS MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   PATCH /api/apartments/:id/status
 * @desc    Update apartment status
 * @access  Private (Admin only)
 * @param   {number} id - Apartment ID
 * @body    {string} status - New status (available, reserved, sold)
 */
router.patch(
  "/:id/status",
  validateMultiple({
    params: apartmentSchemas.getById,
    body: apartmentSchemas.updateStatus,
  }),
  apartmentController.updateStatus
);

/**
 * @route   PATCH /api/apartments/:id/sold
 * @desc    Mark apartment as sold
 * @access  Private (Admin only)
 * @param   {number} id - Apartment ID
 */
router.patch(
  "/:id/sold",
  validate(apartmentSchemas.getById, "params"),
  apartmentController.markAsSold
);

/**
 * @route   PATCH /api/apartments/:id/reserved
 * @desc    Mark apartment as reserved
 * @access  Private (Admin only)
 * @param   {number} id - Apartment ID
 */
router.patch(
  "/:id/reserved",
  validate(apartmentSchemas.getById, "params"),
  apartmentController.markAsReserved
);

/**
 * @route   PATCH /api/apartments/:id/available
 * @desc    Mark apartment as available
 * @access  Private (Admin only)
 * @param   {number} id - Apartment ID
 */
router.patch(
  "/:id/available",
  validate(apartmentSchemas.getById, "params"),
  apartmentController.markAsAvailable
);

/**
 * @route   PATCH /api/apartments/bulk/status
 * @desc    Bulk update apartment statuses
 * @access  Private (Admin only)
 * @body    {array} ids - Array of apartment IDs
 * @body    {string} status - New status for all
 */
router.patch(
  "/bulk/status",
  validate(apartmentSchemas.bulkUpdateStatus, "body"),
  apartmentController.bulkUpdateStatus
);

// ============================================================================
// PROJECT-SPECIFIC ROUTES
// ============================================================================

/**
 * @route   GET /api/apartments/project/:projectId
 * @desc    Get all apartments for a specific project
 * @access  Public
 * @param   {number} projectId - Project ID
 * @query   {string} status - Filter by status
 * @query   {number} minPrice - Minimum price
 * @query   {number} maxPrice - Maximum price
 * @query   {number} bedrooms - Number of bedrooms
 */
router.get(
  "/project/:projectId",
  apiLimiter,
  validate(apartmentSchemas.getByProject, "params"),
  apartmentController.getApartmentsByProject
);

/**
 * @route   GET /api/apartments/availability/:projectId
 * @desc    Get availability summary for a project
 * @access  Public
 * @param   {number} projectId - Project ID
 * @returns {object} Summary with total, available, reserved, sold counts
 */
router.get(
  "/availability/:projectId",
  apiLimiter,
  validate(apartmentSchemas.getByProject, "params"),
  apartmentController.getAvailabilitySummary
);

/**
 * @route   GET /api/apartments/statistics/:projectId
 * @desc    Get comprehensive statistics for a project
 * @access  Public
 * @param   {number} projectId - Project ID
 * @returns {object} Detailed statistics including pricing, area, floors
 */
router.get(
  "/statistics/:projectId",
  apiLimiter,
  validate(apartmentSchemas.getByProject, "params"),
  apartmentController.getProjectStatistics
);

/**
 * @route   GET /api/apartments/distribution/floors/:projectId
 * @desc    Get floor distribution for a project
 * @access  Public
 * @param   {number} projectId - Project ID
 * @returns {array} Count of apartments per floor
 */
router.get(
  "/distribution/floors/:projectId",
  apiLimiter,
  validate(apartmentSchemas.getByProject, "params"),
  apartmentController.getFloorDistribution
);

/**
 * @route   GET /api/apartments/distribution/bedrooms/:projectId
 * @desc    Get bedroom distribution for a project
 * @access  Public
 * @param   {number} projectId - Project ID
 * @returns {array} Count of apartments by bedroom count
 */
router.get(
  "/distribution/bedrooms/:projectId",
  apiLimiter,
  validate(apartmentSchemas.getByProject, "params"),
  apartmentController.getBedroomDistribution
);

// ============================================================================
// EXPORT ROUTES
// ============================================================================

/**
 * @route   GET /api/apartments/export
 * @desc    Export apartments to CSV/Excel
 * @access  Private (Admin only)
 * @query   {number} projectId - Project ID
 * @query   {string} format - Export format (csv, xlsx)
 */
router.get(
  "/export",
  validate(apartmentSchemas.filters, "query"),
  apartmentController.exportApartments
);

export default router;
