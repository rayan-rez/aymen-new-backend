/**
 * Project Model
 * 
 * Manages real estate development projects with full support for:
 * - Related entities (apartments, features, media)
 * - Advanced filtering and search
 * - Publishing workflow
 * - Analytics integration
 * - Transaction safety
 * 
 * @module models/project.model
 */

import { BaseModel, AdvancedQueryOptions, PaginatedResult } from "../base";
import { Knex } from "knex";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Project type enumeration
 */
export enum ProjectType {
  RESIDENTIAL = "residential",
  COMMERCIAL = "commercial",
  MIXED_USE = "mixed_use",
  LUXURY = "luxury",
  AFFORDABLE = "affordable",
}

/**
 * Project status enumeration
 */
export enum ProjectStatus {
  PLANNING = "planning",
  UNDER_CONSTRUCTION = "under_construction",
  COMPLETED = "completed",
  SOLD_OUT = "sold_out",
}

/**
 * Project entity interface
 */
export interface Project {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  descriptionSecondary: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  locationId: number | null;
  projectType: ProjectType;
  status: ProjectStatus;
  completionPercentage: number;
  estimatedCompletionDate: Date | null;
  actualCompletionDate: Date | null;
  totalBlocks: number | null;
  totalUnits: number | null;
  priceMin: number | null;
  priceMax: number | null;
  mainPhotoUrl: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Virtual relations (loaded dynamically)
  location?: any;
  apartments?: any[];
  features?: any[];
  media?: any[];
}

/**
 * Create project DTO
 */
