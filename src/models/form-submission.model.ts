/**
 * Form Submission Model - FIXED TO MATCH DATABASE SCHEMA
 * 
 * Removed all commented-out fields from migration:
 * - visitor_id, session_id, submitted_at, page_url, referrer_url
 * - ip_address, user_agent, utm tracking, referrer tracking
 * - status, completion_time_seconds, odoo sync fields
 * - validation_errors, is_spam, spam_score, form_data
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
  note: string | null;

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
}

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
    defaultSortColumn: "created_at",
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

    query = this.applySubmissionFilters(query, options);

    const records = await query;
    let entities = records.map((r: DatabaseRecord) => this.mapToEntity(r));

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

    if (options.email) {
      query = query.where("email", "like", `%${options.email}%`);
    }

    if (options.phone) {
      query = query.where("phone", "like", `%${options.phone}%`);
    }

    if (options.dateFrom) {
      query = query.where("created_at", ">=", options.dateFrom);
    }
    if (options.dateTo) {
      query = query.where("created_at", "<=", options.dateTo);
    }

    if (options.hasProject !== undefined) {
      if (options.hasProject) {
        query = query.whereNotNull("project_id");
      } else {
        query = query.whereNull("project_id");
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
      phone: record.phone,
      firstName: record.first_name,
      lastName: record.last_name,
      note: record.note,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new FormSubmissionModel();