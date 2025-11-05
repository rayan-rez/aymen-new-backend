/**
 * Event Registration Model
 * 
 * Manages event attendee registrations with status tracking
 * Handles guest counts, check-ins, and marketing attribution
 * 
 * @module models/event-registration.model
 */

import { BaseModel, AdvancedQueryOptions, PaginatedResult, DatabaseRecord } from "./base";
import { Knex } from "knex";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * @openapi
 * components:
 *   schemas:
 *     
 *     RegistrationStatus:
 *       type: string
 *       enum:
 *         - confirmed
 *         - pending
 *         - cancelled
 *         - attended
 *         - no_show
 *       description: |
 *         Registration status:
 *         - confirmed: Registration confirmed
 *         - pending: Registration pending approval
 *         - cancelled: Registration cancelled
 *         - attended: Attendee checked in at event
 *         - no_show: Registered but didn't attend
 *       example: confirmed
 *     
 *     EventRegistration:
 *       type: object
 *       required:
 *         - id
 *         - eventId
 *         - fullName
 *         - email
 *         - numberOfGuests
 *         - status
 *         - registeredAt
 *         - confirmationSent
 *         - reminderSent
 *         - feedbackRequested
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the registration
 *           example: 1
 *         eventId:
 *           type: integer
 *           description: Associated event identifier
 *           example: 5
 *         leadMirrorId:
 *           type: integer
 *           nullable: true
 *           description: Associated lead mirror identifier
 *           example: 123
 *         fullName:
 *           type: string
 *           description: Full name of the registrant
 *           example: "John Smith"
 *         email:
 *           type: string
 *           format: email
 *           description: Email address of the registrant
 *           example: "john.smith@example.com"
 *         phone:
 *           type: string
 *           nullable: true
 *           description: Phone number of the registrant
 *           example: "+1-555-0123"
 *         company:
 *           type: string
 *           nullable: true
 *           description: Company or organization name
 *           example: "Tech Corp"
 *         jobTitle:
 *           type: string
 *           nullable: true
 *           description: Job title or position
 *           example: "Marketing Director"
 *         numberOfGuests:
 *           type: integer
 *           minimum: 1
 *           description: Number of guests including the registrant
 *           example: 2
 *         specialRequirements:
 *           type: string
 *           nullable: true
 *           description: Any special requirements or dietary restrictions
 *           example: "Vegetarian meal, wheelchair accessible"
 *         notes:
 *           type: string
 *           nullable: true
 *           description: Internal notes about the registration
 *           example: "VIP guest, arrived early"
 *         status:
 *           $ref: '#/components/schemas/RegistrationStatus'
 *         registeredAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when registration was created
 *           example: "2024-01-15T10:30:00Z"
 *         cancelledAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when registration was cancelled
 *           example: null
 *         checkedInAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when attendee checked in at event
 *           example: "2024-02-01T18:00:00Z"
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
 *           example: "spring_events_2024"
 *         utmTerm:
 *           type: string
 *           nullable: true
 *           description: UTM term for marketing attribution
 *           example: "real estate event"
 *         utmContent:
 *           type: string
 *           nullable: true
 *           description: UTM content for marketing attribution
 *           example: "banner_ad_1"
 *         confirmationSent:
 *           type: boolean
 *           description: Whether confirmation email has been sent
 *           example: true
 *         reminderSent:
 *           type: boolean
 *           description: Whether reminder email has been sent
 *           example: false
 *         feedbackRequested:
 *           type: boolean
 *           description: Whether post-event feedback has been requested
 *           example: false
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
 *         leadMirror:
 *           type: object
 *           description: Virtual relation - associated lead mirror data
 *     
 *     CreateRegistrationDto:
 *       type: object
 *       required:
 *         - eventId
 *         - fullName
 *         - email
 *       properties:
 *         eventId:
 *           type: integer
 *           description: Associated event identifier
 *           example: 5
 *         leadMirrorId:
 *           type: integer
 *           description: Associated lead mirror identifier
 *           example: 123
 *         fullName:
 *           type: string
 *           description: Full name of the registrant
 *           example: "John Smith"
 *         email:
 *           type: string
 *           format: email
 *           description: Email address of the registrant
 *           example: "john.smith@example.com"
 *         phone:
 *           type: string
 *           description: Phone number of the registrant
 *           example: "+1-555-0123"
 *         company:
 *           type: string
 *           description: Company or organization name
 *           example: "Tech Corp"
 *         jobTitle:
 *           type: string
 *           description: Job title or position
 *           example: "Marketing Director"
 *         numberOfGuests:
 *           type: integer
 *           minimum: 1
 *           description: Number of guests including the registrant
 *           example: 2
 *         specialRequirements:
 *           type: string
 *           description: Any special requirements or dietary restrictions
 *           example: "Vegetarian meal, wheelchair accessible"
 *         notes:
 *           type: string
 *           description: Internal notes about the registration
 *           example: "VIP guest, arrived early"
 *         status:
 *           $ref: '#/components/schemas/RegistrationStatus'
 *         registeredAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when registration was created
 *           example: "2024-01-15T10:30:00Z"
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
 *           example: "spring_events_2024"
 *         utmTerm:
 *           type: string
 *           description: UTM term for marketing attribution
 *           example: "real estate event"
 *         utmContent:
 *           type: string
 *           description: UTM content for marketing attribution
 *           example: "banner_ad_1"
 *     
 *     UpdateRegistrationDto:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateRegistrationDto'
 *         - type: object
 *           properties:
 *             cancelledAt:
 *               type: string
 *               format: date-time
 *               nullable: true
 *               description: Timestamp when registration was cancelled
 *               example: null
 *             checkedInAt:
 *               type: string
 *               format: date-time
 *               nullable: true
 *               description: Timestamp when attendee checked in at event
 *               example: "2024-02-01T18:00:00Z"
 *             confirmationSent:
 *               type: boolean
 *               description: Whether confirmation email has been sent
 *               example: true
 *             reminderSent:
 *               type: boolean
 *               description: Whether reminder email has been sent
 *               example: false
 *             feedbackRequested:
 *               type: boolean
 *               description: Whether post-event feedback has been requested
 *               example: false
 *     
 *     RegistrationQueryOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/AdvancedQueryOptions'
 *         - type: object
 *           properties:
 *             eventId:
 *               type: integer
 *               description: Filter by event ID
 *               example: 5
 *             leadMirrorId:
 *               type: integer
 *               description: Filter by lead mirror ID
 *               example: 123
 *             status:
 *               $ref: '#/components/schemas/RegistrationStatus'
 *             email:
 *               type: string
 *               description: Filter by email (partial match)
 *               example: "john@"
 *             phone:
 *               type: string
 *               description: Filter by phone (partial match)
 *               example: "555"
 *             company:
 *               type: string
 *               description: Filter by company (partial match)
 *               example: "Tech"
 *             hasCheckedIn:
 *               type: boolean
 *               description: Filter by check-in status
 *               example: true
 *             registeredAfter:
 *               type: string
 *               format: date-time
 *               description: Filter registrations created after this date
 *               example: "2024-01-01T00:00:00Z"
 *             registeredBefore:
 *               type: string
 *               format: date-time
 *               description: Filter registrations created before this date
 *               example: "2024-12-31T23:59:59Z"
 *             confirmationSent:
 *               type: boolean
 *               description: Filter by confirmation email status
 *               example: true
 *             reminderSent:
 *               type: boolean
 *               description: Filter by reminder email status
 *               example: false
 *     
 *     RegistrationStatistics:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of registrations
 *           example: 150
 *         confirmed:
 *           type: integer
 *           description: Number of confirmed registrations
 *           example: 120
 *         pending:
 *           type: integer
 *           description: Number of pending registrations
 *           example: 15
 *         cancelled:
 *           type: integer
 *           description: Number of cancelled registrations
 *           example: 10
 *         attended:
 *           type: integer
 *           description: Number of attendees who checked in
 *           example: 95
 *         noShow:
 *           type: integer
 *           description: Number of no-shows
 *           example: 25
 *         totalGuests:
 *           type: integer
 *           description: Total number of guests including registrants
 *           example: 180
 *         checkedIn:
 *           type: integer
 *           description: Number of registrations that checked in
 *           example: 95
 *         attendanceRate:
 *           type: number
 *           format: float
 *           description: Percentage of confirmed registrations that attended
 *           example: 79.17
 */

