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
import { generateSlug } from "@/database/helpers";
import { Knex } from "knex";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * @openapi
 * components:
 *   schemas:
 *     
 *     FeatureCategory:
 *       type: string
 *       enum:
 *         - amenity
 *         - security
 *         - transport
 *         - leisure
 *         - other
 *       description: Category classification for property features
 *       example: amenity
 *     
 *     FeatureTranslations:
 *       type: object
 *       additionalProperties:
 *         type: string
 *       description: Multi-language translations for feature names
 *       example:
 *         en: "Swimming Pool"
 *         fr: "Piscine"
 *         ar: "مسبح"
 *     
 *     Feature:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - slug
 *         - category
 *         - displayOrder
 *         - isActive
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the feature
 *           example: 1
 *         name:
 *           type: string
 *           description: Primary name of the feature (typically in English)
 *           example: "Swimming Pool"
 *         slug:
 *           type: string
 *           description: URL-friendly slug for the feature
 *           example: "swimming-pool"
 *         icon:
 *           type: string
 *           nullable: true
 *           description: Icon identifier or CSS class for UI display
 *           example: "pool-icon"
 *         translations:
 *           $ref: '#/components/schemas/FeatureTranslations'
 *         category:
 *           $ref: '#/components/schemas/FeatureCategory'
 *         displayOrder:
 *           type: integer
 *           description: Display order for sorting features in UI
 *           example: 5
 *         isActive:
 *           type: boolean
 *           description: Whether the feature is active and available for use
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2024-01-25T16:20:00Z"
 *         projects:
 *           type: array
 *           description: Virtual relation - associated projects
 *           items:
 *             type: object
 *     
 *     CreateFeatureDto:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: Primary name of the feature
 *           example: "Swimming Pool"
 *         slug:
 *           type: string
 *           description: URL-friendly slug (auto-generated if not provided)
 *           example: "swimming-pool"
 *         icon:
 *           type: string
 *           description: Icon identifier or CSS class for UI display
 *           example: "pool-icon"
 *         translations:
 *           $ref: '#/components/schemas/FeatureTranslations'
 *         category:
 *           $ref: '#/components/schemas/FeatureCategory'
 *         displayOrder:
 *           type: integer
 *           description: Display order for sorting features in UI
 *           example: 5
 *         isActive:
 *           type: boolean
 *           description: Whether the feature is active and available for use
 *           example: true
 *     
 *     UpdateFeatureDto:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateFeatureDto'
 *         - type: object
 *           properties:
 *             id:
 *               type: integer
 *               description: Feature ID (for update operations)
 *               example: 1
 *     
 *     FeatureQueryOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/AdvancedQueryOptions'
 *         - type: object
 *           properties:
 *             category:
 *               $ref: '#/components/schemas/FeatureCategory'
 *             isActive:
 *               type: boolean
 *               description: Filter by active status
 *               example: true
 *             hasIcon:
 *               type: boolean
 *               description: Filter features that have icons
 *               example: true
 *             hasTranslations:
 *               type: boolean
 *               description: Filter features that have translations
 *               example: false
 *     
 *     FeatureWithUsage:
 *       allOf:
 *         - $ref: '#/components/schemas/Feature'
 *         - type: object
 *           required:
 *             - projectCount
 *             - usagePercentage
 *           properties:
 *             projectCount:
 *               type: integer
 *               description: Number of projects using this feature
 *               example: 15
 *             usagePercentage:
 *               type: number
 *               format: float
 *               description: Percentage of total projects using this feature
 *               example: 25.5
 *     
 *     FeatureStatistics:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of features
 *           example: 50
 *         active:
 *           type: integer
 *           description: Number of active features
 *           example: 45
 *         inactive:
 *           type: integer
 *           description: Number of inactive features
 *           example: 5
 *         withIcon:
 *           type: integer
 *           description: Number of features with icons
 *           example: 35
 *         withTranslations:
 *           type: integer
 *           description: Number of features with translations
 *           example: 20
 *     
 *     CategoryStatistics:
 *       type: object
 *       properties:
 *         category:
 *           $ref: '#/components/schemas/FeatureCategory'
 *         total:
 *           type: integer
 *           description: Total number of features in this category
 *           example: 12
 *         active:
 *           type: integer
 *           description: Number of active features in this category
 *           example: 10
 */

/**
 * @openapi
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
 * @openapi
 * Translations structure
 */
export interface FeatureTranslations {
  en?: string;
  fr?: string;
  ar?: string;
  [key: string]: string | undefined;
}

/**
 * @openapi
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
 * @openapi
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
 * @openapi
 * Update feature DTO
 */
export interface UpdateFeatureDto extends Partial<CreateFeatureDto> {}

/**
 * @openapi
 * Feature query options
 */
export interface FeatureQueryOptions extends AdvancedQueryOptions {
  category?: FeatureCategory | FeatureCategory[];
  isActive?: boolean;
  hasIcon?: boolean;
  hasTranslations?: boolean;
}

/**
 * @openapi
 * Feature with usage count
 */
export interface FeatureWithUsage extends Feature {
  projectCount: number;
  usagePercentage: number;
}

// ============================================================================
// FEATURE MODEL CLASS
// ============================================================================

