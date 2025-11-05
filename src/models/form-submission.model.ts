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
 * @openapi
 * components:
 *   schemas:
 *     
 *     FormType:
 *       type: string
 *       enum:
 *         - contact_form
 *         - project_inquiry
 *         - appointment_request
 *         - catalog_download
 *         - land_submission
 *         - job_application
 *         - event_registration
 *       description: Type of form submitted
 *       example: contact_form
 *     
 *     ProcessingStatus:
 *       type: string
 *       enum:
 *         - pending
 *         - processing
 *         - completed
 *         - failed
 *         - spam
 *       description: Processing status of the form submission
 *       example: pending
 *     
 *     FormSubmission:
 *       type: object
 *       required:
 *         - id
 *         - formType
 *         - submittedAt
 *         - requiresOdooSync
 *         - validationErrors
 *         - isSpam
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the form submission
 *           example: 1
 *         visitorId:
 *           type: string
 *           nullable: true
 *           description: Visitor tracking identifier
 *           example: "abc123def456"
 *         sessionId:
 *           type: string
 *           nullable: true
 *           description: Session identifier
 *           example: "session_789xyz"
 *         formType:
 *           $ref: '#/components/schemas/FormType'
 *         formId:
 *           type: string
 *           nullable: true
 *           description: Specific form identifier
 *           example: "contact_form_main"
 *         projectId:
 *           type: integer
 *           nullable: true
 *           description: Associated project ID if applicable
 *           example: 5
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *           description: Email address from form
 *           example: "john.doe@example.com"
 *         phone:
 *           type: string
 *           nullable: true
 *           description: Phone number from form
 *           example: "+1-555-0123"
 *         firstName:
 *           type: string
 *           nullable: true
 *           description: First name from form
 *           example: "John"
 *         lastName:
 *           type: string
 *           nullable: true
 *           description: Last name from form
 *           example: "Doe"
 *         submittedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when form was submitted
 *           example: "2024-01-15T10:30:00Z"
 *         pageUrl:
 *           type: string
 *           nullable: true
 *           description: URL where form was submitted
 *           example: "https://example.com/contact"
 *         referrerUrl:
 *           type: string
 *           nullable: true
 *           description: Referrer URL
 *           example: "https://google.com"
 *         ipAddress:
 *           type: string
 *           nullable: true
 *           description: IP address of submitter
 *           example: "192.168.1.1"
 *         userAgent:
 *           type: string
 *           nullable: true
 *           description: User agent string
 *           example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
 *         utmSource:
 *           type: string
 *           nullable: true
 *           description: UTM source for marketing attribution
 *           example: "google"
 *         utmMedium:
 *           type: string
 *           nullable: true
 *           description: UTM medium for marketing attribution
 *           example: "cpc"
 *         utmCampaign:
 *           type: string
 *           nullable: true
 *           description: UTM campaign for marketing attribution
 *           example: "spring_campaign_2024"
 *         utmTerm:
 *           type: string
 *           nullable: true
 *           description: UTM term for marketing attribution
 *           example: "real estate"
 *         utmContent:
 *           type: string
 *           nullable: true
 *           description: UTM content for marketing attribution
 *           example: "banner_ad_1"
 *         referrer:
 *           type: string
 *           nullable: true
 *           description: Referrer for tracking
 *           example: "facebook"
 *         sourcePage:
 *           type: string
 *           nullable: true
 *           description: Source page for tracking
 *           example: "/projects/luxury-villas"
 *         status:
 *           $ref: '#/components/schemas/ProcessingStatus'
 *         completionTimeSeconds:
 *           type: integer
 *           nullable: true
 *           description: Time taken to complete form in seconds
 *           example: 45
 *         requiresOdooSync:
 *           type: boolean
 *           description: Whether submission needs to be synced to Odoo CRM
 *           example: true
 *         odooSyncAttemptedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Last Odoo sync attempt timestamp
 *           example: "2024-01-16T14:20:00Z"
 *         odooSyncRetries:
 *           type: integer
 *           description: Number of Odoo sync retry attempts
 *           example: 2
 *         odooSyncError:
 *           type: string
 *           nullable: true
 *           description: Odoo sync error message
 *           example: "Connection timeout"
 *         validationErrors:
 *           type: integer
 *           description: Number of validation errors found
 *           example: 0
 *         isSpam:
 *           type: boolean
 *           description: Whether submission was detected as spam
 *           example: false
 *         spamScore:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Spam detection score (0-1)
 *           example: 0.15
 *         formData:
 *           type: object
 *           nullable: true
 *           description: Complete form data as JSON object
 *           example:
 *             message: "Interested in property details"
 *             budget: "500000-750000"
 *             preferred_contact: "email"
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
 *         project:
 *           type: object
 *           description: Virtual relation - associated project data
 *         leadMirror:
 *           type: object
 *           description: Virtual relation - associated lead mirror data
 *     
 *     CreateFormSubmissionDto:
 *       type: object
 *       required:
 *         - formType
 *       properties:
 *         visitorId:
 *           type: string
 *           description: Visitor tracking identifier
 *           example: "abc123def456"
 *         sessionId:
 *           type: string
 *           description: Session identifier
 *           example: "session_789xyz"
 *         formType:
 *           $ref: '#/components/schemas/FormType'
 *         formId:
 *           type: string
 *           description: Specific form identifier
 *           example: "contact_form_main"
 *         projectId:
 *           type: integer
 *           description: Associated project ID if applicable
 *           example: 5
 *         email:
 *           type: string
 *           format: email
 *           description: Email address from form
 *           example: "john.doe@example.com"
 *         phone:
 *           type: string
 *           description: Phone number from form
 *           example: "+1-555-0123"
 *         firstName:
 *           type: string
 *           description: First name from form
 *           example: "John"
 *         lastName:
 *           type: string
 *           description: Last name from form
 *           example: "Doe"
 *         submittedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when form was submitted
 *           example: "2024-01-15T10:30:00Z"
 *         pageUrl:
 *           type: string
 *           description: URL where form was submitted
 *           example: "https://example.com/contact"
 *         referrerUrl:
 *           type: string
 *           description: Referrer URL
 *           example: "https://google.com"
 *         ipAddress:
 *           type: string
 *           description: IP address of submitter
 *           example: "192.168.1.1"
 *         userAgent:
 *           type: string
 *           description: User agent string
 *           example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
 *         utmSource:
 *           type: string
 *           description: UTM source for marketing attribution
 *           example: "google"
 *         utmMedium:
 *           type: string
 *           description: UTM medium for marketing attribution
 *           example: "cpc"
 *         utmCampaign:
 *           type: string
 *           description: UTM campaign for marketing attribution
 *           example: "spring_campaign_2024"
 *         utmTerm:
 *           type: string
 *           description: UTM term for marketing attribution
 *           example: "real estate"
 *         utmContent:
 *           type: string
 *           description: UTM content for marketing attribution
 *           example: "banner_ad_1"
 *         referrer:
 *           type: string
 *           description: Referrer for tracking
 *           example: "facebook"
 *         sourcePage:
 *           type: string
 *           description: Source page for tracking
 *           example: "/projects/luxury-villas"
 *         status:
 *           $ref: '#/components/schemas/ProcessingStatus'
 *         completionTimeSeconds:
 *           type: integer
 *           description: Time taken to complete form in seconds
 *           example: 45
 *         requiresOdooSync:
 *           type: boolean
 *           description: Whether submission needs to be synced to Odoo CRM
 *           example: true
 *         validationErrors:
 *           type: integer
 *           description: Number of validation errors found
 *           example: 0
 *         isSpam:
 *           type: boolean
 *           description: Whether submission was detected as spam
 *           example: false
 *         spamScore:
 *           type: number
 *           format: float
 *           description: Spam detection score (0-1)
 *           example: 0.15
 *         formData:
 *           type: object
 *           description: Complete form data as JSON object
 *           example:
 *             message: "Interested in property details"
 *             budget: "500000-750000"
 *             preferred_contact: "email"
 *     
 *     UpdateFormSubmissionDto:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateFormSubmissionDto'
 *         - type: object
 *           properties:
 *             odooSyncAttemptedAt:
 *               type: string
 *               format: date-time
 *               nullable: true
 *               description: Last Odoo sync attempt timestamp
 *               example: "2024-01-16T14:20:00Z"
 *             odooSyncRetries:
 *               type: integer
 *               nullable: true
 *               description: Number of Odoo sync retry attempts
 *               example: 2
 *             odooSyncError:
 *               type: string
 *               nullable: true
 *               description: Odoo sync error message
 *               example: "Connection timeout"
 *     
 *     FormSubmissionQueryOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/AdvancedQueryOptions'
 *         - type: object
 *           properties:
 *             formType:
 *               $ref: '#/components/schemas/FormType'
 *             status:
 *               $ref: '#/components/schemas/ProcessingStatus'
 *             projectId:
 *               type: integer
 *               description: Filter by project ID
 *               example: 5
 *             isSpam:
 *               type: boolean
 *               description: Filter by spam status
 *               example: false
 *             requiresOdooSync:
 *               type: boolean
 *               description: Filter by Odoo sync requirement
 *               example: true
 *             visitorId:
 *               type: string
 *               description: Filter by visitor ID
 *               example: "abc123def456"
 *             sessionId:
 *               type: string
 *               description: Filter by session ID
 *               example: "session_789xyz"
 *             email:
 *               type: string
 *               description: Filter by email (partial match)
 *               example: "john@"
 *             phone:
 *               type: string
 *               description: Filter by phone (partial match)
 *               example: "555"
 *             dateFrom:
 *               type: string
 *               format: date-time
 *               description: Filter submissions from this date
 *               example: "2024-01-01T00:00:00Z"
 *             dateTo:
 *               type: string
 *               format: date-time
 *               description: Filter submissions to this date
 *               example: "2024-12-31T23:59:59Z"
 *             hasProject:
 *               type: boolean
 *               description: Filter by project association
 *               example: true
 *             hasSyncError:
 *               type: boolean
 *               description: Filter by sync error presence
 *               example: false
 *     
 *     SpamDetectionResult:
 *       type: object
 *       required:
 *         - isSpam
 *         - score
 *         - reasons
 *       properties:
 *         isSpam:
 *           type: boolean
 *           description: Whether submission was detected as spam
 *           example: false
 *         score:
 *           type: number
 *           format: float
 *           description: Spam detection score (0-1)
 *           example: 0.15
 *         reasons:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of reasons for spam detection
 *           example: ["Contains spam keyword: casino", "Too many submissions from IP"]
 *     
 *     FormSubmissionStatistics:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of submissions
 *           example: 1250
 *         completed:
 *           type: integer
 *           description: Number of completed submissions
 *           example: 1150
 *         pending:
 *           type: integer
 *           description: Number of pending submissions
 *           example: 50
 *         failed:
 *           type: integer
 *           description: Number of failed submissions
 *           example: 25
 *         spam:
 *           type: integer
 *           description: Number of spam submissions
 *           example: 25
 *         needsSync:
 *           type: integer
 *           description: Number of submissions requiring Odoo sync
 *           example: 200
 *         avgCompletionTime:
 *           type: number
 *           format: float
 *           description: Average completion time in seconds
 *           example: 42.5
 *         avgSpamScore:
 *           type: number
 *           format: float
 *           description: Average spam score
 *           example: 0.12
 *     
 *     UtmSourceStatistics:
 *       type: object
 *       properties:
 *         utmSource:
 *           type: string
 *           description: UTM source
 *           example: "google"
 *         utmMedium:
 *           type: string
 *           description: UTM medium
 *           example: "cpc"
 *         utmCampaign:
 *           type: string
 *           description: UTM campaign
 *           example: "spring_campaign_2024"
 *         submissions:
 *           type: integer
 *           description: Number of submissions from this source
 *           example: 45
 */

