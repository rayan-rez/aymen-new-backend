/**
 * ============================================================================
 * APARTMENT MODEL - AYMEN PROMOTION REAL ESTATE MANAGEMENT SYSTEM
 * ============================================================================
 * 
 * @module models/apartment.model
 * @description
 * Comprehensive model for managing individual apartment units within real estate projects.
 * Handles apartment specifications, pricing, status tracking, and polymorphic media relationships.
 * 
 * KEY FEATURES:
 * - ✅ Full apartment lifecycle management (available → reserved → sold)
 * - ✅ Polymorphic photo management through PhotoModel
 * - ✅ Polymorphic floor plan management through FloorPlanModel
 * - ✅ Integrated media upload service support
 * - ✅ Automatic validation and business rules enforcement
 * - ✅ Project integration with cascade operations
 * - ✅ Virtual tour URL support
 * - ✅ Advanced filtering and search capabilities
 * - ✅ Statistics and analytics methods
 * 
 * MEDIA RELATIONSHIPS:
 * - Photos: photos table (photoable_type = 'apartment', photoable_id = apartment.id)
 * - Floor Plans: floor_plans table (plannable_type = 'apartment', plannable_id = apartment.id)
 * 
 * BUSINESS RULES:
 * - Apartment must belong to a valid project
 * - Unit numbers must be unique within a project
 * - Price and area must be positive values
 * - Room counts cannot be negative
 * - Floor number cannot be less than -5 (underground parking)
 * - Status changes are tracked and logged
 * - Project price range auto-updates via database trigger
 * 
 * TYPICAL WORKFLOW:
 * 1. Create apartment with basic details
 * 2. Upload photos and floor plans using MediaService
 * 3. Set one photo as cover
 * 4. Add virtual tour URL if available
 * 5. Publish when ready (isPublished = true)
 * 6. Update status as sales progress (available → reserved → sold)
 * 
 * @example
 * // Create apartment with media
 * const apartment = await ApartmentModel.create({
 *   projectId: 1,
 *   name: "Luxury 2BR",
 *   unitNumber: "A-201",
 *   floorNumber: 2,
 *   areaSqm: 85,
 *   bedrooms: 2,
 *   bathrooms: 1,
 *   price: 120000,
 *   status: ApartmentStatus.AVAILABLE
 * });
 * 
 * // Upload photos using integrated service
 * await apartment.uploadPhotos([photoFile1, photoFile2]);
 * 
 * // Mark as sold
 * await ApartmentModel.markAsSold(apartment.id);
 * 
 * @author Aymen Promotion Development Team
 * @since 1.0.0
 * @lastModified 2025-01-15
 */

import {
  BaseModel,
  AdvancedQueryOptions,
  PaginatedResult,
  DatabaseRecord,
} from "./base";
import PhotoModel, { PhotoableType, Photo } from "./photo.model";
import FloorPlanModel, { PlannableType, FloorPlan } from "./floor-plan.model";
import MediaService, {
  MediaCreationResult,
  BatchMediaResult,
} from "@/services/media.service";
import { Knex } from "knex";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Apartment status enumeration (sales pipeline)
 * 
 * @description
 * Represents the current sales status of an apartment unit.
 * Status progression: AVAILABLE → RESERVED → SOLD
 * 
 * BUSINESS LOGIC:
 * - AVAILABLE: Unit is on the market and can be purchased
 * - RESERVED: Unit has a deposit/reservation but not yet sold
 * - SOLD: Unit has been sold, no longer available
 * 
 * Used for:
 * - Filtering available units for customers
 * - Calculating project statistics
 * - Tracking sales pipeline
 * - Generating availability reports
 */
export enum ApartmentStatus {
  AVAILABLE = "available",
  RESERVED = "reserved",
  SOLD = "sold",
}

/**
 * Apartment entity interface
 * 
 * @description
 * Complete representation of an apartment unit in the system.
 * Includes all database fields plus virtual relations.
 * 
 * FIELD GROUPS:
 * - Identity: id, projectId, name, unitNumber, floorNumber
 * - Marketing: title, subtitle, description
 * - Specifications: areaSqm, bedrooms, bathrooms, livingRooms, kitchens, balconies
 * - Pricing: price
 * - Status: status, isModelUnit, isPublished
 * - Media: virtualVisitUrl, photos (virtual), floorPlans (virtual)
 * - Timestamps: createdAt, updatedAt, deletedAt
 * 
 * VIRTUAL RELATIONS:
 * - project: Parent project (belongsTo)
 * - photos: Array of photos (polymorphic hasMany)
 * - floorPlans: Array of floor plans (polymorphic hasMany)
 */
export interface Apartment {
  /** Primary key - Auto-incrementing ID */
  id: number;

  /** Foreign key to projects table - Parent project */
  projectId: number;

  /** Internal name for the apartment unit */
  name: string;

  /** Unit number (e.g., "A-201", "B-305") - Must be unique within project */
  unitNumber: string | null;

  /** Floor number - Can be negative for underground levels (-1, -2, etc.) */
  floorNumber: number | null;

  // ------------------------------------------------------------------------
  // MARKETING CONTENT
  // ------------------------------------------------------------------------

  /** Public-facing title for marketing materials */
  title: string | null;

