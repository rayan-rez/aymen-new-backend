/**
 * Land Submission Model
 * Represents land/terrain submissions from property owners
 * Manages land acquisition workflow and evaluation
 *
 * @module models/land-submission.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Land submission status enumeration
 * Defines the evaluation workflow stages
 */
export enum LandSubmissionStatus {
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  SITE_VISIT_SCHEDULED = "site_visit_scheduled",
  EVALUATION_COMPLETE = "evaluation_complete",
  INTERESTED = "interested",
  OFFER_MADE = "offer_made",
  ACQUIRED = "acquired",
  REJECTED = "rejected",
}

/**
 * Land submission entity interface
 * Represents a land submission
 */
export interface LandSubmission {
  /** Unique identifier */
  id: number;

  /** Owner name */
  ownerName: string;

  /** Email address */
  email: string | null;

  /** Phone number */
  phone: string;

  /** Property address */
  address: string;

  /** City */
  city: string | null;

  /** State/Province */
  stateProvince: string | null;

  /** Area in square meters */
  areaSqm: number | null;

  /** Number of facades */
  facadeCount: number | null;

  /** Has building permit */
  hasBuildingPermit: boolean;

  /** Has land title (Libret foncier) */
  hasLandTitle: boolean;

  /** Has property deed (Acte de propriété) */
  hasPropertyDeed: boolean;

  /** Has cadastral plan */
  hasCadastralPlan: boolean;

  /** Has urban planning certificate */
  hasUrbanPlanningCertificate: boolean;

  /** Has Ferida certificate */
  hasFeridaCertificate: boolean;

  /** Submission status */
  status: LandSubmissionStatus;

  /** Internal notes */
  internalNotes: string | null;

  /** Assigned evaluator */
  assignedEvaluator: string | null;

  /** Estimated value */
  estimatedValue: number | null;

