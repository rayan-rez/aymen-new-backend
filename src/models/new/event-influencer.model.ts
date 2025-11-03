/**
 * Event Influencer Model
 *
 * Manages influencer collaborations for events
 * Tracks deliverables, reach, engagement, and compensation
 *
 * @module models/event-influencer.model
 */

import { BaseModel, AdvancedQueryOptions, PaginatedResult, DatabaseRecord } from "../base";
import { Knex } from "knex";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Influencer tier enumeration
 */
export enum InfluencerTier {
  MICRO = "micro", // <100K followers
  MACRO = "macro", // 100K-1M followers
  MEGA = "mega", // >1M followers
  CELEBRITY = "celebrity",
}

/**
 * Collaboration status enumeration
 */
export enum CollaborationStatus {
  INVITED = "invited",
  CONFIRMED = "confirmed",
  DECLINED = "declined",
  ATTENDED = "attended",
  CANCELLED = "cancelled",
}

/**
 * Event influencer entity interface
 */
export interface EventInfluencer {
  id: number;
  eventId: number;

  // Influencer information
  influencerName: string;
  influencerHandle: string | null;
  influencerEmail: string | null;
  influencerPhone: string | null;

  // Social media
  socialLinks: Record<string, string> | null;

  // Metrics
  followerCount: number | null;
  tier: InfluencerTier;

  // Collaboration details
  status: CollaborationStatus;
  role: string | null;
  compensationAmount: number | null;
  compensationCurrency: string;
  contractTerms: string | null;

  // Deliverables & tracking
  requiredPosts: number;
  completedPosts: number;
  reachAchieved: number | null;
  engagementCount: number | null;

  // Notes
  notes: string | null;
  internalNotes: string | null;
  customFields: Record<string, any> | null;

  // Dates
  invitedAt: Date | null;
  confirmedAt: Date | null;
  attendedAt: Date | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Virtual relations
  event?: any;
}

/**
 * Create influencer DTO
 */
export interface CreateInfluencerDto {
  eventId: number;
  influencerName: string;
  influencerHandle?: string;
  influencerEmail?: string;
  influencerPhone?: string;
  socialLinks?: Record<string, string>;
  followerCount?: number;
  tier?: InfluencerTier;
  status?: CollaborationStatus;
  role?: string;
  compensationAmount?: number;
  compensationCurrency?: string;
  contractTerms?: string;
  requiredPosts?: number;
  completedPosts?: number;
  reachAchieved?: number;
  engagementCount?: number;
  notes?: string;
  internalNotes?: string;
  customFields?: Record<string, any>;
  invitedAt?: Date;
}

/**
 * Update influencer DTO
 */
export interface UpdateInfluencerDto extends Partial<CreateInfluencerDto> {
  confirmedAt?: Date | null;
  attendedAt?: Date | null;
}

/**
 * Influencer query options
 */
export interface InfluencerQueryOptions extends AdvancedQueryOptions {
  eventId?: number | number[];
  tier?: InfluencerTier | InfluencerTier[];
  status?: CollaborationStatus | CollaborationStatus[];
  minFollowers?: number;
  maxFollowers?: number;
  hasAttended?: boolean;
  hasEmail?: boolean;
}

// ============================================================================
// EVENT INFLUENCER MODEL CLASS
// ============================================================================

export class EventInfluencerModel extends BaseModel<
  EventInfluencer,
  CreateInfluencerDto,
  UpdateInfluencerDto