/**
 * @openapi
 * Feature Model Class
 * 
 * Manages property amenities and features with comprehensive multi-language
 * support, categorization, and usage analytics
 * 
 * @class FeatureModel
 * @extends BaseModel<Feature, CreateFeatureDto, UpdateFeatureDto>
 */
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
   * @openapi
   * beforeCreate lifecycle hook
   * 
   * Validates and processes feature data before creation:
   * - Auto-generates slug if not provided
   * - Validates slug uniqueness
   * - Sets default category
   * - Validates translation format
   * 
   * @param {CreateFeatureDto} data - Feature creation data
   * @returns {Promise<CreateFeatureDto>} Processed data
   * @throws {Error} If validation fails
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
   * @openapi
   * afterCreate lifecycle hook
   * 
   * Logs feature creation event
   * 
   * @param {Feature} entity - Created feature entity
   * @returns {Promise<void>}
   */
  protected async afterCreate(entity: Feature): Promise<void> {
    console.log(
      `✅ Feature created: ${entity.name} (Category: ${entity.category})`
    );
  }

  /**
   * @openapi
   * beforeUpdate lifecycle hook
   * 
   * Validates and processes feature data before update:
   * - Validates slug uniqueness if changing
   * - Validates translation format
   * 
   * @param {number} id - Feature ID
   * @param {UpdateFeatureDto} data - Feature update data
   * @returns {Promise<UpdateFeatureDto>} Processed data
   * @throws {Error} If validation fails
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
   * @openapi
   * beforeDelete lifecycle hook
   * 
   * Prevents deletion of features that are in use by projects
   * 
   * @param {number} id - Feature ID to delete
   * @returns {Promise<void>}
   * @throws {Error} If feature is in use
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
   * @openapi
   * Finds features with custom filters
   * 
   * @param {FeatureQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Feature[]>} Array of features
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
   * @openapi
   * Gets paginated features
   * 
   * @param {FeatureQueryOptions & { page: number; limit: number }} options - Query and pagination options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<PaginatedResult<Feature>>} Paginated result
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
   * @openapi
   * Counts features with filters
   * 
   * @param {FeatureQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<number>} Count of features
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
   * @openapi
   * Finds features by category
   * 
   * @param {FeatureCategory} category - Feature category
   * @param {FeatureQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Feature[]>} Array of features in the category
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
   * @openapi
   * Finds active features only
   * 
   * @param {FeatureQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Feature[]>} Array of active features
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
   * @openapi
   * Finds feature by slug
   * 
   * @param {string} slug - Feature slug
   * @param {object} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Feature | null>} Feature or null
   */
  async findBySlug(
    slug: string,
    options: { relations?: string[] } = {},
    trx?: Knex.Transaction
  ): Promise<Feature | null> {
    return this.findOne({ slug }, options, trx);
  }

  /**
   * @openapi
   * Finds features with icons
   * 
   * @param {FeatureQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Feature[]>} Array of features with icons
   */
  async findWithIcons(
    options: FeatureQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Feature[]> {
    return this.findFeatures({ ...options, hasIcon: true }, trx);
  }

  /**
   * @openapi
   * Finds features with translations
   * 
   * @param {FeatureQueryOptions} [options={}] - Additional query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Feature[]>} Array of features with translations
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
   * @openapi
   * Gets feature name in specific language
   * 
   * @param {Feature} feature - Feature object
   * @param {string} language - Language code (e.g., 'en', 'fr', 'ar')
   * @param {boolean} [fallbackToName=true] - Whether to fallback to primary name
   * @returns {string} Translated name or primary name if translation not available
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
   * @openapi
   * Updates translations for a feature
   * 
   * @param {number} id - Feature ID
   * @param {FeatureTranslations} translations - Translation object
   * @param {boolean} [merge=true] - Whether to merge with existing translations
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Feature | null>} Updated feature or null
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
   * @openapi
   * Adds single translation
   * 
   * @param {number} id - Feature ID
   * @param {string} language - Language code
   * @param {string} translation - Translation text
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Feature | null>} Updated feature or null
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
   * @openapi
   * Removes translation for a language
   * 
   * @param {number} id - Feature ID
   * @param {string} language - Language code
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Feature | null>} Updated feature or null
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
   * @openapi
   * Gets feature with usage count
   * 
   * @param {number} id - Feature ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FeatureWithUsage | null>} Feature with usage statistics
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
   * @openapi
   * Gets usage statistics for a feature
   * 
   * @param {number} id - Feature ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<{projectCount: number, usagePercentage: number}>} Usage statistics
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
   * @openapi
   * Gets all features with usage counts
   * 
   * @param {FeatureQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FeatureWithUsage[]>} Array of features with usage statistics
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
   * @openapi
   * Gets most popular features by usage
   * 
   * @param {number} [limit=10] - Maximum number of results
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FeatureWithUsage[]>} Array of most popular features
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
   * @openapi
   * Gets unused features (not used in any projects)
   * 
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Feature[]>} Array of unused features
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
   * @openapi
   * Gets feature statistics by category
   * 
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<CategoryStatistics[]>} Array of category statistics
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
   * @openapi
   * Gets overall feature statistics
   * 
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FeatureStatistics>} Comprehensive statistics object
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
   * @openapi
   * Reorders features
   * 
   * @param {number[]} featureIds - Array of feature IDs in desired order
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} Success status
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
   * @openapi
   * Reorders features within a category
   * 
   * @param {FeatureCategory} category - Category to reorder within
   * @param {number[]} featureIds - Array of feature IDs in desired order
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} Success status
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
   * @openapi
   * Validates translations format
   * 
   * @param {FeatureTranslations} translations - Translation object to validate
   * @throws {Error} If validation fails
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
   * @openapi
   * Applies feature-specific filters to query
   * 
   * @param {Knex.QueryBuilder} query - Database query builder
   * @param {FeatureQueryOptions} options - Query options
   * @returns {Knex.QueryBuilder} Modified query builder
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
   * @openapi
   * Maps database record to Feature entity
   * 
   * @param {DatabaseRecord} record - Database record
   * @returns {Feature} Feature entity
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