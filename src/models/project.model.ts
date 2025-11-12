/**
 * ============================================================================
 * PROJECT MODEL - AYMEN PROMOTION REAL ESTATE MANAGEMENT SYSTEM
 * ============================================================================
 * 
 * @module models/project.model
 * @description
 * Core model for managing real estate development projects.
 * Represents complete residential or commercial property developments from planning to completion.
 * 
 * KEY FEATURES:
 * - ✅ Complete project lifecycle management (planning → construction → completion)
 * - ✅ Polymorphic media relationships (photos, floor plans)
 * - ✅ Integrated upload service support
 * - ✅ Project features management (amenities, security, etc.)
 * - ✅ Location-based filtering with GPS coordinates
 * - ✅ Automatic price range calculation from apartments
 * - ✅ Progress tracking (completion percentage)
 * - ✅ Publication workflow
 * - ✅ Advanced search and filtering
 * 
 * MEDIA RELATIONSHIPS:
 * - Photos: photos table (photoable_type = 'project')
 * - Floor Plans: floor_plans table (plannable_type = 'project')
 * - Main Photo: Direct URL field for primary project image
 * 
 * FEATURES RELATIONSHIP:
 * - Many-to-Many with features table via project_features pivot table
 * - Each feature can have a custom value per project
 * 
 * APARTMENTS RELATIONSHIP:
 * - One-to-Many: A project can have multiple apartments
 * - Cascade delete: Deleting project deletes all apartments
 * - Automatic price range update via database trigger
 * 
 * BUSINESS RULES:
 * - Published projects MUST have mainPhotoUrl and description
 * - GPS coordinates must be valid (-90 to 90 for latitude, -180 to 180 for longitude)
 * - Completion percentage must be 0-100
 * - Slug must be unique across all projects
 * - Price range (priceMin, priceMax) auto-updated by database trigger on apartment changes
 * 
 * TYPICAL WORKFLOW:
 * 1. Create project with basic details
 * 2. Upload main photo and project photos
 * 3. Upload floor plans (site plan, typical floor plans)
 * 4. Add project features (amenities, security, transport)
 * 5. Create apartments within project
 * 6. Publish when ready (isPublished = true)
 * 7. Update completion percentage as construction progresses
 * 
 * @example
 * // Create project with media
 * const project = await ProjectModel.create({
 *   name: "Résidence Les Jasmins",
 *   address: "Ain Benian, Algiers",
 *   projectType: ProjectType.RESIDENTIAL,
 *   status: ProjectStatus.UNDER_CONSTRUCTION,
 *   completionPercentage: 35,
 *   totalUnits: 48
 * });
 * 
 * // Upload photos
 * await project.uploadPhotosFromMulter(req.files);
 * 
 * // Add features
 * await project.attachFeatures([1, 2, 3]); // Security, Parking, Pool
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
import { generateSlug } from "@/database/helpers";
import { Knex } from "knex";
import PhotoModel, { PhotoableType, Photo } from "./photo.model";
import FloorPlanModel, { PlannableType, FloorPlan } from "./floor-plan.model";
import MediaService, {
  MediaCreationResult,
  BatchMediaResult,
} from "@/services/media.service";
import db from "@/config/database";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Project type enumeration
 * 
 * @description
 * Categorizes projects by development type and target market.
 * 
 * TYPES:
 * - RESIDENTIAL: Standard residential apartments/houses
 * - COMMERCIAL: Office buildings, retail spaces, commercial complexes
 * - MIXED_USE: Combined residential and commercial development
 * - LUXURY: High-end residential with premium amenities
 * - AFFORDABLE: Budget-friendly housing programs
 */
export enum ProjectType {
  RESIDENTIAL = "residential",
  COMMERCIAL = "commercial",
  MIXED_USE = "mixed_use",
  LUXURY = "luxury",
  AFFORDABLE = "affordable",
}

