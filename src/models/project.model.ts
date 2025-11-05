/**
 * Project Model - WITH MEDIA SUPPORT & UTILITY FUNCTIONS
 * 
 * Manages real estate development projects with integrated photo and floor plan support
 * 
 * @module models/project.model
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
import db from "@/config/database";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * @openapi
 * components:
 *   schemas:
 *     
 *     ProjectType:
 *       type: string
 *       enum:
 *         - residential
 *         - commercial
 *         - mixed_use
 *         - luxury
 *         - affordable
 *       description: Type of real estate project
 *       example: residential
 *     
 *     ProjectStatus:
 *       type: string
 *       enum:
 *         - planning
 *         - under_construction
 *         - completed
 *         - sold_out
 *       description: Current status of the project
 *       example: under_construction
 *     
 *     Project:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - slug
 *         - address
 *         - projectType
 *         - status
 *         - completionPercentage
 *         - isFeatured
 *         - isPublished
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the project
 *           example: 1
 *         name:
 *           type: string
 *           description: Project name
 *           example: "Sunrise Residential Complex"
 *         slug:
 *           type: string
 *           description: URL-friendly slug
 *           example: "sunrise-residential-complex"
 *         description:
 *           type: string
 *           nullable: true
 *           description: Primary project description
 *           example: "Luxury residential complex with modern amenities"
 *         descriptionSecondary:
 *           type: string
 *           nullable: true
 *           description: Secondary project description
 *           example: "Located in the heart of downtown with easy access to transportation"
 *         address:
 *           type: string
 *           description: Project physical address
 *           example: "123 Main Street, Downtown District"
 *         latitude:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Geographic latitude coordinate
 *           minimum: -90
 *           maximum: 90
 *           example: 40.7128
 *         longitude:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Geographic longitude coordinate
 *           minimum: -180
 *           maximum: 180
 *           example: -74.0060
 *         locationId:
 *           type: integer
 *           nullable: true
 *           description: Associated location identifier
 *           example: 5
 *         projectType:
 *           $ref: '#/components/schemas/ProjectType'
 *         status:
 *           $ref: '#/components/schemas/ProjectStatus'
 *         completionPercentage:
 *           type: integer
 *           description: Project completion percentage (0-100)
 *           minimum: 0
 *           maximum: 100
 *           example: 75
 *         estimatedCompletionDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Estimated project completion date
 *           example: "2025-06-30T00:00:00Z"
 *         actualCompletionDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Actual project completion date
 *           example: "2024-12-15T00:00:00Z"
 *         totalBlocks:
 *           type: integer
 *           nullable: true
 *           description: Total number of building blocks
 *           example: 3
 *         totalUnits:
 *           type: integer
 *           nullable: true
 *           description: Total number of residential units
 *           example: 150
 *         priceMin:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Minimum unit price in USD
 *           example: 250000.00
 *         priceMax:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Maximum unit price in USD
 *           example: 750000.00
 *         mainPhotoUrl:
 *           type: string
 *           nullable: true
 *           description: URL of the main project photo
 *           example: "https://cdn.example.com/projects/main/sunset-view.jpg"
 *         isFeatured:
 *           type: boolean
 *           description: Whether the project is featured on the homepage
 *           example: true
 *         isPublished:
 *           type: boolean
 *           description: Whether the project is published and visible to public
 *           example: true
 *         metaTitle:
 *           type: string
 *           nullable: true
 *           description: SEO meta title
 *           example: "Sunrise Residential Complex - Luxury Living in Downtown"
 *         metaDescription:
 *           type: string
 *           nullable: true
 *           description: SEO meta description
 *           example: "Discover luxury living at Sunrise Residential Complex with modern amenities..."
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2024-03-20T14:45:00Z"
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Soft delete timestamp
 *           example: null
 *         location:
 *           type: object
 *           description: Virtual relation - associated location data
 *         apartments:
 *           type: array
 *           description: Virtual relation - associated apartments
 *           items:
 *             type: object
 *         features:
 *           type: array
 *           description: Virtual relation - associated features
 *           items:
 *             type: object
 *         media:
 *           type: array
 *           description: Virtual relation - associated media
 *           items:
 *             type: object
 *         photos:
 *           type: array
 *           description: Polymorphic photos associated with this project
 *           items:
 *             $ref: '#/components/schemas/Photo'
 *         floorPlans:
 *           type: array
 *           description: Polymorphic floor plans associated with this project
 *           items:
 *             $ref: '#/components/schemas/FloorPlan'
 *     
 *     CreateProjectDto:
 *       type: object
 *       required:
 *         - name
 *         - address
 *       properties:
 *         name:
 *           type: string
 *           description: Project name
 *           example: "Sunrise Residential Complex"
 *         slug:
 *           type: string
 *           description: URL-friendly slug (auto-generated if not provided)
 *           example: "sunrise-residential-complex"
 *         description:
 *           type: string
 *           nullable: true
 *           description: Primary project description
 *           example: "Luxury residential complex with modern amenities"
 *         descriptionSecondary:
 *           type: string
 *           nullable: true
 *           description: Secondary project description
 *           example: "Located in the heart of downtown with easy access to transportation"
 *         address:
 *           type: string
 *           description: Project physical address
 *           example: "123 Main Street, Downtown District"
 *         latitude:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Geographic latitude coordinate
 *           minimum: -90
 *           maximum: 90
 *           example: 40.7128
 *         longitude:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Geographic longitude coordinate
 *           minimum: -180
 *           maximum: 180
 *           example: -74.0060
 *         locationId:
 *           type: integer
 *           nullable: true
 *           description: Associated location identifier
 *           example: 5
 *         projectType:
 *           $ref: '#/components/schemas/ProjectType'
 *         status:
 *           $ref: '#/components/schemas/ProjectStatus'
 *         completionPercentage:
 *           type: integer
 *           description: Project completion percentage (0-100)
 *           minimum: 0
 *           maximum: 100
 *           example: 75
 *         estimatedCompletionDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Estimated project completion date
 *           example: "2025-06-30T00:00:00Z"
 *         actualCompletionDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Actual project completion date
 *           example: "2024-12-15T00:00:00Z"
 *         totalBlocks:
 *           type: integer
 *           nullable: true
 *           description: Total number of building blocks
 *           example: 3
 *         totalUnits:
 *           type: integer
 *           nullable: true
 *           description: Total number of residential units
 *           example: 150
 *         priceMin:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Minimum unit price in USD
 *           example: 250000.00
 *         priceMax:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Maximum unit price in USD
 *           example: 750000.00
 *         mainPhotoUrl:
 *           type: string
 *           nullable: true
 *           description: URL of the main project photo
 *           example: "https://cdn.example.com/projects/main/sunset-view.jpg"
 *         isFeatured:
 *           type: boolean
 *           description: Whether the project is featured on the homepage
 *           example: true
 *         isPublished:
 *           type: boolean
 *           description: Whether the project is published and visible to public
 *           example: true
 *         metaTitle:
 *           type: string
 *           nullable: true
 *           description: SEO meta title
 *           example: "Sunrise Residential Complex - Luxury Living in Downtown"
 *         metaDescription:
 *           type: string
 *           nullable: true
 *           description: SEO meta description
 *           example: "Discover luxury living at Sunrise Residential Complex with modern amenities..."
 *     
 *     UpdateProjectDto:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateProjectDto'
 *         - type: object
 *           properties:
 *             id:
 *               type: integer
 *               description: Project ID (for update operations)
 *               example: 1
 *     
 *     ProjectQueryOptions:
 *       allOf:
 *         - $ref: '#/components/schemas/AdvancedQueryOptions'
 *         - type: object
 *           properties:
 *             projectType:
 *               $ref: '#/components/schemas/ProjectType'
 *             status:
 *               $ref: '#/components/schemas/ProjectStatus'
 *             isFeatured:
 *               type: boolean
 *               description: Filter by featured status
 *               example: true
 *             isPublished:
 *               type: boolean
 *               description: Filter by published status
 *               example: true
 *             locationId:
 *               type: integer
 *               description: Filter by location ID
 *               example: 5
 *             minPrice:
 *               type: number
 *               format: float
 *               description: Minimum price filter
 *               example: 200000
 *             maxPrice:
 *               type: number
 *               format: float
 *               description: Maximum price filter
 *               example: 1000000
 *             minCompletion:
 *               type: integer
 *               description: Minimum completion percentage filter
 *               example: 50
 *             maxCompletion:
 *               type: integer
 *               description: Maximum completion percentage filter
 *               example: 100
 *             hasCoordinates:
 *               type: boolean
 *               description: Filter projects with valid geographic coordinates
 *               example: true
 *             includePhotos:
 *               type: boolean
 *               description: Include polymorphic photos in results
 *               example: true
 *             includeFloorPlans:
 *               type: boolean
 *               description: Include polymorphic floor plans in results
 *               example: true
 *     
 *     ProjectStats:
 *       type: object
 *       properties:
 *         totalApartments:
 *           type: integer
 *           description: Total number of apartments in the project
 *           example: 150
 *         availableApartments:
 *           type: integer
 *           description: Number of available apartments
 *           example: 45
 *         reservedApartments:
 *           type: integer
 *           description: Number of reserved apartments
 *           example: 30
 *         soldApartments:
 *           type: integer
 *           description: Number of sold apartments
 *           example: 75
 *         soldPercentage:
 *           type: number
 *           format: float
 *           description: Percentage of units sold
 *           example: 50.0
 *         mediaCount:
 *           type: integer
 *           description: Total count of media items
 *           example: 25
 *         featuresCount:
 *           type: integer
 *           description: Number of features associated with the project
 *           example: 15
 *         photoCount:
 *           type: integer
 *           description: Number of photos associated with the project
 *           example: 18
 *         floorPlanCount:
 *           type: integer
 *           description: Number of floor plans associated with the project
 *           example: 7
 *     
 *     ProjectWithStats:
 *       allOf:
 *         - $ref: '#/components/schemas/Project'
 *         - type: object
 *           required:
 *             - stats
 *           properties:
 *             stats:
 *               $ref: '#/components/schemas/ProjectStats'
 *     
 *     ProjectMediaResult:
 *       type: object
 *       properties:
 *         photos:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Photo'
 *           description: Array of photos associated with the project
 *         floorPlans:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FloorPlan'
 *           description: Array of floor plans associated with the project
 *     
 *     ProjectFeature:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Feature ID
 *           example: 1
 *         name:
 *           type: string
 *           description: Feature name
 *           example: "Swimming Pool"
 *         slug:
 *           type: string
 *           description: URL-friendly feature slug
 *           example: "swimming-pool"
 *         icon:
 *           type: string
 *           nullable: true
 *           description: Feature icon identifier
 *           example: "pool"
 *         translations:
 *           type: object
 *           nullable: true
 *           description: Feature translations object
 *           example: {"en": "Swimming Pool", "es": "Piscina"}
 *         category:
 *           type: string
 *           description: Feature category
 *           example: "recreation"
 *         displayOrder:
 *           type: integer
 *           description: Display order for the feature
 *           example: 1
 *         projectValue:
 *           type: string
 *           nullable: true
 *           description: Project-specific feature value
 *           example: "Olympic Size"
 *         projectDisplayOrder:
 *           type: integer
 *           description: Project-specific display order
 *           example: 2
 */

