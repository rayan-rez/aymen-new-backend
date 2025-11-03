/**
 * Blog Post Section, Commercial Property, and Feedback Models
 * Combined file for related content management models
 *
 * @module models/content-management
 */

import {
  BaseModel,
  AdvancedQueryOptions,
  PaginatedResult,
  DatabaseRecord,
} from "../base";
import { generateSlug } from "../base/helpers";
import { Knex } from "knex";

// ============================================================================
// BLOG POST SECTION MODEL
// ============================================================================

export interface BlogPostSection {
  id: number;
  blogPostId: number;
  sectionTitle: string | null;
  sectionContent: string;
  sectionImageUrl: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSectionDto {
  blogPostId: number;
  sectionTitle?: string;
  sectionContent: string;
  sectionImageUrl?: string;
  displayOrder?: number;
}

export interface UpdateSectionDto extends Partial<CreateSectionDto> {}

export class BlogPostSectionModel extends BaseModel<
  BlogPostSection,
  CreateSectionDto,
  UpdateSectionDto
> {
  protected tableName = "blog_post_sections";
  protected primaryKey = "id";

  protected config = {
    softDelete: false,
    timestamps: true,
    defaultSortColumn: "display_order",
    defaultSortOrder: "asc" as const,
    searchableColumns: ["section_title", "section_content"],
    fillable: [
      "blogPostId",
      "sectionTitle",
      "sectionContent",
      "sectionImageUrl",
      "displayOrder",
    ],
    guarded: ["id", "createdAt", "updatedAt"],
  };

  async findByBlogPost(
    blogPostId: number,
    trx?: Knex.Transaction
  ): Promise<BlogPostSection[]> {
    const connection = trx || this.db;

    const records = await connection(this.tableName)
      .where({ blog_post_id: blogPostId })
      .orderBy("display_order", "asc");

    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  async reorderSections(
    blogPostId: number,
    sectionIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || this.db;

    await connection.transaction(async (localTrx) => {
      const useTrx = trx || localTrx;

      for (let i = 0; i < sectionIds.length; i++) {
        await useTrx(this.tableName)
          .where({ id: sectionIds[i], blog_post_id: blogPostId })
          .update({ display_order: i });
      }
    });

    return true;
  }

  protected mapToEntity(record: DatabaseRecord): BlogPostSection {
    return {
      id: record.id,
      blogPostId: record.blog_post_id,
      sectionTitle: record.section_title,
      sectionContent: record.section_content,
      sectionImageUrl: record.section_image_url,
      displayOrder: record.display_order || 0,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

// ============================================================================
// COMMERCIAL PROPERTY MODEL
// ============================================================================

export enum CommercialPropertyType {
  OFFICE = "office",
  SHOP = "shop",
  WAREHOUSE = "warehouse",
  SHOWROOM = "showroom",
  RESTAURANT = "restaurant",
  MIXED_USE = "mixed_use",
}

export enum CommercialPropertyStatus {
  AVAILABLE = "available",
  RENTED = "rented",
  SOLD = "sold",
}

export interface CommercialProperty {
  id: number;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string;
  cardDescription: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  locationId: number | null;
  propertyType: CommercialPropertyType;
  areaSqm: number | null;
  price: number | null;
  status: CommercialPropertyStatus;
  mainImageUrl: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  location?: any;
}

export interface CreateCommercialPropertyDto {
  title: string;
  slug?: string;
  subtitle?: string;
  description: string;
  cardDescription?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  locationId?: number;
  propertyType: CommercialPropertyType;
  areaSqm?: number;
  price?: number;
  status?: CommercialPropertyStatus;
  mainImageUrl?: string;
  isFeatured?: boolean;
  isPublished?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateCommercialPropertyDto
  extends Partial<CreateCommercialPropertyDto> {}

export interface CommercialPropertyQueryOptions extends AdvancedQueryOptions {
  propertyType?: CommercialPropertyType | CommercialPropertyType[];
  status?: CommercialPropertyStatus | CommercialPropertyStatus[];
  locationId?: number | number[];
  isFeatured?: boolean;
  isPublished?: boolean;
  minArea?: number;
  maxArea?: number;
  minPrice?: number;
  maxPrice?: number;
  hasCoordinates?: boolean;
}

export class CommercialPropertyModel extends BaseModel<
  CommercialProperty,
  CreateCommercialPropertyDto,
  UpdateCommercialPropertyDto
> {
  protected tableName = "commercial_properties";
  protected primaryKey = "id";

  protected config = {
    softDelete: true,
    timestamps: true,
    defaultSortColumn: "created_at",
    defaultSortOrder: "desc" as const,
    searchableColumns: ["title", "description", "address"],
    fillable: [
      "title",
      "slug",
      "subtitle",
      "description",
      "cardDescription",
      "address",
      "latitude",
      "longitude",
      "locationId",
      "propertyType",
      "areaSqm",
      "price",
      "status",
      "mainImageUrl",
      "isFeatured",
      "isPublished",
      "metaTitle",
      "metaDescription",
    ],
    guarded: ["id", "createdAt", "updatedAt", "deletedAt"],
  };

  protected relations = {
    location: {
      type: "belongsTo" as const,
      model: () => require("./location.model").default,
      foreignKey: "locationId",
      localKey: "id",
    },
  };

  protected async beforeCreate(
    data: CreateCommercialPropertyDto
  ): Promise<CreateCommercialPropertyDto> {
    if (!data.slug) {
      data.slug = generateSlug(data.title);
    }

    const existing = await this.findOne({ slug: data.slug });
    if (existing) {
      data.slug = `${data.slug}-${Date.now()}`;
    }

    if (!data.status) {
      data.status = CommercialPropertyStatus.AVAILABLE;
    }

    return data;
  }

  async findByType(
    propertyType: CommercialPropertyType,
    options: CommercialPropertyQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<CommercialProperty[]> {
    return this.findProperties({ ...options, propertyType }, trx);
  }

  async findAvailable(
    options: CommercialPropertyQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<CommercialProperty[]> {
    return this.findProperties(
      {
        ...options,
        status: CommercialPropertyStatus.AVAILABLE,
        isPublished: true,
      },
      trx
    );
  }

  async findProperties(
    options: CommercialPropertyQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<CommercialProperty[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    query = this.applyPropertyFilters(query, options);

    const records = await query;
    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  private applyPropertyFilters(
    query: Knex.QueryBuilder,
    options: CommercialPropertyQueryOptions
  ): Knex.QueryBuilder {
    if (options.propertyType) {
      if (Array.isArray(options.propertyType)) {
        query = query.whereIn("property_type", options.propertyType);
      } else {
        query = query.where("property_type", options.propertyType);
      }
    }

    if (options.status) {
      if (Array.isArray(options.status)) {
        query = query.whereIn("status", options.status);
      } else {
        query = query.where("status", options.status);
      }
    }

    if (options.locationId) {
      if (Array.isArray(options.locationId)) {
        query = query.whereIn("location_id", options.locationId);
      } else {
        query = query.where("location_id", options.locationId);
      }
    }

    if (options.isFeatured !== undefined) {
      query = query.where("is_featured", options.isFeatured);
    }

    if (options.isPublished !== undefined) {
      query = query.where("is_published", options.isPublished);
    }

    if (options.minArea !== undefined) {
      query = query.where("area_sqm", ">=", options.minArea);
    }

    if (options.maxArea !== undefined) {
      query = query.where("area_sqm", "<=", options.maxArea);
    }

    if (options.minPrice !== undefined) {
      query = query.where("price", ">=", options.minPrice);
    }

    if (options.maxPrice !== undefined) {
      query = query.where("price", "<=", options.maxPrice);
    }

    if (options.hasCoordinates) {
      query = query.whereNotNull("latitude").whereNotNull("longitude");
    }

    return query;
  }

  protected mapToEntity(record: DatabaseRecord): CommercialProperty {
    return {
      id: record.id,
      title: record.title,
      slug: record.slug,
      subtitle: record.subtitle,
      description: record.description,
      cardDescription: record.card_description,
      address: record.address,
      latitude: record.latitude ? Number(record.latitude) : null,
      longitude: record.longitude ? Number(record.longitude) : null,
      locationId: record.location_id,
      propertyType: record.property_type as CommercialPropertyType,
      areaSqm: record.area_sqm ? Number(record.area_sqm) : null,
      price: record.price ? Number(record.price) : null,
      status: record.status as CommercialPropertyStatus,
      mainImageUrl: record.main_image_url,
      isFeatured: Boolean(record.is_featured),
      isPublished: Boolean(record.is_published),
      metaTitle: record.meta_title,
      metaDescription: record.meta_description,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

// ============================================================================
// CUSTOMER FEEDBACK MODEL
// ============================================================================

export enum FeedbackType {
  EVENT_FEEDBACK = "event_feedback",
  PROPERTY_VISIT = "property_visit",
  CUSTOMER_SERVICE = "customer_service",
  GENERAL = "general",
  KIOSK = "kiosk",
}

export enum FeedbackLanguage {
  FR = "fr",
  AR = "ar",
  EN = "en",
}

export enum SentimentType {
  POSITIVE = "positive",
  NEUTRAL = "neutral",
  NEGATIVE = "negative",
}

export interface CustomerFeedback {
  id: number;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  feedbackType: FeedbackType;
  overallSatisfaction: number | null;
  recommendationLikelihood: number | null;
  feedbackComments: string | null;
  suggestions: string | null;
  projectId: number | null;
  relatedEvent: string | null;
  language: FeedbackLanguage;
  sentiment: SentimentType;
  sentimentScore: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  project?: any;
}

export interface CreateFeedbackDto {
  fullName?: string;
  email?: string;
  phone?: string;
  feedbackType: FeedbackType;
  overallSatisfaction?: number;
  recommendationLikelihood?: number;
  feedbackComments?: string;
  suggestions?: string;
  projectId?: number;
  relatedEvent?: string;
  language?: FeedbackLanguage;
  sentiment?: SentimentType;
  sentimentScore?: number;
}

export interface UpdateFeedbackDto extends Partial<CreateFeedbackDto> {}

export interface FeedbackQueryOptions extends AdvancedQueryOptions {
  feedbackType?: FeedbackType | FeedbackType[];
  sentiment?: SentimentType | SentimentType[];
  language?: FeedbackLanguage | FeedbackLanguage[];
  projectId?: number | number[];
  minSatisfaction?: number;
  maxSatisfaction?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export class CustomerFeedbackModel extends BaseModel<
  CustomerFeedback,
  CreateFeedbackDto,
  UpdateFeedbackDto
> {
  protected tableName = "customer_feedback";
  protected primaryKey = "id";

  protected config = {
    softDelete: true,
    timestamps: true,
    defaultSortColumn: "created_at",
    defaultSortOrder: "desc" as const,
    searchableColumns: [
      "full_name",
      "email",
      "feedback_comments",
      "suggestions",
    ],
    fillable: [
      "fullName",
      "email",
      "phone",
      "feedbackType",
      "overallSatisfaction",
      "recommendationLikelihood",
      "feedbackComments",
      "suggestions",
      "projectId",
      "relatedEvent",
      "language",
      "sentiment",
      "sentimentScore",
    ],
    guarded: ["id", "createdAt", "updatedAt", "deletedAt"],
  };

  protected relations = {
    project: {
      type: "belongsTo" as const,
      model: () => require("./project.model").default,
      foreignKey: "projectId",
      localKey: "id",
    },
  };

  protected async beforeCreate(
    data: CreateFeedbackDto
  ): Promise<CreateFeedbackDto> {
    if (!data.language) {
      data.language = FeedbackLanguage.FR;
    }

    if (!data.sentiment && data.feedbackComments) {
      data.sentiment = this.detectSentiment(data.feedbackComments);
    }

    return data;
  }

  async findByType(
    feedbackType: FeedbackType,
    options: FeedbackQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<CustomerFeedback[]> {
    return this.findFeedback({ ...options, feedbackType }, trx);
  }

  async findByProject(
    projectId: number,
    options: FeedbackQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<CustomerFeedback[]> {
    return this.findFeedback({ ...options, projectId }, trx);
  }

  async findFeedback(
    options: FeedbackQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<CustomerFeedback[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    query = this.applyFeedbackFilters(query, options);

    const records = await query;
    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  async getStatistics(
    dateFrom?: Date,
    dateTo?: Date,
    trx?: Knex.Transaction
  ): Promise<any> {
    const connection = trx || this.db;
    let query = connection(this.tableName).whereNull("deleted_at");

    if (dateFrom) {
      query = query.where("created_at", ">=", dateFrom);
    }
    if (dateTo) {
      query = query.where("created_at", "<=", dateTo);
    }

    const [stats] = await query.select(
      connection.raw("COUNT(*) as total"),
      connection.raw("AVG(overall_satisfaction) as avgSatisfaction"),
      connection.raw("AVG(recommendation_likelihood) as avgNPS"),
      connection.raw(
        "COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) as positive"
      ),
      connection.raw(
        "COUNT(CASE WHEN sentiment = 'neutral' THEN 1 END) as neutral"
      ),
      connection.raw(
        "COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) as negative"
      )
    );

    return {
      total: Number(stats.total),
      avgSatisfaction: stats.avgSatisfaction
        ? Number(stats.avgSatisfaction)
        : null,
      avgNPS: stats.avgNPS ? Number(stats.avgNPS) : null,
      sentimentDistribution: {
        positive: Number(stats.positive),
        neutral: Number(stats.neutral),
        negative: Number(stats.negative),
      },
    };
  }

  private detectSentiment(text: string): SentimentType {
    const lowerText = text.toLowerCase();
    const positiveWords = [
      "excellent",
      "great",
      "good",
      "happy",
      "satisfied",
      "parfait",
      "bien",
      "content",
    ];
    const negativeWords = [
      "bad",
      "poor",
      "terrible",
      "disappointed",
      "mauvais",
      "déçu",
    ];

    const positiveCount = positiveWords.filter((word) =>
      lowerText.includes(word)
    ).length;
    const negativeCount = negativeWords.filter((word) =>
      lowerText.includes(word)
    ).length;

    if (positiveCount > negativeCount) return SentimentType.POSITIVE;
    if (negativeCount > positiveCount) return SentimentType.NEGATIVE;
    return SentimentType.NEUTRAL;
  }

  private applyFeedbackFilters(
    query: Knex.QueryBuilder,
    options: FeedbackQueryOptions
  ): Knex.QueryBuilder {
    if (options.feedbackType) {
      if (Array.isArray(options.feedbackType)) {
        query = query.whereIn("feedback_type", options.feedbackType);
      } else {
        query = query.where("feedback_type", options.feedbackType);
      }
    }

    if (options.sentiment) {
      if (Array.isArray(options.sentiment)) {
        query = query.whereIn("sentiment", options.sentiment);
      } else {
        query = query.where("sentiment", options.sentiment);
      }
    }

    if (options.language) {
      if (Array.isArray(options.language)) {
        query = query.whereIn("language", options.language);
      } else {
        query = query.where("language", options.language);
      }
    }

    if (options.projectId) {
      if (Array.isArray(options.projectId)) {
        query = query.whereIn("project_id", options.projectId);
      } else {
        query = query.where("project_id", options.projectId);
      }
    }

    if (options.minSatisfaction !== undefined) {
      query = query.where(
        "overall_satisfaction",
        ">=",
        options.minSatisfaction
      );
    }

    if (options.maxSatisfaction !== undefined) {
      query = query.where(
        "overall_satisfaction",
        "<=",
        options.maxSatisfaction
      );
    }

    if (options.dateFrom) {
      query = query.where("created_at", ">=", options.dateFrom);
    }

    if (options.dateTo) {
      query = query.where("created_at", "<=", options.dateTo);
    }

    return query;
  }

  protected mapToEntity(record: DatabaseRecord): CustomerFeedback {
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
      sentiment: record.sentiment as SentimentType,
      sentimentScore: record.sentiment_score
        ? Number(record.sentiment_score)
        : null,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

// ============================================================================
// TRADE SHOW FEEDBACK MODEL
// ============================================================================

export interface TradeShowFeedback {
  id: number;
  companySatisfaction: number;
  companyRecommendation: number;
  eventSatisfaction: number;
  eventRecommendation: number;
  positiveFeedback: string | null;
  improvementSuggestions: string | null;
  tradeShowName: string;
  tradeShowDate: Date;
  language: FeedbackLanguage;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateTradeShowFeedbackDto {
  companySatisfaction: number;
  companyRecommendation: number;
  eventSatisfaction: number;
  eventRecommendation: number;
  positiveFeedback?: string;
  improvementSuggestions?: string;
  tradeShowName: string;
  tradeShowDate: Date;
  language?: FeedbackLanguage;
}

export interface UpdateTradeShowFeedbackDto
  extends Partial<CreateTradeShowFeedbackDto> {}

export class TradeShowFeedbackModel extends BaseModel<
  TradeShowFeedback,
  CreateTradeShowFeedbackDto,
  UpdateTradeShowFeedbackDto
> {
  protected tableName = "trade_show_feedback";
  protected primaryKey = "id";

  protected config = {
    softDelete: true,
    timestamps: true,
    defaultSortColumn: "created_at",
    defaultSortOrder: "desc" as const,
    searchableColumns: [
      "positive_feedback",
      "improvement_suggestions",
      "trade_show_name",
    ],
    fillable: [
      "companySatisfaction",
      "companyRecommendation",
      "eventSatisfaction",
      "eventRecommendation",
      "positiveFeedback",
      "improvementSuggestions",
      "tradeShowName",
      "tradeShowDate",
      "language",
    ],
    guarded: ["id", "createdAt", "updatedAt", "deletedAt"],
  };

  protected async beforeCreate(
    data: CreateTradeShowFeedbackDto
  ): Promise<CreateTradeShowFeedbackDto> {
    if (!data.language) {
      data.language = FeedbackLanguage.FR;
    }

    // Validate scores
    const scores = [
      data.companySatisfaction,
      data.companyRecommendation,
      data.eventSatisfaction,
      data.eventRecommendation,
    ];

    for (const score of scores) {
      if (score < 0 || score > 10) {
        throw new Error("All scores must be between 0 and 10");
      }
    }

    return data;
  }

  async findByTradeShow(
    tradeShowName: string,
    tradeShowDate?: Date,
    trx?: Knex.Transaction
  ): Promise<TradeShowFeedback[]> {
    const connection = trx || this.db;
    let query = connection(this.tableName)
      .where({ trade_show_name: tradeShowName })
      .whereNull("deleted_at");

    if (tradeShowDate) {
      query = query.where({ trade_show_date: tradeShowDate });
    }

    const records = await query;
    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  async getTradeShowStatistics(
    tradeShowName: string,
    tradeShowDate?: Date,
    trx?: Knex.Transaction
  ): Promise<any> {
    const connection = trx || this.db;
    let query = connection(this.tableName)
      .where({ trade_show_name: tradeShowName })
      .whereNull("deleted_at");

    if (tradeShowDate) {
      query = query.where({ trade_show_date: tradeShowDate });
    }

    const [stats] = await query.select(
      connection.raw("COUNT(*) as total"),
      connection.raw("AVG(company_satisfaction) as avgCompanySatisfaction"),
      connection.raw("AVG(company_recommendation) as avgCompanyRecommendation"),
      connection.raw("AVG(event_satisfaction) as avgEventSatisfaction"),
      connection.raw("AVG(event_recommendation) as avgEventRecommendation")
    );

    return {
      total: Number(stats.total),
      company: {
        avgSatisfaction: Number(stats.avgCompanySatisfaction),
        avgRecommendation: Number(stats.avgCompanyRecommendation),
      },
      event: {
        avgSatisfaction: Number(stats.avgEventSatisfaction),
        avgRecommendation: Number(stats.avgEventRecommendation),
      },
    };
  }

  protected mapToEntity(record: DatabaseRecord): TradeShowFeedback {
    return {
      id: record.id,
      companySatisfaction: Number(record.company_satisfaction),
      companyRecommendation: Number(record.company_recommendation),
      eventSatisfaction: Number(record.event_satisfaction),
      eventRecommendation: Number(record.event_recommendation),
      positiveFeedback: record.positive_feedback,
      improvementSuggestions: record.improvement_suggestions,
      tradeShowName: record.trade_show_name,
      tradeShowDate: new Date(record.trade_show_date),
      language: record.language as FeedbackLanguage,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

// Export all model instances
export const blogPostSectionModel = new BlogPostSectionModel();
export const commercialPropertyModel = new CommercialPropertyModel();
export const customerFeedbackModel = new CustomerFeedbackModel();
export const tradeShowFeedbackModel = new TradeShowFeedbackModel();

export default {
  blogPostSectionModel,
  commercialPropertyModel,
  customerFeedbackModel,
  tradeShowFeedbackModel,
};
