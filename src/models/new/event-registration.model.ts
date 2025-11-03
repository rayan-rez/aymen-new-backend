/**
 * Event Registration Model
 *
 * Manages event attendee registrations with status tracking
 * Handles guest counts, check-ins, and marketing attribution
 *
 * @module models/event-registration.model
 */

import { BaseModel, AdvancedQueryOptions, PaginatedResult, DatabaseRecord } from "../base";
import { Knex } from "knex";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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
   * Before create hook - validate and check capacity
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
   * After create hook - update event registered count
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
   * Before update hook - validate status changes
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
   * After update hook - update event counts
   */
  protected async afterUpdate(entity: EventRegistration): Promise<void> {
    // Event counts are automatically updated by database trigger
    console.log(`✅ Registration ${entity.id} updated: ${entity.status}`);
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Finds registrations with custom filters
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
   * Gets paginated registrations
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
   * Counts registrations with filters
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
   * Finds registrations by event
   */
  async findByEvent(
    eventId: number,
    options: RegistrationQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<EventRegistration[]> {
    return this.findRegistrations({ ...options, eventId }, trx);
  }

  /**
   * Finds registration by email and event
   */
  async findByEmailAndEvent(
    email: string,
    eventId: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration | null> {
    return this.findOne({ email, eventId }, {}, trx);
  }

  /**
   * Finds confirmed registrations
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
   * Finds attended registrations
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
   * Checks in a registration
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
   * Cancels a registration
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
   * Marks as no-show
   */
  async markNoShow(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration | null> {
    return this.update(id, { status: RegistrationStatus.NO_SHOW }, trx);
  }

  /**
   * Bulk check-in
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
   * Marks confirmation as sent
   */
  async markConfirmationSent(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration | null> {
    return this.update(id, { confirmationSent: true }, trx);
  }

  /**
   * Marks reminder as sent
   */
  async markReminderSent(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration | null> {
    return this.update(id, { reminderSent: true }, trx);
  }

  /**
   * Marks feedback request as sent
   */
  async markFeedbackRequested(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventRegistration | null> {
    return this.update(id, { feedbackRequested: true }, trx);
  }

  /**
   * Gets registrations needing confirmation
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
   * Gets registrations needing reminder
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
   * Gets registration statistics for an event
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
   * Applies registration-specific filters to query
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
   * Maps database record to EventRegistration entity
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