  /** Marketing subtitle or tagline */
  subtitle: string | null;

  /** Detailed description for listings and marketing */
  description: string | null;

  // ------------------------------------------------------------------------
  // SPECIFICATIONS
  // ------------------------------------------------------------------------

  /** Total area in square meters - Required, must be > 0 */
  areaSqm: number;

  /** Number of bedrooms */
  bedrooms: number | null;

  /** Number of bathrooms */
  bathrooms: number | null;

  /** Sale price in Algerian Dinar (DZD) - Required, must be > 0 */
  price: number;

  /** Number of living rooms */
  livingRooms: number | null;

  /** Number of kitchens */
  kitchens: number | null;

  /** Number of balconies/terraces */
  balconies: number | null;

  // ------------------------------------------------------------------------
  // STATUS & VISIBILITY
  // ------------------------------------------------------------------------

  /** Current sales status (available, reserved, sold) */
  status: ApartmentStatus;

  /** True if this is a model/show apartment */
  isModelUnit: boolean;

  /** True if apartment should appear on public website */
  isPublished: boolean;

  /** URL to 360° virtual tour or video walkthrough */
  virtualVisitUrl: string | null;

  // ------------------------------------------------------------------------
  // TIMESTAMPS
  // ------------------------------------------------------------------------

  /** Record creation timestamp */
  createdAt: Date;

  /** Last modification timestamp */
  updatedAt: Date;

  /** Soft delete timestamp - null if not deleted */
  deletedAt: Date | null;

  // ------------------------------------------------------------------------
  // VIRTUAL RELATIONS (not in database, loaded on demand)
  // ------------------------------------------------------------------------

  /** Parent project (loaded via relations: ['project']) */
  project?: any;

  /** Array of photos (loaded via includePhotos or loadPhotos) */
  photos?: Photo[];

  /** Array of floor plans (loaded via includeFloorPlans or loadFloorPlans) */
  floorPlans?: FloorPlan[];
}

/**
 * Create apartment DTO (Data Transfer Object)
 * 
 * @description
 * Defines required and optional fields for creating a new apartment.
 * Used in API endpoints and service layer for type safety.
 * 
 * REQUIRED FIELDS:
 * - projectId: Must reference existing project
 * - name: Internal identifier
 * - areaSqm: Must be > 0
 * - price: Must be > 0
 * 
 * OPTIONAL FIELDS:
 * - All other fields have defaults or can be null
 * - status defaults to AVAILABLE if not specified
 * - isModelUnit defaults to false
 * - isPublished defaults to false
 */
export interface CreateApartmentDto {
  /** Parent project ID (required) */
  projectId: number;

  /** Apartment name (required) */
  name: string;

  /** Unit number (optional, but recommended for organization) */
  unitNumber?: string;

  /** Floor number (optional) */
  floorNumber?: number;

  /** Marketing title (optional) */
  title?: string;

  /** Marketing subtitle (optional) */
  subtitle?: string;

  /** Full description (optional) */
  description?: string;

  /** Area in square meters (required, must be > 0) */
  areaSqm: number;

  /** Number of bedrooms (optional) */
  bedrooms?: number;

  /** Number of bathrooms (optional) */
  bathrooms?: number;

  /** Price in DZD (required, must be > 0) */
  price: number;

  /** Number of living rooms (optional) */
  livingRooms?: number;

  /** Number of kitchens (optional) */
  kitchens?: number;

  /** Number of balconies (optional) */
  balconies?: number;

  /** Initial status (defaults to AVAILABLE) */
  status?: ApartmentStatus;

  /** Is this a model unit? (defaults to false) */
  isModelUnit?: boolean;

  /** Should appear on website? (defaults to false) */
  isPublished?: boolean;

  /** Virtual tour URL (optional) */
  virtualVisitUrl?: string;
}

/**
 * Update apartment DTO
 * 
 * @description
 * All fields are optional for partial updates.
 * Inherits from CreateApartmentDto with all fields made optional.
 */
export interface UpdateApartmentDto extends Partial<CreateApartmentDto> { }

/**
 * Apartment query options
 * 
 * @description
 * Advanced filtering options for apartment queries.
 * Extends base query options with apartment-specific filters.
 * 
 * FILTER CAPABILITIES:
 * - Project filtering: Single or multiple projects
 * - Status filtering: Filter by sales status
 * - Price range: Min/max price filters
 * - Bedroom/bathroom filtering: Exact or range
 * - Area filtering: Min/max area in sqm
 * - Floor filtering: Specific floors or ranges
 * - Special flags: Model units, published status, virtual tours
 * - Media loading: Automatically load photos and/or floor plans
 */
export interface ApartmentQueryOptions extends AdvancedQueryOptions {
  /** Filter by project ID (single or array) */
  projectId?: number | number[];

  /** Filter by status (single or array) */
  status?: ApartmentStatus | ApartmentStatus[];

  /** Filter model units only */
  isModelUnit?: boolean;

  /** Filter published apartments only */
  isPublished?: boolean;

  /** Minimum price filter */
  minPrice?: number;

  /** Maximum price filter */
  maxPrice?: number;

  /** Exact bedroom count (single or array) */
  bedrooms?: number | number[];

  /** Minimum bedroom count */
  minBedrooms?: number;

