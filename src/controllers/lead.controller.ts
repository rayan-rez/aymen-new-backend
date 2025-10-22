/**
 * Unified Leads Controller
 * Handles ALL lead capture: contacts, appointments, inquiries, catalog downloads
 *
 * REPLACES: lead-management.controller.ts (remove this file)
 * INTEGRATES WITH: appointment.controller.ts, project-inquiry.controller.ts, catalog.controller.ts
 * (Keep the individual files above for detailed functionality, this provides unified access)
 *
 * Routes:
 * - POST   /api/leads/contact         - Submit contact form
 * - POST   /api/leads/appointment     - Request appointment
 * - POST   /api/leads/inquiry         - Submit project inquiry
 * - POST   /api/leads/catalog         - Request catalog download
 * - GET    /api/leads                 - Get all leads (unified view)
 * - GET    /api/leads/statistics      - Get lead statistics
 * - GET    /api/leads/pipeline        - Get sales pipeline
 */

import { Request, Response } from "express";
import {
  ContactSubmissionModel,
  AppointmentRequestModel,
  ProjectInquiryModel,
  CatalogDownloadRequestModel,
  LeadSourceModel,
  MarketingConsentModel,
  ContactSubmissionStatus,
  AppointmentRequestStatus,
  ProjectInquiryStatus,
  LeadType,
  FinancingMethod,
  PurchaseTimeline,
} from "@models";
import { ApiResponse } from "@utils/response.util";
import { validateEmail, validatePhone } from "@utils/validators.util";
import emailService from "@/services/email.service";

class LeadsController {
  // ============================================
  // LEAD SUBMISSION ENDPOINTS
  // ============================================

