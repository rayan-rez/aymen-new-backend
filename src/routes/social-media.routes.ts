// ============================================
// src/routes/social-media.routes.ts
// ============================================
import { Router } from "express";
import socialMediaController from "@/controllers/legacy/social-media.controller";

const router = Router();

// ============================================
// YOUTUBE
// ============================================
router.get("/youtube-shorts", socialMediaController.getYouTubeShorts);
router.get("/youtube-videos", socialMediaController.getAllYouTubeVideos);
router.delete("/youtube-shorts/cache", socialMediaController.clearYouTubeCache);
router.get(
  "/youtube-shorts/cache-status",
  socialMediaController.getCacheStatus
);

export default router;
