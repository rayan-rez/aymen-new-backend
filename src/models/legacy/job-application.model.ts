/**
 * Job Application Model
 * Represents recruitment and job applications
 * Manages hiring workflow and applicant tracking
 *
 * @module models/job-application.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Job application status enumeration
 * Defines the hiring workflow stages
 */
export enum JobApplicationStatus {
  RECEIVED = "received",
  SCREENING = "screening",
  INTERVIEW_SCHEDULED = "interview_scheduled",
  INTERVIEWED = "interviewed",
  OFFER_EXTENDED = "offer_extended",
  HIRED = "hired",
  REJECTED = "rejected",
  WITHDRAWN = "withdrawn",
}

/**
 * Job application entity interface
 * Represents a job application
 */
export interface JobApplication {
  /** Unique identifier */
  id: number;

  /** First name */
  firstName: string;

  /** Last name */
  lastName: string;

  /** Email address */
  email: string;

  /** Phone number */
  phone: string;

  /** Position applied for */
  appliedPosition: string;

  /** Portfolio URL */
  portfolioUrl: string | null;

  /** LinkedIn profile URL */
  linkedinUrl: string | null;

  /** Cover letter */
  coverLetter: string | null;

  /** Resume file URL */
  resumeUrl: string | null;

  /** Resume filename */
  resumeFilename: string | null;

  /** Application status */
  status: JobApplicationStatus;

  /** HR notes */
  hrNotes: string | null;

  /** Interviewer name */
  interviewedBy: string | null;

  /** Interview date */
  interviewDate: Date | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Create job application DTO
 */
export interface CreateJobApplicationDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  appliedPosition: string;
  portfolioUrl?: string | null;
  linkedinUrl?: string | null;
  coverLetter?: string | null;
  resumeUrl?: string | null;
  resumeFilename?: string | null;
}

/**
 * Update job application DTO
 */
export interface UpdateJobApplicationDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  appliedPosition?: string;
  portfolioUrl?: string | null;
  linkedinUrl?: string | null;
  coverLetter?: string | null;
  status?: JobApplicationStatus;
  hrNotes?: string | null;
  interviewedBy?: string | null;
  interviewDate?: Date | null;
}

/**
 * Job application query parameters
 */
