/**
 * Catalog Download Request Model - FIXED VERSION
 * Represents catalog and brochure download requests
 * Manages marketing material downloads and tracking
 *
 * @module models/catalog-download-request.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Catalog download request entity interface
 * Represents a catalog download request
 */
export interface CatalogDownloadRequest {
  /** Unique identifier */
  id: number;

  /** Full name */
  fullName: string;

  /** Email address */
  email: string;

  /** Phone number */
  phone: string;

  /** Catalog type */
  catalogType: string | null;

  /** Project ID (if project-specific) */
  projectId: number | null;

  /** Marketing consent */
  marketingConsent: boolean;

  /** Download timestamp */
  downloadedAt: Date | null;

  /** Download IP address */
  downloadIp: string | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Create catalog download request DTO
 */
export interface CreateCatalogDownloadRequestDto {
  fullName: string;
  email: string;
  phone: string;
  catalogType?: string | null;
  projectId?: number | null;
  marketingConsent?: boolean;
  downloadIp?: string | null;
}

/**
 * Update catalog download request DTO
 */
export interface UpdateCatalogDownloadRequestDto {
  fullName?: string;
  email?: string;
  phone?: string;
  catalogType?: string | null;
  projectId?: number | null;
  marketingConsent?: boolean;
  downloadedAt?: Date | null;
  downloadIp?: string | null;
}

/**
 * Catalog download request query parameters
 */
export interface CatalogDownloadRequestQueryParams extends BaseQueryParams {
  email?: string;
  projectId?: number;
  catalogType?: string;
  hasDownloaded?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Catalog Download Request Model class
 * Handles all database operations for catalog download requests
 * FIXED: Table name corrected
 */
class CatalogDownloadRequestModel extends BaseModel<
  CatalogDownloadRequest,
  CreateCatalogDownloadRequestDto,
  UpdateCatalogDownloadRequestDto
> {
  // FIXED: Changed from "catalog_download_requests" to "catalog_download_requests"
  protected tableName = "catalog_download_requests";

  /**
   * Finds all catalog download requests matching query parameters
   *
   * @param params - Query parameters
   * @returns Promise<CatalogDownloadRequest[]> - Array of requests
   *
   * @example
   * const requests = await CatalogDownloadRequestModel.findAll({
   *   projectId: 1,
   *   hasDownloaded: true
   * });
   */
  async findAll(
    params: CatalogDownloadRequestQueryParams = {}
  ): Promise<CatalogDownloadRequest[]> {
    let query = this.db(this.tableName);

    if (params.email) {
      query = query.where({ email: params.email });
    }

    if (params.projectId !== undefined) {
      query = query.where({ project_id: params.projectId });
    }

    if (params.catalogType) {
      query = query.where({ catalog_type: params.catalogType });
    }

    if (params.hasDownloaded !== undefined) {
      if (params.hasDownloaded) {
        query = query.whereNotNull("downloaded_at");
      } else {
        query = query.whereNull("downloaded_at");
      }
    }

    if (params.dateFrom) {
      query = query.where("created_at", ">=", params.dateFrom);
    }

    if (params.dateTo) {
      query = query.where("created_at", "<=", params.dateTo);
    }

    if (params.sortBy) {
      query = query.orderBy(params.sortBy, params.sortOrder || "desc");
    } else {
      query = query.orderBy("created_at", "desc");
    }

    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const requests = await query;
    return requests.map(this.mapToEntity);
  }

  /**
   * Gets requests by project
   *
   * @param projectId - Project ID
   * @returns Promise<CatalogDownloadRequest[]> - Project download requests
   *
   * @example
   * const requests = await CatalogDownloadRequestModel.getByProject(1);
   */
  async getByProject(projectId: number): Promise<CatalogDownloadRequest[]> {
    return this.findAll({ projectId });
  }

  /**
   * Gets requests by email
   *
   * @param email - Email address
   * @returns Promise<CatalogDownloadRequest[]> - User's requests
   *
   * @example
   * const requests = await CatalogDownloadRequestModel.findByEmail("john@example.com");
   */
  async findByEmail(email: string): Promise<CatalogDownloadRequest[]> {
    return this.findWhere({ email });
  }

  /**
   * Marks a request as downloaded
   *
   * @param id - Request ID
   * @param downloadIp - IP address of download
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await CatalogDownloadRequestModel.markAsDownloaded(1, "192.168.1.1");
   */
  async markAsDownloaded(id: number, downloadIp?: string): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id })
      .update({
        downloaded_at: this.db.fn.now(),
        download_ip: downloadIp || null,
        updated_at: this.db.fn.now(),
      });

    return updated > 0;
  }

  /**
   * Gets download statistics
   *
   * @returns Promise<any> - Download statistics
   *
   * @example
   * const stats = await CatalogDownloadRequestModel.getDownloadStatistics();
   */
  async getDownloadStatistics(): Promise<any> {
    const [total, downloaded, byType] = await Promise.all([
      this.db(this.tableName).count("* as count").first(),

      this.db(this.tableName)
        .whereNotNull("downloaded_at")
        .count("* as count")
        .first(),

      this.db(this.tableName)
        .select("catalog_type")
        .count("* as count")
        .groupBy("catalog_type"),
    ]);

    const byTypeStats: Record<string, number> = {};
    byType.forEach((row: any) => {
      byTypeStats[row.catalog_type || "general"] = Number(row.count);
    });

    return {
      totalRequests: Number(total?.count || 0),
      downloaded: Number(downloaded?.count || 0),
      byType: byTypeStats,
    };
  }

  /**
   * Gets users who consented to marketing
   *
   * @returns Promise<CatalogDownloadRequest[]> - Consented users
   *
   * @example
   * const consented = await CatalogDownloadRequestModel.getMarketingConsents();
   */
  async getMarketingConsents(): Promise<CatalogDownloadRequest[]> {
    return this.findWhere({ marketing_consent: true });
  }

  /**
   * Maps database record to CatalogDownloadRequest entity
   *
   * @param record - Database record
   * @returns CatalogDownloadRequest entity
   *
   * @protected
   */
  protected mapToEntity(record: any): CatalogDownloadRequest {
    return {
      id: record.id,
      fullName: record.full_name,
      email: record.email,
      phone: record.phone,
      catalogType: record.catalog_type,
      projectId: record.project_id,
      marketingConsent: Boolean(record.marketing_consent),
      downloadedAt: record.downloaded_at
        ? new Date(record.downloaded_at)
        : null,
      downloadIp: record.download_ip,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new CatalogDownloadRequestModel();