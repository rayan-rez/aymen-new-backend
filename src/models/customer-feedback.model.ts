/**
 * Customer Feedback Model
 * Represents general customer feedback and surveys
 * Manages customer satisfaction ratings and comments
 *
 * @module models/customer-feedback.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Feedback type enumeration
 * Defines the category of feedback
 */
export enum FeedbackType {
  EVENT_FEEDBACK = "event_feedback",
  PROPERTY_VISIT = "property_visit",
  CUSTOMER_SERVICE = "customer_service",
  GENERAL = "general",
  KIOSK = "kiosk",
}

/**
 * Language enumeration
 * Supported feedback languages
 */
export enum FeedbackLanguage {
  FR = "fr",
  AR = "ar",
  EN = "en",
}

/**
 * Customer feedback entity interface
 * Represents a customer feedback submission
 */
export interface CustomerFeedback {
  /** Unique identifier */
  id: number;

  /** Full name (optional for anonymous feedback) */
  fullName: string | null;

  /** Email address (optional) */
  email: string | null;

  /** Phone number (optional) */
  phone: string | null;

  /** Feedback type */
  feedbackType: FeedbackType;

  /** Overall satisfaction (1-10) */
  overallSatisfaction: number | null;

  /** Recommendation likelihood (1-10) NPS-style */
  recommendationLikelihood: number | null;

  /** Feedback comments */
  feedbackComments: string | null;

  /** Suggestions for improvement */
  suggestions: string | null;

  /** Related project ID */
  projectId: number | null;

  /** Related event name */
  relatedEvent: string | null;

