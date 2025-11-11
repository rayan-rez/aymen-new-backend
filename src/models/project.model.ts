/**
 * Project Model - FIXED TO MATCH DATABASE SCHEMA
 * 
 * Removed fields that don't exist in migration:
 * - metaTitle, metaDescription (commented out in migration)
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
 * Project entity interface - MATCHES DATABASE SCHEMA
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
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Virtual relations
  location?: any;
  apartments?: any[];
  features?: any[];
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
  mainPhotoUrl?: string | null;
  isFeatured?: boolean;
  isPublished?: boolean;
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

  // [Rest of methods remain the same - loadPhotos, loadFloorPlans, etc.]
  // Just remove any references to metaTitle, metaDescription

  async loadPhotos(projectId: number, trx?: Knex.Transaction): Promise<Photo[]> {
    return PhotoModel.getForEntity(PhotoableType.PROJECT, projectId, {}, trx);
  }

  async loadFloorPlans(projectId: number, trx?: Knex.Transaction): Promise<FloorPlan[]> {
    return FloorPlanModel.getForEntity(PlannableType.PROJECT, projectId, {}, trx);
  }

  /**
   * Loads both photos and floor plans for a project
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
   * Loads photos for multiple projects (optimized)
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
   * Loads floor plans for multiple projects (optimized)
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
   * Load features for a single project
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
   * Load features for multiple projects (optimized)
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
  // APARTMENT MEDIA LOADING METHODS (MOVED FROM CONTROLLER)
  // ============================================================================

  /**
   * Load photos and floor plans for apartments
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
   * Load apartment media for multiple projects (optimized)
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
  // PUBLISHING METHODS
  // ============================================================================

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

  // ============================================================================
  // MAPPING & FILTERING
  // ============================================================================

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

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

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

  private validateCompletionPercentage(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new Error("Completion percentage must be between 0 and 100");
    }
  }
}

export default new ProjectModel();