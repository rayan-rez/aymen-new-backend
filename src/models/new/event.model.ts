/**
 * Event Model
 * Represents company events, exhibitions, open houses, and promotional activities
 * Manages event scheduling, capacity, and registration workflow
 *
 * @module models/event.model
 */

import { BaseModel, BaseQueryParams } from "../base";

/**
 * Event type enumeration
 * Defines the category of event
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
 * Event location type enumeration
 * Defines whether event is physical, online, or hybrid
 */
export enum EventLocationType {
  PHYSICAL = "physical",
  ONLINE = "online",
  HYBRID = "hybrid",
}

/**
 * Event status enumeration
 * Defines the lifecycle state of an event
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
 * Represents a company event or promotional activity
 */
export interface Event {
  /** Unique identifier */
  id: number;

  /** Event name */
  name: string;

  /** URL-friendly slug */
  slug: string;

  /** Event type */
  eventType: EventType;

  /** Full event description */
  description: string;

  /** Short description/summary */
  shortDescription: string | null;

  /** Multi-language translations - JSON object with language codes as keys */
  // Example: { "en": "Real Estate Expo 2025", "fr": "Salon de l'immobilier 2025", "ar": "معرض العقارات 2025" }
  translations: Record<string, any> | null;

  /** Event start date and time */
  startDate: Date;

  /** Event end date and time */
  endDate: Date;

  /** Timezone */
  timezone: string;

  /** Location type */
  locationType: EventLocationType;

  /** Venue name (for physical events) */
  venueName: string | null;

  /** Venue address (for physical events) */
  venueAddress: string | null;

  /** Latitude coordinate */
  latitude: number | null;

  /** Longitude coordinate */
  longitude: number | null;

  /** Location ID reference */
  locationId: number | null;

  /** Online meeting URL (for online/hybrid events) */
  onlineMeetingUrl: string | null;

  /** Online meeting platform (Zoom, Teams, etc.) */
  onlineMeetingPlatform: string | null;

  /** Maximum capacity */
  maxCapacity: number | null;

  /** Current registered count */
  registeredCount: number;

  /** Whether registration is required */
  requiresRegistration: boolean;

  /** Whether registration is open */
  isRegistrationOpen: boolean;

  /** Registration deadline */
  registrationDeadline: Date | null;

  /** Associated project ID */
  projectId: number | null;

  /** Event status */
  status: EventStatus;

  /** Featured image URL */
  featuredImageUrl: string | null;

  /** Banner image URL */
  bannerImageUrl: string | null;

  /** Organizer name */
  organizerName: string | null;

  /** Organizer email */
  email: string | null;

  /** Organizer phone */
  organizerPhone: string | null;

  /** Whether event is featured */
  isFeatured: boolean;

  /** Whether event is published */
  isPublished: boolean;

  /** Publication timestamp */
  publishedAt: Date | null;

  /** SEO meta title */
  metaTitle: string | null;

  /** SEO meta description */
  metaDescription: string | null;

  /** View count */
  viewCount: number;

  /** Click count */
  clickCount: number;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** Soft delete timestamp */
  deletedAt: Date | null;
}

/**
 * Create event DTO
 */
export interface CreateEventDto {
  name: string;
  slug: string;
  eventType: EventType;
  description: string;
  shortDescription?: string | null;
  translations?: Record<string, any> | null;
  startDate: Date;
  endDate: Date;
  timezone?: string;
  locationType?: EventLocationType;
  venueName?: string | null;
  venueAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationId?: number | null;
  onlineMeetingUrl?: string | null;
  onlineMeetingPlatform?: string | null;
  maxCapacity?: number | null;
  requiresRegistration?: boolean;
  isRegistrationOpen?: boolean;
  registrationDeadline?: Date | null;
  projectId?: number | null;
  status?: EventStatus;
  featuredImageUrl?: string | null;
  bannerImageUrl?: string | null;
  organizerName?: string | null;
  email?: string | null;
  organizerPhone?: string | null;
  isFeatured?: boolean;
  isPublished?: boolean;
  publishedAt?: Date | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

/**
 * Update event DTO
 */
export interface UpdateEventDto extends Partial<CreateEventDto> {}

/**
 * Event query parameters
 */
export interface EventQueryParams extends BaseQueryParams {
  eventType?: EventType;
  status?: EventStatus;
  locationType?: EventLocationType;
  projectId?: number;
  locationId?: number;
  isFeatured?: boolean;
  isPublished?: boolean;
  requiresRegistration?: boolean;
  isUpcoming?: boolean;
  isPast?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  includeDeleted?: boolean;
}

/**
 * Event with relations
 */
export interface EventWithRelations extends Event {
  registrations?: any[];
  project?: any;
  location?: any;
}

/**
 * Event Model class
 * Handles all database operations for events
 */
class EventModel extends BaseModel<Event, CreateEventDto, UpdateEventDto> {
  protected tableName = "events";

