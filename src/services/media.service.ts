/**
 * Media Service
 * Provides utility functions for working with polymorphic media (photos, floor plans)
 * Includes transaction safety, validation, and cascade operations
 *
 * @module services/media
 *
 * @swagger
 * components:
 *   schemas:
 *     MediaCounts:
 *       type: object
 *       properties:
 *         photoCount:
 *           type: integer
 *           description: Number of photos for the entity
 *           example: 12
 *         floorPlanCount:
 *           type: integer
 *           description: Number of floor plans for the entity (if applicable)
 *           example: 3
 *
 *     EntityMedia:
 *       type: object
 *       properties:
 *         photos:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Photo'
 *           description: Array of photos associated with the entity
 *         floorPlans:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FloorPlan'
 *           description: Array of floor plans (if applicable to entity type)
 *
 *     Photo:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 101
 *         photoableType:
 *           type: string
 *           enum: [PROJECT, APARTMENT, COMMERCIAL_PROPERTY, BLOG_POST, EVENT]
 *           example: "PROJECT"
 *         photoableId:
 *           type: integer
 *           example: 42
 *         url:
 *           type: string
 *           format: uri
 *           example: "https://cdn.example.com/photos/image.webp"
 *         externalUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           example: "https://external.com/photo.jpg"
 *         caption:
 *           type: string
 *           nullable: true
 *           example: "Modern living room with panoramic views"
 *         displayOrder:
 *           type: integer
 *           example: 1
 *         isCover:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     FloorPlan:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 201
 *         plannableType:
 *           type: string
 *           enum: [PROJECT, APARTMENT]
 *           example: "APARTMENT"
 *         plannableId:
 *           type: integer
 *           example: 15
 *         name:
 *           type: string
 *           example: "2 Bedroom - Type A"
 *         imageUrl:
 *           type: string
 *           format: uri
 *           example: "https://cdn.example.com/plans/floor-plan.webp"
 *         pdfUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           example: "https://cdn.example.com/plans/floor-plan.pdf"
 *         displayOrder:
 *           type: integer
 *           example: 1
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     AddPhotoRequest:
 *       type: object
 *       required:
 *         - url
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *           description: URL of the uploaded image
 *           example: "https://cdn.example.com/photos/image.webp"
 *         externalUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Optional external URL reference
 *           example: "https://external.com/photo.jpg"
 *         caption:
 *           type: string
 *           nullable: true
 *           description: Photo caption or description
 *           example: "Spacious master bedroom"
 *         displayOrder:
 *           type: integer
 *           description: Display order (lower numbers appear first)
 *           example: 1
 *         isCover:
 *           type: boolean
 *           description: Set as cover photo
 *           example: false
 *
 *     AddFloorPlanRequest:
 *       type: object
 *       required:
 *         - name
 *         - imageUrl
 *       properties:
 *         name:
 *           type: string
 *           description: Name/title of the floor plan
 *           example: "2 Bedroom - Type A"
 *         imageUrl:
 *           type: string
 *           format: uri
 *           description: URL of the floor plan image
 *           example: "https://cdn.example.com/plans/plan.webp"
 *         pdfUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: Optional PDF version URL
 *           example: "https://cdn.example.com/plans/plan.pdf"
 *         displayOrder:
 *           type: integer
 *           description: Display order
 *           example: 1
 *
 *     BulkAddPhotosRequest:
 *       type: object
 *       required:
 *         - photos
 *       properties:
 *         photos:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AddPhotoRequest'
 *           description: Array of photos to add
 *
 *     BulkAddFloorPlansRequest:
 *       type: object
 *       required:
 *         - floorPlans
 *       properties:
 *         floorPlans:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AddFloorPlanRequest'
 *           description: Array of floor plans to add
 *
 *     ReorderMediaRequest:
 *       type: object
 *       required:
 *         - photoIds
 *       properties:
 *         photoIds:
 *           type: array
 *           items:
 *             type: integer
 *           description: Ordered array of photo IDs
 *           example: [5, 2, 8, 1, 9]
 *         planIds:
 *           type: array
 *           items:
 *             type: integer
 *           description: Ordered array of floor plan IDs (optional)
 *           example: [3, 1, 2]
 *
 *     MediaValidationRequirements:
 *       type: object
 *       properties:
 *         minPhotos:
 *           type: integer
 *           description: Minimum number of photos required
 *           example: 3
 *         requireCoverPhoto:
 *           type: boolean
 *           description: Whether a cover photo is required
 *           example: true
 *         minFloorPlans:
 *           type: integer
 *           description: Minimum number of floor plans required
 *           example: 1
 *
 *     MediaValidationResponse:
 *       type: object
 *       properties:
 *         valid:
 *           type: boolean
 *           example: false
 *         errors:
 *           type: array
 *           items:
 *             type: string
 *           example:
 *             - "Requires at least 3 photo(s), found 1"
 *             - "Cover photo is required"
 *
 *     FloorPlanStatistics:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of floor plans
 *           example: 5
 *         withPdf:
 *           type: integer
 *           description: Number of floor plans with PDF versions
 *           example: 3
 *         withoutPdf:
 *           type: integer
 *           description: Number of floor plans without PDF versions
 *           example: 2
 *
 *     CopyMediaResponse:
 *       type: object
 *       properties:
 *         photos:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Photo'
 *           description: Copied photos
 *         floorPlans:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FloorPlan'
 *           description: Copied floor plans (if applicable)
 *
 *     DeleteMediaResponse:
 *       type: object
 *       properties:
 *         photosDeleted:
 *           type: boolean
 *           example: true
 *         plansDeleted:
 *           type: boolean
 *           example: true
 *
 *     MediaOperationSuccess:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Media operation completed successfully"
 *         data:
 *           type: object
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *     MediaOperationError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Media operation failed"
 *         errors:
 *           type: object
 *           properties:
 *             reason:
 *               type: string
 *               example: "Invalid entity type"
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *   examples:
 *     ProjectMediaExample:
 *       summary: Project media with photos and floor plans
 *       value:
 *         photos:
 *           - id: 101
 *             photoableType: "PROJECT"
 *             photoableId: 42
 *             url: "https://cdn.example.com/photos/exterior.webp"
 *             caption: "Building exterior"
 *             displayOrder: 1
 *             isCover: true
 *           - id: 102
 *             photoableType: "PROJECT"
 *             photoableId: 42
 *             url: "https://cdn.example.com/photos/lobby.webp"
 *             caption: "Modern lobby"
 *             displayOrder: 2
 *             isCover: false
 *         floorPlans:
 *           - id: 201
 *             plannableType: "PROJECT"
 *             plannableId: 42
 *             name: "Ground Floor"
 *             imageUrl: "https://cdn.example.com/plans/ground.webp"
 *             pdfUrl: "https://cdn.example.com/plans/ground.pdf"
 *             displayOrder: 1
 *
 *     ApartmentMediaExample:
 *       summary: Apartment media
 *       value:
 *         photos:
 *           - id: 103
 *             photoableType: "APARTMENT"
 *             photoableId: 15
 *             url: "https://cdn.example.com/photos/living-room.webp"
 *             caption: "Spacious living area"
 *             displayOrder: 1
 *             isCover: true
 *         floorPlans:
 *           - id: 202
 *             plannableType: "APARTMENT"
 *             plannableId: 15
 *             name: "2BR Layout"
 *             imageUrl: "https://cdn.example.com/plans/2br.webp"
 *             displayOrder: 1
 *
 *     MediaCountsExample:
 *       summary: Media counts for an entity
 *       value:
 *         photoCount: 12
 *         floorPlanCount: 3
 *
 *     BulkPhotoAddExample:
 *       summary: Add multiple photos at once
 *       value:
 *         photos:
 *           - url: "https://cdn.example.com/photo1.webp"
 *             caption: "Exterior view"
 *             displayOrder: 1
 *             isCover: true
 *           - url: "https://cdn.example.com/photo2.webp"
 *             caption: "Interior view"
 *             displayOrder: 2
 *           - url: "https://cdn.example.com/photo3.webp"
 *             caption: "Amenities"
 *             displayOrder: 3
 *
 *     ValidationErrorExample:
 *       summary: Media validation failed
 *       value:
 *         valid: false
 *         errors:
 *           - "Requires at least 3 photo(s), found 1"
 *           - "Cover photo is required"
 *           - "Requires at least 1 floor plan(s), found 0"
 *
 * Features:
 * - Polymorphic media management (photos & floor plans)
 * - Transaction-safe operations
 * - Bulk operations (add, delete, reorder)
 * - Cascade delete support
 * - Cover photo management
 * - Media validation
 * - Copy/duplicate media between entities
 * - Statistics and counts
 * - Support for multiple entity types
 *
 * Supported entity types:
 * Photos:
 * - PROJECT
 * - APARTMENT
 * - COMMERCIAL_PROPERTY
 * - BLOG_POST
 * - EVENT
 *
 * Floor Plans:
 * - PROJECT
 * - APARTMENT
 *
 * @example
 * ```typescript
 * // Get all media for a project
 * const media = await MediaService.getProjectMedia(projectId);
 * console.log(`Found ${media.photos.length} photos and ${media.floorPlans.length} floor plans`);
 *
 * // Add photos to an apartment
 * const photos = await MediaService.addPhotos(
 *   PhotoableType.APARTMENT,
 *   apartmentId,
 *   [
 *     { url: "photo1.webp", caption: "Living room", isCover: true },
 *     { url: "photo2.webp", caption: "Bedroom" }
 *   ]
 * );
 *
 * // Validate media before publishing
 * const validation = await MediaService.validateRequiredMedia(
 *   PhotoableType.PROJECT,
 *   projectId,
 *   { minPhotos: 3, requireCoverPhoto: true, minFloorPlans: 1 }
 * );
 *
 * if (!validation.valid) {
 *   console.error("Validation errors:", validation.errors);
 * }
 *
 * // Copy media from one entity to another
 * await MediaService.copyMedia(
 *   PhotoableType.PROJECT,
 *   sourceProjectId,
 *   PhotoableType.PROJECT,
 *   targetProjectId,
 *   true // include floor plans
 * );
 *
 * // Delete all media with cascade
 * await MediaService.deleteEntityMedia(
 *   PhotoableType.APARTMENT,
 *   apartmentId,
 *   true, // include floor plans
 *   true   force delete
 * );
 * ```
 */

