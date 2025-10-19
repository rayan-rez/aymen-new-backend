/**
 * Commercial Property Model
 * Represents commercial real estate properties (offices, shops, warehouses)
 * Manages commercial property listings and details
 *
 * @module models/commercial-property.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Commercial property type enumeration
 * Defines the category of commercial property
 */
export enum CommercialPropertyType {
  OFFICE = "office",
  SHOP = "shop",
  WAREHOUSE = "warehouse",
  SHOWROOM = "showroom",
  RESTAURANT = "restaurant",
  MIXED_USE = "mixed_use",
}

/**
 * Commercial property status enumeration
 * Defines the availability status
 */
export enum CommercialPropertyStatus {
  AVAILABLE = "available",
  RENTED = "rented",
  SOLD = "sold",
}

/**
 * Commercial property entity interface
 * Represents a commercial property listing
 */
export interface CommercialProperty {
  /** Unique identifier */
  id: number;

  /** Property title */
  title: string;

  /** URL-friendly slug */
  slug: string;

  /** Subtitle */
  subtitle: string | null;

  /** Full description */
  description: string;

  /** Card/preview description */
  cardDescription: string | null;

  /** Physical address */
  address: string;

  /** Google Maps embed code */
  mapEmbedCode: string | null;

  /** Latitude coordinate */
  latitude: number | null;

  /** Longitude coordinate */
  longitude: number | null;

  /** Property type */
  propertyType: CommercialPropertyType;

  /** Area in square meters */
  areaSqm: number | null;

  /** Price */
  price: number | null;

  /** Property status */
  status: CommercialPropertyStatus;

  /** Main image URL */
  mainImageUrl: string | null;

  /** Contact form ID */
  contactFormId: string | null;

  /** Whether the property is featured */
  isFeatured: boolean;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** Soft delete timestamp */
  deletedAt: Date | null;
}

/**
 * Create commercial property DTO
 */
export interface CreateCommercialPropertyDto {
  title: string;
  slug: string;
  subtitle?: string | null;
  description: string;
  cardDescription?: string | null;
  address: string;
  mapEmbedCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  propertyType: CommercialPropertyType;
  areaSqm?: number | null;
  price?: number | null;
  status?: CommercialPropertyStatus;
  mainImageUrl?: string | null;
  contactFormId?: string | null;
  isFeatured?: boolean;
}

/**
 * Update commercial property DTO
 */
export interface UpdateCommercialPropertyDto {
  title?: string;
  slug?: string;
  subtitle?: string | null;
  description?: string;
  cardDescription?: string | null;
  address?: string;
  mapEmbedCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  propertyType?: CommercialPropertyType;
  areaSqm?: number | null;
  price?: number | null;
  status?: CommercialPropertyStatus;
  mainImageUrl?: string | null;
  contactFormId?: string | null;
  isFeatured?: boolean;
}

/**
 * Commercial property query parameters
 */
export interface CommercialPropertyQueryParams extends BaseQueryParams {
  propertyType?: CommercialPropertyType;
  status?: CommercialPropertyStatus;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  isFeatured?: boolean;
  includeDeleted?: boolean;
}

/**
 * Commercial property with relations
 */
export interface CommercialPropertyWithRelations extends CommercialProperty {
  photos?: any[];
  locations?: any[];
}

/**
 * Commercial Property Model class
 * Handles all database operations for commercial properties
 */
class CommercialPropertyModel extends BaseModel<
  CommercialProperty,
  CreateCommercialPropertyDto,
  UpdateCommercialPropertyDto