  /** Maximum bedroom count */
  maxBedrooms?: number;

  /** Exact bathroom count (single or array) */
  bathrooms?: number | number[];

  /** Minimum area in sqm */
  minArea?: number;

  /** Maximum area in sqm */
  maxArea?: number;

  /** Exact floor number (single or array) */
  floorNumber?: number | number[];

  /** Minimum floor number */
  minFloor?: number;

  /** Maximum floor number */
  maxFloor?: number;

  /** Filter by virtual tour availability */
  hasVirtualVisit?: boolean;

  /** Automatically load photos with results */
  includePhotos?: boolean;

  /** Automatically load floor plans with results */
  includeFloorPlans?: boolean;
}

/**
 * Apartment availability summary
 * 
 * @description
 * Statistical summary of apartment availability for a project.
 * Used for dashboards, reports, and project overview pages.
 * 
 * CALCULATIONS:
 * - availabilityRate = (available / total) * 100
 * - soldRate = (sold / total) * 100
 */
export interface ApartmentAvailabilitySummary {
  /** Total number of apartments in project */
  total: number;

  /** Number of available apartments */
  available: number;

  /** Number of reserved apartments */
  reserved: number;

  /** Number of sold apartments */
  sold: number;

  /** Percentage of available units (0-100) */
  availabilityRate: number;

  /** Percentage of sold units (0-100) */
  soldRate: number;
}

// ============================================================================
// APARTMENT MODEL CLASS
// ============================================================================

/**
 * Apartment Model Class
 * 
 * @description
 * Active Record implementation for apartment management.
 * Extends BaseModel with apartment-specific functionality.
 * 
 * INTEGRATED SERVICES:
 * - MediaService: For photo and floor plan uploads
 * - PhotoModel: Direct polymorphic photo access
 * - FloorPlanModel: Direct polymorphic floor plan access
 * 
 * KEY METHODS CATEGORIES:
 * 1. Media Loading (loadPhotos, loadFloorPlans, loadMedia)
 * 2. Media Upload (uploadPhotos, uploadFloorPlans, uploadPhoto)
 * 3. Media Management (setCoverPhoto, deletePhotos, reorderPhotos)
 * 4. Lifecycle Hooks (beforeCreate, afterCreate, beforeUpdate)
 * 5. Query Methods (findApartments, findAvailable, findByProject)
 * 6. Status Management (markAsSold, markAsReserved, bulkUpdateStatus)
 * 7. Statistics (getAvailabilitySummary, getProjectStatistics)
 */
export class ApartmentModel extends BaseModel<
  Apartment,
  CreateApartmentDto,
  UpdateApartmentDto
