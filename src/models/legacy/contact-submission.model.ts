/**
 * Contact Submission Model - FIXED VERSION
 * Represents general contact form submissions and lead management
 * Handles customer inquiries and lead tracking
 *
 * FIXES:
 * - Added soft delete support (deleted_at handling)
 * - Added includeDeleted parameter to findAll()
 * - Improved type safety
 *
 * @module models/contact-submission.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Contact submission status enumeration
 * Defines the lifecycle state of a contact submission
 */
export enum ContactSubmissionStatus {
  NEW = "new",
  CONTACTED = "contacted",
  QUALIFIED = "qualified",
  CONVERTED = "converted",
  CLOSED = "closed",
  SPAM = "spam",
}

/**
 * Contact submission entity interface
 * Represents a contact form submission
 */
export interface ContactSubmission {
  /** Unique identifier */
  id: number;

  /** First name */
  firstName: string | null;

  /** Last name */
  lastName: string | null;

  /** Email address */
  email: string;

  /** Phone number */
  phone: string | null;

  /** Subject */
  subject: string | null;

  /** Message content */
  message: string;

  /** Lead status */
  status: ContactSubmissionStatus;

  /** Internal notes */
  internalNotes: string | null;

  /** Source page URL */
  sourcePage: string | null;

  /** UTM source parameter */
  utmSource: string | null;

  /** UTM medium parameter */
  utmMedium: string | null;

  /** UTM campaign parameter */
  utmCampaign: string | null;

  /** Referrer URL */
  referrer: string | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** Soft delete timestamp */
  deletedAt: Date | null;
}

/**
 * Create contact submission DTO
 */
export interface CreateContactSubmissionDto {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  sourcePage?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
}

/**
 * Update contact submission DTO
 */
export interface UpdateContactSubmissionDto {
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  phone?: string | null;
  subject?: string | null;
  message?: string;
  status?: ContactSubmissionStatus;
  internalNotes?: string | null;
}

/**
 * Contact submission query parameters
 */
export interface ContactSubmissionQueryParams extends BaseQueryParams {
  status?: ContactSubmissionStatus;
  email?: string;
  utmSource?: string;
  utmCampaign?: string;
  dateFrom?: Date;
  dateTo?: Date;
  includeDeleted?: boolean;
}

/**
 * Contact Submission Model class
 * Handles all database operations for contact submissions
 */
class ContactSubmissionModel extends BaseModel<
  ContactSubmission,
  CreateContactSubmissionDto,
  UpdateContactSubmissionDto
> {
  protected tableName = "contact_submissions";

  /**
   * Finds all contact submissions matching query parameters
   * FIXED: Now includes soft delete support
   */
  async findAll(
    params: ContactSubmissionQueryParams = {}
  ): Promise<ContactSubmission[]> {
    let query = this.db(this.tableName);

    // FIXED: Add soft delete filtering
    if (!params.includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    if (params.status) {
      query = query.where({ status: params.status });
    }

    if (params.email) {
      query = query.where({ email: params.email });
    }

    if (params.utmSource) {
      query = query.where({ utm_source: params.utmSource });
    }

    if (params.utmCampaign) {
      query = query.where({ utm_campaign: params.utmCampaign });
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

    const submissions = await query;
    return submissions.map(this.mapToEntity);
  }

  /**
   * Gets new (unprocessed) submissions
   * FIXED: Now excludes soft-deleted submissions
   */
  async getNew(limit?: number): Promise<ContactSubmission[]> {
    let query = this.db(this.tableName)
      .where({ status: ContactSubmissionStatus.NEW })
      .whereNull("deleted_at") // FIXED: Exclude soft-deleted
      .orderBy("created_at", "desc");

    if (limit) {
      query = query.limit(limit);
    }

    const submissions = await query;
    return submissions.map(this.mapToEntity);
  }

  /**
   * Updates submission status
   */
  async updateStatus(
    id: number,
    status: ContactSubmissionStatus,
    notes?: string
  ): Promise<boolean> {
    const updateData: any = {
      status,
      updated_at: this.db.fn.now(),
    };

    if (notes) {
      updateData.internal_notes = notes;
    }

    const updated = await this.db(this.tableName)
      .where({ id })
      .whereNull("deleted_at") // Only update non-deleted
      .update(updateData);

    return updated > 0;
  }

  /**
   * Adds internal notes
   */
  async addNotes(id: number, notes: string): Promise<boolean> {
    const submission = await this.findById(id);
    if (!submission) return false;

    const existingNotes = submission.internalNotes || "";
    const timestamp = new Date().toISOString();
    const newNotes = `${existingNotes}\n\n[${timestamp}]\n${notes}`.trim();

    const updated = await this.db(this.tableName)
      .where({ id })
      .whereNull("deleted_at") // Only update non-deleted
      .update({
        internal_notes: newNotes,
        updated_at: this.db.fn.now(),
      });

    return updated > 0;
  }

  /**
   * Finds submissions by email
   * FIXED: Now excludes soft-deleted by default
   */
  async findByEmail(
    email: string,
    includeDeleted: boolean = false
  ): Promise<ContactSubmission[]> {
    let query = this.db(this.tableName).where({ email });

    if (!includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    const submissions = await query;
    return submissions.map(this.mapToEntity);
  }

  /**
   * Gets submissions by UTM campaign
   * FIXED: Now excludes soft-deleted by default
   */
  async findByCampaign(
    campaign: string,
    includeDeleted: boolean = false
  ): Promise<ContactSubmission[]> {
    let query = this.db(this.tableName).where({ utm_campaign: campaign });

    if (!includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    const submissions = await query;
    return submissions.map(this.mapToEntity);
  }

  /**
   * Gets submission statistics by status
   * FIXED: Now excludes soft-deleted submissions
   */
  async getStatusStatistics(
    includeDeleted: boolean = false
  ): Promise<Record<string, number>> {
    let query = this.db(this.tableName)
      .select("status")
      .count("* as count")
      .groupBy("status");

    if (!includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    const results = await query;

    const stats: Record<string, number> = {};
    results.forEach((row: any) => {
      stats[row.status] = Number(row.count);
    });

    return stats;
  }

  /**
   * Maps database record to ContactSubmission entity
   */
  protected mapToEntity(record: any): ContactSubmission {
    return {
      id: record.id,
      firstName: record.first_name,
      lastName: record.last_name,
      email: record.email,
      phone: record.phone,
      subject: record.subject,
      message: record.message,
      status: record.status as ContactSubmissionStatus,
      internalNotes: record.internal_notes,
      sourcePage: record.source_page,
      utmSource: record.utm_source,
      utmMedium: record.utm_medium,
      utmCampaign: record.utm_campaign,
      referrer: record.referrer,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

export default new ContactSubmissionModel();