  /** Feedback language */
  language: FeedbackLanguage;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Create customer feedback DTO
 */
export interface CreateCustomerFeedbackDto {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  feedbackType: FeedbackType;
  overallSatisfaction?: number | null;
  recommendationLikelihood?: number | null;
  feedbackComments?: string | null;
  suggestions?: string | null;
  projectId?: number | null;
  relatedEvent?: string | null;
  language?: FeedbackLanguage;
}

/**
 * Update customer feedback DTO
 */
export interface UpdateCustomerFeedbackDto {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  feedbackType?: FeedbackType;
  overallSatisfaction?: number | null;
  recommendationLikelihood?: number | null;
  feedbackComments?: string | null;
  suggestions?: string | null;
  projectId?: number | null;
  relatedEvent?: string | null;
  language?: FeedbackLanguage;
}

/**
 * Customer feedback query parameters
 */
export interface CustomerFeedbackQueryParams extends BaseQueryParams {
  feedbackType?: FeedbackType;
  projectId?: number;
  language?: FeedbackLanguage;
  minSatisfaction?: number;
  minRecommendation?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Customer Feedback Model class
 * Handles all database operations for customer feedback
 */
class CustomerFeedbackModel extends BaseModel<
  CustomerFeedback,
  CreateCustomerFeedbackDto,
  UpdateCustomerFeedbackDto
> {
  protected tableName = "customer_feedback";

  /**
   * Finds all customer feedback matching query parameters
   *
   * @param params - Query parameters
   * @returns Promise<CustomerFeedback[]> - Array of feedback
   *
   * @example
   * const feedback = await CustomerFeedbackModel.findAll({
   *   feedbackType: FeedbackType.PROPERTY_VISIT,
   *   minSatisfaction: 8
   * });
   */
  async findAll(
    params: CustomerFeedbackQueryParams = {}
  ): Promise<CustomerFeedback[]> {
    let query = this.db(this.tableName);

    if (params.feedbackType) {
      query = query.where({ feedback_type: params.feedbackType });
    }

    if (params.projectId !== undefined) {
      query = query.where({ project_id: params.projectId });
    }

    if (params.language) {
      query = query.where({ language: params.language });
    }

    if (params.minSatisfaction !== undefined) {
      query = query.where("overall_satisfaction", ">=", params.minSatisfaction);
    }

    if (params.minRecommendation !== undefined) {
      query = query.where(
        "recommendation_likelihood",
        ">=",
        params.minRecommendation
      );
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

    const feedback = await query;
    return feedback.map(this.mapToEntity);
  }

  /**
   * Gets feedback by type
   *
   * @param feedbackType - Type of feedback
   * @returns Promise<CustomerFeedback[]> - Feedback of that type
   *
   * @example
   * const eventFeedback = await CustomerFeedbackModel.getByType(FeedbackType.EVENT_FEEDBACK);
   */
  async getByType(feedbackType: FeedbackType): Promise<CustomerFeedback[]> {
    return this.findAll({ feedbackType });
  }

  /**
   * Gets feedback for a project
   *
   * @param projectId - Project ID
   * @returns Promise<CustomerFeedback[]> - Project feedback
   *
   * @example
   * const feedback = await CustomerFeedbackModel.getByProject(1);
   */
  async getByProject(projectId: number): Promise<CustomerFeedback[]> {
    return this.findAll({ projectId });
  }

  /**
   * Gets Net Promoter Score (NPS) statistics
   *
   * @returns Promise<any> - NPS statistics
   *
   * @example
   * const nps = await CustomerFeedbackModel.getNPSStatistics();
   */
  async getNPSStatistics(): Promise<any> {
    const results = await this.db(this.tableName)
      .whereNotNull("recommendation_likelihood")
      .select("recommendation_likelihood");

    let promoters = 0;
    let passives = 0;
    let detractors = 0;

    results.forEach((row: any) => {
      const score = row.recommendation_likelihood;
      if (score >= 9) promoters++;
      else if (score >= 7) passives++;
      else detractors++;
    });

    const total = results.length;
    const npsScore = total > 0 ? ((promoters - detractors) / total) * 100 : 0;

    return {
      npsScore: Math.round(npsScore * 10) / 10,
      promoters,
      passives,
      detractors,
      total,
      promotersPercent:
        total > 0 ? Math.round((promoters / total) * 1000) / 10 : 0,
      passivesPercent:
        total > 0 ? Math.round((passives / total) * 1000) / 10 : 0,
      detractorsPercent:
        total > 0 ? Math.round((detractors / total) * 1000) / 10 : 0,
    };
  }

  /**
   * Gets average satisfaction score
   *
   * @param feedbackType - Optional feedback type filter
   * @returns Promise<number | null> - Average satisfaction score
   *
   * @example
   * const avgScore = await CustomerFeedbackModel.getAverageSatisfaction();
   */
  async getAverageSatisfaction(
    feedbackType?: FeedbackType
  ): Promise<number | null> {
    let query = this.db(this.tableName).whereNotNull("overall_satisfaction");

    if (feedbackType) {
      query = query.where({ feedback_type: feedbackType });
    }

    const result = await query.avg("overall_satisfaction as avg").first();

    return result?.avg ? parseFloat(result.avg) : null;
  }

  /**
   * Gets feedback statistics by type
   *
   * @returns Promise<Record<string, any>> - Statistics by type
   *
   * @example
   * const stats = await CustomerFeedbackModel.getStatisticsByType();
   */
  async getStatisticsByType(): Promise<Record<string, any>> {
    const results = await this.db(this.tableName)
      .select("feedback_type")
      .count("* as count")
      .avg("overall_satisfaction as avg_satisfaction")
      .avg("recommendation_likelihood as avg_recommendation")
      .groupBy("feedback_type");

    const stats: Record<string, any> = {};
    results.forEach((row: any) => {
      stats[row.feedback_type] = {
        count: Number(row.count),
        avgSatisfaction: row.avg_satisfaction
          ? parseFloat(row.avg_satisfaction)
          : null,
        avgRecommendation: row.avg_recommendation
          ? parseFloat(row.avg_recommendation)
          : null,
      };
    });

    return stats;
  }

  /**
   * Gets recent feedback
   *
   * @param limit - Maximum number of feedback items
   * @returns Promise<CustomerFeedback[]> - Recent feedback
   *
   * @example
   * const recent = await CustomerFeedbackModel.getRecent(10);
   */
  async getRecent(limit: number = 10): Promise<CustomerFeedback[]> {
    const feedback = await this.db(this.tableName)
      .orderBy("created_at", "desc")
      .limit(limit);

    return feedback.map(this.mapToEntity);
  }

  /**
   * Gets positive feedback (satisfaction >= 8)
   *
   * @param limit - Maximum number of feedback items
   * @returns Promise<CustomerFeedback[]> - Positive feedback
   *
   * @example
   * const positive = await CustomerFeedbackModel.getPositive(5);
   */
  async getPositive(limit?: number): Promise<CustomerFeedback[]> {
    let query = this.db(this.tableName)
      .where("overall_satisfaction", ">=", 8)
      .orderBy("overall_satisfaction", "desc");

    if (limit) {
      query = query.limit(limit);
    }

    const feedback = await query;
    return feedback.map(this.mapToEntity);
  }

  /**
   * Gets negative feedback (satisfaction <= 5)
   *
   * @param limit - Maximum number of feedback items
   * @returns Promise<CustomerFeedback[]> - Negative feedback
   *
   * @example
   * const negative = await CustomerFeedbackModel.getNegative();
   */
  async getNegative(limit?: number): Promise<CustomerFeedback[]> {
    let query = this.db(this.tableName)
      .where("overall_satisfaction", "<=", 5)
      .orderBy("overall_satisfaction", "asc");

    if (limit) {
      query = query.limit(limit);
    }

    const feedback = await query;
    return feedback.map(this.mapToEntity);
  }

  /**
   * Maps database record to CustomerFeedback entity
   *
   * @param record - Database record
   * @returns CustomerFeedback entity
   *
   * @protected
   */
  protected mapToEntity(record: any): CustomerFeedback {
    return {
      id: record.id,
      fullName: record.full_name,
      email: record.email,
      phone: record.phone,
      feedbackType: record.feedback_type as FeedbackType,
      overallSatisfaction: record.overall_satisfaction,
      recommendationLikelihood: record.recommendation_likelihood,
      feedbackComments: record.feedback_comments,
      suggestions: record.suggestions,
      projectId: record.project_id,
      relatedEvent: record.related_event,
      language: record.language as FeedbackLanguage,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new CustomerFeedbackModel();