  /**
   * Finds an event by slug
   */
  async findBySlug(
    slug: string,
    includeDeleted: boolean = false
  ): Promise<Event | null> {
    let query = this.db(this.tableName).where({ slug });

    if (!includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    const record = await query.first();
    return record ? this.mapToEntity(record) : null;
  }

  /**
   * Finds all events matching query parameters
   */
  async findAll(params: EventQueryParams = {}): Promise<Event[]> {
    let query = this.db(this.tableName);

    if (!params.includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    if (params.eventType) {
      query = query.where({ event_type: params.eventType });
    }

    if (params.status) {
      query = query.where({ status: params.status });
    }

    if (params.locationType) {
      query = query.where({ location_type: params.locationType });
    }

    if (params.projectId !== undefined) {
      query = query.where({ project_id: params.projectId });
    }

    if (params.locationId !== undefined) {
      query = query.where({ location_id: params.locationId });
    }

    if (params.isFeatured !== undefined) {
      query = query.where({ is_featured: params.isFeatured });
    }

    if (params.isPublished !== undefined) {
      query = query.where({ is_published: params.isPublished });
    }

    if (params.requiresRegistration !== undefined) {
      query = query.where({ requires_registration: params.requiresRegistration });
    }

    if (params.isUpcoming) {
      query = query.where("start_date", ">=", new Date()).where({
        status: EventStatus.SCHEDULED,
      });
    }

    if (params.isPast) {
      query = query.where("end_date", "<", new Date());
    }

    if (params.dateFrom) {
      query = query.where("start_date", ">=", params.dateFrom);
    }

    if (params.dateTo) {
      query = query.where("start_date", "<=", params.dateTo);
    }

    if (params.sortBy) {
      query = query.orderBy(params.sortBy, params.sortOrder || "asc");
    } else {
      query = query.orderBy("start_date", "asc");
    }

    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const events = await query;
    return events.map(this.mapToEntity);
  }

  /**
   * Gets upcoming events
   */
  async getUpcoming(limit?: number): Promise<Event[]> {
    let query = this.db(this.tableName)
      .where({ is_published: true })
      .whereNull("deleted_at")
      .where("start_date", ">=", new Date())
      .whereIn("status", [EventStatus.SCHEDULED, EventStatus.ONGOING])
      .orderBy("start_date", "asc");

    if (limit) {
      query = query.limit(limit);
    }

    const events = await query;
    return events.map(this.mapToEntity);
  }

  /**
   * Gets featured events
   */
  async getFeatured(limit?: number): Promise<Event[]> {
    let query = this.db(this.tableName)
      .where({ is_featured: true, is_published: true })
      .whereNull("deleted_at")
      .orderBy("start_date", "asc");

    if (limit) {
      query = query.limit(limit);
    }

    const events = await query;
    return events.map(this.mapToEntity);
  }

  /**
   * Gets events by type
   */
  async getByType(eventType: EventType): Promise<Event[]> {
    return this.findAll({ eventType, isPublished: true });
  }

  /**
   * Gets events by project
   */
  async getByProject(projectId: number): Promise<Event[]> {
    return this.findAll({ projectId, isPublished: true });
  }

  /**
   * Gets event with registrations
   */
  async getWithRegistrations(eventId: number): Promise<EventWithRelations | null> {
    const event = await this.findById(eventId);
    if (!event) return null;

    const registrations = await this.db("event_registrations")
      .where({ event_id: eventId })
      .orderBy("created_at", "desc");

    return { ...event, registrations };
  }

  /**
   * Increments registration count
   */
  async incrementRegistrationCount(eventId: number): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id: eventId })
      .increment("registered_count", 1);

    return updated > 0;
  }

  /**
   * Decrements registration count
   */
  async decrementRegistrationCount(eventId: number): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id: eventId })
      .where("registered_count", ">", 0)
      .decrement("registered_count", 1);

    return updated > 0;
  }

  /**
   * Checks if event has available capacity
   */
  async hasAvailableCapacity(eventId: number): Promise<boolean> {
    const event = await this.findById(eventId);
    if (!event) return false;

    if (!event.maxCapacity) return true; // Unlimited capacity

    return event.registeredCount < event.maxCapacity;
  }

  /**
   * Publishes an event
   */
  async publish(eventId: number): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id: eventId }).update({
      is_published: true,
      published_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Unpublishes an event
   */
  async unpublish(eventId: number): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id: eventId }).update({
      is_published: false,
      published_at: null,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Updates event status
   */
  async updateStatus(eventId: number, status: EventStatus): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id: eventId }).update({
      status,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Increments view count
   */
  async incrementViewCount(eventId: number): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id: eventId })
      .increment("view_count", 1);

    return updated > 0;
  }

  /**
   * Increments click count
   */
  async incrementClickCount(eventId: number): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id: eventId })
      .increment("click_count", 1);

    return updated > 0;
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
      translations: record.translations ? JSON.parse(record.translations) : null,
      startDate: new Date(record.start_date),
      endDate: new Date(record.end_date),
      timezone: record.timezone,
      locationType: record.location_type as EventLocationType,
      venueName: record.venue_name,
      venueAddress: record.venue_address,
      latitude: record.latitude ? parseFloat(record.latitude) : null,
      longitude: record.longitude ? parseFloat(record.longitude) : null,
      locationId: record.location_id,
      onlineMeetingUrl: record.online_meeting_url,
      onlineMeetingPlatform: record.online_meeting_platform,
      maxCapacity: record.max_capacity,
      registeredCount: record.registered_count,
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
      viewCount: record.view_count,
      clickCount: record.click_count,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

export default new EventModel();