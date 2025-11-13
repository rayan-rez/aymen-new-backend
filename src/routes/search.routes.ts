/**
 * Search Routes
 * Handles all search-related endpoints
 * 
 * @module routes/search.routes
 */

import { Router } from 'express';
import searchController from '@/controllers/search.controller';
import { apiLimiter } from '@/middlewares/rate-limit.middleware';
import { validate } from '@/middlewares/validation.middleware';
import Joi from 'joi';

const router = Router();

// Validation schemas
const searchSchema = Joi.object({
    q: Joi.string().min(2).max(200).required(),
    type: Joi.string().valid('projects', 'apartments').optional(),
});

const projectSearchSchema = Joi.object({
    q: Joi.string().min(2).max(200).required(),
    project_type: Joi.string().optional(),
    status: Joi.string().optional(),
    location_id: Joi.number().optional(),
    min_price: Joi.number().optional(),
    max_price: Joi.number().optional(),
    is_featured: Joi.boolean().optional(),
});

const apartmentSearchSchema = Joi.object({
    q: Joi.string().min(2).max(200).required(),
    project_id: Joi.number().optional(),
    status: Joi.string().optional(),
    bedrooms: Joi.number().optional(),
    min_price: Joi.number().optional(),
    max_price: Joi.number().optional(),
    floor_number: Joi.number().optional(),
});

const suggestionsSchema = Joi.object({
    q: Joi.string().min(1).max(100).required(),
    type: Joi.string().valid('projects', 'apartments').default('projects'),
});

// ============================================================================
// PUBLIC SEARCH ROUTES
// ============================================================================

/**
 * @route   GET /api/search
 * @desc    Global search across all entities
 * @access  Public (rate limited)
 * @query   {string} q - Search query (min 2 chars)
 * @query   {string} type - Optional: Filter by type (projects, apartments)
 */
router.get(
    '/',
    apiLimiter,
    validate(searchSchema, 'query'),
    searchController.globalSearch
);

/**
 * @route   GET /api/search/projects
 * @desc    Search projects only
 * @access  Public (rate limited)
 * @query   {string} q - Search query
 * @query   {string} project_type - Filter by project type
 * @query   {string} status - Filter by status
 * @query   {number} location_id - Filter by location
 * @query   {number} min_price - Minimum price
 * @query   {number} max_price - Maximum price
 * @query   {boolean} is_featured - Filter featured projects
 */
router.get(
    '/projects',
    apiLimiter,
    validate(projectSearchSchema, 'query'),
    searchController.searchProjects
);

/**
 * @route   GET /api/search/apartments
 * @desc    Search apartments only
 * @access  Public (rate limited)
 * @query   {string} q - Search query
 * @query   {number} project_id - Filter by project
 * @query   {string} status - Filter by status
 * @query   {number} bedrooms - Filter by bedrooms
 * @query   {number} min_price - Minimum price
 * @query   {number} max_price - Maximum price
 * @query   {number} floor_number - Filter by floor
 */
router.get(
    '/apartments',
    apiLimiter,
    validate(apartmentSearchSchema, 'query'),
    searchController.searchApartments
);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get autocomplete suggestions
 * @access  Public (rate limited)
 * @query   {string} q - Search query (min 2 chars)
 * @query   {string} type - Collection type (projects, apartments)
 */
router.get(
    '/suggestions',
    apiLimiter,
    validate(suggestionsSchema, 'query'),
    searchController.getSuggestions
);

// ============================================================================
// ADMIN ROUTES (Protected - add auth middleware in production)
// ============================================================================

/**
 * @route   POST /api/search/init
 * @desc    Initialize Typesense collections
 * @access  Private (Admin only)
 */
router.post(
    '/init',
    // Add auth middleware here: authMiddleware, isAdmin
    searchController.initCollections
);

/**
 * @route   POST /api/search/reindex
 * @desc    Reindex all collections
 * @access  Private (Admin only)
 */
router.post(
    '/reindex',
    // Add auth middleware here: authMiddleware, isAdmin
    searchController.reindexAll
);

/**
 * @route   POST /api/search/reindex/:collection
 * @desc    Reindex specific collection
 * @access  Private (Admin only)
 * @param   {string} collection - Collection name (projects, apartments)
 */
router.post(
    '/reindex/:collection',
    // Add auth middleware here: authMiddleware, isAdmin
    searchController.reindexCollection
);

export default router;