/**
 * Feature Model
 * Represents property features and amenities
 * Used for categorizing property amenities, security features, etc.
 *
 * @module models/feature.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Feature category enumeration
 * Defines the type/category of the feature
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
 * Represents a property feature or amenity
 */
export interface Feature {
  /** Unique identifier */
  id: number;

  /** Feature name (e.g., "Swimming Pool", "24/7 Security") */
  name: string;

  /** URL-friendly slug for the feature */
  slug: string;

  /** Icon name/class for UI display */
  icon: string | null;

  /** Feature category */
  category: FeatureCategory;

  /** Display order for sorting */
  displayOrder: number;

  /** Whether the feature is active and visible */
  isActive: boolean;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Create feature DTO (Data Transfer Object)
 * Used for creating new features
 */
export interface CreateFeatureDto {
  name: string;
  slug: string;
  icon?: string | null;
  category?: FeatureCategory;
  displayOrder?: number;
  isActive?: boolean;
}

/**
 * Update feature DTO
 * Used for updating existing features
 */
export interface UpdateFeatureDto {
  name?: string;
  slug?: string;
  icon?: string | null;
  category?: FeatureCategory;
  displayOrder?: number;
  isActive?: boolean;
}

/**
 * Feature query parameters
 * Used for filtering and pagination
 */
export interface FeatureQueryParams extends BaseQueryParams {
  category?: FeatureCategory;
  isActive?: boolean;
}

/**
 * Feature Model class
 * Handles all database operations for features
 * Extends BaseModel for common CRUD operations
 */
class FeatureModel extends BaseModel<
  Feature,
  CreateFeatureDto,
  UpdateFeatureDto
> {
  /** Database table name */
  protected tableName = "features";

  /**
   * Finds a feature by slug
   *
   * @param slug - Feature slug
   * @returns Promise<Feature | null> - Feature or null if not found
   *
   * @example
   * const feature = await FeatureModel.findBySlug("swimming-pool");
   */
  async findBySlug(slug: string): Promise<Feature | null> {
    return this.findOne({ slug });
  }

  /**
   * Finds all features matching the query parameters
   *
   * @param params - Query parameters
   * @returns Promise<Feature[]> - Array of features
   *
   * @example
   * const amenities = await FeatureModel.findAll({
   *   category: FeatureCategory.AMENITY,
   *   isActive: true
   * });
   */
  async findAll(params: FeatureQueryParams = {}): Promise<Feature[]> {
    let query = this.db(this.tableName);

    // Apply filters
    if (params.category) {
      query = query.where({ category: params.category });
    }

    if (params.isActive !== undefined) {
      query = query.where({ is_active: params.isActive });
    }

    // Apply ordering
    query = query.orderBy("display_order", "asc").orderBy("name", "asc");

    // Apply pagination
    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const features = await query;
    return features.map(this.mapToEntity);
  }

  /**
   * Gets features by category
   *
   * @param category - Feature category
   * @returns Promise<Feature[]> - Array of features
   *
   * @example
   * const securityFeatures = await FeatureModel.findByCategory(FeatureCategory.SECURITY);
   */
  async findByCategory(category: FeatureCategory): Promise<Feature[]> {
    return this.findWhere({ category, is_active: true });
  }

  /**
   * Gets all active features grouped by category
   *
   * @returns Promise<Record<FeatureCategory, Feature[]>> - Features grouped by category
   *
   * @example
   * const grouped = await FeatureModel.getGroupedByCategory();
   */
  async getGroupedByCategory(): Promise<Record<string, Feature[]>> {
    const features = await this.findWhere({ is_active: true });

    const grouped: Record<string, Feature[]> = {};

    for (const feature of features) {
      if (!grouped[feature.category]) {
        grouped[feature.category] = [];
      }
      grouped[feature.category].push(feature);
    }

    return grouped;
  }

  /**
   * Maps database record to Feature entity
   *
   * @param record - Database record
   * @returns Feature entity
   *
   * @protected
   */
  protected mapToEntity(record: any): Feature {
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

// Export singleton instance
export default new FeatureModel();
