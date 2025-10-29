/**
 * Lead Mirror Model
 * Minimal local representation of leads managed in Odoo ERP
 *
 * This model provides correlation between local form submissions
 * and external CRM records without duplicating full lead data.
 *
 * @module models/lead-mirror.model
 */

import { BaseModel, BaseQueryParams } from "../base";

/**
 * Lead type enumeration (must match form types)
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
 * Lead Mirror Entity
 * Minimal local reference to Odoo lead
 */
export interface LeadMirror {
  /** Local identifier */
  id: number;

  /** Odoo lead ID (external reference) */
  odooLeadId: string;

  /** Form submission that created this lead */
  formSubmissionId: number;

  /** Lead type/category */
  leadType: LeadType;

  /** Cached email for quick lookup */
  email: string | null;

  /** Cached phone for quick lookup */
  phone: string | null;

  /** Sync status */
  syncStatus: SyncStatus;

  /** When successfully synced to Odoo */
  syncedAt: Date | null;

  /** Last update from Odoo */
  lastOdooUpdate: Date | null;

  /** Sync error message (if failed) */
  syncError: string | null;

  /** Retry count for failed syncs */
  syncRetryCount: number;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Create Lead Mirror DTO
 */
export interface CreateLeadMirrorDto {
  odooLeadId: string;
  formSubmissionId: number;
  leadType: LeadType;
  email?: string | null;
  phone?: string | null;
  syncStatus?: SyncStatus;
  syncedAt?: Date | null;
}

/**
 * Update Lead Mirror DTO
 */
export interface UpdateLeadMirrorDto {
  syncStatus?: SyncStatus;
  syncedAt?: Date | null;
  lastOdooUpdate?: Date | null;
  syncError?: string | null;
  syncRetryCount?: number;
}

/**
 * Query parameters
 */
export interface LeadMirrorQueryParams extends BaseQueryParams {
  odooLeadId?: string;
  formSubmissionId?: number;
  leadType?: LeadType;
  syncStatus?: SyncStatus;
  email?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Lead Mirror with related data
 */
export interface LeadMirrorWithRelations extends LeadMirror {
  formSubmission?: any;
}

/**
 * Lead Mirror Model Class
 */
class LeadMirrorModel extends BaseModel<
  LeadMirror,
  CreateLeadMirrorDto,
  UpdateLeadMirrorDto
> {
  protected tableName = "lead_mirrors";

  /**
   * Finds lead by Odoo ID
   */
  async findByOdooId(odooLeadId: string): Promise<LeadMirror | null> {
    return this.findOne({ odoo_lead_id: odooLeadId });
  }

  /**
   * Finds lead by form submission
   */
  async findByFormSubmission(
    formSubmissionId: number
  ): Promise<LeadMirror | null> {
    return this.findOne({ form_submission_id: formSubmissionId });
  }

  /**
   * Gets all leads by sync status
   */
  async findBySyncStatus(status: SyncStatus): Promise<LeadMirror[]> {
    return this.findWhere({ sync_status: status });
  }

  /**
   * Gets pending leads (need sync)
   */
  async getPending(limit?: number): Promise<LeadMirror[]> {
    let query = this.db(this.tableName)
      .where({ sync_status: SyncStatus.PENDING })
      .orderBy("created_at", "asc");

    if (limit) {
      query = query.limit(limit);
    }

    const records = await query;
    return records.map(this.mapToEntity);
  }

  /**
   * Gets failed leads (for retry)
   */
  async getFailed(maxRetries: number = 10): Promise<LeadMirror[]> {
    const records = await this.db(this.tableName)
      .where({ sync_status: SyncStatus.FAILED })
      .where("sync_retry_count", "<", maxRetries)
      .orderBy("created_at", "asc");

    return records.map(this.mapToEntity);
  }

  /**
   * Marks lead as synced
   */
  async markSynced(id: number, odooLeadId?: string): Promise<boolean> {
    const update: any = {
      sync_status: SyncStatus.SYNCED,
      synced_at: this.db.fn.now(),
      sync_error: null,
      updated_at: this.db.fn.now(),
    };

    if (odooLeadId) {
      update.odoo_lead_id = odooLeadId;
    }

    const updated = await this.db(this.tableName).where({ id }).update(update);

    return updated > 0;
  }

  /**
   * Marks lead sync as failed
   */
  async markFailed(id: number, error: string): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id })
      .update({
        sync_status: SyncStatus.FAILED,
        sync_error: error,
        updated_at: this.db.fn.now(),
      })
      .increment("sync_retry_count", 1);

    return updated > 0;
  }

  /**
   * Updates last Odoo sync timestamp
   */
  async updateOdooTimestamp(id: number): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id }).update({
      last_odoo_update: this.db.fn.now(),
      sync_status: SyncStatus.UPDATED,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Gets lead with form submission
   */
  async getWithFormSubmission(
    id: number
  ): Promise<LeadMirrorWithRelations | null> {
    const lead = await this.findById(id);
    if (!lead) return null;

    const formSubmission = await this.db("form_submissions")
      .where({ id: lead.formSubmissionId })
      .first();

    return {
      ...lead,
      formSubmission,
    };
  }

  /**
   * Gets sync statistics
   */
  async getSyncStats(): Promise<Record<SyncStatus, number>> {
    const results = await this.db(this.tableName)
      .select("sync_status")
      .count("* as count")
      .groupBy("sync_status");

    const stats: Record<string, number> = {};
    results.forEach((row: any) => {
      stats[row.sync_status] = Number(row.count);
    });

    return stats as Record<SyncStatus, number>;
  }

  /**
   * Maps database record to entity
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
      syncRetryCount: record.sync_retry_count,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new LeadMirrorModel();
