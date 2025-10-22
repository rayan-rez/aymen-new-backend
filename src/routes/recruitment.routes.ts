// ============================================
// src/routes/recruitment.routes.ts
// ============================================
import { Router } from "express";
import recruitmentController from "@/controllers/recruitement.controller";

const router = Router();

// ============================================
// JOB APPLICATIONS
// ============================================
router.post("/apply", recruitmentController.submitApplication);
router.get("/applications", recruitmentController.getAllApplications);
router.get("/applications/new", recruitmentController.getNewApplications);
router.get("/applications/:id", recruitmentController.getApplicationById);
router.get(
  "/applications/position/:position",
  recruitmentController.getApplicationsByPosition
);

// ============================================
// APPLICATION MANAGEMENT
// ============================================
router.patch(
  "/applications/:id/status",
  recruitmentController.updateApplicationStatus
);
router.post(
  "/applications/:id/interview",
  recruitmentController.scheduleInterview
);
router.post("/applications/:id/notes", recruitmentController.addNotes);

// ============================================
// INTERVIEWS
// ============================================
router.get("/interviews/upcoming", recruitmentController.getUpcomingInterviews);

// ============================================
// STATISTICS
// ============================================
router.get("/statistics", recruitmentController.getStatistics);

export default router;