/**
 * @openapi
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
 * @openapi
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
 * @openapi
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
 * @openapi
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
 * @openapi
 * Update form submission DTO
 */
export interface UpdateFormSubmissionDto
  extends Partial<CreateFormSubmissionDto> {
  odooSyncAttemptedAt?: Date | null;
  odooSyncRetries?: number | null;
  odooSyncError?: string | null;
}

/**
 * @openapi
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
 * @openapi
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

/**
 * @openapi
 * Form Submission Model Class
 * 
 * Central table for ALL form submissions on the website with comprehensive
 * validation, Odoo CRM sync queue management, and intelligent spam detection
 * 
 * @class FormSubmissionModel
 * @extends BaseModel<FormSubmission, CreateFormSubmissionDto, UpdateFormSubmissionDto>
 */
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
   * @openapi
   * beforeCreate lifecycle hook
   * 
   * Validates and processes form submission data before creation:
   * - Sets default submission timestamp
   * - Sets default processing status
   * - Extracts contact information from form data if not provided
   * - Performs comprehensive spam detection
   * - Validates email domains against blocklist
   * - Updates status and sync requirements based on spam detection
   * 
   * @param {CreateFormSubmissionDto} data - Form submission creation data
   * @returns {Promise<CreateFormSubmissionDto>} Processed data
   * @throws {Error} If validation fails
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
   * @openapi
   * afterCreate lifecycle hook
   * 
   * Logs form submission creation and triggers async processing pipeline
   * 
   * @param {FormSubmission} entity - Created form submission entity
   * @returns {Promise<void>}
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
   * @openapi
   * Finds form submissions with custom filters
   * 
   * @param {FormSubmissionQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FormSubmission[]>} Array of form submissions
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
   * @openapi
   * Gets paginated submissions
   * 
   * @param {FormSubmissionQueryOptions & { page: number; limit: number }} options - Query and pagination options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<PaginatedResult<FormSubmission>>} Paginated result
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
   * @openapi
   * Counts submissions with filters
   * 
   * @param {FormSubmissionQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<number>} Count of submissions
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
   * @openapi
   * Finds submissions by visitor ID
   * 
   * @param {string} visitorId - Visitor identifier
   * @param {FormSubmissionQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FormSubmission[]>} Array of submissions from the visitor
   */
  async findByVisitor(
    visitorId: string,
    options: FormSubmissionQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<FormSubmission[]> {
    return this.findSubmissions({ ...options, visitorId }, trx);
  }

  /**
   * @openapi
   * Finds submissions by session ID
   * 
   * @param {string} sessionId - Session identifier
   * @param {FormSubmissionQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FormSubmission[]>} Array of submissions from the session
   */
  async findBySession(
    sessionId: string,
    options: FormSubmissionQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<FormSubmission[]> {
    return this.findSubmissions({ ...options, sessionId }, trx);
  }

  /**
   * @openapi
   * Finds submissions by email
   * 
   * @param {string} email - Email address
   * @param {FormSubmissionQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FormSubmission[]>} Array of submissions from the email
   */
  async findByEmail(
    email: string,
    options: FormSubmissionQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<FormSubmission[]> {
    return this.findSubmissions({ ...options, email }, trx);
  }

  /**
   * @openapi
   * Finds submissions by form type
   * 
   * @param {FormType} formType - Form type
   * @param {FormSubmissionQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FormSubmission[]>} Array of submissions of the specified type
   */
  async findByFormType(
    formType: FormType,
    options: FormSubmissionQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<FormSubmission[]> {
    return this.findSubmissions({ ...options, formType }, trx);
  }

  /**
   * @openapi
   * Finds submissions by project
   * 
   * @param {number} projectId - Project identifier
   * @param {FormSubmissionQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FormSubmission[]>} Array of submissions related to the project
   */
  async findByProject(
    projectId: number,
    options: FormSubmissionQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<FormSubmission[]> {
    return this.findSubmissions({ ...options, projectId }, trx);
  }

  /**
   * @openapi
   * Gets submissions pending Odoo sync
   * 
   * @param {number} [limit=100] - Maximum number of results
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FormSubmission[]>} Array of submissions pending sync
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
   * @openapi
   * Gets spam submissions
   * 
   * @param {FormSubmissionQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FormSubmission[]>} Array of spam submissions
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
   * @openapi
   * Marks submission as sync attempted
   * 
   * @param {number} id - Submission ID
   * @param {string} [error] - Optional error message
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FormSubmission | null>} Updated submission or null
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
   * @openapi
   * Marks submission as synced successfully
   * 
   * @param {number} id - Submission ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FormSubmission | null>} Updated submission or null
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
   * @openapi
   * Resets sync status for retry
   * 
   * @param {number} id - Submission ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FormSubmission | null>} Updated submission or null
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
   * @openapi
   * Detects spam in submission using multiple detection methods
   * 
   * @param {CreateFormSubmissionDto} data - Form submission data
   * @returns {Promise<SpamDetectionResult>} Spam detection result with score and reasons
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
   * @openapi
   * Validates email domain against blocklist
   * 
   * @param {string} email - Email address to validate
   * @returns {boolean} True if domain is valid, false if blocked
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
   * @openapi
   * Gets submission statistics
   * 
   * @param {Date} [dateFrom] - Optional start date filter
   * @param {Date} [dateTo] - Optional end date filter
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FormSubmissionStatistics>} Comprehensive statistics object
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
   * @openapi
   * Gets submission breakdown by form type
   * 
   * @param {Date} [dateFrom] - Optional start date filter
   * @param {Date} [dateTo] - Optional end date filter
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<any[]>} Array of form type statistics
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
   * @openapi
   * Gets top UTM sources
   * 
   * @param {number} [limit=10] - Maximum number of results
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<UtmSourceStatistics[]>} Array of UTM source statistics
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
   * @openapi
   * Applies submission-specific filters to query
   * 
   * @param {Knex.QueryBuilder} query - Database query builder
   * @param {FormSubmissionQueryOptions} options - Query options
   * @returns {Knex.QueryBuilder} Modified query builder
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
   * @openapi
   * Maps database record to FormSubmission entity
   * 
   * @param {DatabaseRecord} record - Database record
   * @returns {FormSubmission} FormSubmission entity
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