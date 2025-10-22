// ============================================
// src/routes/properties.routes.ts
// ============================================
import { Router } from "express";
import propertyController from "@/controllers/property.controller";

const router = Router();

// ============================================
// PROJECTS
// ============================================
router.get("/projects", propertyController.getAll);
router.get("/projects/featured", propertyController.getFeatured);
router.get("/projects/:identifier", propertyController.getOne);
router.post("/projects", propertyController.create);
router.put("/projects/:id", propertyController.update);
router.patch("/projects/:id", propertyController.updatePartial);
router.delete("/projects/:id", propertyController.delete);

// ============================================
// PROJECT FEATURES
// ============================================
router.get("/projects/:id/features", propertyController.getFeatures);
router.post("/projects/:id/features", propertyController.addFeature);
router.delete(
  "/projects/:id/features/:featureId",
  propertyController.removeFeature
);

// ============================================
// PROJECT MEDIA
// ============================================
router.get("/projects/:id/photos", propertyController.getPhotos);
router.get("/projects/:id/apartments", propertyController.getApartments);

// ============================================
// APARTMENTS
// ============================================
router.get("/apartments", propertyController.getAllApartments);
router.get("/apartments/available", propertyController.getAvailableApartments);
router.get("/apartments/:id", propertyController.getOneApartment);

// ============================================
// COMMERCIAL PROPERTIES
// ============================================
router.get("/commercial", propertyController.getAllCommercial);
router.get("/commercial/featured", propertyController.getFeaturedCommercial);
router.get("/commercial/:slug", propertyController.getOneCommercial);

// ============================================
// METADATA
// ============================================
router.get("/metadata/locations", propertyController.getLocations);
router.get("/metadata/typologies", propertyController.getTypologies);

export default router;
