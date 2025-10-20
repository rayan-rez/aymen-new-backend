/**
 * Contact Controller
 * Handles general contact form submissions and inquiries
 *
 * @module controllers/contact.controller
 */

import { Request, Response } from "express";
import {
  ContactSubmissionModel,
  LeadSourceModel,
  MarketingConsentModel,
} from "@models";
import { ContactSubmissionStatus, LeadType } from "@models";
import { ApiResponse } from "@utils/response.util";
import emailService from "../services/email.service";

/**
 * Contact Controller class
 * Manages all contact form operations
 */
class ContactController {
  /**
   * Submit a general contact form
   * Creates contact submission and tracks lead source
   *
   * @route POST /api/contacts
   * @access Public
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

    // Validate required fields
    if (!email || !message) {
      ApiResponse.badRequest(res, "Email and message are required");
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

    // Track lead source asynchronously (don't block response)
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
    }).catch((err) => console.error("Error tracking lead source:", err));

    // Send email notification asynchronously
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
  };

  /**
   * Get all contact submissions
   * Admin endpoint with filtering and pagination
   *
   * @route GET /api/contacts
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
  };

  /**
   * Get new/unprocessed contacts
   *
   * @route GET /api/contacts/new
   * @access Private (Admin)
   */
  getNewContacts = async (req: Request, res: Response): Promise<void> => {
    const { limit = 10 } = req.query;

    const contacts = await ContactSubmissionModel.getNew(Number(limit));

    ApiResponse.success(res, contacts, "New contacts retrieved successfully");
  };

  /**
   * Get contact by ID
   *
   * @route GET /api/contacts/:id
   * @access Private (Admin)
   */
  getContactById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const contact = await ContactSubmissionModel.findById(Number(id));

    if (!contact) {
      ApiResponse.notFound(res, "Contact not found");
      return;
    }

    ApiResponse.success(res, contact, "Contact retrieved successfully");
  };

  /**
   * Update contact status
   *
   * @route PATCH /api/contacts/:id/status
   * @access Private (Admin)
   */
  updateContactStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, notes } = req.body;

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
  };

  /**
   * Add notes to contact
   *
   * @route POST /api/contacts/:id/notes
   * @access Private (Admin)
   */
  addContactNotes = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { notes } = req.body;

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
  };

  /**
   * Get contact statistics
   *
   * @route GET /api/contacts/statistics
   * @access Private (Admin)
   */
  getContactStatistics = async (req: Request, res: Response): Promise<void> => {
    const stats = await ContactSubmissionModel.getStatusStatistics();

    ApiResponse.success(res, stats, "Statistics retrieved successfully");
  };

  /**
   * Submit contact with popup form
   * Includes marketing consent and additional fields
   *
   * @route POST /api/contacts/popup
   * @access Public
   */
  submitPopupContact = async (req: Request, res: Response): Promise<void> => {
    const {
      firstName,
      lastName,
      email,
      phone,
      postalCode,
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

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !acceptedTerms) {
      ApiResponse.badRequest(
        res,
        "Required fields missing or terms not accepted"
      );
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

    // Track marketing consent
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
  };
}

export default new ContactController();