/**
 * Project status enumeration
 * 
 * @description
 * Tracks project development lifecycle status.
 * 
 * STATUS PROGRESSION:
 * PLANNING → UNDER_CONSTRUCTION → COMPLETED → SOLD_OUT
 * 
 * BUSINESS LOGIC:
 * - PLANNING: Pre-construction, design and permits phase
 * - UNDER_CONSTRUCTION: Active construction, units can be pre-sold
 * - COMPLETED: Construction finished, units ready for handover
 * - SOLD_OUT: All units sold, no inventory available
 */
export enum ProjectStatus {
  PLANNING = "planning",
  UNDER_CONSTRUCTION = "under_construction",
  COMPLETED = "completed",
  SOLD_OUT = "sold_out",
}

/**
 * Project entity interface
 * 
 * @description
 * Complete representation of a real estate development project.
 * 
 * FIELD GROUPS:
 * - Identity: id, name, slug
 * - Description: description, descriptionSecondary
 * - Location: address, latitude, longitude, locationId
 * - Classification: projectType, status
 * - Progress: completionPercentage, estimatedCompletionDate, actualCompletionDate
 * - Inventory: totalBlocks, totalUnits
 * - Pricing: priceMin, priceMax (auto-calculated from apartments)
 * - Media: mainPhotoUrl, photos (virtual), floorPlans (virtual)
 * - Publication: isFeatured, isPublished
 * - Timestamps: createdAt, updatedAt, deletedAt
 */
export interface Project {
  /** Primary key */
  id: number;
  
  /** Project name */
  name: string;
  
  /** URL-friendly slug (unique) */
  slug: string;
  
  /** Main project description */
  description: string | null;
  
  /** Secondary/additional description */
  descriptionSecondary: string | null;
  
  /** Full street address */
  address: string;
  
  /** GPS latitude (-90 to 90) */
  latitude: number | null;
  
  /** GPS longitude (-180 to 180) */
  longitude: number | null;
  
  /** Foreign key to locations table */
  locationId: number | null;
  
  /** Project type category */
  projectType: ProjectType;
  
  /** Current development status */
  status: ProjectStatus;
  
  /** Construction completion percentage (0-100) */
  completionPercentage: number;
  
  /** Estimated completion date */
  estimatedCompletionDate: Date | null;
  
  /** Actual completion date (when finished) */
  actualCompletionDate: Date | null;
  
  /** Number of building blocks */
  totalBlocks: number | null;
  
  /** Total number of units (apartments/lots) */
  totalUnits: number | null;
  
  /** Minimum apartment price (auto-calculated) */
  priceMin: number | null;
  
  /** Maximum apartment price (auto-calculated) */
  priceMax: number | null;
  
  /** Main hero/cover photo URL */
  mainPhotoUrl: string | null;
  
  /** Featured on homepage/listings */
  isFeatured: boolean;
  
  /** Visible on public website */
  isPublished: boolean;
  
  /** Record creation timestamp */
  createdAt: Date;
  
  /** Last modification timestamp */
  updatedAt: Date;
  
  /** Soft delete timestamp */
  deletedAt: Date | null;

  // Virtual relations
  /** Location details (loaded via relations) */
  location?: any;
  
  /** Project apartments (loaded via relations) */
  apartments?: any[];
  
  /** Project features/amenities (loaded separately) */
  features?: any[];
  
  /** Project photos (loaded via includePhotos) */
  photos?: Photo[];
  
  /** Project floor plans (loaded via includeFloorPlans) */
  floorPlans?: FloorPlan[];
}

/**
 * Create project DTO
 * 
 * REQUIRED FIELDS:
 * - name: Project name
 * - address: Physical address
 * 
 * RECOMMENDED FIELDS:
 * - description: For marketing and SEO
 * - mainPhotoUrl: For listings and previews
 * - projectType: For categorization
 * - status: To track development phase
 */
