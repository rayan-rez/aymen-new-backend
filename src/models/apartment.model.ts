/**
 * Apartment Model
 *
 * Individual residential units within projects
 * Tracks availability, specifications, and sales pipeline
 * Price changes automatically update project price range (via database trigger)
 *
 * @module models/apartment.model
 */

import {
  BaseModel,
  AdvancedQueryOptions,
  PaginatedResult,
  DatabaseRecord,
} from "./base";
import PhotoModel, { PhotoableType, Photo } from "./photo.model";
import FloorPlanModel, { PlannableType, FloorPlan } from "./floor-plan.model";
import { Knex } from "knex";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Apartment status enumeration (sales pipeline)
 */
export enum ApartmentStatus {
  AVAILABLE = "available",
  RESERVED = "reserved",
  SOLD = "sold",
}

/**
 * Apartment entity interface
 */
export interface Apartment {
  id: number;
  projectId: number;
  name: string;
  unitNumber: string | null;
  floorNumber: number | null;

  // Marketing content
  title: string | null;
  subtitle: string | null;
  description: string | null;

  // Specifications
  areaSqm: number;
  bedrooms: number | null;
  bathrooms: number | null;
  price: number;
  livingRooms: number | null;
  kitchens: number | null;
  balconies: number | null;

  // Status & visibility
  status: ApartmentStatus;
  isModelUnit: boolean;
  isPublished: boolean;
  virtualVisitUrl: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Virtual relations
  project?: any;
  photos?: any[];
  floorPlans?: any[];
}

/**
 * Create apartment DTO
 */
export interface CreateApartmentDto {
  projectId: number;
  name: string;
  unitNumber?: string;
  floorNumber?: number;
  title?: string;
  subtitle?: string;
  description?: string;
  areaSqm: number;
  bedrooms?: number;
  bathrooms?: number;
  price: number;
  livingRooms?: number;
  kitchens?: number;
  balconies?: number;
  status?: ApartmentStatus;
  isModelUnit?: boolean;
  isPublished?: boolean;
  virtualVisitUrl?: string;
}

/**
 * Update apartment DTO
 */
export interface UpdateApartmentDto extends Partial<CreateApartmentDto> {}

/**
 * Apartment query options
 */
export interface ApartmentQueryOptions extends AdvancedQueryOptions {
  projectId?: number | number[];
  status?: ApartmentStatus | ApartmentStatus[];
  isModelUnit?: boolean;
  isPublished?: boolean;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number | number[];
  minBedrooms?: number;
  maxBedrooms?: number;
  bathrooms?: number | number[];
  minArea?: number;
  maxArea?: number;
  floorNumber?: number | number[];
  minFloor?: number;
  maxFloor?: number;
  hasVirtualVisit?: boolean;

  includePhotos?: boolean;
  includeFloorPlans?: boolean;
}


/**
 * Apartment availability summary
 */
export interface ApartmentAvailabilitySummary {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  availabilityRate: number;
  soldRate: number;
}

// ============================================================================
// APARTMENT MODEL CLASS
// ============================================================================

export class ApartmentModel extends BaseModel<
  Apartment,
  CreateApartmentDto,
  UpdateApartmentDto
