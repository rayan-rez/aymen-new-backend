/**
 * Photo Model (Polymorphic)
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
   * Finds all photos matching query parameters
   *
   * @param params - Query parameters
   * @returns Promise<Photo[]> - Array of photos
   *
   * @example
   * const photos = await PhotoModel.findAll({
   *   photoableType: PhotoableType.PROJECT,
   *   photoableId: 1
   * });
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
   *
   * @param photoableType - Entity type
   * @param photoableId - Entity ID
   * @returns Promise<Photo[]> - Entity photos
   *
   * @example
   * const projectPhotos = await PhotoModel.getForEntity(PhotoableType.PROJECT, 1);
   */
  async getForEntity(
    photoableType: PhotoableType,
    photoableId: number
  ): Promise<Photo[]> {
    return this.findAll({ photoableType, photoableId });
  }

  /**
   * Gets cover photo for an entity
   *
   * @param photoableType - Entity type
   * @param photoableId - Entity ID
   * @returns Promise<Photo | null> - Cover photo or null
   *
   * @example
   * const cover = await PhotoModel.getCoverPhoto(PhotoableType.PROJECT, 1);
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
   * Sets a photo as cover (unsets others)
   *
   * @param photoId - Photo ID
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await PhotoModel.setCover(5);
   */
  async setCover(photoId: number): Promise<boolean> {
    const photo = await this.findById(photoId);
    if (!photo) return false;

    // Unset all other covers for this entity
    await this.db(this.tableName)
      .where({
        photoable_type: photo.photoableType,
        photoable_id: photo.photoableId,
      })
      .update({ is_cover: false });

    // Set this photo as cover
    const updated = await this.db(this.tableName)
      .where({ id: photoId })
      .update({ is_cover: true, updated_at: this.db.fn.now() });

    return updated > 0;
  }

  /**
   * Deletes all photos for an entity
   *
   * @param photoableType - Entity type
   * @param photoableId - Entity ID
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await PhotoModel.deleteForEntity(PhotoableType.PROJECT, 1);
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
   *
   * @param photoableType - Entity type
   * @param photoableId - Entity ID
   * @param photoIds - Array of photo IDs in desired order
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await PhotoModel.reorder(PhotoableType.PROJECT, 1, [5, 3, 7, 2]);
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
          .update({ display_order: i });
      }

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      return false;
    }
  }

  /**
   * Gets photo count for an entity
   *
   * @param photoableType - Entity type
   * @param photoableId - Entity ID
   * @returns Promise<number> - Photo count
   *
   * @example
   * const count = await PhotoModel.countForEntity(PhotoableType.PROJECT, 1);
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
   * Bulk creates photos for an entity
   *
   * @param photoableType - Entity type
   * @param photoableId - Entity ID
   * @param photos - Array of photo data
   * @returns Promise<Photo[]> - Created photos
   *
   * @example
   * const photos = await PhotoModel.bulkCreate(PhotoableType.PROJECT, 1, [
   *   { url: "photo1.jpg", caption: "Front view" },
   *   { url: "photo2.jpg", caption: "Side view" }
   * ]);
   */
  async bulkCreate(
    photoableType: PhotoableType,
    photoableId: number,
    photos: Array<Omit<CreatePhotoDto, "photoableType" | "photoableId">>
  ): Promise<Photo[]> {
    const photoData = photos.map((photo, index) => ({
      photoable_type: photoableType,
      photoable_id: photoableId,
      url: photo.url,
      external_url: photo.externalUrl || null,
      caption: photo.caption || null,
      display_order:
        photo.displayOrder !== undefined ? photo.displayOrder : index,
      is_cover: photo.isCover || false,
    }));

    const ids = await this.db(this.tableName).insert(photoData);

    // Fetch and return created photos
    const createdPhotos = await this.db(this.tableName)
      .whereIn("id", ids)
      .orderBy("display_order", "asc");

    return createdPhotos.map(this.mapToEntity);
  }

  /**
   * Maps database record to Photo entity
   *
   * @param record - Database record
   * @returns Photo entity
   *
   * @protected
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