export interface CreateProjectDto {
  name: string;
  slug?: string;
  description?: string | null;
  descriptionSecondary?: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  locationId?: number | null;
  projectType?: ProjectType;
  status?: ProjectStatus;
  completionPercentage?: number;
  estimatedCompletionDate?: Date | null;
  actualCompletionDate?: Date | null;
  totalBlocks?: number | null;
  totalUnits?: number | null;
  mainPhotoUrl?: string | null;
  isFeatured?: boolean;
  isPublished?: boolean;
}

/**
 * Update project DTO
 * All fields optional for partial updates
 */
export interface UpdateProjectDto extends Partial<CreateProjectDto> {}

/**
 * Project query options
 * 
 * @description
 * Advanced filtering for project searches.
 * Supports multiple filter types, geo-queries, and media loading.
 */
export interface ProjectQueryOptions extends AdvancedQueryOptions {
  /** Filter by project type */
  projectType?: ProjectType | ProjectType[];
  
  /** Filter by status */
  status?: ProjectStatus | ProjectStatus[];
  
  /** Filter featured projects */
  isFeatured?: boolean;
  
  /** Filter published projects */
  isPublished?: boolean;
  
  /** Filter by location */
  locationId?: number | number[];
  
  /** Minimum price range */
  minPrice?: number;
  
  /** Maximum price range */
  maxPrice?: number;
  
  /** Minimum completion percentage */
  minCompletion?: number;
  
  /** Maximum completion percentage */
  maxCompletion?: number;
  
  /** Only projects with GPS coordinates */
  hasCoordinates?: boolean;
  
  /** Auto-load photos */
  includePhotos?: boolean;
  
  /** Auto-load floor plans */
  includeFloorPlans?: boolean;
}

/**
 * Project with complete statistics
 * 
 * @description
 * Extended project entity with calculated statistics.
 * Useful for dashboards and detailed views.
 */
export interface ProjectWithStats extends Project {
  stats: {
    totalApartments: number;
    availableApartments: number;
    reservedApartments: number;
    soldApartments: number;
    soldPercentage: number;
    photoCount: number;
    floorPlanCount: number;
    featuresCount: number;
  };
}

// ============================================================================
// PROJECT MODEL CLASS
// ============================================================================

export class ProjectModel extends BaseModel<
  Project,
  CreateProjectDto,
  UpdateProjectDto
