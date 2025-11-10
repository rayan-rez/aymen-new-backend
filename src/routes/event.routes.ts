/**
 * Event Routes
 * Handles all event-related endpoints including registrations
 *
 * @module routes/event.routes
 */

import { Router } from "express";
import eventController from "@/controllers/event.controller";
import {
  validate,
  validateMultiple,
} from "@/middlewares/validation.middleware";
import eventSchemas from "@/validators/event.validator";
import eventRegistrationSchemas from "@/validators/event-registration.validator";
import photoSchemas from "@/validators/photo.validators";
import { apiLimiter, formLimiter } from "@/middlewares/rate-limit.middleware";

const router = Router();

// ============================================================================
// CORE EVENT ROUTES
// ============================================================================

/**
 * @route   GET /api/events
 * @desc    Get all events with filtering
 * @access  Public
 * @query   {string} eventType - Filter by type (exhibition, workshop, etc.)
 * @query   {string} status - Filter by status (draft, scheduled, etc.)
 * @query   {string} locationType - Filter by location type (physical, online, hybrid)
 * @query   {boolean} isFeatured - Filter featured events
 * @query   {boolean} isPublished - Filter published events
 * @query   {boolean} isUpcoming - Show only upcoming events
 * @query   {boolean} isPast - Show only past events
 */
router.get(
  "/",
  apiLimiter,
  validate(eventSchemas.filters, "query"),
  eventController.getEvents
);

/**
 * @route   GET /api/events/upcoming
 * @desc    Get upcoming events (published only)
 * @access  Public
 * @query   {number} limit - Maximum number of events
 */
router.get("/upcoming", apiLimiter, eventController.getUpcomingEvents);

/**
 * @route   GET /api/events/featured
 * @desc    Get featured events
 * @access  Public
 * @query   {number} limit - Maximum number of events
 */
router.get("/featured", apiLimiter, eventController.getFeaturedEvents);

/**
 * @route   GET /api/events/with-capacity
 * @desc    Get events with available capacity
 * @access  Public
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 */
router.get(
  "/with-capacity",
  apiLimiter,
  validate(eventSchemas.filters, "query"),
  eventController.getEventsWithCapacity
);

/**
 * @route   GET /api/events/by-type/:type
 * @desc    Get events by type
 * @access  Public
 * @param   {string} type - Event type
 */
router.get("/by-type/:type", apiLimiter, eventController.getEventsByType);

/**
 * @route   GET /api/events/by-project/:projectId
 * @desc    Get events by project
 * @access  Public
 * @param   {number} projectId - Project ID
 */
router.get(
  "/by-project/:projectId",
  apiLimiter,
  eventController.getEventsByProject
);

/**
 * @route   GET /api/events/search
 * @desc    Search events
 * @access  Public
 * @query   {string} q - Search query
 */
router.get("/search", apiLimiter, eventController.searchEvents);

/**
 * @route   GET /api/events/:id
 * @desc    Get single event by ID
 * @access  Public
 * @param   {number} id - Event ID
 */
router.get(
  "/:id",
  apiLimiter,
  validate(eventSchemas.getById, "params"),
  eventController.getEventById
);

/**
 * @route   GET /api/events/slug/:slug
 * @desc    Get event by slug (SEO-friendly)
 * @access  Public
 * @param   {string} slug - Event slug
 */
router.get(
  "/slug/:slug",
  apiLimiter,
  validate(eventSchemas.getBySlug, "params"),
  eventController.getEventBySlug
);

/**
 * @route   GET /api/events/:id/stats
 * @desc    Get event with full statistics
 * @access  Private (Admin only)
 * @param   {number} id - Event ID
 */
router.get(
  "/:id/stats",
  validate(eventSchemas.getById, "params"),
  eventController.getEventWithStats
);

/**
 * @route   POST /api/events
 * @desc    Create new event
 * @access  Private (Admin only)
 * @body    {object} event - Event data
 */
router.post(
  "/",
  validate(eventSchemas.create, "body"),
  eventController.createEvent
);

/**
 * @route   PUT /api/events/:id
 * @desc    Update event
 * @access  Private (Admin only)
 * @param   {number} id - Event ID
 * @body    {object} updates - Event updates
 */
