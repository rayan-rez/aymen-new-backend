/**
 * Event Influencer Model
 * 
 * Manages influencer collaborations for events
 * Tracks deliverables, reach, engagement, and compensation
 * 
 * @module models/event-influencer.model
 */

import {
  BaseModel,
  AdvancedQueryOptions,
  PaginatedResult,
  DatabaseRecord,
} from "./base";
import { Knex } from "knex";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * @openapi
 * components:
 *   schemas:
 *     
 *     InfluencerTier:
 *       type: string
 *       enum:
 *         - micro
 *         - macro
 *         - mega
 *         - celebrity
 *       description: |
 *         Influencer tier based on follower count:
 *         - micro: <100K followers
 *         - macro: 100K-1M followers  
 *         - mega: >1M followers
 *         - celebrity: Celebrity status
 *       example: macro
 *     
 *     CollaborationStatus:
 *       type: string
 *       enum:
 *         - invited
 *         - confirmed
 *         - declined
 *         - attended
 *         - cancelled
 *       description: Current status of influencer collaboration
 *       example: confirmed
 *     
 *     EventInfluencer:
 *       type: object
 *       required:
 *         - id
 *         - eventId
 *         - influencerName
 *         - tier
 *         - status
 *         - compensationCurrency
 *         - requiredPosts
 *         - completedPosts
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the influencer collaboration
 *           example: 1
 *         eventId:
 *           type: integer
 *           description: Associated event identifier
 *           example: 5
 *         influencerName:
 *           type: string
 *           description: Full name of the influencer
 *           example: "Sarah Johnson"
 *         influencerHandle:
 *           type: string
 *           nullable: true
 *           description: Social media handle/username
 *           example: "@sarah_johnson_official"
 *         influencerEmail:
 *           type: string
 *           nullable: true
 *           description: Contact email address
 *           example: "sarah@influencer.com"
 *         influencerPhone:
 *           type: string
 *           nullable: true
 *           description: Contact phone number
 *           example: "+1-555-0123"
 *         socialLinks:
 *           type: object
 *           nullable: true
 *           description: JSON object containing social media platform links
 *           example: {"instagram": "https://instagram.com/sarah", "tiktok": "https://tiktok.com/@sarah"}
 *         followerCount:
 *           type: integer
 *           nullable: true
 *           description: Total follower count across platforms
 *           example: 250000
 *         tier:
 *           $ref: '#/components/schemas/InfluencerTier'
 *         status:
 *           $ref: '#/components/schemas/CollaborationStatus'
 *         role:
 *           type: string
 *           nullable: true
 *           description: Specific role or title for the event
 *           example: "VIP Guest Speaker"
 *         compensationAmount:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Compensation amount in specified currency
 *           example: 5000.00
 *         compensationCurrency:
 *           type: string
 *           description: Currency code for compensation
 *           example: "USD"
 *         contractTerms:
 *           type: string
 *           nullable: true
 *           description: Contract terms and conditions
 *           example: "Must post 3 stories and 1 feed post during event"
 *         requiredPosts:
 *           type: integer
 *           description: Number of required social media posts
 *           example: 4
 *         completedPosts:
 *           type: integer
 *           description: Number of completed social media posts
 *           example: 2
 *         reachAchieved:
 *           type: integer
 *           nullable: true
 *           description: Total reach achieved across all posts
 *           example: 50000
 *         engagementCount:
 *           type: integer
 *           nullable: true
 *           description: Total engagement count (likes, comments, shares)
 *           example: 2500
 *         notes:
 *           type: string
 *           nullable: true
 *           description: Public notes about the collaboration
 *           example: "Great engagement with luxury brands"
 *         internalNotes:
 *           type: string
 *           nullable: true
 *           description: Internal team notes (hidden from API responses)
 *           example: "High maintenance but delivers results"
 *         customFields:
 *           type: object
 *           nullable: true
 *           description: Custom fields for additional data
 *           example: {"niche": "luxury_lifestyle", "brand_affinity": "high"}
 *         invitedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when influencer was invited
 *           example: "2024-01-15T10:30:00Z"
 *         confirmedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when influencer confirmed participation
 *           example: "2024-01-20T14:45:00Z"
 *         attendedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when influencer attended the event
 *           example: "2024-02-01T18:00:00Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2024-01-25T16:20:00Z"
 *         event:
 *           type: object
 *           description: Virtual relation - associated event data
 *     
 *     CreateInfluencerDto:
 *       type: object
 *       required:
 *         - eventId
 *         - influencerName
 *       properties:
 *         eventId:
 *           type: integer
 *           description: Associated event identifier
 *           example: 5
 *         influencerName:
 *           type: string
 *           description: Full name of the influencer
 *           example: "Sarah Johnson"
 *         influencerHandle:
 *           type: string
 *           description: Social media handle/username
 *           example: "@sarah_johnson_official"
 *         influencerEmail:
 *           type: string
 *           description: Contact email address
 *           example: "sarah@influencer.com"
 *         influencerPhone:
 *           type: string
 *           description: Contact phone number
 *           example: "+1-555-0123"
 *         socialLinks:
 *           type: object
 *           description: JSON object containing social media platform links
 *           example: {"instagram": "https://instagram.com/sarah", "tiktok": "https://tiktok.com/@sarah"}
 *         followerCount:
 *           type: integer
 *           description: Total follower count across platforms
 *           example: 250000
 *         tier:
 *           $ref: '#/components/schemas/InfluencerTier'
 *         status:
 *           $ref: '#/components/schemas/CollaborationStatus'
 *         role:
 *           type: string
 *           description: Specific role or title for the event
 *           example: "VIP Guest Speaker"
 *         compensationAmount:
 *           type: number
 *           format: float
 *           description: Compensation amount in specified currency
 *           example: 5000.00
 *         compensationCurrency:
 *           type: string
 *           description: Currency code for compensation
 *           example: "USD"
 *         contractTerms:
 *           type: string
 *           description: Contract terms and conditions
 *           example: "Must post 3 stories and 1 feed post during event"
 *         requiredPosts:
 *           type: integer
 *           description: Number of required social media posts
 *           example: 4
 *         completedPosts:
 *           type: integer
 *           description: Number of completed social media posts
 *           example: 2
 *         reachAchieved:
 *           type: integer
 *           description: Total reach achieved across all posts
 *           example: 50000
 *         engagementCount:
 *           type: integer
 *           description: Total engagement count (likes, comments, shares)
 *           example: 2500
 *         notes:
 *           type: string
 *           description: Public notes about the collaboration
 *           example: "Great engagement with luxury brands"
 *         internalNotes:
 *           type: string
 *           description: Internal team notes (hidden from API responses)
 *           example: "High maintenance but delivers results"
 *         customFields:
 *           type: object
 *           description: Custom fields for additional data
 *           example: {"niche": "luxury_lifestyle", "brand_affinity": "high"}
 *         invitedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when influencer was invited
 *           example: "2024-01-15T10:30:00Z"
 *     
 *     UpdateInfluencerDto:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateInfluencerDto'
 *         - type: object
 *           properties:
 *             confirmedAt:
 *               type: string
 *               format: date-time
 *               nullable: true
 *               description: Timestamp when influencer confirmed participation
 *               example: "2024-01-20T14:45:00Z"
 *             attendedAt:
 *               type: string
 *               format: date-time
 *               nullable: true
 *               description: Timestamp when influencer attended the event
 *               example: "2024-02-01T18:00:00Z"
 *     
 *     InfluencerQueryOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/AdvancedQueryOptions'
 *         - type: object
 *           properties:
 *             eventId:
 *               type: integer
 *               description: Filter by event ID
 *               example: 5
 *             tier:
 *               $ref: '#/components/schemas/InfluencerTier'
 *             status:
 *               $ref: '#/components/schemas/CollaborationStatus'
 *             minFollowers:
 *               type: integer
 *               description: Minimum follower count filter
 *               example: 10000
 *             maxFollowers:
 *               type: integer
 *               description: Maximum follower count filter
 *               example: 1000000
 *             hasAttended:
 *               type: boolean
 *               description: Filter by attendance status
 *               example: true
 *             hasEmail:
 *               type: boolean
 *               description: Filter by email presence
 *               example: true
 *     
 *     InfluencerStatistics:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of influencers
 *           example: 25
 *         confirmed:
 *           type: integer
 *           description: Number of confirmed influencers
 *           example: 18
 *         attended:
 *           type: integer
 *           description: Number of influencers who attended
 *           example: 15
 *         declined:
 *           type: integer
 *           description: Number of declined influencers
 *           example: 5
 *         totalFollowers:
 *           type: integer
 *           description: Combined follower count of all influencers
 *           example: 5000000
 *         totalReach:
 *           type: integer
 *           description: Total reach achieved across all posts
 *           example: 2500000
 *         totalEngagement:
 *           type: integer
 *           description: Total engagement count across all posts
 *           example: 125000
 *         totalRequiredPosts:
 *           type: integer
 *           description: Total number of required posts
 *           example: 100
 *         totalCompletedPosts:
 *           type: integer
 *           description: Total number of completed posts
 *           example: 85
 *         totalCompensation:
 *           type: number
 *           format: float
 *           description: Total compensation amount
 *           example: 50000.00
 *         deliverableCompletionRate:
 *           type: number
 *           format: float
 *           description: Percentage of deliverables completed
 *           example: 85.0
 *     
 *     TierDistribution:
 *       type: object
 *       properties:
 *         tier:
 *           $ref: '#/components/schemas/InfluencerTier'
 *         count:
 *           type: integer
 *           description: Number of influencers in this tier
 *           example: 8
 *         totalFollowers:
 *           type: integer
 *           description: Combined follower count for this tier
 *           example: 1200000
 */

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
 * @openapi
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
 * @openapi
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
 * @openapi
 * Update influencer DTO
 */