> {
  protected tableName = "event_influencers";
  protected primaryKey = "id";

  protected config = {
    softDelete: false,
    timestamps: true,
    defaultSortColumn: "follower_count",
    defaultSortOrder: "desc" as const,
    searchableColumns: [
      "influencer_name",
      "influencer_handle",
      "influencer_email",
    ],
    hiddenFields: ["internalNotes"],
    fillable: [
      "eventId",
      "influencerName",
      "influencerHandle",
      "influencerEmail",
      "influencerPhone",
      "socialLinks",
      "followerCount",
      "tier",
      "status",
      "role",
      "compensationAmount",
      "compensationCurrency",
      "contractTerms",
      "requiredPosts",
      "completedPosts",
      "reachAchieved",
      "engagementCount",
      "notes",
      "internalNotes",
      "customFields",
      "invitedAt",
      "confirmedAt",
      "attendedAt",
    ],
    guarded: ["id", "createdAt", "updatedAt"],
  };

  // Define relations
  protected relations = {
    event: {
      type: "belongsTo" as const,
      model: () => require("./event.model").default,
      foreignKey: "eventId",
      localKey: "id",
    },
  };

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Before create hook - validate and set defaults
   */
  protected async beforeCreate(
    data: CreateInfluencerDto
  ): Promise<CreateInfluencerDto> {
    // Check if event exists
    const EventModel = require("./event.model").default;
    const event = await EventModel.findById(data.eventId);

    if (!event) {
      throw new Error(`Event with ID ${data.eventId} not found`);
    }

    // Check for duplicate email for same event
    if (data.influencerEmail) {
      const existing = await this.findOne({
        eventId: data.eventId,
        influencerEmail: data.influencerEmail,
      });

      if (existing) {
        throw new Error("Influencer email already exists for this event");
      }
    }

    // Set default tier based on follower count
    if (!data.tier && data.followerCount) {
      data.tier = this.calculateTier(data.followerCount);
    }

    // Set defaults
    if (!data.status) {
      data.status = CollaborationStatus.INVITED;
    }

    if (!data.compensationCurrency) {
      data.compensationCurrency = "DZD";
    }

    if (!data.requiredPosts) {
      data.requiredPosts = 0;
    }

    if (!data.completedPosts) {
      data.completedPosts = 0;
    }

    if (!data.invitedAt) {
      data.invitedAt = new Date();
    }

    return data;
  }

  /**
   * After create hook
   */
  protected async afterCreate(entity: EventInfluencer): Promise<void> {
    console.log(
      `✅ Influencer ${entity.influencerName} added to event ${entity.eventId}`
    );
  }

  /**
   * Before update hook
   */
  protected async beforeUpdate(
    id: number,
    data: UpdateInfluencerDto
  ): Promise<UpdateInfluencerDto> {
    const influencer = await this.findById(id);
    if (!influencer) {
      throw new Error("Influencer not found");
    }

    // Set confirmed timestamp
    if (
      data.status === CollaborationStatus.CONFIRMED &&
      influencer.status !== CollaborationStatus.CONFIRMED
    ) {
      data.confirmedAt = new Date();
    }

    // Set attended timestamp
    if (
      data.status === CollaborationStatus.ATTENDED &&
      !influencer.attendedAt
    ) {
      data.attendedAt = new Date();
    }

    // Validate completed posts doesn't exceed required
    if (data.completedPosts !== undefined) {
      const requiredPosts = data.requiredPosts ?? influencer.requiredPosts;
      if (data.completedPosts > requiredPosts) {
        throw new Error("Completed posts cannot exceed required posts");
      }
    }

    // Update tier if follower count changes
    if (data.followerCount && !data.tier) {
      data.tier = this.calculateTier(data.followerCount);
    }

    return data;
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Finds influencers with custom filters
   */
  async findInfluencers(
    options: InfluencerQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<EventInfluencer[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    // Apply influencer-specific filters
    query = this.applyInfluencerFilters(query, options);

    const records = await query;
    let entities = records.map((r: DatabaseRecord) => this.mapToEntity(r));

    // Load relations if requested
    if (options.relations && options.relations.length > 0) {
      entities = await this.loadRelationsForMany(
        entities,
        options.relations,
        trx
      );
    }

    return entities;
  }

  /**
   * Gets paginated influencers
   */
  async paginateInfluencers(
    options: InfluencerQueryOptions & { page: number; limit: number },
    trx?: Knex.Transaction
  ): Promise<PaginatedResult<EventInfluencer>> {
    const { page, limit } = options;

    const [items, total] = await Promise.all([
      this.findInfluencers(options, trx),
      this.countInfluencers(options, trx),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Counts influencers with filters
   */
  async countInfluencers(
    options: InfluencerQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    query = this.applyInfluencerFilters(query, options);

    const result = await query.count(`${this.primaryKey} as count`).first();
    return result ? Number(result.count) : 0;
  }

  /**
   * Finds influencers by event
   */
  async findByEvent(
    eventId: number,
    options: InfluencerQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<EventInfluencer[]> {
    return this.findInfluencers({ ...options, eventId }, trx);
  }

  /**
   * Finds confirmed influencers
   */
  async findConfirmed(
    eventId: number,
    trx?: Knex.Transaction
  ): Promise<EventInfluencer[]> {
    return this.findInfluencers(
      { eventId, status: CollaborationStatus.CONFIRMED },
      trx
    );
  }

  /**
   * Finds attended influencers
   */
  async findAttended(
    eventId: number,
    trx?: Knex.Transaction
  ): Promise<EventInfluencer[]> {
    return this.findInfluencers(
      { eventId, status: CollaborationStatus.ATTENDED },
      trx
    );
  }

  /**
   * Finds by tier
   */
  async findByTier(
    tier: InfluencerTier,
    options: InfluencerQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<EventInfluencer[]> {
    return this.findInfluencers({ ...options, tier }, trx);
  }

  // ============================================================================
  // STATUS MANAGEMENT
  // ============================================================================

  /**
   * Updates status
   */
  async updateStatus(
    id: number,
    status: CollaborationStatus,
    trx?: Knex.Transaction
  ): Promise<EventInfluencer | null> {
    return this.update(id, { status }, trx);
  }

  /**
   * Confirms collaboration
   */
  async confirm(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventInfluencer | null> {
    return this.update(
      id,
      {
        status: CollaborationStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
      trx
    );
  }

  /**
   * Marks as attended
   */
  async markAttended(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventInfluencer | null> {
    return this.update(
      id,
      {
        status: CollaborationStatus.ATTENDED,
        attendedAt: new Date(),
      },
      trx
    );
  }

  /**
   * Cancels collaboration
   */
  async cancel(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventInfluencer | null> {
    return this.update(id, { status: CollaborationStatus.CANCELLED }, trx);
  }

  // ============================================================================
  // DELIVERABLES TRACKING
  // ============================================================================

  /**
   * Updates post count
   */
  async updatePostCount(
    id: number,
    completedPosts: number,
    trx?: Knex.Transaction
  ): Promise<EventInfluencer | null> {
    return this.update(id, { completedPosts }, trx);
  }

  /**
   * Increments completed posts
   */
  async incrementCompletedPosts(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventInfluencer | null> {
    const connection = trx || this.db;

    await connection(this.tableName)
      .where({ id })
      .increment("completed_posts", 1);

    return this.findById(id, {}, trx);
  }

  /**
   * Updates reach and engagement
   */
  async updateMetrics(
    id: number,
    data: { reachAchieved?: number; engagementCount?: number },
    trx?: Knex.Transaction
  ): Promise<EventInfluencer | null> {
    return this.update(id, data, trx);
  }

  // ============================================================================
  // STATISTICS METHODS
  // ============================================================================

  /**
   * Gets influencer statistics for an event
   */
  async getEventStatistics(
    eventId: number,
    trx?: Knex.Transaction
  ): Promise<any> {
    const connection = trx || this.db;

    const [stats] = await connection(this.tableName)
      .where({ event_id: eventId })
      .select(
        connection.raw("COUNT(*) as total"),
        connection.raw(
          "COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed"
        ),
        connection.raw(
          "COUNT(CASE WHEN status = 'attended' THEN 1 END) as attended"
        ),
        connection.raw(
          "COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined"
        ),
        connection.raw("SUM(follower_count) as totalFollowers"),
        connection.raw("SUM(reach_achieved) as totalReach"),
        connection.raw("SUM(engagement_count) as totalEngagement"),
        connection.raw("SUM(required_posts) as totalRequiredPosts"),
        connection.raw("SUM(completed_posts) as totalCompletedPosts"),
        connection.raw("SUM(compensation_amount) as totalCompensation")
      );

    return {
      total: Number(stats.total),
      confirmed: Number(stats.confirmed),
      attended: Number(stats.attended),
      declined: Number(stats.declined),
      totalFollowers: Number(stats.totalFollowers || 0),
      totalReach: Number(stats.totalReach || 0),
      totalEngagement: Number(stats.totalEngagement || 0),
      totalRequiredPosts: Number(stats.totalRequiredPosts || 0),
      totalCompletedPosts: Number(stats.totalCompletedPosts || 0),
      totalCompensation: Number(stats.totalCompensation || 0),
      deliverableCompletionRate:
        Number(stats.totalRequiredPosts) > 0
          ? (Number(stats.totalCompletedPosts) /
              Number(stats.totalRequiredPosts)) *
            100
          : 0,
    };
  }

  /**
   * Gets tier distribution for an event
   */
  async getTierDistribution(
    eventId: number,
    trx?: Knex.Transaction
  ): Promise<any[]> {
    const connection = trx || this.db;

    return connection(this.tableName)
      .where({ event_id: eventId })
      .select("tier")
      .count("* as count")
      .sum("follower_count as totalFollowers")
      .groupBy("tier")
      .orderBy("totalFollowers", "desc");
  }

  /**
   * Gets top performers
   */
  async getTopPerformers(
    eventId: number,
    limit: number = 10,
    trx?: Knex.Transaction
  ): Promise<EventInfluencer[]> {
    const connection = trx || this.db;

    const records = await connection(this.tableName)
      .where({ event_id: eventId })
      .orderBy("reach_achieved", "desc")
      .limit(limit);

    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculates influencer tier based on follower count
   */
  private calculateTier(followerCount: number): InfluencerTier {
    if (followerCount < 100000) return InfluencerTier.MICRO;
    if (followerCount < 1000000) return InfluencerTier.MACRO;
    return InfluencerTier.MEGA;
  }

  /**
   * Applies influencer-specific filters to query
   */
  private applyInfluencerFilters(
    query: Knex.QueryBuilder,
    options: InfluencerQueryOptions
  ): Knex.QueryBuilder {
    // Event filter
    if (options.eventId) {
      if (Array.isArray(options.eventId)) {
        query = query.whereIn("event_id", options.eventId);
      } else {
        query = query.where("event_id", options.eventId);
      }
    }

    // Tier filter
    if (options.tier) {
      if (Array.isArray(options.tier)) {
        query = query.whereIn("tier", options.tier);
      } else {
        query = query.where("tier", options.tier);
      }
    }

    // Status filter
    if (options.status) {
      if (Array.isArray(options.status)) {
        query = query.whereIn("status", options.status);
      } else {
        query = query.where("status", options.status);
      }
    }

    // Follower count range
    if (options.minFollowers !== undefined) {
      query = query.where("follower_count", ">=", options.minFollowers);
    }
    if (options.maxFollowers !== undefined) {
      query = query.where("follower_count", "<=", options.maxFollowers);
    }

    // Has attended filter
    if (options.hasAttended !== undefined) {
      if (options.hasAttended) {
        query = query.whereNotNull("attended_at");
      } else {
        query = query.whereNull("attended_at");
      }
    }

    // Has email filter
    if (options.hasEmail !== undefined) {
      if (options.hasEmail) {
        query = query.whereNotNull("influencer_email");
      } else {
        query = query.whereNull("influencer_email");
      }
    }

    return query;
  }

  /**
   * Maps database record to EventInfluencer entity
   */
  protected mapToEntity(record: DatabaseRecord): EventInfluencer {
    return {
      id: record.id,
      eventId: record.event_id,
      influencerName: record.influencer_name,
      influencerHandle: record.influencer_handle,
      influencerEmail: record.influencer_email,
      influencerPhone: record.influencer_phone,
      socialLinks: this.parseJson(record.social_links),
      followerCount: record.follower_count,
      tier: record.tier as InfluencerTier,
      status: record.status as CollaborationStatus,
      role: record.role,
      compensationAmount: record.compensation_amount
        ? Number(record.compensation_amount)
        : null,
      compensationCurrency: record.compensation_currency || "DZD",
      contractTerms: record.contract_terms,
      requiredPosts: record.required_posts || 0,
      completedPosts: record.completed_posts || 0,
      reachAchieved: record.reach_achieved,
      engagementCount: record.engagement_count,
      notes: record.notes,
      internalNotes: record.internal_notes,
      customFields: this.parseJson(record.custom_fields),
      invitedAt: record.invited_at ? new Date(record.invited_at) : null,
      confirmedAt: record.confirmed_at ? new Date(record.confirmed_at) : null,
      attendedAt: record.attended_at ? new Date(record.attended_at) : null,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

// Export singleton instance
export default new EventInfluencerModel();
