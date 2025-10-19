/**
 * Event Registration Model
 * Represents event and trade show registrations
 * Manages attendee registration, check-in/out, and feedback
 *
 * @module models/event-registration.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Event type enumeration
 * Defines the category of event
 */
export enum EventType {
  OPEN_HOUSE = "open_house",
  TRADE_SHOW = "trade_show",
  INAUGURATION = "inauguration",
  NETWORKING = "networking",
  WEBINAR = "webinar",
}

/**
 * Event registration entity interface
 * Represents an event registration
 */
export interface EventRegistration {
  /** Unique identifier */
  id: number;

  /** First name */
  firstName: string;

  /** Last name */
  lastName: string;

  /** Email address */
  email: string | null;

  /** Phone number */
  phone: string | null;

  /** Event type */
  eventType: EventType;

  /** Event date */
  eventDate: Date;

  /** Selected time slots - JSON array */
  selectedTimeSlots: string[] | null;

  /** Check-in timestamp */
  checkedInAt: Date | null;

  /** Check-out timestamp */
  checkedOutAt: Date | null;

  /** Satisfaction score (1-10) */
  satisfactionScore: number | null;

  /** Recommendation score (1-10) NPS-style */
  recommendationScore: number | null;

  /** Feedback comments */
  feedbackComments: string | null;

  /** Assigned salesperson */
  assignedSalesperson: string | null;

  /** Accepted terms and conditions */
  acceptedTerms: boolean;

  /** Photo consent */
  photoConsent: boolean;

  /** UTM source parameter */
  utmSource: string | null;

  /** UTM medium parameter */
  utmMedium: string | null;

  /** UTM campaign parameter */
  utmCampaign: string | null;

  /** Registration source URL */
  registrationSource: string | null;

  /** Referrer URL */
  referrer: string | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Create event registration DTO
 */
export interface CreateEventRegistrationDto {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  eventType: EventType;
  eventDate: Date;
  selectedTimeSlots?: string[] | null;
  acceptedTerms?: boolean;
  photoConsent?: boolean;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  registrationSource?: string | null;
  referrer?: string | null;
}

/**
 * Update event registration DTO
 */
export interface UpdateEventRegistrationDto {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  eventType?: EventType;
  eventDate?: Date;
  selectedTimeSlots?: string[] | null;
  satisfactionScore?: number | null;
  recommendationScore?: number | null;
  feedbackComments?: string | null;
  assignedSalesperson?: string | null;
  photoConsent?: boolean;
}

/**
 * Event registration query parameters
 */
export interface EventRegistrationQueryParams extends BaseQueryParams {
  eventType?: EventType;
  eventDate?: Date;
  assignedSalesperson?: string;
  email?: string;
  phone?: string;
  hasCheckedIn?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Event Registration Model class
 * Handles all database operations for event registrations
 */
class EventRegistrationModel extends BaseModel<
  EventRegistration,
  CreateEventRegistrationDto,
  UpdateEventRegistrationDto
> {
  protected tableName = "event_registrations";

  /**
   * Finds all event registrations matching query parameters
   *
   * @param params - Query parameters
   * @returns Promise<EventRegistration[]> - Array of registrations
   *
   * @example
   * const registrations = await EventRegistrationModel.findAll({
   *   eventType: EventType.TRADE_SHOW,
   *   eventDate: new Date('2025-10-20')
   * });
   */
  async findAll(
    params: EventRegistrationQueryParams = {}
  ): Promise<EventRegistration[]> {
    let query = this.db(this.tableName);

    if (params.eventType) {
      query = query.where({ event_type: params.eventType });
    }

    if (params.eventDate) {
      query = query.whereRaw("DATE(event_date) = DATE(?)", [params.eventDate]);
    }

    if (params.assignedSalesperson) {
      query = query.where({ assigned_salesperson: params.assignedSalesperson });
    }

    if (params.email) {
      query = query.where({ email: params.email });
    }

    if (params.phone) {
      query = query.where({ phone: params.phone });
    }

    if (params.hasCheckedIn !== undefined) {
      if (params.hasCheckedIn) {
        query = query.whereNotNull("checked_in_at");
      } else {
        query = query.whereNull("checked_in_at");
      }
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
      query = query.orderBy("event_date", "desc");
    }

    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const registrations = await query;
    return registrations.map(this.mapToEntity);
  }

  /**
   * Gets registrations for a specific event
   *
   * @param eventType - Event type
   * @param eventDate - Event date
   * @returns Promise<EventRegistration[]> - Event registrations
   *
   * @example
   * const registrations = await EventRegistrationModel.getByEvent(
   *   EventType.OPEN_HOUSE,
   *   new Date('2025-10-20')
   * );
   */
  async getByEvent(
    eventType: EventType,
    eventDate: Date
  ): Promise<EventRegistration[]> {
    return this.findAll({ eventType, eventDate });
  }

  /**
   * Gets registrations assigned to a salesperson
   *
   * @param salesperson - Salesperson name/ID
   * @returns Promise<EventRegistration[]> - Assigned registrations
   *
   * @example
   * const myRegistrations = await EventRegistrationModel.getAssigned("john_doe");
   */
  async getAssigned(salesperson: string): Promise<EventRegistration[]> {
    return this.findAll({ assignedSalesperson: salesperson });
  }

  /**
   * Checks in an attendee
   *
   * @param id - Registration ID
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await EventRegistrationModel.checkIn(1);
   */
  async checkIn(id: number): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id }).update({
      checked_in_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Checks out an attendee
   *
   * @param id - Registration ID
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await EventRegistrationModel.checkOut(1);
   */
  async checkOut(id: number): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id }).update({
      checked_out_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Submits feedback for a registration
   *
   * @param id - Registration ID
   * @param feedback - Feedback data
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await EventRegistrationModel.submitFeedback(1, {
   *   satisfactionScore: 9,
   *   recommendationScore: 10,
   *   comments: "Great event!"
   * });
   */
  async submitFeedback(
    id: number,
    feedback: {
      satisfactionScore: number;
      recommendationScore: number;
      comments?: string;
    }
  ): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id })
      .update({
        satisfaction_score: feedback.satisfactionScore,
        recommendation_score: feedback.recommendationScore,
        feedback_comments: feedback.comments || null,
        updated_at: this.db.fn.now(),
      });