export enum ProjectType {
  RESIDENTIAL = "residential",
  COMMERCIAL = "commercial",
  MIXED_USE = "mixed_use",
  LUXURY = "luxury",
  AFFORDABLE = "affordable",
}

export enum ProjectStatus {
  PLANNING = "planning",
  UNDER_CONSTRUCTION = "under_construction",
  COMPLETED = "completed",
  SOLD_OUT = "sold_out",
}

/**
 * @openapi
 * Project entity interface WITH MEDIA
 */
export interface Project {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  descriptionSecondary: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  locationId: number | null;
  projectType: ProjectType;
  status: ProjectStatus;
  completionPercentage: number;
  estimatedCompletionDate: Date | null;
  actualCompletionDate: Date | null;
  totalBlocks: number | null;
  totalUnits: number | null;
  priceMin: number | null;
  priceMax: number | null;
  mainPhotoUrl: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Virtual relations
  location?: any;
  apartments?: any[];
  features?: any[];
  media?: any[];

  // NEW: Polymorphic media
  photos?: Photo[];
  floorPlans?: FloorPlan[];
}

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
  priceMin?: number | null;
  priceMax?: number | null;
  mainPhotoUrl?: string | null;
  isFeatured?: boolean;
  isPublished?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> {}

export interface ProjectQueryOptions extends AdvancedQueryOptions {
  projectType?: ProjectType | ProjectType[];
  status?: ProjectStatus | ProjectStatus[];
  isFeatured?: boolean;
  isPublished?: boolean;
  locationId?: number | number[];
  minPrice?: number;
  maxPrice?: number;
  minCompletion?: number;
  maxCompletion?: number;
  hasCoordinates?: boolean;
  // NEW: Media options
  includePhotos?: boolean;
  includeFloorPlans?: boolean;
}