export interface JobApplicationQueryParams extends BaseQueryParams {
  status?: JobApplicationStatus;
  appliedPosition?: string;
  email?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Job Application Model class
 * Handles all database operations for job applications
 */
class JobApplicationModel extends BaseModel<
  JobApplication,
  CreateJobApplicationDto,
  UpdateJobApplicationDto
> {
  protected tableName = "job_applications";

  /**
   * Finds all job applications matching query parameters
   *
   * @param params - Query parameters
   * @returns Promise<JobApplication[]> - Array of applications
   *
   * @example
   * const applications = await JobApplicationModel.findAll({
   *   status: JobApplicationStatus.RECEIVED,
   *   appliedPosition: "Sales Manager"
   * });
   */
  async findAll(
    params: JobApplicationQueryParams = {}
  ): Promise<JobApplication[]> {
    let query = this.db(this.tableName);

    if (params.status) {
      query = query.where({ status: params.status });
    }

    if (params.appliedPosition) {
      query = query.where({ applied_position: params.appliedPosition });
    }

    if (params.email) {
      query = query.where({ email: params.email });
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
      query = query.orderBy("created_at", "desc");
    }

    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const applications = await query;
    return applications.map(this.mapToEntity);
  }

  /**
   * Gets applications by position
   *
   * @param position - Position name
   * @returns Promise<JobApplication[]> - Applications for that position
   *
   * @example
   * const apps = await JobApplicationModel.getByPosition("Sales Manager");
   */
  async getByPosition(position: string): Promise<JobApplication[]> {
    return this.findAll({ appliedPosition: position });
  }

  /**
   * Gets applications by status
   *
   * @param status - Application status
   * @returns Promise<JobApplication[]> - Applications with that status
   *
   * @example
   * const received = await JobApplicationModel.getByStatus(JobApplicationStatus.RECEIVED);
   */
  async getByStatus(status: JobApplicationStatus): Promise<JobApplication[]> {
    return this.findAll({ status });
  }

  /**
   * Gets new applications (received status)
   *
   * @param limit - Maximum number of applications
   * @returns Promise<JobApplication[]> - New applications
   *
   * @example
   * const newApps = await JobApplicationModel.getNew(10);
   */
  async getNew(limit?: number): Promise<JobApplication[]> {
    let query = this.db(this.tableName)
      .where({ status: JobApplicationStatus.RECEIVED })
      .orderBy("created_at", "desc");

    if (limit) {
      query = query.limit(limit);
    }

    const applications = await query;
    return applications.map(this.mapToEntity);
  }

  /**
   * Updates application status
   *
   * @param id - Application ID
   * @param status - New status
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await JobApplicationModel.updateStatus(1, JobApplicationStatus.SCREENING);
   */
  async updateStatus(
    id: number,
    status: JobApplicationStatus
  ): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id }).update({
      status,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Schedules an interview
   *
   * @param id - Application ID
   * @param interviewDate - Interview date and time
   * @param interviewer - Interviewer name
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await JobApplicationModel.scheduleInterview(1, new Date(), "John Doe");
   */
  async scheduleInterview(
    id: number,
    interviewDate: Date,
    interviewer: string
  ): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id }).update({
      status: JobApplicationStatus.INTERVIEW_SCHEDULED,
      interview_date: interviewDate,
      interviewed_by: interviewer,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Adds HR notes to an application
   *
   * @param id - Application ID
   * @param notes - Notes to add
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await JobApplicationModel.addNotes(1, "Strong candidate, good communication skills");
   */
  async addNotes(id: number, notes: string): Promise<boolean> {
    const application = await this.findById(id);
    if (!application) return false;

    const existingNotes = application.hrNotes || "";
    const timestamp = new Date().toISOString();
    const newNotes = `${existingNotes}\n\n[${timestamp}]\n${notes}`.trim();

    const updated = await this.db(this.tableName).where({ id }).update({
      hr_notes: newNotes,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Gets application statistics by status
   *
   * @returns Promise<Record<string, number>> - Status counts
   *
   * @example
   * const stats = await JobApplicationModel.getStatusStatistics();
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
   * Gets application statistics by position
   *
   * @returns Promise<Record<string, number>> - Position counts
   *
   * @example
   * const stats = await JobApplicationModel.getPositionStatistics();
   */
  async getPositionStatistics(): Promise<Record<string, number>> {
    const results = await this.db(this.tableName)
      .select("applied_position")
      .count("* as count")
      .groupBy("applied_position");

    const stats: Record<string, number> = {};
    results.forEach((row: any) => {
      stats[row.applied_position] = Number(row.count);
    });

    return stats;
  }

  /**
   * Gets upcoming interviews
   *
   * @param limit - Maximum number of interviews
   * @returns Promise<JobApplication[]> - Upcoming interviews
   *
   * @example
   * const interviews = await JobApplicationModel.getUpcomingInterviews(5);
   */
  async getUpcomingInterviews(limit?: number): Promise<JobApplication[]> {
    let query = this.db(this.tableName)
      .where({ status: JobApplicationStatus.INTERVIEW_SCHEDULED })
      .whereNotNull("interview_date")
      .where("interview_date", ">=", new Date())
      .orderBy("interview_date", "asc");

    if (limit) {
      query = query.limit(limit);
    }

    const applications = await query;
    return applications.map(this.mapToEntity);
  }

  /**
   * Gets applications by email
   *
   * @param email - Email address
   * @returns Promise<JobApplication[]> - User's applications
   *
   * @example
   * const myApps = await JobApplicationModel.findByEmail("john@example.com");
   */
  async findByEmail(email: string): Promise<JobApplication[]> {
    return this.findWhere({ email });
  }

  /**
   * Maps database record to JobApplication entity
   *
   * @param record - Database record
   * @returns JobApplication entity
   *
   * @protected
   */
  protected mapToEntity(record: any): JobApplication {
    return {
      id: record.id,
      firstName: record.first_name,
      lastName: record.last_name,
      email: record.email,
      phone: record.phone,
      appliedPosition: record.applied_position,
      portfolioUrl: record.portfolio_url,
      linkedinUrl: record.linkedin_url,
      coverLetter: record.cover_letter,
      resumeUrl: record.resume_url,
      resumeFilename: record.resume_filename,
      status: record.status as JobApplicationStatus,
      hrNotes: record.hr_notes,
      interviewedBy: record.interviewed_by,
      interviewDate: record.interview_date
        ? new Date(record.interview_date)
        : null,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new JobApplicationModel();