  /**
   * Submit general contact form
   * @route POST /api/leads/contact
   */
  submitContact = async (req: Request, res: Response): Promise<void> => {
    const {
      firstName,
      lastName,
      email,
      phone,
      subject,
      message,
      utmSource,
      utmMedium,
      utmCampaign,
      sourcePage,
      referrer,
    } = req.body;

    if (!email || !message) {
      ApiResponse.badRequest(res, "Email and message are required");
      return;
    }

    if (!validateEmail(email)) {
      ApiResponse.badRequest(res, "Invalid email format");
      return;
    }

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
      "Contact submitted successfully"
    );
  };

  /**
   * Request property viewing appointment
   * @route POST /api/leads/appointment
   */
  requestAppointment = async (req: Request, res: Response): Promise<void> => {
    const {
      fullName,
      email,
      phone,
      preferredLocation,
      budgetRange,
      preferredDate,
      preferredTime,
      notes,
      utmSource,
      utmMedium,
      utmCampaign,
    } = req.body;

    if (!fullName || !email || !phone) {
      ApiResponse.badRequest(res, "Name, email and phone are required");
      return;
    }

    // Anti-spam check
    const recentAppointments = await AppointmentRequestModel.findByEmail(
      email.toLowerCase()
    );

    if (recentAppointments.length > 0) {
      const lastAppointment = recentAppointments[0];
      const hoursSince =
        (Date.now() - lastAppointment.createdAt.getTime()) / (1000 * 60 * 60);

      if (hoursSince < 72) {
        ApiResponse.badRequest(
          res,
          "You already have a pending appointment. Please wait 72 hours."
        );
        return;
      }
    }

    const appointment = await AppointmentRequestModel.create({
      fullName,
      email: email.toLowerCase(),
      phone,
      preferredLocation: preferredLocation || null,
      budgetRange: budgetRange || null,
      preferredDate: preferredDate ? new Date(preferredDate) : null,
      preferredTime: preferredTime || null,
      notes: notes || null,
    });

    LeadSourceModel.create({
      leadEmail: email.toLowerCase(),
      leadType: LeadType.APPOINTMENT,
      leadReferenceId: appointment.id,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      sourceIp: req.ip || null,
      userAgent: req.get("user-agent") || null,
    }).catch((err) => console.error("Error tracking lead:", err));

    ApiResponse.created(
      res,
      { id: appointment.id },
      "Appointment request submitted successfully"
    );
  };

  /**
   * Submit detailed project inquiry
   * @route POST /api/leads/inquiry
   */
  submitInquiry = async (req: Request, res: Response): Promise<void> => {
    const {
      projectId,
      firstName,
      lastName,
      email,
      phone,
      country,
      stateProvince,
      city,
      profession,
      budgetRange,
      financingMethod,
      interestTypes,
      propertyTypes,
      preferredLocations,
      preferredContactDay,
      preferredContactTime,
      purchaseTimeline,
      acceptedTerms,
      marketingConsent,
      utmSource,
      utmMedium,
      utmCampaign,
    } = req.body;

    if (!firstName || !lastName || !email || !phone || !country) {
      ApiResponse.badRequest(res, "Required contact information missing");
      return;
    }

    if (!acceptedTerms) {
      ApiResponse.badRequest(res, "Terms and conditions must be accepted");
      return;
    }

    const inquiry = await ProjectInquiryModel.create({
      projectId: projectId || null,
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      country,
      stateProvince: stateProvince || null,
      city: city || null,
      profession: profession || null,
      budgetRange: budgetRange || null,
      financingMethod: (financingMethod as FinancingMethod) || null,
      interestTypes: interestTypes || null,
      propertyTypes: propertyTypes || null,
      preferredLocations: preferredLocations || null,
      preferredContactDay: preferredContactDay || null,
      preferredContactTime: preferredContactTime || null,
      purchaseTimeline: (purchaseTimeline as PurchaseTimeline) || null,
      acceptedTerms: Boolean(acceptedTerms),
      marketingConsent: Boolean(marketingConsent),
    });

    LeadSourceModel.create({
      leadEmail: email.toLowerCase(),
      leadType: LeadType.PROJECT_INQUIRY,
      leadReferenceId: inquiry.id,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      sourceIp: req.ip || null,
      userAgent: req.get("user-agent") || null,
    }).catch((err) => console.error("Error tracking lead:", err));

    if (marketingConsent) {
      MarketingConsentModel.grantAllConsents(
        email.toLowerCase(),
        "project-inquiry"
      ).catch((err) => console.error("Error tracking consent:", err));
    }

    ApiResponse.created(
      res,
      { id: inquiry.id },
      "Inquiry submitted successfully"
    );
  };

  /**
   * Request catalog download
   * @route POST /api/leads/catalog
   */
  requestCatalog = async (req: Request, res: Response): Promise<void> => {
    const {
      fullName,
      email,
      phone,
      catalogType,
      projectId,
      marketingConsent,
      utmSource,
      utmMedium,
      utmCampaign,
    } = req.body;

    if (!fullName || !email || !phone) {
      ApiResponse.badRequest(res, "Name, email and phone are required");
      return;
    }

    const existing = await CatalogDownloadRequestModel.findByEmail(
      email.toLowerCase()
    );

    if (existing.length > 0) {
      ApiResponse.conflict(
        res,
        "You have already requested a catalog download"
      );
      return;
    }

    const request = await CatalogDownloadRequestModel.create({
      fullName,
      email: email.toLowerCase(),
      phone,
      catalogType: catalogType || null,
      projectId: projectId ? Number(projectId) : null,
      marketingConsent: Boolean(marketingConsent),
      downloadIp: req.ip || null,
    });

    LeadSourceModel.create({
      leadEmail: email.toLowerCase(),
      leadType: LeadType.CATALOG_DOWNLOAD,
      leadReferenceId: request.id,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      sourceIp: req.ip || null,
      userAgent: req.get("user-agent") || null,
    }).catch((err) => console.error("Error tracking lead:", err));

    if (marketingConsent) {
      MarketingConsentModel.grantAllConsents(
        email.toLowerCase(),
        "catalog-download"
      ).catch((err) => console.error("Error tracking consent:", err));
    }

    ApiResponse.created(
      res,
      { id: request.id },
      "Catalog request submitted successfully"
    );
  };

  // ============================================
  // UNIFIED LEAD MANAGEMENT
  // ============================================

  /**
   * Get all leads (unified view)
   * @route GET /api/leads
   */
  getAllLeads = async (req: Request, res: Response): Promise<void> => {
    const { type, status, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

    try {
      // This would need a custom query to join all lead tables
      // For now, return a TODO message
      ApiResponse.success(
        res,
        { message: "Unified leads view - to be implemented" },
        "Feature in development"
      );
    } catch (error) {
      console.error("Error in getAllLeads:", error);
      ApiResponse.error(res, "Failed to retrieve leads", 500);
    }
  };

  /**
   * Get lead statistics across all types
   * @route GET /api/leads/statistics
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    const [contactStats, appointmentStats, inquiryStats, catalogStats] =
      await Promise.all([
        ContactSubmissionModel.getStatusStatistics(),
        AppointmentRequestModel.getStatusStatistics(),
        ProjectInquiryModel.getStatusStatistics(),
        CatalogDownloadRequestModel.getDownloadStatistics(),
      ]);

    ApiResponse.success(
      res,
      {
        contacts: contactStats,
        appointments: appointmentStats,
        inquiries: inquiryStats,
        catalogDownloads: catalogStats,
      },
      "Statistics retrieved successfully"
    );
  };

  /**
   * Get sales pipeline metrics
   * @route GET /api/leads/pipeline
   */
  getPipeline = async (req: Request, res: Response): Promise<void> => {
    const pipeline = await ProjectInquiryModel.getPipelineStatistics();
    ApiResponse.success(
      res,
      pipeline,
      "Pipeline metrics retrieved successfully"
    );
  };
}

export default new LeadsController();
