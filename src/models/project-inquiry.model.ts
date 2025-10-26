/**
 * Project Inquiry Model
 * Represents detailed project-specific inquiry forms
 * Manages buyer profiles, preferences, and sales pipeline
 * FIXED: Safe JSON parsing to handle null values
 *
 * @module models/project-inquiry.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Project inquiry status enumeration
 * Defines the sales pipeline stages
 */
export enum ProjectInquiryStatus {
  NEW = "new",
  CONTACTED = "contacted",
  QUALIFIED = "qualified",
  VIEWING_SCHEDULED = "viewing_scheduled",
  OFFER_MADE = "offer_made",
  CLOSED_WON = "closed_won",
  CLOSED_LOST = "closed_lost",
}

/**
 * Financing method enumeration
 * Defines how the buyer plans to finance
 */
export enum FinancingMethod {
  CASH = "cash",
  MORTGAGE = "mortgage",
  INSTALLMENT = "installment",
  MIXED = "mixed",
  OTHER = "other",
}

/**
 * Purchase timeline enumeration
 * Defines buyer's purchase timeframe
 */
export enum PurchaseTimeline {
  IMMEDIATE = "immediate",
  WITHIN_3_MONTHS = "within_3_months",
  WITHIN_6_MONTHS = "within_6_months",
  WITHIN_YEAR = "within_year",
  EXPLORING = "exploring",
}

/**
 * Project inquiry entity interface
 * Represents a detailed project inquiry
 */
