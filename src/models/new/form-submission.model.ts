/**
 * Form Submission Model (Refactored)
 * Central repository for all website form submissions
 *
 * This model handles form data storage and Odoo sync queue management.
 *
 * @module models/form-submission.model
 */

import { BaseModel, BaseQueryParams } from "../base";

/**
 * Form type enumeration
 */
export enum FormType {
  CONTACT_FORM = "contact_form",
  PROJECT_INQUIRY = "project_inquiry",
  APPOINTMENT_REQUEST = "appointment_request",
  CATALOG_DOWNLOAD = "catalog_download",
  LAND_SUBMISSION = "land_submission",
  JOB_APPLICATION = "job_application",
  EVENT_REGISTRATION = "event_registration",
}

/**
 * Processing status enumeration
 */
export enum SubmissionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  SPAM = "spam",
}

/**
 * Form Submission Entity
 */
export interface FormSubmission {
  /** Unique identifier */
  id: number;

  /** Visitor UUID */
  visitorId: string | null;

  /** Session UUID */
  sessionId: string | null;

  /** Form type */
  formType: FormType;

  /** HTML form ID */
  formId: string | null;

  /** Project reference */
  projectId: number | null;

  /** Complete form data as JSON */
  formData: Record<string, any>;

  /** Extracted email for indexing */
  email: string | null;

  /** Extracted phone for indexing */
  phone: string | null;

  /** Extracted first name */
  firstName: string | null;

  /** Extracted last name */
  lastName: string | null;

  /** Submission timestamp */
  submittedAt: Date;

  /** Page URL where form was submitted */
  pageUrl: string | null;

  /** Referrer URL */
  referrerUrl: string | null;

  /** IP address */
  ipAddress: string | null;

  /** User agent */
  userAgent: string | null;

  /** UTM source */
  utmSource: string | null;

  /** UTM medium */
  utmMedium: string | null;

  /** UTM campaign */
  utmCampaign: string | null;

  /** UTM term */
  utmTerm: string | null;

  /** UTM content */
  utmContent: string | null;

  /** Referrer */
  referrer: string | null;

  /** Source page */
  sourcePage: string | null;

  /** Processing status */
  status: SubmissionStatus;

  /** Form completion time (seconds) */
  completionTimeSeconds: number | null;

  /** Requires Odoo sync */
  requiresOdooSync: boolean;

  /** Odoo sync attempt timestamp */
  odooSyncAttemptedAt: Date | null;

  /** Odoo sync retry count */
  odooSyncRetries: number;

  /** Odoo sync error */
  odooSyncError: string | null;

  /** Validation error count */
  validationErrors: number;

  /** Is spam */
  isSpam: boolean;