export interface CreateProjectDto {
  name: string;
  slug: string;
  description?: string | null;
  descriptionSecondary?: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  locationId?: number | null;
  projectType?: ProjectType;
  status?: ProjectStatus;
  completionPercentage?: number;
  estimatedCompletionDate?: Date | null;
  actualCompletionDate?: Date | null;
  totalBlocks?: number | null;
  totalUnits?: number | null;
  mainPhotoUrl?: string | null;
  isFeatured?: boolean;
  isPublished?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

/**
 * Update project DTO
 */
export interface UpdateProjectDto extends Partial<CreateProjectDto> {}

/**
 * Project query options
 */
export interface ProjectQueryOptions extends AdvancedQueryOptions {
  projectType?: ProjectType | ProjectType[];
  status?: ProjectStatus | ProjectStatus[];
  isFeatured?: boolean;
  isPublished?: boolean;
  locationId?: number | number[];
  minPrice?: number;
  maxPrice?: number;
  minCompletion?: number;
  maxCompletion?: number;
  hasCoordinates?: boolean;
}

/**
 * Project with statistics
 */
export interface ProjectWithStats extends Project {
  stats: {
    totalApartments: number;
    availableApartments: number;
    reservedApartments: number;
    soldApartments: number;
    soldPercentage: number;
    mediaCount: number;
    featuresCount: number;
  };
}

// ============================================================================
// PROJECT MODEL CLASS
// ============================================================================

export class ProjectModel extends BaseModel<
  Project,
  CreateProjectDto,
  UpdateProjectDto
> {
  protected tableName = "projects";
  protected primaryKey = "id";

  protected config = {
    softDelete: true,
    timestamps: true,
    defaultSortColumn: "created_at",
    defaultSortOrder: "desc" as const,
    searchableColumns: ["name", "description", "description_secondary", "address"],
    hiddenFields: [],
    fillable: [
      "name",
      "slug",
      "description",
      "descriptionSecondary",
      "address",
      "latitude",
      "longitude",
      "locationId",
      "projectType",
      "status",
      "completionPercentage",
      "estimatedCompletionDate",
      "actualCompletionDate",
      "totalBlocks",
      "totalUnits",
      "priceMin",
      "priceMax",
      "mainPhotoUrl",
      "isFeatured",
      "isPublished",
      "metaTitle",
      "metaDescription",
    ],
    guarded: ["id", "createdAt", "updatedAt", "deletedAt"],
  };

  // Define relations
  protected relations = {
    location: {
      type: "belongsTo" as const,
      model: () => require("./location.model").default,
      foreignKey: "locationId",
      localKey: "id",
    },
    apartments: {
      type: "hasMany" as const,
      model: () => require("./apartment.model").default,
      foreignKey: "projectId",
      localKey: "id",
    },
  };

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Before create hook - validate and transform data
   */
  protected async beforeCreate(data: CreateProjectDto): Promise<CreateProjectDto> {
    // Generate slug if not provided
    if (!data.slug && data.name) {
      data.slug = this.generateSlug(data.name);
    }

    // Validate coordinates
    if (data.latitude !== undefined || data.longitude !== undefined) {
      this.validateCoordinates(data.latitude, data.longitude);
    }

    // Validate completion percentage
    if (data.completionPercentage !== undefined) {
      this.validateCompletionPercentage(data.completionPercentage);
    }

    // Ensure published projects have required fields
    if (data.isPublished) {
      if (!data.mainPhotoUrl || !data.description) {
        throw new Error(
          "Published projects must have mainPhotoUrl and description"
        );
      }
    }

    return data;
  }

  /**
   * After create hook - log creation
   */
  protected async afterCreate(entity: Project): Promise<void> {
    console.log(`✅ Project created: ${entity.name} (ID: ${entity.id})`);
  }

  /**
   * Before update hook - validate changes
   */
  protected async beforeUpdate(
    id: number,
    data: UpdateProjectDto
  ): Promise<UpdateProjectDto> {
    // Validate coordinates if being updated
    if (data.latitude !== undefined || data.longitude !== undefined) {
      this.validateCoordinates(data.latitude, data.longitude);
    }

    // Validate completion percentage
    if (data.completionPercentage !== undefined) {
      this.validateCompletionPercentage(data.completionPercentage);
    }

    // If publishing, check required fields
    if (data.isPublished) {
      const existing = await this.findById(id);
      if (existing) {
        const mainPhotoUrl = data.mainPhotoUrl ?? existing.mainPhotoUrl;
        const description = data.description ?? existing.description;

        if (!mainPhotoUrl || !description) {
          throw new Error(
            "Published projects must have mainPhotoUrl and description"
          );
        }
      }
    }

    return data;
  }

  /**
   * Before delete hook - check dependencies
   */
  protected async beforeDelete(id: number): Promise<void> {
    // Check if project has apartments
    const apartmentCount = await this.db("apartments")
      .where({ project_id: id })
      .whereNull("deleted_at")
      .count("* as count")
      .first();

    if (apartmentCount && Number(apartmentCount.count) > 0) {
      console.warn(
        `⚠️ Project ${id} has ${apartmentCount.count} apartments. They will be cascade deleted.`
      );
    }
  }

  // ============================================================================
  // CUSTOM QUERY METHODS
  // ============================================================================

  /**
   * Finds projects with custom filters
   */
  async findProjects(
    options: ProjectQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Project[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    // Apply project-specific filters
    query = this.applyProjectFilters(query, options);

    const records = await query;
    let entities = records.map((r:any) => this.mapToEntity(r));

    // Load relations if requested
    if (options.relations && options.relations.length > 0) {
      entities = await this.loadRelationsForMany(entities, options.relations, trx);
    }

    return entities;
  }

  /**
   * Finds published projects only
   */
  async findPublished(
    options: ProjectQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Project[]> {
    return this.findProjects({ ...options, isPublished: true }, trx);
  }

  /**
   * Finds featured projects
   */
  async findFeatured(
    options: ProjectQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Project[]> {
    return this.findProjects(
      { ...options, isPublished: true, isFeatured: true },
      trx
    );
  }

  /**
   * Finds projects by location
   */
  async findByLocation(
    locationId: number,
    options: ProjectQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Project[]> {
    return this.findProjects({ ...options, locationId }, trx);
  }

  /**
   * Finds projects by type
   */
  async findByType(
    projectType: ProjectType,
    options: ProjectQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Project[]> {
    return this.findProjects({ ...options, projectType }, trx);
  }

  /**
   * Finds projects by status
   */
  async findByStatus(
    status: ProjectStatus,
    options: ProjectQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Project[]> {
    return this.findProjects({ ...options, status }, trx);
  }

  /**
   * Finds projects with coordinates (for map display)
   */
  async findWithCoordinates(
    options: ProjectQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Project[]> {
    return this.findProjects({ ...options, hasCoordinates: true }, trx);
  }

  /**
   * Finds projects by price range
   */
  async findByPriceRange(
    minPrice: number,
    maxPrice: number,
    options: ProjectQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Project[]> {
    return this.findProjects({ ...options, minPrice, maxPrice }, trx);
  }

  /**
   * Finds projects by slug
   */
  async findBySlug(
    slug: string,
    options: { includeDeleted?: boolean; relations?: string[] } = {},
    trx?: Knex.Transaction
  ): Promise<Project | null> {
    return this.findOne({ slug }, options, trx);
  }

  /**
   * Full-text search on projects
   */
  async fullTextSearch(
    searchTerm: string,
    options: ProjectQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Project[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return this.findProjects(options, trx);
    }

    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    // Apply project-specific filters
    query = this.applyProjectFilters(query, options);

    // Use MySQL MATCH AGAINST for full-text search
    query = query.whereRaw(
      `MATCH(name, description, description_secondary) AGAINST(? IN BOOLEAN MODE)`,
      [`${searchTerm}*`]
    );

    // Order by relevance
    query = query.orderByRaw(
      `MATCH(name, description, description_secondary) AGAINST(? IN BOOLEAN MODE) DESC`,
      [`${searchTerm}*`]
    );

    const records = await query;
    return records.map((r:any) => this.mapToEntity(r));
  }

  /**
   * Gets paginated projects with custom filters
   */
  async paginateProjects(
    options: ProjectQueryOptions & { page: number; limit: number },
    trx?: Knex.Transaction
  ): Promise<PaginatedResult<Project>> {
    const { page, limit } = options;

    const [items, total] = await Promise.all([
      this.findProjects(options, trx),
      this.countProjects(options, trx),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Counts projects with filters
   */
  async countProjects(
    options: ProjectQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    // Apply soft delete filter
    if (!options.includeDeleted && this.config.softDelete) {
      query = query.whereNull("deleted_at");
    }

    // Apply project-specific filters
    query = this.applyProjectFilters(query, options);

    const result = await query.count(`${this.primaryKey} as count`).first();
    return result ? Number(result.count) : 0;
  }

  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================

  /**
   * Gets project with full statistics
   */
  async findWithStats(
    id: number,
    trx?: Knex.Transaction
  ): Promise<ProjectWithStats | null> {
    const project = await this.findById(id, {}, trx);
    if (!project) return null;

    const stats = await this.getProjectStats(id, trx);

    return {
      ...project,
      stats,
    };
  }

  /**
   * Gets project statistics
   */
  async getProjectStats(
    projectId: number,
    trx?: Knex.Transaction
  ): Promise<ProjectWithStats["stats"]> {
    const connection = trx || this.db;

    // Get apartment statistics
    const apartmentStats = await connection("apartments")
      .where({ project_id: projectId })
      .whereNull("deleted_at")
      .select(
        connection.raw("COUNT(*) as total"),
        connection.raw(
          "COUNT(CASE WHEN status = 'available' THEN 1 END) as available"
        ),
        connection.raw(
          "COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved"
        ),
        connection.raw("COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold")
      )
      .first();

    const total = Number(apartmentStats?.total || 0);
    const sold = Number(apartmentStats?.sold || 0);
    const soldPercentage = total > 0 ? Math.round((sold / total) * 100) : 0;

    // Get media count
    const mediaCount = await connection("project_media")
      .where({ project_id: projectId })
      .count("* as count")
      .first();

    // Get features count
    const featuresCount = await connection("project_features")
      .where({ project_id: projectId })
      .count("* as count")
      .first();

    return {
      totalApartments: total,
      availableApartments: Number(apartmentStats?.available || 0),
      reservedApartments: Number(apartmentStats?.reserved || 0),
      soldApartments: sold,
      soldPercentage,
      mediaCount: Number(mediaCount?.count || 0),
      featuresCount: Number(featuresCount?.count || 0)
    };
  }

  /**
   * Gets projects performance metrics
   */
  async getPerformanceMetrics(
    projectIds?: number[],
    trx?: Knex.Transaction
  ): Promise<any[]> {
    const connection = trx || this.db;

    let query = connection("v_project_metrics");

    if (projectIds && projectIds.length > 0) {
      query = query.whereIn("id", projectIds);
    }

    return query;
  }

  // ============================================================================
  // RELATIONSHIP MANAGEMENT
  // ============================================================================

  /**
   * Gets apartments for a project
   */
  async getApartments(
    projectId: number,
    filters: any = {},
    trx?: Knex.Transaction
  ): Promise<any[]> {
    const ApartmentModel = require("./apartment.model").default;
    return ApartmentModel.findWhere(
      { project_id: projectId, ...filters },
      false,
      trx
    );
  }

  /**
   * Gets features for a project
   */
  async getFeatures(
    projectId: number,
    trx?: Knex.Transaction
  ): Promise<any[]> {
    const connection = trx || this.db;

    return connection("project_features as pf")
      .join("features as f", "pf.feature_id", "f.id")
      .where("pf.project_id", projectId)
      .select(
        "f.*",
        "pf.feature_value",
        "pf.display_order as project_feature_order"
      )
      .orderBy("pf.display_order");
  }

  /**
   * Gets media for a project
   */
  async getMedia(
    projectId: number,
    mediaType?: string,
    trx?: Knex.Transaction
  ): Promise<any[]> {
    const connection = trx || this.db;

    let query = connection("project_media")
      .where({ project_id: projectId })
      .orderBy("display_order");

    if (mediaType) {
      query = query.where({ media_type: mediaType });
    }

    return query;
  }

  /**
   * Adds features to a project
   */
  async addFeatures(
    projectId: number,
    featureIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || this.db;

    const data = featureIds.map((featureId, index) => ({
      project_id: projectId,
      feature_id: featureId,
      display_order: index,
      created_at: connection.fn.now(),
      updated_at: connection.fn.now(),
    }));

    await connection("project_features").insert(data);
    return true;
  }

  /**
   * Removes features from a project
   */
  async removeFeatures(
    projectId: number,
    featureIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || this.db;

    await connection("project_features")
      .where({ project_id: projectId })
      .whereIn("feature_id", featureIds)
      .del();

    return true;
  }

  /**
   * Syncs features (replaces all features)
   */
  async syncFeatures(
    projectId: number,
    featureIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || this.db;

    await connection.transaction(async (localTrx) => {
      const useTrx = trx || localTrx;

      // Delete existing features
      await useTrx("project_features").where({ project_id: projectId }).del();

      // Insert new features
      if (featureIds.length > 0) {
        const data = featureIds.map((featureId, index) => ({
          project_id: projectId,
          feature_id: featureId,
          display_order: index,
          created_at: useTrx.fn.now(),
          updated_at: useTrx.fn.now(),
        }));

        await useTrx("project_features").insert(data);
      }
    });

    return true;
  }

  // ============================================================================
  // PUBLISHING WORKFLOW
  // ============================================================================

  /**
   * Publishes a project
   */
  async publish(id: number, trx?: Knex.Transaction): Promise<Project | null> {
    // Validate project can be published
    const project = await this.findById(id, {}, trx);
    if (!project) {
      throw new Error("Project not found");
    }

    if (!project.mainPhotoUrl || !project.description) {
      throw new Error(
        "Project must have mainPhotoUrl and description to be published"
      );
    }

    return this.update(id, { isPublished: true } as UpdateProjectDto, trx);
  }

  /**
   * Unpublishes a project
   */
  async unpublish(id: number, trx?: Knex.Transaction): Promise<Project | null> {
    return this.update(id, { isPublished: false } as UpdateProjectDto, trx);
  }

  /**
   * Toggles featured status
   */
  async toggleFeatured(
    id: number,
    trx?: Knex.Transaction
  ): Promise<Project | null> {
    const project = await this.findById(id, {}, trx);
    if (!project) {
      throw new Error("Project not found");
    }

    return this.update(
      id,
      { isFeatured: !project.isFeatured } as UpdateProjectDto,
      trx
    );
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Applies project-specific filters to query
   */
  private applyProjectFilters(
    query: Knex.QueryBuilder,
    options: ProjectQueryOptions
  ): Knex.QueryBuilder {
    // Project type filter
    if (options.projectType) {
      if (Array.isArray(options.projectType)) {
        query = query.whereIn("project_type", options.projectType);
      } else {
        query = query.where("project_type", options.projectType);
      }
    }

    // Status filter
    if (options.status) {
      if (Array.isArray(options.status)) {
        query = query.whereIn("status", options.status);
      } else {
        query = query.where("status", options.status);
      }
    }

    // Featured filter
    if (options.isFeatured !== undefined) {
      query = query.where("is_featured", options.isFeatured);
    }

    // Published filter
    if (options.isPublished !== undefined) {
      query = query.where("is_published", options.isPublished);
    }

    // Location filter
    if (options.locationId) {
      if (Array.isArray(options.locationId)) {
        query = query.whereIn("location_id", options.locationId);
      } else {
        query = query.where("location_id", options.locationId);
      }
    }

    // Price range filter
    if (options.minPrice !== undefined) {
      query = query.where("price_min", ">=", options.minPrice);
    }
    if (options.maxPrice !== undefined) {
      query = query.where("price_max", "<=", options.maxPrice);
    }

    // Completion percentage filter
    if (options.minCompletion !== undefined) {
      query = query.where("completion_percentage", ">=", options.minCompletion);
    }
    if (options.maxCompletion !== undefined) {
      query = query.where("completion_percentage", "<=", options.maxCompletion);
    }

    // Has coordinates filter
    if (options.hasCoordinates) {
      query = query.whereNotNull("latitude").whereNotNull("longitude");
    }

    return query;
  }

  /**
   * Maps database record to Project entity
   */
  protected mapToEntity(record: any): Project {
    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      description: record.description,
      descriptionSecondary: record.description_secondary,
      address: record.address,
      latitude: record.latitude ? Number(record.latitude) : null,
      longitude: record.longitude ? Number(record.longitude) : null,
      locationId: record.location_id,
      projectType: record.project_type as ProjectType,
      status: record.status as ProjectStatus,
      completionPercentage: record.completion_percentage || 0,
      estimatedCompletionDate: record.estimated_completion_date
        ? new Date(record.estimated_completion_date)
        : null,
      actualCompletionDate: record.actual_completion_date
        ? new Date(record.actual_completion_date)
        : null,
      totalBlocks: record.total_blocks,
      totalUnits: record.total_units,
      priceMin: record.price_min ? Number(record.price_min) : null,
      priceMax: record.price_max ? Number(record.price_max) : null,
      mainPhotoUrl: record.main_photo_url,
      isFeatured: Boolean(record.is_featured),
      isPublished: Boolean(record.is_published),
      metaTitle: record.meta_title,
      metaDescription: record.meta_description,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }

  /**
   * Validates coordinates
   */
  private validateCoordinates(
    latitude?: number | null,
    longitude?: number | null
  ): void {
    if (latitude !== null && latitude !== undefined) {
      if (latitude < -90 || latitude > 90) {
        throw new Error("Latitude must be between -90 and 90");
      }
    }

    if (longitude !== null && longitude !== undefined) {
      if (longitude < -180 || longitude > 180) {
        throw new Error("Longitude must be between -180 and 180");
      }
    }
  }

  /**
   * Validates completion percentage
   */
  private validateCompletionPercentage(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new Error("Completion percentage must be between 0 and 100");
    }
  }

  /**
   * Generates URL-friendly slug from text
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}

// Export singleton instance
export default new ProjectModel();