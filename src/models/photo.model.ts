/**
 * Photo Model (Polymorphic) - FIXED VERSION
 * Represents photos for multiple entity types
 * Replaces: project_photos, apartment_photos, commercial_property_photos, blog_post_gallery_images
 *
 * @module models/photo.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Photoable type enumeration
 * Defines which entities can have photos
 */
export enum PhotoableType {
  PROJECT = "project",
  APARTMENT = "apartment",
  COMMERCIAL_PROPERTY = "commercial_property",
  BLOG_POST = "blog_post",
}

/**
 * Photo entity interface
 * Represents a polymorphic photo
 */
export interface Photo {
  /** Unique identifier */
  id: number;

  /** Type of parent entity */
  photoableType: PhotoableType;

  /** ID of parent entity */
  photoableId: number;

  /** Photo URL */
  url: string;

  /** External URL (for CDN or external hosting) */
  externalUrl: string | null;

  /** Photo caption */
  caption: string | null;

  /** Display order */
  displayOrder: number;

  /** Whether this is a cover/main photo */
  isCover: boolean;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
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
 * Update photo DTO
 */
export interface UpdatePhotoDto {
  url?: string;
  externalUrl?: string | null;
  caption?: string | null;
  displayOrder?: number;
  isCover?: boolean;
}

/**
 * Photo query parameters
 */
export interface PhotoQueryParams extends BaseQueryParams {
  photoableType?: PhotoableType;
  photoableId?: number;
  isCover?: boolean;
}

/**
 * Photo Model class
 * Handles all database operations for polymorphic photos
 */
class PhotoModel extends BaseModel<Photo, CreatePhotoDto, UpdatePhotoDto> {
  protected tableName = "photos";

  /**
   * Table name mapping for entity validation
   */
  private readonly tableMap: Record<PhotoableType, string> = {
    [PhotoableType.PROJECT]: "projects",
    [PhotoableType.APARTMENT]: "apartments",
    [PhotoableType.COMMERCIAL_PROPERTY]: "commercial_properties",
    [PhotoableType.BLOG_POST]: "blog_posts",
  };

  /**
   * Validates if entity exists before creating photo
   */
  private async validateEntity(
    type: PhotoableType,
    id: number
  ): Promise<boolean> {
    const table = this.tableMap[type];
    const result = await this.db(table).where({ id }).first();
    return !!result;
  }

  /**
   * Type guard for PhotoableType
   */
  static isValidPhotoableType(type: string): type is PhotoableType {
    return Object.values(PhotoableType).includes(type as PhotoableType);
  }

  /**
   * Creates a new photo with entity validation
   * @override
   */
  async create(data: CreatePhotoDto): Promise<Photo> {
    // Validate entity exists
    const entityExists = await this.validateEntity(
      data.photoableType,
      data.photoableId
    );

    if (!entityExists) {
      throw new Error(
        `Entity ${data.photoableType}:${data.photoableId} does not exist`
      );
    }

    return super.create(data);
  }

  /**
   * Finds all photos matching query parameters
   */
  async findAll(params: PhotoQueryParams = {}): Promise<Photo[]> {
    let query = this.db(this.tableName);

    if (params.photoableType) {
      query = query.where({ photoable_type: params.photoableType });
    }

    if (params.photoableId !== undefined) {
      query = query.where({ photoable_id: params.photoableId });
    }

    if (params.isCover !== undefined) {
      query = query.where({ is_cover: params.isCover });
    }

    if (params.sortBy) {
      query = query.orderBy(params.sortBy, params.sortOrder || "asc");
    } else {
      query = query.orderBy("display_order", "asc");
    }

    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const photos = await query;
    return photos.map(this.mapToEntity);
  }

  /**
   * Gets photos for a specific entity
   */
  async getForEntity(
    photoableType: PhotoableType,
    photoableId: number
  ): Promise<Photo[]> {
    return this.findAll({ photoableType, photoableId });
  }

  /**
   * Gets cover photo for an entity
   */
  async getCoverPhoto(
    photoableType: PhotoableType,
    photoableId: number
  ): Promise<Photo | null> {
    const photo = await this.db(this.tableName)
      .where({
        photoable_type: photoableType,
        photoable_id: photoableId,
        is_cover: true,
      })
      .first();

    return photo ? this.mapToEntity(photo) : null;
  }

