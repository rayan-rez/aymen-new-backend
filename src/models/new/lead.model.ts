/**
 * Lead Model (Unified)
 * Represents the unified lead management system
 * Single source of truth for all leads across different submission types
 *
 * @module models/lead.model
 */

import { BaseModel, BaseQueryParams } from "../base";

/**
 * Lead type enumeration
 * Defines the source/type of lead submission
 */
export enum LeadType {
  CONTACT_FORM = "contact_form",
  PROJECT_INQUIRY = "project_inquiry",
  APPOINTMENT = "appointment",
  EVENT_REGISTRATION = "event_registration",
  CATALOG_DOWNLOAD = "catalog_download",
  LAND_SUBMISSION = "land_submission",
  JOB_APPLICATION = "job_application",
}

/**
 * Lead status enumeration
 * Unified status workflow across all lead types
 */
export enum LeadStatus {
  NEW = "new",
  CONTACTED = "contacted",
  QUALIFIED = "qualified",
  NURTURING = "nurturing",
  CONVERTED = "converted",
  CLOSED_WON = "closed_won",
  CLOSED_LOST = "closed_lost",
  SPAM = "spam",
}

/**
 * Lead entity interface
 * Represents a unified lead in the CRM
 */
export interface Lead {
  /** Unique identifier */
  id: number;

  /** First name */
  firstName: string | null;

  /** Last name */
  lastName: string | null;

  /** Email address (NOT unique - allows duplicates) */
  email: string | null;

  /** Phone number */
  phone: string | null;

  /** Lead type/source */
  leadType: LeadType;

  /** Lead status in sales pipeline */
  status: LeadStatus;

  /** Assigned salesperson/agent */
  assignedTo: string | null;

  /** Assignment timestamp */
  assignedAt: Date | null;

  /** Lead score (0-100) */
  leadScore: number;

  /** UTM source parameter */
  utmSource: string | null;

  /** UTM medium parameter */
  utmMedium: string | null;

  /** UTM campaign parameter */
  utmCampaign: string | null;

  /** UTM term parameter */
  utmTerm: string | null;

  /** UTM content parameter */
  utmContent: string | null;

  /** Referrer URL */
  referrer: string | null;

  /** Source page URL */
  sourcePage: string | null;

  /** Source table reference (e.g., "contact_submissions") */
  sourceTable: string | null;

  /** Source record ID in the source table */
  sourceId: number | null;

  /** Internal notes and comments */
  internalNotes: string | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** Soft delete timestamp */
  deletedAt: Date | null;
}

/**
 * Create lead DTO
 */
export interface CreateLeadDto {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  leadType: LeadType;
  status?: LeadStatus;
  assignedTo?: string | null;
  assignedAt?: Date | null;
  leadScore?: number;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  referrer?: string | null;
  sourcePage?: string | null;
  sourceTable?: string | null;
  sourceId?: number | null;
  internalNotes?: string | null;
}

/**
 * Update lead DTO
 */
export interface UpdateLeadDto extends Partial<CreateLeadDto> {}

/**
 * Lead query parameters
 */
export interface LeadQueryParams extends BaseQueryParams {
  leadType?: LeadType;
  status?: LeadStatus;
  assignedTo?: string;
  email?: string;
  phone?: string;
  utmCampaign?: string;
  minScore?: number;
  maxScore?: number;
  dateFrom?: Date;
  dateTo?: Date;
  includeDeleted?: boolean;
}

/**
 * Lead with source data
 */
export interface LeadWithSource extends Lead {
  sourceData?: any;
}

/**
 * Lead Model class
 * Handles all database operations for unified leads
 */
class LeadModel extends BaseModel<Lead, CreateLeadDto, UpdateLeadDto> {
  protected tableName = "leads";

