/**
 * Lead Mirror Model
 *
 * Minimal local table that mirrors leads created in Odoo ERP.
 * Acts as correlation table between local form submissions and external CRM.
 *
 * @module models/lead-mirror.model
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
 *     LeadType:
 *       type: string
 *       enum:
 *         - contact_form
 *         - project_inquiry
 *         - appointment
 *         - catalog_download
 *         - land_submission
 *         - job_application
 *         - event_registration
 *       description: Type of lead (mirrors form types)
 *       example: contact_form
 *     
 *     SyncStatus:
 *       type: string
 *       enum:
 *         - pending
 *         - synced
 *         - failed
 *         - updated
 *       description: Synchronization status with Odoo CRM
 *       example: synced
 *     
 *     LeadMirror:
 *       type: object
 *       required:
 *         - id
 *         - odooLeadId
 *         - formSubmissionId
 *         - leadType
 *         - syncStatus
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the lead mirror
 *           example: 1
 *         odooLeadId:
 *           type: string
 *           description: Corresponding Odoo CRM lead ID
 *           example: "ODOO-12345"
 *         formSubmissionId:
 *           type: integer
 *           description: Associated form submission ID
 *           example: 456
 *         leadType:
 *           $ref: '#/components/schemas/LeadType'
 *         email:
 *           type: string
 *           nullable: true
 *           format: email
 *           description: Cached email address for quick access
 *           example: "john.doe@example.com"
 *         phone:
 *           type: string
 *           nullable: true
 *           description: Cached phone number for quick access
 *           example: "+1-555-0123"
 *         syncStatus:
 *           $ref: '#/components/schemas/SyncStatus'
 *         syncedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When lead was last successfully synced
 *           example: "2024-01-15T10:30:00Z"
 *         lastOdooUpdate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When lead was last updated in Odoo
 *           example: "2024-01-16T14:20:00Z"
 *         syncError:
 *           type: string
 *           nullable: true
 *           description: Error message if sync failed
 *           example: "Connection timeout to Odoo API"
 *         syncRetryCount:
 *           type: integer
 *           description: Number of sync retry attempts
 *           example: 2
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         formSubmission:
 *           type: object
 *           description: Virtual relation - associated form submission data
 *         eventRegistrations:
 *           type: array
 *           items:
 *             type: object
 *           description: Virtual relation - associated event registrations
 *     
 *     CreateLeadMirrorDto:
 *       type: object
 *       required:
 *         - odooLeadId
 *         - formSubmissionId
 *         - leadType
 *       properties:
 *         odooLeadId:
 *           type: string
 *           description: Corresponding Odoo CRM lead ID
 *           example: "ODOO-12345"
 *         formSubmissionId:
 *           type: integer
 *           description: Associated form submission ID
 *           example: 456
 *         leadType:
 *           $ref: '#/components/schemas/LeadType'
 *         email:
 *           type: string
 *           format: email
 *           description: Cached email address for quick access
 *           example: "john.doe@example.com"
 *         phone:
 *           type: string
 *           description: Cached phone number for quick access
 *           example: "+1-555-0123"
 *         syncStatus:
 *           $ref: '#/components/schemas/SyncStatus'
 *         syncedAt:
 *           type: string
 *           format: date-time
 *           description: When lead was last successfully synced
 *           example: "2024-01-15T10:30:00Z"
 *         lastOdooUpdate:
 *           type: string
 *           format: date-time
 *           description: When lead was last updated in Odoo
 *           example: "2024-01-16T14:20:00Z"
 *         syncError:
 *           type: string
 *           nullable: true
 *           description: Error message if sync failed
 *           example: "Connection timeout to Odoo API"
 *         syncRetryCount:
 *           type: integer
 *           description: Number of sync retry attempts
 *           example: 0
 *     
 *     UpdateLeadMirrorDto:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateLeadMirrorDto'
 *         - type: object
 *           properties:
 *             id:
 *               type: integer
 *               description: Lead mirror ID (for update operations)
 *               example: 1
 *     
 *     LeadMirrorQueryOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/AdvancedQueryOptions'
 *         - type: object
 *           properties:
 *             leadType:
 *               $ref: '#/components/schemas/LeadType'
 *             syncStatus:
 *               $ref: '#/components/schemas/SyncStatus'
 *             formSubmissionId:
 *               type: integer
 *               description: Filter by form submission ID
 *               example: 456
 *             odooLeadId:
 *               type: string
 *               description: Filter by Odoo lead ID
 *               example: "ODOO-12345"
 *             email:
 *               type: string
 *               description: Filter by email (partial match)
 *               example: "john@"
 *             phone:
 *               type: string
 *               description: Filter by phone (partial match)
 *               example: "555"
 *             hasSyncError:
 *               type: boolean
 *               description: Filter by sync error presence
 *               example: false
 *             syncedAfter:
 *               type: string
 *               format: date-time
 *               description: Filter leads synced after this date
 *               example: "2024-01-01T00:00:00Z"
 *             syncedBefore:
 *               type: string
 *               format: date-time
 *               description: Filter leads synced before this date
 *               example: "2024-12-31T23:59:59Z"
 *     
 *     LeadMirrorStatistics:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of lead mirrors
 *           example: 1250
 *         synced:
 *           type: integer
 *           description: Number of successfully synced leads
 *           example: 1150
 *         pending:
 *           type: integer
 *           description: Number of pending sync leads
 *           example: 50
 *         failed:
 *           type: integer
 *           description: Number of failed sync leads
 *           example: 25
 *         updated:
 *           type: integer
 *           description: Number of updated leads
 *           example: 25
 *         avgRetryCount:
 *           type: number
 *           format: float
 *           description: Average number of retry attempts
 *           example: 1.2
 *         withErrors:
 *           type: integer
 *           description: Number of leads with sync errors
 *           example: 30
 *         successRate:
 *           type: number
 *           format: float
 *           description: Percentage of successful syncs
 *           example: 92.0
 *     
 *     SyncError:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Lead mirror ID
 *           example: 1
 *         odooLeadId:
 *           type: string
 *           description: Odoo lead ID
 *           example: "ODOO-12345"
 *         leadType:
 *           $ref: '#/components/schemas/LeadType'
 *         syncError:
 *           type: string
 *           description: Error message
 *           example: "Connection timeout to Odoo API"
 *         syncRetryCount:
 *           type: integer
 *           description: Number of retry attempts
 *           example: 3
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2024-01-15T10:30:00Z"
 */

