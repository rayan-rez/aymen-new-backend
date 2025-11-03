/**
 * Feature Model
 *
 * Property amenities and features with multi-language support
 * Used in project_features junction table for many-to-many relationships
 *
 * Translation structure: { "en": "Swimming Pool", "fr": "Piscine", "ar": "مسبح" }
 *
 * @module models/feature.model
 */

import {
  BaseModel,
  AdvancedQueryOptions,
  PaginatedResult,
  DatabaseRecord,
} from "./base";
import { generateSlug } from "./base/helpers";
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
 * Translations structure
 */
export interface FeatureTranslations {
  en?: string;
  fr?: string;
  ar?: string;
  [key: string]: string | undefined;
}

/**
 * Feature entity interface
 */
export interface Feature {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  translations: FeatureTranslations | null;
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
  translations?: FeatureTranslations;
  category?: FeatureCategory;
  displayOrder?: number;
  isActive?: boolean;
}

/**
 * Update feature DTO
 */
export interface UpdateFeatureDto extends Partial<CreateFeatureDto> {}

/**
 * Feature query options
 */
export interface FeatureQueryOptions extends AdvancedQueryOptions {
  category?: FeatureCategory | FeatureCategory[];
  isActive?: boolean;
  hasIcon?: boolean;
  hasTranslations?: boolean;
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
    softDelete: false, // Reference data doesn't use soft deletes
    timestamps: true,
    defaultSortColumn: "display_order",
    defaultSortOrder: "asc" as const,
    searchableColumns: ["name", "slug"],
    hiddenFields: [],
    fillable: [
      "name",
      "slug",
      "icon",
      "translations",
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
  protected async beforeCreate(
    data: CreateFeatureDto
  ): Promise<CreateFeatureDto> {
    // Generate slug if not provided
    if (!data.slug) {
      data.slug = generateSlug(data.name);
    }

    // Validate slug uniqueness
    const existing = await this.findOne({ slug: data.slug }, {});
    if (existing) {
      throw new Error(`Feature slug "${data.slug}" already exists`);
    }

    // Set default category
    if (!data.category) {
      data.category = FeatureCategory.AMENITY;
    }

    // Validate translations format
    if (data.translations) {
      this.validateTranslations(data.translations);
    }

    return data;
  }

  /**
   * After create hook
   */
  protected async afterCreate(entity: Feature): Promise<void> {
    console.log(
      `✅ Feature created: ${entity.name} (Category: ${entity.category})`
    );
  }

  /**
   * Before update hook
   */
  protected async beforeUpdate(
    id: number,
    data: UpdateFeatureDto
  ): Promise<UpdateFeatureDto> {
    // Validate slug uniqueness if changing
    if (data.slug) {
      const existing = await this.findOne({ slug: data.slug }, {});
      if (existing && existing.id !== id) {
        throw new Error(`Feature slug "${data.slug}" already exists`);
      }
    }

    // Validate translations format
    if (data.translations) {
      this.validateTranslations(data.translations);
    }

    return data;
  }

  /**
   * Before delete hook - check usage
   */
  protected async beforeDelete(id: number): Promise<void> {
    // Check if feature is used in any projects
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

    // Apply feature-specific filters
    query = this.applyFeatureFilters(query, options);

    const records = await query;
    let entities = records.map((r: DatabaseRecord) => this.mapToEntity(r));

    // Load relations if requested
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
   * Finds features with icons
   */
  async findWithIcons(
    options: FeatureQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Feature[]> {
    return this.findFeatures({ ...options, hasIcon: true }, trx);
  }

  /**
   * Finds features with translations
   */
  async findWithTranslations(
    options: FeatureQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Feature[]> {
    return this.findFeatures({ ...options, hasTranslations: true }, trx);
  }

  // ============================================================================
  // TRANSLATION METHODS
  // ============================================================================

  /**
   * Gets feature name in specific language
   */
  getTranslatedName(
    feature: Feature,
    language: string,
    fallbackToName: boolean = true
  ): string {
    if (
      feature.translations &&
      feature.translations[language] &&
      feature.translations[language].trim() !== ""
    ) {
      return feature.translations[language]!;
    }

    return fallbackToName ? feature.name : "";
  }

  /**
   * Updates translations for a feature
   */
  async updateTranslations(
    id: number,
    translations: FeatureTranslations,
    merge: boolean = true,
    trx?: Knex.Transaction
  ): Promise<Feature | null> {
    const feature = await this.findById(id, {}, trx);
    if (!feature) return null;

    let updatedTranslations: FeatureTranslations;

    if (merge && feature.translations) {
      // Merge with existing translations
      updatedTranslations = { ...feature.translations, ...translations };
    } else {
      // Replace all translations
      updatedTranslations = translations;
    }

    this.validateTranslations(updatedTranslations);

    return this.update(id, { translations: updatedTranslations }, trx);
  }

  /**
   * Adds single translation
   */
  async addTranslation(
    id: number,
    language: string,
    translation: string,
    trx?: Knex.Transaction
  ): Promise<Feature | null> {
    return this.updateTranslations(id, { [language]: translation }, true, trx);
  }

  /**
   * Removes translation for a language
   */
  async removeTranslation(
    id: number,
    language: string,
    trx?: Knex.Transaction
  ): Promise<Feature | null> {
    const feature = await this.findById(id, {}, trx);
    if (!feature || !feature.translations) return feature;

    const updatedTranslations = { ...feature.translations };
    delete updatedTranslations[language];

    return this.update(id, { translations: updatedTranslations }, trx);
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

    // Count projects using this feature
    const [featureUsage] = await connection("project_features")
      .where("feature_id", id)
      .count("DISTINCT project_id as count");

    const projectCount = Number(featureUsage.count);

    // Count total projects
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
      connection.raw(
        "COUNT(CASE WHEN icon IS NOT NULL THEN 1 END) as withIcon"
      ),
      connection.raw(
        "COUNT(CASE WHEN translations IS NOT NULL THEN 1 END) as withTranslations"
      )
    );

    return {
      total: Number(stats.total),
      active: Number(stats.active),
      inactive: Number(stats.total) - Number(stats.active),
      withIcon: Number(stats.withIcon),
      withTranslations: Number(stats.withTranslations),
    };
  }

  // ============================================================================
  // ORDERING METHODS
  // ============================================================================

  /**
   * Reorders features
   */
  async reorder(
    featureIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
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
   * Validates translations format
   */
  private validateTranslations(translations: FeatureTranslations): void {
    if (!translations || typeof translations !== "object") {
      throw new Error("Translations must be an object");
    }

    // Validate each translation value
    for (const [lang, text] of Object.entries(translations)) {
      if (text !== undefined && typeof text !== "string") {
        throw new Error(`Translation for "${lang}" must be a string`);
      }

      if (text && text.trim() === "") {
        throw new Error(`Translation for "${lang}" cannot be empty`);
      }

      // Validate language code format (2-3 letters)
      if (!/^[a-z]{2,3}$/i.test(lang)) {
        throw new Error(
          `Invalid language code "${lang}". Must be 2-3 letters.`
        );
      }
    }
  }

  /**
   * Applies feature-specific filters to query
   */
  private applyFeatureFilters(
    query: Knex.QueryBuilder,
    options: FeatureQueryOptions
  ): Knex.QueryBuilder {
    // Category filter
    if (options.category) {
      if (Array.isArray(options.category)) {
        query = query.whereIn("category", options.category);
      } else {
        query = query.where("category", options.category);
      }
    }

    // Active filter
    if (options.isActive !== undefined) {
      query = query.where("is_active", options.isActive);
    }

    // Has icon filter
    if (options.hasIcon !== undefined) {
      if (options.hasIcon) {
        query = query.whereNotNull("icon");
      } else {
        query = query.whereNull("icon");
      }
    }

    // Has translations filter
    if (options.hasTranslations !== undefined) {
      if (options.hasTranslations) {
        query = query.whereNotNull("translations");
      } else {
        query = query.whereNull("translations");
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
      translations: this.parseJson<FeatureTranslations>(record.translations),
      category: record.category as FeatureCategory,
      displayOrder: record.display_order,
      isActive: Boolean(record.is_active),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

// Export singleton instance
export default new FeatureModel();
