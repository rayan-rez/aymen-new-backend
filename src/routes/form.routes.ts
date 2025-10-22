// ============================================
// src/routes/forms.routes.ts
// ============================================
import { Router } from "express";
import formsController from "@/controllers/form.controller";
import {
  validateContactForm,
  sanitizeContactForm,
} from "@/middlewares/validation.middleware";

const router = Router();

// ============================================
// GENERAL CONTACT FORMS
// ============================================
router.post(
  "/contact",
  sanitizeContactForm,
  validateContactForm,
  formsController.submitContactForm
);
router.post("/contact/popup", formsController.submitPopupContact);

// ============================================
// CHILDREN ACTIVITY
// ============================================
router.post("/children/register", formsController.registerChildActivity);
router.get("/children/registrations", formsController.getChildRegistrations);
router.get("/children/statistics", formsController.getChildActivityStatistics);

// ============================================
// BATIMATEC TRADE SHOW
// ============================================
router.post("/batimatec/inquiry", formsController.submitBatimatecInquiry);
router.post("/batimatec/feedback", formsController.submitBatimatecFeedback);
router.post("/batimatec/interest", formsController.submitBatimatecInterest);
router.post("/batimatec/promoter", formsController.submitPromoterEvaluation);

router.get("/batimatec/inquiries", formsController.getBatimatecInquiries);
router.get("/batimatec/feedback", formsController.getAllBatimatecFeedback);
router.get("/batimatec/interests", formsController.getAllBatimatecInterests);
router.get("/batimatec/promoters", formsController.getAllPromoterEvaluations);

// ============================================
// KIOSK FEEDBACK
// ============================================
router.post("/kiosk/feedback", formsController.submitKioskFeedback);
router.get("/kiosk/feedback", formsController.getKioskFeedback);
router.get("/kiosk/statistics", formsController.getKioskStatistics);

// ============================================
// ADMIN OPERATIONS
// ============================================
router.get("/contacts", formsController.getAllContacts);
router.patch("/contacts/:id/status", formsController.updateContactStatus);
router.post("/contacts/:id/notes", formsController.addContactNotes);
router.get("/statistics/contacts", formsController.getContactStatistics);
router.get("/statistics/overview", formsController.getOverviewStatistics);

export default router;
