// ============================================
// src/routes/search.routes.ts
// ============================================
import { Router } from "express";
import searchController from "@/controllers/search.controller";

const router = Router();

// ============================================
// SEARCH
// ============================================
router.get("/realtime", searchController.realtimeSearch);
router.get("/", searchController.fullSearch);
router.get("/popular", searchController.getPopularSearches);
router.get("/suggestions", searchController.getSuggestions);
router.get("/health", searchController.healthCheck);

export default router;