import PhotoModel, {
  PhotoableType,
  Photo,
  CreatePhotoDto,
} from "@models/photo.model";
import FloorPlanModel, {
  PlannableType,
  FloorPlan,
  CreateFloorPlanDto,
} from "@models/floor-plan.model";
import db from "@/config/database";
import { Knex } from "knex";

/**
 * @openapi
 * Media counts interface
 * Contains photo and floor plan counts for an entity
 *
 * @interface MediaCounts
 */
export interface MediaCounts {
  photoCount: number;
  floorPlanCount?: number;
}

/**
 * @openapi
 * Entity media interface
 * Contains all media associated with an entity
 *
 * @interface EntityMedia
 */
export interface EntityMedia {
  photos: Photo[];
  floorPlans?: FloorPlan[];
}

/**
 * @openapi
 * Media Service Class
 * Centralizes common media operations across different entity types
 * Provides transaction-safe methods for managing photos and floor plans
 *
 * @class MediaService
 */
export class MediaService {
  // ============================================================================
  // TYPE GUARDS & VALIDATION
  // ============================================================================

  /**
   * @openapi
   * Type guard for PhotoableType
   * Validates if a string is a valid photoable entity type
   *
   * @param {string} type - Type to validate
   * @returns {boolean} True if valid PhotoableType
   *
   * @example
   * ```typescript
   * if (MediaService.isValidPhotoableType("PROJECT")) {
   *   // Type is valid
   * }
   * ```
   */
  static isValidPhotoableType(type: string): type is PhotoableType {
    return Object.values(PhotoableType).includes(type as PhotoableType);
  }

