/**
 * Location Model
 * 
 * Hierarchical location system: country > region > city > neighborhood
 * Uses materialized path pattern for O(1) hierarchy queries
 * Database trigger automatically maintains path and depth on insert
 * 
 * @module models/location.model
 */

import { BaseModel, AdvancedQueryOptions, PaginatedResult, DatabaseRecord } from "../base";
import { generateSlug } from "../base/helpers";
import { Knex } from "knex";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Location type enumeration
 */
export enum LocationType {
  COUNTRY = "country",
  REGION = "region",
  CITY = "city",
  NEIGHBORHOOD = "neighborhood",
}

/**
 * Location entity interface
 */
export interface Location {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  path: string | null; // Materialized path: "/1/5/12/"
  depth: number; // 0=root, 1=child of root, etc.
  type: LocationType;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  
  // Virtual relations
  parent?: Location;
  children?: Location[];
  projects?: any[];
}

/**
 * Create location DTO
 */
export interface CreateLocationDto {
  name: string;
  slug?: string;
  parentId?: number;
  type: LocationType;
  displayOrder?: number;
  isActive?: boolean;
}

/**
 * Update location DTO
 */
export interface UpdateLocationDto extends Partial<CreateLocationDto> {}

/**
 * Location query options
 */
export interface LocationQueryOptions extends AdvancedQueryOptions {
  type?: LocationType | LocationType[];
  parentId?: number | number[];
  isActive?: boolean;
  depth?: number | number[];
  hasParent?: boolean;
  searchInHierarchy?: string; // Search within path
}

/**
 * Location with hierarchy info
 */
export interface LocationWithHierarchy extends Location {
  hierarchy: Location[]; // Full path from root to this location
  ancestorCount: number;
  descendantCount: number;
}

// ============================================================================
// LOCATION MODEL CLASS
// ============================================================================

export class LocationModel extends BaseModel<
  Location,
  CreateLocationDto,
  UpdateLocationDto
