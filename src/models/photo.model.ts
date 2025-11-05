/**
 * Photo Model (Polymorphic)
 * 
 * Handles photos for multiple entity types with cover photo management
 * Uses polymorphic relationship pattern for flexible photo attachment
 * 
 * @module models/photo.model
 */

import {
  BasePolymorphicModel,
  PolymorphicEntity,
  PolymorphicQueryOptions,
} from "./base/polymorphic";
import { Knex } from "knex";
import { DatabaseRecord } from "./base";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * @openapi
 * components:
 *   schemas:
 *     
 *     PhotoableType:
 *       type: string
 *       enum:
 *         - project
 *         - apartment
 *         - commercial_property
 *         - blog_post
 *         - event
 *       description: Type of entity that can have photos attached
 *       example: project
 *     
 *     Photo:
 *       type: object
 *       required:
 *         - id
 *         - photoableType
 *         - photoableId
 *         - url
 *         - displayOrder
 *         - isCover
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the photo
 *           example: 1
 *         photoableType:
 *           $ref: '#/components/schemas/PhotoableType'
 *         photoableId:
 *           type: integer
 *           description: ID of the entity this photo belongs to
 *           example: 5
 *         url:
 *           type: string
 *           description: URL to the photo file
 *           example: "https://cdn.example.com/photos/project-5-main.jpg"
 *         externalUrl:
 *           type: string
 *           nullable: true
 *           description: External URL if photo is hosted elsewhere
 *           example: "https://external-cdn.com/photos/project-5.jpg"
 *         caption:
 *           type: string
 *           nullable: true
 *           description: Photo caption or description
 *           example: "Luxury apartment living room with city view"
 *         displayOrder:
 *           type: integer
 *           description: Display order for sorting photos
 *           example: 0
 *         isCover:
 *           type: boolean
 *           description: Whether this is the cover photo for the entity
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
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Soft delete timestamp
 *           example: null
 *     
 *     CreatePhotoDto:
 *       type: object
 *       required:
 *         - photoableType
 *         - photoableId
 *         - url
 *       properties:
 *         photoableType:
 *           $ref: '#/components/schemas/PhotoableType'
 *         photoableId:
 *           type: integer
 *           description: ID of the entity this photo belongs to
 *           example: 5
 *         url:
 *           type: string
 *           description: URL to the photo file
 *           example: "https://cdn.example.com/photos/project-5-main.jpg"
 *         externalUrl:
 *           type: string
 *           nullable: true
 *           description: External URL if photo is hosted elsewhere
 *           example: "https://external-cdn.com/photos/project-5.jpg"
 *         caption:
 *           type: string
 *           nullable: true
 *           description: Photo caption or description
 *           example: "Luxury apartment living room with city view"
 *         displayOrder:
 *           type: integer
 *           description: Display order for sorting photos
 *           example: 0
 *         isCover:
 *           type: boolean
 *           description: Whether this should be the cover photo
 *           example: true
 *     
 *     UpdatePhotoDto:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *           description: URL to the photo file
 *           example: "https://cdn.example.com/photos/project-5-updated.jpg"
 *         externalUrl:
 *           type: string
 *           nullable: true
 *           description: External URL if photo is hosted elsewhere
 *           example: "https://external-cdn.com/photos/project-5.jpg"
 *         caption:
 *           type: string
 *           nullable: true
 *           description: Photo caption or description
 *           example: "Updated luxury apartment living room"
 *         displayOrder:
 *           type: integer
 *           description: Display order for sorting photos
 *           example: 1
 *         isCover:
 *           type: boolean
 *           description: Whether this should be the cover photo
 *           example: true
 *     
 *     PhotoQueryOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/PolymorphicQueryOptions'
 *         - type: object
 *           properties:
 *             isCover:
 *               type: boolean
 *               description: Filter by cover photo status
 *               example: true
 *             hasCaption:
 *               type: boolean
 *               description: Filter photos that have captions
 *               example: true
 *             hasExternalUrl:
 *               type: boolean
 *               description: Filter photos that have external URLs
 *               example: false
 */

/**
 * @openapi
 * Photoable type enumeration
 */
export enum PhotoableType {
  PROJECT = "project",
  APARTMENT = "apartment",
  COMMERCIAL_PROPERTY = "commercial_property",
  BLOG_POST = "blog_post",
  EVENT = "event",
}