  /**
   * @openapi
   * Type guard for PlannableType
   * Validates if a string is a valid plannable entity type
   *
   * @param {string} type - Type to validate
   * @returns {boolean} True if valid PlannableType
   *
   * @example
   * ```typescript
   * if (MediaService.isValidPlannableType("APARTMENT")) {
   *   // Type is valid
   * }
   * ```
   */
  static isValidPlannableType(type: string): type is PlannableType {
    return Object.values(PlannableType).includes(type as PlannableType);
  }

  /**
   * @openapi
   * Maps PhotoableType to PlannableType
   * Returns null for entity types that don't support floor plans
   *
   * @private
   * @param {PhotoableType} photoableType - Entity type
   * @returns {PlannableType | null} Corresponding plannable type or null
   */
  private static mapToPlannableType(
    photoableType: PhotoableType
  ): PlannableType | null {
    switch (photoableType) {
      case PhotoableType.PROJECT:
        return PlannableType.PROJECT;
      case PhotoableType.APARTMENT:
        return PlannableType.APARTMENT;
      default:
        return null;
    }
  }

  // ============================================================================
  // RETRIEVE MEDIA
  // ============================================================================

  /**
   * @openapi
   * Gets all media for a project
   * Retrieves photos and floor plans in parallel
   *
   * @param {number} projectId - Project ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EntityMedia>} Project media
   * @throws {Error} If retrieval fails
   *
   * @example
   * ```typescript
   * const media = await MediaService.getProjectMedia(42);
   * console.log(`Found ${media.photos.length} photos`);
   * console.log(`Found ${media.floorPlans.length} floor plans`);
   * ```
   */
  static async getProjectMedia(
    projectId: number,
    trx?: Knex.Transaction
  ): Promise<EntityMedia> {
    try {
      const [photos, floorPlans] = await Promise.all([
        PhotoModel.getForEntity(PhotoableType.PROJECT, projectId, {}, trx),
        FloorPlanModel.getForEntity(PlannableType.PROJECT, projectId, {}, trx),
      ]);

      return { photos, floorPlans };
    } catch (error) {
      console.error(`Error getting media for project ${projectId}:`, error);
      throw new Error(`Failed to retrieve media for project ${projectId}`);
    }
  }

  /**
   * @openapi
   * Gets all media for an apartment
   * Retrieves photos and floor plans in parallel
   *
   * @param {number} apartmentId - Apartment ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EntityMedia>} Apartment media
   * @throws {Error} If retrieval fails
   *
   * @example
   * ```typescript
   * const media = await MediaService.getApartmentMedia(15);
   * ```
   */
  static async getApartmentMedia(
    apartmentId: number,
    trx?: Knex.Transaction
  ): Promise<EntityMedia> {
    try {
      const [photos, floorPlans] = await Promise.all([
        PhotoModel.getForEntity(PhotoableType.APARTMENT, apartmentId, {}, trx),
        FloorPlanModel.getForEntity(
          PlannableType.APARTMENT,
          apartmentId,
          {},
          trx
        ),
      ]);

      return { photos, floorPlans };
    } catch (error) {
      console.error(`Error getting media for apartment ${apartmentId}:`, error);
      throw new Error(`Failed to retrieve media for apartment ${apartmentId}`);
    }
  }