  /**
   * Updates a photo with validation
   * @override
   */
  async update(id: number, data: UpdatePhotoDto): Promise<Photo | null> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Photo ${id} not found`);
    }

    return super.update(id, data);
  }

  /**
   * Sets a photo as cover (unsets others)
   */
  async setCover(photoId: number): Promise<boolean> {
    const photo = await this.findById(photoId);
    if (!photo) return false;

    const trx = await this.db.transaction();

    try {
      // Unset all other covers for this entity
      await trx(this.tableName)
        .where({
          photoable_type: photo.photoableType,
          photoable_id: photo.photoableId,
        })
        .update({ is_cover: false });

      // Set this photo as cover
      await trx(this.tableName)
        .where({ id: photoId })
        .update({ is_cover: true, updated_at: trx.fn.now() });

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Deletes all photos for an entity
   */
  async deleteForEntity(
    photoableType: PhotoableType,
    photoableId: number
  ): Promise<boolean> {
    const deleted = await this.db(this.tableName)
      .where({
        photoable_type: photoableType,
        photoable_id: photoableId,
      })
      .del();

    return deleted > 0;
  }

  /**
   * Reorders photos for an entity
   */
  async reorder(
    photoableType: PhotoableType,
    photoableId: number,
    photoIds: number[]
  ): Promise<boolean> {
    const trx = await this.db.transaction();

    try {
      for (let i = 0; i < photoIds.length; i++) {
        await trx(this.tableName)
          .where({
            id: photoIds[i],
            photoable_type: photoableType,
            photoable_id: photoableId,
          })
          .update({ display_order: i, updated_at: trx.fn.now() });
      }

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Gets photo count for an entity
   */
  async countForEntity(
    photoableType: PhotoableType,
    photoableId: number
  ): Promise<number> {
    return this.count({
      photoable_type: photoableType,
      photoable_id: photoableId,
    });
  }

  /**
   * Bulk creates photos for an entity with transaction safety
   * FIXED: Now properly returns created photos
   */
  async bulkCreate(
    photoableType: PhotoableType,
    photoableId: number,
    photos: Array<Omit<CreatePhotoDto, "photoableType" | "photoableId">>
  ): Promise<Photo[]> {
    // Validate entity exists
    const entityExists = await this.validateEntity(photoableType, photoableId);
    if (!entityExists) {
      throw new Error(`Entity ${photoableType}:${photoableId} does not exist`);
    }

    const trx = await this.db.transaction();

    try {
      // Check if any photo in the batch is marked as cover
      const hasCoverPhoto = photos.some((p) => p.isCover);

      // If we're adding a new cover photo, unset existing covers first
      if (hasCoverPhoto) {
        await trx(this.tableName)
          .where({
            photoable_type: photoableType,
            photoable_id: photoableId,
            is_cover: true,
          })
          .update({ is_cover: false });
      }

      const timestamp = new Date();

      // Ensure only one photo is marked as cover
      let coverAssigned = false;
      const photoData = photos.map((photo, index) => {
        const shouldBeCover = photo.isCover && !coverAssigned;
        if (shouldBeCover) coverAssigned = true;

        return {
          photoable_type: photoableType,
          photoable_id: photoableId,
          url: photo.url,
          external_url: photo.externalUrl || null,
          caption: photo.caption || null,
          display_order:
            photo.displayOrder !== undefined ? photo.displayOrder : index,
          is_cover: shouldBeCover,
          created_at: timestamp,
          updated_at: timestamp,
        };
      });

      // Insert and get IDs
      const insertedIds = await trx(this.tableName).insert(photoData);
      
      // FIXED: Use the first inserted ID to fetch all records
      const firstId = insertedIds[0];
      
      // Re-fetch the inserted records using IDs
      const createdPhotos = await trx(this.tableName)
        .where({
          photoable_type: photoableType,
          photoable_id: photoableId,
        })
        .where('id', '>=', firstId)
        .orderBy("display_order", "asc")
        .limit(photos.length);

      await trx.commit();
      return createdPhotos.map(this.mapToEntity);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Updates multiple photos at once
   */
  async bulkUpdate(
    updates: Array<{ id: number; data: UpdatePhotoDto }>
  ): Promise<boolean> {
    const trx = await this.db.transaction();

    try {
      for (const update of updates) {
        const updateData = this.mapToDatabase(update.data);
        await trx(this.tableName)
          .where({ id: update.id })
          .update({
            ...updateData,
            updated_at: trx.fn.now(),
          });
      }

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Deletes multiple photos at once
   */
  async bulkDelete(photoIds: number[]): Promise<boolean> {
    const trx = await this.db.transaction();

    try {
      await trx(this.tableName).whereIn("id", photoIds).del();

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Maps database record to Photo entity
   */
  protected mapToEntity(record: any): Photo {
    return {
      id: record.id,
      photoableType: record.photoable_type as PhotoableType,
      photoableId: record.photoable_id,
      url: record.url,
      externalUrl: record.external_url,
      caption: record.caption,
      displayOrder: record.display_order,
      isCover: Boolean(record.is_cover),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new PhotoModel();