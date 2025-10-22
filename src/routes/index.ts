// ============================================
// src/routes/index.ts
// ============================================
import { Router } from "express";
import eventRoutes from "./event.routes";
import feedbackRoutes from "./feedback.routes";
import formsRoutes from "./form.routes";
import landRoutes from "./land.routes";
import leadsRoutes from "./leads.routes";
import locationsRoutes from "./location.routes";
import mediaRoutes from "./media.routes";
import propertiesRoutes from "./properties.routes";
import recruitmentRoutes from "./recruitment.routes";
import searchRoutes from "./search.routes";
import socialMediaRoutes from "./social-media.routes";

const router = Router();

// ============================================
// MOUNT ROUTES
// ============================================
router.use("/events", eventRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/forms", formsRoutes);
router.use("/land", landRoutes);
router.use("/leads", leadsRoutes);
router.use("/locations", locationsRoutes);
router.use("/media", mediaRoutes);
router.use("/properties", propertiesRoutes);
router.use("/recruitment", recruitmentRoutes);
router.use("/search", searchRoutes);
router.use("/social-media", socialMediaRoutes);

// ============================================
// API DOCUMENTATION
// ============================================

/**
 * API ROUTES STRUCTURE
 * =====================
 *
 * EVENTS & REGISTRATIONS
 * ----------------------
 * POST   /api/events/registrations
 * GET    /api/events/registrations
 * GET    /api/events/registrations/:id
 * POST   /api/events/checkin
 * POST   /api/events/checkin/manual/:id
 * POST   /api/events/checkout/manual/:id
 * GET    /api/events/checkin/today
 * POST   /api/events/slots
 * DELETE /api/events/slots
 * GET    /api/events/slots/available/:date
 * GET    /api/events/slots/bookings
 * POST   /api/events/special/inauguration
 * POST   /api/events/special/networking
 * POST   /api/events/special/onsite
 * POST   /api/events/special/children
 * POST   /api/events/registrations/:id/feedback
 * PATCH  /api/events/registrations/:id/assign
 * GET    /api/events/statistics/attendance
 * GET    /api/events/statistics/checkins
 * POST   /api/events/campaigns/:campaign/registrations
 * GET    /api/events/campaigns/:campaign/registrations
 * GET    /api/events/campaigns
 *
 * FEEDBACK
 * --------
 * POST   /api/feedback
 * POST   /api/feedback/kiosk
 * POST   /api/feedback/trade-show
 * GET    /api/feedback
 * GET    /api/feedback/type/:type
 * GET    /api/feedback/nps
 * GET    /api/feedback/satisfaction
 * GET    /api/feedback/positive
 * GET    /api/feedback/negative
 * GET    /api/feedback/statistics
 *
 * FORMS
 * -----
 * POST   /api/forms/contact
 * POST   /api/forms/contact/popup
 * POST   /api/forms/children/register
 * GET    /api/forms/children/registrations
 * POST   /api/forms/kiosk/feedback
 * GET    /api/forms/kiosk/feedback
 * GET    /api/forms/contacts
 * PATCH  /api/forms/contacts/:id/status
 * GET    /api/forms/statistics/overview
 *
 * LAND SUBMISSIONS
 * ----------------
 * POST   /api/land/submissions
 * GET    /api/land/submissions
 * GET    /api/land/submissions/:id
 * PATCH  /api/land/submissions/:id
 * GET    /api/land/statistics
 *
 * LEADS
 * -----
 * POST   /api/leads/appointments/request
 * GET    /api/leads/appointments
 * GET    /api/leads/appointments/pending
 * PATCH  /api/leads/appointments/:id/status
 * POST   /api/leads/catalogs/request
 * GET    /api/leads/catalogs
 * POST   /api/leads/inquiries/submit
 * GET    /api/leads/inquiries
 * PATCH  /api/leads/inquiries/:id/assign
 * PATCH  /api/leads/inquiries/:id/status
 * GET    /api/leads/statistics/overview
 * GET    /api/leads/pipeline/metrics
 *
 * LOCATIONS
 * ---------
 * GET    /api/locations
 * GET    /api/locations/hierarchy
 * GET    /api/locations/:identifier
 * GET    /api/locations/:id/children
 * GET    /api/locations/:id/parents
 *
 * MEDIA
 * -----
 * GET    /api/media/blog
 * GET    /api/media/blog/:slug
 * GET    /api/media/blog/category/:category
 * GET    /api/media/blog/tag/:tag
 * GET    /api/media/blog/search
 * GET    /api/media/projects/:projectId
 * GET    /api/media/projects/:projectId/photos
 * GET    /api/media/projects/:projectId/floor-plans
 * GET    /api/media/projects/:projectId/virtual-tours
 * GET    /api/media/apartments/:apartmentId
 * GET    /api/media/commercial/:propertyId
 * GET    /api/media/statistics
 *
 * PROPERTIES
 * ----------
 * GET    /api/properties/projects
 * GET    /api/properties/projects/featured
 * GET    /api/properties/projects/:identifier
 * POST   /api/properties/projects
 * PUT    /api/properties/projects/:id
 * PATCH  /api/properties/projects/:id
 * DELETE /api/properties/projects/:id
 * GET    /api/properties/projects/:id/features
 * POST   /api/properties/projects/:id/features
 * DELETE /api/properties/projects/:id/features/:featureId
 * GET    /api/properties/apartments
 * GET    /api/properties/apartments/available
 * GET    /api/properties/apartments/:id
 * GET    /api/properties/commercial
 * GET    /api/properties/commercial/featured
 * GET    /api/properties/commercial/:slug
 * GET    /api/properties/metadata/locations
 * GET    /api/properties/metadata/typologies
 *
 * RECRUITMENT
 * -----------
 * POST   /api/recruitment/apply
 * GET    /api/recruitment/applications
 * GET    /api/recruitment/applications/new
 * GET    /api/recruitment/applications/:id
 * PATCH  /api/recruitment/applications/:id/status
 * POST   /api/recruitment/applications/:id/interview
 * POST   /api/recruitment/applications/:id/notes
 * GET    /api/recruitment/interviews/upcoming
 * GET    /api/recruitment/statistics
 *
 * SEARCH
 * ------
 * GET    /api/search
 * GET    /api/search/realtime
 * GET    /api/search/popular
 * GET    /api/search/suggestions
 * GET    /api/search/health
 *
 * SOCIAL MEDIA
 * ------------
 * GET    /api/social-media/youtube-shorts
 * GET    /api/social-media/youtube-videos
 * DELETE /api/social-media/youtube-shorts/cache
 * GET    /api/social-media/youtube-shorts/cache-status
 */

export default router;