  /** Spam score */
  spamScore: number | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Create Form Submission DTO
 */
export interface CreateFormSubmissionDto {
  visitorId?: string | null;
  sessionId?: string | null;
  formType: FormType;
  formId?: string | null;
  projectId?: number | null;
  formData: Record<string, any>;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  submittedAt?: Date;
  pageUrl?: string | null;
  referrerUrl?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  referrer?: string | null;
  sourcePage?: string | null;
  completionTimeSeconds?: number | null;
  requiresOdooSync?: boolean;
  isSpam?: boolean;
  spamScore?: number | null;
}

/**
 * Update Form Submission DTO
 */
export interface UpdateFormSubmissionDto {
  status?: SubmissionStatus;
  odooSyncAttemptedAt?: Date | null;
  odooSyncRetries?: number;
  odooSyncError?: string | null;
  isSpam?: boolean;
}

/**
 * Query parameters
 */
export interface FormSubmissionQueryParams extends BaseQueryParams {
  visitorId?: string;
  sessionId?: string;
  formType?: FormType;
  projectId?: number;
  email?: string;
  status?: SubmissionStatus;
  requiresOdooSync?: boolean;
  isSpam?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Form Submission with relations
 */
export interface FormSubmissionWithRelations extends FormSubmission {
  leadMirror?: any;
  project?: any;
}

/**
 * Form Submission Model Class
 */
class FormSubmissionModel extends BaseModel<
  FormSubmission,
  CreateFormSubmissionDto,
  UpdateFormSubmissionDto
> {
  protected tableName = "form_submissions";

  /**
   * Finds all submissions matching query
   */
  async findAll(
    params: FormSubmissionQueryParams = {}
  ): Promise<FormSubmission[]> {
    let query = this.db(this.tableName);

    if (params.visitorId) {
      query = query.where({ visitor_id: params.visitorId });
    }

    if (params.sessionId) {
      query = query.where({ session_id: params.sessionId });
    }

    if (params.formType) {
      query = query.where({ form_type: params.formType });
    }

    if (params.projectId !== undefined) {
      query = query.where({ project_id: params.projectId });
    }

    if (params.email) {
      query = query.where({ email: params.email });
    }

    if (params.status) {
      query = query.where({ status: params.status });
    }

    if (params.requiresOdooSync !== undefined) {
      query = query.where({ requires_odoo_sync: params.requiresOdooSync });
    }

    if (params.isSpam !== undefined) {
      query = query.where({ is_spam: params.isSpam });
    }

    if (params.dateFrom) {
      query = query.where("submitted_at", ">=", params.dateFrom);
    }

    if (params.dateTo) {
      query = query.where("submitted_at", "<=", params.dateTo);
    }

    if (params.sortBy) {
      query = query.orderBy(params.sortBy, params.sortOrder || "desc");
    } else {
      query = query.orderBy("submitted_at", "desc");
    }

    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const records = await query;
    return records.map(this.mapToEntity);
  }

  /**
   * Gets submissions pending Odoo sync
   */
  async getPendingOdooSync(limit?: number): Promise<FormSubmission[]> {
    let query = this.db(this.tableName)
      .where({ requires_odoo_sync: true })
      .where({ is_spam: false })
      .whereIn("status", [SubmissionStatus.PENDING, SubmissionStatus.FAILED])
      .where("odoo_sync_retries", "<", 10)
      .orderBy("submitted_at", "asc");

    if (limit) {
      query = query.limit(limit);
    }

    const records = await query;
    return records.map(this.mapToEntity);
  }

  /**
   * Marks submission as processing
   */
  async markProcessing(id: number): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id }).update({
      status: SubmissionStatus.PROCESSING,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Marks submission as completed
   */
  async markCompleted(id: number): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id }).update({
      status: SubmissionStatus.COMPLETED,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Records Odoo sync attempt
   */
  async recordOdooSyncAttempt(id: number, error?: string): Promise<boolean> {
    const update: any = {
      odoo_sync_attempted_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    };

    if (error) {
      update.status = SubmissionStatus.FAILED;
      update.odoo_sync_error = error;
      update.odoo_sync_retries = this.db.raw("odoo_sync_retries + 1");
    } else {
      update.status = SubmissionStatus.COMPLETED;
      update.odoo_sync_error = null;
    }

    const updated = await this.db(this.tableName).where({ id }).update(update);

    return updated > 0;
  }

  /**
   * Marks submission as spam
   */
  async markAsSpam(id: number, score?: number): Promise<boolean> {
    const update: any = {
      is_spam: true,
      status: SubmissionStatus.SPAM,
      updated_at: this.db.fn.now(),
    };

    if (score !== undefined) {
      update.spam_score = score;
    }

    const updated = await this.db(this.tableName).where({ id }).update(update);

    return updated > 0;
  }

  /**
   * Gets submission with lead mirror
   */
  async getWithLeadMirror(
    id: number
  ): Promise<FormSubmissionWithRelations | null> {
    const submission = await this.findById(id);
    if (!submission) return null;

    const leadMirror = await this.db("lead_mirrors")
      .where({ form_submission_id: id })
      .first();

    return {
      ...submission,
      leadMirror,
    };
  }

  /**
   * Gets form type statistics
   */
  async getFormTypeStats(): Promise<Record<string, number>> {
    const results = await this.db(this.tableName)
      .where({ is_spam: false })
      .select("form_type")
      .count("* as count")
      .groupBy("form_type");

    const stats: Record<string, number> = {};
    results.forEach((row: any) => {
      stats[row.form_type] = Number(row.count);
    });

    return stats;
  }

  /**
   * Gets conversion rate by form type
   */
  async getConversionRates(): Promise<any[]> {
    const results = await this.db(this.tableName)
      .select("form_type")
      .count("* as total")
      .sum(
        this.db.raw(
          "CASE WHEN status = 'completed' THEN 1 ELSE 0 END as completed"
        )
      )
      .where({ is_spam: false })
      .groupBy("form_type");

    return results.map((row: any) => ({
      formType: row.form_type,
      total: Number(row.total),
      completed: Number(row.completed),
      conversionRate:
        row.total > 0 ? Math.round((row.completed / row.total) * 1000) / 10 : 0,
    }));
  }

  /**
   * Maps database record to entity
   */
  protected mapToEntity(record: any): FormSubmission {
    return {
      id: record.id,
      visitorId: record.visitor_id,
      sessionId: record.session_id,
      formType: record.form_type as FormType,
      formId: record.form_id,
      projectId: record.project_id,
      formData: this.parseJson(record.form_data) || {},
      email: record.email,
      phone: record.phone,
      firstName: record.first_name,
      lastName: record.last_name,
      submittedAt: new Date(record.submitted_at),
      pageUrl: record.page_url,
      referrerUrl: record.referrer_url,
      ipAddress: record.ip_address,
      userAgent: record.user_agent,
      utmSource: record.utm_source,
      utmMedium: record.utm_medium,
      utmCampaign: record.utm_campaign,
      utmTerm: record.utm_term,
      utmContent: record.utm_content,
      referrer: record.referrer,
      sourcePage: record.source_page,
      status: record.status as SubmissionStatus,
      completionTimeSeconds: record.completion_time_seconds,
      requiresOdooSync: Boolean(record.requires_odoo_sync),
      odooSyncAttemptedAt: record.odoo_sync_attempted_at
        ? new Date(record.odoo_sync_attempted_at)
        : null,
      odooSyncRetries: record.odoo_sync_retries,
      odooSyncError: record.odoo_sync_error,
      validationErrors: record.validation_errors,
      isSpam: Boolean(record.is_spam),
      spamScore: record.spam_score ? parseFloat(record.spam_score) : null,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new FormSubmissionModel();