> {
  protected tableName = "projects";
  protected primaryKey = "id";

  protected config = {
    softDelete: true,
    timestamps: true,
    defaultSortColumn: "created_at",
    defaultSortOrder: "desc" as const,
    searchableColumns: [
      "name",
      "description",
      "description_secondary",
      "address",
    ],
    hiddenFields: [],
    fillable: [
      "name",
      "slug",
      "description",
      "descriptionSecondary",
      "address",
      "latitude",
      "longitude",
      "locationId",
      "projectType",
      "status",
      "completionPercentage",
      "estimatedCompletionDate",
      "actualCompletionDate",
      "totalBlocks",
      "totalUnits",
      "priceMin",
      "priceMax",
      "mainPhotoUrl",
      "isFeatured",
      "isPublished"
    ],
    guarded: ["id", "createdAt", "updatedAt", "deletedAt"],
  };

  protected relations = {
    location: {
      type: "belongsTo" as const,
      model: () => require("./location.model").default,
      foreignKey: "locationId",
      localKey: "id",
    },
    apartments: {
      type: "hasMany" as const,
      model: () => require("./apartment.model").default,
      foreignKey: "projectId",
      localKey: "id",
    },
  };

  // ============================================================================
  // MEDIA LOADING METHODS
  // ============================================================================

  /**
   * Loads photos for a project
   * 
   * @param projectId - Project ID
   * @param trx - Optional transaction
   * @returns Promise<Photo[]>
   */
  async loadPhotos(projectId: number, trx?: Knex.Transaction): Promise<Photo[]> {
    return PhotoModel.getForEntity(PhotoableType.PROJECT, projectId, {}, trx);
  }

  /**
   * Loads floor plans for a project
   * 
   * @param projectId - Project ID
   * @param trx - Optional transaction
   * @returns Promise<FloorPlan[]>
   */
  async loadFloorPlans(projectId: number, trx?: Knex.Transaction): Promise<FloorPlan[]> {
    return FloorPlanModel.getForEntity(PlannableType.PROJECT, projectId, {}, trx);
  }

  /**
   * Loads both photos and floor plans (optimized)
   * 
   * @param projectId - Project ID
   * @param trx - Optional transaction
   * @returns Promise<object>
   */
  async loadMedia(
    projectId: number,
    trx?: Knex.Transaction
  ): Promise<{ photos: Photo[]; floorPlans: FloorPlan[] }> {
    const [photos, floorPlans] = await Promise.all([
      this.loadPhotos(projectId, trx),
      this.loadFloorPlans(projectId, trx),
    ]);

    return { photos, floorPlans };
  }

  /**
   * Loads photos for multiple projects (batch optimization)
   * 
   * @private
   */
  private async loadPhotosForMany(
    projectIds: number[],
    trx?: Knex.Transaction
  ): Promise<Map<number, Photo[]>> {
    if (projectIds.length === 0) return new Map();

    const photos = await PhotoModel.findPhotos(
      {
        polymorphicType: PhotoableType.PROJECT,
        polymorphicId: projectIds,
      },
      trx
    );

    const photosByProject = new Map<number, Photo[]>();
    for (const photo of photos) {
      if (!photosByProject.has(photo.photoableId)) {
        photosByProject.set(photo.photoableId, []);
      }
      photosByProject.get(photo.photoableId)!.push(photo);
    }

    return photosByProject;
  }

  /**
   * Loads floor plans for multiple projects (batch optimization)
   * 
   * @private
   */
  private async loadFloorPlansForMany(
    projectIds: number[],
    trx?: Knex.Transaction
  ): Promise<Map<number, FloorPlan[]>> {
    if (projectIds.length === 0) return new Map();

    const floorPlans = await FloorPlanModel.findFloorPlans(
      {
        polymorphicType: PlannableType.PROJECT,
        polymorphicId: projectIds,
      },
      trx
    );

    const plansByProject = new Map<number, FloorPlan[]>();
    for (const plan of floorPlans) {
      if (!plansByProject.has(plan.plannableId)) {
        plansByProject.set(plan.plannableId, []);
      }
      plansByProject.get(plan.plannableId)!.push(plan);
    }

    return plansByProject;
  }

  // ============================================================================
  // MEDIA UPLOAD METHODS
  // ============================================================================

  /**
   * Uploads main project photo from Multer file
   * 
   * @description
   * Uploads and sets the main hero/cover photo for the project.
   * This is the primary image shown in listings and previews.
   * 
   * @param projectId - Project ID
   * @param file - Multer file
   * @param trx - Optional transaction
   * @returns Promise<string> URL of uploaded photo
   */
  async uploadMainPhoto(
    projectId: number,
    file: any,
    trx?: Knex.Transaction
  ): Promise<string> {
    const result = await MediaService.uploadPhotoFromMulter(
      file,
      PhotoableType.PROJECT,
      projectId,
      { isCover: false }, // Main photo is stored in mainPhotoUrl field, not as cover
      { width: 1920, quality: 90, generateThumbnail: true },
      trx
    );

    if (!result.success || !result.uploadResult) {
      throw new Error("Failed to upload main photo");
    }

    // Update project with main photo URL
    await this.update(projectId, { mainPhotoUrl: result.uploadResult.url } as UpdateProjectDto, trx);

    return result.uploadResult.url;
  }

  /**
   * Uploads a single photo for project gallery
   * 
   * @param projectId - Project ID
   * @param file - Multer file
   * @param options - Upload options
   * @param trx - Optional transaction
   * @returns Promise<MediaCreationResult>
   */
  async uploadPhotoFromMulter(
    projectId: number,
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
      PhotoableType.PROJECT,
      projectId,
      options,
      { width: 1920, quality: 85, generateThumbnail: true },
      trx
    );
  }

  /**
   * Uploads multiple photos for project gallery
   * 
   * @param projectId - Project ID
   * @param files - Array of Multer files
   * @param trx - Optional transaction
   * @returns Promise<BatchMediaResult>
   */
  async uploadPhotosFromMulter(
    projectId: number,
    files: any[],
    trx?: Knex.Transaction
  ): Promise<BatchMediaResult> {
    return MediaService.uploadPhotosFromMulter(
      files,
      PhotoableType.PROJECT,
      projectId,
      { width: 1920, quality: 85, generateThumbnail: true },
      trx
    );
  }

  /**
   * Uploads floor plan from Multer files
   * 
   * @param projectId - Project ID
   * @param imageFile - Floor plan image file
   * @param pdfFile - Optional PDF file
   * @param options - Floor plan options
   * @param trx - Optional transaction
   * @returns Promise<MediaCreationResult>
   */
  async uploadFloorPlanFromMulter(
    projectId: number,
    imageFile: any,
    pdfFile: any | undefined,
    options: { name: string; displayOrder?: number },
    trx?: Knex.Transaction
  ): Promise<MediaCreationResult> {
    return MediaService.uploadFloorPlanFromMulter(
      imageFile,
      pdfFile,
      PlannableType.PROJECT,
      projectId,
      options,
      trx
    );
  }

  // ============================================================================
  // MEDIA MANAGEMENT
  // ============================================================================

  /**
   * Sets cover photo for project
   */
  async setCoverPhoto(
    projectId: number,
    photoId: number,
    trx?: Knex.Transaction
  ): Promise<Photo | null> {
    const photo = await PhotoModel.findById(photoId, {}, trx);
    if (!photo || photo.photoableId !== projectId) {
      throw new Error("Photo does not belong to this project");
    }

    return MediaService.setCoverPhoto(photoId, trx);
  }

  /**
   * Deletes a project photo
   */
  async deletePhoto(
    projectId: number,
    photoId: number,
    deleteFiles: boolean = true,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const photo = await PhotoModel.findById(photoId, {}, trx);
    if (!photo || photo.photoableId !== projectId) {
      throw new Error("Photo does not belong to this project");
    }

    return MediaService.deletePhoto(photoId, deleteFiles, trx);
  }

  /**
   * Deletes all media for a project
   */
  async deleteAllMedia(
    projectId: number,
    deleteFiles: boolean = true,
    trx?: Knex.Transaction
  ): Promise<{ photosDeleted: number; floorPlansDeleted?: number }> {
    return MediaService.deleteAllEntityMedia(
      PhotoableType.PROJECT,
      projectId,
      deleteFiles,
      trx
    );
  }

  /**
   * Reorders project photos
   */
  async reorderPhotos(
    projectId: number,
    photoIds: number[],
    trx?: Knex.Transaction
  ): Promise<boolean> {
    return MediaService.reorderPhotos(
      PhotoableType.PROJECT,
      projectId,
      photoIds,
      trx
    );
  }

  // ============================================================================
  // FEATURE MANAGEMENT
  // ============================================================================

  /**
   * Loads features for a single project
   * 
   * @description
   * Fetches all features (amenities) attached to this project
   * from the many-to-many project_features pivot table.
   * 
   * @param project - Project entity or ID
   * @returns Promise<any> Project with features array
   */
  async loadFeaturesForProject(project: any): Promise<any> {
    const features = await db("project_features as pf")
      .join("features as f", "pf.feature_id", "f.id")
      .where("pf.project_id", project.id)
      .select(
        "f.id",
        "f.name",
        "f.slug",
        "f.icon",
        "f.category",
        "f.display_order",
        "pf.feature_value",
        "pf.display_order as project_display_order"
      )
      .orderBy("pf.display_order", "asc");

    return {
      ...project,
      features: features.map((f) => ({
        id: f.id,
        name: f.name,
        slug: f.slug,
        icon: f.icon,
        category: f.category,
        displayOrder: f.display_order,
        projectValue: f.feature_value,
        projectDisplayOrder: f.project_display_order,
      })),
    };
  }

  /**
   * Loads features for multiple projects (batch optimization)
   * 
   * @param projects - Array of project entities
   * @returns Promise<any[]> Projects with features loaded
   */
  async loadFeaturesForProjects(projects: any[]): Promise<any[]> {
    if (projects.length === 0) return projects;

    const projectIds = projects.map((p) => p.id);

    const features = await db("project_features as pf")
      .join("features as f", "pf.feature_id", "f.id")
      .whereIn("pf.project_id", projectIds)
      .select(
        "pf.project_id",
        "f.id",
        "f.name",
        "f.slug",
        "f.icon",
        "f.category",
        "f.display_order",
        "pf.feature_value",
        "pf.display_order as project_display_order"
      )
      .orderBy("pf.display_order", "asc");

    const featuresByProject = new Map<number, any[]>();
    for (const feature of features) {
      if (!featuresByProject.has(feature.project_id)) {
        featuresByProject.set(feature.project_id, []);
      }
      featuresByProject.get(feature.project_id)!.push({
        id: feature.id,
        name: feature.name,
        slug: feature.slug,
        icon: feature.icon,
        category: feature.category,
        displayOrder: feature.display_order,
        projectValue: feature.feature_value,
        projectDisplayOrder: feature.project_display_order,
      });
    }

    return projects.map((project) => ({
      ...project,
      features: featuresByProject.get(project.id) || [],
    }));
  }

  // ============================================================================
  // APARTMENT MEDIA LOADING
  // ============================================================================

  /**
   * Loads photos and floor plans for apartments
   * 
   * @param apartments - Array of apartment entities
   * @returns Promise<any[]> Apartments with media loaded
   */
  async loadApartmentMedia(apartments: any[]): Promise<any[]> {
    if (!apartments || apartments.length === 0) return apartments;

    const apartmentIds = apartments.map((a) => a.id);

    const photos = await PhotoModel.findPhotos({
      polymorphicType: PhotoableType.APARTMENT,
      polymorphicId: apartmentIds,
    });

    const floorPlans = await FloorPlanModel.findFloorPlans({
      polymorphicType: PlannableType.APARTMENT,
      polymorphicId: apartmentIds,
    });

    const photosByApartment = new Map<number, any[]>();
    const plansByApartment = new Map<number, any[]>();

    for (const photo of photos) {
      if (!photosByApartment.has(photo.photoableId)) {
        photosByApartment.set(photo.photoableId, []);
      }
      photosByApartment.get(photo.photoableId)!.push(photo);
    }

    for (const plan of floorPlans) {
      if (!plansByApartment.has(plan.plannableId)) {
        plansByApartment.set(plan.plannableId, []);
      }
      plansByApartment.get(plan.plannableId)!.push(plan);
    }

    return apartments.map((apartment) => ({
      ...apartment,
      photos: photosByApartment.get(apartment.id) || [],
      floorPlans: plansByApartment.get(apartment.id) || [],
    }));
  }

  /**
   * Loads apartment media for multiple projects
   * 
   * @param projects - Array of projects with apartments loaded
   * @returns Promise<any[]> Projects with apartment media loaded
   */
  async loadApartmentMediaForProjects(projects: any[]): Promise<any[]> {
    if (!projects || projects.length === 0) return projects;

    const allApartments: any[] = [];
    const projectApartmentMap = new Map<number, any[]>();

    for (const project of projects) {
      if (project.apartments && Array.isArray(project.apartments)) {
        projectApartmentMap.set(project.id, project.apartments);
        allApartments.push(...project.apartments);
      }
    }

    if (allApartments.length === 0) return projects;

    const apartmentsWithMedia = await this.loadApartmentMedia(allApartments);

    const apartmentMediaMap = new Map(
      apartmentsWithMedia.map((apt) => [apt.id, apt])
    );

    return projects.map((project) => {
      if (projectApartmentMap.has(project.id)) {
        return {
          ...project,
          apartments: projectApartmentMap
            .get(project.id)!
            .map((apt) => apartmentMediaMap.get(apt.id) || apt),
        };
      }
      return project;
    });
  }

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Before create hook
   */
  protected async beforeCreate(data: CreateProjectDto): Promise<CreateProjectDto> {
    if (!data.slug && data.name) {
      data.slug = generateSlug(data.name);
    }

    if (data.latitude !== undefined || data.longitude !== undefined) {
      this.validateCoordinates(data.latitude, data.longitude);
    }

    if (data.completionPercentage !== undefined) {
      this.validateCompletionPercentage(data.completionPercentage);
    }

    if (data.isPublished) {
      if (!data.mainPhotoUrl || !data.description) {
        throw new Error(
          "Published projects must have mainPhotoUrl and description"
        );
      }
    }

    return data;
  }

  protected async afterCreate(entity: Project): Promise<void> {
    console.log(`✅ Project created: ${entity.name} (ID: ${entity.id})`);
  }

  protected async beforeUpdate(
    id: number,
    data: UpdateProjectDto
  ): Promise<UpdateProjectDto> {
    if (data.latitude !== undefined || data.longitude !== undefined) {
      this.validateCoordinates(data.latitude, data.longitude);
    }

    if (data.completionPercentage !== undefined) {
      this.validateCompletionPercentage(data.completionPercentage);
    }

    if (data.isPublished) {
      const existing = await this.findById(id);
      if (existing) {
        const mainPhotoUrl = data.mainPhotoUrl ?? existing.mainPhotoUrl;
        const description = data.description ?? existing.description;

        if (!mainPhotoUrl || !description) {
          throw new Error(
            "Published projects must have mainPhotoUrl and description"
          );
        }
      }
    }

    return data;
  }

  protected async beforeDelete(id: number): Promise<void> {
    const apartmentCount = await this.db("apartments")
      .where({ project_id: id })
      .whereNull("deleted_at")
      .count("* as count")
      .first();

    if (apartmentCount && Number(apartmentCount.count) > 0) {
      console.warn(
        `⚠️ Project ${id} has ${apartmentCount.count} apartments. They will be cascade deleted.`
      );
    }
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Finds projects with advanced filtering
   */
  async findProjects(
    options: ProjectQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Project[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    query = this.applyProjectFilters(query, options);

    const records = await query;
    let entities = records.map((r: DatabaseRecord) => this.mapToEntity(r));

    if (options.relations && options.relations.length > 0) {
      entities = await this.loadRelationsForMany(
        entities,
        options.relations,
        trx
      );
    }

    if (options.includePhotos) {
      const projectIds = entities.map((e: DatabaseRecord) => e.id);
      const photosByProject = await this.loadPhotosForMany(projectIds, trx);

      entities = entities.map((entity: DatabaseRecord) => ({
        ...entity,
        photos: photosByProject.get(entity.id) || [],
      }));
    }

    if (options.includeFloorPlans) {
      const projectIds = entities.map((e: DatabaseRecord) => e.id);
      const plansByProject = await this.loadFloorPlansForMany(projectIds, trx);

      entities = entities.map((entity: DatabaseRecord) => ({
        ...entity,
        floorPlans: plansByProject.get(entity.id) || [],
      }));
    }

    return entities;
  }

  /**
   * Finds project by ID with optional media
   */
  async findByIdWithMedia(
    id: number,
    options: {
      includePhotos?: boolean;
      includeFloorPlans?: boolean;
      includeRelations?: string[];
    } = {},
    trx?: Knex.Transaction
  ): Promise<Project | null> {
    const project = await this.findById(
      id,
      { relations: options.includeRelations },
      trx
    );

    if (!project) return null;

    if (options.includePhotos || options.includeFloorPlans) {
      const media = await this.loadMedia(id, trx);

      return {
        ...project,
        ...(options.includePhotos && { photos: media.photos }),
        ...(options.includeFloorPlans && { floorPlans: media.floorPlans }),
      };
    }

    return project;
  }

  /**
   * Publishes a project
   */
  async publish(id: number, trx?: Knex.Transaction): Promise<Project | null> {
    return this.update(id, { isPublished: true } as UpdateProjectDto, trx);
  }

  /**
   * Unpublishes a project
   */
  async unpublish(id: number, trx?: Knex.Transaction): Promise<Project | null> {
    return this.update(id, { isPublished: false } as UpdateProjectDto, trx);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Applies project-specific filters to query
   */
  private applyProjectFilters(
    query: Knex.QueryBuilder,
    options: ProjectQueryOptions
  ): Knex.QueryBuilder {
    if (options.projectType) {
      if (Array.isArray(options.projectType)) {
        query = query.whereIn("project_type", options.projectType);
      } else {
        query = query.where("project_type", options.projectType);
      }
    }

    if (options.status) {
      if (Array.isArray(options.status)) {
        query = query.whereIn("status", options.status);
      } else {
        query = query.where("status", options.status);
      }
    }

    if (options.isFeatured !== undefined) {
      query = query.where("is_featured", options.isFeatured);
    }

    if (options.isPublished !== undefined) {
      query = query.where("is_published", options.isPublished);
    }

    if (options.locationId) {
      if (Array.isArray(options.locationId)) {
        query = query.whereIn("location_id", options.locationId);
      } else {
        query = query.where("location_id", options.locationId);
      }
    }

    if (options.minPrice !== undefined) {
      query = query.where("price_min", ">=", options.minPrice);
    }
    if (options.maxPrice !== undefined) {
      query = query.where("price_max", "<=", options.maxPrice);
    }

    if (options.minCompletion !== undefined) {
      query = query.where("completion_percentage", ">=", options.minCompletion);
    }
    if (options.maxCompletion !== undefined) {
      query = query.where("completion_percentage", "<=", options.maxCompletion);
    }

    if (options.hasCoordinates) {
      query = query.whereNotNull("latitude").whereNotNull("longitude");
    }

    return query;
  }

  /**
   * Validates GPS coordinates
   */
  private validateCoordinates(
    latitude?: number | null,
    longitude?: number | null
  ): void {
    if (latitude !== null && latitude !== undefined) {
      if (latitude < -90 || latitude > 90) {
        throw new Error("Latitude must be between -90 and 90");
      }
    }

    if (longitude !== null && longitude !== undefined) {
      if (longitude < -180 || longitude > 180) {
        throw new Error("Longitude must be between -180 and 180");
      }
    }
  }

  /**
   * Validates completion percentage
   */
  private validateCompletionPercentage(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new Error("Completion percentage must be between 0 and 100");
    }
  }

  /**
   * Maps database record to Project entity
   */
  protected mapToEntity(record: DatabaseRecord): Project {
    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      description: record.description,
      descriptionSecondary: record.description_secondary,
      address: record.address,
      latitude: record.latitude ? Number(record.latitude) : null,
      longitude: record.longitude ? Number(record.longitude) : null,
      locationId: record.location_id,
      projectType: record.project_type as ProjectType,
      status: record.status as ProjectStatus,
      completionPercentage: record.completion_percentage || 0,
      estimatedCompletionDate: record.estimated_completion_date
        ? new Date(record.estimated_completion_date)
        : null,
      actualCompletionDate: record.actual_completion_date
        ? new Date(record.actual_completion_date)
        : null,
      totalBlocks: record.total_blocks,
      totalUnits: record.total_units,
      priceMin: record.price_min ? Number(record.price_min) : null,
      priceMax: record.price_max ? Number(record.price_max) : null,
      mainPhotoUrl: record.main_photo_url,
      isFeatured: Boolean(record.is_featured),
      isPublished: Boolean(record.is_published),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

/**
 * Export singleton instance
 */
export default new ProjectModel();