/**
 * Event Model
 *
 * Manages company events, exhibitions, open houses, and promotional activities
 * Handles registration tracking, capacity management, and influencer associations
 *
 * @module models/event.model
 */

import { BaseModel, AdvancedQueryOptions, PaginatedResult } from "../base";
import { Knex } from "knex";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Event type enumeration
 */
export enum EventType {
  EXHIBITION = "exhibition",
  OPEN_HOUSE = "open_house",
  WORKSHOP = "workshop",
  SEMINAR = "seminar",
  LAUNCH_EVENT = "launch_event",
  TRADE_SHOW = "trade_show",
  WEBINAR = "webinar",
  OTHER = "other",
}

/**
 * Location type enumeration
 */
export enum EventsLocationType {
  PHYSICAL = "physical",
  ONLINE = "online",
  HYBRID = "hybrid",
}

/**
 * Event status enumeration
 */
export enum EventStatus {
  DRAFT = "draft",
  SCHEDULED = "scheduled",
  ONGOING = "ongoing",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  POSTPONED = "postponed",
}

/**
 * Event entity interface
 */
export interface Event {
  id: number;
  name: string;
  slug: string;
  eventType: EventType;
  description: string;
  shortDescription: string | null;
  translations: Record<string, any> | null;

  // Scheduling
  startDate: Date;
  endDate: Date;
  timezone: string;

  // Location
  locationType: EventsLocationType;
  venueName: string | null;
  venueAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  locationId: number | null;
  onlineMeetingUrl: string | null;
  onlineMeetingPlatform: string | null;

  // Capacity & Registration
  maxCapacity: number | null;
  registeredCount: number;
  requiresRegistration: boolean;
  isRegistrationOpen: boolean;
  registrationDeadline: Date | null;

  // Project Association
  projectId: number | null;

  // Status
  status: EventStatus;

  // Media
  featuredImageUrl: string | null;
  bannerImageUrl: string | null;

  // Organizer
  organizerName: string | null;
  email: string | null;
  organizerPhone: string | null;

  // Publishing
  isFeatured: boolean;
  isPublished: boolean;
  publishedAt: Date | null;

  // SEO
  metaTitle: string | null;
  metaDescription: string | null;

  // Analytics
  viewCount: number;
  clickCount: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Virtual relations
  location?: any;
  project?: any;
  registrations?: any[];
  influencers?: any[];
}

/**
 * Create event DTO
 */
export interface CreateEventDto {
  name: string;
  slug?: string;
  eventType: EventType;
  description: string;
  shortDescription?: string;
  translations?: Record<string, any>;
  startDate: Date;
  endDate: Date;
  timezone?: string;
  locationType: EventsLocationType;
  venueName?: string;
  venueAddress?: string;
  latitude?: number;
  longitude?: number;
  locationId?: number;
  onlineMeetingUrl?: string;
  onlineMeetingPlatform?: string;
  maxCapacity?: number;
  requiresRegistration?: boolean;
  isRegistrationOpen?: boolean;
  registrationDeadline?: Date;
  projectId?: number;
  status?: EventStatus;
  featuredImageUrl?: string;
  bannerImageUrl?: string;
  organizerName?: string;
  email?: string;
  organizerPhone?: string;
  isFeatured?: boolean;
  isPublished?: boolean;
  publishedAt?: Date;
  metaTitle?: string;
  metaDescription?: string;
}

/**
 * Update event DTO
 */
export interface UpdateEventDto extends Partial<CreateEventDto> {}

/**
 * Event query options
 */
export interface EventQueryOptions extends AdvancedQueryOptions {
  eventType?: EventType | EventType[];
  status?: EventStatus | EventStatus[];
  locationType?: EventsLocationType | EventsLocationType[];
  isFeatured?: boolean;
  isPublished?: boolean;
  locationId?: number | number[];
  projectId?: number | number[];
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  isRegistrationOpen?: boolean;
  hasCapacity?: boolean;
  isUpcoming?: boolean;
  isPast?: boolean;
}

/**
 * Event with statistics
 */
export interface EventWithStats extends Event {
  stats: {
    totalRegistrations: number;
    confirmedRegistrations: number;
    attendedCount: number;
    noShowCount: number;
    attendanceRate: number;
    capacityPercentage: number;
    influencerCount: number;
    totalReach: number;
  };
}

