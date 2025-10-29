/**
 * Property Interactions Model
 * Tracks property-specific engagement (views, favorites, shares, inquiries)
 * Essential for understanding property interest and optimizing listings
 * 
 * @module models/property-interactions.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Property interaction action types
 * Defines all trackable property interactions
 */
export enum PropertyInteractionAction {
  VIEW = "view",
  FAVORITE = "favorite",
  UNFAVORITE = "unfavorite",
  SHARE = "share",
  CALL = "call",
  WHATSAPP = "whatsapp",
  EMAIL = "email",
  GALLERY_VIEW = "gallery_view",
  FLOORPLAN_VIEW = "floorplan_view",
  VIRTUAL_TOUR = "virtual_tour",
  VIDEO_PLAY = "video_play",
  COMPARE = "compare",
  DOWNLOAD_BROCHURE = "download_brochure",
  INQUIRY = "inquiry",
}

/**
 * Property interaction entity interface
 * Represents a single property interaction event
 */
export interface PropertyInteraction {
  /** Unique identifier */
  id: number;

  /** Visitor UUID */
  visitorId: string;

  /** Lead ID (when identified) */
  leadId: number | null;

  /** Session ID */
  sessionId: number | null;

  /** Property ID (project) */
  propertyId: number;

  /** Interaction action type */
  action: PropertyInteractionAction;

  /** Action category for grouping */
  actionCategory: string | null;

  /** Action-specific data as JSON */
  // Example for gallery_view: { "image_index": 3, "total_images": 15, "time_spent": 45 }
  // Example for share: { "platform": "facebook", "url": "https://..." }
  value: Record<string, any> | null;

  /** Apartment ID (if interaction with specific unit) */
  apartmentId: number | null;

  /** Interaction timestamp */
  interactionTs: Date;

  /** Page URL where action occurred */
  pageUrl: string | null;

  /** Referrer URL */
  referrerUrl: string | null;

  /** Device type */
  device: string | null;