> {
  protected tableName = "commercial_properties";

  /**
   * Finds a commercial property by slug
   *
   * @param slug - Property slug
   * @param includeDeleted - Whether to include soft-deleted properties
   * @returns Promise<CommercialProperty | null> - Property or null if not found
   *
   * @example
   * const property = await CommercialPropertyModel.findBySlug("downtown-office");
   */
  async findBySlug(
    slug: string,
    includeDeleted: boolean = false
  ): Promise<CommercialProperty | null> {
    let query = this.db(this.tableName).where({ slug });

    if (!includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    const record = await query.first();
    return record ? this.mapToEntity(record) : null;
  }

  /**
   * Finds all commercial properties matching query parameters
   *
   * @param params - Query parameters
   * @returns Promise<CommercialProperty[]> - Array of properties
   *
   * @example
   * const offices = await CommercialPropertyModel.findAll({
   *   propertyType: CommercialPropertyType.OFFICE,
   *   status: CommercialPropertyStatus.AVAILABLE
   * });
   */
  async findAll(
    params: CommercialPropertyQueryParams = {}
  ): Promise<CommercialProperty[]> {
    let query = this.db(this.tableName);

    if (!params.includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    if (params.propertyType) {
      query = query.where({ property_type: params.propertyType });
    }

    if (params.status) {
      query = query.where({ status: params.status });
    }

    if (params.isFeatured !== undefined) {
      query = query.where({ is_featured: params.isFeatured });
    }

    if (params.minPrice !== undefined) {
      query = query.where("price", ">=", params.minPrice);
    }

    if (params.maxPrice !== undefined) {
      query = query.where("price", "<=", params.maxPrice);
    }

    if (params.minArea !== undefined) {
      query = query.where("area_sqm", ">=", params.minArea);
    }

    if (params.maxArea !== undefined) {
      query = query.where("area_sqm", "<=", params.maxArea);
    }

    if (params.sortBy) {
      query = query.orderBy(params.sortBy, params.sortOrder || "asc");
    } else {
      query = query.orderBy("created_at", "desc");
    }

    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const properties = await query;
    return properties.map(this.mapToEntity);
  }

  /**
   * Gets featured commercial properties
   *
   * @param limit - Maximum number of properties to return
   * @returns Promise<CommercialProperty[]> - Array of featured properties
   *
   * @example
   * const featured = await CommercialPropertyModel.getFeatured(5);
   */
  async getFeatured(limit: number = 10): Promise<CommercialProperty[]> {
    const properties = await this.db(this.tableName)
      .where({ is_featured: true })
      .whereNull("deleted_at")
      .orderBy("created_at", "desc")
      .limit(limit);

    return properties.map(this.mapToEntity);
  }

  /**
   * Gets available properties by type
   *
   * @param propertyType - Type of commercial property
   * @returns Promise<CommercialProperty[]> - Available properties
   *
   * @example
   * const offices = await CommercialPropertyModel.getAvailableByType(CommercialPropertyType.OFFICE);
   */
  async getAvailableByType(
    propertyType: CommercialPropertyType
  ): Promise<CommercialProperty[]> {
    return this.findAll({
      propertyType,
      status: CommercialPropertyStatus.AVAILABLE,
    });
  }

  /**
   * Gets property with photos
   *
   * @param propertyId - Property ID
   * @returns Promise<CommercialPropertyWithRelations | null> - Property with photos
   *
   * @example
   * const property = await CommercialPropertyModel.getWithPhotos(1);
   */
  async getWithPhotos(
    propertyId: number
  ): Promise<CommercialPropertyWithRelations | null> {
    const property = await this.findById(propertyId);
    if (!property) return null;

    const photos = await this.db("commercial_property_photos")
      .where({ property_id: propertyId })
      .orderBy("display_order", "asc");

    return { ...property, photos };
  }

  /**
   * Gets complete property data with all relations
   *
   * @param propertyId - Property ID
   * @returns Promise<CommercialPropertyWithRelations | null> - Complete property data
   *
   * @example
   * const property = await CommercialPropertyModel.getComplete(1);
   */
  async getComplete(
    propertyId: number
  ): Promise<CommercialPropertyWithRelations | null> {
    const property = await this.findById(propertyId);
    if (!property) return null;

    const [photos, locations] = await Promise.all([
      this.db("commercial_property_photos")
        .where({ property_id: propertyId })
        .orderBy("display_order", "asc"),

      this.db("commercial_property_locations as cpl")
        .join("locations as l", "cpl.location_id", "l.id")
        .where("cpl.property_id", propertyId)
        .select("l.*"),
    ]);

    return { ...property, photos, locations };
  }

  /**
   * Updates property status
   *
   * @param propertyId - Property ID
   * @param status - New status
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await CommercialPropertyModel.updateStatus(1, CommercialPropertyStatus.RENTED);
   */
  async updateStatus(
    propertyId: number,
    status: CommercialPropertyStatus
  ): Promise<boolean> {
    const updated = await this.db(this.tableName)
      .where({ id: propertyId })
      .update({ status, updated_at: this.db.fn.now() });

    return updated > 0;
  }

  /**
   * Maps database record to CommercialProperty entity
   *
   * @param record - Database record
   * @returns CommercialProperty entity
   *
   * @protected
   */
  protected mapToEntity(record: any): CommercialProperty {
    return {
      id: record.id,
      title: record.title,
      slug: record.slug,
      subtitle: record.subtitle,
      description: record.description,
      cardDescription: record.card_description,
      address: record.address,
      mapEmbedCode: record.map_embed_code,
      latitude: record.latitude ? parseFloat(record.latitude) : null,
      longitude: record.longitude ? parseFloat(record.longitude) : null,
      propertyType: record.property_type as CommercialPropertyType,
      areaSqm: record.area_sqm ? parseFloat(record.area_sqm) : null,
      price: record.price ? parseFloat(record.price) : null,
      status: record.status as CommercialPropertyStatus,
      mainImageUrl: record.main_image_url,
      contactFormId: record.contact_form_id,
      isFeatured: Boolean(record.is_featured),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

export default new CommercialPropertyModel();
