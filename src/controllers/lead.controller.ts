/**
 * ============================================
 * LEADS CONTROLLER (UNIFIED)
 * ============================================
 * Consolidates: appointments, catalogs, project inquiries
 *
 * Routes:
 * - POST   /api/leads/appointments/request
 * - GET    /api/leads/appointments
 * - PATCH  /api/leads/appointments/:id/status
 *
 * - POST   /api/leads/catalogs/request
 * - GET    /api/leads/catalogs
 *
 * - POST   /api/leads/inquiries/submit
 * - GET    /api/leads/inquiries
 * - PATCH  /api/leads/inquiries/:id/assign
 *
 * - GET    /api/leads/statistics/overview
 * - GET    /api/leads/pipeline/metrics
 */
import { Request, Response } from "express";
import {
  AppointmentRequestModel,
  CatalogDownloadRequestModel,
  ProjectInquiryModel,
  LeadSourceModel,
  MarketingConsentModel,
  ProjectModel,
} from "@models";
import {
  AppointmentRequestStatus,
  ProjectInquiryStatus,
  FinancingMethod,
  PurchaseTimeline,
  LeadType,
} from "@models";
import { ApiResponse } from "@utils/response.util";
import { BLOCKED_EMAIL_DOMAINS } from "@constants/app.constants";

