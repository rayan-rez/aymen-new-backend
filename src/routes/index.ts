/**
 * API Routes aggregator
 * Combines all route modules into a single router
 */

import { Router } from "express";

/**
 * Main API router
 * All routes should be mounted under /api/v1
 */
const router = Router();

// ============================================
// Route modules
// ============================================

// Import route modules (to be created)
// import contactRoutes from "./contact.routes";
// import propertyRoutes from "./properties.routes";

// ============================================
// Mount routes
// ============================================

// Mount contact routes under /contacts
// router.use("/contacts", contactRoutes);

// Mount property routes under /properties
// router.use("/properties", propertyRoutes);

// ============================================
// Route documentation
// ============================================

/**
 * Available API endpoints:
 *
 * Contact Management:
 * - POST   /api/v1/contacts              - Submit contact form
 * - GET    /api/v1/contacts              - Get all contact forms (admin)
 * - GET    /api/v1/contacts/:id          - Get specific contact form (admin)
 * - PATCH  /api/v1/contacts/:id/status   - Update contact status (admin)
 *
 * Properties:
 * - GET    /api/v1/properties            - List all properties (with filters)
 * - GET    /api/v1/properties/:id        - Get specific property
 * - GET    /api/v1/properties/featured   - Get featured properties
 * - POST   /api/v1/properties            - Create property (admin)
 * - PUT    /api/v1/properties/:id        - Update property (admin)
 * - DELETE /api/v1/properties/:id        - Delete property (admin)
 */

export default router;
