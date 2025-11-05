/**
 * Form Submission Model
 *
 * Central table for ALL form submissions on the website.
 * Handles validation, Odoo sync queue management, and spam detection.
 *
 * @module models/form-submission.model
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
export enum ProcessingStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  SPAM = "spam",
}

/**
 * Form submission entity interface
 */
export interface FormSubmission {
  id: number;
  visitorId: string | null;
  sessionId: string | null;
  formType: FormType;
  formId: string | null;
  projectId: number | null;

  // Extracted key fields for quick access
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;

  // Submission metadata
  submittedAt: Date;
  pageUrl: string | null;
  referrerUrl: string | null;
  ipAddress: string | null;
  userAgent: string | null;

  // Marketing attribution
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  referrer: string | null;
  sourcePage: string | null;

  // Processing status
  status: ProcessingStatus;
  completionTimeSeconds: number | null;

  // Odoo sync queue
  requiresOdooSync: boolean;
  odooSyncAttemptedAt: Date | null;
  odooSyncRetries: number;
  odooSyncError: string | null;

  // Validation & quality
  validationErrors: number;
  isSpam: boolean;
  spamScore: number | null;

  // Form data (JSON)
  formData: Record<string, any> | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Virtual relations
  project?: any;
  leadMirror?: any;
}

/**
 * Create form submission DTO
 */
export interface CreateFormSubmissionDto {
  visitorId?: string;
  sessionId?: string;
  formType: FormType;
  formId?: string;
  projectId?: number | null;

  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;

  submittedAt?: Date;
  pageUrl?: string;
  referrerUrl?: string;
  ipAddress?: string;
  userAgent?: string;

  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  sourcePage?: string;

  status?: ProcessingStatus;
  completionTimeSeconds?: number;

  requiresOdooSync?: boolean;

  validationErrors?: number;
  isSpam?: boolean;
  spamScore?: number;

  formData?: Record<string, any>;
}

/**
 * Update form submission DTO
 */
export interface UpdateFormSubmissionDto
  extends Partial<CreateFormSubmissionDto> {
  odooSyncAttemptedAt?: Date | null;
  odooSyncRetries?: number | null;
  odooSyncError?: string | null;
}

/**
 * Form submission query options
 */
export interface FormSubmissionQueryOptions extends AdvancedQueryOptions {
  formType?: FormType | FormType[];
  status?: ProcessingStatus | ProcessingStatus[];
  projectId?: number | number[];
  isSpam?: boolean;
  requiresOdooSync?: boolean;
  visitorId?: string;
  sessionId?: string;
  email?: string;
  phone?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasProject?: boolean;
  hasSyncError?: boolean;
}

/**
 * Spam detection result
 */
export interface SpamDetectionResult {
  isSpam: boolean;
  score: number;
  reasons: string[];
}

// ============================================================================
// FORM SUBMISSION MODEL CLASS
// ============================================================================

export class FormSubmissionModel extends BaseModel<
  FormSubmission,
  CreateFormSubmissionDto,
  UpdateFormSubmissionDto
