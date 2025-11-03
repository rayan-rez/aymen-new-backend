/**
 * Project Controller
 * Handles all project-related HTTP requests
 * 
 * @module controllers/project.controller
 */

import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@/utils/response.util";
import ProjectModel, { ProjectType, ProjectStatus, ProjectQueryOptions } from "@models/project.model";
import { AppError } from "@/middlewares/error-handler.middleware";

/**
 * Project Controller Class
 */
export class ProjectController {
  /**
   * Get all projects with filtering and pagination
   * GET /api/projects
   * 
   * Query params:
   * - page: number (default: 1)
   * - limit: number (default: 10)
   * - projectType: ProjectType
   * - status: ProjectStatus
   * - locationId: number
   * - isFeatured: boolean
   * - isPublished: boolean
   * - minPrice: number
   * - maxPrice: number
   * - search: string
   */
  async getProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      } = req.query;

      const options: ProjectQueryOptions & { page: number; limit: number } = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      // Apply filters
      if (projectType) options.projectType = projectType as ProjectType;
      if (status) options.status = status as ProjectStatus;
      if (locationId) options.locationId = Number(locationId);
      if (isFeatured !== undefined) options.isFeatured = isFeatured === "true";
      if (isPublished !== undefined) options.isPublished = isPublished === "true";
      if (minPrice) options.minPrice = Number(minPrice);
      if (maxPrice) options.maxPrice = Number(maxPrice);
      if (search) options.search = search as string;

      const result = await ProjectModel.paginateProjects(options);

      ApiResponse.success(res, result, "Projects retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get published projects (public endpoint)
   * GET /api/projects/public
   */
  async getPublishedProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        projectType,
        status,
        locationId,
        isFeatured,
        minPrice,
        maxPrice,
        search,
      } = req.query;

      const options: ProjectQueryOptions & { page: number; limit: number } = {
        page: Number(page),
        limit: Number(limit),
        isPublished: true, // Only published projects
        sortBy: "created_at",
        sortOrder: "desc",
      };

      if (projectType) options.projectType = projectType as ProjectType;
      if (status) options.status = status as ProjectStatus;
      if (locationId) options.locationId = Number(locationId);
      if (isFeatured !== undefined) options.isFeatured = isFeatured === "true";
      if (minPrice) options.minPrice = Number(minPrice);
      if (maxPrice) options.maxPrice = Number(maxPrice);
      if (search) options.search = search as string;

      const result = await ProjectModel.paginateProjects(options);

      ApiResponse.success(res, result, "Published projects retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get featured projects
   * GET /api/projects/featured
   */
  async getFeaturedProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit = 5 } = req.query;

      const projects = await ProjectModel.findFeatured({
        limit: Number(limit),
        sortBy: "created_at",
        sortOrder: "desc",
      });

      ApiResponse.success(res, projects, "Featured projects retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project by ID
   * GET /api/projects/:id
   */
  async getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { relations } = req.query;

      const relationsList = relations 
        ? (relations as string).split(",") 
        : ["location", "apartments"];

      const project = await ProjectModel.findById(
        Number(id),
        { relations: relationsList }
      );

      if (!project) {
        throw new AppError("Project not found", 404);
      }

      ApiResponse.success(res, project, "Project retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project by slug
   * GET /api/projects/slug/:slug
   */
  async getProjectBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      const { relations } = req.query;

      const relationsList = relations 
        ? (relations as string).split(",") 
        : ["location", "apartments"];

      const project = await ProjectModel.findBySlug(slug, {
        relations: relationsList,
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
   * Get project with statistics
   * GET /api/projects/:id/stats
   */
  async getProjectWithStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const project = await ProjectModel.findWithStats(Number(id));

      if (!project) {
        throw new AppError("Project not found", 404);
      }

      ApiResponse.success(res, project, "Project statistics retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new project
   * POST /api/projects
   */
  async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
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
  async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
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
  async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
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

  /**
   * Publish project
   * PATCH /api/projects/:id/publish
   */
  async publishProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

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
  async unpublishProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const project = await ProjectModel.unpublish(Number(id));

      ApiResponse.success(res, project, "Project unpublished successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle featured status
   * PATCH /api/projects/:id/toggle-featured
   */
  async toggleFeatured(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const project = await ProjectModel.toggleFeatured(Number(id));

      ApiResponse.success(res, project, "Featured status toggled successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Full-text search projects
   * GET /api/projects/search
   */
  async searchProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, page = 1, limit = 10 } = req.query;

      if (!q) {
        throw new AppError("Search query is required", 400);
      }

      const options: ProjectQueryOptions & { page: number; limit: number } = {
        page: Number(page),
        limit: Number(limit),
        isPublished: true,
      };

      const projects = await ProjectModel.fullTextSearch(q as string, options);

      ApiResponse.success(res, projects, "Search completed successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project features
   * GET /api/projects/:id/features
   */
  async getProjectFeatures(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const features = await ProjectModel.getFeatures(Number(id));

      ApiResponse.success(res, features, "Project features retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add features to project
   * POST /api/projects/:id/features
   * 
   * Body: { featureIds: number[] }
   */
  async addProjectFeatures(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { featureIds } = req.body;

      if (!Array.isArray(featureIds) || featureIds.length === 0) {
        throw new AppError("featureIds must be a non-empty array", 400);
      }

      await ProjectModel.addFeatures(Number(id), featureIds);

      ApiResponse.success(res, null, "Features added successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync project features (replace all)
   * PUT /api/projects/:id/features
   * 
   * Body: { featureIds: number[] }
   */
  async syncProjectFeatures(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { featureIds } = req.body;

      if (!Array.isArray(featureIds)) {
        throw new AppError("featureIds must be an array", 400);
      }

      await ProjectModel.syncFeatures(Number(id), featureIds);

      ApiResponse.success(res, null, "Features synchronized successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove features from project
   * DELETE /api/projects/:id/features
   * 
   * Body: { featureIds: number[] }
   */
  async removeProjectFeatures(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { featureIds } = req.body;

      if (!Array.isArray(featureIds) || featureIds.length === 0) {
        throw new AppError("featureIds must be a non-empty array", 400);
      }

      await ProjectModel.removeFeatures(Number(id), featureIds);

      ApiResponse.success(res, null, "Features removed successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project media
   * GET /api/projects/:id/media
   */
  async getProjectMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { mediaType } = req.query;

      const media = await ProjectModel.getMedia(
        Number(id),
        mediaType as string | undefined
      );

      ApiResponse.success(res, media, "Project media retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project apartments
   * GET /api/projects/:id/apartments
   */
  async getProjectApartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, minPrice, maxPrice, bedrooms } = req.query;

      const filters: any = {};
      if (status) filters.status = status;
      if (minPrice) filters.minPrice = Number(minPrice);
      if (maxPrice) filters.maxPrice = Number(maxPrice);
      if (bedrooms) filters.bedrooms = Number(bedrooms);

      const apartments = await ProjectModel.getApartments(Number(id), filters);

      ApiResponse.success(res, apartments, "Project apartments retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get projects by location
   * GET /api/projects/location/:locationId
   */
  async getProjectsByLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { locationId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const options: ProjectQueryOptions & { page: number; limit: number } = {
        page: Number(page),
        limit: Number(limit),
        locationId: Number(locationId),
        isPublished: true,
      };

      const result = await ProjectModel.paginateProjects(options);

      ApiResponse.success(res, result, "Projects retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get projects by type
   * GET /api/projects/type/:type
   */
  async getProjectsByType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const options: ProjectQueryOptions & { page: number; limit: number } = {
        page: Number(page),
        limit: Number(limit),
        projectType: type as ProjectType,
        isPublished: true,
      };

      const result = await ProjectModel.paginateProjects(options);

      ApiResponse.success(res, result, "Projects retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get projects with coordinates (for map)
   * GET /api/projects/map
   */
  async getProjectsWithCoordinates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projects = await ProjectModel.findWithCoordinates({
        isPublished: true,
      });

      ApiResponse.success(res, projects, "Projects with coordinates retrieved successfully");
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export default new ProjectController();