  /** IP address */
  ipAddress: string | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Create property interaction DTO
 */
export interface CreatePropertyInteractionDto {
  visitorId: string;
  leadId?: number | null;
  sessionId?: number | null;
  propertyId: number;
  action: PropertyInteractionAction;
  actionCategory?: string | null;
  value?: Record<string, any> | null;
  apartmentId?: number | null;
  interactionTs?: Date;
  pageUrl?: string | null;
  referrerUrl?: string | null;
  device?: string | null;
  ipAddress?: string | null;
}

/**
 * Update property interaction DTO
 */
export interface UpdatePropertyInteractionDto {
  value?: Record<string, any> | null;
}

/**
 * Property interaction query parameters
 */
export interface PropertyInteractionQueryParams extends BaseQueryParams {
  visitorId?: string;
  leadId?: number;
  sessionId?: number;
  propertyId?: number;
  apartmentId?: number;
  action?: PropertyInteractionAction;
  actionCategory?: string;
  device?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Property Interactions Model class
 * Handles all database operations for property interactions
 */
class PropertyInteractionModel extends BaseModel
  PropertyInteraction,
  CreatePropertyInteractionDto,
  UpdatePropertyInteractionDto
> {
  protected tableName = "property_interactions";

  /**
   * Finds all property interactions matching query parameters
   *
   * @param params - Query parameters
   * @returns Promise<PropertyInteraction[]> - Array of interactions
   *
   * @example
   * const interactions = await PropertyInteractionModel.findAll({
   *   propertyId: 1,
   *   action: PropertyInteractionAction.VIEW
   * });
   */
  async findAll(
    params: PropertyInteractionQueryParams = {}
  ): Promise<PropertyInteraction[]> {
    let query = this.db(this.tableName);

    if (params.visitorId) {
      query = query.where({ visitor_id: params.visitorId });
    }

    if (params.leadId !== undefined) {
      query = query.where({ lead_id: params.leadId });
    }

    if (params.sessionId !== undefined) {
      query = query.where({ session_id: params.sessionId });
    }

    if (params.propertyId !== undefined) {
      query = query.where({ property_id: params.propertyId });
    }

    if (params.apartmentId !== undefined) {
      query = query.where({ apartment_id: params.apartmentId });
    }

    if (params.action) {
      query = query.where({ action: params.action });
    }

    if (params.actionCategory) {
      query = query.where({ action_category: params.actionCategory });
    }

    if (params.device) {
      query = query.where({ device: params.device });
    }

    if (params.dateFrom) {
      query = query.where("interaction_ts", ">=", params.dateFrom);
    }

    if (params.dateTo) {
      query = query.where("interaction_ts", "<=", params.dateTo);
    }

    if (params.sortBy) {
      query = query.orderBy(params.sortBy, params.sortOrder || "desc");
    } else {
      query = query.orderBy("interaction_ts", "desc");
    }

    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const interactions = await query;
    return interactions.map(this.mapToEntity);
  }

  /**
   * Gets interactions by visitor
   *
   * @param visitorId - Visitor UUID
   * @returns Promise<PropertyInteraction[]> - Visitor interactions
   *
   * @example
   * const visitorInteractions = await PropertyInteractionModel.getByVisitor("vis_abc123");
   */
  async getByVisitor(visitorId: string): Promise<PropertyInteraction[]> {
    return this.findAll({ visitorId });
  }

  /**
   * Gets interactions by property
   *
   * @param propertyId - Property ID
   * @param action - Optional action filter
   * @returns Promise<PropertyInteraction[]> - Property interactions
   *
   * @example
   * const propertyViews = await PropertyInteractionModel.getByProperty(1, PropertyInteractionAction.VIEW);
   */
  async getByProperty(
    propertyId: number,
    action?: PropertyInteractionAction
  ): Promise<PropertyInteraction[]> {
    return this.findAll({ propertyId, action });
  }

  /**
   * Gets interactions by session
   *
   * @param sessionId - Session ID
   * @returns Promise<PropertyInteraction[]> - Session interactions
   *
   * @example
   * const sessionInteractions = await PropertyInteractionModel.getBySession(123);
   */
  async getBySession(sessionId: number): Promise<PropertyInteraction[]> {
    return this.findAll({ sessionId });
  }

  /**
   * Gets property engagement statistics
   *
   * @param propertyId - Property ID
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Promise<any> - Engagement metrics
   *
   * @example
   * const stats = await PropertyInteractionModel.getPropertyStats(1);
   */
  async getPropertyStats(
    propertyId: number,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any> {
    let query = this.db(this.tableName).where({ property_id: propertyId });

    if (dateFrom) {
      query = query.where("interaction_ts", ">=", dateFrom);
    }

    if (dateTo) {
      query = query.where("interaction_ts", "<=", dateTo);
    }

    const results = await query
      .select("action")
      .count("* as count")
      .countDistinct("visitor_id as unique_visitors")
      .groupBy("action");

    const stats: Record<string, any> = {};
    results.forEach((row: any) => {
      stats[row.action] = {
        count: Number(row.count),
        uniqueVisitors: Number(row.unique_visitors),
      };
    });

    return stats;
  }

  /**
   * Gets top properties by interaction volume
   *
   * @param action - Optional action filter
   * @param limit - Maximum number of properties
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Promise<any[]> - Top properties
   *
   * @example
   * const topViewed = await PropertyInteractionModel.getTopProperties(PropertyInteractionAction.VIEW, 10);
   */
  async getTopProperties(
    action?: PropertyInteractionAction,
    limit: number = 10,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any[]> {
    let query = this.db(this.tableName).select("property_id");

    if (action) {
      query = query.where({ action });
    }

    if (dateFrom) {
      query = query.where("interaction_ts", ">=", dateFrom);
    }

    if (dateTo) {
      query = query.where("interaction_ts", "<=", dateTo);
    }

    const results = await query
      .count("* as interaction_count")
      .countDistinct("visitor_id as unique_visitors")
      .groupBy("property_id")
      .orderBy("interaction_count", "desc")
      .limit(limit);

    return results.map((row: any) => ({
      propertyId: row.property_id,
      interactionCount: Number(row.interaction_count),
      uniqueVisitors: Number(row.unique_visitors),
    }));
  }

  /**
   * Gets visitor's favorite properties
   *
   * @param visitorId - Visitor UUID
   * @returns Promise<number[]> - Array of property IDs
   *
   * @example
   * const favorites = await PropertyInteractionModel.getFavorites("vis_abc123");
   */
  async getFavorites(visitorId: string): Promise<number[]> {
    // Get properties that were favorited but not unfavorited
    const favorited = await this.db(this.tableName)
      .where({ visitor_id: visitorId, action: PropertyInteractionAction.FAVORITE })
      .select("property_id");

    const unfavorited = await this.db(this.tableName)
      .where({ visitor_id: visitorId, action: PropertyInteractionAction.UNFAVORITE })
      .select("property_id");

    const favoritedIds = favorited.map((r: any) => r.property_id);
    const unfavoritedIds = unfavorited.map((r: any) => r.property_id);

    return favoritedIds.filter((id: number) => !unfavoritedIds.includes(id));
  }

  /**
   * Checks if visitor favorited a property
   *
   * @param visitorId - Visitor UUID
   * @param propertyId - Property ID
   * @returns Promise<boolean> - Whether favorited
   *
   * @example
   * const isFavorited = await PropertyInteractionModel.isFavorited("vis_abc123", 1);
   */
  async isFavorited(visitorId: string, propertyId: number): Promise<boolean> {
    const favorites = await this.getFavorites(visitorId);
    return favorites.includes(propertyId);
  }

  /**
   * Gets conversion funnel (view → inquiry)
   *
   * @param propertyId - Property ID
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Promise<any> - Funnel metrics
   *
   * @example
   * const funnel = await PropertyInteractionModel.getConversionFunnel(1);
   */
  async getConversionFunnel(
    propertyId: number,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any> {
    let query = this.db(this.tableName).where({ property_id: propertyId });

    if (dateFrom) {
      query = query.where("interaction_ts", ">=", dateFrom);
    }

    if (dateTo) {
      query = query.where("interaction_ts", "<=", dateTo);
    }

    const [views, inquiries, calls, whatsapp] = await Promise.all([
      query
        .clone()
        .where({ action: PropertyInteractionAction.VIEW })
        .countDistinct("visitor_id as count")
        .first(),

      query
        .clone()
        .where({ action: PropertyInteractionAction.INQUIRY })
        .countDistinct("visitor_id as count")
        .first(),

      query
        .clone()
        .where({ action: PropertyInteractionAction.CALL })
        .countDistinct("visitor_id as count")
        .first(),

      query
        .clone()
        .where({ action: PropertyInteractionAction.WHATSAPP })
        .countDistinct("visitor_id as count")
        .first(),
    ]);

    const viewCount = Number(views?.count || 0);
    const inquiryCount = Number(inquiries?.count || 0);
    const callCount = Number(calls?.count || 0);
    const whatsappCount = Number(whatsapp?.count || 0);

    const conversionRate =
      viewCount > 0 ? ((inquiryCount + callCount + whatsappCount) / viewCount) * 100 : 0;

    return {
      views: viewCount,
      inquiries: inquiryCount,
      calls: callCount,
      whatsapp: whatsappCount,
      totalConversions: inquiryCount + callCount + whatsappCount,
      conversionRate: Math.round(conversionRate * 10) / 10,
    };
  }

  /**
   * Maps database record to PropertyInteraction entity
   *
   * @param record - Database record
   * @returns PropertyInteraction entity
   *
   * @protected
   */
  protected mapToEntity(record: any): PropertyInteraction {
    return {
      id: record.id,
      visitorId: record.

      /** TO BE COMPLETED */