> {
  protected tableName = "form_submissions";
  protected primaryKey = "id";

  protected config = {
    softDelete: false, // Form submissions are never deleted
    timestamps: true,
    defaultSortColumn: "submitted_at",
    defaultSortOrder: "desc" as const,
    searchableColumns: ["email", "phone", "first_name", "last_name"],
    hiddenFields: [],
    fillable: [
      "visitorId",
      "sessionId",
      "formType",
      "formId",
      "projectId",
      "email",
      "phone",
      "firstName",
      "lastName",
      "submittedAt",
      "pageUrl",
      "referrerUrl",
      "ipAddress",
      "userAgent",
      "utmSource",
      "utmMedium",
      "utmCampaign",
      "utmTerm",
      "utmContent",
      "referrer",
      "sourcePage",
      "status",
      "completionTimeSeconds",
      "requiresOdooSync",
      "odooSyncAttemptedAt",
      "odooSyncRetries",
      "odooSyncError",
      "validationErrors",
      "isSpam",
      "spamScore",
      "formData",
    ],
    guarded: ["id", "createdAt", "updatedAt"],
  };

  // Define relations
  protected relations = {
    project: {
      type: "belongsTo" as const,
      model: () => require("./project.model").default,
      foreignKey: "projectId",
      localKey: "id",
    },
    leadMirror: {
      type: "hasOne" as const,
      model: () => require("./lead-mirror.model").default,
      foreignKey: "formSubmissionId",
      localKey: "id",
    },
  };

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Before create hook - validate and detect spam
   */
  protected async beforeCreate(
    data: CreateFormSubmissionDto
  ): Promise<CreateFormSubmissionDto> {
    // Set default submission time
    if (!data.submittedAt) {
      data.submittedAt = new Date();
    }

    // Set default status
    if (!data.status) {
      data.status = ProcessingStatus.PENDING;
    }

    // Extract email/phone from formData if not provided
    if (data.formData) {
      if (!data.email && data.formData.email) {
        data.email = data.formData.email;
      }
      if (!data.phone && data.formData.phone) {
        data.phone = data.formData.phone;
      }
      if (!data.firstName && data.formData.firstName) {
        data.firstName = data.formData.firstName;
      }
      if (!data.lastName && data.formData.lastName) {
        data.lastName = data.formData.lastName;
      }
    }

    // Spam detection
    const spamCheck = await this.detectSpam(data);
    data.isSpam = spamCheck.isSpam;
    data.spamScore = spamCheck.score;

    if (spamCheck.isSpam) {
      data.status = ProcessingStatus.SPAM;
      data.requiresOdooSync = false;
    }

    // Validate email domain
    if (data.email && !this.isValidEmailDomain(data.email)) {
      data.isSpam = true;
      data.status = ProcessingStatus.SPAM;
      data.requiresOdooSync = false;
    }

    return data;
  }

  /**
   * After create hook - trigger async processing
   */
  protected async afterCreate(entity: FormSubmission): Promise<void> {
    console.log(
      `✅ Form submission created: ${entity.formType} (ID: ${entity.id})`
    );

    // TODO: Trigger event for async processing
    // - Send email notifications
    // - Queue for Odoo sync
    // - Track analytics event
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Finds form submissions with custom filters
   */
  async findSubmissions(
    options: FormSubmissionQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<FormSubmission[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    // Apply submission-specific filters
    query = this.applySubmissionFilters(query, options);

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
   * Gets paginated submissions
   */
  async paginateSubmissions(
    options: FormSubmissionQueryOptions & { page: number; limit: number },
    trx?: Knex.Transaction
  ): Promise<PaginatedResult<FormSubmission>> {
    const { page, limit } = options;

    const [items, total] = await Promise.all([
      this.findSubmissions(options, trx),
      this.countSubmissions(options, trx),
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
   * Counts submissions with filters
   */
  async countSubmissions(
    options: FormSubmissionQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    // Apply filters
    query = this.applySubmissionFilters(query, options);

    const result = await query.count(`${this.primaryKey} as count`).first();
    return result ? Number(result.count) : 0;
  }

  /**
   * Finds submissions by visitor ID
   */
  async findByVisitor(
    visitorId: string,
    options: FormSubmissionQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<FormSubmission[]> {
    return this.findSubmissions({ ...options, visitorId }, trx);
  }

  /**
   * Finds submissions by session ID
   */
  async findBySession(
    sessionId: string,
    options: FormSubmissionQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<FormSubmission[]> {
    return this.findSubmissions({ ...options, sessionId }, trx);
  }

  /**
   * Finds submissions by email
   */
  async findByEmail(
    email: string,
    options: FormSubmissionQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<FormSubmission[]> {
    return this.findSubmissions({ ...options, email }, trx);
  }

  /**
   * Finds submissions by form type
   */
  async findByFormType(
    formType: FormType,
    options: FormSubmissionQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<FormSubmission[]> {
    return this.findSubmissions({ ...options, formType }, trx);
  }

  /**
   * Finds submissions by project
   */
  async findByProject(
    projectId: number,
    options: FormSubmissionQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<FormSubmission[]> {
    return this.findSubmissions({ ...options, projectId }, trx);
  }

  /**
   * Gets submissions pending Odoo sync
   */
  async getPendingOdooSync(
    limit: number = 100,
    trx?: Knex.Transaction
  ): Promise<FormSubmission[]> {
    return this.findSubmissions(
      {
        requiresOdooSync: true,
        status: [ProcessingStatus.PENDING, ProcessingStatus.FAILED],
        sortBy: "created_at",
        sortOrder: "asc",
        limit,
      },
      trx
    );
  }

  /**
   * Gets spam submissions
   */
  async getSpamSubmissions(
    options: FormSubmissionQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<FormSubmission[]> {
    return this.findSubmissions({ ...options, isSpam: true }, trx);
  }

  // ============================================================================
  // ODOO SYNC METHODS
  // ============================================================================

  /**
   * Marks submission as sync attempted
   */
  async markSyncAttempted(
    id: number,
    error?: string,
    trx?: Knex.Transaction
  ): Promise<FormSubmission | null> {
    const submission = await this.findById(id, {}, trx);
    if (!submission) return null;

    const retries = submission.odooSyncRetries + 1;
    const status = error
      ? ProcessingStatus.FAILED
      : ProcessingStatus.PROCESSING;

    return this.update(
      id,
      {
        odooSyncAttemptedAt: new Date(),
        odooSyncRetries: retries,
        odooSyncError: error || undefined,
        status,
      },
      trx
    );
  }

  /**
   * Marks submission as synced successfully
   */
  async markSyncCompleted(
    id: number,
    trx?: Knex.Transaction
  ): Promise<FormSubmission | null> {
    return this.update(
      id,
      {
        status: ProcessingStatus.COMPLETED,
        requiresOdooSync: false,
        odooSyncError: null,
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
  ): Promise<FormSubmission | null> {
    return this.update(
      id,
      {
        status: ProcessingStatus.PENDING,
        odooSyncAttemptedAt: null,
        odooSyncRetries: 0,
        odooSyncError: null,
      },
      trx
    );
  }

  // ============================================================================
  // SPAM DETECTION
  // ============================================================================

  /**
   * Detects spam in submission
   */
  private async detectSpam(
    data: CreateFormSubmissionDto
  ): Promise<SpamDetectionResult> {
    const reasons: string[] = [];
    let score = 0;

    // Check for suspicious patterns in form data
    if (data.formData) {
      const jsonString = JSON.stringify(data.formData).toLowerCase();

      // Suspicious keywords
      const spamKeywords = [
        "viagra",
        "cialis",
        "casino",
        "lottery",
        "prize",
        "click here",
        "buy now",
        "limited offer",
      ];

      for (const keyword of spamKeywords) {
        if (jsonString.includes(keyword)) {
          score += 0.3;
          reasons.push(`Contains spam keyword: ${keyword}`);
        }
      }

      // Excessive URLs
      const urlCount = (jsonString.match(/https?:\/\//g) || []).length;
      if (urlCount > 3) {
        score += 0.2;
        reasons.push(`Excessive URLs: ${urlCount}`);
      }
    }

    // Check for rapid submissions from same IP
    if (data.ipAddress) {
      const recentCount = await this.db(this.tableName)
        .where("ip_address", data.ipAddress)
        .where(
          "submitted_at",
          ">",
          this.db.raw("DATE_SUB(NOW(), INTERVAL 1 HOUR)")
        )
        .count("* as count")
        .first();

      if (recentCount && Number(recentCount.count) > 5) {
        score += 0.4;
        reasons.push("Too many submissions from IP");
      }
    }

    // Check for duplicate email in last hour
    if (data.email) {
      const recentEmailCount = await this.db(this.tableName)
        .where("email", data.email)
        .where(
          "submitted_at",
          ">",
          this.db.raw("DATE_SUB(NOW(), INTERVAL 1 HOUR)")
        )
        .count("* as count")
        .first();

      if (recentEmailCount && Number(recentEmailCount.count) > 3) {
        score += 0.3;
        reasons.push("Duplicate email in short time");
      }
    }

    // Very fast completion time (likely bot)
    if (
      data.completionTimeSeconds !== undefined &&
      data.completionTimeSeconds < 3
    ) {
      score += 0.5;
      reasons.push("Suspiciously fast completion");
    }

    return {
      isSpam: score >= 0.7,
      score: Math.min(score, 1.0),
      reasons,
    };
  }

  /**
   * Validates email domain against blocklist
   */
  private isValidEmailDomain(email: string): boolean {
    const BLOCKED_DOMAINS = [
      "mailinator.com",
      "tempmail.com",
      "10minutemail.com",
      "guerrillamail.com",
      "dispostable.com",
      "maildrop.cc",
      "fakeinbox.com",
      "throwaway.email",
      "temp-mail.org",
    ];

    const domain = email.split("@")[1]?.toLowerCase();
    return !BLOCKED_DOMAINS.includes(domain);
  }

  // ============================================================================
  // ANALYTICS METHODS
  // ============================================================================

  /**
   * Gets submission statistics
   */
  async getStatistics(
    dateFrom?: Date,
    dateTo?: Date,
    trx?: Knex.Transaction
  ): Promise<any> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    if (dateFrom) {
      query = query.where("submitted_at", ">=", dateFrom);
    }
    if (dateTo) {
      query = query.where("submitted_at", "<=", dateTo);
    }

    const [stats] = await query.select(
      connection.raw("COUNT(*) as total"),
      connection.raw(
        "COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed"
      ),
      connection.raw(
        "COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending"
      ),
      connection.raw("COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed"),
      connection.raw("COUNT(CASE WHEN is_spam = true THEN 1 END) as spam"),
      connection.raw(
        "COUNT(CASE WHEN requires_odoo_sync = true THEN 1 END) as needsSync"
      ),
      connection.raw("AVG(completion_time_seconds) as avgCompletionTime"),
      connection.raw("AVG(spam_score) as avgSpamScore")
    );

    return {
      total: Number(stats.total),
      completed: Number(stats.completed),
      pending: Number(stats.pending),
      failed: Number(stats.failed),
      spam: Number(stats.spam),
      needsSync: Number(stats.needsSync),
      avgCompletionTime: stats.avgCompletionTime
        ? Number(stats.avgCompletionTime)
        : null,
      avgSpamScore: stats.avgSpamScore ? Number(stats.avgSpamScore) : null,
    };
  }

  /**
   * Gets submission breakdown by form type
   */
  async getBreakdownByFormType(
    dateFrom?: Date,
    dateTo?: Date,
    trx?: Knex.Transaction
  ): Promise<any[]> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    if (dateFrom) {
      query = query.where("submitted_at", ">=", dateFrom);
    }
    if (dateTo) {
      query = query.where("submitted_at", "<=", dateTo);
    }

    return query
      .select("form_type")
      .count("* as count")
      .groupBy("form_type")
      .orderBy("count", "desc");
  }

  /**
   * Gets top UTM sources
   */
  async getTopUtmSources(
    limit: number = 10,
    trx?: Knex.Transaction
  ): Promise<any[]> {
    const connection = trx || this.db;

    return connection(this.tableName)
      .select("utm_source", "utm_medium", "utm_campaign")
      .count("* as submissions")
      .whereNotNull("utm_source")
      .groupBy("utm_source", "utm_medium", "utm_campaign")
      .orderBy("submissions", "desc")
      .limit(limit);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Applies submission-specific filters to query
   */
  private applySubmissionFilters(
    query: Knex.QueryBuilder,
    options: FormSubmissionQueryOptions
  ): Knex.QueryBuilder {
    // Form type filter
    if (options.formType) {
      if (Array.isArray(options.formType)) {
        query = query.whereIn("form_type", options.formType);
      } else {
        query = query.where("form_type", options.formType);
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

    // Project filter
    if (options.projectId) {
      if (Array.isArray(options.projectId)) {
        query = query.whereIn("project_id", options.projectId);
      } else {
        query = query.where("project_id", options.projectId);
      }
    }

    // Spam filter
    if (options.isSpam !== undefined) {
      query = query.where("is_spam", options.isSpam);
    }

    // Odoo sync filter
    if (options.requiresOdooSync !== undefined) {
      query = query.where("requires_odoo_sync", options.requiresOdooSync);
    }

    // Visitor ID filter
    if (options.visitorId) {
      query = query.where("visitor_id", options.visitorId);
    }

    // Session ID filter
    if (options.sessionId) {
      query = query.where("session_id", options.sessionId);
    }

    // Email filter
    if (options.email) {
      query = query.where("email", "like", `%${options.email}%`);
    }

    // Phone filter
    if (options.phone) {
      query = query.where("phone", "like", `%${options.phone}%`);
    }

    // Date range filter
    if (options.dateFrom) {
      query = query.where("submitted_at", ">=", options.dateFrom);
    }
    if (options.dateTo) {
      query = query.where("submitted_at", "<=", options.dateTo);
    }

    // Has project filter
    if (options.hasProject !== undefined) {
      if (options.hasProject) {
        query = query.whereNotNull("project_id");
      } else {
        query = query.whereNull("project_id");
      }
    }

    // Has sync error filter
    if (options.hasSyncError !== undefined) {
      if (options.hasSyncError) {
        query = query.whereNotNull("odoo_sync_error");
      } else {
        query = query.whereNull("odoo_sync_error");
      }
    }

    return query;
  }

  /**
   * Maps database record to FormSubmission entity
   */
  protected mapToEntity(record: DatabaseRecord): FormSubmission {
    return {
      id: record.id,
      visitorId: record.visitor_id,
      sessionId: record.session_id,
      formType: record.form_type as FormType,
      formId: record.form_id,
      projectId: record.project_id,
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
      status: record.status as ProcessingStatus,
      completionTimeSeconds: record.completion_time_seconds,
      requiresOdooSync: Boolean(record.requires_odoo_sync),
      odooSyncAttemptedAt: record.odoo_sync_attempted_at
        ? new Date(record.odoo_sync_attempted_at)
        : null,
      odooSyncRetries: record.odoo_sync_retries || 0,
      odooSyncError: record.odoo_sync_error,
      validationErrors: record.validation_errors || 0,
      isSpam: Boolean(record.is_spam),
      spamScore: record.spam_score ? Number(record.spam_score) : null,
      formData: this.parseJson(record.form_data),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

// Export singleton instance
export default new FormSubmissionModel();
