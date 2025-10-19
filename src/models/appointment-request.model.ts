/**
 * Appointment Request Model
 * Represents property viewing and appointment requests
 * Manages scheduling and tracking of property viewings
 *
 * @module models/appointment-request.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Appointment request status enumeration
 * Defines the lifecycle state of an appointment
 */
export enum AppointmentRequestStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  NO_SHOW = "no_show",
}

/**
 * Appointment request entity interface
 * Represents a property viewing appointment request
 */
export interface AppointmentRequest {
  /** Unique identifier */
  id: number;

  /** Full name */
  fullName: string;

  /** Email address */
  email: string;

  /** Phone number */
  phone: string;

  /** Preferred location/property */
  preferredLocation: string | null;

  /** Budget range */
  budgetRange: string | null;

  /** Preferred date */
  preferredDate: Date | null;

  /** Preferred time */
  preferredTime: string | null;

  /** Appointment status */
  status: AppointmentRequestStatus;

  /** Additional notes */
  notes: string | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Create appointment request DTO
 */
export interface CreateAppointmentRequestDto {
  fullName: string;
  email: string;
  phone: string;
  preferredLocation?: string | null;
  budgetRange?: string | null;
  preferredDate?: Date | null;
  preferredTime?: string | null;
  notes?: string | null;
}

/**
 * Update appointment request DTO
 */
export interface UpdateAppointmentRequestDto {
  fullName?: string;
  email?: string;
  phone?: string;
  preferredLocation?: string | null;
  budgetRange?: string | null;
  preferredDate?: Date | null;
  preferredTime?: string | null;
  status?: AppointmentRequestStatus;
  notes?: string | null;
}

/**
 * Appointment request query parameters
 */
export interface AppointmentRequestQueryParams extends BaseQueryParams {
  status?: AppointmentRequestStatus;
  email?: string;
  dateFrom?: Date;
  dateTo?: Date;
  preferredDate?: Date;
}

/**
 * Appointment Request Model class
 * Handles all database operations for appointment requests
 */
class AppointmentRequestModel extends BaseModel<
  AppointmentRequest,
  CreateAppointmentRequestDto,
  UpdateAppointmentRequestDto
> {
  protected tableName = "appointment_requests";

  /**
   * Finds all appointment requests matching query parameters
   *
   * @param params - Query parameters
   * @returns Promise<AppointmentRequest[]> - Array of appointments
   *
   * @example
   * const appointments = await AppointmentRequestModel.findAll({
   *   status: AppointmentRequestStatus.PENDING,
   *   dateFrom: new Date('2025-01-01')
   * });
   */
  async findAll(
    params: AppointmentRequestQueryParams = {}
  ): Promise<AppointmentRequest[]> {
    let query = this.db(this.tableName);

    if (params.status) {
      query = query.where({ status: params.status });
    }

    if (params.email) {
      query = query.where({ email: params.email });
    }

    if (params.preferredDate) {
      query = query.whereRaw("DATE(preferred_date) = DATE(?)", [
        params.preferredDate,
      ]);
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
      query = query.orderBy("preferred_date", "asc");
    }

    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const appointments = await query;
    return appointments.map(this.mapToEntity);
  }

  /**
   * Gets pending appointment requests
   *
   * @param limit - Maximum number of appointments
   * @returns Promise<AppointmentRequest[]> - Pending appointments
   *
   * @example
   * const pending = await AppointmentRequestModel.getPending(10);
   */
  async getPending(limit?: number): Promise<AppointmentRequest[]> {
    let query = this.db(this.tableName)
      .where({ status: AppointmentRequestStatus.PENDING })
      .orderBy("preferred_date", "asc");

    if (limit) {
      query = query.limit(limit);
    }

    const appointments = await query;
    return appointments.map(this.mapToEntity);
  }

  /**
   * Gets appointments for a specific date
   *
   * @param date - Date to check
   * @returns Promise<AppointmentRequest[]> - Appointments on that date
   *
   * @example
   * const today = await AppointmentRequestModel.getByDate(new Date());
   */
  async getByDate(date: Date): Promise<AppointmentRequest[]> {
    const appointments = await this.db(this.tableName)
      .whereRaw("DATE(preferred_date) = DATE(?)", [date])
      .orderBy("preferred_time", "asc");

    return appointments.map(this.mapToEntity);
  }

  /**
   * Gets upcoming confirmed appointments
   *
   * @param limit - Maximum number of appointments
   * @returns Promise<AppointmentRequest[]> - Upcoming appointments
   *
   * @example
   * const upcoming = await AppointmentRequestModel.getUpcoming(5);
   */
  async getUpcoming(limit?: number): Promise<AppointmentRequest[]> {
    let query = this.db(this.tableName)
      .where({ status: AppointmentRequestStatus.CONFIRMED })
      .where("preferred_date", ">=", new Date())
      .orderBy("preferred_date", "asc");

    if (limit) {
      query = query.limit(limit);
    }

    const appointments = await query;
    return appointments.map(this.mapToEntity);
  }

  /**
   * Updates appointment status
   *
   * @param id - Appointment ID
   * @param status - New status
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await AppointmentRequestModel.updateStatus(1, AppointmentRequestStatus.CONFIRMED);
   */
  async updateStatus(
    id: number,
    status: AppointmentRequestStatus
  ): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id }).update({
      status,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Adds notes to an appointment
   *
   * @param id - Appointment ID
   * @param notes - Notes to add
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await AppointmentRequestModel.addNotes(1, "Customer prefers morning viewings");
   */
  async addNotes(id: number, notes: string): Promise<boolean> {
    const appointment = await this.findById(id);
    if (!appointment) return false;

    const existingNotes = appointment.notes || "";
    const timestamp = new Date().toISOString();
    const newNotes = `${existingNotes}\n\n[${timestamp}]\n${notes}`.trim();

    const updated = await this.db(this.tableName).where({ id }).update({
      notes: newNotes,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Gets appointment statistics by status
   *
   * @returns Promise<Record<string, number>> - Status counts
   *
   * @example
   * const stats = await AppointmentRequestModel.getStatusStatistics();
   */
  async getStatusStatistics(): Promise<Record<string, number>> {
    const results = await this.db(this.tableName)
      .select("status")
      .count("* as count")
      .groupBy("status");

    const stats: Record<string, number> = {};
    results.forEach((row: any) => {
      stats[row.status] = Number(row.count);
    });

    return stats;
  }

  /**
   * Gets appointments by email
   *
   * @param email - Email address
   * @returns Promise<AppointmentRequest[]> - User's appointments
   *
   * @example
   * const myAppointments = await AppointmentRequestModel.findByEmail("john@example.com");
   */
  async findByEmail(email: string): Promise<AppointmentRequest[]> {
    return this.findWhere({ email });
  }

  /**
   * Maps database record to AppointmentRequest entity
   *
   * @param record - Database record
   * @returns AppointmentRequest entity
   *
   * @protected
   */
  protected mapToEntity(record: any): AppointmentRequest {
    return {
      id: record.id,
      fullName: record.full_name,
      email: record.email,
      phone: record.phone,
      preferredLocation: record.preferred_location,
      budgetRange: record.budget_range,
      preferredDate: record.preferred_date
        ? new Date(record.preferred_date)
        : null,
      preferredTime: record.preferred_time,
      status: record.status as AppointmentRequestStatus,
      notes: record.notes,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new AppointmentRequestModel();