// ============================================================================
// EVENT MODEL CLASS
// ============================================================================

export class EventModel extends BaseModel<Event, CreateEventDto, UpdateEventDto> {
  protected tableName = "events";
  protected primaryKey = "id";

  protected config = {
    softDelete: true,
    timestamps: true,
    defaultSortColumn: "start_date",
    defaultSortOrder: "desc" as const,
    searchableColumns: ["name", "description", "venue_name", "venue_address"],
    hiddenFields: [],
    fillable: [
      "name",
      "slug",
      "eventType",
      "description",
      "shortDescription",
      "translations",
      "startDate",
      "endDate",
      "timezone",
      "locationType",
      "venueName",
      "venueAddress",
      "latitude",
      "longitude",
      "locationId",
      "onlineMeetingUrl",
      "onlineMeetingPlatform",
      "maxCapacity",
      "registeredCount",
      "requiresRegistration",
      "isRegistrationOpen",
      "registrationDeadline",
      "projectId",
      "status",
      "featuredImageUrl",
      "bannerImageUrl",
      "organizerName",
      "email",
      "organizerPhone",
      "isFeatured",
      "isPublished",
      "publishedAt",
      "metaTitle",
      "metaDescription",
      "viewCount",
      "clickCount",
    ],
    guarded: ["id", "createdAt", "updatedAt", "deletedAt"],
  };

  // Define relations
  protected relations = {
    location: {
      type: "belongsTo" as const,
      model: () => require("./location.model").default,
      foreignKey: "locationId",
      localKey: "id",
    },
    project: {
      type: "belongsTo" as const,
      model: () => require("./project.model").default,
      foreignKey: "projectId",
      localKey: "id",
    },
    registrations: {
      type: "hasMany" as const,
      model: () => require("./event-registration.model").default,
      foreignKey: "eventId",
      localKey: "id",
    },
    influencers: {
      type: "hasMany" as const,
      model: () => require("./event-influencer.model").default,
      foreignKey: "eventId",
      localKey: "id",
    },
  };

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Before create hook - validate and generate slug
   */
  protected async beforeCreate(data: CreateEventDto): Promise<CreateEventDto> {
    // Generate slug if not provided
    if (!data.slug) {
      data.slug = this.generateSlug(data.name);
    }

    // Validate slug uniqueness
    const existing = await this.findBySlug(data.slug);
    if (existing) {
      data.slug = `${data.slug}-${Date.now()}`;
    }

    // Validate dates
    if (data.endDate <= data.startDate) {
      throw new Error("End date must be after start date");
    }

    // Validate registration deadline
    if (data.registrationDeadline && data.registrationDeadline > data.startDate) {
      throw new Error("Registration deadline must be before event start date");
    }

    // Validate coordinates
    if (data.latitude !== undefined || data.longitude !== undefined) {
      this.validateCoordinates(data.latitude, data.longitude);
    }

    // Set default timezone
    if (!data.timezone) {
      data.timezone = "Africa/Algiers";
    }

    // Set default status
    if (!data.status) {
      data.status = EventStatus.DRAFT;
    }

    // Validate location type requirements
    if (data.locationType === EventsLocationType.PHYSICAL || data.locationType === EventsLocationType.HYBRID) {
      if (!data.venueName || !data.venueAddress) {
        throw new Error("Physical/Hybrid events require venue name and address");
      }
    }

    if (data.locationType === EventsLocationType.ONLINE || data.locationType === EventsLocationType.HYBRID) {
      if (!data.onlineMeetingUrl) {
        throw new Error("Online/Hybrid events require meeting URL");
      }
    }

    return data;
  }

  /**
   * After create hook
   */
  protected async afterCreate(entity: Event): Promise<void> {
    console.log(`✅ Event created: ${entity.name} (${entity.eventType})`);
  }

