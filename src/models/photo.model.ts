/**
 * Photo Model (Polymorphic) - FIXED
 *
 * Handles photos for multiple entity types
 * Uses polymorphic relationship pattern
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

export enum PhotoableType {
  PROJECT = "project",
  APARTMENT = "apartment",
  COMMERCIAL_PROPERTY = "commercial_property",
  BLOG_POST = "blog_post",
  EVENT = "event",
}

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

export interface CreatePhotoDto {
  photoableType: PhotoableType;
  photoableId: number;
  url: string;
  externalUrl?: string | null;
  caption?: string | null;
  displayOrder?: number;
  isCover?: boolean;
}

export interface UpdatePhotoDto
  extends Partial<Omit<CreatePhotoDto, "photoableType" | "photoableId">> {}

export interface PhotoQueryOptions extends PolymorphicQueryOptions {
  isCover?: boolean;
  hasCaption?: boolean;
  hasExternalUrl?: boolean;
}

// ============================================================================
// PHOTO MODEL CLASS
// ============================================================================

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

  protected async beforeCreate(data: CreatePhotoDto): Promise<CreatePhotoDto> {

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

  protected async afterCreate(entity: Photo): Promise<void> {
    console.log(
      `✅ Photo created for ${entity.photoableType} ID ${entity.photoableId}`
    );
  }

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
  // PHOTO-SPECIFIC METHODS (RENAMED TO AVOID CONFLICT)
  // ============================================================================

  /**
   * Gets cover photo for an entity
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
   * Sets a photo as cover (unsets others)
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
   * Unsets all cover photos except the specified one
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
   * Bulk creates photos for an entity
   * RENAMED from bulkCreate to avoid conflict with base class
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
   * Reorders photos for an entity
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
   * Finds photos with custom filters
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
   * Gets photos with external URLs only
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
   * Gets photos with captions only
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
   * Duplicates photos from one entity to another
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
