/**
 * Enhanced Project Controller - WITH POLYMORPHIC MEDIA SUPPORT
 * Handles all project-related HTTP requests with integrated photo and floor plan management
 *
 * @module controllers/project.controller
 */

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@/utils/response.util";
import ProjectModel, {
  ProjectType,
  ProjectStatus,
  ProjectQueryOptions,
} from "@models/project.model";
import PhotoModel, { PhotoableType } from "@models/photo.model";
import FloorPlanModel, { PlannableType } from "@models/floor-plan.model";
import { AppError } from "@/middlewares/error-handler.middleware";
import db from "@/config/database";

/**
 * Enhanced Project Controller Class
 */
export class ProjectController {
  // ============================================================================
  // CORE PROJECT OPERATIONS
  // ============================================================================

  /**
   * Get all projects with filtering and pagination
   * GET /api/projects
   */
  async getProjects(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        projectType,
        status,
        locationId,
        isFeatured,
        isPublished,
        minPrice,
        maxPrice,
        search,
        sortBy = "created_at",
        sortOrder = "desc",
        includePhotos,
        includeFloorPlans,
      } = req.query;

      const options: ProjectQueryOptions & { page: number; limit: number } = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
        includePhotos: includePhotos === "true",
        includeFloorPlans: includeFloorPlans === "true",
      };

      // Apply filters
      if (projectType) options.projectType = projectType as ProjectType;
      if (status) options.status = status as ProjectStatus;
      if (locationId) options.locationId = Number(locationId);
      if (isFeatured !== undefined) options.isFeatured = isFeatured === "true";
      if (isPublished !== undefined)
        options.isPublished = isPublished === "true";
      if (minPrice) options.minPrice = Number(minPrice);
      if (maxPrice) options.maxPrice = Number(maxPrice);
      if (search) options.search = search as string;

      const result = await ProjectModel.findProjects(options);

      ApiResponse.success(res, result, "Projects retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project by ID with full media
   * GET /api/projects/:id
   *
   * Query: { includePhotos?, includeFloorPlans?, includeApartments? }
   */
  async getProjectById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { includePhotos, includeFloorPlans, includeApartments } = req.query;

      const relations: string[] = ["location"];
      if (includeApartments === "true") relations.push("apartments");

      const project = await ProjectModel.findByIdWithMedia(Number(id), {
        includePhotos: includePhotos === "true",
        includeFloorPlans: includeFloorPlans === "true",
        includeRelations: relations,
      });

      if (!project) {
        throw new AppError("Project not found", 404);
      }

      ApiResponse.success(res, project, "Project retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project by slug with full media
   * GET /api/projects/slug/:slug
   */
  async getProjectBySlug(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { slug } = req.params;
      const { includePhotos, includeFloorPlans } = req.query;

      // Use ProjectQueryOptions instead of generic options
      const options: ProjectQueryOptions = {
        relations: ["location", "apartments"],
        includePhotos: includePhotos === "true",
        includeFloorPlans: includeFloorPlans === "true",
      };

      const project = await ProjectModel.findOne({ slug }, options);

      if (!project) {
        throw new AppError("Project not found", 404);
      }

      ApiResponse.success(res, project, "Project retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new project
   * POST /api/projects
   */
  async createProject(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const project = await ProjectModel.create(req.body);

      ApiResponse.created(res, project, "Project created successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update project
   * PUT /api/projects/:id
   */
  async updateProject(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const project = await ProjectModel.update(Number(id), req.body);

      if (!project) {
        throw new AppError("Project not found", 404);
      }

      ApiResponse.success(res, project, "Project updated successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete project
   * DELETE /api/projects/:id
   */
  async deleteProject(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await ProjectModel.delete(Number(id));

      if (!deleted) {
        throw new AppError("Project not found", 404);
      }

      ApiResponse.success(res, null, "Project deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // PHOTO MANAGEMENT
  // ============================================================================

  /**
   * Get project photos
   * GET /api/projects/:id/photos
   */
  async getProjectPhotos(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { isCover, hasCaption } = req.query;

      const options: any = {};
      if (isCover !== undefined) options.isCover = isCover === "true";
      if (hasCaption !== undefined) options.hasCaption = hasCaption === "true";

      const photos = await PhotoModel.getForEntity(
        PhotoableType.PROJECT,
        Number(id),
        options
      );

      ApiResponse.success(res, photos, "Project photos retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project cover photo
   * GET /api/projects/:id/photos/cover
   */
  async getProjectCoverPhoto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const photo = await PhotoModel.getCoverPhoto(
        PhotoableType.PROJECT,
        Number(id)
      );

      if (!photo) {
        throw new AppError("Cover photo not found", 404);
      }

      ApiResponse.success(res, photo, "Cover photo retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add photos to project
   * POST /api/projects/:id/photos
   *
   * Body: { photos: [{ url, externalUrl?, caption?, displayOrder?, isCover? }] }
   */
  async addProjectPhotos(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { photos } = req.body;

      if (!photos || !Array.isArray(photos) || photos.length === 0) {
        throw new AppError("Photos array is required", 400);
      }

      // Validate project exists
      const project = await ProjectModel.findById(Number(id));
      if (!project) {
        throw new AppError("Project not found", 404);
      }

      const trx = await db.transaction();

      try {
        const createdPhotos = await PhotoModel.createManyForEntity(
          PhotoableType.PROJECT,
          Number(id),
          photos,
          trx
        );

        await trx.commit();

        ApiResponse.created(
          res,
          createdPhotos,
          `${createdPhotos.length} photo(s) added successfully`
        );
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update project photo
   * PATCH /api/projects/:id/photos/:photoId
   */
  async updateProjectPhoto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { photoId } = req.params;

      const photo = await PhotoModel.update(Number(photoId), req.body);

      if (!photo) {
        throw new AppError("Photo not found", 404);
      }

      ApiResponse.success(res, photo, "Photo updated successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set project cover photo
   * PATCH /api/projects/:id/photos/:photoId/set-cover
   */
  async setProjectCoverPhoto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { photoId } = req.params;

      const photo = await PhotoModel.setCover(Number(photoId));

      if (!photo) {
        throw new AppError("Photo not found", 404);
      }

      ApiResponse.success(res, photo, "Cover photo set successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete project photo
   * DELETE /api/projects/:id/photos/:photoId
   */
  async deleteProjectPhoto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { photoId } = req.params;

      const deleted = await PhotoModel.delete(Number(photoId));

      if (!deleted) {
        throw new AppError("Photo not found", 404);
      }

      ApiResponse.success(res, null, "Photo deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reorder project photos
   * POST /api/projects/:id/photos/reorder
   *
   * Body: { photoIds: number[] }
   */
  async reorderProjectPhotos(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { photoIds } = req.body;

      if (!photoIds || !Array.isArray(photoIds)) {
        throw new AppError("photoIds array is required", 400);
      }

      await PhotoModel.reorder(PhotoableType.PROJECT, Number(id), photoIds);

      ApiResponse.success(res, null, "Photos reordered successfully");
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // FLOOR PLAN MANAGEMENT
  // ============================================================================

  /**
   * Get project floor plans
   * GET /api/projects/:id/floor-plans
   */
  async getProjectFloorPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { hasPdf } = req.query;

      const options: any = {};
      if (hasPdf !== undefined) options.hasPdf = hasPdf === "true";

      const floorPlans = await FloorPlanModel.getForEntity(
        PlannableType.PROJECT,
        Number(id),
        options
      );

      ApiResponse.success(
        res,
        floorPlans,
        "Project floor plans retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add floor plans to project
   * POST /api/projects/:id/floor-plans
   *
   * Body: { floorPlans: [{ name, imageUrl, pdfUrl?, displayOrder? }] }
   */
  async addProjectFloorPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { floorPlans } = req.body;

      if (
        !floorPlans ||
        !Array.isArray(floorPlans) ||
        floorPlans.length === 0
      ) {
        throw new AppError("floorPlans array is required", 400);
      }

      // Validate project exists
      const project = await ProjectModel.findById(Number(id));
      if (!project) {
        throw new AppError("Project not found", 404);
      }

      const trx = await db.transaction();

      try {
        const createdFloorPlans = await FloorPlanModel.createManyForEntity(
          PlannableType.PROJECT,
          Number(id),
          floorPlans,
          trx
        );

        await trx.commit();

        ApiResponse.created(
          res,
          createdFloorPlans,
          `${createdFloorPlans.length} floor plan(s) added successfully`
        );
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update project floor plan
   * PATCH /api/projects/:id/floor-plans/:floorPlanId
   */
  async updateProjectFloorPlan(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { floorPlanId } = req.params;

      const floorPlan = await FloorPlanModel.update(
        Number(floorPlanId),
        req.body
      );

      if (!floorPlan) {
        throw new AppError("Floor plan not found", 404);
      }

      ApiResponse.success(res, floorPlan, "Floor plan updated successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete project floor plan
   * DELETE /api/projects/:id/floor-plans/:floorPlanId
   */
  async deleteProjectFloorPlan(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { floorPlanId } = req.params;

      const deleted = await FloorPlanModel.delete(Number(floorPlanId));

      if (!deleted) {
        throw new AppError("Floor plan not found", 404);
      }

      ApiResponse.success(res, null, "Floor plan deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reorder project floor plans
   * POST /api/projects/:id/floor-plans/reorder
   *
   * Body: { floorPlanIds: number[] }
   */
  async reorderProjectFloorPlans(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { floorPlanIds } = req.body;

      if (!floorPlanIds || !Array.isArray(floorPlanIds)) {
        throw new AppError("floorPlanIds array is required", 400);
      }

      await FloorPlanModel.reorder(
        PlannableType.PROJECT,
        Number(id),
        floorPlanIds
      );

      ApiResponse.success(res, null, "Floor plans reordered successfully");
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // PUBLISHING & VALIDATION
  // ============================================================================

  /**
   * Validate project media before publishing
   * GET /api/projects/:id/validate-media
   */
  async validateProjectMedia(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const errors: string[] = [];

      // Check for cover photo
      const coverPhoto = await PhotoModel.getCoverPhoto(
        PhotoableType.PROJECT,
        Number(id)
      );
      if (!coverPhoto) {
        errors.push("Cover photo is required");
      }

      // Check for minimum photos
      const photoCount = await PhotoModel.countForEntity(
        PhotoableType.PROJECT,
        Number(id)
      );
      if (photoCount < 3) {
        errors.push("At least 3 photos are required");
      }

      // Check for floor plans (warning only)
      const floorPlanCount = await FloorPlanModel.countForEntity(
        PlannableType.PROJECT,
        Number(id)
      );
      if (floorPlanCount === 0) {
        errors.push("WARNING: No floor plans found (recommended)");
      }

      const isValid = errors.length === 0;

      ApiResponse.success(
        res,
        { isValid, errors },
        isValid ? "Media validation passed" : "Media validation failed"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Publish project (with media validation)
   * PATCH /api/projects/:id/publish
   */
  async publishProject(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      // Validate media before publishing
      const coverPhoto = await PhotoModel.getCoverPhoto(
        PhotoableType.PROJECT,
        Number(id)
      );

      const photoCount = await PhotoModel.countForEntity(
        PhotoableType.PROJECT,
        Number(id)
      );

      if (!coverPhoto || photoCount < 3) {
        throw new AppError(
          "Cannot publish project: Cover photo and at least 3 photos are required",
          400
        );
      }

      const project = await ProjectModel.publish(Number(id));

      ApiResponse.success(res, project, "Project published successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unpublish project
   * PATCH /api/projects/:id/unpublish
   */
  async unpublishProject(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const project = await ProjectModel.unpublish(Number(id));

      ApiResponse.success(res, project, "Project unpublished successfully");
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================

  /**
   * Get project media statistics
   * GET /api/projects/:id/media-stats
   */
  async getProjectMediaStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const [photoStats, floorPlanStats] = await Promise.all([
        PhotoModel.countForEntity(PhotoableType.PROJECT, Number(id)),
        FloorPlanModel.getStatistics(PlannableType.PROJECT, Number(id)),
      ]);

      const coverPhoto = await PhotoModel.getCoverPhoto(
        PhotoableType.PROJECT,
        Number(id)
      );

      ApiResponse.success(
        res,
        {
          photos: {
            total: photoStats,
            hasCover: !!coverPhoto,
          },
          floorPlans: floorPlanStats,
        },
        "Media statistics retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export default new ProjectController();