export interface UpdateInfluencerDto extends Partial<CreateInfluencerDto> {
  confirmedAt?: Date | null;
  attendedAt?: Date | null;
}

/**
 * @openapi
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

/**
 * @openapi
 * Event Influencer Model Class
 * 
 * Manages influencer collaborations for events with comprehensive tracking
 * of deliverables, reach, engagement metrics, and compensation
 * 
 * @class EventInfluencerModel
 * @extends BaseModel<EventInfluencer, CreateInfluencerDto, UpdateInfluencerDto>
 */
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
   * @openapi
   * beforeCreate lifecycle hook
   * 
   * Validates and processes influencer data before creation:
   * - Validates that associated event exists
   * - Prevents duplicate emails for same event
   * - Auto-calculates tier based on follower count
   * - Sets default values for status, currency, and post counts
   * - Sets invitation timestamp
   * 
   * @param {CreateInfluencerDto} data - Influencer creation data
   * @returns {Promise<CreateInfluencerDto>} Processed data
   * @throws {Error} If validation fails
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
   * @openapi
   * afterCreate lifecycle hook
   * 
   * Logs influencer creation event
   * 
   * @param {EventInfluencer} entity - Created influencer entity
   * @returns {Promise<void>}
   */
  protected async afterCreate(entity: EventInfluencer): Promise<void> {
    console.log(
      `✅ Influencer ${entity.influencerName} added to event ${entity.eventId}`
    );
  }

  /**
   * @openapi
   * beforeUpdate lifecycle hook
   * 
   * Validates and processes influencer data before update:
   * - Sets confirmation timestamp when status changes to confirmed
   * - Sets attendance timestamp when marked as attended
   * - Validates that completed posts don't exceed required posts
   * - Updates tier if follower count changes
   * 
   * @param {number} id - Influencer ID
   * @param {UpdateInfluencerDto} data - Influencer update data
   * @returns {Promise<UpdateInfluencerDto>} Processed data
   * @throws {Error} If validation fails
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
   * @openapi
   * Finds influencers with custom filters
   * 
   * @param {InfluencerQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventInfluencer[]>} Array of influencers
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
   * @openapi
   * Gets paginated influencers
   * 
   * @param {InfluencerQueryOptions & { page: number; limit: number }} options - Query and pagination options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<PaginatedResult<EventInfluencer>>} Paginated result
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
   * @openapi
   * Counts influencers with filters
   * 
   * @param {InfluencerQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<number>} Count of influencers
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
   * @openapi
   * Finds influencers by event
   * 
   * @param {number} eventId - Event identifier
   * @param {InfluencerQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventInfluencer[]>} Array of influencers for the event
   */
  async findByEvent(
    eventId: number,
    options: InfluencerQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<EventInfluencer[]> {
    return this.findInfluencers({ ...options, eventId }, trx);
  }

  /**
   * @openapi
   * Finds confirmed influencers
   * 
   * @param {number} eventId - Event identifier
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventInfluencer[]>} Array of confirmed influencers
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
   * @openapi
   * Finds attended influencers
   * 
   * @param {number} eventId - Event identifier
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventInfluencer[]>} Array of attended influencers
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
   * @openapi
   * Finds by tier
   * 
   * @param {InfluencerTier} tier - Influencer tier
   * @param {InfluencerQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventInfluencer[]>} Array of influencers in the specified tier
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
   * @openapi
   * Updates status
   * 
   * @param {number} id - Influencer ID
   * @param {CollaborationStatus} status - New status
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventInfluencer | null>} Updated influencer or null
   */
  async updateStatus(
    id: number,
    status: CollaborationStatus,
    trx?: Knex.Transaction
  ): Promise<EventInfluencer | null> {
    return this.update(id, { status }, trx);
  }

  /**
   * @openapi
   * Confirms collaboration
   * 
   * @param {number} id - Influencer ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventInfluencer | null>} Updated influencer or null
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
   * @openapi
   * Marks as attended
   * 
   * @param {number} id - Influencer ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventInfluencer | null>} Updated influencer or null
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
   * @openapi
   * Cancels collaboration
   * 
   * @param {number} id - Influencer ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventInfluencer | null>} Updated influencer or null
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
   * @openapi
   * Updates post count
   * 
   * @param {number} id - Influencer ID
   * @param {number} completedPosts - New completed post count
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventInfluencer | null>} Updated influencer or null
   */
  async updatePostCount(
    id: number,
    completedPosts: number,
    trx?: Knex.Transaction
  ): Promise<EventInfluencer | null> {
    return this.update(id, { completedPosts }, trx);
  }

  /**
   * @openapi
   * Increments completed posts
   * 
   * @param {number} id - Influencer ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventInfluencer | null>} Updated influencer or null
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
   * @openapi
   * Updates reach and engagement metrics
   * 
   * @param {number} id - Influencer ID
   * @param {object} data - Metrics data
   * @param {number} [data.reachAchieved] - Total reach achieved
   * @param {number} [data.engagementCount] - Total engagement count
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventInfluencer | null>} Updated influencer or null
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
   * @openapi
   * Gets influencer statistics for an event
   * 
   * @param {number} eventId - Event identifier
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<InfluencerStatistics>} Comprehensive statistics object
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
   * @openapi
   * Gets tier distribution for an event
   * 
   * @param {number} eventId - Event identifier
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<TierDistribution[]>} Array of tier distributions
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
   * @openapi
   * Gets top performing influencers by reach
   * 
   * @param {number} eventId - Event identifier
   * @param {number} [limit=10] - Maximum number of results
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventInfluencer[]>} Array of top performing influencers
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
   * @openapi
   * Calculates influencer tier based on follower count
   * 
   * @param {number} followerCount - Number of followers
   * @returns {InfluencerTier} Calculated tier
   */
  private calculateTier(followerCount: number): InfluencerTier {
    if (followerCount < 100000) return InfluencerTier.MICRO;
    if (followerCount < 1000000) return InfluencerTier.MACRO;
    return InfluencerTier.MEGA;
  }

  /**
   * @openapi
   * Applies influencer-specific filters to query
   * 
   * @param {Knex.QueryBuilder} query - Database query builder
   * @param {InfluencerQueryOptions} options - Query options
   * @returns {Knex.QueryBuilder} Modified query builder
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
   * @openapi
   * Maps database record to EventInfluencer entity
   * 
   * @param {DatabaseRecord} record - Database record
   * @returns {EventInfluencer} EventInfluencer entity
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