class LeadsController {
  // ============================================
  // APPOINTMENTS
  // ============================================
  /**
   * @route POST /api/leads/appointments/request
   * @desc Request a property viewing appointment
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

    // Anti-spam check (72 hours cooldown)
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
      { id: appointment.id, fullName: appointment.fullName },
      "Appointment request submitted successfully"
    );
  };
  /**
   * @route GET /api/leads/appointments
   * @desc Get all appointments with filters
   * @access Private (Admin/Sales)
   */
  getAppointments = async (req: Request, res: Response): Promise<void> => {
    const {
      status,
      email,
      preferredDate,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
    } = req.query;

    const appointments = await AppointmentRequestModel.findAll({
      status: status as AppointmentRequestStatus,
      email: email as string,
      preferredDate: preferredDate
        ? new Date(preferredDate as string)
        : undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      page: Number(page),
      limit: Number(limit),
    });

    ApiResponse.success(
      res,
      appointments,
      "Appointments retrieved successfully"
    );
  };
  /**
   * @route GET /api/leads/appointments/pending
   * @desc Get pending appointments
   * @access Private (Admin/Sales)
   */
  getPendingAppointments = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { limit = 20 } = req.query;
    const appointments = await AppointmentRequestModel.getPending(
      Number(limit)
    );
    ApiResponse.success(res, appointments, "Pending appointments retrieved");
  };

  /**
   * @route PATCH /api/leads/appointments/:id/status
   * @desc Update appointment status
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

    ApiResponse.success(res, null, "Appointment status updated");
  };
  // ============================================
  // CATALOG DOWNLOADS
  // ============================================
  /**
   * @route POST /api/leads/catalogs/request
   * @desc Request catalog download
   * @access Public
   */
  requestCatalog = async (req: Request, res: Response): Promise<void> => {
    const {
      fullName,
      email,
      phone,
      catalogType,
      projectId,
      marketingConsent = false,
      utmSource,
      utmMedium,
      utmCampaign,
    } = req.body;

    if (!fullName || !email || !phone) {
      ApiResponse.badRequest(res, "Name, email and phone are required");
      return;
    }

    const emailDomain = email.split("@")[1]?.toLowerCase();
    if (emailDomain && BLOCKED_EMAIL_DOMAINS.includes(emailDomain)) {
      ApiResponse.badRequest(res, "Disposable email addresses not allowed");
      return;
    }

    const existing = await CatalogDownloadRequestModel.findByEmail(
      email.toLowerCase()
    );

    if (existing.length > 0) {
      ApiResponse.conflict(res, "You have already requested a catalog");
      return;
    }

    const request = await CatalogDownloadRequestModel.create({
      fullName,
      email: email.toLowerCase(),
      phone,
      catalogType: catalogType || null,
      projectId: projectId ? Number(projectId) : null,
      marketingConsent,
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

    ApiResponse.created(res, { id: request.id }, "Catalog request submitted");
  };
  /**
   * @route GET /api/leads/catalogs
   * @desc Get all catalog requests
   * @access Private (Admin)
   */
  getCatalogRequests = async (req: Request, res: Response): Promise<void> => {
    const { email, projectId, page = 1, limit = 50 } = req.query;

    const requests = await CatalogDownloadRequestModel.findAll({
      email: email as string,
      projectId: projectId ? Number(projectId) : undefined,
      page: Number(page),
      limit: Number(limit),
    });

    ApiResponse.success(res, requests, "Catalog requests retrieved");
  };
  // ============================================
  // PROJECT INQUIRIES
  // ============================================
  /**
   * @route POST /api/leads/inquiries/submit
   * @desc Submit detailed project inquiry
   * @access Public
   */
  submitInquiry = async (req: Request, res: Response): Promise<void> => {
    const {
      projectId,
      projectSlug,
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
      ApiResponse.badRequest(res, "Terms must be accepted");
      return;
    }

    let resolvedProjectId = projectId;
    if (!resolvedProjectId && projectSlug) {
      const project = await ProjectModel.findBySlug(projectSlug);
      resolvedProjectId = project?.id || null;
    }

    const inquiry = await ProjectInquiryModel.create({
      projectId: resolvedProjectId,
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

    ApiResponse.created(res, { id: inquiry.id }, "Inquiry submitted");
  };
  /**
   * @route GET /api/leads/inquiries
   * @desc Get all inquiries with filters
   * @access Private (Admin/Sales)
   */
  getInquiries = async (req: Request, res: Response): Promise<void> => {
    const {
      projectId,
      status,
      assignedTo,
      financingMethod,
      purchaseTimeline,
      page = 1,
      limit = 50,
    } = req.query;

    const inquiries = await ProjectInquiryModel.findAll({
      projectId: projectId ? Number(projectId) : undefined,
      status: status as ProjectInquiryStatus,
      assignedTo: assignedTo as string,
      financingMethod: financingMethod as FinancingMethod,
      purchaseTimeline: purchaseTimeline as PurchaseTimeline,
      page: Number(page),
      limit: Number(limit),
    });

    ApiResponse.success(res, inquiries, "Inquiries retrieved");
  };
  /**
   * @route PATCH /api/leads/inquiries/:id/assign
   * @desc Assign inquiry to salesperson
   * @access Private (Admin/Sales Manager)
   */
  assignInquiry = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      ApiResponse.badRequest(res, "Salesperson required");
      return;
    }

    const updated = await ProjectInquiryModel.assign(Number(id), assignedTo);

    if (!updated) {
      ApiResponse.notFound(res, "Inquiry not found");
      return;
    }

    ApiResponse.success(res, null, "Inquiry assigned");
  };
  /**
   * @route PATCH /api/leads/inquiries/:id/status
   * @desc Update inquiry status
   * @access Private (Admin/Sales)
   */
  updateInquiryStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(ProjectInquiryStatus).includes(status)) {
      ApiResponse.badRequest(res, "Valid status required");
      return;
    }

    const updated = await ProjectInquiryModel.updateStatus(
      Number(id),
      status as ProjectInquiryStatus
    );

    if (!updated) {
      ApiResponse.notFound(res, "Inquiry not found");
      return;
    }

    ApiResponse.success(res, null, "Status updated");
  };
  // ============================================
  // UNIFIED ANALYTICS
  // ============================================
  /**
   * @route GET /api/leads/statistics/overview
   * @desc Get statistics across all lead types
   * @access Private (Admin/Manager)
   */
  getStatisticsOverview = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const [appointmentStats, catalogStats, inquiryStats] = await Promise.all([
      AppointmentRequestModel.getStatusStatistics(),
      CatalogDownloadRequestModel.getDownloadStatistics(),
      ProjectInquiryModel.getStatusStatistics(),
    ]);

    ApiResponse.success(
      res,
      {
        appointments: appointmentStats,
        catalogs: catalogStats,
        inquiries: inquiryStats,
      },
      "Statistics retrieved"
    );
  };
  /**
   * @route GET /api/leads/pipeline/metrics
   * @desc Get sales pipeline metrics
   * @access Private (Admin/Sales Manager)
   */
  getPipelineMetrics = async (req: Request, res: Response): Promise<void> => {
    const pipeline = await ProjectInquiryModel.getPipelineStatistics();
    ApiResponse.success(res, pipeline, "Pipeline metrics retrieved");
  };
}

export default new LeadsController();