export interface ProjectWithStats extends Project {
  stats: {
    totalApartments: number;
    availableApartments: number;
    reservedApartments: number;
    soldApartments: number;
    soldPercentage: number;
    mediaCount: number;
    featuresCount: number;
    // NEW: Polymorphic media counts
    photoCount: number;
    floorPlanCount: number;
  };
}

// ============================================================================
// PROJECT MODEL CLASS
// ============================================================================

/**
 * @openapi
 * Project Model Class
 * 
 * Manages real estate development projects with comprehensive pricing,
 * media management, availability tracking, and detailed analytics
 * 
 * @class ProjectModel
 * @extends BaseModel<Project, CreateProjectDto, UpdateProjectDto>
 */
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
      "isPublished",
      "metaTitle",
      "metaDescription",
    ],
    guarded: ["id", "createdAt", "updatedAt", "deletedAt"],
  };

  // Define relations
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
  // LIFECYCLE HOOKS
  // ============================================================================

  /**
   * @openapi
   * beforeCreate lifecycle hook
   * 
   * Validates and processes project data before creation:
   * - Auto-generates slug if not provided
   * - Validates geographic coordinates
   * - Validates completion percentage
   * - Ensures published projects have required fields
   * 
   * @param {CreateProjectDto} data - Project creation data
   * @returns {Promise<CreateProjectDto>} Processed data
   * @throws {Error} If validation fails
   */
  protected async beforeCreate(
    data: CreateProjectDto
  ): Promise<CreateProjectDto> {
    // Generate slug if not provided
    if (!data.slug && data.name) {
      data.slug = generateSlug(data.name);
    }

    // Validate coordinates
    if (data.latitude !== undefined || data.longitude !== undefined) {
      this.validateCoordinates(data.latitude, data.longitude);
    }

    // Validate completion percentage
    if (data.completionPercentage !== undefined) {
      this.validateCompletionPercentage(data.completionPercentage);
    }

    // Ensure published projects have required fields
    if (data.isPublished) {
      if (!data.mainPhotoUrl || !data.description) {
        throw new Error(
          "Published projects must have mainPhotoUrl and description"
        );
      }
    }

    return data;
  }

  /**
   * @openapi
   * afterCreate lifecycle hook
   * 
   * Logs project creation event
   * 
   * @param {Project} entity - Created project entity
   * @returns {Promise<void>}
   */
  protected async afterCreate(entity: Project): Promise<void> {
    console.log(`✅ Project created: ${entity.name} (ID: ${entity.id})`);
  }

  /**
   * @openapi
   * beforeUpdate lifecycle hook
   * 
   * Validates and processes project data before update:
   * - Validates geographic coordinates if being updated
   * - Validates completion percentage
   * - Ensures published projects have required fields
   * 
   * @param {number} id - Project ID
   * @param {UpdateProjectDto} data - Project update data
   * @returns {Promise<UpdateProjectDto>} Processed data
   * @throws {Error} If validation fails
   */
  protected async beforeUpdate(
    id: number,
    data: UpdateProjectDto
  ): Promise<UpdateProjectDto> {
    // Validate coordinates if being updated
    if (data.latitude !== undefined || data.longitude !== undefined) {
      this.validateCoordinates(data.latitude, data.longitude);
    }

    // Validate completion percentage
    if (data.completionPercentage !== undefined) {
      this.validateCompletionPercentage(data.completionPercentage);
    }

    // If publishing, check required fields
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

  /**
   * @openapi
   * beforeDelete lifecycle hook
   * 
   * Checks if project has associated apartments before deletion
   * 
   * @param {number} id - Project ID to delete
   * @returns {Promise<void>}
   */
  protected async beforeDelete(id: number): Promise<void> {
    // Check if project has apartments
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
  // MEDIA LOADING METHODS
  // ============================================================================

  /**
   * @openapi
   * Loads photos for a project
   * 
   * @param {number} projectId - Project identifier
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Photo[]>} Array of photos
   */
  async loadPhotos(
    projectId: number,
    trx?: Knex.Transaction
  ): Promise<Photo[]> {
    return PhotoModel.getForEntity(PhotoableType.PROJECT, projectId, {}, trx);
  }

  /**
   * @openapi
   * Loads floor plans for a project
   * 
   * @param {number} projectId - Project identifier
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<FloorPlan[]>} Array of floor plans
   */
  async loadFloorPlans(
    projectId: number,
    trx?: Knex.Transaction
  ): Promise<FloorPlan[]> {
    return FloorPlanModel.getForEntity(
      PlannableType.PROJECT,
      projectId,
      {},
      trx
    );
  }

  /**
   * @openapi
   * Loads both photos and floor plans for a project
   * 
   * @param {number} projectId - Project identifier
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<{ photos: Photo[]; floorPlans: FloorPlan[] }>} Media objects
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
   * @openapi
   * Loads photos for multiple projects (optimized)
   * 
   * @param {number[]} projectIds - Array of project identifiers
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Map<number, Photo[]>>} Map of project ID to photos
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
   * @openapi
   * Loads floor plans for multiple projects (optimized)
   * 
   * @param {number[]} projectIds - Array of project identifiers
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Map<number, FloorPlan[]>>} Map of project ID to floor plans
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
  // FEATURE LOADING METHODS (MOVED FROM CONTROLLER)
  // ============================================================================

  /**
   * @openapi
   * Load features for a single project
   * 
   * @param {any} project - Project object
   * @returns {Promise<any>} Project with features attached
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
        "f.translations",
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
        translations: f.translations,
        category: f.category,
        displayOrder: f.display_order,
        projectValue: f.feature_value,
        projectDisplayOrder: f.project_display_order,
      })),
    };
  }

  /**
   * @openapi
   * Load features for multiple projects (optimized)
   * 
   * @param {any[]} projects - Array of project objects
   * @returns {Promise<any[]>} Projects with features attached
   */
  async loadFeaturesForProjects(projects: any[]): Promise<any[]> {
    if (projects.length === 0) return projects;

    const projectIds = projects.map((p) => p.id);

    // Fetch all features for all projects in one query
    const features = await db("project_features as pf")
      .join("features as f", "pf.feature_id", "f.id")
      .whereIn("pf.project_id", projectIds)
      .select(
        "pf.project_id",
        "f.id",
        "f.name",
        "f.slug",
        "f.icon",
        "f.translations",
        "f.category",
        "f.display_order",
        "pf.feature_value",
        "pf.display_order as project_display_order"
      )
      .orderBy("pf.display_order", "asc");

    // Group features by project
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
        translations: feature.translations
          ? JSON.parse(feature.translations)
          : null,
        category: feature.category,
        displayOrder: feature.display_order,
        projectValue: feature.feature_value,
        projectDisplayOrder: feature.project_display_order,
      });
    }

    // Attach features to projects
    return projects.map((project) => ({
      ...project,
      features: featuresByProject.get(project.id) || [],
    }));
  }

  // ============================================================================
  // APARTMENT MEDIA LOADING METHODS (MOVED FROM CONTROLLER)
  // ============================================================================

  /**
   * @openapi
   * Load photos and floor plans for apartments
   * 
   * @param {any[]} apartments - Array of apartment objects
   * @returns {Promise<any[]>} Apartments with media attached
   */
  async loadApartmentMedia(apartments: any[]): Promise<any[]> {
    if (!apartments || apartments.length === 0) return apartments;

    const apartmentIds = apartments.map((a) => a.id);

    // Load photos for all apartments
    const photos = await PhotoModel.findPhotos({
      polymorphicType: PhotoableType.APARTMENT,
      polymorphicId: apartmentIds,
    });

    // Load floor plans for all apartments
    const floorPlans = await FloorPlanModel.findFloorPlans({
      polymorphicType: PlannableType.APARTMENT,
      polymorphicId: apartmentIds,
    });

    // Group by apartment
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

    // Attach to apartments
    return apartments.map((apartment) => ({
      ...apartment,
      photos: photosByApartment.get(apartment.id) || [],
      floorPlans: plansByApartment.get(apartment.id) || [],
    }));
  }

  /**
   * @openapi
   * Load apartment media for multiple projects (optimized)
   * 
   * @param {any[]} projects - Array of project objects
   * @returns {Promise<any[]>} Projects with apartment media attached
   */
  async loadApartmentMediaForProjects(projects: any[]): Promise<any[]> {
    if (!projects || projects.length === 0) return projects;

    // Extract all apartments from all projects
    const allApartments: any[] = [];
    const projectApartmentMap = new Map<number, any[]>();

    for (const project of projects) {
      if (project.apartments && Array.isArray(project.apartments)) {
        projectApartmentMap.set(project.id, project.apartments);
        allApartments.push(...project.apartments);
      }
    }

    if (allApartments.length === 0) return projects;

    // Load media for all apartments at once
    const apartmentsWithMedia = await this.loadApartmentMedia(allApartments);

    // Create a map for quick lookup
    const apartmentMediaMap = new Map(
      apartmentsWithMedia.map((apt) => [apt.id, apt])
    );

    // Attach updated apartments back to projects
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
  // PUBLISHING METHODS
  // ============================================================================

  /**
   * @openapi
   * Publishes a project
   * 
   * @param {number} id - Project ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Project | null>} Updated project or null
   */
  async publish(id: number, trx?: Knex.Transaction): Promise<Project | null> {
    return this.update(id, { isPublished: true } as UpdateProjectDto, trx);
  }

  /**
   * @openapi
   * Unpublishes a project
   * 
   * @param {number} id - Project ID
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Project | null>} Updated project or null
   */
  async unpublish(id: number, trx?: Knex.Transaction): Promise<Project | null> {
    return this.update(id, { isPublished: false } as UpdateProjectDto, trx);
  }

  // ============================================================================
  // ENHANCED QUERY METHODS WITH MEDIA LOADING
  // ============================================================================

  /**
   * @openapi
   * Finds projects with custom filters and optional media loading
   * 
   * @param {ProjectQueryOptions} [options={}] - Query options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Project[]>} Array of projects
   */
  async findProjects(
    options: ProjectQueryOptions = {},
    trx?: Knex.Transaction
  ): Promise<Project[]> {
    const connection = trx || this.db;
    let query = this.buildQuery(connection, options);

    // Apply project-specific filters
    query = this.applyProjectFilters(query, options);

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
      const projectIds = entities.map((e: DatabaseRecord) => e.id);
      const photosByProject = await this.loadPhotosForMany(projectIds, trx);

      entities = entities.map((entity: DatabaseRecord) => ({
        ...entity,
        photos: photosByProject.get(entity.id) || [],
      }));
    }

    // Load floor plans if requested
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
   * @openapi
   * Finds project by ID with optional media
   * 
   * @param {number} id - Project ID
   * @param {object} [options={}] - Media loading options
   * @param {Knex.Transaction} [trx] - Optional transaction
   * @returns {Promise<Project | null>} Project with media or null
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

    // Load media if requested
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

  // ============================================================================
  // MAPPING & FILTERING
  // ============================================================================

  /**
   * @openapi
   * Maps database record to Project entity
   * 
   * @param {DatabaseRecord} record - Database record
   * @returns {Project} Project entity
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
      metaTitle: record.meta_title,
      metaDescription: record.meta_description,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }

  /**
   * @openapi
   * Applies project-specific filters to query
   * 
   * @param {Knex.QueryBuilder} query - Database query builder
   * @param {ProjectQueryOptions} options - Query options
   * @returns {Knex.QueryBuilder} Modified query builder
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

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  /**
   * @openapi
   * Validates geographic coordinates
   * 
   * @param {number | null | undefined} latitude - Latitude value
   * @param {number | null | undefined} longitude - Longitude value
   * @throws {Error} If coordinates are invalid
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
   * @openapi
   * Validates completion percentage
   * 
   * @param {number} percentage - Completion percentage
   * @throws {Error} If percentage is invalid
   */
  private validateCompletionPercentage(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new Error("Completion percentage must be between 0 and 100");
    }
  }
}

// Export singleton instance
export default new ProjectModel();