export interface ProjectInquiry {
  id: number;
  projectId: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  stateProvince: string | null;
  city: string | null;
  profession: string | null;
  budgetRange: string | null;
  financingMethod: FinancingMethod | null;
  interestTypes: string[] | null;
  propertyTypes: string[] | null;
  preferredLocations: string[] | null;
  preferredContactDay: string | null;
  preferredContactTime: string | null;
  purchaseTimeline: PurchaseTimeline | null;
  assignedTo: string | null;
  status: ProjectInquiryStatus;
  acceptedTerms: boolean;
  marketingConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create project inquiry DTO
 */
export interface CreateProjectInquiryDto {
  projectId?: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  stateProvince?: string | null;
  city?: string | null;
  profession?: string | null;
  budgetRange?: string | null;
  financingMethod?: FinancingMethod | null;
  interestTypes?: string[] | null;
  propertyTypes?: string[] | null;
  preferredLocations?: string[] | null;
  preferredContactDay?: string | null;
  preferredContactTime?: string | null;
  purchaseTimeline?: PurchaseTimeline | null;
  acceptedTerms?: boolean;
  marketingConsent?: boolean;
}

/**
 * Update project inquiry DTO
 */
export interface UpdateProjectInquiryDto {
  projectId?: number | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  stateProvince?: string | null;
  city?: string | null;
  profession?: string | null;
  budgetRange?: string | null;
  financingMethod?: FinancingMethod | null;
  interestTypes?: string[] | null;
  propertyTypes?: string[] | null;
  preferredLocations?: string[] | null;
  preferredContactDay?: string | null;
  preferredContactTime?: string | null;
  purchaseTimeline?: PurchaseTimeline | null;
  assignedTo?: string | null;
  status?: ProjectInquiryStatus;
  marketingConsent?: boolean;
}

/**
 * Project inquiry query parameters
 */
export interface ProjectInquiryQueryParams extends BaseQueryParams {
  projectId?: number;
  status?: ProjectInquiryStatus;
  assignedTo?: string;
  email?: string;
  financingMethod?: FinancingMethod;
  purchaseTimeline?: PurchaseTimeline;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Safe JSON parse helper
 */
function safeJsonParse(value: any): any {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

/**
 * Project Inquiry Model class
 * Handles all database operations for project inquiries
 */
class ProjectInquiryModel extends BaseModel<
  ProjectInquiry,
  CreateProjectInquiryDto,
  UpdateProjectInquiryDto
> {
  protected tableName = "project_inquiries";

  /**
   * Finds all project inquiries matching query parameters
   *
   * @param params - Query parameters
   * @returns Promise<ProjectInquiry[]> - Array of inquiries
   *
   * @example
   * const inquiries = await ProjectInquiryModel.findAll({
   *   status: ProjectInquiryStatus.NEW,
   *   projectId: 1
   * });
   */
  async findAll(
    params: ProjectInquiryQueryParams = {}
  ): Promise<ProjectInquiry[]> {
    let query = this.db(this.tableName);

    if (params.projectId !== undefined) {
      query = query.where({ project_id: params.projectId });
    }

    if (params.status) {
      query = query.where({ status: params.status });
    }

    if (params.assignedTo) {
      query = query.where({ assigned_to: params.assignedTo });
    }

    if (params.email) {
      query = query.where({ email: params.email });
    }

    if (params.financingMethod) {
      query = query.where({ financing_method: params.financingMethod });
    }

    if (params.purchaseTimeline) {
      query = query.where({ purchase_timeline: params.purchaseTimeline });
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

    const inquiries = await query;
    return inquiries.map(this.mapToEntity);
  }

  /**
   * Gets inquiries by project
   *
   * @param projectId - Project ID
   * @returns Promise<ProjectInquiry[]> - Project inquiries
   *
   * @example
   * const inquiries = await ProjectInquiryModel.getByProject(1);
   */
  async getByProject(projectId: number): Promise<ProjectInquiry[]> {
    return this.findAll({ projectId });
  }

  /**
   * Gets new (unassigned) inquiries
   *
   * @param limit - Maximum number of inquiries
   * @returns Promise<ProjectInquiry[]> - New inquiries
   *
   * @example
   * const newInquiries = await ProjectInquiryModel.getNew(10);
   */
  async getNew(limit?: number): Promise<ProjectInquiry[]> {
    let query = this.db(this.tableName)
      .where({ status: ProjectInquiryStatus.NEW })
      .orderBy("created_at", "desc");

    if (limit) {
      query = query.limit(limit);
    }

    const inquiries = await query;
    return inquiries.map(this.mapToEntity);
  }

  /**
   * Gets inquiries assigned to a salesperson
   *
   * @param assignedTo - Salesperson name/ID
   * @returns Promise<ProjectInquiry[]> - Assigned inquiries
   *
   * @example
   * const myInquiries = await ProjectInquiryModel.getAssigned("john_doe");
   */
  async getAssigned(assignedTo: string): Promise<ProjectInquiry[]> {
    return this.findAll({ assignedTo });
  }

  /**
   * Assigns an inquiry to a salesperson
   *
   * @param inquiryId - Inquiry ID
   * @param assignedTo - Salesperson name/ID
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await ProjectInquiryModel.assign(1, "john_doe");
   */
  async assign(inquiryId: number, assignedTo: string): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id: inquiryId })
      .update({
        assigned_to: assignedTo,
        updated_at: this.db.fn.now(),
      });

    return updated > 0;
  }

