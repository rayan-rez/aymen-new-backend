/**
 * Apartment Model
 * Represents apartment units within projects
 * Manages individual residential units in development projects
 *
 * @module models/apartment.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";
import PhotoModel, { PhotoableType } from "./photo.model";
import FloorPlanModel, { PlannableType } from "./floor-plan.model";

/**
 * Apartment status enumeration
 * Defines the current availability status
 */
export enum ApartmentStatus {
  AVAILABLE = "available",
  RESERVED = "reserved",
  SOLD = "sold",
}

/**
 * Apartment entity interface
 * Represents an apartment unit
 */
export interface Apartment {
  /** Unique identifier */
  id: number;

  /** Parent project ID */
  projectId: number;

  /** Apartment name/number */
  name: string;

  /** Apartment title */
  title: string | null;

  /** Apartment subtitle */
  subtitle: string | null;

  /** Apartment description */
  description: string | null;

  /** Area in square meters */
  areaSqm: number | null;

  /** Number of bedrooms */
  bedrooms: number | null;

  /** Number of bathrooms */
  bathrooms: number | null;

  /** Price */
  price: number | null;

  /** Availability status */
  status: ApartmentStatus;

  /** Whether this is a model unit */
  isModelUnit: boolean;

  /** Virtual tour URL */
  virtualTourUrl: string | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** Soft delete timestamp */
  deletedAt: Date | null;
}

/**
 * Create apartment DTO
 */
export interface CreateApartmentDto {
  projectId: number;
  name: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  areaSqm?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  price?: number | null;
  status?: ApartmentStatus;
  isModelUnit?: boolean;
  virtualTourUrl?: string | null;
}

/**
 * Update apartment DTO
 */
export interface UpdateApartmentDto {
  projectId?: number;
  name?: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  areaSqm?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  price?: number | null;
  status?: ApartmentStatus;
  isModelUnit?: boolean;
  virtualTourUrl?: string | null;
}

/**
 * Apartment query parameters
 */
export interface ApartmentQueryParams extends BaseQueryParams {
  projectId?: number;
  status?: ApartmentStatus;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  isModelUnit?: boolean;
  includeDeleted?: boolean;
}

/**
 * Apartment with relations
 */
export interface ApartmentWithRelations extends Apartment {
  photos?: any[];
  floorPlans?: any[];
  project?: any;
}

/**
 * Apartment Model class
 * Handles all database operations for apartments
 */
class ApartmentModel extends BaseModel<
  Apartment,
  CreateApartmentDto,
  UpdateApartmentDto
> {
  protected tableName = "apartments";

  /**
   * Finds all apartments matching query parameters
   */
  async findAll(params: ApartmentQueryParams = {}): Promise<Apartment[]> {
    let query = this.db(this.tableName);

    if (!params.includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    if (params.projectId !== undefined) {
      query = query.where({ project_id: params.projectId });
    }

    if (params.status) {
      query = query.where({ status: params.status });
    }

    if (params.bedrooms !== undefined) {
      query = query.where({ bedrooms: params.bedrooms });
    }

    if (params.isModelUnit !== undefined) {
      query = query.where({ is_model_unit: params.isModelUnit });
    }

    if (params.minPrice !== undefined) {
      query = query.where("price", ">=", params.minPrice);
    }

    if (params.maxPrice !== undefined) {
      query = query.where("price", "<=", params.maxPrice);
    }

    if (params.sortBy) {
      query = query.orderBy(params.sortBy, params.sortOrder || "asc");
    }

    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const apartments = await query;
    return apartments.map(this.mapToEntity);
  }

  /**
   * Gets apartments by project
   */
  async findByProject(projectId: number): Promise<Apartment[]> {
    return this.findAll({ projectId });
  }

  /**
   * Gets available apartments
   */
  async getAvailable(projectId?: number): Promise<Apartment[]> {
    return this.findAll({
      projectId,
      status: ApartmentStatus.AVAILABLE,
    });
  }

  /**
   * Gets model units
   */
  async getModelUnits(projectId?: number): Promise<Apartment[]> {
    return this.findAll({
      projectId,
      isModelUnit: true,
    });
  }

  /**
   * Gets apartment with photos
   * UPDATED: Now uses polymorphic PhotoModel
   */
  async getWithPhotos(
    apartmentId: number
  ): Promise<ApartmentWithRelations | null> {
    const apartment = await this.findById(apartmentId);
    if (!apartment) return null;

    const photos = await PhotoModel.getForEntity(
      PhotoableType.APARTMENT,
      apartmentId
    );

    return { ...apartment, photos };
  }

  /**
   * Gets complete apartment data
   * UPDATED: Now uses polymorphic models
   */
  async getComplete(
    apartmentId: number
  ): Promise<ApartmentWithRelations | null> {
    const apartment = await this.findById(apartmentId);
    if (!apartment) return null;

    const [photos, floorPlans, project] = await Promise.all([
      PhotoModel.getForEntity(PhotoableType.APARTMENT, apartmentId),

      FloorPlanModel.getForEntity(PlannableType.APARTMENT, apartmentId),

      this.db("projects").where({ id: apartment.projectId }).first(),
    ]);

    return { ...apartment, photos, floorPlans, project };
  }

  /**
   * Updates apartment status
   */
  async updateStatus(
    apartmentId: number,
    status: ApartmentStatus
  ): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id: apartmentId })
      .update({ status, updated_at: this.db.fn.now() });

    return updated > 0;
  }

  /**
   * Maps database record to Apartment entity
   */
  protected mapToEntity(record: any): Apartment {
    return {
      id: record.id,
      projectId: record.project_id,
      name: record.name,
      title: record.title,
      subtitle: record.subtitle,
      description: record.description,
      areaSqm: record.area_sqm ? parseFloat(record.area_sqm) : null,
      bedrooms: record.bedrooms,
      bathrooms: record.bathrooms,
      price: record.price ? parseFloat(record.price) : null,
      status: record.status as ApartmentStatus,
      isModelUnit: Boolean(record.is_model_unit),
      virtualTourUrl: record.virtual_tour_url,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

export default new ApartmentModel();