/**
 * @openapi
 * Photo entity interface
 */
export interface Photo extends PolymorphicEntity {
  id: number;
  photoableType: PhotoableType;
  photoableId: number;
  url: string;
  externalUrl: string | null;
  caption: string | null;
  displayOrder: number;
  isCover: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * @openapi
 * Create photo DTO
 */
export interface CreatePhotoDto {
  photoableType: PhotoableType;
  photoableId: number;
  url: string;
  externalUrl?: string | null;
  caption?: string | null;
  displayOrder?: number;
  isCover?: boolean;
}

/**
 * @openapi
 * Update photo DTO
 */
export interface UpdatePhotoDto
  extends Partial<Omit<CreatePhotoDto, "photoableType" | "photoableId">> {}

/**
 * @openapi
 * Photo query options
 */
export interface PhotoQueryOptions extends PolymorphicQueryOptions {
  isCover?: boolean;
  hasCaption?: boolean;
  hasExternalUrl?: boolean;
}

// ============================================================================
// PHOTO MODEL CLASS
// ============================================================================

/**
 * @openapi
 * Photo Model Class
 * 
 * Handles photos for multiple entity types with cover photo management
 * Uses polymorphic relationship pattern for flexible photo attachment
 * 
 * @class PhotoModel
 * @extends BasePolymorphicModel<Photo, CreatePhotoDto, UpdatePhotoDto>
 */
export class PhotoModel extends BasePolymorphicModel<
  Photo,
  CreatePhotoDto,
  UpdatePhotoDto
> {
  protected tableName = "photos";
  protected primaryKey = "id";

  protected polymorphicTypeColumn = "photoable_type";
  protected polymorphicIdColumn = "photoable_id";
  protected validPolymorphicTypes = Object.values(PhotoableType);

  protected config = {
    softDelete: true,
    timestamps: true,
    defaultSortColumn: "display_order",
    defaultSortOrder: "asc" as const,
    searchableColumns: ["caption"],
    hiddenFields: [],
    fillable: [
      "photoableType",
      "photoableId",
      "url",
      "externalUrl",
      "caption",
      "displayOrder",
      "isCover",
    ],
    guarded: ["id", "createdAt", "updatedAt", "deletedAt"],
  };

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * @openapi
   * beforeCreate lifecycle hook
   * 
   * Validates and processes photo data before creation:
   * - Runs polymorphic validation
   * - Validates required URL field
   * - Manages cover photo logic (unsets other covers if this is cover)
   * - Sets default display order if not provided
   * 
   * @param {CreatePhotoDto} data - Photo creation data
   * @returns {Promise<CreatePhotoDto>} Processed data
   * @throws {Error} If validation fails
   */
  protected async beforeCreate(
    data: CreatePhotoDto
  ): Promise<CreatePhotoDto> {
    // Run polymorphic validation
    await this.beforePolymorphicCreate(data);

    // Validate URL
    if (!data.url || data.url.trim().length === 0) {
      throw new Error("Photo URL is required");
    }

    // If this is marked as cover, unset other cover photos
    if (data.isCover) {
      await this.unsetOtherCovers(data.photoableType, data.photoableId);
    }

    // Set default display order if not provided
    if (data.displayOrder === undefined) {
      const count = await this.countForEntity(
        data.photoableType,
        data.photoableId
      );
      data.displayOrder = count;
    }

    return data;
  }

  /**
   * @openapi
   * afterCreate lifecycle hook
   * 
   * Logs photo creation event
   * 
   * @param {Photo} entity - Created photo entity
   * @returns {Promise<void>}
   */
  protected async afterCreate(entity: Photo): Promise<void> {
    console.log(
      `✅ Photo created for ${entity.photoableType} ID ${entity.photoableId}`
    );
  }

  /**
   * @openapi
   * beforeUpdate lifecycle hook
   * 
   * Validates and processes photo data before update:
   * - Manages cover photo logic when setting as cover
   * - Unsets other cover photos when this becomes cover
   * 
   * @param {number} id - Photo ID
   * @param {UpdatePhotoDto} data - Photo update data
   * @returns {Promise<UpdatePhotoDto>} Processed data
   * @throws {Error} If photo not found
   */
  protected async beforeUpdate(
    id: number,
    data: UpdatePhotoDto
  ): Promise<UpdatePhotoDto> {
    const photo = await this.findById(id);
    if (!photo) {
      throw new Error("Photo not found");
    }

    // If setting as cover, unset other covers
    if (data.isCover === true) {
      await this.unsetOtherCovers(photo.photoableType, photo.photoableId, id);
    }

    return data;
  }

  // ============================================================================
  // PHOTO-SPECIFIC METHODS
  // ============================================================================

  /**
   * @openapi
   * Gets cover photo for an entity
   * 
   * @param {PhotoableType} entityType - Type of entity
   * @param {number} entityId - Entity ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo | null>} Cover photo or null
   */
  async getCoverPhoto(
    entityType: PhotoableType,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<Photo | null> {
    const connection = trx || this.db;

    let query = connection(this.tableName)
      .where("photoable_type", entityType)
      .where("photoable_id", entityId)
      .where("is_cover", true)
      .first();

    if (this.config.softDelete) {
      query = query.whereNull("deleted_at");
    }

    const record = await query;
    return record ? this.mapToEntity(record) : null;
  }

  /**
   * @openapi
   * Sets a photo as cover (unsets others)
   * 
   * @param {number} photoId - Photo ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo | null>} Updated photo or null
   * @throws {Error} If photo not found
   */
  async setCover(
    photoId: number,
    trx?: Knex.Transaction
  ): Promise<Photo | null> {
    const photo = await this.findById(photoId, {}, trx);
    if (!photo) {
      throw new Error("Photo not found");
    }

    await this.unsetOtherCovers(
      photo.photoableType,
      photo.photoableId,
      photoId,
      trx
    );

    return this.update(photoId, { isCover: true }, trx);
  }

  /**
   * @openapi
   * Unsets all cover photos except the specified one
   * 
   * @param {PhotoableType} entityType - Type of entity
   * @param {number} entityId - Entity ID
   * @param {number} [exceptId] - Optional photo ID to exclude
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<void>}
   */
  private async unsetOtherCovers(
    entityType: PhotoableType,
    entityId: number,
    exceptId?: number,
    trx?: Knex.Transaction
  ): Promise<void> {
    const connection = trx || this.db;

    let query = connection(this.tableName)
      .where("photoable_type", entityType)
      .where("photoable_id", entityId)
      .where("is_cover", true);

    if (exceptId) {
      query = query.where("id", "!=", exceptId);
    }

    await query.update({
      is_cover: false,
      ...(this.config.timestamps && { updated_at: connection.fn.now() }),
    });
  }

  /**
   * @openapi
   * Bulk creates photos for an entity
   * 
   * @param {PhotoableType} entityType - Type of entity
   * @param {number} entityId - Entity ID
   * @param {object[]} photosData - Array of photo data
   * @param {string} photosData[].url - Photo URL
   * @param {string} [photosData[].externalUrl] - External URL
   * @param {string} [photosData[].caption] - Photo caption
   * @param {number} [photosData[].displayOrder] - Display order
   * @param {boolean} [photosData[].isCover] - Cover photo flag
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo[]>} Array of created photos
   */
  async createManyForEntity(
    entityType: PhotoableType,
    entityId: number,
    photosData: Array<{
      url: string;
      externalUrl?: string | null;
      caption?: string | null;
      displayOrder?: number;
      isCover?: boolean;
    }>,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    const items = photosData.map((data) => ({
      photoableType: entityType,
      photoableId: entityId,
      ...data,
    }));

    return this.bulkCreateForEntity(entityType, entityId, items, trx);
  }

  /**
   * @openapi
   * Reorders photos for an entity
   * 
   * @param {PhotoableType} entityType - Type of entity
   * @param {number} entityId - Entity ID
   * @param {number[]} photoIds - Array of photo IDs in desired order
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} Success status
   */
  async reorder(
    entityType: PhotoableType,
    entityId: number,
    photoIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    return this.reorderForEntity(entityType, entityId, photoIds, trx);
  }

  /**
   * @openapi
   * Finds photos with custom filters
   * 
   * @param {PhotoQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo[]>} Array of photos
   */
  async findPhotos(
    options: PhotoQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    // Apply polymorphic filters
    query = this.applyPolymorphicFilters(query, options);

    // Apply photo-specific filters
    query = this.applyPhotoFilters(query, options);

    const records = await query;
    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  /**
   * @openapi
   * Gets photos with external URLs only
   * 
   * @param {PhotoableType} entityType - Type of entity
   * @param {number} entityId - Entity ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo[]>} Array of photos with external URLs
   */
  async getPhotosWithExternalUrls(
    entityType: PhotoableType,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    return this.findPhotos(
      {
        polymorphicType: entityType,
        polymorphicId: entityId,
        hasExternalUrl: true,
      },
      trx
    );
  }

  /**
   * @openapi
   * Gets photos with captions only
   * 
   * @param {PhotoableType} entityType - Type of entity
   * @param {number} entityId - Entity ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo[]>} Array of photos with captions
   */
  async getPhotosWithCaptions(
    entityType: PhotoableType,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    return this.findPhotos(
      {
        polymorphicType: entityType,
        polymorphicId: entityId,
        hasCaption: true,
      },
      trx
    );
  }

  /**
   * @openapi
   * Duplicates photos from one entity to another
   * 
   * @param {PhotoableType} sourceType - Source entity type
   * @param {number} sourceId - Source entity ID
   * @param {PhotoableType} targetType - Target entity type
   * @param {number} targetId - Target entity ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo[]>} Array of duplicated photos
   */
  async duplicatePhotos(
    sourceType: PhotoableType,
    sourceId: number,
    targetType: PhotoableType,
    targetId: number,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    const sourcePhotos = await this.getForEntity(sourceType, sourceId, {}, trx);

    if (sourcePhotos.length === 0) return [];

    const photoData = sourcePhotos.map((photo) => ({
      url: photo.url,
      externalUrl: photo.externalUrl,
      caption: photo.caption,
      displayOrder: photo.displayOrder,
      isCover: photo.isCover,
    }));

    return this.createManyForEntity(targetType, targetId, photoData, trx);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * @openapi
   * Applies photo-specific filters to query
   * 
   * @param {Knex.QueryBuilder} query - Database query builder
   * @param {PhotoQueryOptions} options - Query options
   * @returns {Knex.QueryBuilder} Modified query builder
   */
  private applyPhotoFilters(
    query: Knex.QueryBuilder,
    options: PhotoQueryOptions
  ): Knex.QueryBuilder {
    // Cover photo filter
    if (options.isCover !== undefined) {
      query = query.where("is_cover", options.isCover);
    }

    // Has caption filter
    if (options.hasCaption !== undefined) {
      if (options.hasCaption) {
        query = query.whereNotNull("caption").where("caption", "!=", "");
      } else {
        query = query.where(function () {
          this.whereNull("caption").orWhere("caption", "=", "");
        });
      }
    }

    // Has external URL filter
    if (options.hasExternalUrl !== undefined) {
      if (options.hasExternalUrl) {
        query = query
          .whereNotNull("external_url")
          .where("external_url", "!=", "");
      } else {
        query = query.where(function () {
          this.whereNull("external_url").orWhere("external_url", "=", "");
        });
      }
    }

    return query;
  }

  /**
   * @openapi
   * Maps database record to Photo entity
   * 
   * @param {DatabaseRecord} record - Database record
   * @returns {Photo} Photo entity
   */
  protected mapToEntity(record: DatabaseRecord): Photo {
    return {
      id: record.id,
      photoableType: record.photoable_type as PhotoableType,
      photoableId: record.photoable_id,
      polymorphicType: record.photoable_type,
      polymorphicId: record.photoable_id,
      url: record.url,
      externalUrl: record.external_url,
      caption: record.caption,
      displayOrder: record.display_order || 0,
      isCover: Boolean(record.is_cover),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }

  /**
   * @openapi
   * Initializes column mapping for database operations
   */
  protected initializeColumnMap(): void {
    this.columnMap.set("photoableType", "photoable_type");
    this.columnMap.set("photoableId", "photoable_id");
    this.columnMap.set("externalUrl", "external_url");
    this.columnMap.set("displayOrder", "display_order");
    this.columnMap.set("isCover", "is_cover");
  }
}

// Export singleton instance
export default new PhotoModel();