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
import eventRoutes from "./event.routes";
// import locationRoutes from "./location.routes";
// import featureRoutes from "./feature.routes";
// import photoRoutes from "./photo.routes";
// import floorPlanRoutes from "./floor-plan.routes";
// import blogPostRoutes from "./blog-post.routes";
// import commercialPropertyRoutes from "./commercial-property.routes";
// import customerFeedbackRoutes from "./customer-feedback.routes";
import { formSubmissionRoutes, locationRoutes as locationFormRoutes } from "./form-submission.routes";

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
 * @returns {object} API information
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
      locations: "/api/locations",
      features: "/api/features",
      photos: "/api/photos",
      floorPlans: "/api/floor-plans",
      blogPosts: "/api/blog-posts",
      commercialProperties: "/api/commercial-properties",
      feedback: "/api/feedback",
      forms: "/api/forms",
    },
  });
});

// ============================================================================
// MOUNT ROUTE MODULES
// ============================================================================

// Apply rate limiting to all routes
router.use(apiLimiter);

// Core domain routes
router.use("/projects", projectRoutes);
router.use("/apartments", apartmentRoutes);
router.use("/events", eventRoutes);

// // Location & geography
// router.use("/locations", locationRoutes);

// // Features & amenities
// router.use("/features", featureRoutes);

// // Media routes (polymorphic)
// router.use("/photos", photoRoutes);
// router.use("/floor-plans", floorPlanRoutes);

// // Content management
// router.use("/blog-posts", blogPostRoutes);
// router.use("/commercial-properties", commercialPropertyRoutes);

// // Feedback & forms
// router.use("/feedback", customerFeedbackRoutes);
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