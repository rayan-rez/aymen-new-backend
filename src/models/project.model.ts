/**
 * Project Model
 * Represents real estate development projects
 * Manages large-scale property developments with multiple units
 *
 * @module models/project.model
 */

import { BaseModel, BaseQueryParams } from "./base.model";

/**
 * Project status enumeration
 * Defines the current state of the project
 */
export enum ProjectStatus {
  PLANNING = "planning",
  UNDER_CONSTRUCTION = "under_construction",
  COMPLETED = "completed",
  SOLD_OUT = "sold_out",
}

/**
 * Project entity interface
 * Represents a real estate development project
 */
export interface Project {
  /** Unique identifier */
  id: number;

  /** Project name */
  name: string;

  /** URL-friendly slug */
  slug: string;

  /** Main project description */
  description: string | null;

  /** Secondary description */
  descriptionSecondary: string | null;

  /** Physical address */
  address: string;

  /** Google Maps embed code */
  mapEmbedCode: string | null;

  /** Latitude coordinate */
  latitude: number | null;

  /** Longitude coordinate */
  longitude: number | null;

  /** Primary location ID */
  locationId: number | null;

  /** Project status */
  status: ProjectStatus;

  /** Completion percentage (0-100) */
  completionPercentage: number;

  /** Total number of blocks/buildings */
  totalBlocks: number | null;

  /** Main project photo URL */
  mainPhotoUrl: string | null;

  /** Contact form script/embed code */
  contactFormScript: string | null;

  /** Whether the project is featured */
  isFeatured: boolean;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** Soft delete timestamp */
  deletedAt: Date | null;
}

/**
 * Create project DTO (Data Transfer Object)
 * Used for creating new projects
 */
export interface CreateProjectDto {
  name: string;
  slug: string;
  description?: string | null;
  descriptionSecondary?: string | null;
  address: string;
  mapEmbedCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationId?: number | null;
  status?: ProjectStatus;
  completionPercentage?: number;
  totalBlocks?: number | null;
  mainPhotoUrl?: string | null;
  contactFormScript?: string | null;
  isFeatured?: boolean;
}

/**
 * Update project DTO
 * Used for updating existing projects
 */
export interface UpdateProjectDto {
  name?: string;
  slug?: string;
  description?: string | null;
  descriptionSecondary?: string | null;
  address?: string;
  mapEmbedCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationId?: number | null;
  status?: ProjectStatus;
  completionPercentage?: number;
  totalBlocks?: number | null;
  mainPhotoUrl?: string | null;
  contactFormScript?: string | null;
  isFeatured?: boolean;
}

/**
 * Project query parameters
 * Used for filtering and pagination
 */
export interface ProjectQueryParams extends BaseQueryParams {
  status?: ProjectStatus;
  locationId?: number;
  isFeatured?: boolean;
  includeDeleted?: boolean;
}

/**
 * Project with relations interface
 * Project with its related data (features, locations, photos)
 */
export interface ProjectWithRelations extends Project {
  features?: any[];
  locations?: any[];
  photos?: any[];
  virtualTours?: any[];
  floorPlans?: any[];
}

/**
 * Project Model class
 * Handles all database operations for projects
 * Extends BaseModel for common CRUD operations
 */
class ProjectModel extends BaseModel<
  Project,
  CreateProjectDto,
  UpdateProjectDto