  /**
   * Updates inquiry status
   *
   * @param inquiryId - Inquiry ID
   * @param status - New status
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await ProjectInquiryModel.updateStatus(1, ProjectInquiryStatus.QUALIFIED);
   */
  async updateStatus(
    inquiryId: number,
    status: ProjectInquiryStatus
  ): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id: inquiryId })
      .update({
        status,
        updated_at: this.db.fn.now(),
      });

    return updated > 0;
  }

  /**
   * Gets inquiries by financing method
   *
   * @param method - Financing method
   * @returns Promise<ProjectInquiry[]> - Matching inquiries
   *
   * @example
   * const cashBuyers = await ProjectInquiryModel.getByFinancingMethod(FinancingMethod.CASH);
   */
  async getByFinancingMethod(
    method: FinancingMethod
  ): Promise<ProjectInquiry[]> {
    return this.findAll({ financingMethod: method });
  }

  /**
   * Gets inquiries by purchase timeline
   *
   * @param timeline - Purchase timeline
   * @returns Promise<ProjectInquiry[]> - Matching inquiries
   *
   * @example
   * const urgentBuyers = await ProjectInquiryModel.getByTimeline(PurchaseTimeline.IMMEDIATE);
   */
  async getByTimeline(timeline: PurchaseTimeline): Promise<ProjectInquiry[]> {
    return this.findAll({ purchaseTimeline: timeline });
  }

  /**
   * Gets qualified leads
   *
   * @param limit - Maximum number of leads
   * @returns Promise<ProjectInquiry[]> - Qualified inquiries
   *
   * @example
   * const qualified = await ProjectInquiryModel.getQualified(20);
   */
  async getQualified(limit?: number): Promise<ProjectInquiry[]> {
    let query = this.db(this.tableName)
      .where({ status: ProjectInquiryStatus.QUALIFIED })
      .orderBy("created_at", "desc");

    if (limit) {
      query = query.limit(limit);
    }

    const inquiries = await query;
    return inquiries.map(this.mapToEntity);
  }

  /**
   * Gets inquiry statistics by status
   *
   * @returns Promise<Record<string, number>> - Status counts
   *
   * @example
   * const stats = await ProjectInquiryModel.getStatusStatistics();
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
   * Gets pipeline statistics by stage
   *
   * @returns Promise<any> - Sales pipeline metrics
   *
   * @example
   * const pipeline = await ProjectInquiryModel.getPipelineStatistics();
   */
  async getPipelineStatistics(): Promise<any> {
    const stats = await this.getStatusStatistics();

    const totalLeads = Object.values(stats).reduce(
      (sum, count) => sum + count,
      0
    );
    const conversionRate =
      totalLeads > 0
        ? Math.round(
            ((stats[ProjectInquiryStatus.CLOSED_WON] || 0) / totalLeads) * 1000
          ) / 10
        : 0;

    return {
      total: totalLeads,
      byStatus: stats,
      conversionRate,
      closedWon: stats[ProjectInquiryStatus.CLOSED_WON] || 0,
      closedLost: stats[ProjectInquiryStatus.CLOSED_LOST] || 0,
    };
  }

  /**
   * Gets inquiries by email
   *
   * @param email - Email address
   * @returns Promise<ProjectInquiry[]> - User's inquiries
   *
   * @example
   * const myInquiries = await ProjectInquiryModel.findByEmail("john@example.com");
   */
  async findByEmail(email: string): Promise<ProjectInquiry[]> {
    return this.findWhere({ email });
  }

  /**
   * Gets inquiries with marketing consent
   *
   * @returns Promise<ProjectInquiry[]> - Inquiries with consent
   *
   * @example
   * const consented = await ProjectInquiryModel.getWithMarketingConsent();
   */
  async getWithMarketingConsent(): Promise<ProjectInquiry[]> {
    return this.findWhere({ marketing_consent: true });
  }

  /**
   * Maps database record to ProjectInquiry entity
   *
   * @param record - Database record
   * @returns ProjectInquiry entity
   *
   * @protected
   */
  protected mapToEntity(record: any): ProjectInquiry {
    return {
      id: record.id,
      projectId: record.project_id,
      firstName: record.first_name,
      lastName: record.last_name,
      email: record.email,
      phone: record.phone,
      country: record.country,
      stateProvince: record.state_province,
      city: record.city,
      profession: record.profession,
      budgetRange: record.budget_range,
      financingMethod: record.financing_method as FinancingMethod | null,
      interestTypes: safeJsonParse(record.interest_types),
      propertyTypes: safeJsonParse(record.property_types),
      preferredLocations: safeJsonParse(record.preferred_locations),
      preferredContactDay: record.preferred_contact_day,
      preferredContactTime: record.preferred_contact_time,
      purchaseTimeline: record.purchase_timeline as PurchaseTimeline | null,
      assignedTo: record.assigned_to,
      status: record.status as ProjectInquiryStatus,
      acceptedTerms: Boolean(record.accepted_terms),
      marketingConsent: Boolean(record.marketing_consent),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new ProjectInquiryModel();