> {
  protected tableName = "apartments";
  protected primaryKey = "id";

  /**
   * Model configuration
   * 
   * - softDelete: true - Apartments are soft deleted (set deleted_at)
   * - timestamps: true - Automatic created_at and updated_at management
   * - defaultSortColumn: unit_number - Sort by unit number by default
   * - defaultSortOrder: asc - Ascending order (A-101, A-102, etc.)
   * - searchableColumns: Full-text search in name, unitNumber, title, description
   * - fillable: Fields allowed for mass assignment
   * - guarded: Fields protected from mass assignment
   */
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

  /**
   * Model relations definition
   * 
   * DEFINED RELATIONS:
   * - project: belongsTo relationship to projects table
   * 
   * POLYMORPHIC RELATIONS (handled by separate models):
   * - photos: Via PhotoModel (photoable_type = 'apartment')
   * - floorPlans: Via FloorPlanModel (plannable_type = 'apartment')
   */
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
   * Loads photos for a single apartment
   * 
   * @description
   * Fetches all photos associated with this apartment from the polymorphic photos table.
   * Photos are returned ordered by display_order (ascending).
   * 
   * @param apartmentId - Apartment ID
   * @param trx - Optional transaction for atomic operations
   * @returns Promise<Photo[]> Array of photo objects
   * 
   * @example
   * const photos = await ApartmentModel.loadPhotos(apartmentId);
   * console.log(`Found ${photos.length} photos`);
   */
  async loadPhotos(apartmentId: number, trx?: Knex.Transaction): Promise<Photo[]> {
    return PhotoModel.getForEntity(PhotoableType.APARTMENT, apartmentId, {}, trx);
  }

  /**
   * Loads floor plans for a single apartment
   * 
   * @description
   * Fetches all floor plans associated with this apartment from the polymorphic floor_plans table.
   * Floor plans are returned ordered by display_order (ascending).
   * 
   * @param apartmentId - Apartment ID
   * @param trx - Optional transaction
   * @returns Promise<FloorPlan[]> Array of floor plan objects
   * 
   * @example
   * const plans = await ApartmentModel.loadFloorPlans(apartmentId);
   * console.log(`Found ${plans.length} floor plans`);
   */
  async loadFloorPlans(apartmentId: number, trx?: Knex.Transaction): Promise<FloorPlan[]> {
    return FloorPlanModel.getForEntity(PlannableType.APARTMENT, apartmentId, {}, trx);
  }

  /**
   * Loads both photos and floor plans in parallel (optimized)
   * 
   * @description
   * Efficiently loads all media for an apartment using Promise.all for parallel execution.
   * More performant than calling loadPhotos() and loadFloorPlans() sequentially.
   * 
   * @param apartmentId - Apartment ID
   * @param trx - Optional transaction
   * @returns Promise<object> Object with photos and floorPlans arrays
   * 
   * @example
   * const { photos, floorPlans } = await ApartmentModel.loadMedia(apartmentId);
   * console.log(`Total media: ${photos.length + floorPlans.length}`);
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
   * Loads photos for multiple apartments (optimized batch operation)
   * 
   * @description
   * Efficiently loads photos for multiple apartments with a single database query.
   * Returns a Map for O(1) lookup by apartment ID.
   * 
   * PERFORMANCE:
   * - Single query instead of N queries
   * - Returns Map for fast lookup
   * - Automatically groups by apartment ID
   * 
   * @private Internal method used by findApartments with includePhotos option
   * @param apartmentIds - Array of apartment IDs
   * @param trx - Optional transaction
   * @returns Promise<Map> Map of apartmentId → Photo[]
   */
  private async loadPhotosForMany(
    apartmentIds: number[],
    trx?: Knex.Transaction
  ): Promise<Map<number, Photo[]>> {
    if (apartmentIds.length === 0) return new Map();

    const photos = await PhotoModel.findPhotos(
      { polymorphicType: PhotoableType.APARTMENT, polymorphicId: apartmentIds },
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
   * Loads floor plans for multiple apartments (optimized batch operation)
   * 
   * @description
   * Efficiently loads floor plans for multiple apartments with a single database query.
   * Similar optimization strategy to loadPhotosForMany.
   * 
   * @private Internal method
   * @param apartmentIds - Array of apartment IDs
   * @param trx - Optional transaction
   * @returns Promise<Map> Map of apartmentId → FloorPlan[]
   */
  private async loadFloorPlansForMany(
    apartmentIds: number[],
    trx?: Knex.Transaction
  ): Promise<Map<number, FloorPlan[]>> {
    if (apartmentIds.length === 0) return new Map();

    const floorPlans = await FloorPlanModel.findFloorPlans(
      { polymorphicType: PlannableType.APARTMENT, polymorphicId: apartmentIds },
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

  // ============================================================================
  // MEDIA UPLOAD METHODS (INTEGRATED WITH MEDIA SERVICE)
  // ============================================================================

  /**
   * Uploads a single photo for an apartment using Multer file
   * 
   * @description
   * Complete flow: File upload → Image processing → Database record creation
   * Integrates with MediaService for file handling and PhotoModel for database operations.
   * 
   * FEATURES:
   * - Automatic image optimization (WebP conversion, resizing)
   * - Thumbnail generation
   * - Caption support
   * - Cover photo designation
   * - Display order management
   * 
   * @param apartmentId - Apartment ID
   * @param file - Multer file from req.file
   * @param options - Upload options (caption, isCover, displayOrder)
   * @param trx - Optional transaction
   * @returns Promise<MediaCreationResult> Upload result with photo object
   * 
   * @example
   * // In Express controller
   * const result = await ApartmentModel.uploadPhotoFromMulter(
   *   apartmentId,
   *   req.file,
   *   { caption: "Living room view", isCover: true }
   * );
   */
  async uploadPhotoFromMulter(
    apartmentId: number,
    file: any,
    options: {
      caption?: string;
      displayOrder?: number;
      isCover?: boolean;
    } = {},
    trx?: Knex.Transaction
  ): Promise<MediaCreationResult> {
    return MediaService.uploadPhotoFromMulter(
      file,
      PhotoableType.APARTMENT,
      apartmentId,
      options,
      { width: 1920, quality: 85, generateThumbnail: true },
      trx
    );
  }

  /**
   * Uploads multiple photos for an apartment using Multer files
   * 
   * @description
   * Batch upload with consistent processing options for all files.
   * Automatically handles display order sequencing.
   * 
   * @param apartmentId - Apartment ID
   * @param files - Array of Multer files from req.files
   * @param trx - Optional transaction
   * @returns Promise<BatchMediaResult> Batch operation result
   * 
   * @example
   * const result = await ApartmentModel.uploadPhotosFromMulter(
   *   apartmentId,
   *   req.files,
   * );
   * console.log(`Uploaded ${result.successCount}/${result.totalProcessed}`);
   */
  async uploadPhotosFromMulter(
    apartmentId: number,
    files: any[],
    trx?: Knex.Transaction
  ): Promise<BatchMediaResult> {
    return MediaService.uploadPhotosFromMulter(
      files,
      PhotoableType.APARTMENT,
      apartmentId,
      { width: 1920, quality: 85, generateThumbnail: true },
      trx
    );
  }

  /**
   * Uploads a floor plan for an apartment using Multer files
   * 
   * @description
   * Handles both image and optional PDF upload for technical drawings.
   * 
   * SUPPORTED FORMATS:
   * - Image: JPEG, PNG, WebP (converted to WebP for web)
   * - PDF: Optional architectural drawings
   * 
   * @param apartmentId - Apartment ID
   * @param imageFile - Multer image file (required)
   * @param pdfFile - Multer PDF file (optional)
   * @param options - Floor plan options (name, displayOrder)
   * @param trx - Optional transaction
   * @returns Promise<MediaCreationResult> Upload result
   * 
   * @example
   * const files = req.files as { image: MulterFile[], pdf?: MulterFile[] };
   * const result = await ApartmentModel.uploadFloorPlanFromMulter(
   *   apartmentId,
   *   files.image[0],
   *   files.pdf?.[0],
   *   { name: "2BR Floor Plan" }
   * );
   */
  async uploadFloorPlanFromMulter(
    apartmentId: number,
    imageFile: any,
    pdfFile: any | undefined,
    options: { name: string; displayOrder?: number },
    trx?: Knex.Transaction
  ): Promise<MediaCreationResult> {
    return MediaService.uploadFloorPlanFromMulter(
      imageFile,
      pdfFile,
      PlannableType.APARTMENT,
      apartmentId,
      options,
      trx
    );
  }

  // ============================================================================
  // MEDIA MANAGEMENT METHODS
  // ============================================================================

  /**
   * Sets a specific photo as the cover photo for an apartment
   * 
   * @description
   * Automatically unsets other cover photos and sets this one as cover.
   * Cover photo is used for thumbnails, listings, and preview images.
   * 
   * @param apartmentId - Apartment ID (for validation)
   * @param photoId - Photo ID to set as cover
   * @param trx - Optional transaction
   * @returns Promise<Photo | null> Updated photo or null if not found
   * 
   * @example
   * await ApartmentModel.setCoverPhoto(apartmentId, photoId);
   */
  async setCoverPhoto(
    apartmentId: number,
    photoId: number,
    trx?: Knex.Transaction
  ): Promise<Photo | null> {
    // Validate photo belongs to this apartment
    const photo = await PhotoModel.findById(photoId, {}, trx);
    if (!photo || photo.photoableId !== apartmentId) {
      throw new Error("Photo does not belong to this apartment");
    }

    return MediaService.setCoverPhoto(photoId, trx);
  }

  /**
   * Deletes a photo and its associated files
   * 
   * @param apartmentId - Apartment ID (for validation)
   * @param photoId - Photo ID to delete
   * @param deleteFiles - If true, deletes files from storage
   * @param trx - Optional transaction
   * @returns Promise<boolean> True if deleted successfully
   */
  async deletePhoto(
    apartmentId: number,
    photoId: number,
    deleteFiles: boolean = true,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const photo = await PhotoModel.findById(photoId, {}, trx);
    if (!photo || photo.photoableId !== apartmentId) {
      throw new Error("Photo does not belong to this apartment");
    }

    return MediaService.deletePhoto(photoId, deleteFiles, trx);
  }

  /**
   * Deletes all photos for an apartment
   * 
   * @param apartmentId - Apartment ID
   * @param deleteFiles - If true, deletes files from storage
   * @param trx - Optional transaction
   * @returns Promise<number> Number of photos deleted
   */
  async deleteAllPhotos(
    apartmentId: number,
    deleteFiles: boolean = true,
    trx?: Knex.Transaction
  ): Promise<number> {
    return MediaService.deleteEntityPhotos(
      PhotoableType.APARTMENT,
      apartmentId,
      deleteFiles,
      trx
    );
  }

  /**
   * Reorders photos for an apartment
   * 
   * @param apartmentId - Apartment ID
   * @param photoIds - Array of photo IDs in desired order
   * @param trx - Optional transaction
   * @returns Promise<boolean> True if successful
   */
  async reorderPhotos(
    apartmentId: number,
    photoIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    return MediaService.reorderPhotos(
      PhotoableType.APARTMENT,
      apartmentId,
      photoIds,
      trx
    );
  }

  /**
   * Deletes a floor plan and its files
   * 
   * @param apartmentId - Apartment ID (for validation)
   * @param floorPlanId - Floor plan ID to delete
   * @param deleteFiles - If true, deletes image and PDF files
   * @param trx - Optional transaction
   * @returns Promise<boolean> True if deleted
   */
  async deleteFloorPlan(
    apartmentId: number,
    floorPlanId: number,
    deleteFiles: boolean = true,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const plan = await FloorPlanModel.findById(floorPlanId, {}, trx);
    if (!plan || plan.plannableId !== apartmentId) {
      throw new Error("Floor plan does not belong to this apartment");
    }

    return MediaService.deleteFloorPlan(floorPlanId, deleteFiles, trx);
  }

  /**
   * Deletes all media (photos and floor plans) for an apartment
   * 
   * @description
   * Cascade deletion of all associated media files.
   * Useful when deleting an apartment or cleaning up orphaned media.
   * 
   * @param apartmentId - Apartment ID
   * @param deleteFiles - If true, deletes physical files from storage
   * @param trx - Optional transaction
   * @returns Promise<object> Count of deleted media
   * 
   * @example
   * const result = await ApartmentModel.deleteAllMedia(apartmentId);
   * console.log(`Deleted ${result.photosDeleted} photos, ${result.floorPlansDeleted} plans`);
   */
  async deleteAllMedia(
    apartmentId: number,
    deleteFiles: boolean = true,
    trx?: Knex.Transaction
  ): Promise<{ photosDeleted: number; floorPlansDeleted?: number }> {
    return MediaService.deleteAllEntityMedia(
      PhotoableType.APARTMENT,
      apartmentId,
      deleteFiles,
      trx
    );
  }

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Before create hook - Validates apartment data before insertion
   * 
   * @description
   * Business rules enforcement before creating apartment:
   * 1. Validates parent project exists and is not deleted
   * 2. Validates area is positive (> 0)
   * 3. Validates price is positive (> 0)
   * 4. Validates room counts are non-negative
   * 5. Sets default status to AVAILABLE if not specified
   * 6. Validates unit number uniqueness within project
   * 
   * @param data - Create apartment data
   * @returns Promise<CreateApartmentDto> Validated and processed data
   * @throws Error if validation fails
   */
  protected async beforeCreate(data: CreateApartmentDto): Promise<CreateApartmentDto> {
    // Validate parent project exists
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

    // Validate room counts
    this.validateRoomCounts(data);

    // Set default status
    if (!data.status) {
      data.status = ApartmentStatus.AVAILABLE;
    }

    // Validate unit number uniqueness
    if (data.unitNumber) {
      const existing = await this.db(this.tableName)
        .where({ project_id: data.projectId, unit_number: data.unitNumber })
        .whereNull("deleted_at")
        .first();

      if (existing) {
        throw new Error(`Unit number "${data.unitNumber}" already exists in this project`);
      }
    }

    return data;
  }

  /**
   * After create hook - Post-creation actions
   * 
   * @description
   * Actions performed after successful apartment creation:
   * - Logs creation event
   * - Project price range is auto-updated by database trigger
   * 
   * @param entity - Created apartment entity
   */
  protected async afterCreate(entity: Apartment): Promise<void> {
    console.log(`✅ Apartment created: ${entity.name} (Project: ${entity.projectId})`);
  }

  /**
   * Before update hook - Validates changes before update
   * 
   * @description
   * Business rules enforcement before updating apartment:
   * 1. Validates apartment exists
   * 2. Validates area changes (must be > 0)
   * 3. Validates price changes (must be > 0)
   * 4. Validates room count changes
   * 5. Validates unit number uniqueness if changed
   * 6. Validates new project exists if project is changed
   * 
   * @param id - Apartment ID
   * @param data - Update data
   * @returns Promise<UpdateApartmentDto> Validated data
   * @throws Error if validation fails
   */
  protected async beforeUpdate(id: number, data: UpdateApartmentDto): Promise<UpdateApartmentDto> {
    const apartment = await this.findById(id);
    if (!apartment) {
      throw new Error("Apartment not found");
    }

    // Validate area if changed
    if (data.areaSqm !== undefined && data.areaSqm <= 0) {
      throw new Error("Area must be greater than 0");
    }

    // Validate price if changed
    if (data.price !== undefined && data.price <= 0) {
      throw new Error("Price must be greater than 0");
    }

    // Validate room counts
    this.validateRoomCounts(data);

    // Validate unit number uniqueness if changed
    if (data.unitNumber && data.unitNumber !== apartment.unitNumber) {
      const existing = await this.db(this.tableName)
        .where({ project_id: apartment.projectId, unit_number: data.unitNumber })
        .where("id", "!=", id)
        .whereNull("deleted_at")
        .first();

      if (existing) {
        throw new Error(`Unit number "${data.unitNumber}" already exists in this project`);
      }
    }

    // Validate new project if changed
    if (data.projectId && data.projectId !== apartment.projectId) {
      const project = await this.db("projects")
        .where("id", data.projectId)
        .whereNull("deleted_at")
        .first();

      if (!project) {
        throw new Error(`Project with ID ${data.projectId} not found`);
      }
    }

    return data;
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Finds apartments with advanced filtering and optional media loading
   * 
   * @description
   * Primary query method supporting:
   * - Advanced filtering (project, status, price, rooms, floor, etc.)
   * - Relation loading (project)
   * - Automatic photo loading (if includePhotos: true)
   * - Automatic floor plan loading (if includeFloorPlans: true)
   * - Pagination support
   * - Full-text search
   * - Soft delete filtering
   * 
   * PERFORMANCE OPTIMIZATIONS:
   * - Single query for apartments
   * - Batch loading for photos (single query for all apartments)
   * - Batch loading for floor plans (single query for all apartments)
   * - Map-based grouping for O(1) lookup
   * 
   * @param options - Query options with filters
   * @param trx - Optional transaction
   * @returns Promise<Apartment[]> Array of apartments with optional media
   * 
   * @example
   * // Find available 2BR apartments under 150,000 with photos
   * const apartments = await ApartmentModel.findApartments({
   *   projectId: 1,
   *   status: ApartmentStatus.AVAILABLE,
   *   bedrooms: 2,
   *   maxPrice: 150000,
   *   includePhotos: true,
   *   includeFloorPlans: true
   * });
   */
  async findApartments(
    options: ApartmentQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);
    query = this.applyApartmentFilters(query, options);

    const records = await query;
    let entities = records.map((r: DatabaseRecord) => this.mapToEntity(r));

    // Load relations if requested
    if (options.relations && options.relations.length > 0) {
      entities = await this.loadRelationsForMany(entities, options.relations, trx);
    }

    // Load photos if requested (optimized batch loading)
    if (options.includePhotos) {
      const apartmentIds = entities.map((e: DatabaseRecord) => e.id);
      const photosByApartment = await this.loadPhotosForMany(apartmentIds, trx);
      entities = entities.map((entity: DatabaseRecord) => ({
        ...entity,
        photos: photosByApartment.get(entity.id) || [],
      }));
    }

    // Load floor plans if requested (optimized batch loading)
    if (options.includeFloorPlans) {
      const apartmentIds = entities.map((e: DatabaseRecord) => e.id);
      const plansByApartment = await this.loadFloorPlansForMany(apartmentIds, trx);
      entities = entities.map((entity: DatabaseRecord) => ({
        ...entity,
        floorPlans: plansByApartment.get(entity.id) || [],
      }));
    }

    return entities;
  }

  /**
   * Gets paginated apartments with metadata
   * 
   * @param options - Query options including page and limit
   * @param trx - Optional transaction
   * @returns Promise<PaginatedResult<Apartment>> Paginated results
   * 
   * @example
   * const result = await ApartmentModel.paginateApartments({
   *   projectId: 1,
   *   page: 1,
   *   limit: 10,
   *   includePhotos: true
   * });
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
   * Counts apartments matching filters
   * 
   * @param options - Query options with filters
   * @param trx - Optional transaction
   * @returns Promise<number> Count of matching apartments
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
   * Finds apartments by project ID
   * 
   * @param projectId - Project ID
   * @param options - Additional query options
   * @param trx - Optional transaction
   * @returns Promise<Apartment[]> Apartments in project
   */
  async findByProject(
    projectId: number,
    options: ApartmentQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Apartment[]> {
    return this.findApartments({ ...options, projectId }, trx);
  }

  /**
   * Finds available apartments (published and status = available)
   * 
   * @param projectId - Optional project ID filter
   * @param options - Additional query options
   * @param trx - Optional transaction
   * @returns Promise<Apartment[]> Available apartments
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

    if (projectId) queryOptions.projectId = projectId;
    return this.findApartments(queryOptions, trx);
  }

  /**
   * Finds model units (show apartments)
   * 
   * @param projectId - Optional project ID filter
   * @param trx - Optional transaction
   * @returns Promise<Apartment[]> Model units
   */
  async findModelUnits(projectId?: number, trx?: Knex.Transaction): Promise<Apartment[]> {
    const options: ApartmentQueryOptions = {
      isModelUnit: true,
      isPublished: true,
    };
    if (projectId) options.projectId = projectId;
    return this.findApartments(options, trx);
  }

  /**
   * Finds apartments by floor number
   * 
   * @param projectId - Project ID
   * @param floorNumber - Floor number
   * @param trx - Optional transaction
   * @returns Promise<Apartment[]> Apartments on floor
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
   * 
   * @param unitNumber - Unit number
   * @param projectId - Optional project ID filter
   * @param trx - Optional transaction
   * @returns Promise<Apartment[]> Matching apartments
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

    if (projectId) query = query.where("project_id", projectId);

    const records = await query;
    return records.map((r: DatabaseRecord) => this.mapToEntity(r));
  }

  // ============================================================================
  // STATUS MANAGEMENT
  // ============================================================================

  /**
   * Updates apartment status
   * 
   * @param id - Apartment ID
   * @param status - New status
   * @param trx - Optional transaction
   * @returns Promise<Apartment | null> Updated apartment
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
   * 
   * @param id - Apartment ID
   * @param trx - Optional transaction
   * @returns Promise<Apartment | null> Updated apartment
   */
  async markAsSold(id: number, trx?: Knex.Transaction): Promise<Apartment | null> {
    return this.updateStatus(id, ApartmentStatus.SOLD, trx);
  }

  /**
   * Marks apartment as reserved
   * 
   * @param id - Apartment ID
   * @param trx - Optional transaction
   * @returns Promise<Apartment | null> Updated apartment
   */
  async markAsReserved(id: number, trx?: Knex.Transaction): Promise<Apartment | null> {
    return this.updateStatus(id, ApartmentStatus.RESERVED, trx);
  }

  /**
   * Marks apartment as available
   * 
   * @param id - Apartment ID
   * @param trx - Optional transaction
   * @returns Promise<Apartment | null> Updated apartment
   */
  async markAsAvailable(id: number, trx?: Knex.Transaction): Promise<Apartment | null> {
    return this.updateStatus(id, ApartmentStatus.AVAILABLE, trx);
  }

  /**
   * Bulk updates apartment status
   * 
   * @param ids - Array of apartment IDs
   * @param status - New status
   * @param trx - Optional transaction
   * @returns Promise<number> Number of updated apartments
   */
  async bulkUpdateStatus(
    ids: number[],
    status: ApartmentStatus,
    trx?: Knex.Transaction
  ): Promise<number> {
    const connection = trx || this.db;
    return await connection(this.tableName)
      .whereIn("id", ids)
      .whereNull("deleted_at")
      .update({ status, updated_at: connection.fn.now() });
  }

  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================

  /**
   * Gets availability summary for a project
   * 
   * @description
   * Calculates availability statistics including:
   * - Total apartments
   * - Available count
   * - Reserved count
   * - Sold count
   * - Availability rate percentage
   * - Sold rate percentage
   * 
   * @param projectId - Project ID
   * @param trx - Optional transaction
   * @returns Promise<ApartmentAvailabilitySummary> Summary statistics
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
        connection.raw("COUNT(CASE WHEN status = 'available' THEN 1 END) as available"),
        connection.raw("COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved"),
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
   * Gets comprehensive apartment statistics for a project
   * 
   * @param projectId - Project ID
   * @param trx - Optional transaction
   * @returns Promise<object> Detailed statistics
   */
  async getProjectStatistics(projectId: number, trx?: Knex.Transaction): Promise<any> {
    const connection = trx || this.db;

    const [stats] = await connection(this.tableName)
      .where("project_id", projectId)
      .whereNull("deleted_at")
      .select(
        connection.raw("COUNT(*) as total"),
        connection.raw("COUNT(CASE WHEN status = 'available' THEN 1 END) as available"),
        connection.raw("COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold"),
        connection.raw("COUNT(CASE WHEN is_published = true THEN 1 END) as published"),
        connection.raw("MIN(price) as minPrice"),
        connection.raw("MAX(price) as maxPrice"),
        connection.raw("AVG(price) as avgPrice"),
        connection.raw("AVG(area_sqm) as avgArea")
      );

    return {
      total: Number(stats.total),
      available: Number(stats.available),
      sold: Number(stats.sold),
      published: Number(stats.published),
      pricing: {
        min: stats.minPrice ? Number(stats.minPrice) : null,
        max: stats.maxPrice ? Number(stats.maxPrice) : null,
        avg: stats.avgPrice ? Number(stats.avgPrice) : null,
      },
      area: {
        avg: stats.avgArea ? Number(stats.avgArea) : null,
      },
    };
  }

  /**
   * Gets floor distribution for a project
   * 
   * @param projectId - Project ID
   * @param trx - Optional transaction
   * @returns Promise<array> Floor distribution data
   */
  async getFloorDistribution(projectId: number, trx?: Knex.Transaction): Promise<any[]> {
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
   * 
   * @param projectId - Project ID
   * @param trx - Optional transaction
   * @returns Promise<array> Bedroom distribution data
   */
  async getBedroomDistribution(projectId: number, trx?: Knex.Transaction): Promise<any[]> {
    const connection = trx || this.db;
    return connection(this.tableName)
      .where("project_id", projectId)
      .whereNull("deleted_at")
      .select("bedrooms")
      .count("* as count")
      .groupBy("bedrooms")
      .orderBy("bedrooms", "asc");
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Validates room counts are non-negative
   * 
   * @private
   * @param data - Apartment data to validate
   * @throws Error if validation fails
   */
  private validateRoomCounts(data: Partial<CreateApartmentDto>): void {
    const fields = ["bedrooms", "bathrooms", "livingRooms", "kitchens", "balconies"];

    for (const field of fields) {
      const value = (data as any)[field];
      if (value !== undefined && value !== null && value < 0) {
        throw new Error(`${field} cannot be negative`);
      }
    }

    if (
      data.floorNumber !== undefined &&
      data.floorNumber !== null &&
      data.floorNumber < -5
    ) {
      throw new Error("Floor number cannot be less than -5");
    }
  }

  /**
   * Applies apartment-specific filters to query
   * 
   * @private
   * @param query - Knex query builder
   * @param options - Filter options
   * @returns Knex.QueryBuilder Modified query
   */
  private applyApartmentFilters(
    query: Knex.QueryBuilder,
    options: ApartmentQueryOptions
  ): Knex.QueryBuilder {
    if (options.projectId) {
      if (Array.isArray(options.projectId)) {
        query = query.whereIn("project_id", options.projectId);
      } else {
        query = query.where("project_id", options.projectId);
      }
    }

    if (options.status) {
      if (Array.isArray(options.status)) {
        query = query.whereIn("status", options.status);
      } else {
        query = query.where("status", options.status);
      }
    }

    if (options.isModelUnit !== undefined) {
      query = query.where("is_model_unit", options.isModelUnit);
    }

    if (options.isPublished !== undefined) {
      query = query.where("is_published", options.isPublished);
    }

    if (options.minPrice !== undefined) {
      query = query.where("price", ">=", options.minPrice);
    }
    if (options.maxPrice !== undefined) {
      query = query.where("price", "<=", options.maxPrice);
    }

    if (options.bedrooms) {
      if (Array.isArray(options.bedrooms)) {
        query = query.whereIn("bedrooms", options.bedrooms);
      } else {
        query = query.where("bedrooms", options.bedrooms);
      }
    }

    if (options.minArea !== undefined) {
      query = query.where("area_sqm", ">=", options.minArea);
    }
    if (options.maxArea !== undefined) {
      query = query.where("area_sqm", "<=", options.maxArea);
    }

    if (options.floorNumber) {
      if (Array.isArray(options.floorNumber)) {
        query = query.whereIn("floor_number", options.floorNumber);
      } else {
        query = query.where("floor_number", options.floorNumber);
      }
    }

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
   * 
   * @protected
   * @param record - Raw database record
   * @returns Apartment Typed apartment entity
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

/**
 * Export singleton instance
 * 
 * @description
 * Single shared instance for the entire application.
 * Ensures consistent database connection and configuration.
 */
export default new ApartmentModel();