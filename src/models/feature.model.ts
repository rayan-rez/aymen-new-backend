/**
 * Feature Model - FIXED TO MATCH DATABASE SCHEMA
 * 
 * Removed: translations field (commented out in migration)
 */

import {
  BaseModel,
  AdvancedQueryOptions,
  PaginatedResult,
  DatabaseRecord,
} from "./base";
import { generateSlug } from "@/database/helpers";
import { Knex } from "knex";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Feature category enumeration
 */
export enum FeatureCategory {
  AMENITY = "amenity",
  SECURITY = "security",
  TRANSPORT = "transport",
  LEISURE = "leisure",
  OTHER = "other",
}


/**
 * Feature entity interface
 */
export interface Feature {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  category: FeatureCategory;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Virtual relations
  projects?: any[];
}

/**
 * Create feature DTO
 */
export interface CreateFeatureDto {
  name: string;
  slug?: string;
  icon?: string;
  category?: FeatureCategory;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateFeatureDto extends Partial<CreateFeatureDto> { }

/**
 * Feature query options
 */
export interface FeatureQueryOptions extends AdvancedQueryOptions {
  category?: FeatureCategory | FeatureCategory[];
  isActive?: boolean;
  hasIcon?: boolean;
}

/**
 * Feature with usage count
 */
export interface FeatureWithUsage extends Feature {
  projectCount: number;
  usagePercentage: number;
}

// ============================================================================
// FEATURE MODEL CLASS
// ============================================================================

export class FeatureModel extends BaseModel<
  Feature,
  CreateFeatureDto,
  UpdateFeatureDto
> {
  protected tableName = "features";
  protected primaryKey = "id";

  protected config = {
    softDelete: false,
    timestamps: true,
    defaultSortColumn: "display_order",
    defaultSortOrder: "asc" as const,
    searchableColumns: ["name", "slug"],
    hiddenFields: [],
    fillable: [
      "name",
      "slug",
      "icon",
      "category",
      "displayOrder",
      "isActive",
    ],
    guarded: ["id", "createdAt", "updatedAt"],
  };

  // Define relations
  protected relations = {
    projects: {
      type: "belongsToMany" as const,
      model: () => require("./project.model").default,
      foreignKey: "featureId",
      localKey: "id",
      pivotTable: "project_features",
      pivotForeignKey: "feature_id",
      pivotRelatedKey: "project_id",
    },
  };

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Before create hook - validate and generate slug
   */
  protected async beforeCreate(data: CreateFeatureDto): Promise<CreateFeatureDto> {
    if (!data.slug) {
      data.slug = generateSlug(data.name);
    }

    const existing = await this.findOne({ slug: data.slug }, {});
    if (existing) {
      throw new Error(`Feature slug "${data.slug}" already exists`);
    }

    if (!data.category) {
      data.category = FeatureCategory.AMENITY;
    }

    return data;
  }

  /**
   * After create hook
   */
  protected async afterCreate(entity: Feature): Promise<void> {
    console.log(`✅ Feature created: ${entity.name} (Category: ${entity.category})`);
  }

  /**
   * Before update hook
   */
  protected async beforeUpdate(
    id: number,
    data: UpdateFeatureDto
  ): Promise<UpdateFeatureDto> {
    if (data.slug) {
      const existing = await this.findOne({ slug: data.slug }, {});
      if (existing && existing.id !== id) {
        throw new Error(`Feature slug "${data.slug}" already exists`);
      }
    }

    return data;
  }

  /**
   * Before delete hook - check usage
   */
  protected async beforeDelete(id: number): Promise<void> {
    const usageCount = await this.db("project_features")
      .where("feature_id", id)
      .count("* as count")
      .first();

    if (usageCount && Number(usageCount.count) > 0) {
      throw new Error(
        `Cannot delete feature that is used in ${usageCount.count} project(s). Remove from projects first.`
      );
    }
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Finds features with custom filters
   */
  async findFeatures(
    options: FeatureQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Feature[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    query = this.applyFeatureFilters(query, options);

    const records = await query;
    let entities = records.map((r: DatabaseRecord) => this.mapToEntity(r));

    if (options.relations && options.relations.length > 0) {
      entities = await this.loadRelationsForMany(
        entities,
        options.relations,
        trx
      );
    }

    return entities;
  }

  /**
   * Gets paginated features
   */
  async paginateFeatures(
    options: FeatureQueryOptions & { page: number; limit: number },
    trx?: Knex.Transaction
  ): Promise<PaginatedResult<Feature>> {
    const { page, limit } = options;

    const [items, total] = await Promise.all([
      this.findFeatures(options, trx),
      this.countFeatures(options, trx),
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
   * Counts features with filters
   */
  async countFeatures(
    options: FeatureQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    query = this.applyFeatureFilters(query, options);

    const result = await query.count(`${this.primaryKey} as count`).first();
    return result ? Number(result.count) : 0;
  }

  /**
   * Finds features by category
   */
  async findByCategory(
    category: FeatureCategory,
    options: FeatureQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Feature[]> {
    return this.findFeatures(
      { ...options, category, isActive: true, sortBy: "display_order" },
      trx
    );
  }

  /**
   * Finds active features only
   */
  async findActive(
    options: FeatureQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Feature[]> {
    return this.findFeatures(
      { ...options, isActive: true, sortBy: "display_order" },
      trx
    );
  }

  /**
   * Finds feature by slug
   */
  async findBySlug(
    slug: string,
    options: { relations?: string[] } = {},
    trx?: Knex.Transaction
  ): Promise<Feature | null> {
    return this.findOne({ slug }, options, trx);
  }

  /**
   * Finds features with translations
   */
  async findWithTranslations(
    options: FeatureQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Feature[]> {
    return this.findFeatures(options, trx);
  }

  // ============================================================================
  // USAGE & STATISTICS METHODS
  // ============================================================================

  /**
   * Gets feature with usage count
   */
  async getWithUsage(
    id: number,
    trx?: Knex.Transaction
  ): Promise<FeatureWithUsage | null> {
    const feature = await this.findById(id, {}, trx);
    if (!feature) return null;

    const usage = await this.getUsageStats(id, trx);

    return {
      ...feature,
      projectCount: usage.projectCount,
      usagePercentage: usage.usagePercentage,
    };
  }

  /**
   * Gets usage statistics for a feature
   */
  async getUsageStats(
    id: number,
    trx?: Knex.Transaction
  ): Promise<{ projectCount: number; usagePercentage: number }> {
    const connection = trx || this.db;

    const [featureUsage] = await connection("project_features")
      .where("feature_id", id)
      .count("DISTINCT project_id as count");

    const projectCount = Number(featureUsage.count);

    const [totalProjects] = await connection("projects")
      .whereNull("deleted_at")
      .count("* as count");

    const total = Number(totalProjects.count);
    const usagePercentage = total > 0 ? (projectCount / total) * 100 : 0;

    return {
      projectCount,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
    };
  }

  /**
   * Gets all features with usage counts
   */
  async getAllWithUsage(
    options: FeatureQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<FeatureWithUsage[]> {
    const features = await this.findFeatures(options, trx);

    const featuresWithUsage = await Promise.all(
      features.map(async (feature) => {
        const usage = await this.getUsageStats(feature.id, trx);
        return {
          ...feature,
          projectCount: usage.projectCount,
          usagePercentage: usage.usagePercentage,
        };
      })
    );

    return featuresWithUsage;
  }

  /**
   * Gets most popular features
   */
  async getMostPopular(
    limit: number = 10,
    trx?: Knex.Transaction
  ): Promise<FeatureWithUsage[]> {
    const connection = trx || this.db;

    const records = await connection("features as f")
      .leftJoin("project_features as pf", "f.id", "pf.feature_id")
      .select(
        "f.*",
        connection.raw("COUNT(DISTINCT pf.project_id) as project_count")
      )
      .where("f.is_active", true)
      .groupBy("f.id")
      .orderBy("project_count", "desc")
      .limit(limit);

    const totalProjects = await connection("projects")
      .whereNull("deleted_at")
      .count("* as count")
      .first();

    const total = totalProjects ? Number(totalProjects.count) : 0;

    return records.map((record: any) => {
      const projectCount = Number(record.project_count);
      const usagePercentage =
        total > 0 ? Math.round((projectCount / total) * 10000) / 100 : 0;

      return {
        ...this.mapToEntity(record),
        projectCount,
        usagePercentage,
      };
    });
  }

  /**
   * Gets unused features
   */
  async getUnused(trx?: Knex.Transaction): Promise<Feature[]> {
    const connection = trx || this.db;

    const records = await connection("features as f")
      .leftJoin("project_features as pf", "f.id", "pf.feature_id")
      .whereNull("pf.id")
      .select("f.*")
      .orderBy("f.display_order", "asc");

    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  /**
   * Gets feature statistics by category
   */
  async getStatisticsByCategory(trx?: Knex.Transaction): Promise<any[]> {
    const connection = trx || this.db;

    return connection("features")
      .select("category")
      .count("* as total")
      .sum(
        connection.raw("CASE WHEN is_active = true THEN 1 ELSE 0 END as active")
      )
      .groupBy("category")
      .orderBy("total", "desc");
  }

  /**
   * Gets overall feature statistics
   */
  async getStatistics(trx?: Knex.Transaction): Promise<any> {
    const connection = trx || this.db;

    const [stats] = await connection(this.tableName).select(
      connection.raw("COUNT(*) as total"),
      connection.raw("COUNT(CASE WHEN is_active = true THEN 1 END) as active"),
      connection.raw("COUNT(CASE WHEN icon IS NOT NULL THEN 1 END) as withIcon")
    );

    return {
      total: Number(stats.total),
      active: Number(stats.active),
      inactive: Number(stats.total) - Number(stats.active),
      withIcon: Number(stats.withIcon),
    };
  }

  // ============================================================================
  // ORDERING METHODS
  // ============================================================================

  /**
   * Reorders features
   */
  async reorder(featureIds: number[], trx?: Knex.Transaction): Promise<boolean> {
    const connection = trx || this.db;

    await connection.transaction(async (localTrx) => {
      const useTrx = trx || localTrx;

      for (let i = 0; i < featureIds.length; i++) {
        await useTrx(this.tableName)
          .where({ id: featureIds[i] })
          .update({ display_order: i });
      }
    });

    return true;
  }

  /**
   * Reorders features within a category
   */
  async reorderByCategory(
    category: FeatureCategory,
    featureIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || this.db;

    await connection.transaction(async (localTrx) => {
      const useTrx = trx || localTrx;

      for (let i = 0; i < featureIds.length; i++) {
        await useTrx(this.tableName)
          .where({ id: featureIds[i], category })
          .update({ display_order: i });
      }
    });

    return true;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Applies feature-specific filters to query
   */
  private applyFeatureFilters(
    query: Knex.QueryBuilder,
    options: FeatureQueryOptions
  ): Knex.QueryBuilder {
    if (options.category) {
      if (Array.isArray(options.category)) {
        query = query.whereIn("category", options.category);
      } else {
        query = query.where("category", options.category);
      }
    }

    if (options.isActive !== undefined) {
      query = query.where("is_active", options.isActive);
    }

    if (options.hasIcon !== undefined) {
      if (options.hasIcon) {
        query = query.whereNotNull("icon");
      } else {
        query = query.whereNull("icon");
      }
    }

    return query;
  }

  /**
   * Maps database record to Feature entity
   */
  protected mapToEntity(record: DatabaseRecord): Feature {
    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      icon: record.icon,
      category: record.category as FeatureCategory,
      displayOrder: record.display_order,
      isActive: Boolean(record.is_active),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new FeatureModel();