  /**
   * Before update hook
   */
  protected async beforeUpdate(
    id: number,
    data: UpdateEventDto
  ): Promise<UpdateEventDto> {
    const event = await this.findById(id);
    if (!event) {
      throw new Error("Event not found");
    }

    // Validate dates if changing
    if (data.startDate || data.endDate) {
      const startDate = data.startDate || event.startDate;
      const endDate = data.endDate || event.endDate;

      if (endDate <= startDate) {
        throw new Error("End date must be after start date");
      }
    }

    // Validate coordinates if changing
    if (data.latitude !== undefined || data.longitude !== undefined) {
      this.validateCoordinates(data.latitude, data.longitude);
    }

    // Validate slug uniqueness if changing
    if (data.slug && data.slug !== event.slug) {
      const existing = await this.findBySlug(data.slug);
      if (existing && existing.id !== id) {
        throw new Error(`Event slug "${data.slug}" already exists`);
      }
    }

    return data;
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Finds events with custom filters
   */
  async findEvents(
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Event[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    // Apply event-specific filters
    query = this.applyEventFilters(query, options);

    const records = await query;
    let entities = records.map((r: any) => this.mapToEntity(r));

    // Load relations if requested
    if (options.relations && options.relations.length > 0) {
      entities = await this.loadRelationsForMany(entities, options.relations, trx);
    }

    return entities;
  }

  /**
   * Gets paginated events
   */
  async paginateEvents(
    options: EventQueryOptions & { page: number; limit: number },
    trx?: Knex.Transaction
  ): Promise<PaginatedResult<Event>> {
    const { page, limit } = options;

    const [items, total] = await Promise.all([
      this.findEvents(options, trx),
      this.countEvents(options, trx),
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
   * Counts events with filters
   */
  async countEvents(
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    if (!options.includeDeleted && this.config.softDelete) {
      query = query.whereNull("deleted_at");
    }

    query = this.applyEventFilters(query, options);

    const result = await query.count(`${this.primaryKey} as count`).first();
    return result ? Number(result.count) : 0;
  }

  /**
   * Finds event by slug
   */
  async findBySlug(
    slug: string,
    options: { includeDeleted?: boolean; relations?: string[] } = {},
    trx?: Knex.Transaction
  ): Promise<Event | null> {
    return this.findOne({ slug }, options, trx);
  }

  /**
   * Finds upcoming events
   */
  async findUpcoming(
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Event[]> {
    return this.findEvents(
      {
        ...options,
        isUpcoming: true,
        isPublished: true,
        sortBy: "start_date",
        sortOrder: "asc",
      },
      trx
    );
  }

  /**
   * Finds past events
   */
  async findPast(
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Event[]> {
    return this.findEvents(
      {
        ...options,
        isPast: true,
        isPublished: true,
        sortBy: "start_date",
        sortOrder: "desc",
      },
      trx
    );
  }

  /**
   * Finds featured events
   */
  async findFeatured(
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Event[]> {
    return this.findEvents(
      {
        ...options,
        isFeatured: true,
        isPublished: true,
      },
      trx
    );
  }

  /**
   * Finds events with available capacity
   */
  async findWithCapacity(
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Event[]> {
    return this.findEvents(
      {
        ...options,
        hasCapacity: true,
        isRegistrationOpen: true,
        isPublished: true,
      },
      trx
    );
  }

  /**
   * Finds events by type
   */
  async findByType(
    eventType: EventType,
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Event[]> {
    return this.findEvents({ ...options, eventType }, trx);
  }

  /**
   * Finds events by project
   */
  async findByProject(
    projectId: number,
    options: EventQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Event[]> {
    return this.findEvents({ ...options, projectId }, trx);
  }

  // ============================================================================
  // CAPACITY & REGISTRATION MANAGEMENT
  // ============================================================================

  /**
   * Checks if event has available capacity
   */
  async hasAvailableCapacity(
    id: number,
    guestCount: number = 1,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const event = await this.findById(id, {}, trx);
    if (!event) return false;

    if (!event.maxCapacity) return true; // Unlimited capacity

    return event.registeredCount + guestCount <= event.maxCapacity;
  }

  /**
   * Updates registered count (called by triggers)
   */
  async updateRegisteredCount(
    id: number,
    trx?: Knex.Transaction
  ): Promise<Event | null> {
    const connection = trx || this.db;

    const [count] = await connection("event_registrations")
      .where({ event_id: id, status: "confirmed" })
      .sum("number_of_guests as total");

    const registeredCount = Number(count.total) || 0;

    return this.update(id, { registeredCount } as UpdateEventDto, trx);
  }

  /**
   * Opens registration
   */
  async openRegistration(
    id: number,
    trx?: Knex.Transaction
  ): Promise<Event | null> {
    return this.update(id, { isRegistrationOpen: true } as UpdateEventDto, trx);
  }

  /**
   * Closes registration
   */
  async closeRegistration(
    id: number,
    trx?: Knex.Transaction
  ): Promise<Event | null> {
    return this.update(id, { isRegistrationOpen: false } as UpdateEventDto, trx);
  }

  // ============================================================================
  // STATUS MANAGEMENT
  // ============================================================================

  /**
   * Updates event status
   */
  async updateStatus(
    id: number,
    status: EventStatus,
    trx?: Knex.Transaction
  ): Promise<Event | null> {
    return this.update(id, { status } as UpdateEventDto, trx);
  }

  /**
   * Publishes event
   */
  async publish(id: number, trx?: Knex.Transaction): Promise<Event | null> {
    return this.update(
      id,
      { isPublished: true, publishedAt: new Date() } as UpdateEventDto,
      trx
    );
  }

  /**
   * Unpublishes event
   */
  async unpublish(id: number, trx?: Knex.Transaction): Promise<Event | null> {
    return this.update(id, { isPublished: false } as UpdateEventDto, trx);
  }

  // ============================================================================
  // STATISTICS METHODS
  // ============================================================================

  /**
   * Gets event with statistics
   */
  async getWithStats(
    id: number,
    trx?: Knex.Transaction
  ): Promise<EventWithStats | null> {
    const event = await this.findById(id, {}, trx);
    if (!event) return null;

    const stats = await this.getEventStats(id, trx);

    return {
      ...event,
      stats,
    };
  }

  /**
   * Gets event statistics
   */
  async getEventStats(
    eventId: number,
    trx?: Knex.Transaction
  ): Promise<EventWithStats["stats"]> {
    const connection = trx || this.db;

    // Get registration statistics
    const [regStats] = await connection("event_registrations")
      .where({ event_id: eventId })
      .select(
        connection.raw("COUNT(*) as total"),
        connection.raw("COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed"),
        connection.raw("COUNT(CASE WHEN status = 'attended' THEN 1 END) as attended"),
        connection.raw("COUNT(CASE WHEN status = 'no_show' THEN 1 END) as noShow"),
        connection.raw("SUM(number_of_guests) as totalGuests")
      );

    const totalRegistrations = Number(regStats?.total || 0);
    const confirmedRegistrations = Number(regStats?.confirmed || 0);
    const attendedCount = Number(regStats?.attended || 0);
    const noShowCount = Number(regStats?.noShow || 0);
    const attendanceRate =
      confirmedRegistrations > 0
        ? (attendedCount / confirmedRegistrations) * 100
        : 0;

    // Get event capacity
    const event = await this.findById(eventId, {}, trx);
    const capacityPercentage =
      event && event.maxCapacity
        ? (event.registeredCount / event.maxCapacity) * 100
        : 0;

    // Get influencer statistics
    const [influencerStats] = await connection("event_influencers")
      .where({ event_id: eventId })
      .select(
        connection.raw("COUNT(*) as count"),
        connection.raw("SUM(reach_achieved) as totalReach")
      );

    return {
      totalRegistrations,
      confirmedRegistrations,
      attendedCount,
      noShowCount,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      capacityPercentage: Math.round(capacityPercentage * 100) / 100,
      influencerCount: Number(influencerStats?.count || 0),
      totalReach: Number(influencerStats?.totalReach || 0),
    };
  }

  // ============================================================================
  // ANALYTICS METHODS
  // ============================================================================

  /**
   * Increments view count
   */
  async incrementViewCount(
    id: number,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || this.db;

    const updated = await connection(this.tableName)
      .where({ id })
      .increment("view_count", 1);

    return updated > 0;
  }

  /**
   * Increments click count
   */
  async incrementClickCount(
    id: number,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || this.db;

    const updated = await connection(this.tableName)
      .where({ id })
      .increment("click_count", 1);

    return updated > 0;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Applies event-specific filters to query
   */
  private applyEventFilters(
    query: Knex.QueryBuilder,
    options: EventQueryOptions
  ): Knex.QueryBuilder {
    // Event type filter
    if (options.eventType) {
      if (Array.isArray(options.eventType)) {
        query = query.whereIn("event_type", options.eventType);
      } else {
        query = query.where("event_type", options.eventType);
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

    // Location type filter
    if (options.locationType) {
      if (Array.isArray(options.locationType)) {
        query = query.whereIn("location_type", options.locationType);
      } else {
        query = query.where("location_type", options.locationType);
      }
    }

    // Featured filter
    if (options.isFeatured !== undefined) {
      query = query.where("is_featured", options.isFeatured);
    }

    // Published filter
    if (options.isPublished !== undefined) {
      query = query.where("is_published", options.isPublished);
    }

    // Location filter
    if (options.locationId) {
      if (Array.isArray(options.locationId)) {
        query = query.whereIn("location_id", options.locationId);
      } else {
        query = query.where("location_id", options.locationId);
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

    // Date range filters
    if (options.startDateFrom) {
      query = query.where("start_date", ">=", options.startDateFrom);
    }
    if (options.startDateTo) {
      query = query.where("start_date", "<=", options.startDateTo);
    }
    if (options.endDateFrom) {
      query = query.where("end_date", ">=", options.endDateFrom);
    }
    if (options.endDateTo) {
      query = query.where("end_date", "<=", options.endDateTo);
    }

    // Registration open filter
    if (options.isRegistrationOpen !== undefined) {
      query = query.where("is_registration_open", options.isRegistrationOpen);
    }

    // Has capacity filter
    if (options.hasCapacity) {
      query = query.whereRaw("max_capacity IS NULL OR registered_count < max_capacity");
    }

    // Upcoming events filter
    if (options.isUpcoming) {
      query = query.where("start_date", ">", this.db.fn.now());
    }

    // Past events filter
    if (options.isPast) {
      query = query.where("end_date", "<", this.db.fn.now());
    }

    return query;
  }

  /**
   * Validates coordinates
   */
  private validateCoordinates(
    latitude?: number | null,
    longitude?: number | null
  ): void {
    if (latitude !== null && latitude !== undefined) {
      if (latitude < -90 || latitude > 90) {
        throw new Error("Latitude must be between -90 and 90");
      }
    }

    if (longitude !== null && longitude !== undefined) {
      if (longitude < -180 || longitude > 180) {
        throw new Error("Longitude must be between -180 and 180");
      }
    }
  }

  /**
   * Generates URL-friendly slug from text
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Maps database record to Event entity
   */
  protected mapToEntity(record: any): Event {
    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      eventType: record.event_type as EventType,
      description: record.description,
      shortDescription: record.short_description,
      translations: this.parseJson(record.translations),
      startDate: new Date(record.start_date),
      endDate: new Date(record.end_date),
      timezone: record.timezone,
      locationType: record.location_type as EventsLocationType,
      venueName: record.venue_name,
      venueAddress: record.venue_address,
      latitude: record.latitude ? Number(record.latitude) : null,
      longitude: record.longitude ? Number(record.longitude) : null,
      locationId: record.location_id,
      onlineMeetingUrl: record.online_meeting_url,
      onlineMeetingPlatform: record.online_meeting_platform,
      maxCapacity: record.max_capacity,
      registeredCount: record.registered_count || 0,
      requiresRegistration: Boolean(record.requires_registration),
      isRegistrationOpen: Boolean(record.is_registration_open),
      registrationDeadline: record.registration_deadline
        ? new Date(record.registration_deadline)
        : null,
      projectId: record.project_id,
      status: record.status as EventStatus,
      featuredImageUrl: record.featured_image_url,
      bannerImageUrl: record.banner_image_url,
      organizerName: record.organizer_name,
      email: record.email,
      organizerPhone: record.organizer_phone,
      isFeatured: Boolean(record.is_featured),
      isPublished: Boolean(record.is_published),
      publishedAt: record.published_at ? new Date(record.published_at) : null,
      metaTitle: record.meta_title,
      metaDescription: record.meta_description,
      viewCount: record.view_count || 0,
      clickCount: record.click_count || 0,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

// Export singleton instance
export default new EventModel();