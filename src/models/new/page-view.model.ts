/**
 * Page Views Model
 * Tracks detailed page-level analytics for every page view
 * Used for heat mapping, funnel analysis, and engagement metrics
 *
 * NOTE: High-volume table - consider partitioning by date
 *
 * @module models/page-views.model
 */

import { BaseModel, BaseQueryParams } from "../base";

/**
 * Page view entity interface
 * Represents a single page view event
 */
export interface PageView {
  /** Unique identifier */
  id: number;

  /** Session ID reference */
  sessionId: number | null;

  /** Visitor UUID */
  visitorId: string;

  /** Lead ID (when visitor is identified) */
  leadId: number | null;

  /** Full page URL */
  pageUrl: string;

  /** URL path only */
  pagePath: string;

  /** Page title */
  pageTitle: string | null;

  /** Page type/category */
  pageType: string | null;

  /** Referrer URL */
  referrerUrl: string | null;

  /** Referrer domain */
  referrerDomain: string | null;

  /** Time spent on page (seconds) */
  timeOnPageSeconds: number | null;

  /** Scroll depth percentage (0-100) */
  scrollDepthPercent: number | null;

  /** Whether user bounced */
  bounced: boolean;

  /** Previous page in session */
  previousPagePath: string | null;

  /** Next page in session */
  nextPagePath: string | null;

  /** View timestamp */
  viewedAt: Date;

  /** Device type */
  device: string | null;

  /** Browser name */
  browser: string | null;

