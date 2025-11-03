// ============================================
// src/routes/leads.routes.ts
// ============================================
import { Router } from "express";
import leadsController from "@/controllers/legacy/lead.controller";

const router = Router();

// ============================================
// APPOINTMENTS
// ============================================
router.post("/appointments/request", leadsController.requestAppointment);
router.get("/appointments", leadsController.getAppointments);
router.get("/appointments/pending", leadsController.getPendingAppointments);
router.patch(
  "/appointments/:id/status",
  leadsController.updateAppointmentStatus
);

// ============================================
// CATALOG DOWNLOADS
// ============================================
router.post("/catalogs/request", leadsController.requestCatalog);
router.get("/catalogs", leadsController.getCatalogRequests);

// ============================================
// PROJECT INQUIRIES
// ============================================
router.post("/inquiries/submit", leadsController.submitInquiry);
router.get("/inquiries", leadsController.getInquiries);
router.patch("/inquiries/:id/assign", leadsController.assignInquiry);
router.patch("/inquiries/:id/status", leadsController.updateInquiryStatus);

// ============================================
// STATISTICS
// ============================================
router.get("/statistics/overview", leadsController.getStatisticsOverview);
router.get("/pipeline/metrics", leadsController.getPipelineMetrics);

export default router;