> {
  protected tableName = "locations";
  protected primaryKey = "id";

  protected config = {
    softDelete: true,
    timestamps: true,
    defaultSortColumn: "display_order",
    defaultSortOrder: "asc" as const,
    searchableColumns: ["name", "slug"],
    hiddenFields: [],
    fillable: ["name", "slug", "parentId", "type", "displayOrder", "isActive"],
    guarded: ["id", "path", "depth", "createdAt", "updatedAt", "deletedAt"],
  };

  // Define relations
  protected relations = {
    parent: {
      type: "belongsTo" as const,
      model: () => require("./location.model").default,
      foreignKey: "parentId",
      localKey: "id",
    },
    children: {
      type: "hasMany" as const,
      model: () => require("./location.model").default,
      foreignKey: "parentId",
      localKey: "id",
    },
    projects: {
      type: "hasMany" as const,
      model: () => require("./project.model").default,
      foreignKey: "locationId",
      localKey: "id",
    },
  };

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Before create hook - validate and generate slug
   */
  protected async beforeCreate(
    data: CreateLocationDto
  ): Promise<CreateLocationDto> {
    // Generate slug if not provided
    if (!data.slug) {
      data.slug = generateSlug(data.name);
    }

    // Validate slug uniqueness
    const existing = await this.findOne({ slug: data.slug }, {});
    if (existing) {
      throw new Error(`Location slug "${data.slug}" already exists`);
    }

    // Validate parent exists if provided
    if (data.parentId) {
      const parent = await this.findById(data.parentId);
      if (!parent) {
        throw new Error(`Parent location with ID ${data.parentId} not found`);
      }

      // Validate hierarchy depth (max 10)
      if (parent.depth >= 10) {
        throw new Error("Maximum hierarchy depth (10) exceeded");
      }

      // Validate logical hierarchy (country > region > city > neighborhood)
      this.validateHierarchyLogic(parent.type, data.type);
    } else {
      // Root location must be country
      if (data.type !== LocationType.COUNTRY) {
        throw new Error("Root locations must be of type 'country'");
      }
    }

    // Note: path and depth are set automatically by database trigger

    return data;
  }

  /**
   * After create hook
   */
  protected async afterCreate(entity: Location): Promise<void> {
    console.log(
      `✅ Location created: ${entity.name} (Type: ${entity.type}, Depth: ${entity.depth})`
    );
  }

  /**
   * Before update hook
   */
  protected async beforeUpdate(
    id: number,
    data: UpdateLocationDto
  ): Promise<UpdateLocationDto> {
    // If changing parent, validate
    if (data.parentId !== undefined) {
      const location = await this.findById(id);
      if (!location) {
        throw new Error("Location not found");
      }

      if (data.parentId !== null) {
        const newParent = await this.findById(data.parentId);
        if (!newParent) {
          throw new Error(`Parent location with ID ${data.parentId} not found`);
        }

        // Cannot set self as parent
        if (data.parentId === id) {
          throw new Error("Location cannot be its own parent");
        }

        // Cannot set descendant as parent (would create cycle)
        if (newParent.path && newParent.path.includes(`/${id}/`)) {
          throw new Error("Cannot set descendant as parent (circular reference)");
        }

        // Validate depth
        if (newParent.depth >= 10) {
          throw new Error("Maximum hierarchy depth (10) exceeded");
        }

        // Validate type hierarchy
        this.validateHierarchyLogic(newParent.type, data.type || location.type);
      }
    }

    // Validate slug uniqueness if changing
    if (data.slug) {
      const existing = await this.findOne({ slug: data.slug }, {});
      if (existing && existing.id !== id) {
        throw new Error(`Location slug "${data.slug}" already exists`);
      }
    }

    return data;
  }

  /**
   * Before delete hook - check dependencies
   */
  protected async beforeDelete(id: number): Promise<void> {
    // Check if location has children
    const children = await this.findByParent(id);
    if (children.length > 0) {
      throw new Error(
        `Cannot delete location with ${children.length} child locations. Delete children first.`
      );
    }

    // Check if location has associated projects
    const projectCount = await this.db("projects")
      .where("location_id", id)
      .whereNull("deleted_at")
      .count("* as count")
      .first();

    if (projectCount && Number(projectCount.count) > 0) {
      console.warn(
        `⚠️ Location ${id} has ${projectCount.count} associated projects`
      );
    }
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Finds locations with custom filters
   */
  async findLocations(
    options: LocationQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Location[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    // Apply location-specific filters
    query = this.applyLocationFilters(query, options);

    const records = await query;
    let entities = records.map((r: DatabaseRecord) => this.mapToEntity(r));

    // Load relations if requested
    if (options.relations && options.relations.length > 0) {
      entities = await this.loadRelationsForMany(entities, options.relations, trx);
    }

    return entities;
  }

  /**
   * Gets paginated locations
   */
  async paginateLocations(
    options: LocationQueryOptions & { page: number; limit: number },
    trx?: Knex.Transaction
  ): Promise<PaginatedResult<Location>> {
    const { page, limit } = options;

    const [items, total] = await Promise.all([
      this.findLocations(options, trx),
      this.countLocations(options, trx),
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
   * Counts locations with filters
   */
  async countLocations(
    options: LocationQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    if (!options.includeDeleted && this.config.softDelete) {
      query = query.whereNull("deleted_at");
    }

    query = this.applyLocationFilters(query, options);

    const result = await query.count(`${this.primaryKey} as count`).first();
    return result ? Number(result.count) : 0;
  }

  /**
   * Finds locations by type
   */
  async findByType(
    type: LocationType,
    options: LocationQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Location[]> {
    return this.findLocations({ ...options, type, isActive: true }, trx);
  }

  /**
   * Finds locations by parent ID
   */
  async findByParent(
    parentId: number,
    options: LocationQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Location[]> {
    return this.findLocations(
      { ...options, parentId, isActive: true, sortBy: "display_order" },
      trx
    );
  }

  /**
   * Finds root locations (countries)
   */
  async findRoots(
    options: LocationQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Location[]> {
    return this.findLocations(
      { ...options, hasParent: false, sortBy: "display_order" },
      trx
    );
  }

  /**
   * Finds location by slug
   */
  async findBySlug(
    slug: string,
    options: { includeDeleted?: boolean; relations?: string[] } = {},
    trx?: Knex.Transaction
  ): Promise<Location | null> {
    return this.findOne({ slug }, options, trx);
  }

  /**
   * Gets all countries
   */
  async getCountries(trx?: Knex.Transaction): Promise<Location[]> {
    return this.findByType(LocationType.COUNTRY, {}, trx);
  }

  /**
   * Gets regions for a country
   */
  async getRegions(
    countryId: number,
    trx?: Knex.Transaction
  ): Promise<Location[]> {
    return this.findByParent(countryId, { type: LocationType.REGION }, trx);
  }

  /**
   * Gets cities for a region
   */
  async getCities(regionId: number, trx?: Knex.Transaction): Promise<Location[]> {
    return this.findByParent(regionId, { type: LocationType.CITY }, trx);
  }

  /**
   * Gets neighborhoods for a city
   */
  async getNeighborhoods(
    cityId: number,
    trx?: Knex.Transaction
  ): Promise<Location[]> {
    return this.findByParent(cityId, { type: LocationType.NEIGHBORHOOD }, trx);
  }

  // ============================================================================
  // HIERARCHY METHODS
  // ============================================================================

  /**
   * Gets full hierarchy path from root to location
   */
  async getHierarchyPath(
    locationId: number,
    trx?: Knex.Transaction
  ): Promise<Location[]> {
    const location = await this.findById(locationId, {}, trx);
    if (!location || !location.path) return [];

    const connection = trx || this.db;

    // Extract IDs from path: "/1/5/12/" -> [1, 5, 12]
    const ids = location.path
      .split("/")
      .filter((id) => id)
      .map((id) => parseInt(id));

    if (ids.length === 0) return [];

    // Get all locations in path, ordered by depth
    const records = await connection(this.tableName)
      .whereIn("id", ids)
      .whereNull("deleted_at")
      .orderBy("depth", "asc");

    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  /**
   * Gets all descendants of a location (children, grandchildren, etc.)
   */
  async getDescendants(
    locationId: number,
    options: { maxDepth?: number; typesOnly?: LocationType[] } = {},
    trx?: Knex.Transaction
  ): Promise<Location[]> {
    const location = await this.findById(locationId, {}, trx);
    if (!location || !location.path) return [];

    const connection = trx || this.db;
    let query = connection(this.tableName)
      .where("path", "like", `${location.path}%`)
      .where("id", "!=", locationId)
      .whereNull("deleted_at")
      .orderBy("depth", "asc");

    // Filter by max depth
    if (options.maxDepth !== undefined) {
      query = query.where("depth", "<=", location.depth + options.maxDepth);
    }

    // Filter by type
    if (options.typesOnly && options.typesOnly.length > 0) {
      query = query.whereIn("type", options.typesOnly);
    }

    const records = await query;
    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  /**
   * Gets direct children only (not grandchildren)
   */
  async getChildren(
    locationId: number,
    trx?: Knex.Transaction
  ): Promise<Location[]> {
    return this.findByParent(locationId, {}, trx);
  }

  /**
   * Gets all ancestors of a location (parent, grandparent, etc.)
   */
  async getAncestors(
    locationId: number,
    trx?: Knex.Transaction
  ): Promise<Location[]> {
    const hierarchy = await this.getHierarchyPath(locationId, trx);
    // Remove the location itself (last in array)
    return hierarchy.slice(0, -1);
  }

  /**
   * Gets location with full hierarchy information
   */
  async getWithHierarchy(
    locationId: number,
    trx?: Knex.Transaction
  ): Promise<LocationWithHierarchy | null> {
    const location = await this.findById(locationId, {}, trx);
    if (!location) return null;

    const [hierarchy, descendants] = await Promise.all([
      this.getHierarchyPath(locationId, trx),
      this.getDescendants(locationId, {}, trx),
    ]);

    return {
      ...location,
      hierarchy,
      ancestorCount: hierarchy.length - 1,
      descendantCount: descendants.length,
    };
  }

  /**
   * Gets sibling locations (same parent)
   */
  async getSiblings(
    locationId: number,
    trx?: Knex.Transaction
  ): Promise<Location[]> {
    const location = await this.findById(locationId, {}, trx);
    if (!location) return [];

    const connection = trx || this.db;

    if (location.parentId === null) {
      // Root level - get other root locations
      const records = await connection(this.tableName)
        .whereNull("parent_id")
        .where("id", "!=", locationId)
        .whereNull("deleted_at")
        .orderBy("display_order", "asc");

      return records.map((r: DatabaseRecord) => this.mapToEntity(r));
    } else {
      // Has parent - get siblings
      return this.findByParent(location.parentId, {}, trx).then((locations) =>
        locations.filter((loc) => loc.id !== locationId)
      );
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Builds location breadcrumb for UI
   */
  async getBreadcrumb(
    locationId: number,
    trx?: Knex.Transaction
  ): Promise<Array<{ id: number; name: string; slug: string; type: LocationType }>> {
    const hierarchy = await this.getHierarchyPath(locationId, trx);
    return hierarchy.map((loc) => ({
      id: loc.id,
      name: loc.name,
      slug: loc.slug,
      type: loc.type,
    }));
  }

  /**
   * Searches locations by name across hierarchy
   */
  async searchByName(
    searchTerm: string,
    options: LocationQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Location[]> {
    return this.search(searchTerm, { ...options, isActive: true } as LocationQueryOptions, trx);
  }

  /**
   * Gets location statistics
   */
  async getStatistics(trx?: Knex.Transaction): Promise<any> {
    const connection = trx || this.db;

    const [stats] = await connection(this.tableName)
      .whereNull("deleted_at")
      .select(
        connection.raw("COUNT(*) as total"),
        connection.raw(
          "COUNT(CASE WHEN type = 'country' THEN 1 END) as countries"
        ),
        connection.raw(
          "COUNT(CASE WHEN type = 'region' THEN 1 END) as regions"
        ),
        connection.raw("COUNT(CASE WHEN type = 'city' THEN 1 END) as cities"),
        connection.raw(
          "COUNT(CASE WHEN type = 'neighborhood' THEN 1 END) as neighborhoods"
        ),
        connection.raw(
          "COUNT(CASE WHEN is_active = true THEN 1 END) as active"
        ),
        connection.raw("MAX(depth) as maxDepth"),
        connection.raw("AVG(depth) as avgDepth")
      );

    return {
      total: Number(stats.total),
      countries: Number(stats.countries),
      regions: Number(stats.regions),
      cities: Number(stats.cities),
      neighborhoods: Number(stats.neighborhoods),
      active: Number(stats.active),
      maxDepth: Number(stats.maxDepth),
      avgDepth: stats.avgDepth ? Number(stats.avgDepth) : 0,
    };
  }

  /**
   * Reorders locations within same parent
   */
  async reorder(
    locationIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || this.db;

    await connection.transaction(async (localTrx) => {
      const useTrx = trx || localTrx;

      for (let i = 0; i < locationIds.length; i++) {
        await useTrx(this.tableName)
          .where({ id: locationIds[i] })
          .update({ display_order: i });
      }
    });

    return true;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Validates hierarchy logic (country > region > city > neighborhood)
   */
  private validateHierarchyLogic(
    parentType: LocationType,
    childType: LocationType
  ): void {
    const validCombinations: Record<LocationType, LocationType[]> = {
      [LocationType.COUNTRY]: [LocationType.REGION],
      [LocationType.REGION]: [LocationType.CITY],
      [LocationType.CITY]: [LocationType.NEIGHBORHOOD],
      [LocationType.NEIGHBORHOOD]: [],
    };

    if (!validCombinations[parentType].includes(childType)) {
      throw new Error(
        `Invalid hierarchy: ${childType} cannot be child of ${parentType}`
      );
    }
  }

  /**
   * Applies location-specific filters to query
   */
  private applyLocationFilters(
    query: Knex.QueryBuilder,
    options: LocationQueryOptions
  ): Knex.QueryBuilder {
    // Type filter
    if (options.type) {
      if (Array.isArray(options.type)) {
        query = query.whereIn("type", options.type);
      } else {
        query = query.where("type", options.type);
      }
    }

    // Parent ID filter
    if (options.parentId) {
      if (Array.isArray(options.parentId)) {
        query = query.whereIn("parent_id", options.parentId);
      } else {
        query = query.where("parent_id", options.parentId);
      }
    }

    // Active filter
    if (options.isActive !== undefined) {
      query = query.where("is_active", options.isActive);
    }

    // Depth filter
    if (options.depth) {
      if (Array.isArray(options.depth)) {
        query = query.whereIn("depth", options.depth);
      } else {
        query = query.where("depth", options.depth);
      }
    }

    // Has parent filter
    if (options.hasParent !== undefined) {
      if (options.hasParent) {
        query = query.whereNotNull("parent_id");
      } else {
        query = query.whereNull("parent_id");
      }
    }

    // Search in hierarchy (path contains)
    if (options.searchInHierarchy) {
      query = query.where("path", "like", `%/${options.searchInHierarchy}/%`);
    }

    return query;
  }

  /**
   * Maps database record to Location entity
   */
  protected mapToEntity(record: DatabaseRecord): Location {
    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      parentId: record.parent_id,
      path: record.path,
      depth: record.depth,
      type: record.type as LocationType,
      displayOrder: record.display_order,
      isActive: Boolean(record.is_active),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

// Export singleton instance
export default new LocationModel();