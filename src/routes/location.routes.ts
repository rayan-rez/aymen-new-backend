// ============================================
// src/routes/locations.routes.ts
// ============================================
import { Router } from "express";
import locationController from "@controllers/location.controller";

const router = Router();

// ============================================
// LOCATIONS
// ============================================
router.get("/", locationController.getAll);
router.get("/hierarchy", locationController.getHierarchy);
router.get("/:identifier", locationController.getOne);
router.get("/:id/children", locationController.getChildren);
router.get("/:id/parents", locationController.getParents);

export default router;
