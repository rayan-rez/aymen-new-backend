// ============================================
// src/routes/events.routes.ts
// ============================================
import { Router } from "express";
import eventController from "@/controllers/legacy/event.controller";

const router = Router();

// ============================================
// EVENT REGISTRATIONS
// ============================================
router.post("/registrations", eventController.register);
router.get("/registrations", eventController.getAll);
router.get("/registrations/:id", eventController.getOne);

// ============================================
// CHECK-IN/CHECK-OUT
// ============================================
router.post("/checkin", eventController.processCheckIn);
router.post("/checkin/manual/:id", eventController.manualCheckIn);
router.post("/checkout/manual/:id", eventController.manualCheckOut);
router.get("/checkin/today", eventController.getTodayCheckIns);

// ============================================
// TIME SLOTS
// ============================================
router.post("/slots", eventController.bookSlot);
router.delete("/slots", eventController.cancelSlot);
router.get("/slots/available/:date", eventController.getAvailableSlots);
router.get("/slots/bookings", eventController.getUserSlots);

// ============================================
// SPECIAL EVENTS
// ============================================
router.post("/special/inauguration", eventController.registerInauguration);
router.post("/special/networking", eventController.registerNetworking);
router.post("/special/onsite", eventController.registerOnsite);

// ============================================
// FEEDBACK
// ============================================
router.post("/registrations/:id/feedback", eventController.submitFeedback);

// ============================================
// ASSIGNMENT & STATISTICS
// ============================================
router.patch("/registrations/:id/assign", eventController.assignSalesperson);
router.get("/statistics/attendance", eventController.getAttendanceStats);
router.get("/statistics/checkins", eventController.getCheckInStats);

// ============================================
// INFLUENCER CAMPAIGNS
// ============================================
router.post(
  "/campaigns/:campaign/registrations",
  eventController.registerForCampaign
);
router.get(
  "/campaigns/:campaign/registrations",
  eventController.getCampaignRegistrations
);
router.get(
  "/campaigns/:campaign/registrations/:id",
  eventController.getCampaignRegistration
);
router.get("/campaigns", eventController.getAvailableCampaigns);
router.get(
  "/campaigns/:campaign/statistics",
  eventController.getCampaignStatistics
);

export default router;
