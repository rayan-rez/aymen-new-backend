/**
 * API Routes aggregator
 * Combines all route modules into a single router
 */

import { Router } from "express";

/**
 * Main API router
 * All routes should be mounted under /api
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
 * - POST   /api/contacts              - Submit contact form
 * - GET    /api/contacts              - Get all contact forms (admin)
 * - GET    /api/contacts/:id          - Get specific contact form (admin)
 * - PATCH  /api/contacts/:id/status   - Update contact status (admin)
 *
 * Properties:
 * - GET    /api/properties            - List all properties (with filters)
 * - GET    /api/properties/:id        - Get specific property
 * - GET    /api/properties/featured   - Get featured properties
 * - POST   /api/properties            - Create property (admin)
 * - PUT    /api/properties/:id        - Update property (admin)
 * - DELETE /api/properties/:id        - Delete property (admin)
 */

export default router;
