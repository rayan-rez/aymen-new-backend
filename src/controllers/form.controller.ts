/**
 * Unified Forms Controller
 * Consolidates all form submission endpoints:
 * - General contact forms
 * - Children activity registrations
 * - Kiosk feedback terminals
 * - Popup contact forms
 *
 * @module controllers/forms.controller
 */

import { Request, Response } from "express";
import { ApiResponse } from "@utils/response.util";
import { validateEmail, validatePhone } from "@utils/validators.util";
import {
  ContactSubmissionModel,
  LeadSourceModel,
  MarketingConsentModel,
  ContactSubmissionStatus,
  LeadType,
} from "@models";
import emailService from "@/services/email.service";
import db from "@/config/database";

/**
 * Unified Forms Controller class
 * Manages all form submission types in one place
 */
class FormsController {
  // ============================================
  // GENERAL CONTACT FORMS
  // ============================================

  /**
   * Submit general contact form
   * Standard contact form for inquiries
   *
   * @route POST /api/forms/contact
   * @access Public
   *
   * @example
   * POST /api/forms/contact
   * {
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "email": "john@example.com",
   *   "phone": "+213555123456",
   *   "subject": "General Inquiry",
   *   "message": "I would like more information..."
   * }
   */
  submitContactForm = async (req: Request, res: Response): Promise<void> => {
    const {
      firstName,
      lastName,
      email,
      phone,
      subject,
      message,
      // Tracking data
      utmSource,
      utmMedium,
      utmCampaign,
      sourcePage,
      referrer,
    } = req.body;

    try {
      // Validate required fields
      if (!email || !message) {
        ApiResponse.badRequest(res, "Email and message are required");
        return;
      }

      if (!validateEmail(email)) {
        ApiResponse.badRequest(res, "Invalid email format");
        return;
      }

      // Create contact submission
      const contact = await ContactSubmissionModel.create({
        firstName: firstName || null,
        lastName: lastName || null,
        email: email.toLowerCase(),
        phone: phone || null,
        subject: subject || null,
        message,
        sourcePage: sourcePage || null,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        referrer: referrer || null,
      });

      // Track lead source (async)
      LeadSourceModel.create({
        leadEmail: email.toLowerCase(),
        leadType: LeadType.CONTACT_FORM,
        leadReferenceId: contact.id,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        referrerUrl: referrer || null,
        landingPageUrl: sourcePage || null,
        sourceIp: req.ip || null,
        userAgent: req.get("user-agent") || null,
      }).catch((err) => console.error("Error tracking lead:", err));

      // Send email notification (async)
      emailService
        .sendContactForm({
          name: `${firstName || ""} ${lastName || ""}`.trim() || email,
          email,
          phone: phone || "Not provided",
          message,
        })
        .catch((err) => console.error("Error sending email:", err));

      ApiResponse.created(
        res,
        { id: contact.id },
        "Contact form submitted successfully"
      );
    } catch (error) {
      console.error("Error in submitContactForm:", error);
      ApiResponse.error(res, "Failed to submit contact form", 500);
    }
  };

