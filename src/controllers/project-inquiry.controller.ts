/**
 * Project Inquiry Controller
 * Handles detailed project-specific inquiries with buyer profiling
 * Manages sales pipeline and lead tracking
 *
 * @module controllers/project-inquiry.controller
 */

import { Request, Response } from "express";
import {
  ProjectInquiryModel,
  LeadSourceModel,
  MarketingConsentModel,
  ProjectModel,
} from "@models";
import {
  ProjectInquiryStatus,
  FinancingMethod,
  PurchaseTimeline,
  LeadType,
} from "@models";
import { ApiResponse } from "@utils/response.util";

/**
 * Project Inquiry Controller class
 * Manages project inquiry submissions and sales pipeline
 */
class ProjectInquiryController {
  /**
   * Submit a project inquiry
   * Creates detailed inquiry with buyer profile
   *
   * @route POST /api/inquiries
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
      // Tracking
      utmSource,
      utmMedium,
      utmCampaign,
      referrer,
      sourcePage,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !country) {
      ApiResponse.badRequest(res, "Required contact information missing");
      return;
    }

    if (!acceptedTerms) {
      ApiResponse.badRequest(res, "Terms and conditions must be accepted");
      return;
    }

    // Resolve project ID from slug if provided
    let resolvedProjectId = projectId;
    if (!resolvedProjectId && projectSlug) {
      const project = await ProjectModel.findBySlug(projectSlug);
      resolvedProjectId = project?.id || null;
    }

    // Create inquiry
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

    // Track lead source
    LeadSourceModel.create({
      leadEmail: email.toLowerCase(),
      leadType: LeadType.PROJECT_INQUIRY,
      leadReferenceId: inquiry.id,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      referrerUrl: referrer || null,
      landingPageUrl: sourcePage || null,
      sourceIp: req.ip || null,
      userAgent: req.get("user-agent") || null,
    }).catch((err) => console.error("Error tracking lead:", err));

    // Track marketing consent
    if (marketingConsent) {
      MarketingConsentModel.grantAllConsents(
        email.toLowerCase(),
        "project-inquiry"
      ).catch((err) => console.error("Error tracking consent:", err));
    }

    ApiResponse.created(
      res,
      { id: inquiry.id },
      "Project inquiry submitted successfully"
    );
  };

  /**
   * Get all inquiries with filtering
   *
   * @route GET /api/inquiries
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
   * Get inquiry by ID
   *
   * @route GET /api/inquiries/:id
   * @access Private (Admin/Sales)
   */
  getInquiryById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const inquiry = await ProjectInquiryModel.findById(Number(id));

    if (!inquiry) {
      ApiResponse.notFound(res, "Inquiry not found");
      return;
    }

    ApiResponse.success(res, inquiry, "Inquiry retrieved successfully");
  };

  /**
   * Get new inquiries
   *
   * @route GET /api/inquiries/new
   * @access Private (Admin/Sales)
   */
  getNewInquiries = async (req: Request, res: Response): Promise<void> => {
    const { limit = 20 } = req.query;

    const inquiries = await ProjectInquiryModel.getNew(Number(limit));

    ApiResponse.success(res, inquiries, "New inquiries retrieved successfully");
  };

  /**
   * Get qualified leads
   *
   * @route GET /api/inquiries/qualified
   * @access Private (Admin/Sales)
   */
  getQualifiedLeads = async (req: Request, res: Response): Promise<void> => {
    const { limit = 50 } = req.query;

    const inquiries = await ProjectInquiryModel.getQualified(Number(limit));

    ApiResponse.success(
      res,
      inquiries,
      "Qualified leads retrieved successfully"
    );
  };

  /**
   * Assign inquiry to salesperson
   *
   * @route PATCH /api/inquiries/:id/assign
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

  /**
   * Update inquiry status
   *
   * @route PATCH /api/inquiries/:id/status
   * @access Private (Admin/Sales)
   */
  updateInquiryStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(ProjectInquiryStatus).includes(status)) {
      ApiResponse.badRequest(res, "Valid status is required");
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

    ApiResponse.success(res, null, "Inquiry status updated successfully");
  };

  /**
   * Get inquiry statistics
   *
   * @route GET /api/inquiries/statistics
   * @access Private (Admin/Sales Manager)
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    const stats = await ProjectInquiryModel.getStatusStatistics();

    ApiResponse.success(res, stats, "Statistics retrieved successfully");
  };

  /**
   * Get sales pipeline metrics
   *
   * @route GET /api/inquiries/pipeline
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

  /**
   * Get inquiries by project
   *
   * @route GET /api/inquiries/project/:projectId
   * @access Private (Admin/Sales)
   */
  getInquiriesByProject = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { projectId } = req.params;

    const inquiries = await ProjectInquiryModel.getByProject(Number(projectId));

    ApiResponse.success(
      res,
      inquiries,
      "Project inquiries retrieved successfully"
    );
  };

  /**
   * Get inquiries by financing method
   *
   * @route GET /api/inquiries/financing/:method
   * @access Private (Admin/Sales)
   */
  getInquiriesByFinancing = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { method } = req.params;

    if (!Object.values(FinancingMethod).includes(method as FinancingMethod)) {
      ApiResponse.badRequest(res, "Invalid financing method");
      return;
    }

    const inquiries = await ProjectInquiryModel.getByFinancingMethod(
      method as FinancingMethod
    );

    ApiResponse.success(res, inquiries, "Inquiries retrieved successfully");
  };

  /**
   * Get inquiries by purchase timeline
   *
   * @route GET /api/inquiries/timeline/:timeline
   * @access Private (Admin/Sales)
   */
  getInquiriesByTimeline = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { timeline } = req.params;

    if (
      !Object.values(PurchaseTimeline).includes(timeline as PurchaseTimeline)
    ) {
      ApiResponse.badRequest(res, "Invalid purchase timeline");
      return;
    }

    const inquiries = await ProjectInquiryModel.getByTimeline(
      timeline as PurchaseTimeline
    );

    ApiResponse.success(res, inquiries, "Inquiries retrieved successfully");
  };
}

export default new ProjectInquiryController();
