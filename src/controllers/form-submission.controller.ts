/**
 * Form Submission Controller
 * Handles all form submission requests (contact, inquiries, etc.)
 *
 * @module controllers/form-submission.controller
 */

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@/utils/response.util";
import FormSubmissionModel, {
  FormType,
  ProcessingStatus,
} from "@models/form-submission.model";
import { AppError } from "@/middlewares/error-handler.middleware";

/**
 * Form Submission Controller Class
 */
export class FormSubmissionController {
  /**
   * Get all form submissions with filtering
   * GET /api/form-submissions
   */
  async getFormSubmissions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        formType,
        status,
        projectId,
        isSpam,
        requiresOdooSync,
        dateFrom,
        dateTo,
        email,
        phone,
      } = req.query;

      const options: any = {
        page: Number(page),
        limit: Number(limit),
      };

      if (formType) options.formType = formType;
      if (status) options.status = status;
      if (projectId) options.projectId = Number(projectId);
      if (isSpam !== undefined) options.isSpam = isSpam === "true";
      if (requiresOdooSync !== undefined)
        options.requiresOdooSync = requiresOdooSync === "true";
      if (dateFrom) options.dateFrom = new Date(dateFrom as string);
      if (dateTo) options.dateTo = new Date(dateTo as string);
      if (email) options.email = email;
      if (phone) options.phone = phone;

      const result = await FormSubmissionModel.paginateSubmissions(options);

      ApiResponse.success(
        res,
        result,
        "Form submissions retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get form submission by ID
   * GET /api/form-submissions/:id
   */
  async getFormSubmissionById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { relations } = req.query;

      const relationsList = relations
        ? (relations as string).split(",")
        : ["project"];

      const submission = await FormSubmissionModel.findById(Number(id), {
        relations: relationsList,
      });

      if (!submission) {
        throw new AppError("Form submission not found", 404);
      }

      ApiResponse.success(
        res,
        submission,
        "Form submission retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit contact form (public endpoint)
   * POST /api/forms/contact
   */
  async submitContactForm(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        message,
        utmSource,
        utmMedium,
        utmCampaign,
      } = req.body;

      const submission = await FormSubmissionModel.create({
        formType: FormType.CONTACT_FORM,
        firstName,
        lastName,
        email,
        phone,
        formData: { message },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        pageUrl: req.get("referer"),
        utmSource,
        utmMedium,
        utmCampaign,
        requiresOdooSync: true,
        submittedAt: new Date(),
      });

      ApiResponse.created(
        res,
        { id: submission.id },
        "Thank you for contacting us! We'll get back to you soon."
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit project inquiry (public endpoint)
   * POST /api/forms/project-inquiry
   */
  async submitProjectInquiry(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        projectId,
        firstName,
        lastName,
        email,
        phone,
        message,
        budget,
        preferredContactMethod,
        utmSource,
        utmMedium,
        utmCampaign,
      } = req.body;

      const submission = await FormSubmissionModel.create({
        formType: FormType.PROJECT_INQUIRY,
        projectId: projectId ? Number(projectId) : null,
        firstName,
        lastName,
        email,
        phone,
        formData: { message, budget, preferredContactMethod },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        pageUrl: req.get("referer"),
        utmSource,
        utmMedium,
        utmCampaign,
        requiresOdooSync: true,
        submittedAt: new Date(),
      });

      ApiResponse.created(
        res,
        { id: submission.id },
        "Thank you for your inquiry! We'll contact you soon."
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit appointment request (public endpoint)
   * POST /api/forms/appointment
   */
  async submitAppointmentRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        projectId,
        firstName,
        lastName,
        email,
        phone,
        preferredDate,
        preferredTime,
        message,
        utmSource,
        utmMedium,
        utmCampaign,
      } = req.body;

      const submission = await FormSubmissionModel.create({
        formType: FormType.APPOINTMENT_REQUEST,
        projectId: projectId ? Number(projectId) : null,
        firstName,
        lastName,
        email,
        phone,
        formData: { preferredDate, preferredTime, message },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        pageUrl: req.get("referer"),
        utmSource,
        utmMedium,
        utmCampaign,
        requiresOdooSync: true,
        submittedAt: new Date(),
      });

      ApiResponse.created(
        res,
        { id: submission.id },
        "Appointment request received! We'll confirm your appointment soon."
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit catalog download request (public endpoint)
   * POST /api/forms/catalog-download
   */
  async submitCatalogDownload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        projectId,
        firstName,
        lastName,
        email,
        phone,
        utmSource,
        utmMedium,
        utmCampaign,
      } = req.body;

      const submission = await FormSubmissionModel.create({
        formType: FormType.CATALOG_DOWNLOAD,
        projectId: projectId ? Number(projectId) : null,
        firstName,
        lastName,
        email,
        phone,
        formData: {},
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        pageUrl: req.get("referer"),
        utmSource,
        utmMedium,
        utmCampaign,
        requiresOdooSync: true,
        submittedAt: new Date(),
      });

      ApiResponse.created(
        res,
        { id: submission.id, downloadUrl: "/catalogs/project-catalog.pdf" },
        "Thank you! Your catalog is ready for download."
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get form submission statistics
   * GET /api/form-submissions/statistics
   */
  async getStatistics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dateFrom, dateTo } = req.query;

      const stats = await FormSubmissionModel.getStatistics(
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );

      ApiResponse.success(res, stats, "Statistics retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get breakdown by form type
   * GET /api/form-submissions/breakdown
   */
  async getBreakdown(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dateFrom, dateTo } = req.query;

      const breakdown = await FormSubmissionModel.getBreakdownByFormType(
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );

      ApiResponse.success(res, breakdown, "Breakdown retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top UTM sources
   * GET /api/form-submissions/utm-sources
   */
  async getTopUtmSources(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit = 10 } = req.query;

      const sources = await FormSubmissionModel.getTopUtmSources(Number(limit));

      ApiResponse.success(res, sources, "UTM sources retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get spam submissions
   * GET /api/form-submissions/spam
   */
  async getSpamSubmissions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { page = 1, limit = 20 } = req.query;

      const options: any = {
        page: Number(page),
        limit: Number(limit),
        isSpam: true,
      };

      const result = await FormSubmissionModel.paginateSubmissions(options);

      ApiResponse.success(
        res,
        result,
        "Spam submissions retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending Odoo sync submissions
   * GET /api/form-submissions/pending-sync
   */
  async getPendingSync(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit = 100 } = req.query;

      const submissions = await FormSubmissionModel.getPendingOdooSync(
        Number(limit)
      );

      ApiResponse.success(
        res,
        submissions,
        "Pending sync submissions retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark submission as synced
   * PATCH /api/form-submissions/:id/mark-synced
   */
  async markSynced(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const submission = await FormSubmissionModel.markSyncCompleted(
        Number(id)
      );

      if (!submission) {
        throw new AppError("Form submission not found", 404);
      }

      ApiResponse.success(res, submission, "Submission marked as synced");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset sync status
   * PATCH /api/form-submissions/:id/reset-sync
   */
  async resetSync(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const submission = await FormSubmissionModel.resetSyncStatus(Number(id));

      if (!submission) {
        throw new AppError("Form submission not found", 404);
      }

      ApiResponse.success(res, submission, "Sync status reset successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark as spam
   * PATCH /api/form-submissions/:id/mark-spam
   */
  async markAsSpam(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const submission = await FormSubmissionModel.update(Number(id), {
        isSpam: true,
        status: "spam" as any,
      });

      if (!submission) {
        throw new AppError("Form submission not found", 404);
      }

      ApiResponse.success(res, submission, "Marked as spam");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign to team member
   * PATCH /api/form-submissions/:id/assign
   */
  async assignSubmission(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { assignedTo, notes } = req.body;

      // TODO: Implement assignment logic

      ApiResponse.success(res, null, "Submission assigned successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export submissions
   * GET /api/form-submissions/export
   */
  async exportSubmissions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dateFrom, dateTo, formType, format = "csv" } = req.query;

      const options: any = {};
      if (dateFrom) options.dateFrom = new Date(dateFrom as string);
      if (dateTo) options.dateTo = new Date(dateTo as string);
      if (formType) options.formType = formType;

      const submissions = await FormSubmissionModel.findSubmissions(options);

      // TODO: Generate CSV/Excel

      ApiResponse.success(res, { count: submissions.length }, "Export ready");
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export default new FormSubmissionController();
