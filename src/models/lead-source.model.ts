/**
 * Lead Source Model
 * Represents marketing analytics and lead source tracking
 * Manages campaign tracking and attribution
 *
 * @module models/lead-source.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Lead type enumeration
 * Defines the source/type of lead
 */
export enum LeadType {
  CONTACT_FORM = "contact_form",
  PROJECT_INQUIRY = "project_inquiry",
  EVENT_REGISTRATION = "event_registration",
  APPOINTMENT = "appointment",
  CATALOG_DOWNLOAD = "catalog_download",
}

/**
 * Device type enumeration
 * User device category
 */
export enum DeviceType {
  DESKTOP = "desktop",
  MOBILE = "mobile",
  TABLET = "tablet",
  UNKNOWN = "unknown",
}

/**
 * Lead source entity interface
 * Represents lead tracking and attribution data
 */
export interface LeadSource {
  /** Unique identifier */
  id: number;

  /** Lead email address */
  leadEmail: string;

  /** Type of lead */
  leadType: LeadType;

  /** Reference ID in source table */
  leadReferenceId: number | null;

  /** UTM source parameter */
  utmSource: string | null;

  /** UTM medium parameter */
  utmMedium: string | null;

  /** UTM campaign parameter */
  utmCampaign: string | null;

  /** UTM term parameter */
  utmTerm: string | null;

  /** UTM content parameter */
  utmContent: string | null;

  /** Referrer URL */
  referrerUrl: string | null;

  /** Landing page URL */
  landingPageUrl: string | null;

  /** Source IP address */
  sourceIp: string | null;

  /** User agent string */
  userAgent: string | null;

  /** Device type */
  deviceType: DeviceType | null;

  /** Browser name */
  browser: string | null;