> {
  /** Database table name */
  protected tableName = "projects";

  /**
   * Finds a project by slug
   *
   * @param slug - Project slug
   * @param includeDeleted - Whether to include soft-deleted projects
   * @returns Promise<Project | null> - Project or null if not found
   *
   * @example
   * const project = await ProjectModel.findBySlug("luxury-residence");
   */
  async findBySlug(
    slug: string,
    includeDeleted: boolean = false
  ): Promise<Project | null> {
    let query = this.db(this.tableName).where({ slug });

    if (!includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    const record = await query.first();
    return record ? this.mapToEntity(record) : null;
  }

  /**
   * Finds all projects matching the query parameters
   *
   * @param params - Query parameters
   * @returns Promise<Project[]> - Array of projects
   *
   * @example
   * const projects = await ProjectModel.findAll({
   *   status: ProjectStatus.UNDER_CONSTRUCTION,
   *   isFeatured: true
   * });
   */
  async findAll(params: ProjectQueryParams = {}): Promise<Project[]> {
    let query = this.db(this.tableName);

    // Exclude soft-deleted by default
    if (!params.includeDeleted) {
      query = query.whereNull("deleted_at");
    }

    // Apply filters
    if (params.status) {
      query = query.where({ status: params.status });
    }

    if (params.locationId !== undefined) {
      query = query.where({ location_id: params.locationId });
    }

    if (params.isFeatured !== undefined) {
      query = query.where({ is_featured: params.isFeatured });
    }

    // Apply sorting
    if (params.sortBy) {
      query = query.orderBy(params.sortBy, params.sortOrder || "asc");
    } else {
      query = query.orderBy("created_at", "desc");
    }

    // Apply pagination
    if (params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }

    const projects = await query;
    return projects.map(this.mapToEntity);
  }

  /**
   * Gets featured projects
   *
   * @param limit - Maximum number of projects to return
   * @returns Promise<Project[]> - Array of featured projects
   *
   * @example
   * const featured = await ProjectModel.getFeatured(5);
   */
  async getFeatured(limit: number = 10): Promise<Project[]> {
    const projects = await this.db(this.tableName)
      .where({ is_featured: true })
      .whereNull("deleted_at")
      .orderBy("created_at", "desc")
      .limit(limit);

    return projects.map(this.mapToEntity);
  }

  /**
   * Gets project with all its features
   *
   * @param projectId - Project ID
   * @returns Promise<ProjectWithRelations | null> - Project with features
   *
   * @example
   * const project = await ProjectModel.getWithFeatures(1);
   */
  async getWithFeatures(
    projectId: number
  ): Promise<ProjectWithRelations | null> {
    const project = await this.findById(projectId);
    if (!project) return null;

    const features = await this.db("project_features as pf")
      .join("features as f", "pf.feature_id", "f.id")
      .where("pf.project_id", projectId)
      .select("f.*");

    return {
      ...project,
      features,
    };
  }

  /**
   * Gets project with all its photos
   *
   * @param projectId - Project ID
   * @returns Promise<ProjectWithRelations | null> - Project with photos
   *
   * @example
   * const project = await ProjectModel.getWithPhotos(1);
   */
  async getWithPhotos(projectId: number): Promise<ProjectWithRelations | null> {
    const project = await this.findById(projectId);
    if (!project) return null;

    const photos = await this.db("project_photos")
      .where({ project_id: projectId })
      .orderBy("display_order", "asc");

    return {
      ...project,
      photos,
    };
  }

  /**
   * Gets complete project with all relations
   *
   * @param projectId - Project ID
   * @returns Promise<ProjectWithRelations | null> - Complete project data
   *
   * @example
   * const project = await ProjectModel.getComplete(1);
   */
  async getComplete(projectId: number): Promise<ProjectWithRelations | null> {
    const project = await this.findById(projectId);
    if (!project) return null;

    const [features, locations, photos, virtualTours, floorPlans] =
      await Promise.all([
        this.db("project_features as pf")
          .join("features as f", "pf.feature_id", "f.id")
          .where("pf.project_id", projectId)
          .select("f.*"),

        this.db("project_locations as pl")
          .join("locations as l", "pl.location_id", "l.id")
          .where("pl.project_id", projectId)
          .select("l.*"),

        this.db("project_photos")
          .where({ project_id: projectId })
          .orderBy("display_order", "asc"),

        this.db("virtual_tours").where({ project_id: projectId }),

        this.db("floor_plans")
          .where({ project_id: projectId })
          .orderBy("display_order", "asc"),
      ]);

    return {
      ...project,
      features,
      locations,
      photos,
      virtualTours,
      floorPlans,
    };
  }

  /**
   * Adds a feature to a project
   *
   * @param projectId - Project ID
   * @param featureId - Feature ID
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await ProjectModel.addFeature(1, 5);
   */
  async addFeature(projectId: number, featureId: number): Promise<boolean> {
    try {
      await this.db("project_features").insert({
        project_id: projectId,
        feature_id: featureId,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Removes a feature from a project
   *
   * @param projectId - Project ID
   * @param featureId - Feature ID
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await ProjectModel.removeFeature(1, 5);
   */
  async removeFeature(projectId: number, featureId: number): Promise<boolean> {
    const deleted = await this.db("project_features")
      .where({ project_id: projectId, feature_id: featureId })
      .del();
    return deleted > 0;
  }

  /**
   * Updates project completion percentage
   *
   * @param projectId - Project ID
   * @param percentage - Completion percentage (0-100)
   * @returns Promise<boolean> - Success status
   *
   * @example
   * await ProjectModel.updateCompletionPercentage(1, 75);
   */
  async updateCompletionPercentage(
    projectId: number,
    percentage: number
  ): Promise<boolean> {
    if (percentage < 0 || percentage > 100) {
      throw new Error("Completion percentage must be between 0 and 100");
    }

    const updated = await this.db(this.tableName)
      .where({ id: projectId })
      .update({ completion_percentage: percentage });

    return updated > 0;
  }

  /**
   * Maps database record to Project entity
   *
   * @param record - Database record
   * @returns Project entity
   *
   * @protected
   */
  protected mapToEntity(record: any): Project {
    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      description: record.description,
      descriptionSecondary: record.description_secondary,
      address: record.address,
      mapEmbedCode: record.map_embed_code,
      latitude: record.latitude ? parseFloat(record.latitude) : null,
      longitude: record.longitude ? parseFloat(record.longitude) : null,
      locationId: record.location_id,
      status: record.status as ProjectStatus,
      completionPercentage: record.completion_percentage,
      totalBlocks: record.total_blocks,
      mainPhotoUrl: record.main_photo_url,
      contactFormScript: record.contact_form_script,
      isFeatured: Boolean(record.is_featured),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : null,
    };
  }
}

// Export singleton instance
export default new ProjectModel();
