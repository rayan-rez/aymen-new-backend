/**
 * Analytics & Tracking Models
 * Models for user behavior tracking, form submissions, and analytics
 * 
 * @module models/analytics
 */

import { BaseModel, BaseQueryParams, Timestamps } from "../base";

// ============================================
// TRACKING EVENT TYPES
// ============================================

/**
 * Tracking Event Type Entity
 * Defines types of events that can be tracked
 * 
 * Database: tracking_event_types
 * Relationships: 1-to-many → user_events
 * Indexes: event_type (unique), category
 */
export interface TrackingEventType extends Timestamps {
  id: number;
  eventType: string;
  displayName: string;
  description: string | null;
  category: "page_view" | "user_action" | "form" | "property" | "system" | "custom";
  isActive: boolean;
  metadata: Record<string, any> | null;
}

export interface CreateTrackingEventTypeDto {
  eventType: string;
  displayName: string;
  description?: string | null;
  category: TrackingEventType["category"];
  isActive?: boolean;
  metadata?: Record<string, any> | null;
}

export interface UpdateTrackingEventTypeDto extends Partial<CreateTrackingEventTypeDto> {}

export interface TrackingEventTypeQueryParams extends BaseQueryParams {
  category?: TrackingEventType["category"];
  isActive?: boolean;
}

class TrackingEventTypeModel extends BaseModel<
  TrackingEventType,
  CreateTrackingEventTypeDto,
  UpdateTrackingEventTypeDto