/**
 * Registration status enumeration
 */
export enum RegistrationStatus {
  CONFIRMED = "confirmed",
  PENDING = "pending",
  CANCELLED = "cancelled",
  ATTENDED = "attended",
  NO_SHOW = "no_show",
}

/**
 * @openapi
 * Event registration entity interface
 */
export interface EventRegistration {
  id: number;
  eventId: number;
  leadMirrorId: number | null;

  // Registrant information
  fullName: string;
  email: string;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;

  // Registration details
  numberOfGuests: number;
  specialRequirements: string | null;
  notes: string | null;

  // Status tracking
  status: RegistrationStatus;
  registeredAt: Date;
  cancelledAt: Date | null;
  checkedInAt: Date | null;

  // Marketing attribution
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;

  // Communication tracking
  confirmationSent: boolean;
  reminderSent: boolean;
  feedbackRequested: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Virtual relations
  event?: any;
  leadMirror?: any;
}

/**
 * @openapi
 * Create registration DTO
 */
export interface CreateRegistrationDto {
  eventId: number;
  leadMirrorId?: number;
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  numberOfGuests?: number;
  specialRequirements?: string;
  notes?: string;
  status?: RegistrationStatus;
  registeredAt?: Date;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

/**
 * @openapi
 * Update registration DTO
 */
export interface UpdateRegistrationDto extends Partial<CreateRegistrationDto> {
  cancelledAt?: Date | null;
  checkedInAt?: Date | null;
  confirmationSent?: boolean;
  reminderSent?: boolean;
  feedbackRequested?: boolean;
}

/**
 * @openapi
 * Registration query options
 */
export interface RegistrationQueryOptions extends AdvancedQueryOptions {
  eventId?: number | number[];
  leadMirrorId?: number | number[];
  status?: RegistrationStatus | RegistrationStatus[];
  email?: string;
  phone?: string;
  company?: string;
  hasCheckedIn?: boolean;
  registeredAfter?: Date;
  registeredBefore?: Date;
  confirmationSent?: boolean;
  reminderSent?: boolean;
}

// ============================================================================
// EVENT REGISTRATION MODEL CLASS
// ============================================================================

/**
 * @openapi
 * Event Registration Model Class
 * 
 * Manages event attendee registrations with comprehensive status tracking,
 * guest management, check-in functionality, and marketing attribution
 * 
 * @class EventRegistrationModel
 * @extends BaseModel<EventRegistration, CreateRegistrationDto, UpdateRegistrationDto>
 */
export class EventRegistrationModel extends BaseModel<
  EventRegistration,
  CreateRegistrationDto,
  UpdateRegistrationDto
> {
  protected tableName = "event_registrations";
  protected primaryKey = "id";

  protected config = {
    softDelete: false, // Registrations are not soft deleted
    timestamps: true,
    defaultSortColumn: "registered_at",
    defaultSortOrder: "desc" as const,
    searchableColumns: ["full_name", "email", "phone", "company"],
    hiddenFields: [],
    fillable: [
      "eventId",
      "leadMirrorId",
      "fullName",
      "email",
      "phone",
      "company",
      "jobTitle",
      "numberOfGuests",
      "specialRequirements",
      "notes",
      "status",
      "registeredAt",
      "cancelledAt",
      "checkedInAt",
      "utmSource",
      "utmMedium",
      "utmCampaign",
      "utmTerm",
      "utmContent",
      "confirmationSent",
      "reminderSent",
      "feedbackRequested",
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
    leadMirror: {
      type: "belongsTo" as const,
      model: () => require("./lead-mirror.model").default,
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
   * Validates and processes registration data before creation:
   * - Validates that associated event exists
   * - Checks if registration is open and deadline hasn't passed
   * - Validates event capacity
   * - Prevents duplicate email registrations for same event
   * - Sets default values for guest count, status, and registration timestamp
   * 
   * @param {CreateRegistrationDto} data - Registration creation data
   * @returns {Promise<CreateRegistrationDto>} Processed data
   * @throws {Error} If validation fails
   */
  protected async beforeCreate(
    data: CreateRegistrationDto
  ): Promise<CreateRegistrationDto> {
    // Check if event exists
    const EventModel = require("./event.model").default;
    const event = await EventModel.findById(data.eventId);

    if (!event) {
      throw new Error(`Event with ID ${data.eventId} not found`);
    }

    // Check if registration is open
    if (!event.isRegistrationOpen) {
      throw new Error("Registration is closed for this event");
    }

    // Check registration deadline
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      throw new Error("Registration deadline has passed");
    }

    // Check capacity
    const numberOfGuests = data.numberOfGuests || 1;
    const hasCapacity = await EventModel.hasAvailableCapacity(
      data.eventId,
      numberOfGuests
    );

    if (!hasCapacity) {
      throw new Error("Event has reached maximum capacity");
    }

    // Check for duplicate registration (same email for same event)
    const existing = await this.findOne({
      eventId: data.eventId,
      email: data.email,
    });

    if (existing) {
      throw new Error("Email already registered for this event");
    }

    // Set defaults
    if (!data.numberOfGuests) {
      data.numberOfGuests = 1;
    }

    if (!data.status) {
      data.status = RegistrationStatus.CONFIRMED;
    }

    if (!data.registeredAt) {
      data.registeredAt = new Date();
    }

    return data;
  }

  /**
   * @openapi
   * afterCreate lifecycle hook
   * 
   * Logs registration creation and triggers post-registration actions
   * 
   * @param {EventRegistration} entity - Created registration entity
   * @returns {Promise<void>}
   */
  protected async afterCreate(entity: EventRegistration): Promise<void> {
    // Event registered count is automatically updated by database trigger
    console.log(
      `✅ Registration created for event ${entity.eventId}: ${entity.fullName}`
    );

    // TODO: Send confirmation email
    // TODO: Create lead mirror if not exists
  }

  /**
   * @openapi
   * beforeUpdate lifecycle hook
   * 
   * Validates and processes registration data before update:
   * - Sets cancellation timestamp when status changes to cancelled
   * - Sets check-in timestamp when marked as attended
   * 
   * @param {number} id - Registration ID
   * @param {UpdateRegistrationDto} data - Registration update data
   * @returns {Promise<UpdateRegistrationDto>} Processed data
   */
  protected async beforeUpdate(
    id: number,
    data: UpdateRegistrationDto
  ): Promise<UpdateRegistrationDto> {
    const registration = await this.findById(id);
    if (!registration) {
      throw new Error("Registration not found");
    }

    // Set cancelled timestamp
    if (
      data.status === RegistrationStatus.CANCELLED &&
      registration.status !== RegistrationStatus.CANCELLED
    ) {
      data.cancelledAt = new Date();
    }

    // Set check-in timestamp
    if (
      data.status === RegistrationStatus.ATTENDED &&
      !registration.checkedInAt
    ) {
      data.checkedInAt = new Date();
    }

    return data;
  }

  /**
   * @openapi
   * afterUpdate lifecycle hook
   * 
   * Logs registration updates and triggers post-update actions
   * 
   * @param {EventRegistration} entity - Updated registration entity
   * @returns {Promise<void>}
   */
  protected async afterUpdate(entity: EventRegistration): Promise<void> {
    // Event counts are automatically updated by database trigger
    console.log(`✅ Registration ${entity.id} updated: ${entity.status}`);
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * @openapi
   * Finds registrations with custom filters
   * 
   * @param {RegistrationQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventRegistration[]>} Array of registrations
   */
  async findRegistrations(
    options: RegistrationQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<EventRegistration[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    // Apply registration-specific filters
    query = this.applyRegistrationFilters(query, options);

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
   * Gets paginated registrations
   * 
   * @param {RegistrationQueryOptions & { page: number; limit: number }} options - Query and pagination options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<PaginatedResult<EventRegistration>>} Paginated result
   */
  async paginateRegistrations(
    options: RegistrationQueryOptions & { page: number; limit: number },
    trx?: Knex.Transaction
  ): Promise<PaginatedResult<EventRegistration>> {
    const { page, limit } = options;

    const [items, total] = await Promise.all([
      this.findRegistrations(options, trx),
      this.countRegistrations(options, trx),
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
   * Counts registrations with filters
   * 
   * @param {RegistrationQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<number>} Count of registrations
   */
  async countRegistrations(
    options: RegistrationQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    query = this.applyRegistrationFilters(query, options);

    const result = await query.count(`${this.primaryKey} as count`).first();
    return result ? Number(result.count) : 0;
  }

  /**
   * @openapi
   * Finds registrations by event
   * 
   * @param {number} eventId - Event identifier
   * @param {RegistrationQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventRegistration[]>} Array of registrations for the event
   */
  async findByEvent(
    eventId: number,
    options: RegistrationQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<EventRegistration[]> {
    return this.findRegistrations({ ...options, eventId }, trx);
  }

  /**
   * @openapi
   * Finds registration by email and event
   * 
   * @param {string} email - Email address
   * @param {number} eventId - Event identifier
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventRegistration | null>} Registration or null
   */
  async findByEmailAndEvent(
    email: string,
    eventId: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration | null> {
    return this.findOne({ email, eventId }, {}, trx);
  }

  /**
   * @openapi
   * Finds confirmed registrations
   * 
   * @param {number} eventId - Event identifier
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventRegistration[]>} Array of confirmed registrations
   */
  async findConfirmed(
    eventId: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration[]> {
    return this.findRegistrations(
      { eventId, status: RegistrationStatus.CONFIRMED },
      trx
    );
  }

  /**
   * @openapi
   * Finds attended registrations
   * 
   * @param {number} eventId - Event identifier
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventRegistration[]>} Array of attended registrations
   */
  async findAttended(
    eventId: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration[]> {
    return this.findRegistrations(
      { eventId, status: RegistrationStatus.ATTENDED },
      trx
    );
  }

  // ============================================================================
  // STATUS MANAGEMENT
  // ============================================================================

  /**
   * @openapi
   * Checks in a registration
   * 
   * @param {number} id - Registration ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventRegistration | null>} Updated registration or null
   */
  async checkIn(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration | null> {
    return this.update(
      id,
      {
        status: RegistrationStatus.ATTENDED,
        checkedInAt: new Date(),
      },
      trx
    );
  }

  /**
   * @openapi
   * Cancels a registration
   * 
   * @param {number} id - Registration ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventRegistration | null>} Updated registration or null
   */
  async cancel(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration | null> {
    return this.update(
      id,
      {
        status: RegistrationStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      trx
    );
  }

  /**
   * @openapi
   * Marks as no-show
   * 
   * @param {number} id - Registration ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventRegistration | null>} Updated registration or null
   */
  async markNoShow(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration | null> {
    return this.update(id, { status: RegistrationStatus.NO_SHOW }, trx);
  }

  /**
   * @openapi
   * Bulk check-in multiple registrations
   * 
   * @param {number[]} ids - Array of registration IDs
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<number>} Number of updated registrations
   */
  async bulkCheckIn(ids: number[], trx?: Knex.Transaction): Promise<number> {
    const connection = trx || this.db;

    const updated = await connection(this.tableName).whereIn("id", ids).update({
      status: RegistrationStatus.ATTENDED,
      checked_in_at: connection.fn.now(),
      updated_at: connection.fn.now(),
    });

    return updated;
  }

  // ============================================================================
  // COMMUNICATION TRACKING
  // ============================================================================

  /**
   * @openapi
   * Marks confirmation as sent
   * 
   * @param {number} id - Registration ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventRegistration | null>} Updated registration or null
   */
  async markConfirmationSent(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration | null> {
    return this.update(id, { confirmationSent: true }, trx);
  }

  /**
   * @openapi
   * Marks reminder as sent
   * 
   * @param {number} id - Registration ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventRegistration | null>} Updated registration or null
   */
  async markReminderSent(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration | null> {
    return this.update(id, { reminderSent: true }, trx);
  }

  /**
   * @openapi
   * Marks feedback request as sent
   * 
   * @param {number} id - Registration ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventRegistration | null>} Updated registration or null
   */
  async markFeedbackRequested(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration | null> {
    return this.update(id, { feedbackRequested: true }, trx);
  }

  /**
   * @openapi
   * Gets registrations needing confirmation emails
   * 
   * @param {number} [eventId] - Optional event ID filter
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventRegistration[]>} Array of registrations needing confirmation
   */
  async getNeedingConfirmation(
    eventId?: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration[]> {
    return this.findRegistrations(
      {
        ...(eventId && { eventId }),
        status: RegistrationStatus.CONFIRMED,
        confirmationSent: false,
      },
      trx
    );
  }

  /**
   * @openapi
   * Gets registrations needing reminder emails
   * 
   * @param {number} [eventId] - Optional event ID filter
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EventRegistration[]>} Array of registrations needing reminders
   */
  async getNeedingReminder(
    eventId?: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration[]> {
    return this.findRegistrations(
      {
        ...(eventId && { eventId }),
        status: RegistrationStatus.CONFIRMED,
        reminderSent: false,
      },
      trx
    );
  }

  // ============================================================================
  // STATISTICS METHODS
  // ============================================================================

  /**
   * @openapi
   * Gets registration statistics for an event
   * 
   * @param {number} eventId - Event identifier
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<RegistrationStatistics>} Comprehensive statistics object
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
          "COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending"
        ),
        connection.raw(
          "COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled"
        ),
        connection.raw(
          "COUNT(CASE WHEN status = 'attended' THEN 1 END) as attended"
        ),
        connection.raw(
          "COUNT(CASE WHEN status = 'no_show' THEN 1 END) as noShow"
        ),
        connection.raw("SUM(number_of_guests) as totalGuests"),
        connection.raw(
          "COUNT(CASE WHEN checked_in_at IS NOT NULL THEN 1 END) as checkedIn"
        )
      );

    return {
      total: Number(stats.total),
      confirmed: Number(stats.confirmed),
      pending: Number(stats.pending),
      cancelled: Number(stats.cancelled),
      attended: Number(stats.attended),
      noShow: Number(stats.noShow),
      totalGuests: Number(stats.totalGuests),
      checkedIn: Number(stats.checkedIn),
      attendanceRate:
        Number(stats.confirmed) > 0
          ? (Number(stats.attended) / Number(stats.confirmed)) * 100
          : 0,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * @openapi
   * Applies registration-specific filters to query
   * 
   * @param {Knex.QueryBuilder} query - Database query builder
   * @param {RegistrationQueryOptions} options - Query options
   * @returns {Knex.QueryBuilder} Modified query builder
   */
  private applyRegistrationFilters(
    query: Knex.QueryBuilder,
    options: RegistrationQueryOptions
  ): Knex.QueryBuilder {
    // Event filter
    if (options.eventId) {
      if (Array.isArray(options.eventId)) {
        query = query.whereIn("event_id", options.eventId);
      } else {
        query = query.where("event_id", options.eventId);
      }
    }

    // Lead mirror filter
    if (options.leadMirrorId) {
      if (Array.isArray(options.leadMirrorId)) {
        query = query.whereIn("lead_mirror_id", options.leadMirrorId);
      } else {
        query = query.where("lead_mirror_id", options.leadMirrorId);
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

    // Email filter
    if (options.email) {
      query = query.where("email", "like", `%${options.email}%`);
    }

    // Phone filter
    if (options.phone) {
      query = query.where("phone", "like", `%${options.phone}%`);
    }

    // Company filter
    if (options.company) {
      query = query.where("company", "like", `%${options.company}%`);
    }

    // Check-in filter
    if (options.hasCheckedIn !== undefined) {
      if (options.hasCheckedIn) {
        query = query.whereNotNull("checked_in_at");
      } else {
        query = query.whereNull("checked_in_at");
      }
    }

    // Date range
    if (options.registeredAfter) {
      query = query.where("registered_at", ">=", options.registeredAfter);
    }
    if (options.registeredBefore) {
      query = query.where("registered_at", "<=", options.registeredBefore);
    }

    // Communication tracking
    if (options.confirmationSent !== undefined) {
      query = query.where("confirmation_sent", options.confirmationSent);
    }
    if (options.reminderSent !== undefined) {
      query = query.where("reminder_sent", options.reminderSent);
    }

    return query;
  }

  /**
   * @openapi
   * Maps database record to EventRegistration entity
   * 
   * @param {DatabaseRecord} record - Database record
   * @returns {EventRegistration} EventRegistration entity
   */
  protected mapToEntity(record: DatabaseRecord): EventRegistration {
    return {
      id: record.id,
      eventId: record.event_id,
      leadMirrorId: record.lead_mirror_id,
      fullName: record.full_name,
      email: record.email,
      phone: record.phone,
      company: record.company,
      jobTitle: record.job_title,
      numberOfGuests: record.number_of_guests || 1,
      specialRequirements: record.special_requirements,
      notes: record.notes,
      status: record.status as RegistrationStatus,
      registeredAt: new Date(record.registered_at),
      cancelledAt: record.cancelled_at ? new Date(record.cancelled_at) : null,
      checkedInAt: record.checked_in_at ? new Date(record.checked_in_at) : null,
      utmSource: record.utm_source,
      utmMedium: record.utm_medium,
      utmCampaign: record.utm_campaign,
      utmTerm: record.utm_term,
      utmContent: record.utm_content,
      confirmationSent: Boolean(record.confirmation_sent),
      reminderSent: Boolean(record.reminder_sent),
      feedbackRequested: Boolean(record.feedback_requested),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

// Export singleton instance
export default new EventRegistrationModel();