/**
 * @openapi
 * Lead type enumeration (mirrors form types)
 */
export enum LeadType {
  CONTACT_FORM = "contact_form",
  PROJECT_INQUIRY = "project_inquiry",
  APPOINTMENT = "appointment",
  CATALOG_DOWNLOAD = "catalog_download",
  LAND_SUBMISSION = "land_submission",
  JOB_APPLICATION = "job_application",
  EVENT_REGISTRATION = "event_registration",
}

/**
 * @openapi
 * Sync status enumeration
 */
export enum SyncStatus {
  PENDING = "pending",
  SYNCED = "synced",
  FAILED = "failed",
  UPDATED = "updated",
}

/**
 * @openapi
 * Lead mirror entity interface
 */
export interface LeadMirror {
  id: number;
  odooLeadId: string;
  formSubmissionId: number;
  leadType: LeadType;

  // Cached contact info for quick access
  email: string | null;
  phone: string | null;

  // Sync status
  syncStatus: SyncStatus;
  syncedAt: Date | null;
  lastOdooUpdate: Date | null;
  syncError: string | null;
  syncRetryCount: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Virtual relations
  formSubmission?: any;
  eventRegistrations?: any[];
}

/**
 * @openapi
 * Create lead mirror DTO
 */
export interface CreateLeadMirrorDto {
  odooLeadId: string;
  formSubmissionId: number;
  leadType: LeadType;
  email?: string;
  phone?: string;
  syncStatus?: SyncStatus;
  syncedAt?: Date;
  lastOdooUpdate?: Date;
  syncError?: string | null;
  syncRetryCount?: number;
}

/**
 * @openapi
 * Update lead mirror DTO
 */
export interface UpdateLeadMirrorDto extends Partial<CreateLeadMirrorDto> {}

/**
 * @openapi
 * Lead mirror query options
 */
