/**
 * Lead Management Controller
 * Consolidates: contact, appointment, project-inquiry, catalog
 * Handles all lead capture and management operations
 *
 * @module controllers/lead-management.controller
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

class LeadManagementController {
  // ============================================
  // CONTACT FORMS
  // ============================================

  /**
   * Submit general contact form
   * @route POST /api/leads/contact
   * @access Public
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

    ApiResponse.created(res, { id: contact.id }, "Message sent successfully");
  };

  /**
   * Get all contact submissions
   * @route GET /api/leads/contacts
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
      sortBy,
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
   * Update contact status
   * @route PATCH /api/leads/contacts/:id/status
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

    ApiResponse.success(res, null, "Status updated successfully");
  };

  // ============================================
  // APPOINTMENTS
  // ============================================

  /**
   * Request property viewing appointment
   * @route POST /api/leads/appointments
   * @access Public
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

    // Anti-spam: Check for recent appointments
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
      {
        id: appointment.id,
        preferredDate: appointment.preferredDate,
        preferredTime: appointment.preferredTime,
      },
      "Appointment request submitted successfully"
    );
  };

  /**
   * Get all appointments
   * @route GET /api/leads/appointments
   * @access Private (Admin/Sales)
   */
  getAllAppointments = async (req: Request, res: Response): Promise<void> => {
    const {
      status,
      email,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
      sortBy,
      sortOrder = "desc",
    } = req.query;

    const appointments = await AppointmentRequestModel.findAll({
      status: status as AppointmentRequestStatus,
      email: email as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      page: Number(page),
      limit: Number(limit),
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    });

    ApiResponse.success(
      res,
      appointments,
      "Appointments retrieved successfully"
    );
  };

  /**
   * Update appointment status
   * @route PATCH /api/leads/appointments/:id/status
   * @access Private (Admin/Sales)
   */
  updateAppointmentStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(AppointmentRequestStatus).includes(status)) {
      ApiResponse.badRequest(res, "Valid status is required");
      return;
    }

    const updated = await AppointmentRequestModel.updateStatus(
      Number(id),
      status as AppointmentRequestStatus
    );

    if (!updated) {
      ApiResponse.notFound(res, "Appointment not found");
      return;
    }

    ApiResponse.success(res, null, "Status updated successfully");
  };

  // ============================================
  // PROJECT INQUIRIES
  // ============================================

  /**
   * Submit detailed project inquiry
   * @route POST /api/leads/inquiries
   * @access Public
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
   * Get all project inquiries
   * @route GET /api/leads/inquiries
   * @access Private (Admin/Sales)
   */
  getAllInquiries = async (req: Request, res: Response): Promise<void> => {
    const {
      projectId,
      status,
      assignedTo,
      financingMethod,
      purchaseTimeline,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
      sortBy,
      sortOrder = "desc",
    } = req.query;

    const inquiries = await ProjectInquiryModel.findAll({
      projectId: projectId ? Number(projectId) : undefined,
      status: status as ProjectInquiryStatus,
      assignedTo: assignedTo as string,
      financingMethod: financingMethod as FinancingMethod,
      purchaseTimeline: purchaseTimeline as PurchaseTimeline,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      page: Number(page),
      limit: Number(limit),
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
    });

    ApiResponse.success(res, inquiries, "Inquiries retrieved successfully");
  };

  /**
   * Assign inquiry to salesperson
   * @route PATCH /api/leads/inquiries/:id/assign
   * @access Private (Admin/Sales Manager)
   */
  assignInquiry = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      ApiResponse.badRequest(res, "Salesperson assignment required");
      return;
    }

    const updated = await ProjectInquiryModel.assign(Number(id), assignedTo);

    if (!updated) {
      ApiResponse.notFound(res, "Inquiry not found");
      return;
    }

    ApiResponse.success(res, null, "Inquiry assigned successfully");
  };

  // ============================================
  // CATALOG DOWNLOADS
  // ============================================

  /**
   * Request catalog download
   * @route POST /api/leads/catalog
   * @access Public
   */
  requestCatalogDownload = async (
    req: Request,
    res: Response
  ): Promise<void> => {
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
      "Catalog download request submitted successfully"
    );
  };

  /**
   * Get all catalog requests
   * @route GET /api/leads/catalog
   * @access Private (Admin)
   */
  getAllCatalogRequests = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const {
      email,
      projectId,
      catalogType,
      hasDownloaded,
      dateFrom,
      dateTo,
      page,
      limit,
    } = req.query;

    const requests = await CatalogDownloadRequestModel.findAll({
      email: email as string,
      projectId: projectId ? Number(projectId) : undefined,
      catalogType: catalogType as string,
      hasDownloaded: hasDownloaded === "true",
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    ApiResponse.success(res, requests, "Requests retrieved successfully");
  };

  // ============================================
  // STATISTICS & REPORTING
  // ============================================

  /**
   * Get lead statistics overview
   * @route GET /api/leads/statistics
   * @access Private (Admin/Sales Manager)
   */
  getLeadStatistics = async (req: Request, res: Response): Promise<void> => {
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
   * @access Private (Admin/Sales Manager)
   */
  getPipelineMetrics = async (req: Request, res: Response): Promise<void> => {
    const pipeline = await ProjectInquiryModel.getPipelineStatistics();

    ApiResponse.success(
      res,
      pipeline,
      "Pipeline metrics retrieved successfully"
    );
  };
}

export default new LeadManagementController();
