/**
 * Location Model
 * Represents geographical locations (countries, regions, cities, neighborhoods)
 * Used for organizing properties and projects by location
 *
 * @module models/location.model
 */

import { BaseModel, BaseQueryParams, PaginatedResult } from "./base.model";

/**
 * Location type enumeration
 * Defines the hierarchical level of the location
 */
export enum LocationType {
  COUNTRY = "country",
  REGION = "region",
  CITY = "city",
  NEIGHBORHOOD = "neighborhood",
}

/**
 * Location entity interface
 * Represents a geographical location in the system
 */
export interface Location {
  /** Unique identifier */
  id: number;

  /** Location name (e.g., "Annaba", "Constantine") */
  name: string;

  /** URL-friendly slug for the location */
  slug: string;

  /** Parent location ID (null for top-level locations) */
  parentId: number | null;

  /** Type of location (country, region, city, neighborhood) */
  type: LocationType;

  /** Display order for sorting locations */
  displayOrder: number;

  /** Whether the location is active and visible */
  isActive: boolean;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Create location DTO (Data Transfer Object)
 * Used for creating new locations
 */
export interface CreateLocationDto {
  name: string;
  slug: string;
  parentId?: number | null;
  type: LocationType;
  displayOrder?: number;
  isActive?: boolean;
}

/**
 * Update location DTO
 * Used for updating existing locations
 */
export interface UpdateLocationDto {
  name?: string;
  slug?: string;
  parentId?: number | null;
  type?: LocationType;
  displayOrder?: number;
  isActive?: boolean;
}

/**
 * Location query parameters
 * Used for filtering and pagination
 */
export interface LocationQueryParams extends BaseQueryParams {
  type?: LocationType;
  parentId?: number;
  isActive?: boolean;
}

/**
 * Location with children interface
 * Represents a location with its sub-locations
 */
export interface LocationWithChildren extends Location {
  children?: LocationWithChildren[];
}

/**
 * Location Model class
 * Handles all database operations for locations
 * Extends BaseModel for common CRUD operations
 */
class LocationModel extends BaseModel<
  Location,
  CreateLocationDto,
  UpdateLocationDto
> {
  /** Database table name */
  protected tableName = "locations";

  /**
   * Finds a location by slug
   *
   * @param slug - Location slug
   * @returns Promise<Location | null> - Location or null if not found
   *
   * @example
   * const location = await LocationModel.findBySlug("annaba");
   */
  async findBySlug(slug: string): Promise<Location | null> {
    return this.findOne({ slug });
  }

  /**
   * Finds all locations matching the query parameters
   *
   * @param params - Query parameters
   * @returns Promise<Location[]> - Array of locations
   *
   * @example
   * const cities = await LocationModel.findAll({
   *   type: LocationType.CITY,
   *   isActive: true
   * });
   */
  async findAll(params: LocationQueryParams = {}): Promise<Location[]> {
    let query = this.db(this.tableName);

    // Apply filters
    if (params.type) {
      query = query.where({ type: params.type });
    }

    if (params.parentId !== undefined) {
      query = query.where({ parent_id: params.parentId });
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

    const locations = await query;
    return locations.map(this.mapToEntity);
  }

  /**
   * Gets location hierarchy (location with all children)
   * Builds a tree structure of locations
   *
   * @param parentId - Parent location ID (null for root locations)
   * @returns Promise<LocationWithChildren[]> - Hierarchical locations
   *
   * @example
   * const hierarchy = await LocationModel.getHierarchy();
   */
  async getHierarchy(
    parentId: number | null = null
  ): Promise<LocationWithChildren[]> {
    const locations = await this.findWhere({ parent_id: parentId });

    const locationsWithChildren = await Promise.all(
      locations.map(async (location) => {
        const children = await this.getHierarchy(location.id);
        return {
          ...location,
          children: children.length > 0 ? children : undefined,
        };
      })
    );

    return locationsWithChildren;
  }

  /**
   * Gets all child locations for a parent
   *
   * @param parentId - Parent location ID
   * @param recursive - Whether to include all descendants
   * @returns Promise<Location[]> - Array of child locations
   *
   * @example
   * const neighborhoods = await LocationModel.getChildren(1, false);
   */
  async getChildren(
    parentId: number,
    recursive: boolean = false
  ): Promise<Location[]> {
    if (!recursive) {
      return this.findWhere({ parent_id: parentId });
    }

    const children: Location[] = [];
    const directChildren = await this.findWhere({ parent_id: parentId });

    for (const child of directChildren) {
      children.push(child);
      const grandChildren = await this.getChildren(child.id, true);
      children.push(...grandChildren);
    }

    return children;
  }

  /**
   * Gets the parent location
   *
   * @param locationId - Location ID
   * @returns Promise<Location | null> - Parent location or null
   *
   * @example
   * const parent = await LocationModel.getParent(5);
   */
  async getParent(locationId: number): Promise<Location | null> {
    const location = await this.findById(locationId);
    if (!location || !location.parentId) {
      return null;
    }
    return this.findById(location.parentId);
  }

  /**
   * Gets all parent locations (breadcrumb)
   *
   * @param locationId - Location ID
   * @returns Promise<Location[]> - Array of parent locations (root first)
   *
   * @example
   * const breadcrumb = await LocationModel.getParents(10);
   */
  async getParents(locationId: number): Promise<Location[]> {
    const parents: Location[] = [];
    let currentId: number | null = locationId;

    while (currentId) {
      const location = await this.findById(currentId);
      if (!location) break;

      parents.unshift(location);
      currentId = location.parentId;
    }

    return parents.slice(0, -1); // Remove the location itself
  }

  /**
   * Maps database record to Location entity
   *
   * @param record - Database record
   * @returns Location entity
   *
   * @protected
   */
  protected mapToEntity(record: any): Location {
    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      parentId: record.parent_id,
      type: record.type as LocationType,
      displayOrder: record.display_order,
      isActive: Boolean(record.is_active),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

// Export singleton instance
export default new LocationModel();