  /** Operating system */
  operatingSystem: string | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Create lead source DTO
 */
export interface CreateLeadSourceDto {
  leadEmail: string;
  leadType: LeadType;
  leadReferenceId?: number | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  referrerUrl?: string | null;
  landingPageUrl?: string | null;
  sourceIp?: string | null;
  userAgent?: string | null;
  deviceType?: DeviceType | null;
  browser?: string | null;
  operatingSystem?: string | null;
}

/**
 * Update lead source DTO
 */
export interface UpdateLeadSourceDto {
  leadEmail?: string;
  leadType?: LeadType;
  leadReferenceId?: number | null;
  deviceType?: DeviceType | null;
  browser?: string | null;
  operatingSystem?: string | null;
}

/**
 * Lead source query parameters
 */
export interface LeadSourceQueryParams extends BaseQueryParams {
  leadEmail?: string;
  leadType?: LeadType;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType?: DeviceType;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Lead Source Model class
 * Handles all database operations for lead sources
 */
class LeadSourceModel extends BaseModel<
  LeadSource,
  CreateLeadSourceDto,
  UpdateLeadSourceDto
> {
  protected tableName = "lead_sources";

  /**
   * Finds all lead sources matching query parameters
   *
   * @param params - Query parameters
   * @returns Promise<LeadSource[]> - Array of lead sources
   *
   * @example
   * const leads = await LeadSourceModel.findAll({
   *   utmCampaign: "summer-2025",
   *   leadType: LeadType.PROJECT_INQUIRY
   * });
   */
  async findAll(params: LeadSourceQueryParams = {}): Promise<LeadSource[]> {
    let query = this.db(this.tableName);

    if (params.leadEmail) {
      query = query.where({ lead_email: params.leadEmail });
    }

    if (params.leadType) {
      query = query.where({ lead_type: params.leadType });
    }

    if (params.utmSource) {
      query = query.where({ utm_source: params.utmSource });
    }

    if (params.utmMedium) {
      query = query.where({ utm_medium: params.utmMedium });
    }

    if (params.utmCampaign) {
      query = query.where({ utm_campaign: params.utmCampaign });
    }

    if (params.deviceType) {
      query = query.where({ device_type: params.deviceType });
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

    const leadSources = await query;
    return leadSources.map(this.mapToEntity);
  }

  /**
   * Gets leads by email
   *
   * @param email - Email address
   * @returns Promise<LeadSource[]> - Lead sources for that email
   *
   * @example
   * const userLeads = await LeadSourceModel.findByEmail("john@example.com");
   */
  async findByEmail(email: string): Promise<LeadSource[]> {
    return this.findWhere({ lead_email: email });
  }

  /**
   * Gets leads by campaign
   *
   * @param campaign - UTM campaign name
   * @returns Promise<LeadSource[]> - Campaign leads
   *
   * @example
   * const campaignLeads = await LeadSourceModel.getByCampaign("summer-2025");
   */
  async getByCampaign(campaign: string): Promise<LeadSource[]> {
    return this.findAll({ utmCampaign: campaign });
  }

  /**
   * Gets leads by source and medium
   *
   * @param source - UTM source
   * @param medium - UTM medium
   * @returns Promise<LeadSource[]> - Matching leads
   *
   * @example
   * const fbLeads = await LeadSourceModel.getBySourceMedium("facebook", "cpc");
   */
  async getBySourceMedium(
    source: string,
    medium: string
  ): Promise<LeadSource[]> {
    return this.findAll({ utmSource: source, utmMedium: medium });
  }

  /**
   * Gets campaign performance statistics
   *
   * @returns Promise<any[]> - Campaign statistics
   *
   * @example
   * const stats = await LeadSourceModel.getCampaignStatistics();
   */
  async getCampaignStatistics(): Promise<any[]> {
    const results = await this.db(this.tableName)
      .select("utm_campaign")
      .count("* as lead_count")
      .countDistinct("lead_email as unique_leads")
      .groupBy("utm_campaign")
      .orderBy("lead_count", "desc");

    return results.map((row: any) => ({
      campaign: row.utm_campaign || "direct",
      leadCount: Number(row.lead_count),
      uniqueLeads: Number(row.unique_leads),
    }));
  }

  /**
   * Gets source and medium statistics
   *
   * @returns Promise<any[]> - Source/medium statistics
   *
   * @example
   * const stats = await LeadSourceModel.getSourceMediumStatistics();
   */
  async getSourceMediumStatistics(): Promise<any[]> {
    const results = await this.db(this.tableName)
      .select("utm_source", "utm_medium")
      .count("* as lead_count")
      .groupBy("utm_source", "utm_medium")
      .orderBy("lead_count", "desc");

    return results.map((row: any) => ({
      source: row.utm_source || "direct",
      medium: row.utm_medium || "none",
      leadCount: Number(row.lead_count),
    }));
  }

  /**
   * Gets device type statistics
   *
   * @returns Promise<Record<string, number>> - Device counts
   *
   * @example
   * const deviceStats = await LeadSourceModel.getDeviceStatistics();
   */
  async getDeviceStatistics(): Promise<Record<string, number>> {
    const results = await this.db(this.tableName)
      .select("device_type")
      .count("* as count")
      .groupBy("device_type");

    const stats: Record<string, number> = {};
    results.forEach((row: any) => {
      stats[row.device_type || "unknown"] = Number(row.count);
    });

    return stats;
  }

  /**
   * Gets lead type statistics
   *
   * @returns Promise<Record<string, number>> - Lead type counts
   *
   * @example
   * const typeStats = await LeadSourceModel.getLeadTypeStatistics();
   */
  async getLeadTypeStatistics(): Promise<Record<string, number>> {
    const results = await this.db(this.tableName)
      .select("lead_type")
      .count("* as count")
      .groupBy("lead_type");

    const stats: Record<string, number> = {};
    results.forEach((row: any) => {
      stats[row.lead_type] = Number(row.count);
    });

    return stats;
  }

  /**
   * Gets top referrers
   *
   * @param limit - Maximum number of referrers
   * @returns Promise<any[]> - Top referrers with counts
   *
   * @example
   * const topReferrers = await LeadSourceModel.getTopReferrers(10);
   */
  async getTopReferrers(limit: number = 10): Promise<any[]> {
    const results = await this.db(this.tableName)
      .select("referrer_url")
      .count("* as count")
      .whereNotNull("referrer_url")
      .groupBy("referrer_url")
      .orderBy("count", "desc")
      .limit(limit);

    return results.map((row: any) => ({
      referrer: row.referrer_url,
      count: Number(row.count),
    }));
  }

  /**
   * Gets conversion funnel data
   *
   * @returns Promise<any> - Funnel statistics
   *
   * @example
   * const funnel = await LeadSourceModel.getConversionFunnel();
   */
  async getConversionFunnel(): Promise<any> {
    const results = await this.db(this.tableName)
      .select("lead_type")
      .count("* as count")
      .groupBy("lead_type");

    const funnel: Record<string, number> = {};
    results.forEach((row: any) => {
      funnel[row.lead_type] = Number(row.count);
    });

    return funnel;
  }

  /**
   * Maps database record to LeadSource entity
   *
   * @param record - Database record
   * @returns LeadSource entity
   *
   * @protected
   */
  protected mapToEntity(record: any): LeadSource {
    return {
      id: record.id,
      leadEmail: record.lead_email,
      leadType: record.lead_type as LeadType,
      leadReferenceId: record.lead_reference_id,
      utmSource: record.utm_source,
      utmMedium: record.utm_medium,
      utmCampaign: record.utm_campaign,
      utmTerm: record.utm_term,
      utmContent: record.utm_content,
      referrerUrl: record.referrer_url,
      landingPageUrl: record.landing_page_url,
      sourceIp: record.source_ip,
      userAgent: record.user_agent,
      deviceType: record.device_type as DeviceType | null,
      browser: record.browser,
      operatingSystem: record.operating_system,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new LeadSourceModel();
