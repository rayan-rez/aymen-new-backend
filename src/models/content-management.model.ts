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
} from "./base";
import { generateSlug } from "@/database/helpers";
import PhotoModel, { PhotoableType, Photo } from "./photo.model";
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
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  location?: any;
  photos?: Photo[];
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
  includePhotos?: boolean;
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
      "isPublished"
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

  /**
   * Loads photos for a commercial property
   */
  async loadPhotos(
    propertyId: number,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    return PhotoModel.getForEntity(
      PhotoableType.COMMERCIAL_PROPERTY,
      propertyId,
      {},
      trx
    );
  }

  /**
   * Loads photos for multiple properties (optimized)
   */
  private async loadPhotosForMany(
    propertyIds: number[],
    trx?: Knex.Transaction
  ): Promise<Map<number, Photo[]>> {
    if (propertyIds.length === 0) return new Map();

    const photos = await PhotoModel.findPhotos(
      {
        polymorphicType: PhotoableType.COMMERCIAL_PROPERTY,
        polymorphicId: propertyIds,
      },
      trx
    );

    const photosByProperty = new Map<number, Photo[]>();
    for (const photo of photos) {
      if (!photosByProperty.has(photo.photoableId)) {
        photosByProperty.set(photo.photoableId, []);
      }
      photosByProperty.get(photo.photoableId)!.push(photo);
    }

    return photosByProperty;
  }

  /**
   * Find property by ID with photos
   * NEW METHOD
   */
  async findByIdWithPhotos(
    id: number,
    trx?: Knex.Transaction
  ): Promise<CommercialProperty | null> {
    const property = await this.findById(id, {}, trx);
    if (!property) return null;

    const photos = await this.loadPhotos(id, trx);
    return {
      ...property,
      photos,
    };
  }

  /**
   * Validates media before publishing
   * NEW METHOD
   */
  async validateMediaForPublishing(
    propertyId: number,
    trx?: Knex.Transaction
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for at least 3 photos
    const photoCount = await PhotoModel.countForEntity(
      PhotoableType.COMMERCIAL_PROPERTY,
      propertyId,
      trx
    );

    if (photoCount < 3) {
      errors.push("At least 3 photos are required");
    }

    // Check for cover photo
    const coverPhoto = await PhotoModel.getCoverPhoto(
      PhotoableType.COMMERCIAL_PROPERTY,
      propertyId,
      trx
    );

    if (!coverPhoto) {
      errors.push("Cover photo is required");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

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

    // Validate if publishing
    if (data.isPublished && !data.mainImageUrl) {
      throw new Error("Published properties must have a main image");
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
    let entities = records.map((r: DatabaseRecord) => this.mapToEntity(r));

    // Load photos if requested
    if (options.includePhotos) {
      const propertyIds = entities.map((e: DatabaseRecord) => e.id);
      const photosByProperty = await this.loadPhotosForMany(propertyIds, trx);

      entities = entities.map((entity: DatabaseRecord) => ({
        ...entity,
        photos: photosByProperty.get(entity.id) || [],
      }));
    }

    return entities;
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

export interface CustomerFeedback {
  id: number;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  feedbackType: FeedbackType;
  projectId: number | null;
  relatedEvent: string | null;
  language: FeedbackLanguage;
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
  projectId?: number;
  relatedEvent?: string;
  language?: FeedbackLanguage;
}

export interface UpdateFeedbackDto extends Partial<CreateFeedbackDto> {}

export interface FeedbackQueryOptions extends AdvancedQueryOptions {
  feedbackType?: FeedbackType | FeedbackType[];
  language?: FeedbackLanguage | FeedbackLanguage[];
  projectId?: number | number[];
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
      "email"
    ],
    fillable: [
      "fullName",
      "email",
      "phone",
      "feedbackType",
      "projectId",
      "relatedEvent",
      "language"
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
      projectId: record.project_id,
      relatedEvent: record.related_event,
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

export default {
  blogPostSectionModel,
  commercialPropertyModel,
  customerFeedbackModel
};