  /** Location city */
  locationCity: string | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Create page view DTO
 */
export interface CreatePageViewDto {
  sessionId?: number | null;
  visitorId: string;
  leadId?: number | null;
  pageUrl: string;
  pagePath: string;
  pageTitle?: string | null;
  pageType?: string | null;
  referrerUrl?: string | null;
  referrerDomain?: string | null;
  viewedAt?: Date;
  device?: string | null;
  browser?: string | null;
  locationCity?: string | null;
}

/**
 * Update page view DTO
 */
export interface UpdatePageViewDto {
  timeOnPageSeconds?: number;
  scrollDepthPercent?: number;
  bounced?: boolean;
  nextPagePath?: string | null;
}

/**
 * Page view query parameters
 */
export interface PageViewQueryParams extends BaseQueryParams {
  sessionId?: number;
  visitorId?: string;
  leadId?: number;
  pagePath?: string;
  pageType?: string;
  referrerDomain?: string;
  device?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minTimeOnPage?: number;
  hasBounced?: boolean;
}

/**
 * Page Views Model class
 * Handles all database operations for page views
 */
class PageViewModel extends BaseModel<
  PageView,
  CreatePageViewDto,
  UpdatePageViewDto
> {
  protected tableName = "page_views";

  /**
   * Finds all page views matching query parameters
   *
   * @param params - Query parameters
   * @returns Promise<PageView[]> - Array of page views
   *
   * @example
   * const views = await PageViewModel.findAll({
   *   pagePath: "/projects/luxury-residence",
   *   dateFrom: new Date("2025-01-01")
   * });
   */
  async findAll(params: PageViewQueryParams = {}): Promise<PageView[]> {
    let query = this.db(this.tableName);

    if (params.sessionId !== undefined) {
      query = query.where({ session_id: params.sessionId });
    }

    if (params.visitorId) {
      query = query.where({ visitor_id: params.visitorId });
    }

    if (params.leadId !== undefined) {
      query = query.where({ lead_mirror_id: params.leadId });
    }

    if (params.pagePath) {
      query = query.where({ page_path: params.pagePath });
    }

    if (params.pageType) {
      query = query.where({ page_type: params.pageType });
    }

    if (params.referrerDomain) {
      query = query.where({ referrer_domain: params.referrerDomain });
    }

    if (params.device) {
      query = query.where({ device: params.device });
    }

    if (params.dateFrom) {
      query = query.where("viewed_at", ">=", params.dateFrom);
    }

    if (params.dateTo) {
      query = query.where("viewed_at", "<=", params.dateTo);
    }

    if (params.minTimeOnPage !== undefined) {
      query = query.where("time_on_page_seconds", ">=", params.minTimeOnPage);
    }

    if (params.hasBounced !== undefined) {
      query = query.where({ bounced: params.hasBounced });
    }

    if (params.sortBy) {
      query = query.orderBy(params.sortBy, params.sortOrder || "desc");
    } else {
      query = query.orderBy("viewed_at", "desc");
    }

    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const views = await query;
    return views.map(this.mapToEntity);
  }

  /**
   * Gets page views by session
   *
   * @param sessionId - Session ID
   * @returns Promise<PageView[]> - Session page views
   *
   * @example
   * const sessionViews = await PageViewModel.getBySession(123);
   */
  async getBySession(sessionId: number): Promise<PageView[]> {
    return this.findAll({ sessionId });
  }

  /**
   * Gets page views by visitor
   *
   * @param visitorId - Visitor UUID
   * @returns Promise<PageView[]> - Visitor page views
   *
   * @example
   * const visitorViews = await PageViewModel.getByVisitor("vis_abc123");
   */
  async getByVisitor(visitorId: string): Promise<PageView[]> {
    return this.findAll({ visitorId });
  }

  /**
   * Gets page views for a specific page
   *
   * @param pagePath - Page path
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Promise<PageView[]> - Page views
   *
   * @example
   * const views = await PageViewModel.getByPage("/projects/residence", startDate, endDate);
   */
  async getByPage(
    pagePath: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<PageView[]> {
    return this.findAll({ pagePath, dateFrom, dateTo });
  }

  /**
   * Gets bounce rate for a page
   *
   * @param pagePath - Page path
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Promise<number> - Bounce rate percentage
   *
   * @example
   * const bounceRate = await PageViewModel.getBounceRate("/projects/residence");
   */
  async getBounceRate(
    pagePath: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<number> {
    let query = this.db(this.tableName).where({ page_path: pagePath });

    if (dateFrom) {
      query = query.where("viewed_at", ">=", dateFrom);
    }

    if (dateTo) {
      query = query.where("viewed_at", "<=", dateTo);
    }

    const [total, bounced] = await Promise.all([
      query.clone().count("* as count").first(),
      query.clone().where({ bounced: true }).count("* as count").first(),
    ]);

    const totalCount = Number(total?.count || 0);
    const bouncedCount = Number(bounced?.count || 0);

    return totalCount > 0 ? (bouncedCount / totalCount) * 100 : 0;
  }

  /**
   * Gets average time on page
   *
   * @param pagePath - Page path
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Promise<number> - Average seconds
   *
   * @example
   * const avgTime = await PageViewModel.getAverageTimeOnPage("/about");
   */
  async getAverageTimeOnPage(
    pagePath: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<number> {
    let query = this.db(this.tableName)
      .where({ page_path: pagePath })
      .whereNotNull("time_on_page_seconds");

    if (dateFrom) {
      query = query.where("viewed_at", ">=", dateFrom);
    }

    if (dateTo) {
      query = query.where("viewed_at", "<=", dateTo);
    }

    const result = await query.avg("time_on_page_seconds as avg").first();

    return result?.avg ? parseFloat(result.avg) : 0;
  }

  /**
   * Gets top pages by views
   *
   * @param limit - Maximum number of pages
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Promise<any[]> - Top pages with metrics
   *
   * @example
   * const topPages = await PageViewModel.getTopPages(10);
   */
  async getTopPages(
    limit: number = 10,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any[]> {
    let query = this.db(this.tableName).select("page_path", "page_title");

    if (dateFrom) {
      query = query.where("viewed_at", ">=", dateFrom);
    }

    if (dateTo) {
      query = query.where("viewed_at", "<=", dateTo);
    }

    const results = await query
      .count("* as views")
      .countDistinct("visitor_id as unique_visitors")
      .avg("time_on_page_seconds as avg_time")
      .groupBy("page_path", "page_title")
      .orderBy("views", "desc")
      .limit(limit);

    return results.map((row: any) => ({
      pagePath: row.page_path,
      pageTitle: row.page_title,
      views: Number(row.views),
      uniqueVisitors: Number(row.unique_visitors),
      avgTimeOnPage: row.avg_time ? parseFloat(row.avg_time) : 0,
    }));
  }

  /**
   * Gets exit pages (last page in session)
   *
   * @param limit - Maximum number of pages
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Promise<any[]> - Exit pages with counts
   *
   * @example
   * const exitPages = await PageViewModel.getExitPages(10);
   */
  async getExitPages(
    limit: number = 10,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any[]> {
    let query = this.db(this.tableName)
      .select("page_path")
      .whereNull("next_page_path");

    if (dateFrom) {
      query = query.where("viewed_at", ">=", dateFrom);
    }

    if (dateTo) {
      query = query.where("viewed_at", "<=", dateTo);
    }

    const results = await query
      .count("* as exit_count")
      .groupBy("page_path")
      .orderBy("exit_count", "desc")
      .limit(limit);

    return results.map((row: any) => ({
      pagePath: row.page_path,
      exitCount: Number(row.exit_count),
    }));
  }

  /**
   * Updates engagement metrics for a page view
   *
   * @param id - Page view ID
   * @param timeOnPage - Time spent (seconds)
   * @param scrollDepth - Scroll depth percentage
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await PageViewModel.updateEngagement(123, 45, 85);
   */
  async updateEngagement(
    id: number,
    timeOnPage: number,
    scrollDepth: number
  ): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id }).update({
      time_on_page_seconds: timeOnPage,
      scroll_depth_percent: scrollDepth,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Sets next page path (for funnel tracking)
   *
   * @param id - Page view ID
   * @param nextPagePath - Next page path
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await PageViewModel.setNextPage(123, "/contact");
   */
  async setNextPage(id: number, nextPagePath: string): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id }).update({
      next_page_path: nextPagePath,
      bounced: false,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Maps database record to PageView entity
   *
   * @param record - Database record
   * @returns PageView entity
   *
   * @protected
   */
  protected mapToEntity(record: any): PageView {
    return {
      id: record.id,
      sessionId: record.session_id,
      visitorId: record.visitor_id,
      leadId: record.lead_mirror_id,
      pageUrl: record.page_url,
      pagePath: record.page_path,
      pageTitle: record.page_title,
      pageType: record.page_type,
      referrerUrl: record.referrer_url,
      referrerDomain: record.referrer_domain,
      timeOnPageSeconds: record.time_on_page_seconds,
      scrollDepthPercent: record.scroll_depth_percent,
      bounced: Boolean(record.bounced),
      previousPagePath: record.previous_page_path,
      nextPagePath: record.next_page_path,
      viewedAt: new Date(record.viewed_at),
      device: record.device,
      browser: record.browser,
      locationCity: record.location_city,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new PageViewModel();
