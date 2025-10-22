// ============================================
// src/routes/media.routes.ts
// ============================================
import { Router } from "express";
import mediaController from "@/controllers/media.controller";

const router = Router();

// ============================================
// BLOG CONTENT
// ============================================
router.get("/blog", mediaController.getBlogPosts);
router.get("/blog/:slug", mediaController.getBlogPostBySlug);
router.get("/blog/category/:category", mediaController.getBlogPostsByCategory);
router.get("/blog/tag/:tag", mediaController.getBlogPostsByTag);
router.get("/blog/search", mediaController.searchBlogPosts);

// ============================================
// PROJECT MEDIA
// ============================================
router.get("/projects/:projectId", mediaController.getProjectMedia);
router.get("/projects/:projectId/photos", mediaController.getProjectPhotos);
router.get(
  "/projects/:projectId/floor-plans",
  mediaController.getProjectFloorPlans
);
router.get(
  "/projects/:projectId/virtual-tours",
  mediaController.getProjectVirtualTours
);

// ============================================
// APARTMENT MEDIA
// ============================================
router.get("/apartments/:apartmentId", mediaController.getApartmentMedia);
router.get(
  "/apartments/:apartmentId/photos",
  mediaController.getApartmentPhotos
);

// ============================================
// COMMERCIAL PROPERTY MEDIA
// ============================================
router.get("/commercial/:propertyId", mediaController.getCommercialMedia);

// ============================================
// BULK QUERIES (Admin)
// ============================================
router.get("/photos/all", mediaController.getAllPhotos);
router.get("/statistics", mediaController.getMediaStatistics);

export default router;
