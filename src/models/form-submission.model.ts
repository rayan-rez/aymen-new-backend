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
}

/**
 * Form submission entity interface
 */
export interface FormSubmission {
  id: number;
  formType: FormType;
  formId: string | null;
  projectId: number | null;

  // Extracted key fields for quick access
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  note: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Virtual relations
  project?: any;
}

/**
 * Create form submission DTO
 */
export interface CreateFormSubmissionDto {
  formType: FormType;
  formId?: string;
  projectId?: number | null;

  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  note?: string;
}

/**
 * Update form submission DTO
 */
export interface UpdateFormSubmissionDto
  extends Partial<CreateFormSubmissionDto> {}

/**
 * Form submission query options
 */
export interface FormSubmissionQueryOptions extends AdvancedQueryOptions {
  formType?: FormType | FormType[];
  projectId?: number | number[];
  email?: string;
  phone?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasProject?: boolean;
  hasSyncError?: boolean;
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
      "formType",
      "formId",
      "projectId",
      "email",
      "phone",
      "firstName",
      "lastName",
      "note",
      "status",
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


    // Project filter
    if (options.projectId) {
      if (Array.isArray(options.projectId)) {
        query = query.whereIn("project_id", options.projectId);
      } else {
        query = query.where("project_id", options.projectId);
      }
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
      formType: record.form_type as FormType,
      formId: record.form_id,
      projectId: record.project_id,
      email: record.email,
      note: record.note,
      phone: record.phone,
      firstName: record.first_name,
      lastName: record.last_name,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

// Export singleton instance
export default new FormSubmissionModel();
