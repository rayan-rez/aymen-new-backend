/**
 * Main Routes Index
 * Central router that combines all application routes
 *
 * @module routes/index
 */

import { Router } from "express";
import { apiLimiter } from "@/middlewares/rate-limit.middleware";

// Import route modules
import projectRoutes from "./project.routes";
import apartmentRoutes from "./apartment.routes";
import locationRoutes from "./location.routes";
import featureRoutes from "./feature.routes";
import photoRoutes from "./photo.routes";
import { formSubmissionRoutes } from "./form-submission.routes";


const router = Router();

// ============================================================================
// API HEALTH CHECK
// ============================================================================

/**
 * @route   GET /api/health
 * @desc    Health check endpoint - verifies API is running
 * @access  Public
 * @returns {object} API status and timestamp
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

/**
 * @route   GET /api
 * @desc    API root endpoint - provides basic API information
 * @access  Public
 * @returns {object} API information and available endpoints
 */
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Aymen Real Estate API",
    version: "1.0.0",
    documentation: "/api/docs",
    endpoints: {
      projects: "/api/projects",
      apartments: "/api/apartments",
      events: "/api/events",
      eventRegistrations: "/api/event-registrations",
      eventInfluencers: "/api/event-influencers",
      locations: "/api/locations",
      features: "/api/features",
      photos: "/api/photos",
      floorPlans: "/api/floor-plans",
      blogPosts: "/api/blog-posts",
      commercialProperties: "/api/commercial-properties",
      feedback: "/api/feedback",
      forms: "/api/forms",
      leads: "/api/leads",
    },
  });
});

// ============================================================================
// MOUNT ROUTE MODULES
// ============================================================================

// Apply global rate limiting to all routes
router.use(apiLimiter);

// Core domain routes
router.use("/projects", projectRoutes);
router.use("/apartments", apartmentRoutes);

// Location & geography
router.use("/locations", locationRoutes);

// Features & amenities
router.use("/features", featureRoutes);

// Media routes (polymorphic)
router.use("/photos", photoRoutes);

// Feedback & forms
router.use("/forms", formSubmissionRoutes);

// ============================================================================
// 404 HANDLER
// ============================================================================

/**
 * @route   * (catch-all)
 * @desc    Handles all undefined routes
 * @access  Public
 * @returns {object} 404 error message
 */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

export default router;
