/**
 * Catalog Download Controller
 * Handles catalog and brochure download requests
 *
 * @module controllers/catalog.controller
 */

import { Request, Response } from "express";
import {
  CatalogDownloadRequestModel,
  MarketingConsentModel,
  LeadSourceModel,
  LeadType,
} from "@models";
import { ApiResponse } from "@utils/response.util";
import { BLOCKED_EMAIL_DOMAINS } from "@constants/app.constants";

/**
 * Catalog Download Controller class
 * Manages catalog download requests and tracking
 */
class CatalogController {
  /**
   * Submit catalog download request
   *
   * @route POST /api/catalog/download
   * @access Public
   */
  async requestCatalogDownload(req: Request, res: Response): Promise<void> {
    const {
      fullName,
      email,
      phone,
      catalogType,
      projectId,
      marketingConsent = false,
      // Tracking
      utmSource,
      utmMedium,
      utmCampaign,
      referrer,
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone) {
      ApiResponse.badRequest(res, "Name, email and phone are required");
      return;
    }

    // Check for blocked email domains
    const emailDomain = email.split("@")[1]?.toLowerCase();
    if (emailDomain && BLOCKED_EMAIL_DOMAINS.includes(emailDomain)) {
      ApiResponse.badRequest(res, "Disposable email addresses are not allowed");
      return;
    }

    // Check if user already requested
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

    // Create download request
    const request = await CatalogDownloadRequestModel.create({
      fullName,
      email: email.toLowerCase(),
      phone,
      catalogType: catalogType || null,
      projectId: projectId ? Number(projectId) : null,
      marketingConsent,
      downloadIp: req.ip || null,
    });

    // Track lead source
    LeadSourceModel.create({
      leadEmail: email.toLowerCase(),
      leadType: LeadType.CATALOG_DOWNLOAD,
      leadReferenceId: request.id,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      referrerUrl: referrer || null,
      sourceIp: req.ip || null,
      userAgent: req.get("user-agent") || null,
    }).catch((err) => console.error("Error tracking lead:", err));

    // Track marketing consent
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
  }

  /**
   * Get all catalog download requests
   *
   * @route GET /api/catalog/downloads
   * @access Private (Admin)
   */
  async getAllRequests(req: Request, res: Response): Promise<void> {
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

    ApiResponse.success(
      res,
      requests,
      "Catalog requests retrieved successfully"
    );
  }

  /**
   * Get requests by project
   *
   * @route GET /api/catalog/downloads/project/:projectId
   * @access Private (Admin)
   */
  async getRequestsByProject(req: Request, res: Response): Promise<void> {
    const { projectId } = req.params;

    const requests = await CatalogDownloadRequestModel.getByProject(
      Number(projectId)
    );

    ApiResponse.success(
      res,
      requests,
      "Project catalog requests retrieved successfully"
    );
  }

  /**
   * Mark download as completed
   *
   * @route POST /api/catalog/downloads/:id/mark-downloaded
   * @access Private (Admin)
   */
  async markAsDownloaded(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const updated = await CatalogDownloadRequestModel.markAsDownloaded(
      Number(id),
      req.ip || undefined
    );

    if (!updated) {
      ApiResponse.notFound(res, "Download request not found");
      return;
    }

    ApiResponse.success(res, null, "Download marked as completed");
  }

  /**
   * Get download statistics
   *
   * @route GET /api/catalog/downloads/statistics
   * @access Private (Admin)
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    const stats = await CatalogDownloadRequestModel.getDownloadStatistics();

    ApiResponse.success(res, stats, "Statistics retrieved successfully");
  }

  /**
   * Get marketing consents from catalog requests
   *
   * @route GET /api/catalog/downloads/consents
   * @access Private (Admin)
   */
  async getMarketingConsents(req: Request, res: Response): Promise<void> {
    const consents = await CatalogDownloadRequestModel.getMarketingConsents();

    ApiResponse.success(
      res,
      consents,
      "Marketing consents retrieved successfully"
    );
  }
}

export default new CatalogController();