  /** Evaluation date */
  evaluationDate: Date | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Create land submission DTO
 */
export interface CreateLandSubmissionDto {
  ownerName: string;
  email?: string | null;
  phone: string;
  address: string;
  city?: string | null;
  stateProvince?: string | null;
  areaSqm?: number | null;
  facadeCount?: number | null;
  hasBuildingPermit?: boolean;
  hasLandTitle?: boolean;
  hasPropertyDeed?: boolean;
  hasCadastralPlan?: boolean;
  hasUrbanPlanningCertificate?: boolean;
  hasFeridaCertificate?: boolean;
}

/**
 * Update land submission DTO
 */
export interface UpdateLandSubmissionDto {
  ownerName?: string;
  email?: string | null;
  phone?: string;
  address?: string;
  city?: string | null;
  stateProvince?: string | null;
  areaSqm?: number | null;
  facadeCount?: number | null;
  hasBuildingPermit?: boolean;
  hasLandTitle?: boolean;
  hasPropertyDeed?: boolean;
  hasCadastralPlan?: boolean;
  hasUrbanPlanningCertificate?: boolean;
  hasFeridaCertificate?: boolean;
  status?: LandSubmissionStatus;
  internalNotes?: string | null;
  assignedEvaluator?: string | null;
  estimatedValue?: number | null;
  evaluationDate?: Date | null;
}

/**
 * Land submission query parameters
 */
export interface LandSubmissionQueryParams extends BaseQueryParams {
  status?: LandSubmissionStatus;
  city?: string;
  assignedEvaluator?: string;
  email?: string;
  phone?: string;
  minArea?: number;
  maxArea?: number;
  hasAllDocuments?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Land Submission Model class
 * Handles all database operations for land submissions
 */
class LandSubmissionModel extends BaseModel<
  LandSubmission,
  CreateLandSubmissionDto,
  UpdateLandSubmissionDto
> {
  protected tableName = "land_submissions";

  /**
   * Finds all land submissions matching query parameters
   *
   * @param params - Query parameters
   * @returns Promise<LandSubmission[]> - Array of submissions
   *
   * @example
   * const submissions = await LandSubmissionModel.findAll({
   *   status: LandSubmissionStatus.UNDER_REVIEW,
   *   city: "Annaba"
   * });
   */
  async findAll(
    params: LandSubmissionQueryParams = {}
  ): Promise<LandSubmission[]> {
    let query = this.db(this.tableName);

    if (params.status) {
      query = query.where({ status: params.status });
    }

    if (params.city) {
      query = query.where({ city: params.city });
    }

    if (params.assignedEvaluator) {
      query = query.where({ assigned_evaluator: params.assignedEvaluator });
    }

    if (params.email) {
      query = query.where({ email: params.email });
    }

    if (params.phone) {
      query = query.where({ phone: params.phone });
    }

    if (params.minArea !== undefined) {
      query = query.where("area_sqm", ">=", params.minArea);
    }

    if (params.maxArea !== undefined) {
      query = query.where("area_sqm", "<=", params.maxArea);
    }

    if (params.hasAllDocuments) {
      query = query
        .where({ has_building_permit: true })
        .where({ has_land_title: true })
        .where({ has_property_deed: true })
        .where({ has_cadastral_plan: true })
        .where({ has_urban_planning_certificate: true })
        .where({ has_ferida_certificate: true });
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

    const submissions = await query;
    return submissions.map(this.mapToEntity);
  }

  /**
   * Gets new submissions (submitted status)
   *
   * @param limit - Maximum number of submissions
   * @returns Promise<LandSubmission[]> - New submissions
   *
   * @example
   * const newSubmissions = await LandSubmissionModel.getNew(10);
   */
  async getNew(limit?: number): Promise<LandSubmission[]> {
    let query = this.db(this.tableName)
      .where({ status: LandSubmissionStatus.SUBMITTED })
      .orderBy("created_at", "desc");

    if (limit) {
      query = query.limit(limit);
    }

    const submissions = await query;
    return submissions.map(this.mapToEntity);
  }

  /**
   * Gets submissions by city
   *
   * @param city - City name
   * @returns Promise<LandSubmission[]> - City submissions
   *
   * @example
   * const submissions = await LandSubmissionModel.getByCity("Annaba");
   */
  async getByCity(city: string): Promise<LandSubmission[]> {
    return this.findAll({ city });
  }

  /**
   * Gets submissions assigned to an evaluator
   *
   * @param evaluator - Evaluator name/ID
   * @returns Promise<LandSubmission[]> - Assigned submissions
   *
   * @example
   * const mySubmissions = await LandSubmissionModel.getAssigned("john_doe");
   */
  async getAssigned(evaluator: string): Promise<LandSubmission[]> {
    return this.findAll({ assignedEvaluator: evaluator });
  }

  /**
   * Gets submissions with complete documentation
   *
   * @returns Promise<LandSubmission[]> - Complete submissions
   *
   * @example
   * const complete = await LandSubmissionModel.getWithCompleteDocuments();
   */
  async getWithCompleteDocuments(): Promise<LandSubmission[]> {
    return this.findAll({ hasAllDocuments: true });
  }

  /**
   * Updates submission status
   *
   * @param id - Submission ID
   * @param status - New status
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await LandSubmissionModel.updateStatus(1, LandSubmissionStatus.UNDER_REVIEW);
   */
  async updateStatus(
    id: number,
    status: LandSubmissionStatus
  ): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id }).update({
      status,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Assigns an evaluator to a submission
   *
   * @param id - Submission ID
   * @param evaluator - Evaluator name/ID
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await LandSubmissionModel.assign(1, "john_doe");
   */
  async assign(id: number, evaluator: string): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id }).update({
      assigned_evaluator: evaluator,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Sets evaluation results
   *
   * @param id - Submission ID
   * @param estimatedValue - Estimated property value
   * @param evaluationDate - Date of evaluation
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await LandSubmissionModel.setEvaluation(1, 5000000, new Date());
   */
  async setEvaluation(
    id: number,
    estimatedValue: number,
    evaluationDate: Date
  ): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id }).update({
      estimated_value: estimatedValue,
      evaluation_date: evaluationDate,
      status: LandSubmissionStatus.EVALUATION_COMPLETE,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Adds internal notes
   *
   * @param id - Submission ID
   * @param notes - Notes to add
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await LandSubmissionModel.addNotes(1, "Good location, needs site visit");
   */
  async addNotes(id: number, notes: string): Promise<boolean> {
    const submission = await this.findById(id);
    if (!submission) return false;

    const existingNotes = submission.internalNotes || "";
    const timestamp = new Date().toISOString();
    const newNotes = `${existingNotes}\n\n[${timestamp}]\n${notes}`.trim();

    const updated = await this.db(this.tableName).where({ id }).update({
      internal_notes: newNotes,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Gets submission statistics by status
   *
   * @returns Promise<Record<string, number>> - Status counts
   *
   * @example
   * const stats = await LandSubmissionModel.getStatusStatistics();
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
   * Gets document completion statistics
   *
   * @returns Promise<any> - Document statistics
   *
   * @example
   * const stats = await LandSubmissionModel.getDocumentStatistics();
   */
  async getDocumentStatistics(): Promise<any> {
    const [total, withAllDocs] = await Promise.all([
      this.db(this.tableName).count("* as count").first(),

      this.db(this.tableName)
        .where({ has_building_permit: true })
        .where({ has_land_title: true })
        .where({ has_property_deed: true })
        .where({ has_cadastral_plan: true })
        .where({ has_urban_planning_certificate: true })
        .where({ has_ferida_certificate: true })
        .count("* as count")
        .first(),
    ]);

    return {
      total: Number(total?.count || 0),
      withAllDocuments: Number(withAllDocs?.count || 0),
      completionRate:
        Number(total?.count || 0) > 0
          ? Math.round(
              (Number(withAllDocs?.count || 0) / Number(total?.count || 0)) *
                1000
            ) / 10
          : 0,
    };
  }

  /**
   * Maps database record to LandSubmission entity
   *
   * @param record - Database record
   * @returns LandSubmission entity
   *
   * @protected
   */
  protected mapToEntity(record: any): LandSubmission {
    return {
      id: record.id,
      ownerName: record.owner_name,
      email: record.email,
      phone: record.phone,
      address: record.address,
      city: record.city,
      stateProvince: record.state_province,
      areaSqm: record.area_sqm ? parseFloat(record.area_sqm) : null,
      facadeCount: record.facade_count,
      hasBuildingPermit: Boolean(record.has_building_permit),
      hasLandTitle: Boolean(record.has_land_title),
      hasPropertyDeed: Boolean(record.has_property_deed),
      hasCadastralPlan: Boolean(record.has_cadastral_plan),
      hasUrbanPlanningCertificate: Boolean(
        record.has_urban_planning_certificate
      ),
      hasFeridaCertificate: Boolean(record.has_ferida_certificate),
      status: record.status as LandSubmissionStatus,
      internalNotes: record.internal_notes,
      assignedEvaluator: record.assigned_evaluator,
      estimatedValue: record.estimated_value
        ? parseFloat(record.estimated_value)
        : null,
      evaluationDate: record.evaluation_date
        ? new Date(record.evaluation_date)
        : null,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new LandSubmissionModel();