> {
  protected tableName = "tracking_event_types";
  protected searchableColumns = ["event_type", "display_name", "description"];

  async findByEventType(eventType: string): Promise<TrackingEventType | null> {
    return this.findOne({ event_type: eventType });
  }

  async findByCategory(
    category: TrackingEventType["category"]
  ): Promise<TrackingEventType[]> {
    return this.findWhere({ category, is_active: true });
  }

  protected mapToEntity(record: any): TrackingEventType {
    return {
      id: record.id,
      eventType: record.event_type,
      displayName: record.display_name,
      description: record.description,
      category: record.category,
      isActive: Boolean(record.is_active),
      metadata: this.parseJson(record.metadata),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export const trackingEventTypeModel = new TrackingEventTypeModel();

// ============================================
// USER SESSIONS
// ============================================

/**
 * User Session Entity
 * Tracks user browsing sessions
 * 
 * Database: user_sessions
 * Relationships: 1-to-many → user_events, form_submissions, property_interactions
 * Indexes: session_id (unique), ip_address, started_at, ended_at
 * 
 * @example
 * // Session lifecycle
 * const session = await userSessionModel.create({
 *   sessionId: "uuid-v4",
 *   ipAddress: "192.168.1.1",
 *   userAgent: "Mozilla/5.0...",
 *   startedAt: new Date()
 * });
 */
export interface UserSession extends Timestamps {
  id: number;
  sessionId: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown" | null;
  browser: string | null;
  operatingSystem: string | null;
  referrerUrl: string | null;
  landingPageUrl: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  startedAt: Date;
  lastActivityAt: Date | null;
  endedAt: Date | null;
  pageViewCount: number;
  metadata: Record<string, any> | null;
}

export interface CreateUserSessionDto {
  sessionId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceType?: UserSession["deviceType"];
  browser?: string | null;
  operatingSystem?: string | null;
  referrerUrl?: string | null;
  landingPageUrl?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  startedAt: Date;
  metadata?: Record<string, any> | null;
}

export interface UpdateUserSessionDto {
  lastActivityAt?: Date;
  endedAt?: Date;
  pageViewCount?: number;
  metadata?: Record<string, any> | null;
}

export interface UserSessionQueryParams extends BaseQueryParams {
  deviceType?: UserSession["deviceType"];
  utmCampaign?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isActive?: boolean;
}

class UserSessionModel extends BaseModel<
  UserSession,
  CreateUserSessionDto,
  UpdateUserSessionDto
> {
  protected tableName = "user_sessions";

  async findBySessionId(sessionId: string): Promise<UserSession | null> {
    return this.findOne({ session_id: sessionId });
  }

  async getActiveSessions(): Promise<UserSession[]> {
    const records = await this.db(this.tableName)
      .whereNull("ended_at")
      .where("last_activity_at", ">=", new Date(Date.now() - 30 * 60 * 1000)) // Active in last 30 min
      .orderBy("last_activity_at", "desc");

    return records.map(this.mapToEntity.bind(this));
  }

  async updateActivity(sessionId: string): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ session_id: sessionId })
      .update({
        last_activity_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });

    return updated > 0;
  }

  async incrementPageViews(sessionId: string): Promise<boolean> {
    await this.db(this.tableName)
      .where({ session_id: sessionId })
      .increment("page_view_count", 1)
      .update({ updated_at: this.db.fn.now() });

    return true;
  }

  async endSession(sessionId: string): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ session_id: sessionId })
      .update({
        ended_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });

    return updated > 0;
  }

  protected mapToEntity(record: any): UserSession {
    return {
      id: record.id,
      sessionId: record.session_id,
      ipAddress: record.ip_address,
      userAgent: record.user_agent,
      deviceType: record.device_type,
      browser: record.browser,
      operatingSystem: record.operating_system,
      referrerUrl: record.referrer_url,
      landingPageUrl: record.landing_page_url,
      utmSource: record.utm_source,
      utmMedium: record.utm_medium,
      utmCampaign: record.utm_campaign,
      utmTerm: record.utm_term,
      utmContent: record.utm_content,
      startedAt: new Date(record.started_at),
      lastActivityAt: record.last_activity_at ? new Date(record.last_activity_at) : null,
      endedAt: record.ended_at ? new Date(record.ended_at) : null,
      pageViewCount: record.page_view_count,
      metadata: this.parseJson(record.metadata),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export const userSessionModel = new UserSessionModel();

// ============================================
// USER EVENTS
// ============================================

/**
 * User Event Entity
 * Tracks individual user interactions and events
 * 
 * Database: user_events
 * Foreign Keys:
 *   - session_id → user_sessions.id
 *   - event_type_id → tracking_event_types.id
 * Indexes: session_id, event_type_id, occurred_at
 * 
 * @example
 * // Track a property view
 * await userEventModel.create({
 *   sessionId: 123,
 *   eventTypeId: 5,
 *   pageUrl: "/projects/luxury-residence",
 *   eventData: { projectId: 1, duration: 45 }
 * });
 */
export interface UserEvent extends Timestamps {
  id: number;
  sessionId: number;
  eventTypeId: number;
  pageUrl: string | null;
  pageTitle: string | null;
  eventData: Record<string, any> | null;
  occurredAt: Date;
}

export interface CreateUserEventDto {
  sessionId: number;
  eventTypeId: number;
  pageUrl?: string | null;
  pageTitle?: string | null;
  eventData?: Record<string, any> | null;
  occurredAt?: Date;
}

export interface UpdateUserEventDto {
  eventData?: Record<string, any> | null;
}

export interface UserEventQueryParams extends BaseQueryParams {
  sessionId?: number;
  eventTypeId?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

class UserEventModel extends BaseModel<
  UserEvent,
  CreateUserEventDto,
  UpdateUserEventDto
> {
  protected tableName = "user_events";

  async findBySession(sessionId: number): Promise<UserEvent[]> {
    return this.findWhere({ session_id: sessionId });
  }

  async findByEventType(eventTypeId: number): Promise<UserEvent[]> {
    return this.findWhere({ event_type_id: eventTypeId });
  }

  async getEventsByDateRange(dateFrom: Date, dateTo: Date): Promise<UserEvent[]> {
    const records = await this.db(this.tableName)
      .whereBetween("occurred_at", [dateFrom, dateTo])
      .orderBy("occurred_at", "desc");

    return records.map(this.mapToEntity.bind(this));
  }

  protected mapToEntity(record: any): UserEvent {
    return {
      id: record.id,
      sessionId: record.session_id,
      eventTypeId: record.event_type_id,
      pageUrl: record.page_url,
      pageTitle: record.page_title,
      eventData: this.parseJson(record.event_data),
      occurredAt: new Date(record.occurred_at),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export const userEventModel = new UserEventModel();

// ============================================
// FORM SUBMISSIONS
// ============================================

/**
 * Form Submission Entity
 * Tracks all form submissions across the platform
 * 
 * Database: form_submissions
 * Foreign Keys:
 *   - session_id → user_sessions.id (nullable)
 * Indexes: session_id, form_type, submitted_at
 * 
 * JSON Fields:
 *   - form_data: { firstName: string, email: string, ... }
 *   - validation_errors: { field: string, message: string }[]
 * 
 * @example
 * await formSubmissionModel.create({
 *   formType: "contact_form",
 *   formData: { name: "John", email: "john@example.com" },
 *   isValid: true
 * });
 */
export interface FormSubmission extends Timestamps {
  id: number;
  sessionId: number | null;
  formType: string;
  formData: Record<string, any>;
  isValid: boolean;
  validationErrors: Array<{ field: string; message: string }> | null;
  ipAddress: string | null;
  submittedAt: Date;
}

export interface CreateFormSubmissionDto {
  sessionId?: number | null;
  formType: string;
  formData: Record<string, any>;
  isValid?: boolean;
  validationErrors?: Array<{ field: string; message: string }> | null;
  ipAddress?: string | null;
  submittedAt?: Date;
}

export interface UpdateFormSubmissionDto {
  isValid?: boolean;
  validationErrors?: Array<{ field: string; message: string }> | null;
}

export interface FormSubmissionQueryParams extends BaseQueryParams {
  sessionId?: number;
  formType?: string;
  isValid?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

class FormSubmissionModel extends BaseModel<
  FormSubmission,
  CreateFormSubmissionDto,
  UpdateFormSubmissionDto
> {
  protected tableName = "form_submissions";

  async findBySession(sessionId: number): Promise<FormSubmission[]> {
    return this.findWhere({ session_id: sessionId });
  }

  async findByFormType(formType: string): Promise<FormSubmission[]> {
    return this.findWhere({ form_type: formType });
  }

  async getInvalidSubmissions(): Promise<FormSubmission[]> {
    return this.findWhere({ is_valid: false });
  }

  async getSubmissionsByDateRange(
    dateFrom: Date,
    dateTo: Date
  ): Promise<FormSubmission[]> {
    const records = await this.db(this.tableName)
      .whereBetween("submitted_at", [dateFrom, dateTo])
      .orderBy("submitted_at", "desc");

    return records.map(this.mapToEntity.bind(this));
  }

  async getFormTypeStatistics(): Promise<Record<string, number>> {
    const results = await this.db(this.tableName)
      .select("form_type")
      .count("* as count")
      .groupBy("form_type");

    const stats: Record<string, number> = {};
    results.forEach((row: any) => {
      stats[row.form_type] = Number(row.count);
    });

    return stats;
  }

  protected mapToEntity(record: any): FormSubmission {
    return {
      id: record.id,
      sessionId: record.session_id,
      formType: record.form_type,
      formData: this.parseJson(record.form_data) || {},
      isValid: Boolean(record.is_valid),
      validationErrors: this.parseJsonArray(record.validation_errors),
      ipAddress: record.ip_address,
      submittedAt: new Date(record.submitted_at),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export const formSubmissionModel = new FormSubmissionModel();