  /**
   * Submit popup contact form
   * Includes marketing consent and additional fields
   *
   * @route POST /api/forms/contact/popup
   * @access Public
   *
   * @example
   * POST /api/forms/contact/popup
   * {
   *   "firstName": "Jane",
   *   "lastName": "Smith",
   *   "email": "jane@example.com",
   *   "phone": "+213555987654",
   *   "interest": "Buying Property",
   *   "acceptedTerms": true,
   *   "emailConsent": true,
   *   "smsConsent": false
   * }
   */
  submitPopupContact = async (req: Request, res: Response): Promise<void> => {
    const {
      firstName,
      lastName,
      email,
      phone,
      interest,
      propertyType,
      comments,
      acceptedTerms,
      emailConsent,
      smsConsent,
      // Tracking
      utmSource,
      utmMedium,
      utmCampaign,
    } = req.body;

    try {
      // Validate required fields
      if (!firstName || !lastName || !email || !phone || !acceptedTerms) {
        ApiResponse.badRequest(
          res,
          "Required fields missing or terms not accepted"
        );
        return;
      }

      if (!validateEmail(email)) {
        ApiResponse.badRequest(res, "Invalid email format");
        return;
      }

      if (!validatePhone(phone)) {
        ApiResponse.badRequest(res, "Invalid phone format");
        return;
      }

      // Create contact submission
      const contact = await ContactSubmissionModel.create({
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        subject: interest || "Popup Contact",
        message:
          comments || `Interest: ${interest}\nProperty Type: ${propertyType}`,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
      });

      // Track marketing consent (async)
      if (emailConsent || smsConsent) {
        MarketingConsentModel.upsertConsent(
          email.toLowerCase(),
          {
            email: emailConsent || false,
            sms: smsConsent || false,
            phone: false,
          },
          "popup-form"
        ).catch((err) => console.error("Error tracking consent:", err));
      }

      ApiResponse.created(
        res,
        { id: contact.id },
        "Contact submitted successfully"
      );
    } catch (error) {
      console.error("Error in submitPopupContact:", error);
      ApiResponse.error(res, "Failed to submit popup contact", 500);
    }
  };

  // ============================================
  // ADMIN OPERATIONS
  // ============================================

  /**
   * Get all contact submissions
   *
   * @route GET /api/forms/contacts
   * @access Private (Admin)
   */
  getAllContacts = async (req: Request, res: Response): Promise<void> => {
    const {
      status,
      email,
      utmSource,
      utmCampaign,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
      sortBy = "created_at",
      sortOrder = "desc",
    } = req.query;

    try {
      const contacts = await ContactSubmissionModel.findAll({
        status: status as ContactSubmissionStatus,
        email: email as string,
        utmSource: utmSource as string,
        utmCampaign: utmCampaign as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      });

      ApiResponse.success(res, contacts, "Contacts retrieved successfully");
    } catch (error) {
      console.error("Error in getAllContacts:", error);
      ApiResponse.error(res, "Failed to retrieve contacts", 500);
    }
  };

  /**
   * Update contact status
   *
   * @route PATCH /api/forms/contacts/:id/status
   * @access Private (Admin)
   */
  updateContactStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, notes } = req.body;

    try {
      if (!status || !Object.values(ContactSubmissionStatus).includes(status)) {
        ApiResponse.badRequest(res, "Valid status is required");
        return;
      }

      const updated = await ContactSubmissionModel.updateStatus(
        Number(id),
        status as ContactSubmissionStatus,
        notes
      );

      if (!updated) {
        ApiResponse.notFound(res, "Contact not found");
        return;
      }

      ApiResponse.success(res, null, "Contact status updated successfully");
    } catch (error) {
      console.error("Error in updateContactStatus:", error);
      ApiResponse.error(res, "Failed to update contact status", 500);
    }
  };

  /**
   * Add notes to contact
   *
   * @route POST /api/forms/contacts/:id/notes
   * @access Private (Admin)
   */
  addContactNotes = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { notes } = req.body;

    try {
      if (!notes) {
        ApiResponse.badRequest(res, "Notes are required");
        return;
      }

      const updated = await ContactSubmissionModel.addNotes(Number(id), notes);

      if (!updated) {
        ApiResponse.notFound(res, "Contact not found");
        return;
      }

      ApiResponse.success(res, null, "Notes added successfully");
    } catch (error) {
      console.error("Error in addContactNotes:", error);
      ApiResponse.error(res, "Failed to add notes", 500);
    }
  };

  /**
   * Get contact statistics
   *
   * @route GET /api/forms/statistics/contacts
   * @access Private (Admin)
   */
  getContactStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await ContactSubmissionModel.getStatusStatistics();

      ApiResponse.success(res, stats, "Statistics retrieved successfully");
    } catch (error) {
      console.error("Error in getContactStatistics:", error);
      ApiResponse.error(res, "Failed to retrieve statistics", 500);
    }
  };

}

export default new FormsController();