  /**
   * @openapi
   * Gets all photos for a commercial property
   *
   * @param {number} propertyId - Commercial property ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo[]>} Array of photos
   *
   * @example
   * ```typescript
   * const photos = await MediaService.getCommercialPropertyPhotos(20);
   * ```
   */
  static async getCommercialPropertyPhotos(
    propertyId: number,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    return PhotoModel.getForEntity(
      PhotoableType.COMMERCIAL_PROPERTY,
      propertyId,
      {},
      trx
    );
  }

  /**
   * @openapi
   * Gets all photos for a blog post
   *
   * @param {number} blogPostId - Blog post ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo[]>} Array of photos
   *
   * @example
   * ```typescript
   * const photos = await MediaService.getBlogPostPhotos(5);
   * ```
   */
  static async getBlogPostPhotos(
    blogPostId: number,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    return PhotoModel.getForEntity(
      PhotoableType.BLOG_POST,
      blogPostId,
      {},
      trx
    );
  }

  /**
   * @openapi
   * Gets all photos for an event
   *
   * @param {number} eventId - Event ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo[]>} Array of photos
   *
   * @example
   * ```typescript
   * const photos = await MediaService.getEventPhotos(8);
   * ```
   */
  static async getEventPhotos(
    eventId: number,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    return PhotoModel.getForEntity(PhotoableType.EVENT, eventId, {}, trx);
  }