> {
  protected tableName = "apartments";
  protected primaryKey = "id";

  protected config = {
    softDelete: true,
    timestamps: true,
    defaultSortColumn: "unit_number",
    defaultSortOrder: "asc" as const,
    searchableColumns: ["name", "unit_number", "title", "description"],
    hiddenFields: [],
    fillable: [
      "projectId",
      "name",
      "unitNumber",
      "floorNumber",
      "title",
      "subtitle",
      "description",
      "areaSqm",
      "bedrooms",
      "bathrooms",
      "price",
      "livingRooms",
      "kitchens",
      "balconies",
      "status",
      "isModelUnit",
      "isPublished",
      "virtualVisitUrl",
    ],
    guarded: ["id", "createdAt", "updatedAt", "deletedAt"],
  };

  // Define relations
  protected relations = {
    project: {
      type: "belongsTo" as const,
      model: () => require("./project.model").default,
      foreignKey: "projectId",
      localKey: "id",
    },
  };

  // ============================================================================
  // MEDIA LOADING METHODS
  // ============================================================================

  /**
   * Loads photos for an apartment
   */
  async loadPhotos(
    apartmentId: number,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    return PhotoModel.getForEntity(
      PhotoableType.APARTMENT,
      apartmentId,
      {},
      trx
    );
  }

  /**
   * Loads floor plans for an apartment
   */
  async loadFloorPlans(
    apartmentId: number,
    trx?: Knex.Transaction
  ): Promise<FloorPlan[]> {
    return FloorPlanModel.getForEntity(
      PlannableType.APARTMENT,
      apartmentId,
      {},
      trx
    );
  }

  /**
   * Loads both photos and floor plans for an apartment
   */
  async loadMedia(
    apartmentId: number,
    trx?: Knex.Transaction
  ): Promise<{ photos: Photo[]; floorPlans: FloorPlan[] }> {
    const [photos, floorPlans] = await Promise.all([
      this.loadPhotos(apartmentId, trx),
      this.loadFloorPlans(apartmentId, trx),
    ]);

    return { photos, floorPlans };
  }

  /**
   * Loads photos for multiple apartments (optimized)
   */
  private async loadPhotosForMany(
    apartmentIds: number[],
    trx?: Knex.Transaction
  ): Promise<Map<number, Photo[]>> {
    if (apartmentIds.length === 0) return new Map();

    const photos = await PhotoModel.findPhotos(
      {
        polymorphicType: PhotoableType.APARTMENT,
        polymorphicId: apartmentIds,
      },
      trx
    );

    const photosByApartment = new Map<number, Photo[]>();
    for (const photo of photos) {
      if (!photosByApartment.has(photo.photoableId)) {
        photosByApartment.set(photo.photoableId, []);
      }
      photosByApartment.get(photo.photoableId)!.push(photo);
    }

    return photosByApartment;
  }

  /**
   * Loads floor plans for multiple apartments (optimized)
   */
  private async loadFloorPlansForMany(
    apartmentIds: number[],
    trx?: Knex.Transaction
  ): Promise<Map<number, FloorPlan[]>> {
    if (apartmentIds.length === 0) return new Map();

    const floorPlans = await FloorPlanModel.findFloorPlans(
      {
        polymorphicType: PlannableType.APARTMENT,
        polymorphicId: apartmentIds,
      },
      trx
    );

    const plansByApartment = new Map<number, FloorPlan[]>();
    for (const plan of floorPlans) {
      if (!plansByApartment.has(plan.plannableId)) {
        plansByApartment.set(plan.plannableId, []);
      }
      plansByApartment.get(plan.plannableId)!.push(plan);
    }

    return plansByApartment;
  }

  /**
   * Finds apartment by ID with optional media
   * NEW METHOD - Add this
   */
  async findByIdWithMedia(
    id: number,
    options: {
      includePhotos?: boolean;
      includeFloorPlans?: boolean;
      includeRelations?: string[];
    } = {},
    trx?: Knex.Transaction
  ): Promise<Apartment | null> {
    const apartment = await this.findById(
      id,
      { relations: options.includeRelations },
      trx
    );

    if (!apartment) return null;

    // Load media if requested
    if (options.includePhotos || options.includeFloorPlans) {
      const media = await this.loadMedia(id, trx);

      return {
        ...apartment,
        ...(options.includePhotos && { photos: media.photos }),
        ...(options.includeFloorPlans && { floorPlans: media.floorPlans }),
      };
    }

    return apartment;
  }

  /**
   * Validates required media before publishing
   * NEW METHOD - Add this
   */
  async validateMediaForPublishing(
    apartmentId: number,
    trx?: Knex.Transaction
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for at least one photo
    const photoCount = await PhotoModel.countForEntity(
      PhotoableType.APARTMENT,
      apartmentId,
      trx
    );

    if (photoCount === 0) {
      errors.push("At least one photo is required");
    }

    // Check for cover photo
    const coverPhoto = await PhotoModel.getCoverPhoto(
      PhotoableType.APARTMENT,
      apartmentId,
      trx
    );

    if (!coverPhoto) {
      errors.push("Cover photo is required");
    }

    // Check for floor plan (optional but recommended)
    const floorPlanCount = await FloorPlanModel.countForEntity(
      PlannableType.APARTMENT,
      apartmentId,
      trx
    );

    if (floorPlanCount === 0) {
      // Warning only, not an error
      console.warn(`⚠️ Apartment ${apartmentId} has no floor plans`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Before create hook - validate specifications
   */
  protected async beforeCreate(
    data: CreateApartmentDto
  ): Promise<CreateApartmentDto> {
    // Validate project exists
    const project = await this.db("projects")
      .where("id", data.projectId)
      .whereNull("deleted_at")
      .first();

    if (!project) {
      throw new Error(`Project with ID ${data.projectId} not found`);
    }

    // Validate area
    if (data.areaSqm <= 0) {
      throw new Error("Area must be greater than 0");
    }

    // Validate price
    if (data.price <= 0) {
      throw new Error("Price must be greater than 0");
    }

    // Validate counts are non-negative
    this.validateRoomCounts(data);

    // Set default status
    if (!data.status) {
      data.status = ApartmentStatus.AVAILABLE;
    }

    // Validate unit number uniqueness within project
    if (data.unitNumber) {
      const existing = await this.db(this.tableName)
        .where({
          project_id: data.projectId,
          unit_number: data.unitNumber,
        })
        .whereNull("deleted_at")
        .first();

      if (existing) {
        throw new Error(
          `Unit number "${data.unitNumber}" already exists in this project`
        );
      }
    }

    return data;
  }

  /**
   * After create hook - project price range is auto-updated by trigger
   */
  protected async afterCreate(entity: Apartment): Promise<void> {
    console.log(
      `✅ Apartment created: ${entity.name} (Project: ${entity.projectId}, Status: ${entity.status})`
    );
  }

  /**
   * Before update hook - validate changes
   */
  protected async beforeUpdate(
    id: number,
    data: UpdateApartmentDto
  ): Promise<UpdateApartmentDto> {
    const apartment = await this.findById(id);
    if (!apartment) {
      throw new Error("Apartment not found");
    }

    // Validate area if provided
    if (data.areaSqm !== undefined && data.areaSqm <= 0) {
      throw new Error("Area must be greater than 0");
    }

    // Validate price if provided
    if (data.price !== undefined && data.price <= 0) {
      throw new Error("Price must be greater than 0");
    }

    // Validate room counts
    this.validateRoomCounts(data);

    // Validate unit number uniqueness if changing
    if (data.unitNumber && data.unitNumber !== apartment.unitNumber) {
      const existing = await this.db(this.tableName)
        .where({
          project_id: apartment.projectId,
          unit_number: data.unitNumber,
        })
        .where("id", "!=", id)
        .whereNull("deleted_at")
        .first();

      if (existing) {
        throw new Error(
          `Unit number "${data.unitNumber}" already exists in this project`
        );
      }
    }

    // If changing project, validate new project exists
    if (data.projectId && data.projectId !== apartment.projectId) {
      const project = await this.db("projects")
        .where("id", data.projectId)
        .whereNull("deleted_at")
        .first();

      if (!project) {
        throw new Error(`Project with ID ${data.projectId} not found`);
      }
    }

    // If publishing, validate media
    if (data.isPublished && !apartment.isPublished) {
      const mediaValidation = await this.validateMediaForPublishing(id);
      if (!mediaValidation.valid) {
        throw new Error(
          `Cannot publish apartment: ${mediaValidation.errors.join(", ")}`
        );
      }
    }

    return data;
  }

  /**
   * After update hook - price trigger handles project price range update
   */
  protected async afterUpdate(entity: Apartment): Promise<void> {
    console.log(`✅ Apartment updated: ${entity.name} (ID: ${entity.id})`);
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Finds apartments with custom filters and optional media loading
   */
  async findApartments(
    options: ApartmentQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    // Apply apartment-specific filters
    query = this.applyApartmentFilters(query, options);

    const records = await query;
    let entities = records.map((r: DatabaseRecord) => this.mapToEntity(r));

    // Load standard relations if requested
    if (options.relations && options.relations.length > 0) {
      entities = await this.loadRelationsForMany(
        entities,
        options.relations,
        trx
      );
    }

    // Load photos if requested
    if (options.includePhotos) {
      const apartmentIds = entities.map((e: DatabaseRecord) => e.id);
      const photosByApartment = await this.loadPhotosForMany(apartmentIds, trx);

      entities = entities.map((entity: DatabaseRecord) => ({
        ...entity,
        photos: photosByApartment.get(entity.id) || [],
      }));
    }

    // Load floor plans if requested
    if (options.includeFloorPlans) {
      const apartmentIds = entities.map((e: DatabaseRecord) => e.id);
      const plansByApartment = await this.loadFloorPlansForMany(
        apartmentIds,
        trx
      );

      entities = entities.map((entity: DatabaseRecord) => ({
        ...entity,
        floorPlans: plansByApartment.get(entity.id) || [],
      }));
    }

    return entities;
  }

  /**
   * Gets paginated apartments
   */
  async paginateApartments(
    options: ApartmentQueryOptions & { page: number; limit: number },
    trx?: Knex.Transaction
  ): Promise<PaginatedResult<Apartment>> {
    const { page, limit } = options;

    const [items, total] = await Promise.all([
      this.findApartments(options, trx),
      this.countApartments(options, trx),
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
   * Counts apartments with filters
   */
  async countApartments(
    options: ApartmentQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;
    let query = connection(this.tableName);

    if (!options.includeDeleted && this.config.softDelete) {
      query = query.whereNull("deleted_at");
    }

    query = this.applyApartmentFilters(query, options);

    const result = await query.count(`${this.primaryKey} as count`).first();
    return result ? Number(result.count) : 0;
  }

  /**
   * Finds apartments by project
   */
  async findByProject(
    projectId: number,
    options: ApartmentQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    return this.findApartments({ ...options, projectId }, trx);
  }

  /**
   * Finds available apartments with media
   */
  async findAvailable(
    projectId?: number,
    options: ApartmentQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    const queryOptions: ApartmentQueryOptions = {
      ...options,
      status: ApartmentStatus.AVAILABLE,
      isPublished: true,
    };

    if (projectId) {
      queryOptions.projectId = projectId;
    }

    return this.findApartments(queryOptions, trx);
  }

  /**
   * Finds sold apartments
   */
  async findSold(
    projectId?: number,
    options: ApartmentQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    const queryOptions: ApartmentQueryOptions = {
      ...options,
      status: ApartmentStatus.SOLD,
    };

    if (projectId) {
      queryOptions.projectId = projectId;
    }

    return this.findApartments(queryOptions, trx);
  }

  /**
   * Finds reserved apartments
   */
  async findReserved(
    projectId?: number,
    options: ApartmentQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    const queryOptions: ApartmentQueryOptions = {
      ...options,
      status: ApartmentStatus.RESERVED,
    };

    if (projectId) {
      queryOptions.projectId = projectId;
    }

    return this.findApartments(queryOptions, trx);
  }

  /**
   * Finds model units
   */
  async findModelUnits(
    projectId?: number,
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    const options: ApartmentQueryOptions = {
      isModelUnit: true,
      isPublished: true,
    };

    if (projectId) {
      options.projectId = projectId;
    }

    return this.findApartments(options, trx);
  }

  /**
   * Finds apartments by floor
   */
  async findByFloor(
    projectId: number,
    floorNumber: number,
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    return this.findApartments({ projectId, floorNumber }, trx);
  }

  /**
   * Finds apartments by unit number
   */
  async findByUnitNumber(
    unitNumber: string,
    projectId?: number,
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    const connection = trx || this.db;
    let query = connection(this.tableName)
      .where("unit_number", unitNumber)
      .whereNull("deleted_at");

    if (projectId) {
      query = query.where("project_id", projectId);
    }

    const records = await query;
    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  // ============================================================================
  // STATUS MANAGEMENT
  // ============================================================================

  /**
   * Updates apartment status
   */
  async updateStatus(
    id: number,
    status: ApartmentStatus,
    trx?: Knex.Transaction
  ): Promise<Apartment | null> {
    return this.update(id, { status }, trx);
  }

  /**
   * Marks apartment as sold
   */
  async markAsSold(
    id: number,
    trx?: Knex.Transaction
  ): Promise<Apartment | null> {
    return this.updateStatus(id, ApartmentStatus.SOLD, trx);
  }

  /**
   * Marks apartment as reserved
   */
  async markAsReserved(
    id: number,
    trx?: Knex.Transaction
  ): Promise<Apartment | null> {
    return this.updateStatus(id, ApartmentStatus.RESERVED, trx);
  }

  /**
   * Marks apartment as available
   */
  async markAsAvailable(
    id: number,
    trx?: Knex.Transaction
  ): Promise<Apartment | null> {
    return this.updateStatus(id, ApartmentStatus.AVAILABLE, trx);
  }

  /**
   * Bulk status update
   */
  async bulkUpdateStatus(
    ids: number[],
    status: ApartmentStatus,
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;

    const updated = await connection(this.tableName)
      .whereIn("id", ids)
      .whereNull("deleted_at")
      .update({
        status,
        updated_at: connection.fn.now(),
      });

    return updated;
  }

  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================

  /**
   * Gets availability summary for a project
   */
  async getAvailabilitySummary(
    projectId: number,
    trx?: Knex.Transaction
  ): Promise<ApartmentAvailabilitySummary> {
    const connection = trx || this.db;

    const [stats] = await connection(this.tableName)
      .where("project_id", projectId)
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
      );

    const total = Number(stats.total);
    const available = Number(stats.available);
    const sold = Number(stats.sold);

    return {
      total,
      available,
      reserved: Number(stats.reserved),
      sold,
      availabilityRate: total > 0 ? (available / total) * 100 : 0,
      soldRate: total > 0 ? (sold / total) * 100 : 0,
    };
  }

  /**
   * Gets apartment statistics by project
   */
  async getProjectStatistics(
    projectId: number,
    trx?: Knex.Transaction
  ): Promise<any> {
    const connection = trx || this.db;

    const [stats] = await connection(this.tableName)
      .where("project_id", projectId)
      .whereNull("deleted_at")
      .select(
        connection.raw("COUNT(*) as total"),
        connection.raw(
          "COUNT(CASE WHEN status = 'available' THEN 1 END) as available"
        ),
        connection.raw(
          "COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved"
        ),
        connection.raw("COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold"),
        connection.raw(
          "COUNT(CASE WHEN is_published = true THEN 1 END) as published"
        ),
        connection.raw(
          "COUNT(CASE WHEN is_model_unit = true THEN 1 END) as modelUnits"
        ),
        connection.raw("MIN(price) as minPrice"),
        connection.raw("MAX(price) as maxPrice"),
        connection.raw("AVG(price) as avgPrice"),
        connection.raw("MIN(area_sqm) as minArea"),
        connection.raw("MAX(area_sqm) as maxArea"),
        connection.raw("AVG(area_sqm) as avgArea"),
        connection.raw("MIN(floor_number) as minFloor"),
        connection.raw("MAX(floor_number) as maxFloor")
      );

    return {
      total: Number(stats.total),
      available: Number(stats.available),
      reserved: Number(stats.reserved),
      sold: Number(stats.sold),
      published: Number(stats.published),
      modelUnits: Number(stats.modelUnits),
      pricing: {
        min: stats.minPrice ? Number(stats.minPrice) : null,
        max: stats.maxPrice ? Number(stats.maxPrice) : null,
        avg: stats.avgPrice ? Number(stats.avgPrice) : null,
      },
      area: {
        min: stats.minArea ? Number(stats.minArea) : null,
        max: stats.maxArea ? Number(stats.maxArea) : null,
        avg: stats.avgArea ? Number(stats.avgArea) : null,
      },
      floors: {
        min: stats.minFloor,
        max: stats.maxFloor,
      },
    };
  }

  /**
   * Gets floor distribution for a project
   */
  async getFloorDistribution(
    projectId: number,
    trx?: Knex.Transaction
  ): Promise<any[]> {
    const connection = trx || this.db;

    return connection(this.tableName)
      .where("project_id", projectId)
      .whereNull("deleted_at")
      .select("floor_number")
      .count("* as count")
      .groupBy("floor_number")
      .orderBy("floor_number", "asc");
  }

  /**
   * Gets bedroom distribution for a project
   */
  async getBedroomDistribution(
    projectId: number,
    trx?: Knex.Transaction
  ): Promise<any[]> {
    const connection = trx || this.db;

    return connection(this.tableName)
      .where("project_id", projectId)
      .whereNull("deleted_at")
      .select("bedrooms")
      .count("* as count")
      .groupBy("bedrooms")
      .orderBy("bedrooms", "asc");
  }

  /**
   * Gets price distribution for a project
   */
  async getPriceDistribution(
    projectId: number,
    bucketCount: number = 5,
    trx?: Knex.Transaction
  ): Promise<any[]> {
    const connection = trx || this.db;

    // Get price range
    const [range] = await connection(this.tableName)
      .where("project_id", projectId)
      .whereNull("deleted_at")
      .select(
        connection.raw("MIN(price) as minPrice"),
        connection.raw("MAX(price) as maxPrice")
      );

    if (!range.minPrice || !range.maxPrice) return [];

    const minPrice = Number(range.minPrice);
    const maxPrice = Number(range.maxPrice);
    const bucketSize = (maxPrice - minPrice) / bucketCount;

    const buckets = [];
    for (let i = 0; i < bucketCount; i++) {
      const bucketMin = minPrice + i * bucketSize;
      const bucketMax =
        i === bucketCount - 1 ? maxPrice : bucketMin + bucketSize;

      const [count] = await connection(this.tableName)
        .where("project_id", projectId)
        .where("price", ">=", bucketMin)
        .where("price", "<=", bucketMax)
        .whereNull("deleted_at")
        .count("* as count");

      buckets.push({
        min: Math.round(bucketMin),
        max: Math.round(bucketMax),
        count: Number(count.count),
      });
    }

    return buckets;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Validates room counts are non-negative
   */
  private validateRoomCounts(data: Partial<CreateApartmentDto>): void {
    const fields = [
      "bedrooms",
      "bathrooms",
      "livingRooms",
      "kitchens",
      "balconies",
    ];

    for (const field of fields) {
      const value = (data as any)[field];
      if (value !== undefined && value !== null && value < 0) {
        throw new Error(`${field} cannot be negative`);
      }
    }

    // Validate floor number allows basements
    if (
      data.floorNumber !== undefined &&
      data.floorNumber !== null &&
      data.floorNumber < -5
    ) {
      throw new Error("Floor number cannot be less than -5 (basement levels)");
    }
  }

  /**
   * Applies apartment-specific filters to query
   */
  private applyApartmentFilters(
    query: Knex.QueryBuilder,
    options: ApartmentQueryOptions
  ): Knex.QueryBuilder {
    // Project filter
    if (options.projectId) {
      if (Array.isArray(options.projectId)) {
        query = query.whereIn("project_id", options.projectId);
      } else {
        query = query.where("project_id", options.projectId);
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

    // Model unit filter
    if (options.isModelUnit !== undefined) {
      query = query.where("is_model_unit", options.isModelUnit);
    }

    // Published filter
    if (options.isPublished !== undefined) {
      query = query.where("is_published", options.isPublished);
    }

    // Price range filters
    if (options.minPrice !== undefined) {
      query = query.where("price", ">=", options.minPrice);
    }
    if (options.maxPrice !== undefined) {
      query = query.where("price", "<=", options.maxPrice);
    }

    // Bedroom filters
    if (options.bedrooms) {
      if (Array.isArray(options.bedrooms)) {
        query = query.whereIn("bedrooms", options.bedrooms);
      } else {
        query = query.where("bedrooms", options.bedrooms);
      }
    }
    if (options.minBedrooms !== undefined) {
      query = query.where("bedrooms", ">=", options.minBedrooms);
    }
    if (options.maxBedrooms !== undefined) {
      query = query.where("bedrooms", "<=", options.maxBedrooms);
    }

    // Bathroom filters
    if (options.bathrooms) {
      if (Array.isArray(options.bathrooms)) {
        query = query.whereIn("bathrooms", options.bathrooms);
      } else {
        query = query.where("bathrooms", options.bathrooms);
      }
    }

    // Area filters
    if (options.minArea !== undefined) {
      query = query.where("area_sqm", ">=", options.minArea);
    }
    if (options.maxArea !== undefined) {
      query = query.where("area_sqm", "<=", options.maxArea);
    }

    // Floor filters
    if (options.floorNumber) {
      if (Array.isArray(options.floorNumber)) {
        query = query.whereIn("floor_number", options.floorNumber);
      } else {
        query = query.where("floor_number", options.floorNumber);
      }
    }
    if (options.minFloor !== undefined) {
      query = query.where("floor_number", ">=", options.minFloor);
    }
    if (options.maxFloor !== undefined) {
      query = query.where("floor_number", "<=", options.maxFloor);
    }

    // Virtual visit filter
    if (options.hasVirtualVisit !== undefined) {
      if (options.hasVirtualVisit) {
        query = query.whereNotNull("virtual_visit_url");
      } else {
        query = query.whereNull("virtual_visit_url");
      }
    }

    return query;
  }

  /**
   * Maps database record to Apartment entity
   */
  protected mapToEntity(record: DatabaseRecord): Apartment {
    return {
      id: record.id,
      projectId: record.project_id,
      name: record.name,
      unitNumber: record.unit_number,
      floorNumber: record.floor_number,
      title: record.title,
      subtitle: record.subtitle,
      description: record.description,
      areaSqm: Number(record.area_sqm),
      bedrooms: record.bedrooms,
      bathrooms: record.bathrooms,
      price: Number(record.price),
      livingRooms: record.living_rooms,
      kitchens: record.kitchens,
      balconies: record.balconies,
      status: record.status as ApartmentStatus,
      isModelUnit: Boolean(record.is_model_unit),
      isPublished: Boolean(record.is_published),
      virtualVisitUrl: record.virtual_visit_url,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

// Export singleton instance
export default new ApartmentModel();