    return updated > 0;
  }

  /**
   * Assigns a salesperson to a registration
   *
   * @param id - Registration ID
   * @param salesperson - Salesperson name/ID
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await EventRegistrationModel.assign(1, "john_doe");
   */
  async assign(id: number, salesperson: string): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id }).update({
      assigned_salesperson: salesperson,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Gets checked-in attendees for an event
   *
   * @param eventType - Event type
   * @param eventDate - Event date
   * @returns Promise<EventRegistration[]> - Checked-in attendees
   *
   * @example
   * const attendees = await EventRegistrationModel.getCheckedIn(
   *   EventType.TRADE_SHOW,
   *   new Date('2025-10-20')
   * );
   */
  async getCheckedIn(
    eventType: EventType,
    eventDate: Date
  ): Promise<EventRegistration[]> {
    return this.findAll({
      eventType,
      eventDate,
      hasCheckedIn: true,
    });
  }

  /**
   * Gets event attendance statistics
   *
   * @param eventType - Event type
   * @param eventDate - Event date
   * @returns Promise<any> - Attendance statistics
   *
   * @example
   * const stats = await EventRegistrationModel.getAttendanceStats(
   *   EventType.OPEN_HOUSE,
   *   new Date('2025-10-20')
   * );
   */
  async getAttendanceStats(
    eventType: EventType,
    eventDate: Date
  ): Promise<any> {
    const [total, checkedIn, checkedOut, withFeedback] = await Promise.all([
      this.db(this.tableName)
        .where({ event_type: eventType })
        .whereRaw("DATE(event_date) = DATE(?)", [eventDate])
        .count("* as count")
        .first(),

      this.db(this.tableName)
        .where({ event_type: eventType })
        .whereRaw("DATE(event_date) = DATE(?)", [eventDate])
        .whereNotNull("checked_in_at")
        .count("* as count")
        .first(),

      this.db(this.tableName)
        .where({ event_type: eventType })
        .whereRaw("DATE(event_date) = DATE(?)", [eventDate])
        .whereNotNull("checked_out_at")
        .count("* as count")
        .first(),

      this.db(this.tableName)
        .where({ event_type: eventType })
        .whereRaw("DATE(event_date) = DATE(?)", [eventDate])
        .whereNotNull("satisfaction_score")
        .count("* as count")
        .first(),
    ]);

    return {
      totalRegistrations: Number(total?.count || 0),
      checkedIn: Number(checkedIn?.count || 0),
      checkedOut: Number(checkedOut?.count || 0),
      feedbackSubmitted: Number(withFeedback?.count || 0),
    };
  }

  /**
   * Maps database record to EventRegistration entity
   *
   * @param record - Database record
   * @returns EventRegistration entity
   *
   * @protected
   */
  protected mapToEntity(record: any): EventRegistration {
    return {
      id: record.id,
      firstName: record.first_name,
      lastName: record.last_name,
      email: record.email,
      phone: record.phone,
      eventType: record.event_type as EventType,
      eventDate: new Date(record.event_date),
      selectedTimeSlots: record.selected_time_slots
        ? JSON.parse(record.selected_time_slots)
        : null,
      checkedInAt: record.checked_in_at ? new Date(record.checked_in_at) : null,
      checkedOutAt: record.checked_out_at
        ? new Date(record.checked_out_at)
        : null,
      satisfactionScore: record.satisfaction_score,
      recommendationScore: record.recommendation_score,
      feedbackComments: record.feedback_comments,
      assignedSalesperson: record.assigned_salesperson,
      acceptedTerms: Boolean(record.accepted_terms),
      photoConsent: Boolean(record.photo_consent),
      utmSource: record.utm_source,
      utmMedium: record.utm_medium,
      utmCampaign: record.utm_campaign,
      registrationSource: record.registration_source,
      referrer: record.referrer,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new EventRegistrationModel();
