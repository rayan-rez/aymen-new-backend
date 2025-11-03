// ============================================
// src/routes/forms.routes.ts
// ============================================
import { Router } from "express";
import formsController from "@/controllers/legacy/form.controller";
import {
  validateContactForm,
  sanitizeContactForm,
} from "@middlewares/validation.middleware";

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
// ADMIN OPERATIONS
// ============================================
router.get("/contacts", formsController.getAllContacts);
router.patch("/contacts/:id/status", formsController.updateContactStatus);
router.post("/contacts/:id/notes", formsController.addContactNotes);
router.get("/statistics/contacts", formsController.getContactStatistics);

export default router;
