/**
 * Lead Mirror Model
 * 
 * Minimal local table that mirrors leads created in Odoo ERP.
 * Acts as correlation table between local form submissions and external CRM.
 * 
 * @module models/lead-mirror.model
 */

import { BaseModel, AdvancedQueryOptions, PaginatedResult } from "../base";
import { Knex } from "knex";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
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
 * Sync status enumeration
 */
export enum SyncStatus {
  PENDING = "pending",
  SYNCED = "synced",
  FAILED = "failed",
  UPDATED = "updated",
}

/**
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
 * Update lead mirror DTO
 */
export interface UpdateLeadMirrorDto extends Partial<CreateLeadMirrorDto> {}

/**
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

export class LeadMirrorModel extends BaseModel<
  LeadMirror,
  CreateLeadMirrorDto,
  UpdateLeadMirrorDto
> {
  protected tableName = "lead_mirrors";
  protected primaryKey = "id";

  protected config = {
    softDelete: false,
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
   * Before create hook - validate
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
   * After create hook - update form submission
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
   * Finds lead mirrors with custom filters
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
    let entities = records.map((r: any) => this.mapToEntity(r));

    // Load relations if requested
    if (options.relations && options.relations.length > 0) {
      entities = await this.loadRelationsForMany(entities, options.relations, trx);
    }

    return entities;
  }

  /**
   * Gets paginated leads
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
   * Counts leads with filters
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
   * Finds lead by Odoo lead ID
   */
  async findByOdooLeadId(
    odooLeadId: string,
    options: { relations?: string[] } = {},
    trx?: Knex.Transaction
  ): Promise<LeadMirror | null> {
    return this.findOne({ odooLeadId }, options, trx);
  }

  /**
   * Finds lead by form submission ID
   */
  async findByFormSubmission(
    formSubmissionId: number,
    options: { relations?: string[] } = {},
    trx?: Knex.Transaction
  ): Promise<LeadMirror | null> {
    return this.findOne({ formSubmissionId }, options, trx);
  }

  /**
   * Finds leads by email
   */
  async findByEmail(
    email: string,
    options: LeadMirrorQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<LeadMirror[]> {
    return this.findLeads({ ...options, email }, trx);
  }

  /**
   * Finds leads by phone
   */
  async findByPhone(
    phone: string,
    options: LeadMirrorQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<LeadMirror[]> {
    return this.findLeads({ ...options, phone }, trx);
  }

  /**
   * Gets leads pending sync
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
   * Gets failed sync leads
   */
  async getFailedSync(
    options: LeadMirrorQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<LeadMirror[]> {
    return this.findLeads(
      { ...options, syncStatus: SyncStatus.FAILED },
      trx
    );
  }

  // ============================================================================
  // SYNC MANAGEMENT
  // ============================================================================

  /**
   * Marks lead as synced
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
   * Marks lead as sync failed
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
   * Marks lead as updated
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
   * Resets sync status for retry
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
   * Updates cached contact info
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
   * Gets sync statistics
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
   * Gets breakdown by lead type
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
   * Gets recent sync errors
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
   * Applies lead-specific filters to query
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
   * Maps database record to LeadMirror entity
   */
  protected mapToEntity(record: any): LeadMirror {
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