router.put(
  "/:id",
  validateMultiple({
    params: eventSchemas.getById,
    body: eventSchemas.update,
  }),
  eventController.updateEvent
);

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete event
 * @access  Private (Admin only)
 * @param   {number} id - Event ID
 */
router.delete(
  "/:id",
  validate(eventSchemas.getById, "params"),
  eventController.deleteEvent
);

// ============================================================================
// PUBLISHING & STATUS ROUTES
// ============================================================================

/**
 * @route   PATCH /api/events/:id/publish
 * @desc    Publish event
 * @access  Private (Admin only)
 * @param   {number} id - Event ID
 */
router.patch(
  "/:id/publish",
  validate(eventSchemas.getById, "params"),
  eventController.publishEvent
);

/**
 * @route   PATCH /api/events/:id/unpublish
 * @desc    Unpublish event
 * @access  Private (Admin only)
 * @param   {number} id - Event ID
 */
router.patch(
  "/:id/unpublish",
  validate(eventSchemas.getById, "params"),
  eventController.unpublishEvent
);

/**
 * @route   PATCH /api/events/:id/status
 * @desc    Update event status
 * @access  Private (Admin only)
 * @param   {number} id - Event ID
 * @body    {string} status - New status
 */
router.patch(
  "/:id/status",
  validateMultiple({
    params: eventSchemas.getById,
    body: eventSchemas.updateStatus,
  }),
  eventController.updateEventStatus
);

// ============================================================================
// REGISTRATION MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   PATCH /api/events/:id/open-registration
 * @desc    Open event registration
 * @access  Private (Admin only)
 * @param   {number} id - Event ID
 */
router.patch(
  "/:id/open-registration",
  validate(eventSchemas.getById, "params"),
  eventController.openRegistration
);

/**
 * @route   PATCH /api/events/:id/close-registration
 * @desc    Close event registration
 * @access  Private (Admin only)
 * @param   {number} id - Event ID
 */
router.patch(
  "/:id/close-registration",
  validate(eventSchemas.getById, "params"),
  eventController.closeRegistration
);

/**
 * @route   GET /api/events/:id/registrations
 * @desc    Get all registrations for an event
 * @access  Private (Admin only)
 * @param   {number} id - Event ID
 * @query   {number} page - Page number
 * @query   {number} limit - Items per page
 * @query   {string} status - Filter by status
 */
router.get(
  "/:id/registrations",
  validate(eventSchemas.getById, "params"),
  validate(eventSchemas.registrationFilters, "query"),
  eventController.getEventRegistrations
);

/**
 * @route   GET /api/events/:id/registrations/statistics
 * @desc    Get registration statistics for an event
 * @access  Private (Admin only)
 * @param   {number} id - Event ID
 */
router.get(
  "/:id/registrations/statistics",
  validate(eventSchemas.getById, "params"),
  eventController.getRegistrationStatistics
);

// ============================================================================
// INFLUENCER MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/events/:id/influencers
 * @desc    Get influencers for an event
 * @access  Private (Admin only)
 * @param   {number} id - Event ID
 */
router.get(
  "/:id/influencers",
  validate(eventSchemas.getById, "params"),
  eventController.getEventInfluencers
);


// ============================================================================
// PHOTO MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/events/:id/photos
 * @desc    Get event photos
 * @access  Public
 * @param   {number} id - Event ID
 */
router.get(
  "/:id/photos",
  apiLimiter,
  validate(photoSchemas.entityIdParam, "params"),
  eventController.getEventPhotos
);

/**
 * @route   POST /api/events/:id/photos
 * @desc    Add photos to event
 * @access  Private (Admin only)
 * @param   {number} id - Event ID
 * @body    {array} photos - Array of photo objects
 */
router.post(
  "/:id/photos",
  validateMultiple({
    params: photoSchemas.entityIdParam,
    body: photoSchemas.addPhotos,
  }),
  eventController.addEventPhotos
);

// ============================================================================
// CAPACITY & ANALYTICS ROUTES
// ============================================================================

/**
 * @route   GET /api/events/:id/capacity
 * @desc    Check event capacity availability
 * @access  Public
 * @param   {number} id - Event ID
 * @query   {number} guestCount - Number of guests to check
 */
router.get(
  "/:id/capacity",
  apiLimiter,
  validate(eventSchemas.getById, "params"),
  eventController.checkCapacity
);

export default router;