  /**
   * @openapi
   * Gets media for any entity type with validation
   * Automatically determines if entity supports floor plans
   *
   * @param {string} entityType - Entity type (must be valid PhotoableType)
   * @param {number} entityId - Entity ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<EntityMedia>} Entity media
   * @throws {Error} If entity type is invalid
   *
   * @example
   * ```typescript
   * const media = await MediaService.getEntityMedia("PROJECT", 42);
   * ```
   */
  static async getEntityMedia(
    entityType: string,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<EntityMedia> {
    if (!this.isValidPhotoableType(entityType)) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    const photos = await PhotoModel.getForEntity(entityType, entityId, {}, trx);

    const plannableType = this.mapToPlannableType(entityType);
    let floorPlans: FloorPlan[] | undefined;

    if (plannableType) {
      floorPlans = await FloorPlanModel.getForEntity(
        plannableType,
        entityId,
        {},
        trx
      );
    }

    return { photos, floorPlans };
  }

  /**
   * @openapi
   * Gets cover photo for an entity
   *
   * @param {PhotoableType} entityType - Entity type
   * @param {number} entityId - Entity ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo | null>} Cover photo or null if not set
   *
   * @example
   * ```typescript
   * const cover = await MediaService.getCoverPhoto(
   *   PhotoableType.PROJECT,
   *   42
   * );
   * ```
   */
  static async getCoverPhoto(
    entityType: PhotoableType,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<Photo | null> {
    return PhotoModel.getCoverPhoto(entityType, entityId, trx);
  }

  // ============================================================================
  // ADD MEDIA
  // ============================================================================

  /**
   * @openapi
   * Adds multiple photos to an entity
   * All photos are added in a single transaction
   *
   * @param {PhotoableType} entityType - Entity type
   * @param {number} entityId - Entity ID
   * @param {Array} photoData - Array of photo data
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo[]>} Created photos
   * @throws {Error} If creation fails
   *
   * @example
   * ```typescript
   * const photos = await MediaService.addPhotos(
   *   PhotoableType.APARTMENT,
   *   15,
   *   [
   *     { url: "photo1.webp", caption: "Living room", isCover: true },
   *     { url: "photo2.webp", caption: "Bedroom", displayOrder: 2 }
   *   ]
   * );
   * ```
   */
  static async addPhotos(
    entityType: PhotoableType,
    entityId: number,
    photoData: Array<{
      url: string;
      externalUrl?: string | null;
      caption?: string | null;
      displayOrder?: number;
      isCover?: boolean;
    }>,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    return PhotoModel.createManyForEntity(entityType, entityId, photoData, trx);
  }

  /**
   * @openapi
   * Adds multiple floor plans to an entity
   * All floor plans are added in a single transaction
   *
   * @param {PlannableType} entityType - Entity type
   * @param {number} entityId - Entity ID
   * @param {Array} planData - Array of floor plan data
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FloorPlan[]>} Created floor plans
   * @throws {Error} If creation fails
   *
   * @example
   * ```typescript
   * const plans = await MediaService.addFloorPlans(
   *   PlannableType.PROJECT,
   *   42,
   *   [
   *     { name: "Ground Floor", imageUrl: "ground.webp", displayOrder: 1 },
   *     { name: "First Floor", imageUrl: "first.webp", displayOrder: 2 }
   *   ]
   * );
   * ```
   */
  static async addFloorPlans(
    entityType: PlannableType,
    entityId: number,
    planData: Array<{
      name: string;
      imageUrl: string;
      pdfUrl?: string | null;
      displayOrder?: number;
    }>,
    trx?: Knex.Transaction
  ): Promise<FloorPlan[]> {
    return FloorPlanModel.createManyForEntity(
      entityType,
      entityId,
      planData,
      trx
    );
  }

  /**
   * @openapi
   * Adds a single photo
   *
   * @param {PhotoableType} entityType - Entity type
   * @param {number} entityId - Entity ID
   * @param {Object} photoData - Photo data
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo>} Created photo
   * @throws {Error} If creation fails
   *
   * @example
   * ```typescript
   * const photo = await MediaService.addPhoto(
   *   PhotoableType.BLOG_POST,
   *   5,
   *   { url: "header.webp", caption: "Article header", isCover: true }
   * );
   * ```
   */
  static async addPhoto(
    entityType: PhotoableType,
    entityId: number,
    photoData: {
      url: string;
      externalUrl?: string | null;
      caption?: string | null;
      displayOrder?: number;
      isCover?: boolean;
    },
    trx?: Knex.Transaction
  ): Promise<Photo> {
    const createData: CreatePhotoDto = {
      photoableType: entityType,
      photoableId: entityId,
      ...photoData,
    };

    return PhotoModel.create(createData, trx);
  }

  /**
   * @openapi
   * Adds a single floor plan
   *
   * @param {PlannableType} entityType - Entity type
   * @param {number} entityId - Entity ID
   * @param {Object} planData - Floor plan data
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FloorPlan>} Created floor plan
   * @throws {Error} If creation fails
   *
   * @example
   * ```typescript
   * const plan = await MediaService.addFloorPlan(
   *   PlannableType.APARTMENT,
   *   15,
   *   {
   *     name: "2BR Layout",
   *     imageUrl: "layout.webp",
   *     pdfUrl: "layout.pdf"
   *   }
   * );
   * ```
   */
  static async addFloorPlan(
    entityType: PlannableType,
    entityId: number,
    planData: {
      name: string;
      imageUrl: string;
      pdfUrl?: string | null;
      displayOrder?: number;
    },
    trx?: Knex.Transaction
  ): Promise<FloorPlan> {
    const createData: CreateFloorPlanDto = {
      plannableType: entityType,
      plannableId: entityId,
      ...planData,
    };

    return FloorPlanModel.create(createData, trx);
  }

  // ============================================================================
  // UPDATE MEDIA
  // ============================================================================

  /**
   * @openapi
   * Updates a photo
   * Any field can be updated independently
   *
   * @param {number} photoId - Photo ID
   * @param {Object} data - Fields to update
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo | null>} Updated photo or null if not found
   * @throws {Error} If update fails
   *
   * @example
   * ```typescript
   * // Update caption only
   * await MediaService.updatePhoto(101, { caption: "New caption" });
   *
   * // Set as cover photo
   * await MediaService.updatePhoto(102, { isCover: true });
   *
   * // Update multiple fields
   * await MediaService.updatePhoto(103, {
   *   url: "new-url.webp",
   *   caption: "Updated caption",
   *   displayOrder: 5
   * });
   * ```
   */
  static async updatePhoto(
    photoId: number,
    data: {
      url?: string;
      externalUrl?: string | null;
      caption?: string | null;
      displayOrder?: number;
      isCover?: boolean;
    },
    trx?: Knex.Transaction
  ): Promise<Photo | null> {
    return PhotoModel.update(photoId, data, trx);
  }

  /**
   * @openapi
   * Updates a floor plan
   * Any field can be updated independently
   *
   * @param {number} floorPlanId - Floor plan ID
   * @param {Object} data - Fields to update
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FloorPlan | null>} Updated floor plan or null if not found
   * @throws {Error} If update fails
   *
   * @example
   * ```typescript
   * // Update name
   * await MediaService.updateFloorPlan(201, { name: "Updated Layout" });
   *
   * // Add PDF version
   * await MediaService.updateFloorPlan(202, { pdfUrl: "plan.pdf" });
   * ```
   */
  static async updateFloorPlan(
    floorPlanId: number,
    data: {
      name?: string;
      imageUrl?: string;
      pdfUrl?: string | null;
      displayOrder?: number;
    },
    trx?: Knex.Transaction
  ): Promise<FloorPlan | null> {
    return FloorPlanModel.update(floorPlanId, data, trx);
  }

  /**
   * @openapi
   * Sets a photo as cover
   * Automatically unsets previous cover photo for the same entity
   *
   * @param {number} photoId - Photo ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo | null>} Updated photo or null if not found
   * @throws {Error} If update fails
   *
   * @example
   * ```typescript
   * const coverPhoto = await MediaService.setCoverPhoto(105);
   * console.log(`Photo ${coverPhoto.id} is now the cover photo`);
   * ```
   */
  static async setCoverPhoto(
    photoId: number,
    trx?: Knex.Transaction
  ): Promise<Photo | null> {
    return PhotoModel.setCover(photoId, trx);
  }

  // ============================================================================
  // DELETE MEDIA
  // ============================================================================

  /**
   * @openapi
   * Deletes a single photo
   * Supports soft delete (default) or force delete
   *
   * @param {number} photoId - Photo ID
   * @param {boolean} [force=false] - Force delete (permanent)
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} True if deleted successfully
   * @throws {Error} If deletion fails
   *
   * @example
   * ```typescript
   * // Soft delete
   * await MediaService.deletePhoto(101);
   *
   * // Force delete (permanent)
   * await MediaService.deletePhoto(102, true);
   * ```
   */
  static async deletePhoto(
    photoId: number,
    force: boolean = false,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    if (force) {
      return PhotoModel.forceDelete(photoId, trx);
    }
    return PhotoModel.delete(photoId, trx);
  }

  /**
   * @openapi
   * Deletes a single floor plan
   * Supports soft delete (default) or force delete
   *
   * @param {number} floorPlanId - Floor plan ID
   * @param {boolean} [force=false] - Force delete (permanent)
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} True if deleted successfully
   * @throws {Error} If deletion fails
   *
   * @example
   * ```typescript
   * // Soft delete
   * await MediaService.deleteFloorPlan(201);
   *
   * // Force delete (permanent)
   * await MediaService.deleteFloorPlan(202, true);
   * ```
   */
  static async deleteFloorPlan(
    floorPlanId: number,
    force: boolean = false,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    if (force) {
      return FloorPlanModel.forceDelete(floorPlanId, trx);
    }
    return FloorPlanModel.delete(floorPlanId, trx);
  }

  /**
   * @openapi
   * Deletes all media for an entity with cascade
   * Transaction-safe bulk deletion
   *
   * @param {PhotoableType} entityType - Entity type
   * @param {number} entityId - Entity ID
   * @param {boolean} [includeFloorPlans=false] - Also delete floor plans
   * @param {boolean} [force=false] - Force delete (permanent)
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Object>} Deletion results
   * @throws {Error} If deletion fails
   *
   * @example
   * ```typescript
   * // Delete all photos for a project
   * const result = await MediaService.deleteEntityMedia(
   *   PhotoableType.PROJECT,
   *   42
   * );
   *
   * // Delete all media including floor plans
   * const result = await MediaService.deleteEntityMedia(
   *   PhotoableType.APARTMENT,
   *   15,
   *   true, // include floor plans
   *   true  // force delete
   * );
   * console.log(`Photos deleted: ${result.photosDeleted}`);
   * console.log(`Plans deleted: ${result.plansDeleted}`);
   * ```
   */
  static async deleteEntityMedia(
    entityType: PhotoableType,
    entityId: number,
    includeFloorPlans: boolean = false,
    force: boolean = false,
    trx?: Knex.Transaction
  ): Promise<{ photosDeleted: boolean; plansDeleted?: boolean }> {
    const useTrx = trx || (await db.transaction());

    try {
      const photosDeleted = await PhotoModel.deleteForEntity(
        entityType,
        entityId,
        force,
        useTrx
      );

      let plansDeleted: boolean | undefined;
      if (includeFloorPlans) {
        const plannableType = this.mapToPlannableType(entityType);

        if (plannableType) {
          plansDeleted = await FloorPlanModel.deleteForEntity(
            plannableType,
            entityId,
            force,
            useTrx
          );
        }
      }

      if (!trx) {
        await useTrx.commit();
      }

      return { photosDeleted, plansDeleted };
    } catch (error) {
      if (!trx) {
        await useTrx.rollback();
      }
      throw error;
    }
  }

  /**
   * @openapi
   * Deletes an entity with all its media (cascade delete)
   * Complete cleanup operation with transaction safety
   *
   * @param {PhotoableType} entityType - Entity type
   * @param {number} entityId - Entity ID
   * @param {string} entityTable - Database table name for the entity
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} True if deleted successfully
   * @throws {Error} If deletion fails
   *
   * @example
   * ```typescript
   * // Delete project with all photos and floor plans
   * await MediaService.deleteEntityWithMedia(
   *   PhotoableType.PROJECT,
   *   42,
   *   "projects"
   * );
   *
   * // Delete apartment with all media
   * await MediaService.deleteEntityWithMedia(
   *   PhotoableType.APARTMENT,
   *   15,
   *   "apartments"
   * );
   * ```
   */
  static async deleteEntityWithMedia(
    entityType: PhotoableType,
    entityId: number,
    entityTable: string,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const useTrx = trx || (await db.transaction());

    try {
      await PhotoModel.deleteForEntity(entityType, entityId, true, useTrx);

      const plannableType = this.mapToPlannableType(entityType);
      if (plannableType) {
        await FloorPlanModel.deleteForEntity(
          plannableType,
          entityId,
          true,
          useTrx
        );
      }

      await useTrx(entityTable).where({ id: entityId }).del();

      if (!trx) {
        await useTrx.commit();
      }

      return true;
    } catch (error) {
      if (!trx) {
        await useTrx.rollback();
      }
      throw error;
    }
  }

  // ============================================================================
  // REORDER MEDIA
  // ============================================================================

  /**
   * @openapi
   * Reorders photos for an entity
   * Updates displayOrder based on array position
   *
   * @param {PhotoableType} entityType - Entity type
   * @param {number} entityId - Entity ID
   * @param {number[]} photoIds - Ordered array of photo IDs
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} True if reordered successfully
   * @throws {Error} If reorder fails
   *
   * @example
   * ```typescript
   * // Reorder photos: [5, 2, 8, 1, 9]
   * await MediaService.reorderPhotos(
   *   PhotoableType.PROJECT,
   *   42,
   *   [5, 2, 8, 1, 9]
   * );
   * // Photo 5 will have displayOrder=1
   * // Photo 2 will have displayOrder=2, etc.
   * ```
   */
  static async reorderPhotos(
    entityType: PhotoableType,
    entityId: number,
    photoIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    return PhotoModel.reorder(entityType, entityId, photoIds, trx);
  }

  /**
   * @openapi
   * Reorders floor plans for an entity
   * Updates displayOrder based on array position
   *
   * @param {PlannableType} entityType - Entity type
   * @param {number} entityId - Entity ID
   * @param {number[]} planIds - Ordered array of floor plan IDs
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<boolean>} True if reordered successfully
   * @throws {Error} If reorder fails
   *
   * @example
   * ```typescript
   * // Reorder floor plans
   * await MediaService.reorderFloorPlans(
   *   PlannableType.APARTMENT,
   *   15,
   *   [3, 1, 2]
   * );
   * ```
   */
  static async reorderFloorPlans(
    entityType: PlannableType,
    entityId: number,
    planIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    return FloorPlanModel.reorder(entityType, entityId, planIds, trx);
  }

  /**
   * @openapi
   * Reorders all media for an entity
   * Updates both photos and floor plans in a single transaction
   *
   * @param {PhotoableType} entityType - Entity type
   * @param {number} entityId - Entity ID
   * @param {number[]} photoIds - Ordered array of photo IDs
   * @param {number[]} [planIds] - Optional ordered array of floor plan IDs
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Object>} Reorder results
   * @throws {Error} If reorder fails
   *
   * @example
   * ```typescript
   * const result = await MediaService.reorderMedia(
   *   PhotoableType.PROJECT,
   *   42,
   *   [5, 2, 8, 1, 9],  // photos
   *   [3, 1, 2]          // floor plans
   * );
   * console.log(`Photos reordered: ${result.photosReordered}`);
   * console.log(`Plans reordered: ${result.plansReordered}`);
   * ```
   */
  static async reorderMedia(
    entityType: PhotoableType,
    entityId: number,
    photoIds: number[],
    planIds?: number[],
    trx?: Knex.Transaction
  ): Promise<{ photosReordered: boolean; plansReordered?: boolean }> {
    const useTrx = trx || (await db.transaction());

    try {
      const photosReordered = await PhotoModel.reorder(
        entityType,
        entityId,
        photoIds,
        useTrx
      );

      let plansReordered: boolean | undefined;
      if (planIds && planIds.length > 0) {
        const plannableType = this.mapToPlannableType(entityType);

        if (plannableType) {
          plansReordered = await FloorPlanModel.reorder(
            plannableType,
            entityId,
            planIds,
            useTrx
          );
        }
      }

      if (!trx) {
        await useTrx.commit();
      }

      return { photosReordered, plansReordered };
    } catch (error) {
      if (!trx) {
        await useTrx.rollback();
      }
      throw error;
    }
  }

  // ============================================================================
  // STATISTICS & COUNTS
  // ============================================================================

  /**
   * @openapi
   * Gets media counts for an entity
   * Returns photo count and floor plan count (if applicable)
   *
   * @param {PhotoableType} entityType - Entity type
   * @param {number} entityId - Entity ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<MediaCounts>} Media counts
   * @throws {Error} If count fails
   *
   * @example
   * ```typescript
   * const counts = await MediaService.getMediaCounts(
   *   PhotoableType.PROJECT,
   *   42
   * );
   * console.log(`Photos: ${counts.photoCount}`);
   * console.log(`Floor plans: ${counts.floorPlanCount}`);
   * ```
   */
  static async getMediaCounts(
    entityType: PhotoableType,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<MediaCounts> {
    const photoCount = await PhotoModel.countForEntity(
      entityType,
      entityId,
      trx
    );

    let floorPlanCount: number | undefined;
    const plannableType = this.mapToPlannableType(entityType);

    if (plannableType) {
      floorPlanCount = await FloorPlanModel.countForEntity(
        plannableType,
        entityId,
        trx
      );
    }

    return { photoCount, floorPlanCount };
  }

  /**
   * @openapi
   * Gets floor plan statistics
   * Provides detailed statistics about floor plans for an entity
   *
   * @param {PlannableType} entityType - Entity type
   * @param {number} entityId - Entity ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Object>} Floor plan statistics
   * @throws {Error} If statistics retrieval fails
   *
   * @example
   * ```typescript
   * const stats = await MediaService.getFloorPlanStatistics(
   *   PlannableType.PROJECT,
   *   42
   * );
   * console.log(`Total: ${stats.total}`);
   * console.log(`With PDF: ${stats.withPdf}`);
   * console.log(`Without PDF: ${stats.withoutPdf}`);
   * ```
   */
  static async getFloorPlanStatistics(
    entityType: PlannableType,
    entityId: number,
    trx?: Knex.Transaction
  ): Promise<{
    total: number;
    withPdf: number;
    withoutPdf: number;
  }> {
    return FloorPlanModel.getStatistics(entityType, entityId, trx);
  }

  // ============================================================================
  // COPY/DUPLICATE MEDIA
  // ============================================================================

  /**
   * @openapi
   * Copies media from one entity to another
   * Creates duplicate photos and optionally floor plans
   * Useful for templates or cloning entities
   *
   * @param {PhotoableType} sourceType - Source entity type
   * @param {number} sourceId - Source entity ID
   * @param {PhotoableType} targetType - Target entity type
   * @param {number} targetId - Target entity ID
   * @param {boolean} [includeFloorPlans=false] - Also copy floor plans
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Object>} Copied media
   * @throws {Error} If copy fails
   *
   * @example
   * ```typescript
   * // Copy all photos from one project to another
   * const copied = await MediaService.copyMedia(
   *   PhotoableType.PROJECT,
   *   sourceProjectId,
   *   PhotoableType.PROJECT,
   *   targetProjectId,
   *   true // include floor plans
   * );
   * console.log(`Copied ${copied.photos.length} photos`);
   * console.log(`Copied ${copied.floorPlans.length} floor plans`);
   *
   * // Use as template for new apartment
   * await MediaService.copyMedia(
   *   PhotoableType.APARTMENT,
   *   templateApartmentId,
   *   PhotoableType.APARTMENT,
   *   newApartmentId,
   *   true
   * );
   * ```
   */
  static async copyMedia(
    sourceType: PhotoableType,
    sourceId: number,
    targetType: PhotoableType,
    targetId: number,
    includeFloorPlans: boolean = false,
    trx?: Knex.Transaction
  ): Promise<{ photos: Photo[]; floorPlans?: FloorPlan[] }> {
    const useTrx = trx || (await db.transaction());

    try {
      const photos = await PhotoModel.duplicatePhotos(
        sourceType,
        sourceId,
        targetType,
        targetId,
        useTrx
      );

      let floorPlans: FloorPlan[] | undefined;
      if (includeFloorPlans) {
        const sourcePlannableType = this.mapToPlannableType(sourceType);
        const targetPlannableType = this.mapToPlannableType(targetType);

        if (sourcePlannableType && targetPlannableType) {
          floorPlans = await FloorPlanModel.duplicateFloorPlans(
            sourcePlannableType,
            sourceId,
            targetPlannableType,
            targetId,
            useTrx
          );
        }
      }

      if (!trx) {
        await useTrx.commit();
      }

      return { photos, floorPlans };
    } catch (error) {
      if (!trx) {
        await useTrx.rollback();
      }
      throw error;
    }
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  /**
   * @openapi
   * Validates that an entity has required media before publishing
   * Checks minimum photo count, cover photo requirement, and floor plan count
   * Useful for enforcing business rules before making content public
   *
   * @param {PhotoableType} entityType - Entity type
   * @param {number} entityId - Entity ID
   * @param {Object} requirements - Validation requirements
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Object>} Validation result with errors array
   * @throws {Error} If validation check fails
   *
   * @example
   * ```typescript
   * // Validate before publishing project
   * const validation = await MediaService.validateRequiredMedia(
   *   PhotoableType.PROJECT,
   *   projectId,
   *   {
   *     minPhotos: 5,
   *     requireCoverPhoto: true,
   *     minFloorPlans: 2
   *   }
   * );
   *
   * if (!validation.valid) {
   *   console.error("Cannot publish:", validation.errors);
   *   // ["Requires at least 5 photo(s), found 2"]
   *   // ["Cover photo is required"]
   *   // ["Requires at least 2 floor plan(s), found 0"]
   * } else {
   *   // Proceed with publishing
   *   await publishProject(projectId);
   * }
   *
   * // Validate apartment with minimal requirements
   * const validation = await MediaService.validateRequiredMedia(
   *   PhotoableType.APARTMENT,
   *   apartmentId,
   *   { minPhotos: 3, requireCoverPhoto: true }
   * );
   * ```
   */
  static async validateRequiredMedia(
    entityType: PhotoableType,
    entityId: number,
    requirements: {
      minPhotos?: number;
      requireCoverPhoto?: boolean;
      minFloorPlans?: number;
    },
    trx?: Knex.Transaction
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (requirements.minPhotos) {
      const photoCount = await PhotoModel.countForEntity(
        entityType,
        entityId,
        trx
      );

      if (photoCount < requirements.minPhotos) {
        errors.push(
          `Requires at least ${requirements.minPhotos} photo(s), found ${photoCount}`
        );
      }
    }

    if (requirements.requireCoverPhoto) {
      const coverPhoto = await PhotoModel.getCoverPhoto(
        entityType,
        entityId,
        trx
      );

      if (!coverPhoto) {
        errors.push("Cover photo is required");
      }
    }

    if (requirements.minFloorPlans) {
      const plannableType = this.mapToPlannableType(entityType);

      if (plannableType) {
        const planCount = await FloorPlanModel.countForEntity(
          plannableType,
          entityId,
          trx
        );

        if (planCount < requirements.minFloorPlans) {
          errors.push(
            `Requires at least ${requirements.minFloorPlans} floor plan(s), found ${planCount}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default MediaService;