  /**
   * Finds all leads matching query parameters
   */
  async findAll(params: LeadQueryParams = {}): Promise<Lead[]> {
    let query = this.db(this.tableName);

    if (!params.includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    if (params.leadType) {
      query = query.where({ lead_type: params.leadType });
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

    if (params.phone) {
      query = query.where({ phone: params.phone });
    }

    if (params.utmCampaign) {
      query = query.where({ utm_campaign: params.utmCampaign });
    }

    if (params.minScore !== undefined) {
      query = query.where("lead_score", ">=", params.minScore);
    }

    if (params.maxScore !== undefined) {
      query = query.where("lead_score", "<=", params.maxScore);
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

    const leads = await query;
    return leads.map(this.mapToEntity);
  }

  /**
   * Gets new leads (unassigned)
   */
  async getNew(limit?: number): Promise<Lead[]> {
    let query = this.db(this.tableName)
      .where({ status: LeadStatus.NEW })
      .whereNull("deleted_at")
      .orderBy("created_at", "desc");

    if (limit) {
      query = query.limit(limit);
    }

    const leads = await query;
    return leads.map(this.mapToEntity);
  }

  /**
   * Gets leads by email (allows duplicates)
   */
  async findByEmail(
    email: string,
    includeDeleted: boolean = false
  ): Promise<Lead[]> {
    let query = this.db(this.tableName).where({ email: email.toLowerCase() });

    if (!includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    const records = await query;
    return records.map(this.mapToEntity);
  }

  /**
   * Gets leads assigned to a salesperson
   */
  async getAssigned(assignedTo: string): Promise<Lead[]> {
    return this.findAll({ assignedTo });
  }

  /**
   * Gets qualified leads
   */
  async getQualified(limit?: number): Promise<Lead[]> {
    let query = this.db(this.tableName)
      .where({ status: LeadStatus.QUALIFIED })
      .whereNull("deleted_at")
      .orderBy("lead_score", "desc");

    if (limit) {
      query = query.limit(limit);
    }

    const leads = await query;
    return leads.map(this.mapToEntity);
  }

  /**
   * Gets high-value leads (score >= 70)
   */
  async getHighValue(limit?: number): Promise<Lead[]> {
    return this.findAll({ minScore: 70, sortBy: "lead_score", sortOrder: "desc", limit });
  }

  /**
   * Assigns a lead to a salesperson
   */
  async assign(leadId: number, assignedTo: string): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id: leadId }).update({
      assigned_to: assignedTo,
      assigned_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Updates lead status
   */
  async updateStatus(leadId: number, status: LeadStatus): Promise<boolean> {
    const updated = await this.db(this.tableName).where({ id: leadId }).update({
      status,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Updates lead score
   */
  async updateScore(leadId: number, score: number): Promise<boolean> {
    if (score < 0 || score > 100) {
      throw new Error("Lead score must be between 0 and 100");
    }

    const updated = await this.db(this.tableName).where({ id: leadId }).update({
      lead_score: score,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Adds notes to a lead
   */
  async addNotes(leadId: number, notes: string): Promise<boolean> {
    const lead = await this.findById(leadId);
    if (!lead) return false;

    const existingNotes = lead.internalNotes || "";
    const timestamp = new Date().toISOString();
    const newNotes = `${existingNotes}\n\n[${timestamp}]\n${notes}`.trim();

    const updated = await this.db(this.tableName).where({ id: leadId }).update({
      internal_notes: newNotes,
      updated_at: this.db.fn.now(),
    });

    return updated > 0;
  }

  /**
   * Gets lead with source data
   */
  async getWithSource(leadId: number): Promise<LeadWithSource | null> {
    const lead = await this.findById(leadId);
    if (!lead || !lead.sourceTable || !lead.sourceId) return lead;

    let sourceData = null;
    try {
      const data = await this.db(lead.sourceTable).where({ id: lead.sourceId }).first();
      sourceData = data;
    } catch (error) {
      console.error(`Failed to fetch source data from ${lead.sourceTable}:`, error);
    }

    return { ...lead, sourceData };
  }

  /**
   * Gets leads by campaign
   */
  async getByCampaign(campaign: string): Promise<Lead[]> {
    return this.findAll({ utmCampaign: campaign });
  }

  /**
   * Gets conversion statistics
   */
  async getConversionStatistics(): Promise<any> {
    const stats = await this.getStatusStatistics();

    const totalLeads = Object.values(stats).reduce((sum, count) => sum + count, 0);
    const converted = stats[LeadStatus.CONVERTED] || 0;
    const closedWon = stats[LeadStatus.CLOSED_WON] || 0;

    const conversionRate =
      totalLeads > 0 ? Math.round(((converted + closedWon) / totalLeads) * 1000) / 10 : 0;

    return {
      total: totalLeads,
      byStatus: stats,
      conversionRate,
      converted,
      closedWon,
      closedLost: stats[LeadStatus.CLOSED_LOST] || 0,
    };
  }

  /**
   * Gets status statistics
   */
  async getStatusStatistics(): Promise<Record<string, number>> {
    const results = await this.db(this.tableName)
      .whereNull("deleted_at")
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
   * Gets lead type statistics
   */
  async getLeadTypeStatistics(): Promise<Record<string, number>> {
    const results = await this.db(this.tableName)
      .whereNull("deleted_at")
      .select("lead_type")
      .count("* as count")
      .groupBy("lead_type");

    const stats: Record<string, number> = {};
    results.forEach((row: any) => {
      stats[row.lead_type] = Number(row.count);
    });

    return stats;
  }

  /** TO BE COMPLETED */