// ============================================
// src/routes/feedback.routes.ts
// ============================================
import { Router } from "express";
import feedbackController from "@/controllers/feedback.controller";

const router = Router();

// ============================================
// FEEDBACK SUBMISSION
// ============================================
router.post("/", feedbackController.submitFeedback);
router.post("/kiosk", feedbackController.submitKioskFeedback);
router.post("/trade-show", feedbackController.submitTradeShowFeedback);

// ============================================
// FEEDBACK RETRIEVAL
// ============================================
router.get("/", feedbackController.getAllFeedback);
router.get("/type/:type", feedbackController.getFeedbackByType);
router.get("/positive", feedbackController.getPositiveFeedback);
router.get("/negative", feedbackController.getNegativeFeedback);
router.get("/recent", feedbackController.getRecentFeedback);

// ============================================
// STATISTICS
// ============================================
router.get("/nps", feedbackController.getNPSStatistics);
router.get("/satisfaction", feedbackController.getAverageSatisfaction);
router.get("/statistics", feedbackController.getStatistics);

export default router;