export interface LeadMirrorQueryOptions extends AdvancedQueryOptions {
  leadType?: LeadType | LeadType[];
  syncStatus?: SyncStatus | SyncStatus[];
  formSubmissionId?: number | number[];
  odooLeadId?: string;
  email?: string;
  phone?: string;
  hasSyncError?: boolean;
  syncedAfter?: Date;
  syncedBefore?: Date;
}

// ============================================================================
// LEAD MIRROR MODEL CLASS
// ============================================================================

/**
 * @openapi
 * Lead Mirror Model Class
 * 
 * Minimal local table that mirrors leads created in Odoo ERP.
 * Acts as correlation table between local form submissions and external CRM
 * with comprehensive sync tracking and error management.
 * 
 * @class LeadMirrorModel
 * @extends BaseModel<LeadMirror, CreateLeadMirrorDto, UpdateLeadMirrorDto>
 */
export class LeadMirrorModel extends BaseModel<
  LeadMirror,
  CreateLeadMirrorDto,
  UpdateLeadMirrorDto
> {
  protected tableName = "lead_mirrors";
  protected primaryKey = "id";

  protected config = {
    softDelete: false, // Lead mirrors are never deleted
    timestamps: true,
    defaultSortColumn: "created_at",
    defaultSortOrder: "desc" as const,
    searchableColumns: ["odoo_lead_id", "email", "phone"],
    hiddenFields: [],
    fillable: [
      "odooLeadId",
      "formSubmissionId",
      "leadType",
      "email",
      "phone",
      "syncStatus",
      "syncedAt",
      "lastOdooUpdate",
      "syncError",
      "syncRetryCount",
    ],
    guarded: ["id", "createdAt", "updatedAt"],
  };

  // Define relations
  protected relations = {
    formSubmission: {
      type: "belongsTo" as const,
      model: () => require("./form-submission.model").default,
      foreignKey: "formSubmissionId",
      localKey: "id",
    },
    eventRegistrations: {
      type: "hasMany" as const,
      model: () => require("./event-registration.model").default,
      foreignKey: "leadMirrorId",
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
   * Validates and processes lead mirror data before creation:
   * - Validates that Odoo lead ID doesn't already exist
   * - Sets default sync status to SYNCED
   * - Sets synced timestamp if status is SYNCED
   * - Validates that associated form submission exists
   * 
   * @param {CreateLeadMirrorDto} data - Lead mirror creation data
   * @returns {Promise<CreateLeadMirrorDto>} Processed data
   * @throws {Error} If validation fails
   */
  protected async beforeCreate(
    data: CreateLeadMirrorDto
  ): Promise<CreateLeadMirrorDto> {
    // Check if Odoo lead ID already exists
    const existing = await this.findByOdooLeadId(data.odooLeadId);
    if (existing) {
      throw new Error(
        `Lead mirror with Odoo ID ${data.odooLeadId} already exists`
      );
    }

    // Set default sync status
    if (!data.syncStatus) {
      data.syncStatus = SyncStatus.SYNCED;
    }

    // Set synced timestamp if status is synced
    if (data.syncStatus === SyncStatus.SYNCED && !data.syncedAt) {
      data.syncedAt = new Date();
    }

    return data;
  }

  /**
   * @openapi
   * afterCreate lifecycle hook
   * 
   * Logs lead mirror creation and updates associated form submission
   * 
   * @param {LeadMirror} entity - Created lead mirror entity
   * @returns {Promise<void>}
   */
  protected async afterCreate(entity: LeadMirror): Promise<void> {
    console.log(
      `✅ Lead mirror created: ${entity.odooLeadId} (ID: ${entity.id})`
    );

    // Mark form submission as synced
    const FormSubmissionModel = require("./form-submission.model").default;
    await FormSubmissionModel.markSyncCompleted(entity.formSubmissionId);
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * @openapi
   * Finds lead mirrors with custom filters
   * 
   * @param {LeadMirrorQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<LeadMirror[]>} Array of lead mirrors
   */
  async findLeads(
    options: LeadMirrorQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<LeadMirror[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    // Apply lead-specific filters
    query = this.applyLeadFilters(query, options);

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
   * Gets paginated leads
   * 
   * @param {LeadMirrorQueryOptions & { page: number; limit: number }} options - Query and pagination options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<PaginatedResult<LeadMirror>>} Paginated result
   */
  async paginateLeads(
    options: LeadMirrorQueryOptions & { page: number; limit: number },
    trx?: Knex.Transaction
  ): Promise<PaginatedResult<LeadMirror>> {
    const { page, limit } = options;

    const [items, total] = await Promise.all([
      this.findLeads(options, trx),
      this.countLeads(options, trx),
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
   * Counts leads with filters
   * 
   * @param {LeadMirrorQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<number>} Count of leads
   */
  async countLeads(
    options: LeadMirrorQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    // Apply filters
    query = this.applyLeadFilters(query, options);

    const result = await query.count(`${this.primaryKey} as count`).first();
    return result ? Number(result.count) : 0;
  }

  /**
   * @openapi
   * Finds lead by Odoo lead ID
   * 
   * @param {string} odooLeadId - Odoo CRM lead ID
   * @param {object} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<LeadMirror | null>} Lead mirror or null
   */
  async findByOdooLeadId(
    odooLeadId: string,
    options: { relations?: string[] } = {},
    trx?: Knex.Transaction
  ): Promise<LeadMirror | null> {
    return this.findOne({ odooLeadId }, options, trx);
  }

  /**
   * @openapi
   * Finds lead by form submission ID
   * 
   * @param {number} formSubmissionId - Form submission ID
   * @param {object} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<LeadMirror | null>} Lead mirror or null
   */
  async findByFormSubmission(
    formSubmissionId: number,
    options: { relations?: string[] } = {},
    trx?: Knex.Transaction
  ): Promise<LeadMirror | null> {
    return this.findOne({ formSubmissionId }, options, trx);
  }

  /**
   * @openapi
   * Finds leads by email
   * 
   * @param {string} email - Email address
   * @param {LeadMirrorQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<LeadMirror[]>} Array of lead mirrors
   */
  async findByEmail(
    email: string,
    options: LeadMirrorQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<LeadMirror[]> {
    return this.findLeads({ ...options, email }, trx);
  }

  /**
   * @openapi
   * Finds leads by phone
   * 
   * @param {string} phone - Phone number
   * @param {LeadMirrorQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<LeadMirror[]>} Array of lead mirrors
   */
  async findByPhone(
    phone: string,
    options: LeadMirrorQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<LeadMirror[]> {
    return this.findLeads({ ...options, phone }, trx);
  }

  /**
   * @openapi
   * Gets leads pending sync
   * 
   * @param {number} [limit=100] - Maximum number of results
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<LeadMirror[]>} Array of leads pending sync
   */
  async getPendingSync(
    limit: number = 100,
    trx?: Knex.Transaction
  ): Promise<LeadMirror[]> {
    return this.findLeads(
      {
        syncStatus: [SyncStatus.PENDING, SyncStatus.FAILED],
        sortBy: "created_at",
        sortOrder: "asc",
        limit,
      },
      trx
    );
  }

  /**
   * @openapi
   * Gets failed sync leads
   * 
   * @param {LeadMirrorQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<LeadMirror[]>} Array of failed sync leads
   */
  async getFailedSync(
    options: LeadMirrorQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<LeadMirror[]> {
    return this.findLeads({ ...options, syncStatus: SyncStatus.FAILED }, trx);
  }

  // ============================================================================
  // SYNC MANAGEMENT
  // ============================================================================

  /**
   * @openapi
   * Marks lead as synced
   * 
   * @param {number} id - Lead mirror ID
   * @param {Date} [lastOdooUpdate] - Optional last update timestamp from Odoo
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<LeadMirror | null>} Updated lead mirror or null
   */
  async markSynced(
    id: number,
    lastOdooUpdate?: Date,
    trx?: Knex.Transaction
  ): Promise<LeadMirror | null> {
    return this.update(
      id,
      {
        syncStatus: SyncStatus.SYNCED,
        syncedAt: new Date(),
        lastOdooUpdate: lastOdooUpdate || new Date(),
        syncError: null,
      },
      trx
    );
  }

  /**
   * @openapi
   * Marks lead as sync failed
   * 
   * @param {number} id - Lead mirror ID
   * @param {string} error - Error message
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<LeadMirror | null>} Updated lead mirror or null
   */
  async markSyncFailed(
    id: number,
    error: string,
    trx?: Knex.Transaction
  ): Promise<LeadMirror | null> {
    const lead = await this.findById(id, {}, trx);
    if (!lead) return null;

    const retryCount = lead.syncRetryCount + 1;

    return this.update(
      id,
      {
        syncStatus: SyncStatus.FAILED,
        syncError: error,
        syncRetryCount: retryCount,
      },
      trx
    );
  }

  /**
   * @openapi
   * Marks lead as updated
   * 
   * @param {number} id - Lead mirror ID
   * @param {Date} [lastOdooUpdate] - Optional last update timestamp from Odoo
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<LeadMirror | null>} Updated lead mirror or null
   */
  async markUpdated(
    id: number,
    lastOdooUpdate?: Date,
    trx?: Knex.Transaction
  ): Promise<LeadMirror | null> {
    return this.update(
      id,
      {
        syncStatus: SyncStatus.UPDATED,
        lastOdooUpdate: lastOdooUpdate || new Date(),
      },
      trx
    );
  }

  /**
   * @openapi
   * Resets sync status for retry
   * 
   * @param {number} id - Lead mirror ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<LeadMirror | null>} Updated lead mirror or null
   */
  async resetSyncStatus(
    id: number,
    trx?: Knex.Transaction
  ): Promise<LeadMirror | null> {
    return this.update(
      id,
      {
        syncStatus: SyncStatus.PENDING,
        syncError: null,
        syncRetryCount: 0,
      },
      trx
    );
  }

  /**
   * @openapi
   * Updates cached contact information
   * 
   * @param {number} id - Lead mirror ID
   * @param {string} [email] - Optional email address
   * @param {string} [phone] - Optional phone number
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<LeadMirror | null>} Updated lead mirror or null
   */
  async updateContactInfo(
    id: number,
    email?: string,
    phone?: string,
    trx?: Knex.Transaction
  ): Promise<LeadMirror | null> {
    const updateData: any = {};
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    if (Object.keys(updateData).length === 0) {
      return this.findById(id, {}, trx);
    }

    return this.update(id, updateData, trx);
  }

  // ============================================================================
  // ANALYTICS METHODS
  // ============================================================================

  /**
   * @openapi
   * Gets sync statistics
   * 
   * @param {Date} [dateFrom] - Optional start date filter
   * @param {Date} [dateTo] - Optional end date filter
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<LeadMirrorStatistics>} Comprehensive statistics object
   */
  async getSyncStatistics(
    dateFrom?: Date,
    dateTo?: Date,
    trx?: Knex.Transaction
  ): Promise<any> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    if (dateFrom) {
      query = query.where("created_at", ">=", dateFrom);
    }
    if (dateTo) {
      query = query.where("created_at", "<=", dateTo);
    }

    const [stats] = await query.select(
      connection.raw("COUNT(*) as total"),
      connection.raw(
        "COUNT(CASE WHEN sync_status = 'synced' THEN 1 END) as synced"
      ),
      connection.raw(
        "COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending"
      ),
      connection.raw(
        "COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) as failed"
      ),
      connection.raw(
        "COUNT(CASE WHEN sync_status = 'updated' THEN 1 END) as updated"
      ),
      connection.raw("AVG(sync_retry_count) as avgRetryCount"),
      connection.raw(
        "COUNT(CASE WHEN sync_error IS NOT NULL THEN 1 END) as withErrors"
      )
    );

    return {
      total: Number(stats.total),
      synced: Number(stats.synced),
      pending: Number(stats.pending),
      failed: Number(stats.failed),
      updated: Number(stats.updated),
      avgRetryCount: stats.avgRetryCount ? Number(stats.avgRetryCount) : 0,
      withErrors: Number(stats.withErrors),
      successRate:
        Number(stats.total) > 0
          ? (Number(stats.synced) / Number(stats.total)) * 100
          : 0,
    };
  }

  /**
   * @openapi
   * Gets breakdown by lead type
   * 
   * @param {Date} [dateFrom] - Optional start date filter
   * @param {Date} [dateTo] - Optional end date filter
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<any[]>} Array of lead type statistics
   */
  async getBreakdownByLeadType(
    dateFrom?: Date,
    dateTo?: Date,
    trx?: Knex.Transaction
  ): Promise<any[]> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    if (dateFrom) {
      query = query.where("created_at", ">=", dateFrom);
    }
    if (dateTo) {
      query = query.where("created_at", "<=", dateTo);
    }

    return query
      .select("lead_type")
      .count("* as count")
      .groupBy("lead_type")
      .orderBy("count", "desc");
  }

  /**
   * @openapi
   * Gets recent sync errors
   * 
   * @param {number} [limit=20] - Maximum number of results
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<any[]>} Array of sync error information
   */
  async getRecentSyncErrors(
    limit: number = 20,
    trx?: Knex.Transaction
  ): Promise<any[]> {
    const connection = trx || this.db;

    return connection(this.tableName)
      .select(
        "id",
        "odoo_lead_id",
        "lead_type",
        "sync_error",
        "sync_retry_count",
        "updated_at"
      )
      .whereNotNull("sync_error")
      .orderBy("updated_at", "desc")
      .limit(limit);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * @openapi
   * Applies lead-specific filters to query
   * 
   * @param {Knex.QueryBuilder} query - Database query builder
   * @param {LeadMirrorQueryOptions} options - Query options
   * @returns {Knex.QueryBuilder} Modified query builder
   */
  private applyLeadFilters(
    query: Knex.QueryBuilder,
    options: LeadMirrorQueryOptions
  ): Knex.QueryBuilder {
    // Lead type filter
    if (options.leadType) {
      if (Array.isArray(options.leadType)) {
        query = query.whereIn("lead_type", options.leadType);
      } else {
        query = query.where("lead_type", options.leadType);
      }
    }

    // Sync status filter
    if (options.syncStatus) {
      if (Array.isArray(options.syncStatus)) {
        query = query.whereIn("sync_status", options.syncStatus);
      } else {
        query = query.where("sync_status", options.syncStatus);
      }
    }

    // Form submission filter
    if (options.formSubmissionId) {
      if (Array.isArray(options.formSubmissionId)) {
        query = query.whereIn("form_submission_id", options.formSubmissionId);
      } else {
        query = query.where("form_submission_id", options.formSubmissionId);
      }
    }

    // Odoo lead ID filter
    if (options.odooLeadId) {
      query = query.where("odoo_lead_id", options.odooLeadId);
    }

    // Email filter
    if (options.email) {
      query = query.where("email", "like", `%${options.email}%`);
    }

    // Phone filter
    if (options.phone) {
      query = query.where("phone", "like", `%${options.phone}%`);
    }

    // Has sync error filter
    if (options.hasSyncError !== undefined) {
      if (options.hasSyncError) {
        query = query.whereNotNull("sync_error");
      } else {
        query = query.whereNull("sync_error");
      }
    }

    // Synced date range
    if (options.syncedAfter) {
      query = query.where("synced_at", ">=", options.syncedAfter);
    }
    if (options.syncedBefore) {
      query = query.where("synced_at", "<=", options.syncedBefore);
    }

    return query;
  }

  /**
   * @openapi
   * Maps database record to LeadMirror entity
   * 
   * @param {DatabaseRecord} record - Database record
   * @returns {LeadMirror} LeadMirror entity
   */
  protected mapToEntity(record: DatabaseRecord): LeadMirror {
    return {
      id: record.id,
      odooLeadId: record.odoo_lead_id,
      formSubmissionId: record.form_submission_id,
      leadType: record.lead_type as LeadType,
      email: record.email,
      phone: record.phone,
      syncStatus: record.sync_status as SyncStatus,
      syncedAt: record.synced_at ? new Date(record.synced_at) : null,
      lastOdooUpdate: record.last_odoo_update
        ? new Date(record.last_odoo_update)
        : null,
      syncError: record.sync_error,
      syncRetryCount: record.sync_retry_count || 0,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

// Export singleton instance
export default new LeadMirrorModel();